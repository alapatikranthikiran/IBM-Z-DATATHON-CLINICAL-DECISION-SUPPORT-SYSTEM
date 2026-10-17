import { ActionOption, DecisionCase, DomainPack, Resource, Signal, UserRole } from '../types';

export interface PolicyEvaluationResult {
  isFeasible: boolean;
  hardViolations: string[];
  softWarnings: string[];
  feasibilityStatus: 'feasible' | 'infeasible_hard_constraint' | 'warning_soft_constraint';
  canBeApprovedByRole: (role: UserRole) => { allowed: boolean; reason?: string };
}

export class PolicyEngine {
  /**
   * Evaluates all hard and soft constraints for a proposed action on a decision case.
   */
  public static evaluateAction(
    actionDef: {
      id: string;
      name: string;
      requiredResources: { resourceType: string; quantity: number }[];
    },
    decisionCase: DecisionCase,
    pack: DomainPack,
    resources: Resource[],
    signals: Signal[]
  ): PolicyEvaluationResult {
    const hardViolations: string[] = [];
    const softWarnings: string[] = [];

    // 1. Check physical resource inventory constraints
    for (const req of actionDef.requiredResources) {
      const matchingResources = resources.filter(
        (r) => r.domainPackId === pack.id && r.type.toLowerCase() === req.resourceType.toLowerCase()
      );
      const totalAvailable = matchingResources.reduce((sum, r) => sum + r.availableQuantity, 0);

      if (totalAvailable < req.quantity) {
        hardViolations.push(
          `Resource Shortage: Requires ${req.quantity} ${req.resourceType}, but only ${totalAvailable} currently available.`
        );
      }
    }

    // 2. Evaluate Domain Pack Hard Constraints
    for (const hardRule of pack.hardConstraints.filter((r) => r.isActive)) {
      // Evaluate specific domain rules
      if (hardRule.id === 'hard_safe_staffing') {
        const staffSig = signals.find((s) => s.type === 'staff_availability');
        if (staffSig && Number(staffSig.value) < 25) {
          hardViolations.push(
            `Violated "${hardRule.name}": Staff availability is ${staffSig.value}% (minimum safety floor is 25%). ${hardRule.explanation}`
          );
        }
      } else if (hardRule.id === 'hard_flood_vehicle_depth') {
        const waterSig = signals.find((s) => s.type === 'water_level');
        if (actionDef.id === 'act_select_alt_route' && waterSig && Number(waterSig.value) > 1.2) {
          // If water level exceeds 1.2m and attempting standard transit
          // check if specialized or standard
        }
      } else if (hardRule.id === 'hard_thermal_interlock_trip') {
        const tempSig = signals.find((s) => s.type === 'machine_temperature');
        if (tempSig && Number(tempSig.value) >= 115 && actionDef.id !== 'act_controlled_shutdown') {
          hardViolations.push(
            `Violated "${hardRule.name}": Machine temperature is ${tempSig.value}°C (Trip limit 115°C). Non-shutdown actions are strictly prohibited.`
          );
        }
      } else if (hardRule.id === 'hard_oil_pressure_loss') {
        const pressSig = signals.find((s) => s.type === 'pressure');
        if (pressSig && Number(pressSig.value) < 2.0 && actionDef.id !== 'act_controlled_shutdown') {
          hardViolations.push(
            `Violated "${hardRule.name}": Oil pressure is ${pressSig.value} bar (<2.0 bar limit). Continued operation will cause mechanical seizure.`
          );
        }
      }
    }

    // 3. Evaluate Domain Pack Soft Constraints
    for (const softRule of pack.softConstraints.filter((r) => r.isActive)) {
      if (softRule.id === 'soft_diversion_supervisor' && actionDef.id === 'act_reroute_patients') {
        softWarnings.push(
          `Policy Warning "${softRule.name}": Ambulance diversion requires Supervisor authorization with documented justification.`
        );
      } else if (softRule.id === 'soft_mandatory_evac_signoff' && actionDef.id === 'act_dispatch_rescue_team') {
        // Warning if priority is extreme requiring supervisor signoff
        if (decisionCase.severity > 85) {
          softWarnings.push(
            `Policy Warning "${softRule.name}": Mass evacuation dispatch in critical tier requires Supervisor confirmation.`
          );
        }
      } else if (softRule.id === 'soft_shutdown_production_signoff' && actionDef.id === 'act_controlled_shutdown') {
        softWarnings.push(
          `Policy Warning "${softRule.name}": Plant shutdown incurs commercial outage cost. Requires Supervisor signoff.`
        );
      }
    }

    const isFeasible = hardViolations.length === 0;
    const feasibilityStatus: 'feasible' | 'infeasible_hard_constraint' | 'warning_soft_constraint' = !isFeasible
      ? 'infeasible_hard_constraint'
      : softWarnings.length > 0
      ? 'warning_soft_constraint'
      : 'feasible';

    return {
      isFeasible,
      hardViolations,
      softWarnings,
      feasibilityStatus,
      canBeApprovedByRole: (role: UserRole) => {
        if (!isFeasible) {
          return {
            allowed: false,
            reason: 'Hard constraints violated. This action cannot be approved under any circumstances.',
          };
        }
        if (softWarnings.length > 0) {
          if (role === 'Operator' || role === 'Auditor') {
            return {
              allowed: false,
              reason: 'Soft constraint warnings present. Requires Supervisor or Administrator role to authorize override.',
            };
          }
        }
        if (role === 'Auditor') {
          return {
            allowed: false,
            reason: 'Auditor role is read-only. Action approval requires Operator, Supervisor, or Administrator.',
          };
        }
        return { allowed: true };
      },
    };
  }
}
