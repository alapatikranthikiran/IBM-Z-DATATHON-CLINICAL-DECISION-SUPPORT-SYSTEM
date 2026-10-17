import React from 'react';
import { useEngine } from '../context/EngineContext';
import {
  LayoutDashboard,
  Activity,
  SlidersHorizontal,
  Package,
  Layers,
  FileCheck2,
  Cpu,
  Settings as SettingsIcon,
  ShieldAlert,
  Stethoscope,
  HeartPulse,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, cases, resources, reliability, t } = useEngine();

  const openCasesCount = cases.filter((c) => c.status === 'active' || c.status === 'under_review').length;
  const criticalCasesCount = cases.filter((c) => c.severity >= 80 && c.status !== 'resolved').length;
  const hasStaleTelemetry = reliability.staleSourceCount > 0 || reliability.contradictorySignalCount > 0;

  const navItems = [
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
      badgeTone: criticalCasesCount > 0 ? 'text-rose-400 font-bold' : 'text-teal-400',
    },
    {
      id: 'scenario-lab',
      label: t('navScenarioLab'),
      icon: SlidersHorizontal,
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
      id: 'resources',
      label: t('navResources'),
      icon: Layers,
      badgeText: null,
      badgeTone: '',
    },
    {
      id: 'decision-ledger',
      label: t('navLedger'),
      icon: FileCheck2,
      badgeText: null,
      badgeTone: '',
    },
    {
      id: 'reliability',
      label: t('navReliability'),
      icon: Cpu,
      badgeText: hasStaleTelemetry ? 'ALERT' : null,
      badgeTone: 'text-amber-400 font-bold',
    },
    {
      id: 'settings',
      label: t('navSettings'),
      icon: SettingsIcon,
      badgeText: null,
      badgeTone: '',
    },
  ];

  return (
    <aside className="w-60 border-r border-slate-800 bg-slate-950 flex flex-col justify-between select-none shrink-0 h-[calc(100vh-3.5rem)] sticky top-14 text-slate-300">
      {/* Top Section */}
      <div className="flex flex-col">
        {/* Ward / Hospital Unit Sub-header */}
        <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-[11px] font-mono tracking-wider text-slate-300 uppercase font-semibold">
              ACUTE CARE TOWER
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">STATION 04</span>
        </div>

        {/* Navigation list */}
        <nav className="p-2 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-colors text-left ${
                  isActive
                    ? 'bg-slate-900 text-teal-300 font-semibold border-l-2 border-teal-500 rounded-l-none'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badgeText && (
                  <span className={`text-[11px] font-mono tabular-nums ${item.badgeTone}`}>
                    {item.badgeText}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Clinical Regulatory Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
        <div className="flex flex-col gap-1 text-[11px]">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
            <span>CDSS ENGINE v2.1</span>
            <span className="text-teal-400">NOMINAL</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Deterministic triage scoring with human-in-the-loop validation.
          </p>
        </div>
      </div>
    </aside>
  );
};
