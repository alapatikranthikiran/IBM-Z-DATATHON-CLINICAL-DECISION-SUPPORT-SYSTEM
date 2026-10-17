import React, { useState } from 'react';
import { useEngine } from '../context/EngineContext';
import {
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { WhatIfSimulator, SimulationSensitivityParams } from '../engine/simulator';

export const ScenarioLab: React.FC = () => {
  const { cases, activePack, resources, signals, t } = useEngine();

  const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.id || '');
  const activeCase = cases.find((c) => c.id === selectedCaseId) || cases[0];

  // Interactive sensitivity controls
  const [params, setParams] = useState<SimulationSensitivityParams>({
    demandMultiplier: 1.0,
    eventGrowthRate: 1.15,
    resourceAvailability: 1.0,
    responseDelay: 5.0,
    sensorUncertainty: 0.05,
  });

  const simulatedOptions =
    activeCase && activePack
      ? WhatIfSimulator.generateCaseOptions(activeCase, activePack, resources, signals, params)
      : [];

  const handleResetSensitivity = () => {
    if (activePack) {
      setParams(activePack.simulationParameters.defaultSensitivity);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-teal-400" />
            {t('whatIfTitle')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('whatIfSubtitle')}
          </p>
        </div>

        {/* Case Selector */}
        {cases.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded px-3 py-1.5">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Case:</span>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="bg-transparent text-xs font-bold text-teal-300 outline-none cursor-pointer"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                  {c.title} (Acuity: {c.priorityScore})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Sensitivity Sliders Control Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              {t('stressVariables')}
            </h3>
          </div>
          <button
            onClick={handleResetSensitivity}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> {t('resetDefaults')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Slider 1: Demand Multiplier */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{t('demandMultiplier')}</span>
              <span className="font-mono font-bold text-teal-400 tabular-nums">{params.demandMultiplier}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={params.demandMultiplier}
              onChange={(e) => setParams({ ...params, demandMultiplier: parseFloat(e.target.value) })}
              className="accent-teal-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 font-mono">ED triage arrival velocity</span>
          </div>

          {/* Slider 2: Event Growth Rate */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{t('eventGrowthRate')}</span>
              <span className="font-mono font-bold text-amber-300 tabular-nums">{params.eventGrowthRate}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.0"
              step="0.05"
              value={params.eventGrowthRate}
              onChange={(e) => setParams({ ...params, eventGrowthRate: parseFloat(e.target.value) })}
              className="accent-amber-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 font-mono">Acuity deterioration speed</span>
          </div>

          {/* Slider 3: Resource Availability */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{t('resourceAvailability')}</span>
              <span className="font-mono font-bold text-teal-400 tabular-nums">{Math.round(params.resourceAvailability * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.5"
              step="0.1"
              value={params.resourceAvailability}
              onChange={(e) => setParams({ ...params, resourceAvailability: parseFloat(e.target.value) })}
              className="accent-teal-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 font-mono">Staffed bed capacity margin</span>
          </div>

          {/* Slider 4: Response Delay */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{t('responseDelay')}</span>
              <span className="font-mono font-bold text-cyan-300 tabular-nums">{params.responseDelay}m</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={params.responseDelay}
              onChange={(e) => setParams({ ...params, responseDelay: parseFloat(e.target.value) })}
              className="accent-cyan-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 font-mono">Delay penalty to clinical resolution</span>
          </div>

          {/* Slider 5: Sensor Uncertainty */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{t('sensorUncertainty')}</span>
              <span className="font-mono font-bold text-slate-300 tabular-nums">±{Math.round(params.sensorUncertainty * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.25"
              step="0.01"
              value={params.sensorUncertainty}
              onChange={(e) => setParams({ ...params, sensorUncertainty: parseFloat(e.target.value) })}
              className="accent-slate-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 font-mono">Vital monitor noise margin</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparative Options Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {simulatedOptions.map((opt, idx) => {
          const isDoNothing = opt.name.includes('Do Nothing');
          const isHardBlocked = opt.feasibilityStatus === 'infeasible_hard_constraint';
          const isRecommended = idx === 1 || (!isDoNothing && !isHardBlocked && idx === 0);

          return (
            <div
              key={opt.id}
              className={`rounded-lg p-4 border flex flex-col justify-between gap-4 transition-colors ${
                isHardBlocked
                  ? 'bg-rose-950/20 border-rose-900/60'
                  : isRecommended
                  ? 'bg-slate-950 border-teal-500'
                  : isDoNothing
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              {/* Header */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span
                    className={`uppercase font-bold ${
                      isHardBlocked
                        ? 'text-rose-400'
                        : isRecommended
                        ? 'text-teal-400'
                        : isDoNothing
                        ? 'text-slate-500'
                        : 'text-cyan-400'
                    }`}
                  >
                    {isHardBlocked
                      ? 'Contraindicated'
                      : isRecommended
                      ? 'Recommended Protocol'
                      : isDoNothing
                      ? 'Status Quo'
                      : 'Alternative'}
                  </span>
                  <span className="text-slate-400 tabular-nums font-mono text-[11px]">
                    Utility: {opt.utilityScore}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white">{opt.name}</h4>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {opt.description}
                </p>
              </div>

              {/* Outcome Metrics */}
              <div className="bg-slate-950 rounded p-3 border border-slate-800/80 flex flex-col gap-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  {t('expectedOutcomes')}
                </span>
                {opt.expectedOutcomes.map((m) => (
                  <div key={m.metricId} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{m.metricName}</span>
                    <div className="flex items-center gap-1 font-mono">
                      <span className="text-white font-bold tabular-nums">
                        {m.projectedValue} {m.unit}
                      </span>
                      <span
                        className={`text-[10px] tabular-nums ${
                          m.isPositive ? 'text-teal-400' : 'text-rose-400'
                        }`}
                      >
                        ({m.deltaPercent > 0 ? '+' : ''}{m.deltaPercent}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Constraints & Violations summary */}
              {isHardBlocked ? (
                <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
                  <div className="font-bold flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Hard Contraindication
                  </div>
                  <p className="text-[11px] font-mono mt-1">
                    {opt.hardConstraintViolations[0]}
                  </p>
                </div>
              ) : opt.softConstraintWarnings.length > 0 ? (
                <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800 text-xs text-amber-300">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Policy Warning
                  </div>
                  <p className="text-[11px] font-mono mt-1">
                    {opt.softConstraintWarnings[0]}
                  </p>
                </div>
              ) : (
                <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-teal-300 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Protocol criteria satisfied</span>
                </div>
              )}

              {/* Bottom Residual Risk & Cost */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">{t('residualRisk')}</span>
                  <span
                    className={`font-bold tabular-nums ${
                      opt.residualRisk > 60
                        ? 'text-rose-400'
                        : opt.residualRisk > 30
                        ? 'text-amber-300'
                        : 'text-teal-400'
                    }`}
                  >
                    {opt.residualRisk}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{t('cost')}</span>
                  <span className="text-slate-200 font-semibold tabular-nums">${opt.estimatedCost}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
