import React from 'react';
import { useEngine } from '../context/EngineContext';
import {
  LayoutDashboard,
  HeartPulse,
  SlidersHorizontal,
  Package,
  Layers,
  FileCheck2,
  Cpu,
  Settings as SettingsIcon,
  Stethoscope,
  ShieldCheck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, cases, reliability, t } = useEngine();

  const openCasesCount = cases.filter((c) => c.status === 'active' || c.status === 'under_review').length;
  const criticalCasesCount = cases.filter((c) => c.severity >= 80 && c.status !== 'resolved').length;
  const hasStaleTelemetry = reliability.staleSourceCount > 0 || reliability.contradictorySignalCount > 0;

  const navSections = [
    {
      title: 'Clinical Operations',
      items: [
        {
          id: 'command-center',
          label: t('navCommandCenter'),
          icon: LayoutDashboard,
          badgeText: null,
          badgeTone: '',
        },
        {
          id: 'decision-cases',
          label: t('navDecisionCases'),
          icon: HeartPulse,
          badgeText: openCasesCount > 0 ? `${openCasesCount}` : null,
          badgeTone: criticalCasesCount > 0 ? 'bg-rose-500/20 text-rose-300 font-bold' : 'bg-teal-500/20 text-teal-300',
        },
        {
          id: 'resources',
          label: t('navResources'),
          icon: Layers,
          badgeText: null,
          badgeTone: '',
        },
      ],
    },
    {
      title: 'Simulation & Intelligence',
      items: [
        {
          id: 'scenario-lab',
          label: t('navScenarioLab'),
          icon: SlidersHorizontal,
          badgeText: null,
          badgeTone: '',
        },
        {
          id: 'reliability',
          label: t('navReliability'),
          icon: Cpu,
          badgeText: hasStaleTelemetry ? 'ALERT' : null,
          badgeTone: 'bg-amber-500/20 text-amber-300 font-bold',
        },
      ],
    },
    {
      title: 'Governance & Auditing',
      items: [
        {
          id: 'decision-ledger',
          label: t('navLedger'),
          icon: FileCheck2,
          badgeText: null,
          badgeTone: '',
        },
        {
          id: 'domain-studio',
          label: t('navDomainStudio'),
          icon: Package,
          badgeText: null,
          badgeTone: '',
        },
        {
          id: 'settings',
          label: t('navSettings'),
          icon: SettingsIcon,
          badgeText: null,
          badgeTone: '',
        },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950 flex flex-col justify-between select-none shrink-0 h-[calc(100vh-3.75rem)] sticky top-15 text-slate-300">
      {/* Navigation Groups */}
      <div className="flex flex-col py-3 px-3 overflow-y-auto">
        {/* Ward Badge */}
        <div className="mb-4 px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-wide">
                Acute Care Station
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Tower Unit 04</span>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-teal-400 shadow-sm" title="Unit Online" />
        </div>

        {/* Sectioned Navigation list */}
        <div className="space-y-4">
          {navSections.map((section, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <span className="px-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {section.title}
              </span>
              <nav className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                        isActive
                          ? 'bg-teal-500/10 text-teal-300 font-semibold border border-teal-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badgeText && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${item.badgeTone}`}>
                          {item.badgeText}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* Clinical Regulatory Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-medium text-slate-300">CDSS Engine v2.1</span>
          </div>
          <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
            NOMINAL
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
          Deterministic scoring with human clinician sign-off requirement.
        </p>
      </div>
    </aside>
  );
};
