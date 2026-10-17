import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ActionOption,
  DecisionCase,
  DecisionRecord,
  DomainPack,
  GeminiChallenge,
  GeminiExplanation,
  QualityStatus,
  ReliabilityMetrics,
  Resource,
  Signal,
  UserRole,
} from './src/types';
import { globalDomainRegistry } from './src/domain-packs/registry';
import { SeededPRNG } from './src/engine/prng';
import { EventNormalizer, RawEventInput } from './src/engine/normalizer';
import { IncidentCorrelator } from './src/engine/correlator';
import { PriorityEngine } from './src/engine/priority';
import { WhatIfSimulator } from './src/engine/simulator';
import { ResourceOptimizer } from './src/engine/optimizer';
import { ExplanationEngine } from './src/engine/explainer';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client setup per instructions
let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Gemini client:', err);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 4500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// ----------------------------------------------------
// CORE IN-MEMORY STATE REPOSITORY
// (Clean generic interfaces ready for Db2 / PostgreSQL)
// ----------------------------------------------------

interface EngineState {
  simTime: number; // simulated epoch ms
  isRunning: boolean;
  simSpeed: number; // 1, 2, 5
  prngSeed: number;
  activeRole: UserRole;
  activePackId: string;
  signals: Signal[];
  cases: DecisionCase[];
  optionsMap: Record<string, ActionOption[]>; // caseId -> options
  resources: Resource[];
  ledger: DecisionRecord[];
  reliability: ReliabilityMetrics;
  disconnectedSources: Set<string>;
  simulatedGeminiDisabled: boolean;
}

const prng = new SeededPRNG(4242);

// Initialize initial resources from active domain pack
function initResourcesForPack(pack: DomainPack): Resource[] {
  return pack.resources.map((r) => ({
    id: r.id,
    domainPackId: pack.id,
    name: r.name,
    type: r.type,
    status: 'available',
    location: r.location,
    capabilities: r.capabilities,
    quantity: r.quantity,
    availableQuantity: r.quantity,
    assignedCaseId: null,
    locked: false,
  }));
}

const activePack = globalDomainRegistry.getActive();

const state: EngineState = {
  simTime: 1776400000000, // fixed baseline simulation time
  isRunning: true,
  simSpeed: 1,
  prngSeed: 4242,
  activeRole: 'Operator',
  activePackId: activePack.id,
  signals: [],
  cases: [],
  optionsMap: {},
  resources: initResourcesForPack(activePack),
  ledger: [],
  reliability: {
    connectedSources: 4,
    totalSources: 4,
    malformedEventCount: 0,
    staleSourceCount: 0,
    contradictorySignalCount: 0,
    geminiAvailable: !!geminiClient,
    deterministicFallbackActive: !geminiClient,
    averageProcessingLatencyMs: 14.2,
    streamUptimeSeconds: 0,
    recentErrors: [],
  },
  disconnectedSources: new Set(),
  simulatedGeminiDisabled: false,
};

// SSE Client Connections
const sseClients: Response[] = [];

