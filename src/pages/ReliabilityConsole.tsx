import React, { useState } from 'react';
import { useEngine } from '../context/EngineContext';
import {
  Cpu,
  Radio,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Sparkles,
  Clock,
  HeartPulse,
  Activity,
  Layers,
} from 'lucide-react';

export const ReliabilityConsole: React.FC = () => {
  const {
    reliability,
    disconnectedSources,
    disconnectSource,
    restoreSource,
    toggleGemini,
    injectEvent,
    triggerScenario,
    t,
  } = useEngine();

  const [feedback, setFeedback] = useState<string | null>(null);

  const sourcesList = [
    { id: 'icu-bedside-monitor-04', name: 'ICU Bedside Multi-Parameter Monitor 04 (HR/SpO2/ABP)', isCritical: true, protocol: 'HL7 v2.5 / IHE PCD-01' },
    { id: 'ed-triage-telemetry-01', name: 'ED Rapid Triage Vitals Monitor Bay 01', isCritical: true, protocol: 'FHIR R4 Observation Stream' },
    { id: 'stat-lab-analyzer-02', name: 'Central Stat Lab Blood Gas & Lactate Analyzer', isCritical: false, protocol: 'ASTM 1394 / HL7 LIS' },
    { id: 'ventilator-flow-hub-01', name: 'Acute Care Ventilator & Respiratory Flow Hub', isCritical: false, protocol: 'IEEE 11073 Point-of-Care' },
  ];

  const handleInjectMalformed = async () => {
    const res = await injectEvent({
      entityId: 'PATIENT-CORRUPTED-EMR',
      value: null,
      source: 'malformed-telemetry-packet',
    });
    setFeedback(`Malformed HL7 payload intercepted: EventNormalizer rejected corrupted packet ("${res.error}"). Recorded in clinical audit log.`);
  };

  const handleInjectContradictory = async () => {
    await triggerScenario('contradictory_sources');
    setFeedback('Contradictory bedside vital readings injected across primary and backup sensors. Deterministic engine flags contradiction to attending physician.');
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-teal-400" />
            {t('telemetryTitleConsole')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('telemetrySubtitle')}
          </p>
        </div>

        {/* Deterministic Fallback status badge */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded px-3 py-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-400">{t('geminiStatus')}:</span>
          <span
            className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
              reliability.deterministicFallbackActive
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                : 'bg-teal-950/80 text-teal-300 border border-teal-800'
            }`}
          >
            {reliability.deterministicFallbackActive
              ? t('deterministicFallbackActive')
              : t('geminiOnline')}
          </span>
        </div>
      </div>

      {/* KPI Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400">{t('activeStreams')}</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-teal-400 tabular-nums">
              {reliability.connectedSources}
            </span>
            <span className="text-xs text-slate-500 font-mono">/ {reliability.totalSources} online</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-2">
            {disconnectedSources.length} node(s) offline
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400">Blocked Malformed Packets</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
              {reliability.malformedEventCount}
            </span>
            <span className="text-xs text-slate-500 font-mono">quarantined</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-2">
            FHIR validation active
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400">{t('contradictoryReadings')}</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-cyan-300 tabular-nums">
              {reliability.contradictorySignalCount}
            </span>
            <span className="text-xs text-slate-500 font-mono">detected</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-2">
            Silent averaging prevented
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400">{t('latency')}</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold font-mono text-teal-300 tabular-nums">
              {reliability.averageProcessingLatencyMs}
            </span>
            <span className="text-xs text-slate-500 font-mono">ms</span>
          </div>
          <div className="text-[10px] text-teal-400 font-mono mt-2">
            Deterministic sub-25ms
          </div>
        </div>
      </div>

      {/* Clinical Telemetry Fault Injection Suite */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Clinical Telemetry Fault & Resilience Verification
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Validate failover without interrupting triage operations
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action 1: Toggle Gemini to test fallback */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>AI Grounding Failover</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Toggle to simulate LLM network loss. Verifies all ESI triage scoring and safety constraints continue deterministically.
              </p>
            </div>
            <button
              onClick={toggleGemini}
              className={`w-full py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                reliability.deterministicFallbackActive
                  ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
              }`}
            >
              <span>{reliability.deterministicFallbackActive ? 'Restore Gemini API' : t('toggleFallbackBtn')}</span>
            </button>
          </div>

          {/* Action 2: Inject Malformed Event */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Corrupted HL7 Message</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Transmit a malformed payload missing mandatory clinical identifiers. Verifies Zod quarantine.
              </p>
            </div>
            <button
              onClick={handleInjectMalformed}
              className="w-full py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
            >
              <span>Inject Malformed Event</span>
            </button>
          </div>

          {/* Action 3: Inject Contradictory Reading */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Conflicting Vital Monitors</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Inject divergent blood pressure & SpO2 readings for the same patient bay to test contradiction flagging.
              </p>
            </div>
            <button
              onClick={handleInjectContradictory}
              className="w-full py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
            >
              <span>Inject Conflicting Vitals</span>
            </button>
          </div>

          {/* Action 4: Stale Critical Reading */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Telemetry TTL Expiration</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Inject vital readings with an event timestamp older than 30s. Confirms telemetry staleness flag.
              </p>
            </div>
            <button
              onClick={() => triggerScenario('stale_critical_sensor')}
              className="w-full py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
            >
              <span>Inject Stale Telemetry</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className="p-3 rounded bg-teal-950/40 border border-teal-800/80 text-xs text-teal-300 font-mono">
            {feedback}
          </div>
        )}
      </div>

      {/* Connected Data Sources Health Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Point-of-Care Bedside & Telemetry Streams
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Clinical Device Link Simulator
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sourcesList.map((src) => {
            const isDisconnected = disconnectedSources.includes(src.id);
            return (
              <div
                key={src.id}
                className={`p-3.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                  isDisconnected
                    ? 'bg-rose-950/20 border-rose-900/60'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isDisconnected ? 'bg-rose-500' : 'bg-teal-400'
                      }`}
                    />
                    <span className="font-bold text-white">{src.name}</span>
                    {src.isCritical && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60 font-semibold uppercase">
                        High Priority
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Node: {src.id} · Protocol: {src.protocol}
                  </span>
                </div>

                <button
                  onClick={() =>
                    isDisconnected ? restoreSource(src.id) : disconnectSource(src.id)
                  }
                  className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors ${
                    isDisconnected
                      ? 'bg-teal-600 hover:bg-teal-500 text-slate-950'
                      : 'bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300'
                  }`}
                >
                  {isDisconnected ? t('restoreSensor') : t('disconnectSensor')}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Logged Pipeline Errors */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
          Recent Clinical Pipeline Validation Logs ({reliability.recentErrors.length})
        </h3>
        {reliability.recentErrors.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono">All incoming telemetry conforms to HL7/FHIR schemas without exceptions.</p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px]">
            {reliability.recentErrors.map((err, i) => (
              <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800/80 text-rose-300 flex items-center justify-between">
                <span>[{err.component}]: {err.message}</span>
                <span className="text-slate-500 text-[10px]">{new Date(err.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
