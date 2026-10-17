import { Signal, QualityStatus, DomainPack } from '../types';

export interface RawEventInput {
  domainPackId?: string;
  entityId?: string;
  type?: string;
  value?: any;
  unit?: string;
  source?: string;
  timestamp?: number | string;
  metadata?: Record<string, any>;
}

export interface NormalizationResult {
  success: boolean;
  signal?: Signal;
  error?: string;
}

export class EventNormalizer {
  /**
   * Normalizes an incoming raw event dictionary into a validated Signal object.
   */
  public static normalize(
    raw: RawEventInput,
    currentSimTime: number,
    activePack: DomainPack,
    existingSignals: Signal[] = []
  ): NormalizationResult {
    if (!raw) {
      return { success: false, error: 'Empty payload received.' };
    }

    if (!raw.entityId || typeof raw.entityId !== 'string') {
      return { success: false, error: 'Malformed event: Missing or invalid entityId string.' };
    }

    if (!raw.type || typeof raw.type !== 'string') {
      return { success: false, error: 'Malformed event: Missing or invalid signal type.' };
    }

    if (raw.value === undefined || raw.value === null || raw.value === '') {
      return { success: false, error: 'Malformed event: Missing signal value.' };
    }

    // Convert timestamp
    let eventTimestamp = currentSimTime;
    if (raw.timestamp) {
      const parsed = typeof raw.timestamp === 'string' ? Date.parse(raw.timestamp) : Number(raw.timestamp);
      if (!isNaN(parsed) && parsed > 0) {
        eventTimestamp = parsed;
      }
    }

    const freshnessSeconds = Math.max(0, Math.round((currentSimTime - eventTimestamp) / 1000));
    const signalDef = activePack.signalTypes.find((s) => s.id === raw.type);

    // Determine quality status
    let qualityStatus: QualityStatus = 'complete';

    if (signalDef && freshnessSeconds > signalDef.stalenessThresholdSeconds) {
      qualityStatus = 'stale';
    }

    // Check for conflicting readings from different sources within 15 seconds
    const conflictingReading = existingSignals.find(
      (s) =>
        s.entityId === raw.entityId &&
        s.type === raw.type &&
        s.source !== (raw.source || 'sim-sensor') &&
        Math.abs(s.eventTimestamp - eventTimestamp) < 15000 &&
        typeof s.value === 'number' &&
        typeof raw.value === 'number' &&
        Math.abs(s.value - Number(raw.value)) / Math.max(1, s.value) > 0.4 // >40% discrepancy
    );

    if (conflictingReading) {
      qualityStatus = 'conflicting';
    }

    // Construct Signal
    const signal: Signal = {
      id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      domainPackId: raw.domainPackId || activePack.id,
      entityId: raw.entityId,
      type: raw.type,
      value: typeof raw.value === 'number' ? Number(raw.value) : isNaN(Number(raw.value)) ? raw.value : Number(raw.value),
      unit: raw.unit || signalDef?.unit || '',
      source: raw.source || 'default-sensor',
      eventTimestamp,
      receivedTimestamp: currentSimTime,
      freshnessSeconds,
      qualityStatus,
      metadata: raw.metadata || {},
      rawPayload: raw,
    };

    return { success: true, signal };
  }

  /**
   * Parse CSV string into an array of RawEventInput
   */
  public static parseCsv(csvText: string): RawEventInput[] {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim());
    const results: RawEventInput[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length === headers.length) {
        const obj: any = {};
        headers.forEach((h, idx) => {
          obj[h] = parts[idx];
        });
        results.push(obj);
      }
    }
    return results;
  }
}
