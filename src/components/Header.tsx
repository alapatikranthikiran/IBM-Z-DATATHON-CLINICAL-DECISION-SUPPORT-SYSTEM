import React, { useState } from 'react';
import { useEngine } from '../context/EngineContext';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  UserCheck,
  Send,
  Sparkles,
  Layers,
  Globe,
  Shield,
  Activity,
} from 'lucide-react';
import { UserRole } from '../types';
import { InjectEventModal } from './InjectEventModal';
import { GuidedDemoModal } from './GuidedDemoModal';
import { LANGUAGES, SupportedLanguage } from '../i18n';

export const Header: React.FC = () => {
  const {
    activePack,
    packs,
    changePack,
    simTime,
    isRunning,
    togglePlayPause,
    resetSimulation,
    simSpeed,
    setSimSpeed,
    activeRole,
    setActiveRole,
    streamConnected,
    runGuidedDemo,
    setRunGuidedDemo,
    language,
    setLanguage,
    t,
  } = useEngine();

  const [showInjectModal, setShowInjectModal] = useState(false);

  // Format simulated timestamp (clinical triage clock)
  const simDate = new Date(simTime);
  const timeFormatted = simDate.toLocaleTimeString('en-US', { hour12: false });
  const dateFormatted = simDate.toISOString().slice(0, 10);

  const roles: { id: UserRole; labelKey: string }[] = [
    { id: 'Operator', labelKey: 'roleOperator' },
    { id: 'Supervisor', labelKey: 'roleSupervisor' },
    { id: 'Administrator', labelKey: 'roleAdministrator' },
    { id: 'Auditor', labelKey: 'roleAuditor' },
  ];

  return (
    <>
      <header className="h-14 border-b border-slate-800 bg-slate-950 px-4 flex items-center justify-between gap-4 select-none sticky top-0 z-40 text-slate-200">
        {/* Zone 1: Clinical Brand & Active Ward Protocol */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-teal-600 rounded flex items-center justify-center text-slate-950 font-bold">
              <Activity className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white block leading-tight">
                AEGIS <span className="text-teal-400 font-mono">CDSS</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                CLINICAL DECISION SUPPORT
              </span>
            </div>
          </div>

          <span className="text-slate-700 hidden sm:inline" aria-hidden="true">|</span>

          {/* Active Clinical Protocol Selector */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase">
              {t('activePack')}:
            </span>
            <select
              value={activePack?.id || ''}
              onChange={(e) => changePack(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs font-semibold text-teal-300 outline-none cursor-pointer hover:border-slate-700"
            >
              {packs.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Clinical Simulation Disclaimer - Crisp, unboxed with hairline marker */}
          <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono text-amber-300 border-l border-slate-800 pl-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>{t('simulatedData')}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 text-[10px]">{t('hipaaCompliant')}</span>
          </div>
        </div>

        {/* Zone 2: Telemetry Clock, Stream Status, Simulation Speed */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Triage Clock */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">{dateFormatted}</span>
            <span className="text-teal-300 font-bold tabular-nums">{timeFormatted}</span>
          </div>

          {/* Stream telemetry indicator */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                streamConnected ? 'bg-teal-400' : 'bg-rose-500'
              }`}
            />
            <span className={streamConnected ? 'text-teal-300' : 'text-rose-400'}>
              {streamConnected ? 'HL7/FHIR STREAM' : 'LOCAL CACHE'}
            </span>
          </div>

          {/* Clock controls */}
          <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
            <button
              onClick={togglePlayPause}
              className={`p-1 rounded text-xs transition-colors ${
                isRunning ? 'text-amber-300 hover:bg-slate-800' : 'text-teal-300 hover:bg-slate-800'
              }`}
              title={isRunning ? 'Pause clinical clock' : 'Resume clinical clock'}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={resetSimulation}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Reset triage clock"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center border-l border-slate-800 pl-1 ml-0.5 text-[11px] font-mono">
              {[1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setSimSpeed(speed)}
                  className={`px-1.5 py-0.5 rounded ${
                    simSpeed === speed ? 'bg-slate-800 text-teal-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Zone 3: Language Picker, Role Selector, and Primary Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Multi-Language Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-100">
                  {lang.flag} {lang.nativeName}
                </option>
              ))}
            </select>
          </div>

          {/* Clinical User Role */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as UserRole)}
              className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-slate-100">
                  {t(r.labelKey)}
                </option>
              ))}
            </select>
          </div>

          {/* Transmit Vitals Spike (Inject Event) */}
          <button
            onClick={() => setShowInjectModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-teal-400" />
            <span>{t('injectEventBtn')}</span>
          </button>

          {/* Clinical Guided Demo CTA */}
          <button
            onClick={() => setRunGuidedDemo(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            <span>{t('guidedDemoBtn')}</span>
          </button>
        </div>
      </header>

      {/* Modals */}
      {showInjectModal && <InjectEventModal onClose={() => setShowInjectModal(false)} />}
      {runGuidedDemo && <GuidedDemoModal onClose={() => setRunGuidedDemo(false)} />}
    </>
  );
};
