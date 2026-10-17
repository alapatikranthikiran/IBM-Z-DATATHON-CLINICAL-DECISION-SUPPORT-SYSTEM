import { DecisionCase, DomainPack, Signal } from '../types';

export interface PriorityBreakdown {
  caseId: string;
  finalScore: number;
  components: {
    key: 'severity' | 'urgency' | 'affectedPopulation' | 'propagationRisk';
    label: string;
    normalizedValue: number;
    weight: number;
    weightedContribution: number;
  }[];
  triggeredRules: string[];
  dataQualitySummary: {
    totalSignals: number;
    staleCount: number;
    conflictingCount: number;
    hasDegradedData: boolean;
    recommendationNote?: string;
  };
}

export class PriorityEngine {
  /**
   * Deterministically calculates priority score (0-100) based on domain pack weights.
   * Separates harm priority from data quality uncertainty.
   */
  public static calculatePriority(
    decisionCase: DecisionCase,
    pack: DomainPack,
    signals: Signal[] = []
  ): PriorityBreakdown {
    const weights = pack.priorityWeights;
    const s = Math.min(100, Math.max(0, decisionCase.severity));
    const u = Math.min(100, Math.max(0, decisionCase.urgency));
    const p = Math.min(100, Math.max(0, decisionCase.affectedPopulation));
    const r = Math.min(100, Math.max(0, decisionCase.propagationRisk));

    // Deterministic sum
    const sContrib = s * weights.severity;
    const uContrib = u * weights.urgency;
    const pContrib = p * weights.affectedPopulation;
    const rContrib = r * weights.propagationRisk;

    const rawTotal = sContrib + uContrib + pContrib + rContrib;
    const finalScore = Math.round(Math.min(100, Math.max(0, rawTotal)) * 10) / 10;

    // Evaluate evidence data quality
    const caseSignals = signals.filter((sig) => decisionCase.evidenceIds.includes(sig.id));
    const staleCount = caseSignals.filter((sig) => sig.qualityStatus === 'stale').length;
    const conflictingCount = caseSignals.filter((sig) => sig.qualityStatus === 'conflicting').length;
    const hasDegradedData = staleCount > 0 || conflictingCount > 0;

    let recommendationNote = undefined;
    if (conflictingCount > 0) {
      recommendationNote = 'Data quality alert: Multiple conflicting readings detected. Verification recommended before final approval.';
    } else if (staleCount > 0) {
      recommendationNote = 'Data quality alert: Critical sensor reading is stale. Fresh telemetry verification advised.';
    }

    return {
      caseId: decisionCase.id,
      finalScore,
      components: [
        {
          key: 'severity',
          label: 'Harm Severity',
          normalizedValue: s,
          weight: weights.severity,
          weightedContribution: Math.round(sContrib * 10) / 10,
        },
        {
          key: 'urgency',
          label: 'Temporal Urgency',
          normalizedValue: u,
          weight: weights.urgency,
          weightedContribution: Math.round(uContrib * 10) / 10,
        },
        {
          key: 'affectedPopulation',
          label: 'Affected Population',
          normalizedValue: p,
          weight: weights.affectedPopulation,
          weightedContribution: Math.round(pContrib * 10) / 10,
        },
        {
          key: 'propagationRisk',
          label: 'Propagation Risk',
          normalizedValue: r,
          weight: weights.propagationRisk,
          weightedContribution: Math.round(rContrib * 10) / 10,
        },
      ],
      triggeredRules: decisionCase.triggeredRules,
      dataQualitySummary: {
        totalSignals: caseSignals.length,
        staleCount,
        conflictingCount,
        hasDegradedData,
        recommendationNote,
      },
    };
  }
}