function broadcastSSE(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// ----------------------------------------------------
// EVENT PIPELINE & RECALCULATION
// ----------------------------------------------------

function recalculateCases() {
  const pack = globalDomainRegistry.get(state.activePackId) || globalDomainRegistry.getActive();

  for (const c of state.cases) {
    if (c.status === 'resolved') continue;

    // Recalculate priority
    const priorityBreakdown = PriorityEngine.calculatePriority(c, pack, state.signals);
    c.priorityScore = priorityBreakdown.finalScore;

    // Recalculate options
    const options = WhatIfSimulator.generateCaseOptions(c, pack, state.resources, state.signals);
    state.optionsMap[c.id] = options;

    const recommended = options.find((o) => o.feasibilityStatus !== 'infeasible_hard_constraint' && o.name !== 'Do Nothing') || options[0];
    if (recommended) {
      c.recommendedActionId = recommended.id;
    }
  }
}

function processIncomingEvent(raw: RawEventInput): { success: boolean; signal?: Signal; error?: string } {
  const tStart = Date.now();
  const pack = globalDomainRegistry.get(state.activePackId) || globalDomainRegistry.getActive();

  // Check if source disconnected
  if (raw.source && state.disconnectedSources.has(raw.source)) {
    return { success: false, error: `Data source ${raw.source} is currently disconnected.` };
  }

  const normResult = EventNormalizer.normalize(raw, state.simTime, pack, state.signals);

  if (!normResult.success || !normResult.signal) {
    state.reliability.malformedEventCount++;
    state.reliability.recentErrors.unshift({
      timestamp: Date.now(),
      component: 'EventNormalizer',
      message: normResult.error || 'Failed to normalize event',
    });
    if (state.reliability.recentErrors.length > 20) state.reliability.recentErrors.pop();
    return normResult;
  }

  const signal = normResult.signal;
  state.signals.unshift(signal);
  if (state.signals.length > 100) state.signals.pop();

  if (signal.qualityStatus === 'stale') {
    state.reliability.staleSourceCount++;
  }
  if (signal.qualityStatus === 'conflicting') {
    state.reliability.contradictorySignalCount++;
  }

  // Correlate into incident
  const correlation = IncidentCorrelator.processSignal(signal, pack, state.cases, state.simTime);
  if (correlation) {
    if (correlation.isNew) {
      state.cases.unshift(correlation.updatedCase);
    } else {
      const idx = state.cases.findIndex((c) => c.id === correlation.updatedCase.id);
      if (idx !== -1) {
        state.cases[idx] = correlation.updatedCase;
      }
    }
    recalculateCases();
  }

  const latency = Date.now() - tStart;
  state.reliability.averageProcessingLatencyMs = Math.round((state.reliability.averageProcessingLatencyMs * 0.9 + latency * 0.1) * 10) / 10;

  broadcastSSE('signal', signal);
  broadcastSSE('cases', state.cases);
  return { success: true, signal };
}

// ----------------------------------------------------
// SIMULATION ENGINE TICK LOOP
// ----------------------------------------------------

let tickTimer: NodeJS.Timeout | null = null;

function tickSimulation() {
  if (!state.isRunning) return;

  const pack = globalDomainRegistry.get(state.activePackId) || globalDomainRegistry.getActive();
  // Advance simulation time by 2.5 seconds * speed
  const advanceMs = 2500 * state.simSpeed;
  state.simTime += advanceMs;
  state.reliability.streamUptimeSeconds += 2.5;

  // Pick random entity and signal type
  const entity = prng.choice(pack.entities);
  const signalDef = prng.choice(pack.signalTypes);

  // Generate synthetic value around normal range with occasional spikes
  const isSpike = prng.next() < 0.15; // 15% probability of threshold breach
  let val: number;

  if (isSpike) {
    if (signalDef.criticalDirection === 'above') {
      val = Math.round((signalDef.criticalThreshold + prng.next() * 15) * 10) / 10;
    } else {
      val = Math.max(0, Math.round((signalDef.criticalThreshold - prng.next() * 5) * 10) / 10);
    }
  } else {
    const range = signalDef.normalMax - signalDef.normalMin;
    val = Math.round((signalDef.normalMin + prng.next() * range) * 10) / 10;
  }

  const sourceName = `${signalDef.id}-sensor-01`;
  if (!state.disconnectedSources.has(sourceName)) {
    processIncomingEvent({
      domainPackId: pack.id,
      entityId: entity.id,
      type: signalDef.id,
      value: val,
      unit: signalDef.unit,
      source: sourceName,
      timestamp: state.simTime,
    });
  }

  broadcastSSE('heartbeat', {
    simTime: state.simTime,
    isRunning: state.isRunning,
    simSpeed: state.simSpeed,
  });
}

function startSimLoop() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(tickSimulation, 2500);
}

startSimLoop();

// ----------------------------------------------------
// REST & SSE API ROUTES
// ----------------------------------------------------

