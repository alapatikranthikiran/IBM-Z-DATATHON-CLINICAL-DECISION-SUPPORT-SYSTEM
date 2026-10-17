import React, { useState } from 'react';
import { DecisionRecord } from '../types';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Database,
  UserCheck,
  Activity,
  Layers,
} from 'lucide-react';

interface DecisionReplayModalProps {
  record: DecisionRecord;
  onClose: () => void;
}

const REPLAY_STEPS = [
  { step: 1, title: 'Evidence Ingestion', subtitle: 'Signals available at decision epoch' },
  { step: 2, title: 'Data Quality Assessment', subtitle: 'Freshness, completeness, and conflicts' },
  { step: 3, title: 'Rule Trigger Correlation', subtitle: 'Incident correlation & priority boost' },
  { step: 4, title: 'Action Generation', subtitle: 'Deterministic option synthesis' },
  { step: 5, title: 'Constraint & Policy Filter', subtitle: 'Hard blocks & soft warnings' },
  { step: 6, title: 'System Recommendation', subtitle: 'Calculated highest-utility action' },
  { step: 7, title: 'Human Oversight Action', subtitle: 'Operator authorization & override rationale' },
  { step: 8, title: 'Simulated Outcome Execution', subtitle: 'Projected risk delta and metric verification' },
];

export const DecisionReplayModal: React.FC<DecisionReplayModalProps> = ({ record, onClose }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Decision Audit Replay
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  {record.id}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  stateVersion v{record.stateVersion}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {record.caseTitle} • {new Date(record.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1 rounded-lg hover:bg-slate-800 text-sm"
          >
            Esc / Close
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex items-center justify-between gap-1 overflow-x-auto">
          {REPLAY_STEPS.map((s) => {
            const isActive = s.step === currentStep;
            const isCompleted = s.step < currentStep;
            return (
              <button
                key={s.step}
                onClick={() => setCurrentStep(s.step)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                    : isCompleted
                    ? 'bg-slate-800 text-teal-300 font-medium'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]">
                  {s.step}
                </span>
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>

        {/* Step Content Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-900/50 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <span className="text-xs font-mono text-teal-400 uppercase tracking-wider">
                Stage {currentStep} of 8
              </span>
              <h3 className="text-lg font-bold text-slate-100">
                {REPLAY_STEPS[currentStep - 1].title}
              </h3>
              <p className="text-xs text-slate-400">
                {REPLAY_STEPS[currentStep - 1].subtitle}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentStep === 1}
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-medium text-slate-300 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                disabled={currentStep === 8}
                onClick={() => setCurrentStep((prev) => Math.min(8, prev + 1))}
                className="px-3 py-1.5 rounded bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-xs font-bold text-slate-950 flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dynamic Stage Render */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-300">
                Exact telemetry signals present in the evidence snapshot when this decision was formed:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {record.evidenceSnapshot.map((sig: any, idx: number) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200">{sig.type.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {sig.source}
                      </span>
                    </div>
                    <div className="text-lg font-bold font-mono text-teal-400">
                      {sig.value} <span className="text-xs text-slate-400">{sig.unit}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Entity: {sig.entityId} • Freshness: {sig.freshnessSeconds}s
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-300">
                Data quality verification applied during normalization:
              </p>
              <div className="space-y-2">
                {record.evidenceSnapshot.map((sig: any, idx: number) => {
                  const isStale = sig.qualityStatus === 'stale';
                  const isConflict = sig.qualityStatus === 'conflicting';
                  return (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{sig.type} ({sig.source})</div>
                        <div className="text-[11px] text-slate-400">Value recorded: {sig.value} {sig.unit}</div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-mono uppercase ${
                          isConflict
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : isStale
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        }`}
                      >
                        {sig.qualityStatus}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-300">
                Domain rules triggered to correlate incoming signals into Decision Case:
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                  <ShieldAlert className="w-4 h-4" /> Incident Type: {record.domainPackId} / {record.caseTitle}
                </div>
                <div className="text-xs text-slate-300">
                  Calculated State Version: <span className="font-mono text-teal-400">v{record.stateVersion}</span>
                </div>
                <div className="text-xs text-slate-400">
                  Data quality was preserved distinct from harm severity calculation to prevent false negative underreporting.
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-300">
                Action options evaluated by the deterministic simulation engine:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {record.optionsSnapshot.map((opt: any, idx: number) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200">{opt.name}</div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{opt.description}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-mono">
                      <span className="text-teal-400">Residual Risk: {opt.residualRisk}%</span>
                      <span className="text-slate-400">Utility: {opt.utilityScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-300">
                Constraint evaluation results:
              </p>
              <div className="space-y-2">
                {record.optionsSnapshot.map((opt: any, idx: number) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">{opt.name}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                          opt.feasibilityStatus === 'infeasible_hard_constraint'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : opt.feasibilityStatus === 'warning_soft_constraint'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        }`}
                      >
                        {opt.feasibilityStatus}
                      </span>
                    </div>
                    {opt.hardConstraintViolations?.length > 0 && (
                      <p className="text-xs text-red-400 mt-1 font-mono">
                        Violations: {opt.hardConstraintViolations.join('; ')}
                      </p>
                    )}
                    {opt.softConstraintWarnings?.length > 0 && (
                      <p className="text-xs text-amber-300 mt-1 font-mono">
                        Warnings: {opt.softConstraintWarnings.join('; ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-300">
                System recommendation generated deterministically based on priority and constraint checks:
              </p>
              <div className="bg-teal-950/40 border border-teal-500/40 rounded-xl p-4">
                <span className="text-[10px] font-mono text-teal-400 uppercase font-bold">
                  Recommended Action
                </span>
                <h4 className="text-base font-bold text-white mt-1">
                  {record.recommendation?.name || 'Standard Operational Response'}
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  {record.recommendation?.description}
                </p>
              </div>
            </div>
          )}

          {currentStep === 7 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-300">
                Human operator decision recorded in the append-only ledger:
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Authorized By</span>
                    <div className="text-sm font-bold text-white">
                      {record.operatorId} ({record.operatorRole})
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-mono uppercase">
                    Action: {record.operatorAction}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Operator Rationale</span>
                  <p className="text-xs text-slate-200 mt-0.5 bg-slate-900 p-2.5 rounded border border-slate-800">
                    "{record.reason}"
                  </p>
                </div>
                {record.softOverrideReason && (
                  <div>
                    <span className="text-[10px] font-mono text-amber-400 uppercase">
                      Supervisor Soft-Rule Override Justification
                    </span>
                    <p className="text-xs text-amber-200 mt-0.5 bg-amber-950/30 p-2.5 rounded border border-amber-800/40">
                      "{record.softOverrideReason}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 8 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-300">
                Simulated outcome and risk reduction metrics achieved:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-xs text-slate-400">Projected Risk Reduction</span>
                  <span className="text-2xl font-bold font-mono text-teal-400">
                    -{record.simulatedOutcome.projectedRiskReduction}%
                  </span>
                  <span className="text-[10px] text-slate-500">Deterministically simulated</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-xs text-slate-400">Expected Resolution Window</span>
                  <span className="text-2xl font-bold font-mono text-indigo-400">
                    ~{record.simulatedOutcome.expectedResolutionTimeMinutes}m
                  </span>
                  <span className="text-[10px] text-slate-500">Standard operational velocity</span>
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300">
                <span className="font-semibold text-white">Summary: </span>
                {record.simulatedOutcome.metricsSummary}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Decision provenance hash verified against state snapshot</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium"
          >
            Close Replay
          </button>
        </div>
      </div>
    </div>
  );
};
