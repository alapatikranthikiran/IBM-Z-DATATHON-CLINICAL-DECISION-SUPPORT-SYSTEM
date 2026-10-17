import React, { useState } from 'react';
import { useEngine } from '../context/EngineContext';
import { Send, FileCode, AlertOctagon, RefreshCw, Upload, CheckCircle2 } from 'lucide-react';
import { EventNormalizer } from '../engine/normalizer';

export const InjectEventModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { activePack, injectEvent, simTime } = useEngine();

  const [mode, setMode] = useState<'form' | 'json' | 'csv'>('form');
  const [selectedEntityId, setSelectedEntityId] = useState<string>(activePack?.entities[0]?.id || '');
  const [selectedSignalType, setSelectedSignalType] = useState<string>(activePack?.signalTypes[0]?.id || '');
  const [value, setValue] = useState<string>('50');
  const [source, setSource] = useState<string>('manual-injector-01');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const [jsonText, setJsonText] = useState<string>(
    JSON.stringify(
      {
        entityId: activePack?.entities[0]?.id || 'ENTITY-01',
        type: activePack?.signalTypes[0]?.id || 'signal_01',
        value: 75,
        unit: activePack?.signalTypes[0]?.unit || '',
        source: 'rest-payload-demo',
      },
      null,
      2
    )
  );

  const [csvText, setCsvText] = useState<string>(
    `entityId,type,value,unit,source\n${activePack?.entities[0]?.id || 'ENTITY-01'},${activePack?.signalTypes[0]?.id || 'signal_01'},68,${activePack?.signalTypes[0]?.unit || ''},csv-batch-01`
  );

  const currentSignalDef = activePack?.signalTypes.find((s) => s.id === selectedSignalType);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    const numVal = isNaN(Number(value)) ? value : Number(value);
    const res = await injectEvent({
      domainPackId: activePack?.id,
      entityId: selectedEntityId,
      type: selectedSignalType,
      value: numVal,
      unit: currentSignalDef?.unit || '',
      source,
      timestamp: simTime,
    });

    if (res.success) {
      setStatusMessage({ text: 'Signal normalized and correlated successfully.', isError: false });
    } else {
      setStatusMessage({ text: res.error || 'Failed to inject event', isError: true });
    }
  };

  const handleJsonSubmit = async () => {
    setStatusMessage(null);
    try {
      const parsed = JSON.parse(jsonText);
      const res = await injectEvent(parsed);
      if (res.success) {
        setStatusMessage({ text: 'JSON event ingested and correlated.', isError: false });
      } else {
        setStatusMessage({ text: res.error || 'Normalization rejected event.', isError: true });
      }
    } catch (err: any) {
      setStatusMessage({ text: 'Invalid JSON syntax: ' + err.message, isError: true });
    }
  };

  const handleCsvSubmit = async () => {
    setStatusMessage(null);
    try {
      const events = EventNormalizer.parseCsv(csvText);
      if (events.length === 0) {
        setStatusMessage({ text: 'No valid rows found in CSV.', isError: true });
        return;
      }
      let successCount = 0;
      for (const ev of events) {
        const res = await injectEvent(ev);
        if (res.success) successCount++;
      }
      setStatusMessage({ text: `Successfully processed ${successCount}/${events.length} rows.`, isError: false });
    } catch (err: any) {
      setStatusMessage({ text: 'Failed to parse CSV: ' + err.message, isError: true });
    }
  };

  const handleInjectMalformed = async () => {
    // Send payload intentionally missing required type field
    const res = await injectEvent({
      entityId: 'ENTITY-MALFORMED',
      value: null,
      source: 'corrupted-packet-generator',
    });
    if (!res.success) {
      setStatusMessage({ text: `Demonstration successful: Malformed event rejected ("${res.error}") and logged in Reliability Console.`, isError: false });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-teal-400" />
            <h3 className="text-base font-bold text-white">Event Ingestion & Testing Suite</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">
            ✕
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-3 gap-2">
          <button
            onClick={() => setMode('form')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all ${
              mode === 'form' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Structured Form
          </button>
          <button
            onClick={() => setMode('json')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all ${
              mode === 'json' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            JSON Raw Payload
          </button>
          <button
            onClick={() => setMode('csv')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all ${
              mode === 'csv' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            CSV Batch Stream
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          {mode === 'form' && (
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Target Monitored Entity</label>
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 text-xs focus:border-teal-400 outline-none"
                >
                  {activePack?.entities.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name} ({ent.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Signal Type</label>
                <select
                  value={selectedSignalType}
                  onChange={(e) => {
                    setSelectedSignalType(e.target.value);
                    const def = activePack?.signalTypes.find((s) => s.id === e.target.value);
                    if (def) setValue(String(def.criticalThreshold));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 text-xs focus:border-teal-400 outline-none"
                >
                  {activePack?.signalTypes.map((sig) => (
                    <option key={sig.id} value={sig.id}>
                      {sig.name} [{sig.unit || 'no unit'}]
                    </option>
                  ))}
                </select>
                {currentSignalDef && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Normal: {currentSignalDef.normalMin} - {currentSignalDef.normalMax} {currentSignalDef.unit} • Critical: {currentSignalDef.criticalDirection}{' '}
                    {currentSignalDef.criticalThreshold} {currentSignalDef.unit}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Telemetry Value</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono text-xs focus:border-teal-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Source Name</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono text-xs focus:border-teal-400 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleInjectMalformed}
                  className="px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 font-semibold text-xs flex items-center gap-1.5"
                >
                  <AlertOctagon className="w-3.5 h-3.5" /> Inject Malformed Event
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Transmit Signal
                </button>
              </div>
            </form>
          )}

          {mode === 'json' && (
            <div className="flex flex-col gap-3">
              <label className="text-slate-300 text-xs font-medium">Raw JSON Event Object</label>
              <textarea
                rows={7}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 font-mono text-xs focus:border-teal-400 outline-none"
              />
              <button
                onClick={handleJsonSubmit}
                className="self-end px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
              >
                Ingest JSON Event
              </button>
            </div>
          )}

          {mode === 'csv' && (
            <div className="flex flex-col gap-3">
              <label className="text-slate-300 text-xs font-medium">CSV Stream Text (Comma Delimited)</label>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 font-mono text-xs focus:border-teal-400 outline-none"
              />
              <button
                onClick={handleCsvSubmit}
                className="self-end px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
              >
                Stream Ingest CSV
              </button>
            </div>
          )}

          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs font-medium border ${
                statusMessage.isError
                  ? 'bg-red-950/40 border-red-800 text-red-300'
                  : 'bg-teal-950/40 border-teal-800 text-teal-300'
              }`}
            >
              {statusMessage.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