// SSE Stream
app.get('/api/stream/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);
  // Send initial state snapshot
  res.write(`event: init\ndata: ${JSON.stringify(getPublicState())}\n\n`);

  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

function getPublicState() {
  const pack = globalDomainRegistry.get(state.activePackId) || globalDomainRegistry.getActive();
  return {
    simTime: state.simTime,
    isRunning: state.isRunning,
    simSpeed: state.simSpeed,
    prngSeed: state.prngSeed,
    activeRole: state.activeRole,
    activePackId: state.activePackId,
    activePack: pack,
    signals: state.signals.slice(0, 30),
    cases: state.cases,
    optionsMap: state.optionsMap,
    resources: state.resources,
    ledger: state.ledger.slice(0, 50),
    reliability: {
      ...state.reliability,
      geminiAvailable: !state.simulatedGeminiDisabled && !!geminiClient,
      deterministicFallbackActive: state.simulatedGeminiDisabled || !geminiClient,
    },
    disconnectedSources: Array.from(state.disconnectedSources),
  };
}

app.get('/api/state', (_req: Request, res: Response) => {
  res.json(getPublicState());
});

// Human Decision Approval
app.post('/api/action/approve', (req: Request, res: Response) => {
  const { caseId, actionId, operatorRole, reason, softOverrideReason } = req.body;
  const decisionCase = state.cases.find((c) => c.id === caseId);

  if (!decisionCase) {
    return res.status(404).json({ error: 'Decision case not found' });
  }

  const options = state.optionsMap[caseId] || [];
  const selectedOption = options.find((o) => o.id === actionId);

  if (!selectedOption) {
    return res.status(404).json({ error: 'Action option not found' });
  }

  // Principle 7: Recommendation expiry check
  if (selectedOption.generatedForStateVersion !== decisionCase.stateVersion) {
    return res.status(409).json({
      error: `Recommendation expired! Generated for stateVersion ${selectedOption.generatedForStateVersion}, but current stateVersion is ${decisionCase.stateVersion}. Conditions changed after this recommendation was generated. Recalculate before approval.`,
    });
  }

  // Principle 8: Hard constraints can never be overridden
  if (selectedOption.feasibilityStatus === 'infeasible_hard_constraint') {
    return res.status(403).json({
      error: 'Cannot approve action: Hard constraints are violated. Hard constraints cannot be overridden by any role or AI.',
      violations: selectedOption.hardConstraintViolations,
    });
  }

  // Soft constraint role check
  if (selectedOption.softConstraintWarnings.length > 0) {
    if (operatorRole === 'Operator' || operatorRole === 'Auditor') {
      return res.status(403).json({
        error: 'Soft constraint warning present. Authorization requires Supervisor or Administrator role with mandatory reason.',
      });
    }
    if (!softOverrideReason || softOverrideReason.trim().length < 5) {
      return res.status(400).json({
        error: 'A mandatory written justification (min 5 chars) is required to override soft policy constraints.',
      });
    }
  }

  // Deduct resources
  for (const reqRes of selectedOption.requiredResources) {
    const matching = state.resources.filter(
      (r) => r.domainPackId === decisionCase.domainPackId && r.type.toLowerCase() === reqRes.resourceType.toLowerCase()
    );
    let needed = reqRes.quantity;
    for (const r of matching) {
      if (needed <= 0) break;
      const deduct = Math.min(r.availableQuantity, needed);
      r.availableQuantity -= deduct;
      needed -= deduct;
      r.assignedCaseId = decisionCase.id;
      if (r.availableQuantity === 0) r.status = 'assigned';
    }
  }

  decisionCase.status = 'approved';
  decisionCase.updatedAt = state.simTime;
  decisionCase.stateVersion += 1;

  // Append to Decision Ledger
  const record: DecisionRecord = {
    id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    decisionCaseId: decisionCase.id,
    caseTitle: decisionCase.title,
    domainPackId: decisionCase.domainPackId,
    domainPackVersion: '1.0',
    policyVersion: '1.0',
    stateVersion: decisionCase.stateVersion,
    evidenceSnapshot: state.signals.filter((s) => decisionCase.evidenceIds.includes(s.id)),
    optionsSnapshot: options,
    selectedAction: selectedOption,
    recommendation: options[0],
    operatorAction: selectedOption.softConstraintWarnings.length > 0 ? 'override_approve' : 'approve',
    operatorId: `user_${(operatorRole || 'Operator').toLowerCase()}`,
    operatorRole: operatorRole || 'Operator',
    reason: reason || 'Approved in accordance with operational procedures.',
    softOverrideReason,
    timestamp: state.simTime,
    simulatedOutcome: {
      projectedRiskReduction: selectedOption.expectedOutcomes[0]?.deltaPercent || 40,
      expectedResolutionTimeMinutes: 25,
      metricsSummary: selectedOption.expectedOutcomes.map((m) => `${m.metricName}: ${m.projectedValue} ${m.unit}`).join(', '),
    },
  };

  state.ledger.unshift(record);
  recalculateCases();

  broadcastSSE('decision_approved', { caseId, record });
  res.json({ success: true, record, updatedCase: decisionCase });
});

// Human Decision Rejection
app.post('/api/action/reject', (req: Request, res: Response) => {
  const { caseId, reason, operatorRole } = req.body;
  const decisionCase = state.cases.find((c) => c.id === caseId);

  if (!decisionCase) return res.status(404).json({ error: 'Case not found' });
  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: 'A rejection reason is required (min 5 chars).' });
  }

  decisionCase.status = 'rejected';
  decisionCase.updatedAt = state.simTime;
  decisionCase.stateVersion += 1;

  const record: DecisionRecord = {
    id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    decisionCaseId: decisionCase.id,
    caseTitle: decisionCase.title,
    domainPackId: decisionCase.domainPackId,
    domainPackVersion: '1.0',
    policyVersion: '1.0',
    stateVersion: decisionCase.stateVersion,
    evidenceSnapshot: state.signals.filter((s) => decisionCase.evidenceIds.includes(s.id)),
    optionsSnapshot: state.optionsMap[caseId] || [],
    selectedAction: null,
    recommendation: (state.optionsMap[caseId] || [])[0] || null,
    operatorAction: 'reject',
    operatorId: `user_${(operatorRole || 'Operator').toLowerCase()}`,
    operatorRole: operatorRole || 'Operator',
    reason,
    timestamp: state.simTime,
    simulatedOutcome: {
      projectedRiskReduction: 0,
      expectedResolutionTimeMinutes: 0,
      metricsSummary: 'Action rejected by operator; alternative manual workflow initiated.',
    },
  };

  state.ledger.unshift(record);
  recalculateCases();
  res.json({ success: true, record });
});

