import React from 'react';
import { useEngine } from '../context/EngineContext';
import {
  HeartPulse,
  Activity,
  Layers,
  Radio,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Cpu,
  Sparkles,
  CheckCircle2,
  FileCheck2,
  Shield,
  Stethoscope,
  Bed,
  Users,
} from 'lucide-react';

export const CommandCenter: React.FC = () => {
  const {
    activePack,
    cases,
    optionsMap,
    resources,
    signals,
    reliability,
    setActiveTab,
    triggerScenario,
    t,
  } = useEngine();

  const openCases = cases.filter((c) => c.status === 'active' || c.status === 'under_review');
  const criticalCases = openCases.filter((c) => c.severity >= 80);
  const awaitingApproval = openCases.filter((c) => c.recommendedActionId);
  const totalBedsAvailable = resources.reduce((sum, r) => sum + r.availableQuantity, 0);
  const totalBedsCap = resources.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto text-slate-200">
      {/* Top Clinical Protocol Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="text-teal-400 font-semibold">{t('activePack')}</span>
            <span aria-hidden="true">·</span>
            <span>Version {activePack?.version}</span>
            <span aria-hidden="true">·</span>
            <span>{activePack?.industryCategory}</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            {activePack?.name}
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {activePack?.description}
          </p>
          <div className="text-[11px] text-amber-300/90 font-mono mt-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>{t('clinicalDisclaimer')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('decision-cases')}
            className="px-4 py-2 rounded bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>{t('navDecisionCases')} ({openCases.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hospital KPI Metrics Grid - Authentic Tabular Display */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Active Triage Cases */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium">{t('openCases')}</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">{openCases.length}</span>
            <span className="text-[10px] text-slate-400">cases</span>
          </div>
          <div className="text-[10px] text-teal-400 mt-2 font-mono">
            Correlated incidents
          </div>
        </div>

        {/* KPI 2: ESI 1-2 Critical Cases */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium">{t('criticalTier')}</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-2xl font-bold font-mono tabular-nums ${criticalCases.length > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {criticalCases.length}
            </span>
            <span className="text-[10px] text-slate-400">acute risk</span>
          </div>
          <div className="text-[10px] text-rose-400 mt-2 font-mono">
            {criticalCases.length > 0 ? 'Acuity score ≥80' : 'Safe vital range'}
          </div>
        </div>

        {/* KPI 3: Pending Signoff */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium">{t('awaitingApproval')}</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-amber-300 tabular-nums">{awaitingApproval.length}</span>
            <span className="text-[10px] text-slate-400">orders</span>
          </div>
          <div className="text-[10px] text-amber-400 mt-2 font-mono">
            Human-in-the-loop gate
          </div>
        </div>

        {/* KPI 4: Beds Available */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium">{t('availableResources')}</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold font-mono text-teal-400 tabular-nums">{totalBedsAvailable}</span>
            <span className="text-[10px] text-slate-400 font-mono">/ {totalBedsCap} beds</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            {Math.round((totalBedsAvailable / Math.max(1, totalBedsCap)) * 100)}% capacity margin
          </div>
        </div>

        {/* KPI 5: Degraded Sensors */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium">{t('degradedSources')}</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-2xl font-bold font-mono tabular-nums ${reliability.staleSourceCount > 0 ? 'text-amber-400' : 'text-teal-400'}`}>
              {reliability.staleSourceCount}
            </span>
            <span className="text-[10px] text-slate-400">nodes</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            {reliability.contradictorySignalCount} conflicting read(s)
          </div>
        </div>

        {/* KPI 6: Processing Latency */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium">{t('latency')}</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold font-mono text-cyan-300 tabular-nums">
              {reliability.averageProcessingLatencyMs}
            </span>
            <span className="text-[10px] text-slate-400">ms</span>
          </div>
          <div className="text-[10px] text-teal-400 mt-2 font-mono">
            Deterministic sub-25ms
          </div>
        </div>
      </div>

      {/* Main Grid: Active Clinical Triage Cases + Live Telemetry Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Triage Cases Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                {t('activeIncidentsTitle')}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Emergency Severity Index (ESI)
            </span>
          </div>

          {openCases.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg">
              <CheckCircle2 className="w-9 h-9 text-teal-500/50 mb-2" />
              <p className="text-xs font-semibold text-slate-300">{t('noIncidents')}</p>
              <p className="text-[11px] text-slate-500 mt-1">Patient flow and vital parameters within nominal boundaries.</p>
              <button
                onClick={() => triggerScenario('one_escalating_incident')}
                className="mt-3 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
              >
                Inject Sample Inflow Surge
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {openCases.map((c) => {
                const caseOpts = optionsMap[c.id] || [];
                const recommended = caseOpts.find((o) => o.id === c.recommendedActionId) || caseOpts[0];
                const isEmergent = c.severity >= 80;

                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveTab('decision-cases')}
                    className="cursor-pointer bg-slate-950 border border-slate-800 hover:border-teal-500/60 rounded-lg p-3.5 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span
                          className={`font-bold ${
                            isEmergent ? 'text-rose-400' : 'text-amber-400'
                          }`}
                        >
                          {isEmergent ? 'ESI 1-2 (EMERGENT)' : 'ESI 3 (URGENT)'}
                        </span>
                        <span className="text-slate-600" aria-hidden="true">·</span>
                        <span className="text-slate-400">{c.affectedEntities.join(', ')}</span>
                        <span className="text-slate-600" aria-hidden="true">·</span>
                        <span className="text-slate-500">v{c.stateVersion}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5">{c.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {c.correlationReason}
                      </p>
                      {recommended && (
                        <div className="flex items-center gap-1.5 text-xs text-teal-400 mt-1 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span>{t('recommendationLabel')}: {recommended.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0 sm:self-center">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-mono block uppercase">
                          {t('priorityScore')}
                        </span>
                        <span className="text-xl font-bold font-mono text-teal-400 tabular-nums">
                          {c.priorityScore}
                          <span className="text-xs text-slate-500">/100</span>
                        </span>
                      </div>
                      <button className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Live Telemetry Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-teal-400" />
              <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">
                {t('telemetryTitle')}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">HL7 / FHIR</span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[460px] pr-1">
            {signals.slice(0, 15).map((sig) => {
              const isStale = sig.qualityStatus === 'stale';
              const isConflict = sig.qualityStatus === 'conflicting';
              return (
                <div
                  key={sig.id}
                  className="bg-slate-950 border border-slate-800/80 rounded p-2.5 flex items-center justify-between text-xs"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 font-medium text-slate-200">
                      <span>{sig.type.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        [{sig.entityId}]
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {sig.source} · {new Date(sig.eventTimestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="font-bold font-mono text-teal-300 tabular-nums">
                      {sig.value} <span className="text-[10px] text-slate-400">{sig.unit}</span>
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase ${
                        isConflict
                          ? 'text-amber-400 font-bold'
                          : isStale
                          ? 'text-slate-500'
                          : 'text-teal-400'
                      }`}
                    >
                      {sig.qualityStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Clinical Incident Injection Suite */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Clinical Incident Simulation Suite
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Reproducible CDSS test vectors</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            onClick={() => triggerScenario('normal_operation')}
            className="p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-left text-xs transition-colors"
          >
            <div className="font-semibold text-slate-200">1. Nominal Operation</div>
            <div className="text-[10px] text-slate-400 mt-1">Normal triage inflow</div>
          </button>
          <button
            onClick={() => triggerScenario('one_escalating_incident')}
            className="p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-left text-xs transition-colors"
          >
            <div className="font-semibold text-amber-300">2. Emergency ED Surge</div>
            <div className="text-[10px] text-slate-400 mt-1">Mass patient inflow breach</div>
          </button>
          <button
            onClick={() => triggerScenario('two_incidents_competing_resource')}
            className="p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-rose-500/40 text-left text-xs transition-colors"
          >
            <div className="font-semibold text-rose-300">3. ICU Bed Contention</div>
            <div className="text-[10px] text-slate-400 mt-1">Dual wards, 1 ICU team</div>
          </button>
          <button
            onClick={() => triggerScenario('stale_critical_sensor')}
            className="p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-left text-xs transition-colors"
          >
            <div className="font-semibold text-slate-300">4. Stale Telemetry</div>
            <div className="text-[10px] text-slate-400 mt-1">Telemetry expired TTL</div>
          </button>
          <button
            onClick={() => triggerScenario('contradictory_sources')}
            className="p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-left text-xs transition-colors"
          >
            <div className="font-semibold text-amber-300">5. Conflicting Vitals</div>
            <div className="text-[10px] text-slate-400 mt-1">Dual monitor disagreement</div>
          </button>
          <button
            onClick={() => triggerScenario('recovery_after_intervention')}
            className="p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-teal-500/40 text-left text-xs transition-colors"
          >
            <div className="font-semibold text-teal-300">6. Post-Intervention</div>
            <div className="text-[10px] text-slate-400 mt-1">Recovery trajectory</div>
          </button>
        </div>
      </div>
    </div>
  );
};
