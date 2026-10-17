import React, { useState, useRef, useEffect } from 'react';
import { useEngine } from '../context/EngineContext';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Minimize2,
  Maximize2,
  Stethoscope,
  Activity,
  Bed,
  CheckCircle2,
  Clock,
  Shield,
  Zap,
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  modelUsed?: string;
}

interface ClinicalChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ChatbotRole = 'general' | 'triage' | 'attending' | 'rapid_flow';

export const ClinicalChatDrawer: React.FC<ClinicalChatDrawerProps> = ({ isOpen, onClose }) => {
  const { cases, resources, reliability, activePack, t } = useEngine();

  const [chatbotRole, setChatbotRole] = useState<ChatbotRole>('general');
  const [modelType, setModelType] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite'>('gemini-3.8-flash');
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      content:
        'Aegis CDSS Clinical Assistant online. Grounded in acute station telemetry, ESI scoring logic, and deterministic ward rules. How can I assist with triage, patient acuity, or bed allocation?',
      timestamp: Date.now(),
      modelUsed: 'gemini-3.8-flash',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of conversation thread
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  // Adjust model based on role selection
  useEffect(() => {
    if (chatbotRole === 'rapid_flow') {
      setModelType('gemini-3.1-flash-lite');
    } else {
      setModelType('gemini-3.8-flash');
    }
  }, [chatbotRole]);

  if (!isOpen) return null;

  const roleDefinitions: { id: ChatbotRole; label: string; icon: any; desc: string; model: string }[] = [
    {
      id: 'general',
      label: 'CDSS Copilot',
      icon: Stethoscope,
      desc: 'General clinical consultation & telemetry interpretation',
      model: 'gemini-3.8-flash',
    },
    {
      id: 'triage',
      label: 'Triage Officer',
      icon: Activity,
      desc: 'Emergency Severity Index (ESI 1-5) and acuity validation',
      model: 'gemini-3.8-flash',
    },
    {
      id: 'attending',
      label: 'Attending Physician',
      icon: Shield,
      desc: 'Complex clinical reasoning & contraindication review',
      model: 'gemini-3.8-flash',
    },
    {
      id: 'rapid_flow',
      label: 'Rapid Flow Dispatcher',
      icon: Zap,
      desc: 'Fast bed allocation & surge bottleneck dispatcher',
      model: 'gemini-3.1-flash-lite',
    },
  ];

  const quickPrompts = [
    'Assess ESI priority for active patient queue',
    'Are there contraindications for ICU bed transfer?',
    'Review high-risk telemetry and vitals trend',
    'Summarize current Acute Care bed headroom',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Send conversation history for multi-turn context
      const payload = {
        messages: newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        chatbotRole: chatbotRole,
        model: modelType,
        activeCaseId: cases[0]?.id || null,
      };

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const modelMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: data.content || 'Clinical response completed.',
        timestamp: data.timestamp || Date.now(),
        modelUsed: data.modelUsed || modelType,
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: 'Unable to communicate with clinical reasoning gateway. Deterministic protocols remain active.',
        timestamp: Date.now(),
        modelUsed: 'Fallback',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        content: `Chat history cleared. Active role: ${roleDefinitions.find((r) => r.id === chatbotRole)?.label}. Ready for new clinical inquiry.`,
        timestamp: Date.now(),
        modelUsed: modelType,
      },
    ]);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col text-slate-200">
      {/* Top Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Bot className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-tight">Gemini Clinical Assistant</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                {modelType}
              </span>
            </div>
            <span className="text-[10.5px] text-slate-400 block cdss-leading-tight">
              Multi-Turn Clinical Decision Support
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearHistory}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Role Selector & System Instruction Banner */}
      <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
            Assistant Role
          </span>
          <span className="text-[10px] text-teal-400/90 font-mono">
            {chatbotRole === 'rapid_flow' ? '⚡ Fast Task' : '🧠 Reasoning'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {roleDefinitions.map((r) => {
            const Icon = r.icon;
            const isSelected = chatbotRole === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setChatbotRole(r.id)}
                className={`p-1.5 rounded-md text-left transition-all border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-teal-500/15 border-teal-500/50 text-teal-200 font-semibold shadow-sm'
                    : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-teal-400' : 'text-slate-500'}`} />
                <div className="truncate">
                  <div className="text-[11px] leading-none truncate">{r.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-3 py-2 bg-slate-950 border-b border-slate-800/80 overflow-x-auto flex gap-1.5 no-scrollbar">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            className="shrink-0 text-[10.5px] px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-teal-500/40 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Scrollable Conversation Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/90">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-6 h-6 rounded bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0 mt-0.5 text-teal-400">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs ${
                  isUser
                    ? 'bg-teal-600 text-slate-950 font-medium rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed cdss-leading-tight">
                  {m.content}
                </div>

                <div
                  className={`mt-1.5 flex items-center gap-1.5 text-[9.5px] font-mono ${
                    isUser ? 'text-slate-900/80 justify-end' : 'text-slate-400 justify-between'
                  }`}
                >
                  <span>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {!isUser && m.modelUsed && (
                    <span className="text-teal-400/90 font-mono">[{m.modelUsed}]</span>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-slate-300">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-6 h-6 rounded bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0 text-teal-400">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
              <span>Synthesizing evidence-grounded response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/95">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder={`Ask ${roleDefinitions.find((r) => r.id === chatbotRole)?.label}...`}
            disabled={isLoading}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-teal-500/60 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className={`p-2 rounded-lg font-bold text-xs transition-colors shrink-0 flex items-center justify-center ${
              !inputPrompt.trim() || isLoading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-500 text-slate-950 shadow-sm cursor-pointer'
            }`}
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Model: {modelType}</span>
          <span>Station: Acute Care Station 04</span>
        </div>
      </div>
    </div>
  );
};