// Escalate Decision
app.post('/api/action/escalate', (req: Request, res: Response) => {
  const { caseId, reason, operatorRole, escalateTo } = req.body;
  const decisionCase = state.cases.find((c) => c.id === caseId);

  if (!decisionCase) return res.status(404).json({ error: 'Case not found' });
  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: 'An escalation reason is required (min 5 chars).' });
  }

  decisionCase.status = 'escalated';
  decisionCase.updatedAt = state.simTime;
  decisionCase.stateVersion += 1;

  const record: DecisionRecord = {
    id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    decisionCaseId: decisionCase.id,
    caseTitle: decisionCase.title,
    domainPackId: decisionCase.domainPackId,
    domainPackVersion: '1.0',
    policyVersion: '1.0',
    stateVersion: decisionCase.stateVersion,
    evidenceSnapshot: state.signals.filter((s) => decisionCase.evidenceIds.includes(s.id)),
    optionsSnapshot: state.optionsMap[caseId] || [],
    selectedAction: null,
    recommendation: (state.optionsMap[caseId] || [])[0] || null,
    operatorAction: 'escalate',
    operatorId: `user_${(operatorRole || 'Operator').toLowerCase()}`,
    operatorRole: operatorRole || 'Operator',
    reason: `Escalated to [${escalateTo || 'Executive Command'}]: ${reason}`,
    timestamp: state.simTime,
    simulatedOutcome: {
      projectedRiskReduction: 10,
      expectedResolutionTimeMinutes: 45,
      metricsSummary: `Incident escalated to ${escalateTo || 'Command Authority'}.`,
    },
  };

  state.ledger.unshift(record);
  recalculateCases();
  res.json({ success: true, record });
});

// Recalculate Case
app.post('/api/action/recalculate', (req: Request, res: Response) => {
  const { caseId } = req.body;
  const decisionCase = state.cases.find((c) => c.id === caseId);
  if (!decisionCase) return res.status(404).json({ error: 'Case not found' });

  decisionCase.stateVersion += 1;
  decisionCase.updatedAt = state.simTime;
  recalculateCases();

  res.json({
    success: true,
    stateVersion: decisionCase.stateVersion,
    options: state.optionsMap[caseId],
  });
});

// Resource Conflict Optimization
app.post('/api/resources/optimize', (req: Request, res: Response) => {
  const pack = globalDomainRegistry.get(state.activePackId) || globalDomainRegistry.getActive();
  const optionsMap = new Map<string, ActionOption[]>();
  for (const [k, v] of Object.entries(state.optionsMap)) {
    optionsMap.set(k, v);
  }

  const plan = ResourceOptimizer.optimize(state.cases, optionsMap, state.resources, pack);
  res.json(plan);
});

// Lock / Unlock Resource
app.post('/api/resources/toggle-lock', (req: Request, res: Response) => {
  const { resourceId } = req.body;
  const resObj = state.resources.find((r) => r.id === resourceId);
  if (!resObj) return res.status(404).json({ error: 'Resource not found' });
  resObj.locked = !resObj.locked;
  res.json({ success: true, resource: resObj });
});

// Simulation Controls
app.post('/api/simulation/control', (req: Request, res: Response) => {
  const { action, speed, seed, role, eventData, sourceId } = req.body;

  if (action === 'play') {
    state.isRunning = true;
  } else if (action === 'pause') {
    state.isRunning = false;
  } else if (action === 'reset') {
    const pack = globalDomainRegistry.get(state.activePackId) || globalDomainRegistry.getActive();
    state.simTime = 1776400000000;
    state.signals = [];
    state.cases = [];
    state.optionsMap = {};
    state.resources = initResourcesForPack(pack);
    state.disconnectedSources.clear();
    prng.reset(state.prngSeed);
  } else if (action === 'setSpeed' && typeof speed === 'number') {
    state.simSpeed = Math.max(1, Math.min(5, speed));
  } else if (action === 'setSeed' && seed !== undefined) {
    state.prngSeed = Number(seed) || 4242;
    prng.reset(state.prngSeed);
  } else if (action === 'setRole' && role) {
    state.activeRole = role;
  } else if (action === 'injectEvent' && eventData) {
    const resNorm = processIncomingEvent(eventData);
    return res.json(resNorm);
  } else if (action === 'disconnectSource' && sourceId) {
    state.disconnectedSources.add(sourceId);
    state.reliability.connectedSources = Math.max(0, state.reliability.totalSources - state.disconnectedSources.size);
  } else if (action === 'restoreSource' && sourceId) {
    state.disconnectedSources.delete(sourceId);
    state.reliability.connectedSources = Math.max(0, state.reliability.totalSources - state.disconnectedSources.size);
  }

  broadcastSSE('state_update', getPublicState());
  res.json({ success: true, state: getPublicState() });
});

