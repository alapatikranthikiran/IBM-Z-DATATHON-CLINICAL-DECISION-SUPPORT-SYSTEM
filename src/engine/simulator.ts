import { ActionOption, DecisionCase, DomainPack, Resource, Signal } from '../types';
import { PolicyEngine } from './policy';

export interface SimulationSensitivityParams {
  demandMultiplier: number;
  eventGrowthRate: number;
  resourceAvailability: number;
  responseDelay: number;
  sensorUncertainty: number;
}

export class WhatIfSimulator {
  /**
   * Generates and compares feasible and infeasible action options for a given DecisionCase,
   * applying sensitivity modifiers deterministically.
   */
  public static generateCaseOptions(
    decisionCase: DecisionCase,
    pack: DomainPack,
    resources: Resource[],
    signals: Signal[],
    sensitivity: SimulationSensitivityParams = pack.simulationParameters.defaultSensitivity
  ): ActionOption[] {
    const relevantActions = pack.availableActions.filter(
      (a) => a.incidentType === decisionCase.incidentType || a.incidentType === '*'
    );

    const adjustedResources = resources.map((r) => ({
      ...r,
      availableQuantity: Math.max(0, Math.round(r.availableQuantity * sensitivity.resourceAvailability)),
    }));

    const options: ActionOption[] = [];

    // 1. "Do Nothing" baseline option
    const baselineRiskReduction = 0;
    const projectedDoNothingSeverity = Math.min(
      100,
      Math.round(decisionCase.severity * sensitivity.eventGrowthRate * sensitivity.demandMultiplier)
    );

    const doNothingOutcomes = pack.outcomeMetrics.map((m) => {
      const base = parseFloat(m.baselineFormula) || 50;
      const proj = m.targetDirection === 'increase' ? Math.round(base * 0.7) : Math.round(base * 1.4);
      return {
        metricId: m.id,
        metricName: m.name,
        unit: m.unit,
        baselineValue: base,
        projectedValue: proj,
        deltaPercent: Math.round(((proj - base) / base) * 100),
        isPositive: false,
        explanation: 'Status quo trajectory without intervention; incident risks cascade and worsen.',
      };
    });

    options.push({
      id: `opt_do_nothing_${decisionCase.id}`,
      decisionCaseId: decisionCase.id,
      name: 'Do Nothing (Passive Monitoring)',
      description: 'Maintain existing posture without committing emergency reserves or altering operational dispatch.',
      requiredResources: [],
      expectedOutcomes: doNothingOutcomes,
      residualRisk: projectedDoNothingSeverity,
      estimatedCost: 0,
      assumptions: ['No secondary structural failures occur during the evaluation window'],
      hardConstraintViolations: [],
      softConstraintWarnings: ['Incident severity is high; passive inaction risks uncontrolled propagation.'],
      feasibilityStatus: 'feasible',
      utilityScore: 5,
      generatedForStateVersion: decisionCase.stateVersion,
    });

    // 2. Map domain pack available actions
    for (const act of relevantActions) {
      const policyRes = PolicyEngine.evaluateAction(act, decisionCase, pack, adjustedResources, signals);

      // Sensitivity calculations
      const delayPenalty = sensitivity.responseDelay > 5 ? (sensitivity.responseDelay - 5) * 1.5 : 0;
      const effectiveRiskReduction = Math.max(
        5,
        Math.min(95, Math.round(act.baseRiskReduction - delayPenalty))
      );

      const residualRisk = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            decisionCase.severity *
              (1 - effectiveRiskReduction / 100) *
              Math.sqrt(sensitivity.eventGrowthRate)
          )
        )
      );

      // Deterministic outcome metrics
      const outcomes = pack.outcomeMetrics.map((m) => {
        const base = parseFloat(m.baselineFormula) || 50;
        const changeFactor = (effectiveRiskReduction / 100) * 0.8;
        const proj =
          m.targetDirection === 'increase'
            ? Math.round(base * (1 + changeFactor))
            : Math.max(0, Math.round(base * (1 - changeFactor)));

        const delta = Math.round(((proj - base) / Math.max(1, base)) * 100);
        const isPositive = m.targetDirection === 'increase' ? delta > 0 : delta < 0;

        return {
          metricId: m.id,
          metricName: m.name,
          unit: m.unit,
          baselineValue: base,
          projectedValue: proj,
          deltaPercent: delta,
          isPositive,
          explanation: `Simulated impact with ${effectiveRiskReduction}% risk reduction factoring ${sensitivity.responseDelay}s response delay.`,
        };
      });

      // Calculate utility score: (priority * riskReduction) / (scaledCost)
      const costFactor = Math.max(1, act.baseCost / 1000);
      const rawUtility = (decisionCase.priorityScore * (effectiveRiskReduction / 100) * 10) / Math.sqrt(costFactor);
      const utilityScore = policyRes.isFeasible ? Math.round(rawUtility * 10) / 10 : 0;

      options.push({
        id: `opt_${act.id}_${decisionCase.id}`,
        decisionCaseId: decisionCase.id,
        name: act.name,
        description: act.description,
        requiredResources: act.requiredResources,
        expectedOutcomes: outcomes,
        residualRisk,
        estimatedCost: act.baseCost,
        assumptions: act.assumptions,
        hardConstraintViolations: policyRes.hardViolations,
        softConstraintWarnings: policyRes.softWarnings,
        feasibilityStatus: policyRes.feasibilityStatus,
        utilityScore,
        generatedForStateVersion: decisionCase.stateVersion,
      });
    }

    // Sort options: Feasible highest utility first, then soft warning, then hard violations, then Do Nothing
    options.sort((a, b) => {
      if (a.feasibilityStatus === 'infeasible_hard_constraint' && b.feasibilityStatus !== 'infeasible_hard_constraint') {
        return 1;
      }
      if (b.feasibilityStatus === 'infeasible_hard_constraint' && a.feasibilityStatus !== 'infeasible_hard_constraint') {
        return -1;
      }
      return b.utilityScore - a.utilityScore;
    });

    return options;
  }
}
