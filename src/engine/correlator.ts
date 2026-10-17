import { DecisionCase, Signal, DomainPack } from '../types';

export class IncidentCorrelator {
  /**
   * Correlates incoming signal with existing active DecisionCases, or spawns a new one.
   * Does not create duplicate incidents for repeated signals.
   */
  public static processSignal(
    signal: Signal,
    activePack: DomainPack,
    existingCases: DecisionCase[],
    currentSimTime: number
  ): { updatedCase: DecisionCase; isNew: boolean } | null {
    // 1. Check which risk rules trigger for this signal
    const triggeredRules: { ruleId: string; incidentType: string; severityBoost: number; urgencyBoost: number; ruleName: string; explanation: string }[] = [];

    for (const rule of activePack.riskRules) {
      if (rule.signalType === signal.type) {
        const numVal = Number(signal.value);
        let match = false;
        if (rule.condition === 'gte' && numVal >= rule.threshold) match = true;
        else if (rule.condition === 'gt' && numVal > rule.threshold) match = true;
        else if (rule.condition === 'lte' && numVal <= rule.threshold) match = true;
        else if (rule.condition === 'lt' && numVal < rule.threshold) match = true;
        else if (rule.condition === 'eq' && numVal === rule.threshold) match = true;

        if (match) {
          triggeredRules.push({
            ruleId: rule.id,
            incidentType: rule.incidentType,
            severityBoost: rule.severityBoost,
            urgencyBoost: rule.urgencyBoost,
            ruleName: rule.name,
            explanation: rule.explanation,
          });
        }
      }
    }

    if (triggeredRules.length === 0) {
      // Normal signal, not triggering incident threshold
      return null;
    }

    const primaryTrigger = triggeredRules[0];
    const incidentTypeDef = activePack.incidentTypes.find((i) => i.id === primaryTrigger.incidentType);

    // 2. Correlate with existing case
    // Matches by same incidentType and affected entity, or related entity within active time window
    const correlationWindowMs = 10 * 60 * 1000; // 10 minutes
    const existing = existingCases.find((c) => {
      if (c.status === 'resolved') return false;
      const sameIncident = c.incidentType === primaryTrigger.incidentType;
      const entityMatch = c.affectedEntities.includes(signal.entityId);
      const withinWindow = Math.abs(currentSimTime - c.updatedAt) < correlationWindowMs;
      return (sameIncident && entityMatch) || (sameIncident && withinWindow);
    });

    if (existing) {
      // Update existing case
      const updatedEvidence = Array.from(new Set([...existing.evidenceIds, signal.id]));
      const updatedEntities = Array.from(new Set([...existing.affectedEntities, signal.entityId]));
      const updatedRules = Array.from(new Set([...existing.triggeredRules, ...triggeredRules.map((r) => r.ruleName)]));

      // Bumping severity / urgency deterministically
      const newSeverity = Math.min(100, Math.max(existing.severity, (incidentTypeDef?.baseSeverity || 50) + primaryTrigger.severityBoost));
      const newUrgency = Math.min(100, Math.max(existing.urgency, (incidentTypeDef?.baseUrgency || 50) + primaryTrigger.urgencyBoost));

      const updatedCase: DecisionCase = {
        ...existing,
        affectedEntities: updatedEntities,
        evidenceIds: updatedEvidence,
        severity: newSeverity,
        urgency: newUrgency,
        triggeredRules: updatedRules,
        updatedAt: currentSimTime,
        stateVersion: existing.stateVersion + 1, // Conditions changed -> increments stateVersion
        correlationReason: `Correlated ${updatedEvidence.length} signals for ${updatedEntities.join(', ')} (Rule: ${primaryTrigger.ruleName})`,
      };

      return { updatedCase, isNew: false };
    }

    // 3. Create a new Decision Case
    const initialSeverity = Math.min(100, (incidentTypeDef?.baseSeverity || 50) + primaryTrigger.severityBoost);
    const initialUrgency = Math.min(100, (incidentTypeDef?.baseUrgency || 50) + primaryTrigger.urgencyBoost);
    const popFactor = 65; // Baseline affected population normalized
    const propRisk = 45; // Baseline propagation risk normalized

    const newCase: DecisionCase = {
      id: `case_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${incidentTypeDef?.name || 'Critical Incident'} at ${signal.entityId}`,
      domainPackId: activePack.id,
      incidentType: primaryTrigger.incidentType,
      affectedEntities: [signal.entityId],
      status: 'active',
      severity: initialSeverity,
      urgency: initialUrgency,
      propagationRisk: propRisk,
      affectedPopulation: popFactor,
      priorityScore: 0, // will be computed by PriorityEngine
      evidenceIds: [signal.id],
      resourceRequirements: [],
      createdAt: currentSimTime,
      updatedAt: currentSimTime,
      stateVersion: 1,
      correlationReason: `Spawned by ${primaryTrigger.ruleName} threshold breach on ${signal.entityId}.`,
      triggeredRules: triggeredRules.map((r) => r.ruleName),
    };

    return { updatedCase: newCase, isNew: true };
  }
}