// Predefined Scenario Injector
app.post('/api/simulation/scenario', (req: Request, res: Response) => {
  const { scenarioId } = req.body;
  const pack = globalDomainRegistry.get(state.activePackId) || globalDomainRegistry.getActive();

  if (scenarioId === 'normal_operation') {
    state.cases = [];
    state.optionsMap = {};
    state.resources = initResourcesForPack(pack);
    state.disconnectedSources.clear();
  } else if (scenarioId === 'one_escalating_incident') {
    const entity = pack.entities[0];
    const sigType = pack.signalTypes[0];
    processIncomingEvent({
      domainPackId: pack.id,
      entityId: entity.id,
      type: sigType.id,
      value: sigType.criticalThreshold + 12,
      unit: sigType.unit,
      source: 'live-telemetry-primary',
      timestamp: state.simTime,
    });
  } else if (scenarioId === 'two_incidents_competing_resource') {
    // Inject two incidents in different sectors that demand the same scarce resource
    const ent1 = pack.entities[0];
    const ent2 = pack.entities[1] || pack.entities[0];
    const sigType = pack.signalTypes[0];

    processIncomingEvent({
      domainPackId: pack.id,
      entityId: ent1.id,
      type: sigType.id,
      value: sigType.criticalThreshold + 15,
      unit: sigType.unit,
      source: 'sensor-sector-alpha',
      timestamp: state.simTime,
    });
    processIncomingEvent({
      domainPackId: pack.id,
      entityId: ent2.id,
      type: sigType.id,
      value: sigType.criticalThreshold + 18,
      unit: sigType.unit,
      source: 'sensor-sector-bravo',
      timestamp: state.simTime + 1000,
    });
  } else if (scenarioId === 'stale_critical_sensor') {
    const entity = pack.entities[0];
    const sigType = pack.signalTypes[0];
    processIncomingEvent({
      domainPackId: pack.id,
      entityId: entity.id,
      type: sigType.id,
      value: sigType.criticalThreshold + 8,
      unit: sigType.unit,
      source: 'stale-transponder-09',
      timestamp: state.simTime - 120000, // 2 minutes old -> exceeds 30s staleness threshold
    });
  } else if (scenarioId === 'contradictory_sources') {
    const entity = pack.entities[0];
    const sigType = pack.signalTypes[0];
    // Sensor 1 reports high alarm
    processIncomingEvent({
      domainPackId: pack.id,
      entityId: entity.id,
      type: sigType.id,
      value: sigType.criticalThreshold + 20,
      unit: sigType.unit,
      source: 'radar-station-primary',
      timestamp: state.simTime,
    });
    // Sensor 2 reports normal reading for same entity
    processIncomingEvent({
      domainPackId: pack.id,
      entityId: entity.id,
      type: sigType.id,
      value: sigType.normalMin + 2,
      unit: sigType.unit,
      source: 'buoy-station-backup',
      timestamp: state.simTime + 500,
    });
  } else if (scenarioId === 'recovery_after_intervention') {
    const entity = pack.entities[0];
    const sigType = pack.signalTypes[0];
    processIncomingEvent({
      domainPackId: pack.id,
      entityId: entity.id,
      type: sigType.id,
      value: sigType.normalMin + 5,
      unit: sigType.unit,
      source: 'live-telemetry-primary',
      timestamp: state.simTime,
    });
  }

  res.json({ success: true, state: getPublicState() });
});

// Domain Pack Endpoints
app.get('/api/domain-packs', (_req: Request, res: Response) => {
  res.json({
    activePackId: state.activePackId,
    packs: globalDomainRegistry.getAll(),
  });
});

app.post('/api/domain-packs/activate', (req: Request, res: Response) => {
  const { packId, role } = req.body;
  if (role !== 'Administrator') {
    return res.status(403).json({ error: 'Administrator role required to activate Domain Packs.' });
  }

  const success = globalDomainRegistry.setActive(packId);
  if (success) {
    state.activePackId = packId;
    const pack = globalDomainRegistry.getActive();
    state.resources = initResourcesForPack(pack);
    state.cases = [];
    state.optionsMap = {};
    broadcastSSE('pack_changed', pack);
    return res.json({ success: true, activePack: pack });
  }
  return res.status(404).json({ error: 'Domain pack not found.' });
});

