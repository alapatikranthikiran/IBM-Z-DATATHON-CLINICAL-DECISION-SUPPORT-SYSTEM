import React, { useState } from 'react';
import { useEngine } from '../context/EngineContext';
import {
  HeartPulse,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Sparkles,
  HelpCircle,
  RotateCcw,
  UserCheck,
  Send,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  FileText,
  AlertOctagon,
  Stethoscope,
  Bed,
  Search,
} from 'lucide-react';
import { EvidenceGraph } from '../components/EvidenceGraph';
import { ActionOption, DecisionCase, GeminiChallenge, GeminiExplanation } from '../types';

export const DecisionCases: React.FC = () => {
  const {
    cases,
    optionsMap,
    signals,
    activePack,
    activeRole,
    approveAction,
    rejectAction,
    escalateAction,
    recalculateCase,
    triggerScenario,
    t,
  } = useEngine();

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(cases[0]?.id || null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [acuityFilter, setAcuityFilter] = useState<'all' | 'emergent' | 'urgent'>('all');

  // Rejection & Escalation modal states
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [showEscalatePrompt, setShowEscalatePrompt] = useState(false);
  const [showOverridePrompt, setShowOverridePrompt] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [softOverrideReason, setSoftOverrideReason] = useState('');
  const [escalateTarget, setEscalateTarget] = useState('Chief Medical Officer / Regional Command');

  // AI states
  const [geminiExplanation, setGeminiExplanation] = useState<GeminiExplanation | null>(null);
  const [geminiChallenge, setGeminiChallenge] = useState<GeminiChallenge | null>(null);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [loadingChallenge, setLoadingChallenge] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const activeCase = cases.find((c) => c.id === selectedCaseId) || cases[0];
  const caseOptions = activeCase ? optionsMap[activeCase.id] || [] : [];
  const chosenAction = caseOptions.find((o) => o.id === selectedActionId) || caseOptions[0];

  const filteredCases = cases.filter((c) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      c.title.toLowerCase().includes(query) ||
      c.correlationReason.toLowerCase().includes(query) ||
      c.affectedEntities.some((e) => e.toLowerCase().includes(query));
    if (!matchesSearch) return false;
    if (acuityFilter === 'emergent') return c.severity >= 80;
    if (acuityFilter === 'urgent') return c.severity < 80;
    return true;
  });

  // Expiry check: Has conditions changed since recommendation was synthesized?
  const isRecommendationStale =
    chosenAction && activeCase && chosenAction.generatedForStateVersion !== activeCase.stateVersion;

  // Handle Fetch AI Explanation
  const handleFetchExplanation = async () => {
    if (!activeCase) return;
    setLoadingAi(true);
    try {
      const res = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: activeCase.id }),
      });
      const data = await res.json();
      setGeminiExplanation(data);
    } catch {
      setActionFeedback({ text: 'Failed to retrieve clinical explanation', isError: true });
    } finally {
      setLoadingAi(false);
    }
  };

  // Handle Fetch AI Challenge Critique
  const handleFetchChallenge = async () => {
    if (!activeCase) return;
    setLoadingChallenge(true);
    try {
      const res = await fetch('/api/gemini/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: activeCase.id }),
      });
      const data = await res.json();
      setGeminiChallenge(data);
    } catch {
      setActionFeedback({ text: 'Failed to generate contraindication review', isError: true });
    } finally {
      setLoadingChallenge(false);
    }
  };

  const handleApprove = async () => {
    if (!activeCase || !chosenAction) return;
    setActionFeedback(null);

    // If soft warning exists, prompt for mandatory supervisor reason
    if (chosenAction.softConstraintWarnings.length > 0) {
      if (activeRole === 'Operator' || activeRole === 'Auditor') {
        setActionFeedback({
          text: 'Clinical policy warning present: Authorization requires Attending Physician or Clinical Director.',
          isError: true,
        });
        return;
      }
      setShowOverridePrompt(true);
      return;
    }

    const res = await approveAction(activeCase.id, chosenAction.id, actionReason || 'Clinical order authorized');
    if (res.success) {
      setActionFeedback({ text: 'Order authorized and committed to Clinical Decision Ledger.', isError: false });
    } else {
      setActionFeedback({ text: res.error || 'Failed to authorize order', isError: true });
    }
  };

  const handleConfirmOverrideApprove = async () => {
    if (!activeCase || !chosenAction) return;
    if (!softOverrideReason || softOverrideReason.trim().length < 5) {
      setActionFeedback({ text: 'Mandatory clinical rationale required (min 5 chars).', isError: true });
      return;
    }
    const res = await approveAction(
      activeCase.id,
      chosenAction.id,
      actionReason || 'Attending Physician override',
      softOverrideReason
    );
    setShowOverridePrompt(false);
    setSoftOverrideReason('');
    if (res.success) {
      setActionFeedback({ text: 'Protocol override documented in patient audit log.', isError: false });
    } else {
      setActionFeedback({ text: res.error || 'Failed to override protocol', isError: true });
    }
  };

  const handleConfirmReject = async () => {
    if (!activeCase) return;
    if (!actionReason || actionReason.trim().length < 5) {
      setActionFeedback({ text: 'A documented rejection rationale is required (min 5 chars).', isError: true });
      return;
    }
    const res = await rejectAction(activeCase.id, actionReason);
    setShowRejectPrompt(false);
    setActionReason('');
    if (res.success) {
      setActionFeedback({ text: 'Protocol rejected and recorded in clinical ledger.', isError: false });
    } else {
      setActionFeedback({ text: res.error || 'Failed to reject decision', isError: true });
    }
  };

  const handleConfirmEscalate = async () => {
    if (!activeCase) return;
    if (!actionReason || actionReason.trim().length < 5) {
      setActionFeedback({ text: 'A documented escalation rationale is required (min 5 chars).', isError: true });
      return;
    }
    const res = await escalateAction(activeCase.id, actionReason, escalateTarget);
    setShowEscalatePrompt(false);
    setActionReason('');
    if (res.success) {
      setActionFeedback({ text: `Case successfully escalated to ${escalateTarget}.`, isError: false });
    } else {
      setActionFeedback({ text: res.error || 'Failed to escalate case', isError: true });
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto text-slate-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-rose-400" />
            {t('navDecisionCases')} & Clinical Protocol Orders
          </h2>
          <p className="text-xs text-slate-400">
            Emergency Severity Index (ESI) scoring with Attending Physician verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeCase && (
            <button
              onClick={() => recalculateCase(activeCase.id)}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
              <span>{t('recalculate', { v: activeCase.stateVersion })}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Cases List vs Case Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Triage Registry (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase">
              Triage Registry ({filteredCases.length}/{cases.length})
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Patient cases</span>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, bed, or condition..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-teal-500/60 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              {(['all', 'emergent', 'urgent'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setAcuityFilter(filter)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                    acuityFilter === filter
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {filter === 'all' ? 'All Cases' : filter === 'emergent' ? 'ESI 1-2 Emergent' : 'ESI 3 Urgent'}
                </button>
              ))}
            </div>
          </div>

          {filteredCases.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-xl">
              <p className="text-xs text-slate-400">No triage cases match filter.</p>
              {cases.length === 0 ? (
                <button
                  onClick={() => triggerScenario('one_escalating_incident')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-teal-600 text-slate-950 text-xs font-bold"
                >
                  Inject Sample Inflow
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setAcuityFilter('all');
                  }}
                  className="mt-2 text-xs text-teal-400 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[720px] pr-1">
              {filteredCases.map((c) => {
                const isSelected = activeCase?.id === c.id;
                const isEmergent = c.severity >= 80;

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCaseId(c.id);
                      setSelectedActionId(null);
                      setGeminiExplanation(null);
                      setGeminiChallenge(null);
                      setActionFeedback(null);
                    }}
                    className={`cursor-pointer rounded-xl p-3.5 border transition-all text-left flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-slate-900 border-teal-500 shadow-sm ring-1 ring-teal-500/20'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isEmergent
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isEmergent ? 'ESI 1-2 EMERGENT' : 'ESI 3 URGENT'}
                      </span>
                      <span className="text-slate-400 text-[10px]">v{c.stateVersion}</span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{c.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{c.correlationReason}</p>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[11px] font-mono">
                      <span className="text-slate-400">Acuity Score:</span>
                      <span className="font-bold text-teal-300 tabular-nums">{c.priorityScore}/100</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Case Deep-Dive Detail (8 cols) */}
        {activeCase ? (
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Case Overview Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span className="text-teal-400 font-semibold">{activeCase.id}</span>
                    <span aria-hidden="true">·</span>
                    <span className="uppercase text-slate-300">STATUS: {activeCase.status}</span>
                    <span aria-hidden="true">·</span>
                    <span>STATE VERSION: v{activeCase.stateVersion}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{activeCase.title}</h3>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">
                    {t('priorityScore')}
                  </span>
                  <span className="text-3xl font-bold font-mono text-teal-400 tabular-nums">
                    {activeCase.priorityScore}
                    <span className="text-xs text-slate-500 font-normal">/100</span>
                  </span>
                </div>
              </div>

              {/* Triage Acuity Criteria Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono block">Physiological Severity (35%)</span>
                  <span className="text-sm font-bold text-rose-400 font-mono tabular-nums">{activeCase.severity}/100</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono block">Temporal Urgency (30%)</span>
                  <span className="text-sm font-bold text-amber-300 font-mono tabular-nums">{activeCase.urgency}/100</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono block">Ward Headroom (20%)</span>
                  <span className="text-sm font-bold text-teal-300 font-mono tabular-nums">{activeCase.affectedPopulation}/100</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono block">Complication Risk (15%)</span>
                  <span className="text-sm font-bold text-cyan-300 font-mono tabular-nums">{activeCase.propagationRisk}/100</span>
                </div>
              </div>

              {/* Triggered Rules list */}
              <div className="flex flex-wrap gap-2 items-center text-xs text-slate-400">
                <span className="font-mono text-[11px]">Triggered Clinical Rules:</span>
                {activeCase.triggeredRules.map((r, i) => (
                  <span key={i} className="text-slate-200 font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Interactive SVG Evidence Graph */}
            {activePack && (
              <EvidenceGraph
                decisionCase={activeCase}
                signals={signals}
                options={caseOptions}
                pack={activePack}
              />
            )}

            {/* Recommendation Expiry Notice */}
            {isRecommendationStale && (
              <div className="bg-amber-950/40 border border-amber-600 rounded-lg p-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wide font-mono">
                      State Stale Alert
                    </h4>
                    <p className="text-xs text-amber-300/90 mt-0.5">
                      {t('recalculateNotice')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => recalculateCase(activeCase.id)}
                  className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0"
                >
                  Recalculate
                </button>
              </div>
            )}

            {/* Candidate Protocol Options */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-teal-400" />
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                    Candidate Clinical Protocols
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Ranked by Utility Score
                </span>
              </div>

              <div className="space-y-3">
                {caseOptions.map((opt) => {
                  const isSelected = chosenAction?.id === opt.id;
                  const isHardBlocked = opt.feasibilityStatus === 'infeasible_hard_constraint';
                  const hasSoftWarning = opt.feasibilityStatus === 'warning_soft_constraint';
                  const isRecommended = opt.id === activeCase.recommendedActionId;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedActionId(opt.id)}
                      className={`cursor-pointer rounded-lg p-4 border transition-colors flex flex-col gap-3 ${
                        isSelected
                          ? 'bg-slate-950 border-teal-500'
                          : isHardBlocked
                          ? 'bg-red-950/10 border-red-900/50'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => setSelectedActionId(opt.id)}
                            className="text-teal-600 focus:ring-teal-500"
                          />
                          <h4 className="text-sm font-bold text-white">{opt.name}</h4>
                          {isRecommended && (
                            <span className="text-teal-400 text-xs font-mono font-bold">
                              [RECOMMENDED]
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-xs font-mono uppercase font-semibold ${
                            isHardBlocked
                              ? 'text-rose-400'
                              : hasSoftWarning
                              ? 'text-amber-400'
                              : 'text-teal-400'
                          }`}
                        >
                          {opt.feasibilityStatus.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{opt.description}</p>

                      {/* Hard violation alert */}
                      {opt.hardConstraintViolations.length > 0 && (
                        <div className="p-2.5 rounded bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Hard Contraindication (Order Blocked):</span>
                            <ul className="list-disc list-inside mt-0.5 text-[11px] font-mono">
                              {opt.hardConstraintViolations.map((v, i) => (
                                <li key={i}>{v}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Soft warning alert */}
                      {opt.softConstraintWarnings.length > 0 && (
                        <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800 text-xs text-amber-300 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Policy Warning (Requires Attending Documentation):</span>
                            <ul className="list-disc list-inside mt-0.5 text-[11px] font-mono">
                              {opt.softConstraintWarnings.map((w, i) => (
                                <li key={i}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Metrics bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 block">{t('residualRisk')}</span>
                          <span className="font-bold text-teal-400 tabular-nums">{opt.residualRisk}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Required Units</span>
                          <span className="text-slate-200">
                            {opt.requiredResources.map((r) => `${r.quantity} ${r.resourceType}`).join(', ') || 'None'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">{t('cost')}</span>
                          <span className="text-slate-200 tabular-nums">${opt.estimatedCost}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Utility Score</span>
                          <span className="font-bold text-cyan-400 tabular-nums">{opt.utilityScore}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Grounded Clinical Rationale & AI Contraindication Reviewer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Grounded Clinical Rationale */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-400" />
                      <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider font-mono">
                        Grounded Clinical Rationale
                      </h4>
                    </div>
                    {geminiExplanation?.isFallback && (
                      <span className="text-[9px] font-mono text-slate-400">
                        [Deterministic Core]
                      </span>
                    )}
                  </div>

                  {geminiExplanation ? (
                    <div className="flex flex-col gap-2 text-xs text-slate-300">
                      <p className="font-semibold text-white">{geminiExplanation.summary}</p>
                      <p className="text-slate-400 leading-relaxed">
                        {geminiExplanation.recommendedActionExplanation}
                      </p>
                      <div className="text-[11px] text-teal-300 font-mono mt-1">
                        Evidence Referenced: {geminiExplanation.evidenceUsed.join(', ')}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Synthesizes natural language rationale strictly grounded in verified deterministic state without inventing numbers.
                    </p>
                  )}
                </div>

                <button
                  onClick={handleFetchExplanation}
                  disabled={loadingAi}
                  className="self-start px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>{loadingAi ? 'Analyzing...' : t('explainButton')}</span>
                </button>
              </div>

              {/* AI Contraindication Reviewer */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                        Contraindication & Risk Review
                      </h4>
                    </div>
                    {geminiChallenge?.isFallback && (
                      <span className="text-[9px] font-mono text-slate-400">
                        [Deterministic Core]
                      </span>
                    )}
                  </div>

                  {geminiChallenge ? (
                    <div className="flex flex-col gap-2 text-xs text-slate-300">
                      <p className="font-semibold text-amber-200">
                        Counterargument: {geminiChallenge.strongestArgumentAgainst}
                      </p>
                      <div className="text-[11px] text-slate-400">
                        Unintended Clinical Consequences: {geminiChallenge.unintendedConsequences.join('; ')}
                      </div>
                      <div className="text-[11px] text-teal-300 font-mono">
                        Viable Alternative: {geminiChallenge.viableAlternative}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Acts as a critical red-team reviewer challenging assumptions and highlighting unit exhaustion risks before authorization.
                    </p>
                  )}
                </div>

                <button
                  onClick={handleFetchChallenge}
                  disabled={loadingChallenge}
                  className="self-start px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{loadingChallenge ? 'Reviewing...' : t('challengeButton')}</span>
                </button>
              </div>
            </div>

            {/* Human Decision Action Bar (Approve, Reject, Escalate) */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 shadow-xl z-20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-teal-600/20 text-teal-400 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Attending Authority: {t(`role${activeRole}`)}
                  </span>
                  <span className="text-xs font-bold text-white">
                    Selected Order: {chosenAction?.name || 'None selected'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRejectPrompt(true)}
                  className="px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-300 font-medium text-xs transition-colors"
                >
                  {t('rejectAction')}
                </button>

                <button
                  onClick={() => setShowEscalatePrompt(true)}
                  className="px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium text-xs transition-colors"
                >
                  {t('escalateAction')}
                </button>

                <button
                  onClick={handleApprove}
                  disabled={isRecommendationStale || chosenAction?.feasibilityStatus === 'infeasible_hard_constraint'}
                  className={`px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isRecommendationStale || chosenAction?.feasibilityStatus === 'infeasible_hard_constraint'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-teal-600 hover:bg-teal-500 text-slate-950 shadow-sm'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('approveAction')}</span>
                </button>
              </div>
            </div>

            {/* Action Feedback alert */}
            {actionFeedback && (
              <div
                className={`p-3 rounded text-xs font-medium border ${
                  actionFeedback.isError
                    ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                    : 'bg-teal-950/40 border-teal-800 text-teal-300'
                }`}
              >
                {actionFeedback.text}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Attending Physician Soft Override Modal */}
      {showOverridePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-amber-600 rounded-xl w-full max-w-lg p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-300 border-b border-slate-800 pb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
                {t('softOverridePrompt')}
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              {t('softOverrideNote')}
            </p>
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Clinical Justification in EMR Audit Trail
              </label>
              <textarea
                rows={3}
                value={softOverrideReason}
                onChange={(e) => setSoftOverrideReason(e.target.value)}
                placeholder={t('overrideReasonPlaceholder')}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowOverridePrompt(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmOverrideApprove}
                className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                {t('confirmOverride')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-rose-600 rounded-xl w-full max-w-lg p-6 flex flex-col gap-4 shadow-2xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-2">
              {t('rejectAction')}
            </h3>
            <p className="text-xs text-slate-300">
              Documented reason required for audit compliance:
            </p>
            <textarea
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="e.g. Clinical assessment indicates patient stabilization on existing telemetry."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-200 outline-none focus:border-rose-400"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectPrompt(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {showEscalatePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-6 flex flex-col gap-4 shadow-2xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-2">
              {t('escalateAction')}
            </h3>
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Escalate To</label>
              <select
                value={escalateTarget}
                onChange={(e) => setEscalateTarget(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 outline-none"
              >
                <option value="Chief Medical Officer / Regional Command">Chief Medical Officer / Regional Command</option>
                <option value="Department Chair of Emergency Medicine">Department Chair of Emergency Medicine</option>
                <option value="ICU Critical Care Director">ICU Critical Care Director</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">Clinical Escalation Rationale</label>
              <textarea
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g. Unit surge volume exceeds regional diversion capacity limits."
                className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-200 outline-none focus:border-teal-400"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowEscalatePrompt(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmEscalate}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
