import React, { useState } from 'react';
import { useEngine } from '../context/EngineContext';
import {
  Layers,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Zap,
  Clock,
  Shield,
  ArrowRight,
  Bed,
} from 'lucide-react';
import { ResourceAllocationPlan } from '../engine/optimizer';

export const ResourcesPage: React.FC = () => {
  const { resources, cases, activePack, refreshState, t } = useEngine();

  const [allocationPlan, setAllocationPlan] = useState<ResourceAllocationPlan | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleToggleLock = async (resId: string) => {
    try {
      const res = await fetch('/api/resources/toggle-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId: resId }),
      });
      if (res.ok) {
        await refreshState();
      }
    } catch (err) {
      console.warn('Failed to toggle lock:', err);
    }
  };

  const handleRunOptimizer = async () => {
    setIsOptimizing(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/resources/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setAllocationPlan(data);
      setFeedback('Deterministic hospital resource utility solver executed.');
    } catch {
      setFeedback('Optimizer failed to solve bed assignment.');
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Bed className="w-5 h-5 text-teal-400" />
            {t('resourceTitle')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('resourceSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunOptimizer}
            disabled={isOptimizing}
            className="px-3.5 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>{isOptimizing ? t('optimizing') : t('runOptimizerBtn')}</span>
          </button>
        </div>
      </div>

      {/* Optimizer Explanation Banner (if run) */}
      {allocationPlan && (
        <div className="bg-slate-900 border border-teal-500/50 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono text-[10px] font-bold">
                {t('optimizedPlan')}
              </span>
              <span className="text-xs text-slate-300 font-bold">
                Total Acuity Utility: {allocationPlan.totalUtility}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Plan ID: {allocationPlan.planId}</span>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed font-mono">
            {allocationPlan.summaryExplanation}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allocationPlan.assignments.map((asg) => {
              const isDelayed = asg.status === 'delayed';
              return (
                <div
                  key={asg.caseId}
                  className={`p-3.5 rounded-lg border flex flex-col gap-2 ${
                    isDelayed ? 'bg-amber-950/20 border-amber-800/60' : 'bg-slate-950 border-teal-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{asg.caseTitle}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        isDelayed ? 'bg-amber-500/20 text-amber-300' : 'bg-teal-500/20 text-teal-300'
                      }`}
                    >
                      {asg.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400 font-mono">Prescription: </span>
                    {asg.assignedActionName}
                  </div>

                  {isDelayed ? (
                    <div className="text-[11px] text-amber-300/90 font-mono mt-1">
                      Reason: {asg.delayReason}
                    </div>
                  ) : (
                    <div className="text-[11px] text-teal-400 font-mono mt-1">
                      Allocated: {asg.allocatedResources.map((r) => `${r.quantityAllocated}x ${r.resourceName}`).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resource Inventory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {resources.map((res) => {
          const isDepleted = res.availableQuantity === 0;
          return (
            <div
              key={res.id}
              className={`bg-slate-900 border rounded-lg p-4 flex flex-col justify-between gap-4 transition-colors ${
                isDepleted ? 'border-rose-900/60 bg-rose-950/10' : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {res.type}
                  </span>
                  <button
                    onClick={() => handleToggleLock(res.id)}
                    className={`p-1.5 rounded text-xs transition-colors ${
                      res.locked
                        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title={res.locked ? t('locked') : t('unlocked')}
                  >
                    {res.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <h3 className="text-sm font-bold text-white">{res.name}</h3>
                <span className="text-xs text-slate-400 font-mono">{res.location}</span>

                {/* Capabilities pills */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {res.capabilities.map((cap, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-950 text-[10px] text-slate-400 font-mono border border-slate-800">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quantity Availability Bar */}
              <div className="pt-3 border-t border-slate-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">{t('availableResources')}</span>
                  <span className="font-bold text-white">
                    <span className={isDepleted ? 'text-rose-400' : 'text-teal-400'}>
                      {res.availableQuantity}
                    </span>{' '}
                    / {res.quantity}
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all ${
                      isDepleted ? 'bg-rose-500' : 'bg-teal-400'
                    }`}
                    style={{ width: `${(res.availableQuantity / Math.max(1, res.quantity)) * 100}%` }}
                  />
                </div>
                {res.assignedCaseId && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    Assigned to: {res.assignedCaseId}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