app.post('/api/domain-packs/save', (req: Request, res: Response) => {
  const { pack, role } = req.body;
  if (role !== 'Administrator') {
    return res.status(403).json({ error: 'Administrator role required to modify Domain Packs.' });
  }

  const regRes = globalDomainRegistry.register(pack);
  if (!regRes.success) {
    return res.status(400).json({ error: 'Validation failed', details: regRes.errors });
  }
  res.json({ success: true });
});

app.post('/api/domain-packs/duplicate', (req: Request, res: Response) => {
  const { packId, newId, newName } = req.body;
  const dup = globalDomainRegistry.duplicate(packId, newId, newName);
  if (!dup) return res.status(404).json({ error: 'Original pack not found' });
  res.json({ success: true, pack: dup });
});

app.post('/api/domain-packs/rollback', (req: Request, res: Response) => {
  const { packId, role } = req.body;
  if (role !== 'Administrator') {
    return res.status(403).json({ error: 'Administrator role required for rollback.' });
  }
  const rolled = globalDomainRegistry.rollback(packId);
  if (!rolled) return res.status(400).json({ error: 'No previous version available to rollback to.' });
  res.json({ success: true, pack: rolled });
});

app.post('/api/domain-packs/test', (req: Request, res: Response) => {
  const { pack, scenarioId } = req.body;
  const testRes = globalDomainRegistry.runTestScenario(pack, scenarioId);
  res.json(testRes);
});

// Toggle simulated Gemini outage
app.post('/api/reliability/toggle-gemini', (_req: Request, res: Response) => {
  state.simulatedGeminiDisabled = !state.simulatedGeminiDisabled;
  state.reliability.geminiAvailable = !state.simulatedGeminiDisabled && !!geminiClient;
  state.reliability.deterministicFallbackActive = state.simulatedGeminiDisabled || !geminiClient;
  res.json({
    geminiAvailable: state.reliability.geminiAvailable,
    deterministicFallbackActive: state.reliability.deterministicFallbackActive,
  });
});

// Grounded AI Explanation (Server-Side Only)
app.post('/api/gemini/explain', async (req: Request, res: Response) => {
  const { caseId } = req.body;
  const decisionCase = state.cases.find((c) => c.id === caseId);
  if (!decisionCase) return res.status(404).json({ error: 'Case not found' });

  const pack = globalDomainRegistry.get(state.activePackId) || globalDomainRegistry.getActive();
  const options = state.optionsMap[caseId] || [];

  // If Gemini client is unavailable or disabled, use deterministic fallback
  if (!geminiClient || state.simulatedGeminiDisabled) {
    const fallback = ExplanationEngine.generateDeterministicExplanation(decisionCase, options, state.signals, pack);
    return res.json(fallback);
  }

  try {
    const structuredInput = {
      decisionCase,
      options: options.map((o) => ({
        id: o.id,
        name: o.name,
        residualRisk: o.residualRisk,
        utilityScore: o.utilityScore,
        feasibilityStatus: o.feasibilityStatus,
        hardConstraintViolations: o.hardConstraintViolations,
        softConstraintWarnings: o.softConstraintWarnings,
        assumptions: o.assumptions,
      })),
      evidence: state.signals.filter((s) => decisionCase.evidenceIds.includes(s.id)),
      policyRulesChecked: [...pack.hardConstraints, ...pack.softConstraints].map((r) => r.name),
    };

    const prompt = `You are the Grounded Explanation Engine for Aegis DecisionOS.
Strictly adhere to the following non-negotiable principles:
1. Explain the provided deterministic calculations and evidence.
2. DO NOT invent numerical values, risk scores, or outcome percentages.
3. Every recommendation must reference the provided evidence IDs and values.
4. Output strict JSON matching the schema.

Data input:
${JSON.stringify(structuredInput, null, 2)}`;

    const geminiRes = await withTimeout(
      geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              recommendedActionExplanation: { type: Type.STRING },
              evidenceUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
              rejectedAlternatives: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    actionName: { type: Type.STRING },
                    reason: { type: Type.STRING },
                  },
                  required: ['actionName', 'reason'],
                },
              },
              uncertainties: { type: Type.ARRAY, items: { type: Type.STRING } },
              operatorQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'summary',
              'recommendedActionExplanation',
              'evidenceUsed',
              'rejectedAlternatives',
              'uncertainties',
              'operatorQuestions',
            ],
          },
        },
      }),
      4000
    );

    const parsed = JSON.parse(geminiRes.text || '{}');
    const result: GeminiExplanation = {
      ...parsed,
      isFallback: false,
      generatedAt: Date.now(),
    };
    res.json(result);
  } catch (err) {
    console.warn('Gemini explanation call failed, falling back to deterministic template:', err);
    const fallback = ExplanationEngine.generateDeterministicExplanation(decisionCase, options, state.signals, pack);
    res.json(fallback);
  }
});

