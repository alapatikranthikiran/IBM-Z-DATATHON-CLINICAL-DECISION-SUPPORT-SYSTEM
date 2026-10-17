import React, { useState } from 'react';
import { useEngine } from '../context/EngineContext';
import {
  Settings as SettingsIcon,
  Shield,
  UserCheck,
  Cpu,
  Clock,
  Sparkles,
  Database,
  Lock,
  Layers,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { UserRole } from '../types';

export const SettingsPage: React.FC = () => {
  const {
    prngSeed,
    setPrngSeed,
    simSpeed,
    setSimSpeed,
    activeRole,
    setActiveRole,
    setRunGuidedDemo,
    activePack,
    resetSimulation,
    t,
  } = useEngine();

  const [inputSeed, setInputSeed] = useState(String(prngSeed));
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSeedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(inputSeed, 10);
    if (!isNaN(val)) {
      await setPrngSeed(val);
      setFeedback(`PRNG seed updated to ${val}. Clinical simulation sequence synchronized.`);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-teal-400" />
            {t('governanceTitle')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('governanceSubtitle')}
          </p>
        </div>

        <button
          onClick={() => setRunGuidedDemo(true)}
          className="px-3.5 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-slate-950" />
          <span>{t('guidedDemoBtn')}</span>
        </button>
      </div>

      {/* Role-Based Permissions Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              {t('rbacTitle')}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Current Active: {t(`role${activeRole}`)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Operator (Triage Nurse) */}
          <div
            onClick={() => setActiveRole('Operator')}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              activeRole === 'Operator'
                ? 'bg-slate-950 border-teal-500'
                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">{t('roleOperator')}</span>
              {activeRole === 'Operator' && (
                <span className="text-[10px] font-mono font-bold text-teal-400 uppercase">ACTIVE</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Reviews patient vitals, admission queues, and authorizes permitted care orders. Cannot override soft safety constraints.
            </p>
          </div>

          {/* Supervisor (Attending Physician) */}
          <div
            onClick={() => setActiveRole('Supervisor')}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              activeRole === 'Supervisor'
                ? 'bg-slate-950 border-teal-500'
                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">{t('roleSupervisor')}</span>
              {activeRole === 'Supervisor' && (
                <span className="text-[10px] font-mono font-bold text-teal-400 uppercase">ACTIVE</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Full clinical authority. Empowered to override soft clinical guidelines by providing a mandatory written rationale in the EMR audit log.
            </p>
          </div>

          {/* Administrator (Clinical Director) */}
          <div
            onClick={() => setActiveRole('Administrator')}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              activeRole === 'Administrator'
                ? 'bg-slate-950 border-teal-500'
                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">{t('roleAdministrator')}</span>
              {activeRole === 'Administrator' && (
                <span className="text-[10px] font-mono font-bold text-teal-400 uppercase">ACTIVE</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Full hospital protocol governance: manages clinical schemas, validates risk weights, executes scenario stress tests, and commits active protocols.
            </p>
          </div>

          {/* Auditor (Compliance Auditor) */}
          <div
            onClick={() => setActiveRole('Auditor')}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              activeRole === 'Auditor'
                ? 'bg-slate-950 border-teal-500'
                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">{t('roleAuditor')}</span>
              {activeRole === 'Auditor' && (
                <span className="text-[10px] font-mono font-bold text-teal-400 uppercase">ACTIVE</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Read-only oversight. Conducts clinical safety audits, reviews decision provenance graphs, and replays historic clinical cases.
            </p>
          </div>
        </div>
      </div>

      {/* Seeded PRNG & Simulation Parameters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              {t('prngSeedTitle')}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Mulberry32 PRNG Algorithm</span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {t('prngSeedSubtitle')}
        </p>

        <form onSubmit={handleSeedSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 flex-1 max-w-sm">
            <span className="text-slate-500 font-mono text-xs">SEED:</span>
            <input
              type="number"
              value={inputSeed}
              onChange={(e) => setInputSeed(e.target.value)}
              className="bg-transparent text-sm font-mono font-bold text-teal-300 outline-none w-full"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            {t('updateSeed')}
          </button>
        </form>

        {feedback && (
          <div className="p-3 rounded bg-teal-950/40 border border-teal-800 text-xs text-teal-300 font-mono">
            {feedback}
          </div>
        )}
      </div>

      {/* Hospital System Architecture Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
          Clinical Decision Engine Specifications & Interfaces
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-400">
          <div className="p-3 bg-slate-950 rounded border border-slate-800 flex flex-col gap-1">
            <span className="font-bold text-white font-mono">Deterministic Logic Core</span>
            <p className="text-[11px] leading-relaxed">
              Priority scores, feasibility states, and resource conflict utilities are computed deterministically. No LLM controls high-risk order execution.
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded border border-slate-800 flex flex-col gap-1">
            <span className="font-bold text-white font-mono">FHIR / HL7 Streaming</span>
            <p className="text-[11px] leading-relaxed">
              Telemetry ingest via Server-Sent Events with automated 3-second polling fallback. Intercepts contradictory and stale reads.
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded border border-slate-800 flex flex-col gap-1">
            <span className="font-bold text-white font-mono">Pluggable Enterprise Backends</span>
            <p className="text-[11px] leading-relaxed">
              Clean repository interfaces allowing immediate swap for IBM Db2, Apache Kafka, or LinuxONE z/OS microservice nodes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
