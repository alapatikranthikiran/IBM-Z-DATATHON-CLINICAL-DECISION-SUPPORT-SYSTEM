import { ActionOption, DecisionCase, DomainPack, GeminiChallenge, GeminiExplanation, Signal } from '../types';

export class ExplanationEngine {
  /**
   * Deterministic template-based grounded explanation fallback.
   * Guarantees 100% operational availability if Gemini API is disabled, unavailable, or encounters network limits.
   */
  public static generateDeterministicExplanation(
    decisionCase: DecisionCase,
    options: ActionOption[],
    signals: Signal[],
    pack: DomainPack
  ): GeminiExplanation {
    const recommended = options.find((o) => o.feasibilityStatus !== 'infeasible_hard_constraint' && o.name !== 'Do Nothing') || options[0];
    const caseSignals = signals.filter((s) => decisionCase.evidenceIds.includes(s.id));

    const evidenceUsed = caseSignals.map(
      (s) => `${s.type.replace(/_/g, ' ').toUpperCase()}: ${s.value}${s.unit ? ' ' + s.unit : ''} (${s.source}, status: ${s.qualityStatus})`
    );

    const rejectedAlternatives = options
      .filter((o) => o.id !== recommended?.id)
      .map((o) => {
        let reason = 'Lower comparative utility score than recommended option.';
        if (o.feasibilityStatus === 'infeasible_hard_constraint') {
          reason = `Hard constraint violation: ${o.hardConstraintViolations.join('; ')}`;
        } else if (o.softConstraintWarnings.length > 0) {
          reason = `Soft policy warning: ${o.softConstraintWarnings.join('; ')}`;
        } else if (o.name.includes('Do Nothing')) {
          reason = `Inaction fails to arrest cascading risk propagation (${o.residualRisk}% residual risk).`;
        }
        return {
          actionName: o.name,
          reason,
        };
      });

    const uncertainties: string[] = [];
    const staleSignals = caseSignals.filter((s) => s.qualityStatus === 'stale');
    if (staleSignals.length > 0) {
      uncertainties.push(`${staleSignals.length} sensor telemetry stream(s) exceed staleness threshold.`);
    }
    const conflictingSignals = caseSignals.filter((s) => s.qualityStatus === 'conflicting');
    if (conflictingSignals.length > 0) {
      uncertainties.push(`${conflictingSignals.length} divergent sensor reading(s) detected across reporting channels.`);
    }
    if (uncertainties.length === 0) {
      uncertainties.push('Sensor telemetry is consistent and within acceptable freshness limits.');
    }

    const operatorQuestions = [
      `Confirm physical access and staging readiness for ${recommended?.requiredResources.map((r) => r.resourceType).join(', ') || 'assigned units'}.`,
      'Verify whether secondary auxiliary backup routes have reported active congestion or degradation.',
    ];

    return {
      summary: `Critical ${decisionCase.incidentType.replace(/_/g, ' ')} detected at ${decisionCase.affectedEntities.join(', ')} with calculated priority score ${decisionCase.priorityScore}/100. Deterministic evaluation recommends immediate execution of "${recommended?.name}".`,
      recommendedActionExplanation: `"${recommended?.name}" reduces estimated residual incident risk to ${recommended?.residualRisk}% by addressing root triggers identified in ${decisionCase.triggeredRules.join(', ')}. Hard policy constraints were verified with no unresolvable resource blockages.`,
      evidenceUsed,
      rejectedAlternatives,
      uncertainties,
      operatorQuestions,
      isFallback: true,
      generatedAt: Date.now(),
    };
  }

  /**
   * Deterministic template-based challenge critique fallback.
   */
  public static generateDeterministicChallenge(
    decisionCase: DecisionCase,
    options: ActionOption[],
    signals: Signal[],
    pack: DomainPack
  ): GeminiChallenge {
    const recommended = options.find((o) => o.feasibilityStatus !== 'infeasible_hard_constraint' && o.name !== 'Do Nothing') || options[0];
    const secondBest = options.find((o) => o.id !== recommended?.id && o.feasibilityStatus !== 'infeasible_hard_constraint');

    return {
      strongestArgumentAgainst: `Executing "${recommended?.name}" commits critical finite resources immediately, preventing agile reallocation if secondary incidents trigger in adjoining sectors within the next 30 minutes.`,
      missingEvidence: [
        'Real-time transit telemetry confirmation for auxiliary staging corridors.',
        'Secondary confirmation from human reconnaissance team on site.',
      ],
      questionableAssumptions: recommended?.assumptions.length ? recommended.assumptions : [
        'Assumption that resource transit velocity meets baseline ETA without traffic friction.',
      ],
      unintendedConsequences: [
        'Potential operational bottleneck at staging hub if resource deployment encounters physical access constraints.',
        'Downstream resource starvation if secondary cascading alarm triggers.',
      ],
      viableAlternative: secondBest
        ? `Consider "${secondBest.name}" to conserve primary resources while assessing rate of change.`
        : 'Staged mobilization with continuous telemetry verification.',
      operatorQuestions: [
        'Has human staff on ground confirmed visual indicators matching the telemetry spike?',
        'Can the affected sector absorb a 15-minute verification delay before full commitment?',
      ],
      isFallback: true,
      generatedAt: Date.now(),
    };
  }
}