// AI Challenge Mode (Server-Side Only)
app.post('/api/gemini/challenge', async (req: Request, res: Response) => {
  const { caseId } = req.body;
  const decisionCase = state.cases.find((c) => c.id === caseId);
  if (!decisionCase) return res.status(404).json({ error: 'Case not found' });

  const pack = globalDomainRegistry.get(state.activePackId) || globalDomainRegistry.getActive();
  const options = state.optionsMap[caseId] || [];

  if (!geminiClient || state.simulatedGeminiDisabled) {
    const fallback = ExplanationEngine.generateDeterministicChallenge(decisionCase, options, state.signals, pack);
    return res.json(fallback);
  }

  try {
    const structuredInput = {
      decisionCase,
      options,
      evidence: state.signals.filter((s) => decisionCase.evidenceIds.includes(s.id)),
    };

    const prompt = `You are the AI Red-Team Critique reviewer in Aegis DecisionOS.
Your job is to challenge the recommended action using ONLY the supplied case data and constraints.
Be rigorous, objective, and highlight potential blind spots, questionable assumptions, or resource exhaustion risks.
DO NOT invent new numbers or facts.
Output strict JSON matching the schema.

Data input:
${JSON.stringify(structuredInput, null, 2)}`;

    const geminiRes = await withTimeout(
      geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strongestArgumentAgainst: { type: Type.STRING },
              missingEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
              questionableAssumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
              unintendedConsequences: { type: Type.ARRAY, items: { type: Type.STRING } },
              viableAlternative: { type: Type.STRING },
              operatorQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'strongestArgumentAgainst',
              'missingEvidence',
              'questionableAssumptions',
              'unintendedConsequences',
              'viableAlternative',
              'operatorQuestions',
            ],
          },
        },
      }),
      4000
    );

    const parsed = JSON.parse(geminiRes.text || '{}');
    const result: GeminiChallenge = {
      ...parsed,
      isFallback: false,
      generatedAt: Date.now(),
    };
    res.json(result);
  } catch (err) {
    console.warn('Gemini challenge call failed, falling back to deterministic template:', err);
    const fallback = ExplanationEngine.generateDeterministicChallenge(decisionCase, options, state.signals, pack);
    res.json(fallback);
  }
});

