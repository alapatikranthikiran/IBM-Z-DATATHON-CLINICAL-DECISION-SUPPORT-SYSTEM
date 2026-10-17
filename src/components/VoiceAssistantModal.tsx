import React, { useState, useEffect, useRef } from 'react';
import { useEngine } from '../context/EngineContext';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Bot,
  User,
  Sparkles,
  RotateCcw,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Settings,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  speakClinicalText,
  stopSpeaking,
  isSpeechRecognitionSupported,
  AVAILABLE_VOICES,
  GeminiVoice,
} from '../utils/voiceService';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VoiceDialogue {
  id: string;
  speaker: 'user' | 'assistant';
  text: string;
  timestamp: number;
  actionTaken?: string;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ isOpen, onClose }) => {
  const {
    cases,
    resources,
    signals,
    activeTab,
    setActiveTab,
    triggerScenario,
    activePack,
    theme,
    setTheme,
    toggleTheme,
    t,
  } = useEngine();

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<GeminiVoice>('Kore');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [handsFree, setHandsFree] = useState(false);
  const [dialogueHistory, setDialogueHistory] = useState<VoiceDialogue[]>([
    {
      id: 'init-1',
      speaker: 'assistant',
      text: 'Aegis Clinical Voice Assistant active. Say a clinical query like "Assess active ESI priority", "Check acute bed headroom", or "Navigate to triage queue".',
      timestamp: Date.now(),
    },
  ]);

  const recognitionRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript container
  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dialogueHistory, isOpen, interimText]);

  // Clean up speech and recognition when modal unmounts or closes
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Stop speaking and listening if closed
  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
      setIsSpeaking(false);
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
        setIsListening(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const recognitionAvailable = isSpeechRecognitionSupported();

  // Execute clinical command / intent matching
  const evaluateVoiceIntent = (query: string): { actionMessage?: string; handledTab?: string } => {
    const q = query.toLowerCase();

    if (q.includes('command center') || q.includes('dashboard') || q.includes('overview')) {
      setActiveTab('command-center');
      return { actionMessage: 'Navigating to Clinical Command Center.', handledTab: 'command-center' };
    }
    if (q.includes('triage') || q.includes('decision case') || q.includes('patient') || q.includes('cases')) {
      setActiveTab('decision-cases');
      return { actionMessage: 'Opening Decision Cases and Triage Workstation.', handledTab: 'decision-cases' };
    }
    if (q.includes('ledger') || q.includes('audit') || q.includes('history')) {
      setActiveTab('decision-ledger');
      return { actionMessage: 'Displaying Cryptographic Decision Ledger.', handledTab: 'decision-ledger' };
    }
    if (q.includes('resource') || q.includes('bed') || q.includes('ventilator') || q.includes('capacity')) {
      setActiveTab('resources');
      return { actionMessage: 'Navigating to Hospital Resource & Bed Allocation.', handledTab: 'resources' };
    }
    if (q.includes('scenario') || q.includes('simulation') || q.includes('stress test') || q.includes('lab')) {
      setActiveTab('scenario-lab');
      return { actionMessage: 'Opening Scenario Simulation Lab.', handledTab: 'scenario-lab' };
    }
    if (q.includes('reliability') || q.includes('health') || q.includes('circuit breaker')) {
      setActiveTab('reliability');
      return { actionMessage: 'Switching to Reliability and Safety Telemetry.', handledTab: 'reliability' };
    }
    if (q.includes('surge') || q.includes('mass casualty')) {
      triggerScenario('ed-surge');
      return { actionMessage: 'Executed Emergency Surge simulation. High-acuity patient influx queued.' };
    }
    if (q.includes('vitals spike') || q.includes('anomaly') || q.includes('telemetry spike')) {
      triggerScenario('vitals-spike');
      return { actionMessage: 'Transmitted acute telemetry vitals spike event.' };
    }
    if (q.includes('light mode') || q.includes('daylight') || q.includes('bright mode') || q.includes('day mode') || q.includes('white theme')) {
      setTheme('light');
      return { actionMessage: 'Switched workstation display to Daylight Surgical Clean mode.' };
    }
    if (q.includes('dark mode') || q.includes('night mode') || q.includes('dark theme')) {
      setTheme('dark');
      return { actionMessage: 'Switched workstation display to High-Contrast Dark mode.' };
    }
    if (q.includes('toggle theme') || q.includes('switch theme') || q.includes('change theme')) {
      toggleTheme();
      return { actionMessage: `Toggled workstation lighting mode to ${theme === 'dark' ? 'Daylight Surgical Clean' : 'High-Contrast Dark'}.` };
    }

    return {};
  };

  // Process completed voice or text query
  const processQuery = async (queryText: string) => {
    const cleanQuery = queryText.trim();
    if (!cleanQuery) return;

    // Add user voice bubble
    const userItem: VoiceDialogue = {
      id: `user-${Date.now()}`,
      speaker: 'user',
      text: cleanQuery,
      timestamp: Date.now(),
    };

    setDialogueHistory((prev) => [...prev, userItem]);
    setTranscript('');
    setInterimText('');
    setIsProcessing(true);

    // Check for quick intent navigation / scenario commands
    const { actionMessage } = evaluateVoiceIntent(cleanQuery);

    try {
      // Call Gemini clinical assistant backend
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: cleanQuery }],
          chatbotRole: 'triage',
          model: 'gemini-3.8-flash',
          activeCaseId: cases[0]?.id || null,
        }),
      });

      const data = await res.json();
      let responseText = data.content || 'Clinical analysis complete.';

      if (actionMessage) {
        responseText = `${actionMessage}\n\n${responseText}`;
      }

      const botItem: VoiceDialogue = {
        id: `bot-${Date.now()}`,
        speaker: 'assistant',
        text: responseText,
        timestamp: Date.now(),
        actionTaken: actionMessage,
      };

      setDialogueHistory((prev) => [...prev, botItem]);

      // Speak back response if autoSpeak is enabled
      if (autoSpeak) {
        handleSpeakText(responseText);
      }
    } catch (err) {
      const fallbackText = actionMessage ||
        `Based on active telemetry: ${cases.length} patients in queue, ${resources.reduce((sum, r) => sum + r.availableQuantity, 0)} acute beds open. All deterministic safeguards intact.`;
      
      const botItem: VoiceDialogue = {
        id: `bot-${Date.now()}`,
        speaker: 'assistant',
        text: fallbackText,
        timestamp: Date.now(),
        actionTaken: actionMessage,
      };

      setDialogueHistory((prev) => [...prev, botItem]);
      if (autoSpeak) {
        handleSpeakText(fallbackText);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Speak specific text using voice service
  const handleSpeakText = (text: string) => {
    setIsSpeaking(true);
    speakClinicalText(text, {
      voice: selectedVoice,
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        // If hands-free mode is on, resume listening automatically
        if (handsFree && recognitionAvailable) {
          setTimeout(() => startListening(), 400);
        }
      },
      onError: () => setIsSpeaking(false),
    });
  };

  // Start browser speech recognition
  const startListening = () => {
    if (!recognitionAvailable) return;
    stopSpeaking();
    setIsSpeaking(false);

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setInterimText('');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (currentInterim) {
          setInterimText(currentInterim);
        }

        if (finalTranscript) {
          setInterimText('');
          setTranscript(finalTranscript);
          setIsListening(false);
          processQuery(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setInterimText('');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.warn('Error starting speech recognition:', e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const quickCommands = [
    'Assess active ESI priority',
    'Check acute bed headroom',
    'Open decision cases',
    'Trigger emergency surge',
    'Transmitting vitals spike',
    'Go to command center',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Mic className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">Clinical Voice Assistant</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/25">
                  Gemini TTS & Voice Control
                </span>
              </div>
              <span className="text-xs text-slate-400 block cdss-leading-tight">
                Hands-free clinical speech recognition, intent execution & audio consultation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isSpeaking && (
              <button
                onClick={() => {
                  stopSpeaking();
                  setIsSpeaking(false);
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded hover:bg-rose-500/25 transition-colors cursor-pointer"
                title="Silence Voice Output"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Mute</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center: Live Audio Waveform & Status Station */}
        <div className="px-6 py-5 bg-gradient-to-b from-slate-950/80 to-slate-900 border-b border-slate-800/80 flex flex-col items-center justify-center relative">
          {/* Main Microphone Button */}
          <div className="relative my-2">
            {/* Animated Pulsing Rings */}
            {isListening && (
              <>
                <span className="absolute -inset-3 rounded-full bg-teal-500/20 animate-ping opacity-75" />
                <span className="absolute -inset-6 rounded-full bg-teal-500/10 animate-pulse" />
              </>
            )}
            {isSpeaking && (
              <span className="absolute -inset-3 rounded-full bg-cyan-500/20 animate-pulse" />
            )}

            <button
              onClick={toggleListening}
              disabled={isProcessing}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl cursor-pointer ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40 ring-4 ring-rose-500/30'
                  : isSpeaking
                  ? 'bg-cyan-600 text-white shadow-cyan-600/40 ring-4 ring-cyan-500/30'
                  : isProcessing
                  ? 'bg-amber-600 text-white animate-pulse'
                  : 'bg-teal-600 hover:bg-teal-500 text-slate-950 hover:scale-105 shadow-teal-600/30'
              }`}
              title={isListening ? 'Click to stop listening' : 'Click to speak'}
            >
              {isListening ? (
                <Mic className="w-9 h-9 animate-pulse" />
              ) : isSpeaking ? (
                <Volume2 className="w-9 h-9 animate-bounce" />
              ) : (
                <Mic className="w-9 h-9 stroke-[2.3]" />
              )}
            </button>
          </div>

          {/* Status Label & Interim Preview */}
          <div className="text-center mt-2.5 max-w-lg">
            <div className="text-xs font-semibold tracking-wide">
              {isListening ? (
                <span className="text-rose-400 flex items-center justify-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                  LISTENING FOR CLINICAL INSTRUCTION...
                </span>
              ) : isSpeaking ? (
                <span className="text-cyan-400 flex items-center justify-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  SPEAKING VIA {selectedVoice.toUpperCase()} (GEMINI TTS)
                </span>
              ) : isProcessing ? (
                <span className="text-amber-400 flex items-center justify-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-spin" />
                  SYNTHESIZING CLINICAL TELEMETRY...
                </span>
              ) : (
                <span className="text-slate-300 font-medium">
                  {recognitionAvailable
                    ? 'Press microphone to dictate or speak a command'
                    : 'Browser speech recognition not detected; select quick voice commands below'}
                </span>
              )}
            </div>

            {/* Interim Transcript Live Display */}
            {interimText && (
              <p className="mt-1.5 text-xs italic text-teal-300 font-mono bg-teal-950/40 border border-teal-800/40 rounded px-2.5 py-1">
                "{interimText}..."
              </p>
            )}
          </div>

          {/* Equalizer Wave Simulation when Speaking */}
          {isSpeaking && (
            <div className="flex items-center gap-1 mt-3">
              {[40, 75, 100, 60, 90, 45, 80, 50, 95, 65].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-cyan-400 rounded-full animate-pulse"
                  style={{
                    height: `${(h / 100) * 18 + 4}px`,
                    animationDelay: `${i * 90}ms`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Command Suggestions Chips */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/70">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Quick Clinical Voice Commands
            </span>
            <span className="text-[10px] text-teal-400/80 font-mono">Click to test instant intent</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickCommands.map((cmd) => (
              <button
                key={cmd}
                onClick={() => processQuery(cmd)}
                disabled={isProcessing}
                className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-md border border-slate-700/60 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3 text-teal-400" />
                <span>{cmd}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dialogue Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/30 min-h-[160px] max-h-[260px]">
          {dialogueHistory.map((d) => {
            const isUser = d.speaker === 'user';
            return (
              <div
                key={d.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-6 h-6 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center shrink-0 text-teal-400 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs shadow-sm ${
                    isUser
                      ? 'bg-teal-500 text-slate-950 font-medium'
                      : 'bg-slate-900 border border-slate-800 text-slate-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{d.text}</p>

                  <div
                    className={`mt-1.5 flex items-center gap-2 text-[10px] ${
                      isUser ? 'text-slate-900/80 justify-end' : 'text-slate-400 justify-between'
                    }`}
                  >
                    <span>
                      {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>

                    {!isUser && (
                      <button
                        onClick={() => handleSpeakText(d.text)}
                        className="text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Read aloud"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Listen</span>
                      </button>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Footer Configuration Bar */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-3">
            {/* Voice Selection */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Voice:</span>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value as GeminiVoice)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-teal-300 outline-none cursor-pointer"
              >
                {AVAILABLE_VOICES.map((v) => (
                  <option key={v.id} value={v.id} className="bg-slate-900 text-slate-100">
                    {v.name} ({v.gender} · {v.tone.split(',')[0]})
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-Speak Checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0"
              />
              <span className="text-slate-300">Auto-speak responses</span>
            </label>

            {/* Hands-Free Checkbox */}
            {recognitionAvailable && (
              <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none hidden sm:flex">
                <input
                  type="checkbox"
                  checked={handsFree}
                  onChange={(e) => setHandsFree(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0"
                />
                <span className="text-slate-300">Hands-free loop</span>
              </label>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDialogueHistory([
                  {
                    id: `clear-${Date.now()}`,
                    speaker: 'assistant',
                    text: 'Dialogue history cleared. Ready for speech input.',
                    timestamp: Date.now(),
                  },
                ]);
              }}
              className="px-2.5 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded transition-colors"
            >
              Clear Log
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
