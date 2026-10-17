import { z } from 'zod';

// Quality Status
export const QualityStatusSchema = z.enum([
  'complete',
  'partial',
  'stale',
  'conflicting',
  'unavailable',
]);
export type QualityStatus = z.infer<typeof QualityStatusSchema>;

// User Roles
export const UserRoleSchema = z.enum(['Operator', 'Supervisor', 'Administrator', 'Auditor']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// Signal Schema
export const SignalSchema = z.object({
  id: z.string(),
  domainPackId: z.string(),
  entityId: z.string(),
  type: z.string(),
  value: z.union([z.number(), z.string(), z.boolean()]),
  unit: z.string().optional().default(''),
  source: z.string(),
  eventTimestamp: z.number(), // simulation time ms
  receivedTimestamp: z.number(),
  freshnessSeconds: z.number(),
  qualityStatus: QualityStatusSchema,
  metadata: z.record(z.string(), z.any()).optional().default({}),
  rawPayload: z.any().optional(),
});
export type Signal = z.infer<typeof SignalSchema>;

// Evidence Reference
export interface EvidenceRef {
  signalId: string;
  entityId: string;
  type: string;
  value: number | string | boolean;
  unit?: string;
  source: string;
  timestamp: number;
  qualityStatus: QualityStatus;
  relevance: string;
}

// Resource Requirements
export interface ResourceRequirement {
  resourceType: string;
  quantity: number;
  minCapabilities?: string[];
}

// Constraint Check result
export interface ConstraintViolation {
  constraintId: string;
  ruleName: string;
  type: 'hard' | 'soft';
  condition: string;
  violatedReason: string;
  canOverride: boolean;
  requiredRole?: UserRole;
}

// Expected Outcome Simulation
export interface ExpectedOutcome {
  metricId: string;
  metricName: string;
  unit: string;
  baselineValue: number;
  projectedValue: number;
  deltaPercent: number;
  isPositive: boolean;
  explanation: string;
}

// Action Option
export const ActionOptionSchema = z.object({
  id: z.string(),
  decisionCaseId: z.string(),
  name: z.string(),
  description: z.string(),
  requiredResources: z.array(
    z.object({
      resourceType: z.string(),
      quantity: z.number(),
    })
  ),
  expectedOutcomes: z.array(
    z.object({
      metricId: z.string(),
      metricName: z.string(),
      unit: z.string(),
      baselineValue: z.number(),
      projectedValue: z.number(),
      deltaPercent: z.number(),
      isPositive: z.boolean(),
      explanation: z.string(),
    })
  ),
  residualRisk: z.number(), // 0 to 100
  estimatedCost: z.number().optional().default(0),
  assumptions: z.array(z.string()),
  hardConstraintViolations: z.array(z.string()),
  softConstraintWarnings: z.array(z.string()),
  feasibilityStatus: z.enum(['feasible', 'infeasible_hard_constraint', 'warning_soft_constraint']),
  utilityScore: z.number(), // calculated deterministically
  generatedForStateVersion: z.number(),
});
export type ActionOption = z.infer<typeof ActionOptionSchema>;

// Decision Case Status
export const DecisionCaseStatusSchema = z.enum([
  'active',
  'under_review',
  'approved',
  'rejected',
  'escalated',
  'resolved',
]);
export type DecisionCaseStatus = z.infer<typeof DecisionCaseStatusSchema>;

// Decision Case
export const DecisionCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  domainPackId: z.string(),
  incidentType: z.string(),
  affectedEntities: z.array(z.string()),
  status: DecisionCaseStatusSchema,
  severity: z.number().min(0).max(100),
  urgency: z.number().min(0).max(100),
  propagationRisk: z.number().min(0).max(100),
  affectedPopulation: z.number().min(0).max(100),
  priorityScore: z.number().min(0).max(100), // deterministic weighted sum
  evidenceIds: z.array(z.string()),
  resourceRequirements: z.array(
    z.object({
      resourceType: z.string(),
      quantity: z.number(),
    })
  ),
  createdAt: z.number(),
  updatedAt: z.number(),
  stateVersion: z.number(),
  correlationReason: z.string(),
  triggeredRules: z.array(z.string()),
  recommendedActionId: z.string().optional(),
  assignedResourceId: z.string().optional(),
});
export type DecisionCase = z.infer<typeof DecisionCaseSchema>;

// Resource
export const ResourceSchema = z.object({
  id: z.string(),
  domainPackId: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.enum(['available', 'assigned', 'en_route', 'maintenance', 'depleted']),
  location: z.string(),
  capabilities: z.array(z.string()),
  quantity: z.number(),
  availableQuantity: z.number(),
  assignedCaseId: z.string().nullable().optional(),
  locked: z.boolean().optional().default(false),
});
export type Resource = z.infer<typeof ResourceSchema>;

// Policy Rule
export const PolicyRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['hard', 'soft']),
  condition: z.string(),
  effect: z.string(),
  explanation: z.string(),
  requiredRole: UserRoleSchema,
  version: z.string(),
  isActive: z.boolean().default(true),
});
export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