// AI Domain Pack Generator from Description
app.post('/api/gemini/generate-pack', async (req: Request, res: Response) => {
  const { description } = req.body;
  if (!description || description.trim().length < 10) {
    return res.status(400).json({ error: 'Please provide a descriptive prompt for the domain pack.' });
  }

  if (!geminiClient || state.simulatedGeminiDisabled) {
    // Deterministic fallback draft for port maritime operations
    const fallbackDraft: DomainPack = {
      id: `custom-pack-${Date.now()}`,
      name: 'Maritime Container Port Operations',
      version: '1.0.0-draft',
      description: 'Container crane collision avoidance, berth saturation, and container dwell time mitigation.',
      industryCategory: 'Logistics & Marine Transportation',
      disclaimer: 'SYNTHETIC DATA DEMONSTRATION. Drafted by deterministic template fallback.',
      entities: [
        { id: 'BERTH-A1', name: 'Deepwater Container Berth 1', type: 'Berth', location: 'Quay Pier 1' },
        { id: 'CRANE-STS-04', name: 'Ship-to-Shore Gantry Crane 4', type: 'GantryCrane', location: 'Berth 1 Track' },
      ],
      signalTypes: [
        {
          id: 'wind_speed_knots',
          name: 'Quayside Wind Gust Velocity',
          unit: 'knots',
          normalMin: 5,
          normalMax: 25,
          criticalThreshold: 40,
          criticalDirection: 'above',
          stalenessThresholdSeconds: 30,
          isCritical: true,
        },
      ],
      incidentTypes: [
        {
          id: 'crane_gale_hazard',
          name: 'High Wind Crane Instability Alert',
          description: 'Wind gusts exceeding crane stability limits risking gantry derailment.',
          baseSeverity: 85,
          baseUrgency: 90,
        },
      ],
      riskRules: [
        {
          id: 'rule_gale_40',
          name: 'Gale Force Threshold 40kn',
          incidentType: 'crane_gale_hazard',
          signalType: 'wind_speed_knots',
          condition: 'gte',
          threshold: 40,
          severityBoost: 20,
          urgencyBoost: 20,
          explanation: 'Wind over 40 knots requires immediate boom stowage and rail tie-down.',
        },
      ],
      priorityWeights: { severity: 0.4, urgency: 0.3, affectedPopulation: 0.15, propagationRisk: 0.15 },
      resources: [
        {
          id: 'res_tug_fleet',
          name: 'Harbor Assist Tugboats',
          type: 'tugs',
          location: 'Pier Bay',
          quantity: 3,
          capabilities: ['70T Bollard Pull'],
        },
      ],
      availableActions: [
        {
          id: 'act_stow_cranes',
          incidentType: 'crane_gale_hazard',
          name: 'Boom Up & Lock Quayside Cranes',
          description: 'Engage mechanical storm pins and elevate boom to neutral stowage position.',
          requiredResources: [],
          baseRiskReduction: 60,
          baseCost: 800,
          assumptions: ['Operator cabs unoccupied'],
        },
      ],
      hardConstraints: [
        {
          id: 'hard_wind_crane_lock',
          name: 'Crane Wind Interlock',
          type: 'hard',
          condition: 'wind_speed_knots <= 45',
          effect: 'Infeasible to operate cranes above 45 knots.',
          explanation: 'Structural overturning moment exceeded.',
          requiredRole: 'Administrator',
          version: '1.0',
          isActive: true,
        },
      ],
      softConstraints: [],
      escalationRules: [],
      outcomeMetrics: [
        {
          id: 'berth_safety_index',
          name: 'Quayside Safety Margin',
          unit: '%',
          targetDirection: 'increase',
          baselineFormula: '60',
        },
      ],
      userRoles: ['Operator', 'Supervisor', 'Administrator', 'Auditor'],
      simulationParameters: {
        tickIntervalMs: 2500,
        eventsPerTick: 1,
        noiseLevel: 0.05,
        defaultSensitivity: {
          demandMultiplier: 1.0,
          eventGrowthRate: 1.1,
          resourceAvailability: 1.0,
          responseDelay: 5.0,
          sensorUncertainty: 0.05,
        },
      },
      testScenarios: [
        {
          id: 'test_gale',
          name: 'Gale Wind Test',
          description: 'Wind spikes to 46 knots.',
          sampleEvents: [{ type: 'wind_speed_knots', value: 46, entityId: 'BERTH-A1' }],
          expectedCaseCount: 1,
          expectedRecommendedActionId: 'act_stow_cranes',
        },
      ],
    };

    return res.json({ draft: fallbackDraft, isFallback: true });
  }

  try {
    const prompt = `You are the Domain Pack Generator for Aegis DecisionOS.
Generate a complete, syntactically valid JSON Domain Pack based on the following user description.
The pack MUST conform to the exact DomainPack schema with entities, signalTypes, incidentTypes, riskRules, priorityWeights (summing to 1.0), resources, availableActions, hardConstraints, softConstraints, escalationRules, outcomeMetrics, and at least 1 testScenario.
Note: Mark all data as synthetic.

User description:
${description}`;

    const geminiRes = await geminiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const draft = JSON.parse(geminiRes.text || '{}');
    if (!draft.id) draft.id = `pack_${Date.now()}`;
    if (!draft.version) draft.version = '1.0.0-draft';

    res.json({ draft, isFallback: false });
  } catch (err: any) {
    console.warn('Gemini pack generator error, returning fallback template:', err);
    return res.status(500).json({ error: 'Failed to generate pack via Gemini: ' + err.message });
  }
});

// Decision Ledger & Exports
app.get('/api/ledger', (req: Request, res: Response) => {
  const { caseId, role } = req.query;
  let records = state.ledger;
  if (caseId) {
    records = records.filter((r) => r.decisionCaseId === String(caseId));
  }
  if (role) {
    records = records.filter((r) => r.operatorRole === String(role));
  }
  res.json(records);
});

app.get('/api/ledger/export', (req: Request, res: Response) => {
  const format = req.query.format === 'csv' ? 'csv' : 'json';

  if (format === 'csv') {
    const headers = [
      'RecordID',
      'CaseID',
      'CaseTitle',
      'DomainPackID',
      'ActionType',
      'OperatorID',
      'OperatorRole',
      'Reason',
      'Timestamp',
      'RiskReduction',
    ];
    const rows = state.ledger.map((r) => [
      r.id,
      r.decisionCaseId,
      `"${r.caseTitle.replace(/"/g, '""')}"`,
      r.domainPackId,
      r.operatorAction,
      r.operatorId,
      r.operatorRole,
      `"${r.reason.replace(/"/g, '""')}"`,
      new Date(r.timestamp).toISOString(),
      r.simulatedOutcome.projectedRiskReduction,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="aegis-decision-ledger.csv"');
    return res.send(csvContent);
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="aegis-decision-ledger.json"');
  return res.json(state.ledger);
});

// ----------------------------------------------------
// VITE MIDDLEWARE (Full-stack integration)
// ----------------------------------------------------

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AEGIS DECISIONOS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
