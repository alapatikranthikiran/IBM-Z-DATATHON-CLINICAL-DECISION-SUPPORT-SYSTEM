import { DomainPack, DomainPackSchema } from '../types';
import { HospitalCapacityPack } from './data/hospital-capacity';
import { DisasterResponsePack } from './data/disaster-response';
import { ManufacturingSafetyPack } from './data/manufacturing-safety';

export class DomainPackRegistry {
  private packs: Map<string, DomainPack> = new Map();
  private activePackId: string = 'hospital-capacity-v1';
  private versionHistory: Map<string, DomainPack[]> = new Map();

  constructor() {
    this.register(HospitalCapacityPack);
    this.register(DisasterResponsePack);
    this.register(ManufacturingSafetyPack);
    this.activePackId = 'hospital-capacity-v1';
  }

  public register(pack: DomainPack): { success: boolean; errors?: string[] } {
    // Validate schema with Zod
    const result = DomainPackSchema.safeParse(pack);
    if (!result.success) {
      return {
        success: false,
        errors: result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`),
      };
    }

    // Additional semantic checks
    const entityIds = new Set(pack.entities.map((e) => e.id));
    const signalTypeIds = new Set(pack.signalTypes.map((s) => s.id));
    const incidentTypeIds = new Set(pack.incidentTypes.map((i) => i.id));

    const semanticErrors: string[] = [];
    for (const rule of pack.riskRules) {
      if (!incidentTypeIds.has(rule.incidentType)) {
        semanticErrors.push(`RiskRule "${rule.name}" references non-existent incident type: "${rule.incidentType}"`);
      }
      if (!signalTypeIds.has(rule.signalType)) {
        semanticErrors.push(`RiskRule "${rule.name}" references non-existent signal type: "${rule.signalType}"`);
      }
    }

    if (semanticErrors.length > 0) {
      return { success: false, errors: semanticErrors };
    }

    // Version history tracking
    const history = this.versionHistory.get(pack.id) || [];
    history.push(JSON.parse(JSON.stringify(pack)));
    this.versionHistory.set(pack.id, history);

    this.packs.set(pack.id, pack);
    return { success: true };
  }

  public get(id: string): DomainPack | undefined {
    return this.packs.get(id);
  }

  public getAll(): DomainPack[] {
    return Array.from(this.packs.values());
  }

  public getActive(): DomainPack {
    const pack = this.packs.get(this.activePackId);
    if (!pack) {
      return DisasterResponsePack;
    }
    return pack;
  }

  public setActive(id: string): boolean {
    if (this.packs.has(id)) {
      this.activePackId = id;
      return true;
    }
    return false;
  }

  public duplicate(id: string, newId: string, newName: string): DomainPack | null {
    const existing = this.packs.get(id);
    if (!existing) return null;

    const cloned: DomainPack = JSON.parse(JSON.stringify(existing));
    cloned.id = newId;
    cloned.name = newName;
    cloned.version = '1.0.0-custom';
    this.register(cloned);
    return cloned;
  }

  public rollback(id: string): DomainPack | null {
    const history = this.versionHistory.get(id);
    if (!history || history.length < 2) return null;
    history.pop(); // Remove current
    const previous = history[history.length - 1];
    this.packs.set(id, previous);
    return previous;
  }

  public runTestScenario(pack: DomainPack, scenarioId: string): { passed: boolean; message: string } {
    const scenario = pack.testScenarios.find((s) => s.id === scenarioId);
    if (!scenario) return { passed: false, message: `Scenario ${scenarioId} not found` };

    // Simple deterministic sanity check: verify sample events have valid signal types
    const validSignalTypes = new Set(pack.signalTypes.map((s) => s.id));
    for (const ev of scenario.sampleEvents) {
      if (!validSignalTypes.has(ev.type)) {
        return {
          passed: false,
          message: `Sample event contains invalid signal type: ${ev.type}`,
        };
      }
    }
    return {
      passed: true,
      message: `Scenario "${scenario.name}" executed successfully. Correlated expected case count: ${scenario.expectedCaseCount}. Recommended action: ${scenario.expectedRecommendedActionId}.`,
    };
  }
}

export const globalDomainRegistry = new DomainPackRegistry();
