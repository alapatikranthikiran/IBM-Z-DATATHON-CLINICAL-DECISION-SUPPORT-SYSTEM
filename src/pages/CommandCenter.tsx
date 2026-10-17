import React, { useState } from 'react';
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
  Play,
  RotateCcw,
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

  const [activeScenarioFilter, setActiveScenarioFilter] = useState<string>('all');

  const openCases = cases.filter((c) => c.status === 'active' || c.status === 'under_review');
  const criticalCases = openCases.filter((c) => c.severity >= 80);
  const awaitingApproval = openCases.filter((c) => c.recommendedActionId);
  const totalBedsAvailable = resources.reduce((sum, r) => sum + r.availableQuantity, 0);
  const totalBedsCap = resources.reduce((sum, r) => sum + r.quantity, 0);
  const bedOccupancyRate = Math.round(((totalBedsCap - totalBedsAvailable) / Math.max(1, totalBedsCap)) * 100);

  const scenarioPresets: { id: string; label: string; desc: string }[] = [
    { id: 'normal_operation', label: 'Nominal Flow', desc: 'Standard triage arrival rate' },
    { id: 'one_escalating_incident', label: 'ED Surge', desc: 'Mass inflow with severe acute vitals' },
    { id: 'two_incidents_competing_resource', label: 'ICU Contention', desc: 'Dual wards competing for 1 bed' },
    { id: 'stale_critical_sensor', label: 'Stale Sensor', desc: 'Telemetry stream packet TTL expiry' },
    { id: 'contradictory_sources', label: 'Conflicting Vitals', desc: 'Inconsistent dual bedside monitors' },
    { id: 'recovery_after_intervention', label: 'Post-Intervention', desc: 'Positive clinical trajectory recovery' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto text-slate-200">
      {/* Top Clinical Station Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="text-teal-400 font-semibold">{activePack?.name || 'Clinical CDSS'}</span>
            <span>·</span>
            <span>Acute Care Station 04</span>
            <span>·</span>
            <span className="text-teal-300">Live Decision Feed</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Clinical Command & Triage Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time patient flow prioritization, continuous vitals telemetry, and protocol order sign-off.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('decision-cases')}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-sm hover:shadow-teal-500/20"
          >
            <HeartPulse className="w-4 h-4 text-slate-950" />
            <span>Review Patient Queue ({openCases.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hospital KPI Metrics Cards - 4 Crisp & Balanced Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Triage Cases */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700/80 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">{t('openCases')}</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white tabular-nums">{openCases.length}</span>
            <span className="text-xs text-slate-400">in triage</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Pending Orders:</span>
            <span className="text-amber-400 font-semibold font-mono">{awaitingApproval.length} to sign</span>
          </div>
        </div>

        {/* Metric 2: Critical Acuity (ESI 1-2) */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700/80 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">{t('criticalTier')} (ESI 1-2)</span>
            <AlertTriangle className={`w-4 h-4 ${criticalCases.length > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className={`text-3xl font-bold font-mono tabular-nums ${criticalCases.length > 0 ? 'text-rose-400' : 'text-teal-400'}`}>
              {criticalCases.length}
            </span>
            <span className="text-xs text-slate-400">acute risks</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Acuity Threshold:</span>
            <span className="font-mono text-slate-300">Score ≥ 80/100</span>
          </div>
        </div>

        {/* Metric 3: Bed & ICU Capacity */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700/80 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">{t('availableResources')}</span>
            <Bed className="w-4 h-4 text-teal-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-teal-300 tabular-nums">{totalBedsAvailable}</span>
            <span className="text-xs text-slate-400 font-mono">/ {totalBedsCap} available</span>
          </div>
          <div className="pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Occupancy:</span>
              <span className="font-mono text-slate-300 font-semibold">{bedOccupancyRate}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  bedOccupancyRate > 85 ? 'bg-rose-500' : bedOccupancyRate > 70 ? 'bg-amber-400' : 'bg-teal-500'
                }`}
                style={{ width: `${Math.min(100, bedOccupancyRate)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 4: Stream Quality & Latency */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700/80 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Signal Latency & Health</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-cyan-300 tabular-nums">
              {reliability.averageProcessingLatencyMs}
            </span>
            <span className="text-xs text-slate-400">ms latency</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Stale / Conflicting:</span>
            <span className={`font-mono font-semibold ${reliability.staleSourceCount > 0 ? 'text-amber-400' : 'text-teal-400'}`}>
              {reliability.staleSourceCount} stale · {reliability.contradictorySignalCount} conflict
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Priority Triage Queue (7 cols) + Bedside Telemetry Stream (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Triage Patient Cases */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                {t('activeIncidentsTitle')}
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Emergency Severity Index (ESI)
            </span>
          </div>

          {openCases.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              <CheckCircle2 className="w-10 h-10 text-teal-400/60 mb-2" />
              <h3 className="text-sm font-semibold text-slate-200">{t('noIncidents')}</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                All patient vitals and ward bed headroom are currently within safe clinical thresholds.
              </p>
              <button
                onClick={() => triggerScenario('one_escalating_incident')}
                className="mt-4 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
              >
                Inject Sample Patient Surge
              </button>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1">
              {openCases.map((c) => {
                const caseOpts = optionsMap[c.id] || [];
                const recommended = caseOpts.find((o) => o.id === c.recommendedActionId) || caseOpts[0];
                const isEmergent = c.severity >= 80;

                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveTab('decision-cases')}
                    className="cursor-pointer bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-teal-500/50 rounded-xl p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                            isEmergent
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {isEmergent ? 'ESI 1-2 EMERGENT' : 'ESI 3 URGENT'}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {c.affectedEntities.join(', ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">v{c.stateVersion}</span>
                      </div>

                      <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                        {c.title}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-1">
                        {c.correlationReason}
                      </p>

                      {recommended && (
                        <div className="flex items-center gap-1.5 text-xs text-teal-300 font-mono mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span className="truncate">Order: {recommended.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0 sm:self-center">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">
                          Acuity
                        </span>
                        <span className="text-xl font-bold font-mono text-teal-300 tabular-nums">
                          {c.priorityScore}
                          <span className="text-xs text-slate-400 font-normal">/100</span>
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 group-hover:bg-teal-500/10 group-hover:text-teal-300 text-slate-400 border border-slate-800 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Bedside Telemetry Stream */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-teal-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                {t('telemetryTitle')}
              </h2>
            </div>
            <span className="text-xs text-teal-300 font-mono">HL7 / FHIR</span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[520px] pr-1">
            {signals.slice(0, 10).map((sig) => {
              const isStale = sig.qualityStatus === 'stale';
              const isConflict = sig.qualityStatus === 'conflicting';

              return (
                <div
                  key={sig.id}
                  className="bg-slate-950/80 border border-slate-800/80 hover:border-slate-700/80 rounded-lg p-2.5 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 font-medium text-slate-200">
                      <span className="capitalize">{sig.type.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        [{sig.entityId}]
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {sig.source} · {new Date(sig.eventTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="font-bold font-mono text-teal-300 tabular-nums">
                      {sig.value} <span className="text-[10px] text-slate-400 font-normal">{sig.unit}</span>
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded mt-0.5 ${
                        isConflict
                          ? 'bg-amber-500/20 text-amber-300 font-bold'
                          : isStale
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-teal-500/10 text-teal-300'
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

      {/* Clinical Scenario Testing Strip - Compact & Refined */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Clinical Incident Scenarios
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Quickly simulate surge, bed contention, and sensor anomalies
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {scenarioPresets.map((sc) => (
            <button
              key={sc.id}
              onClick={() => triggerScenario(sc.id)}
              className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 hover:border-teal-500/50 hover:bg-slate-950 text-left text-xs transition-all group cursor-pointer"
            >
              <div className="font-semibold text-slate-200 group-hover:text-teal-300 transition-colors">
                {sc.label}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                {sc.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
