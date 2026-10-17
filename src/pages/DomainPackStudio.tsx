import React, { useState } from 'react';
import { useEngine } from '../context/EngineContext';
import {
  Package,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  RotateCcw,
  Sparkles,
  Download,
  Upload,
  Play,
  Layers,
  Save,
  Check,
} from 'lucide-react';
import { DomainPack, DomainPackSchema } from '../types';

export const DomainPackStudio: React.FC = () => {
  const { activePack, packs, activeRole, changePack, refreshState, t } = useEngine();

  const [selectedPackId, setSelectedPackId] = useState<string>(activePack?.id || 'hospital-capacity-v1');
  const targetPack = packs.find((p) => p.id === selectedPackId) || activePack;

  const [editorMode, setEditorMode] = useState<'form' | 'json' | 'ai'>('form');
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(targetPack, null, 2));
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationPassed, setValidationPassed] = useState<boolean>(true);
  const [testResult, setTestResult] = useState<{ passed: boolean; message: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // AI Generator prompt state
  const [aiPrompt, setAiPrompt] = useState<string>(
    'Create an Acute Pediatric Sepsis & Neonatal ICU Protocol pack. Monitored signals: core temperature, transcutaneous SpO2, arterial blood gas lactate, mean arterial pressure, capillary refill time. Incidents: septic shock deterioration, acute respiratory decompensation, neonatal hypothermia. Resources: pediatric ECMO teams, isolation incubators, resuscitation bays. Actions: initiate 20ml/kg balanced crystalloid bolus, escalate broad-spectrum antibiotics, transfer to Level IV NICU.'
  );
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  // Sync JSON text when switching packs
  const handleSelectPack = (packId: string) => {
    setSelectedPackId(packId);
    const p = packs.find((item) => item.id === packId);
    if (p) {
      setJsonText(JSON.stringify(p, null, 2));
      setValidationErrors([]);
      setValidationPassed(true);
      setTestResult(null);
    }
  };

  // Validate JSON against Zod schema & semantic requirements
  const handleValidateJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const res = DomainPackSchema.safeParse(parsed);
      if (!res.success) {
        const errs = res.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
        setValidationErrors(errs);
        setValidationPassed(false);
        return false;
      }

      // Check priority weights sum to ~1.0
      const w = parsed.priorityWeights;
      const sum = w.severity + w.urgency + w.affectedPopulation + w.propagationRisk;
      if (Math.abs(sum - 1.0) > 0.01) {
        setValidationErrors([`Priority weights must sum to 1.0 (current sum: ${sum.toFixed(2)})`]);
        setValidationPassed(false);
        return false;
      }

      setValidationErrors([]);
      setValidationPassed(true);
      setStatusMessage({ text: 'Schema validated successfully. Conforms to DomainPack v1 standard.', isError: false });
      return true;
    } catch (err: any) {
      setValidationErrors([`Syntax Error: ${err.message}`]);
      setValidationPassed(false);
      return false;
    }
  };

  const handleSavePack = async () => {
    if (!handleValidateJson()) return;
    if (activeRole !== 'Administrator') {
      setStatusMessage({ text: 'Clinical Director (Administrator) role required to commit protocol changes.', isError: true });
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);
      const res = await fetch('/api/domain-packs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: parsed, role: activeRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: 'Clinical Protocol committed to version registry.', isError: false });
        await refreshState();
      } else {
        setStatusMessage({ text: data.error || 'Failed to save pack', isError: true });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message, isError: true });
    }
  };

  const handleActivate = async () => {
    if (activeRole !== 'Administrator') {
      setStatusMessage({ text: 'Clinical Director (Administrator) authorization required to activate protocols.', isError: true });
      return;
    }

    if (!validationPassed) {
      setStatusMessage({ text: 'Gating Failure: Cannot activate invalid or unvalidated protocol schema.', isError: true });
      return;
    }

    const success = await changePack(selectedPackId);
    if (success) {
      setStatusMessage({ text: `Activated "${targetPack?.name}" across all triage engines.`, isError: false });
    } else {
      setStatusMessage({ text: 'Failed to activate protocol.', isError: true });
    }
  };

  const handleDuplicate = async () => {
    const newId = `${selectedPackId}-copy-${Date.now().toString(36).substring(3)}`;
    const newName = `${targetPack?.name} (Custom Copy)`;
    const res = await fetch('/api/domain-packs/duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId: selectedPackId, newId, newName }),
    });
    if (res.ok) {
      const data = await res.json();
      setStatusMessage({ text: `Protocol duplicated as "${newName}".`, isError: false });
      await refreshState();
      setSelectedPackId(newId);
      setJsonText(JSON.stringify(data.pack, null, 2));
    }
  };

  const handleRollback = async () => {
    if (activeRole !== 'Administrator') {
      setStatusMessage({ text: 'Clinical Director role required to rollback versions.', isError: true });
      return;
    }
    const res = await fetch('/api/domain-packs/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId: selectedPackId, role: activeRole }),
    });
    const data = await res.json();
    if (res.ok) {
      setStatusMessage({ text: 'Successfully rolled back to previous protocol version.', isError: false });
      setJsonText(JSON.stringify(data.pack, null, 2));
      await refreshState();
    } else {
      setStatusMessage({ text: data.error || 'Rollback failed', isError: true });
    }
  };

  const handleRunTest = async () => {
    if (!targetPack || targetPack.testScenarios.length === 0) {
      setTestResult({ passed: false, message: 'No test scenarios configured in this protocol.' });
      return;
    }
    const scenario = targetPack.testScenarios[0];
    const res = await fetch('/api/domain-packs/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack: targetPack, scenarioId: scenario.id }),
    });
    const data = await res.json();
    setTestResult(data);
  };

  const handleGenerateAiPack = async () => {
    setIsGeneratingAi(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/gemini/generate-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: aiPrompt }),
      });
      const data = await res.json();
      if (data.draft) {
        setJsonText(JSON.stringify(data.draft, null, 2));
        setEditorMode('json');
        handleValidateJson();
        setStatusMessage({
          text: 'AI Draft generated. Gating rules active: Protocol remains INACTIVE until Clinical Director reviews, validates, and tests.',
          isError: false,
        });
      } else {
        setStatusMessage({ text: data.error || 'Failed to generate protocol', isError: true });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message, isError: true });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetPack?.id || 'clinical-protocol'}.json`;
    a.click();
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-400" />
            {t('studioTitle')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('studioSubtitle')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleActivate}
            className="px-3.5 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-slate-950" />
            <span>{t('activateProtocol')}</span>
          </button>
          <button
            onClick={handleDuplicate}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Duplicate</span>
          </button>
          <button
            onClick={handleRollback}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Rollback</span>
          </button>
        </div>
      </div>

      {/* Domain Pack Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 uppercase">Selected Protocol:</span>
          <select
            value={selectedPackId}
            onChange={(e) => handleSelectPack(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-3 py-1 text-xs font-bold text-teal-300 outline-none"
          >
            {packs.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                {p.name} (v{p.version})
              </option>
            ))}
          </select>
          {targetPack?.id === activePack?.id && (
            <span className="px-2 py-0.5 rounded bg-teal-950/80 text-teal-300 font-mono text-[10px] font-bold border border-teal-800/80">
              CURRENTLY ACTIVE
            </span>
          )}
        </div>

        {/* Editor Modes */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
          <button
            onClick={() => setEditorMode('form')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              editorMode === 'form' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Clinical Form View
          </button>
          <button
            onClick={() => setEditorMode('json')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              editorMode === 'json' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            JSON Schema Editor
          </button>
          <button
            onClick={() => setEditorMode('ai')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
              editorMode === 'ai' ? 'bg-teal-600 text-slate-950 font-bold' : 'text-teal-400 hover:text-teal-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('aiGenerator')}</span>
          </button>
        </div>
      </div>

      {/* Editor Content */}
      {editorMode === 'form' && targetPack && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Entities & Signal Types */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">
              Clinical Entities & Wards ({targetPack.entities.length})
            </h3>
            <div className="space-y-2">
              {targetPack.entities.map((ent) => (
                <div key={ent.id} className="bg-slate-950 p-3 rounded border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{ent.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      ID: {ent.id} · Type: {ent.type}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{ent.location}</span>
                </div>
              ))}
            </div>

            <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono mt-3">
              Monitored Vitals & Thresholds ({targetPack.signalTypes.length})
            </h3>
            <div className="space-y-2">
              {targetPack.signalTypes.map((sig) => (
                <div key={sig.id} className="bg-slate-950 p-3 rounded border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{sig.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Normal: {sig.normalMin} - {sig.normalMax} {sig.unit}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-800/60">
                    Critical: {sig.criticalDirection} {sig.criticalThreshold} {sig.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Priority Weights & Hard/Soft Constraints */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
              Acuity Weights (Sum: 1.0)
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Severity Weight</span>
                <span className="text-teal-400 font-bold">{targetPack.priorityWeights.severity}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Urgency Weight</span>
                <span className="text-teal-400 font-bold">{targetPack.priorityWeights.urgency}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Affected Population</span>
                <span className="text-teal-400 font-bold">{targetPack.priorityWeights.affectedPopulation}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Propagation Risk</span>
                <span className="text-teal-400 font-bold">{targetPack.priorityWeights.propagationRisk}</span>
              </div>
            </div>

            <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider font-mono mt-3">
              Hard Safety Constraints ({targetPack.hardConstraints.length})
            </h3>
            <div className="space-y-2">
              {targetPack.hardConstraints.map((h) => (
                <div key={h.id} className="bg-slate-950 p-3 rounded border border-rose-900/40 text-xs">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>{h.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">{h.explanation}</p>
                </div>
              ))}
            </div>

            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono mt-3">
              Soft Guidelines ({targetPack.softConstraints.length})
            </h3>
            <div className="space-y-2">
              {targetPack.softConstraints.map((s) => (
                <div key={s.id} className="bg-slate-950 p-3 rounded border border-amber-900/40 text-xs">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>{s.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">{s.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editorMode === 'json' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">Validated JSON Protocol Specification</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleValidateJson}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
              >
                {t('validateSchema')}
              </button>
              <button
                onClick={handleSavePack}
                className="px-3.5 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Save className="w-3.5 h-3.5" /> Save Changes
              </button>
              <button
                onClick={handleExportJson}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export JSON
              </button>
            </div>
          </div>

          <textarea
            rows={22}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setValidationPassed(false);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded p-4 font-mono text-xs text-slate-200 outline-none focus:border-teal-400 leading-relaxed"
          />

          {validationErrors.length > 0 && (
            <div className="bg-rose-950/40 border border-rose-800 p-3 rounded text-xs text-rose-300">
              <span className="font-bold block mb-1">Validation Errors ({validationErrors.length}):</span>
              <ul className="list-disc list-inside font-mono space-y-0.5 text-[11px]">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {editorMode === 'ai' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">Synthesize Clinical Protocol from Clinical Guidelines</h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Provide clinical descriptors (monitored vitals, triage alert thresholds, acute clinical incidents, ward resources, recommended orders, and safety contraindications).
            The deterministic engine drafts a full DomainPack specification conforming to strict schema gating rules.
          </p>

          <textarea
            rows={5}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-slate-200 outline-none focus:border-teal-400 font-mono"
          />

          <div className="p-3 bg-slate-950 border border-amber-800/60 rounded text-[11px] text-amber-300 font-mono">
            Safety Guardrail: Draft protocols generated by AI remain strictly INACTIVE until a Clinical Director (Administrator) audits the schema, executes test scenarios, and formally approves activation.
          </div>

          <button
            onClick={handleGenerateAiPack}
            disabled={isGeneratingAi}
            className="self-start px-4 py-2 rounded bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{isGeneratingAi ? 'Synthesizing Protocol...' : 'Generate Draft Protocol'}</span>
          </button>
        </div>
      )}

      {/* Test Scenarios Runner Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-teal-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Clinical Protocol Test Harness
            </h4>
          </div>
          <button
            onClick={handleRunTest}
            className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-bold font-mono transition-colors"
          >
            {t('testProtocol')}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded border text-xs font-mono ${
              testResult.passed
                ? 'bg-teal-950/40 border-teal-800 text-teal-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            {testResult.message}
          </div>
        )}
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded text-xs font-medium border ${
            statusMessage.isError
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : 'bg-teal-950/40 border-teal-800 text-teal-300'
          }`}
        >
          {statusMessage.text}
        </div>
      )}
    </div>
  );
};
