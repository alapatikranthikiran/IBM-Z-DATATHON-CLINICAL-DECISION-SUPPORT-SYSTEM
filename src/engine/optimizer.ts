import { ActionOption, DecisionCase, DomainPack, Resource } from '../types';

export interface ResourceAllocationPlan {
  planId: string;
  totalUtility: number;
  assignments: {
    caseId: string;
    caseTitle: string;
    priorityScore: number;
    assignedActionId: string;
    assignedActionName: string;
    allocatedResources: {
      resourceId: string;
      resourceName: string;
      quantityAllocated: number;
    }[];
    status: 'allocated' | 'delayed' | 'unassigned';
    delayReason?: string;
  }[];
  unmetDemands: {
    caseId: string;
    resourceType: string;
    quantityRequested: number;
    reason: string;
  }[];
  summaryExplanation: string;
}

export class ResourceOptimizer {
  /**
   * Deterministically solves resource assignment for a small set of concurrent cases.
   * Prioritizes highest priority score cases first, checking feasibility against available inventory.
   */
  public static optimize(
    cases: DecisionCase[],
    optionsMap: Map<string, ActionOption[]>,
    resources: Resource[],
    pack: DomainPack
  ): ResourceAllocationPlan {
    // Clone resource inventory to track consumed amounts during simulation
    const inventory = resources.map((r) => ({
      ...r,
      tempAvailable: r.availableQuantity,
    }));

    // Sort active cases descending by priorityScore
    const activeCases = cases
      .filter((c) => c.status === 'active' || c.status === 'under_review')
      .sort((a, b) => b.priorityScore - a.priorityScore);

    const assignments: ResourceAllocationPlan['assignments'] = [];
    const unmetDemands: ResourceAllocationPlan['unmetDemands'] = [];
    let totalUtility = 0;

    for (const c of activeCases) {
      const caseOptions = optionsMap.get(c.id) || [];
      // Pick best feasible option (prefer feasible, then warning_soft, never infeasible_hard)
      const feasibleOptions = caseOptions
        .filter((o) => o.feasibilityStatus !== 'infeasible_hard_constraint' && o.name !== 'Do Nothing')
        .sort((a, b) => b.utilityScore - a.utilityScore);

      let allocated = false;

      for (const option of feasibleOptions) {
        // Check if current inventory can satisfy this option's required resources
        let canSatisfy = true;
        const potentialAllocations: { resourceId: string; resourceName: string; quantityAllocated: number }[] = [];

        for (const req of option.requiredResources) {
          const matchingRes = inventory.filter(
            (r) => r.domainPackId === pack.id && r.type.toLowerCase() === req.resourceType.toLowerCase()
          );
          const availableInMatching = matchingRes.reduce((sum, r) => sum + r.tempAvailable, 0);

          if (availableInMatching < req.quantity) {
            canSatisfy = false;
            break;
          } else {
            // Allocate greedily from matching resources
            let needed = req.quantity;
            for (const r of matchingRes) {
              if (needed <= 0) break;
              const take = Math.min(r.tempAvailable, needed);
              if (take > 0) {
                potentialAllocations.push({
                  resourceId: r.id,
                  resourceName: r.name,
                  quantityAllocated: take,
                });
                needed -= take;
              }
            }
          }
        }

        if (canSatisfy) {
          // Commit inventory
          for (const alloc of potentialAllocations) {
            const res = inventory.find((r) => r.id === alloc.resourceId);
            if (res) {
              res.tempAvailable -= alloc.quantityAllocated;
            }
          }

          totalUtility += option.utilityScore;
          assignments.push({
            caseId: c.id,
            caseTitle: c.title,
            priorityScore: c.priorityScore,
            assignedActionId: option.id,
            assignedActionName: option.name,
            allocatedResources: potentialAllocations,
            status: 'allocated',
          });
          allocated = true;
          break; // move to next case
        }
      }

      if (!allocated) {
        // Could not allocate preferred resources
        const fallbackOption = caseOptions.find((o) => o.name === 'Do Nothing') || caseOptions[0];
        const competingCase = assignments[0];
        const reason = competingCase
          ? `Resource contention: Competing high-priority incident "${competingCase.caseTitle}" (Priority ${competingCase.priorityScore}) claimed limited capacity.`
          : 'Insufficient resource availability across all feasible action plans.';

        assignments.push({
          caseId: c.id,
          caseTitle: c.title,
          priorityScore: c.priorityScore,
          assignedActionId: fallbackOption ? fallbackOption.id : 'none',
          assignedActionName: fallbackOption ? fallbackOption.name : 'Hold / Queue',
          allocatedResources: [],
          status: 'delayed',
          delayReason: reason,
        });

        unmetDemands.push({
          caseId: c.id,
          resourceType: 'primary',
          quantityRequested: 1,
          reason,
        });
      }
    }

    const delayedCount = assignments.filter((a) => a.status === 'delayed').length;
    const summaryExplanation =
      delayedCount > 0
        ? `Optimized allocation across ${activeCases.length} incidents. ${delayedCount} incident(s) queued or delayed due to finite resource limits. Total global utility: ${Math.round(totalUtility)}.`
        : `All ${activeCases.length} active incidents successfully provisioned with optimal feasible actions. Global utility: ${Math.round(totalUtility)}.`;

    return {
      planId: `plan_${Date.now()}`,
      totalUtility: Math.round(totalUtility),
      assignments,
      unmetDemands,
      summaryExplanation,
    };
  }
}