// Grounded AI Explanation
export interface GeminiExplanation {
  summary: string;
  recommendedActionExplanation: string;
  evidenceUsed: string[];
  rejectedAlternatives: {
    actionName: string;
    reason: string;
  }[];
  uncertainties: string[];
  operatorQuestions: string[];
  isFallback: boolean;
  generatedAt: number;
}

// AI Challenge Critique
export interface GeminiChallenge {
  strongestArgumentAgainst: string;
  missingEvidence: string[];
  questionableAssumptions: string[];
  unintendedConsequences: string[];
  viableAlternative: string;
  operatorQuestions: string[];
  isFallback: boolean;
  generatedAt: number;
}

// Decision Record (Ledger)
export const DecisionRecordSchema = z.object({
  id: z.string(),
  decisionCaseId: z.string(),
  caseTitle: z.string(),
  domainPackId: z.string(),
  domainPackVersion: z.string(),
  policyVersion: z.string(),
  stateVersion: z.number(),
  evidenceSnapshot: z.array(z.any()),
  optionsSnapshot: z.array(z.any()),
  selectedAction: z.any(),
  recommendation: z.any(),
  operatorAction: z.enum(['approve', 'reject', 'escalate', 'override_approve']),
  operatorId: z.string(),
  operatorRole: UserRoleSchema,
  reason: z.string(),
  softOverrideReason: z.string().optional(),
  timestamp: z.number(),
  simulatedOutcome: z.object({
    projectedRiskReduction: z.number(),
    expectedResolutionTimeMinutes: z.number(),
    metricsSummary: z.string(),
  }),
  geminiExplanation: z.any().optional(),
  geminiChallenge: z.any().optional(),
});
export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;

// Domain Pack Definition
export const DomainPackSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  industryCategory: z.string(),
  disclaimer: z.string().optional(),
  entities: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      location: z.string(),
    })
  ),
  signalTypes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      unit: z.string(),
      normalMin: z.number(),
      normalMax: z.number(),
      criticalThreshold: z.number(),
      criticalDirection: z.enum(['above', 'below']),
      stalenessThresholdSeconds: z.number(),
      isCritical: z.boolean(),
    })
  ),
  incidentTypes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      baseSeverity: z.number(),
      baseUrgency: z.number(),
    })
  ),
  riskRules: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      incidentType: z.string(),
      signalType: z.string(),
      condition: z.enum(['gt', 'lt', 'gte', 'lte', 'eq']),
      threshold: z.number(),
      severityBoost: z.number(),
      urgencyBoost: z.number(),
      explanation: z.string(),
    })
  ),
  priorityWeights: z.object({
    severity: z.number(),
    urgency: z.number(),
    affectedPopulation: z.number(),
    propagationRisk: z.number(),
  }),
  resources: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      location: z.string(),
      quantity: z.number(),
      capabilities: z.array(z.string()),
    })
  ),
  availableActions: z.array(
    z.object({
      id: z.string(),
      incidentType: z.string(),
      name: z.string(),
      description: z.string(),
      requiredResources: z.array(
        z.object({
          resourceType: z.string(),
          quantity: z.number(),
        })
      ),
      baseRiskReduction: z.number(),
      baseCost: z.number(),
      assumptions: z.array(z.string()),
    })
  ),
  hardConstraints: z.array(PolicyRuleSchema),
  softConstraints: z.array(PolicyRuleSchema),
  escalationRules: z.array(
    z.object({
      id: z.string(),
      condition: z.string(),
      escalateTo: z.string(),
      timeoutSeconds: z.number(),
    })
  ),
  outcomeMetrics: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      unit: z.string(),
      targetDirection: z.enum(['increase', 'decrease']),
      baselineFormula: z.string(),
    })
  ),
  userRoles: z.array(UserRoleSchema),
  simulationParameters: z.object({
    tickIntervalMs: z.number(),
    eventsPerTick: z.number(),
    noiseLevel: z.number(),
    defaultSensitivity: z.object({
      demandMultiplier: z.number(),
      eventGrowthRate: z.number(),
      resourceAvailability: z.number(),
      responseDelay: z.number(),
      sensorUncertainty: z.number(),
    }),
  }),
  testScenarios: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      sampleEvents: z.array(z.any()),
      expectedCaseCount: z.number(),
      expectedRecommendedActionId: z.string(),
    })
  ),
});
export type DomainPack = z.infer<typeof DomainPackSchema>;

// Reliability Metrics
export interface ReliabilityMetrics {
  connectedSources: number;
  totalSources: number;
  malformedEventCount: number;
  staleSourceCount: number;
  contradictorySignalCount: number;
  geminiAvailable: boolean;
  deterministicFallbackActive: boolean;
  averageProcessingLatencyMs: number;
  streamUptimeSeconds: number;
  recentErrors: {
    timestamp: number;
    component: string;
    message: string;
  }[];
}

// Data Source Info
export interface DataSourceInfo {
  id: string;
  name: string;
  protocol: 'SSE' | 'MQTT' | 'Kafka' | 'RestApi' | 'Simulated';
  status: 'connected' | 'disconnected' | 'stale';
  lastSeenMs: number;
  freshnessSeconds: number;
  eventsEmitted: number;
  isCritical: boolean;
}
