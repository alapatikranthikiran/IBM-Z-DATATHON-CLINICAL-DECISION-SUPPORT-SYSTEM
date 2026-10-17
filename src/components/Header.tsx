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
  Globe,
  Activity,
  Layers,
  ChevronDown,
  Bot,
} from 'lucide-react';
import { UserRole } from '../types';
import { InjectEventModal } from './InjectEventModal';
import { GuidedDemoModal } from './GuidedDemoModal';
import { ClinicalChatDrawer } from './ClinicalChatDrawer';
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
  const [showSimControls, setShowSimControls] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);

  // Format simulated timestamp
  const simDate = new Date(simTime);
  const timeFormatted = simDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateFormatted = simDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  const roles: { id: UserRole; labelKey: string }[] = [
    { id: 'Operator', labelKey: 'roleOperator' },
    { id: 'Supervisor', labelKey: 'roleSupervisor' },
    { id: 'Administrator', labelKey: 'roleAdministrator' },
    { id: 'Auditor', labelKey: 'roleAuditor' },
  ];

  return (
    <>
      <header className="h-15 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 select-none sticky top-0 z-40 text-slate-200">
        {/* Brand & Hospital Station */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold shadow-sm">
              <Activity className="w-4 h-4 text-teal-400 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">
                  AEGIS <span className="text-teal-400 font-mono text-xs">CDSS</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  Acute Care
                </span>
              </div>
              <span className="text-[11px] text-slate-400 hidden md:block">
                Clinical Decision Support System
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden lg:block mx-1" />

          {/* Clinical Protocol Selector */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">{t('activePack')}:</span>
            <div className="relative">
              <select
                value={activePack?.id || ''}
                onChange={(e) => changePack(e.target.value)}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-teal-300 text-xs font-medium rounded-md pl-2.5 pr-7 py-1 outline-none appearance-none cursor-pointer transition-colors"
              >
                {packs.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Center: Streamlined Clinical Time & Simulation Capsule */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1 gap-2.5 text-xs font-mono shadow-sm">
            {/* Stream Status */}
            <div className="flex items-center gap-1.5" title={streamConnected ? 'HL7/FHIR telemetry active' : 'Disconnected'}>
              <span className={`w-2 h-2 rounded-full ${streamConnected ? 'bg-teal-400 ring-2 ring-teal-400/20 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[11px] font-medium text-slate-300 hidden xl:inline">
                {streamConnected ? 'HL7/FHIR' : 'OFFLINE'}
              </span>
            </div>

            <span className="text-slate-700">|</span>

            {/* Time display */}
            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 text-[11px] hidden xl:inline">{dateFormatted}</span>
              <span className="text-teal-300 font-bold tabular-nums">{timeFormatted}</span>
            </div>

            <span className="text-slate-700">|</span>

            {/* Play/Pause & Speed */}
            <div className="flex items-center gap-1">
              <button
                onClick={togglePlayPause}
                className={`p-1 rounded transition-colors ${
                  isRunning ? 'text-amber-400 hover:bg-slate-800' : 'text-teal-400 hover:bg-slate-800'
                }`}
                title={isRunning ? 'Pause simulation' : 'Resume simulation'}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={resetSimulation}
                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Reset simulation time"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-0.5 ml-1 border-l border-slate-800 pl-1.5 text-[11px]">
                {[1, 2, 5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setSimSpeed(speed)}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      simSpeed === speed
                        ? 'bg-teal-500/20 text-teal-300 font-bold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Controls & User Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Multi-Language Selector */}
          <div className="relative">
            <div className="flex items-center bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md px-2 py-1 gap-1.5 transition-colors">
              <Globe className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="bg-transparent text-xs font-medium text-slate-200 outline-none cursor-pointer pr-4 appearance-none"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-100">
                    {lang.flag} {lang.nativeName}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
            </div>
          </div>

          {/* Clinical User Role */}
          <div className="relative hidden sm:block">
            <div className="flex items-center bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md px-2 py-1 gap-1.5 transition-colors">
              <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value as UserRole)}
                className="bg-transparent text-xs font-medium text-slate-200 outline-none cursor-pointer pr-4 appearance-none"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-slate-100">
                    {t(r.labelKey)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
            </div>
          </div>

          {/* Quick Action: Inject Vitals Spike */}
          <button
            onClick={() => setShowInjectModal(true)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors"
            title="Inject simulated patient telemetry spike"
          >
            <Send className="w-3.5 h-3.5 text-teal-400" />
            <span>{t('injectEventBtn')}</span>
          </button>

          {/* Gemini Clinical Copilot CTA */}
          <button
            onClick={() => setShowChatDrawer(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/35 text-teal-300 font-semibold text-xs transition-colors shadow-sm cursor-pointer"
            title="Open Gemini Clinical Copilot"
          >
            <Bot className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">AI Copilot</span>
          </button>

          {/* Clinical Guided Demo CTA */}
          <button
            onClick={() => setRunGuidedDemo(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            <span className="hidden sm:inline">{t('guidedDemoBtn')}</span>
            <span className="sm:hidden">Demo</span>
          </button>
        </div>
      </header>

      {/* Modals & Drawers */}
      {showInjectModal && <InjectEventModal onClose={() => setShowInjectModal(false)} />}
      {runGuidedDemo && <GuidedDemoModal onClose={() => setRunGuidedDemo(false)} />}
      <ClinicalChatDrawer isOpen={showChatDrawer} onClose={() => setShowChatDrawer(false)} />
    </>
  );
};
