import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  ActionOption,
  DecisionCase,
  DecisionRecord,
  DomainPack,
  QualityStatus,
  ReliabilityMetrics,
  Resource,
  Signal,
  UserRole,
  ThemeMode,
} from '../types';
import { SupportedLanguage, TRANSLATIONS } from '../i18n';

interface EngineContextType {
  simTime: number;
  isRunning: boolean;
  simSpeed: number;
  prngSeed: number;
  activeRole: UserRole;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  activePackId: string;
  activePack: DomainPack | null;
  packs: DomainPack[];
  signals: Signal[];
  cases: DecisionCase[];
  optionsMap: Record<string, ActionOption[]>;
  resources: Resource[];
  ledger: DecisionRecord[];
  reliability: ReliabilityMetrics;
  disconnectedSources: string[];
  streamConnected: boolean;
  activeTab: string;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setActiveTab: (tab: string) => void;
  setActiveRole: (role: UserRole) => void;
  changePack: (packId: string) => Promise<boolean>;
  togglePlayPause: () => Promise<void>;
  resetSimulation: () => Promise<void>;
  setSimSpeed: (speed: number) => Promise<void>;
  setPrngSeed: (seed: number) => Promise<void>;
  injectEvent: (eventData: any) => Promise<{ success: boolean; error?: string }>;
  disconnectSource: (sourceId: string) => Promise<void>;
  restoreSource: (sourceId: string) => Promise<void>;
  approveAction: (caseId: string, actionId: string, reason?: string, softOverrideReason?: string) => Promise<{ success: boolean; error?: string }>;
  rejectAction: (caseId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  escalateAction: (caseId: string, reason: string, escalateTo?: string) => Promise<{ success: boolean; error?: string }>;
  recalculateCase: (caseId: string) => Promise<void>;
  triggerScenario: (scenarioId: string) => Promise<void>;
  toggleGemini: () => Promise<void>;
  refreshState: () => Promise<void>;
  runGuidedDemo: boolean;
  setRunGuidedDemo: (val: boolean) => void;
}

const EngineContext = createContext<EngineContextType | undefined>(undefined);

export const EngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('command-center');
  const [language, setLanguageState] = useState<SupportedLanguage>('en');
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('aegis_theme');
        if (saved === 'light' || saved === 'dark') return saved;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
          return 'light';
        }
      } catch {
        // ignore
      }
    }
    return 'dark';
  });

  // Sync theme with HTML class and attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'light') {
        root.classList.remove('dark');
        root.classList.add('light');
        root.setAttribute('data-theme', 'light');
        root.style.colorScheme = 'light';
      } else {
        root.classList.remove('light');
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
        root.style.colorScheme = 'dark';
      }
      try {
        localStorage.setItem('aegis_theme', theme);
      } catch {
        // ignore
      }
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const [simTime, setSimTime] = useState<number>(1776400000000);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simSpeed, setSimSpeedState] = useState<number>(1);
  const [prngSeed, setPrngSeedState] = useState<number>(4242);
  const [activeRole, setActiveRoleState] = useState<UserRole>('Operator');
  const [activePackId, setActivePackId] = useState<string>('hospital-capacity-v1');
  const [activePack, setActivePack] = useState<DomainPack | null>(null);
  const [packs, setPacks] = useState<DomainPack[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [cases, setCases] = useState<DecisionCase[]>([]);
  const [optionsMap, setOptionsMap] = useState<Record<string, ActionOption[]>>({});
  const [resources, setResources] = useState<Resource[]>([]);
  const [ledger, setLedger] = useState<DecisionRecord[]>([]);
  const [disconnectedSources, setDisconnectedSources] = useState<string[]>([]);
  const [streamConnected, setStreamConnected] = useState<boolean>(false);
  const [runGuidedDemo, setRunGuidedDemo] = useState<boolean>(false);

  const [reliability, setReliability] = useState<ReliabilityMetrics>({
    connectedSources: 4,
    totalSources: 4,
    malformedEventCount: 0,
    staleSourceCount: 0,
    contradictorySignalCount: 0,
    geminiAvailable: true,
    deterministicFallbackActive: false,
    averageProcessingLatencyMs: 14.5,
    streamUptimeSeconds: 0,
    recentErrors: [],
  });

  const applySnapshot = useCallback((data: any) => {
    if (!data) return;
    if (data.simTime !== undefined) setSimTime(data.simTime);
    if (data.isRunning !== undefined) setIsRunning(data.isRunning);
    if (data.simSpeed !== undefined) setSimSpeedState(data.simSpeed);
    if (data.prngSeed !== undefined) setPrngSeedState(data.prngSeed);
    if (data.activeRole !== undefined) setActiveRoleState(data.activeRole);
    if (data.activePackId !== undefined) setActivePackId(data.activePackId);
    if (data.activePack !== undefined) setActivePack(data.activePack);
    if (data.signals !== undefined) setSignals(data.signals);
    if (data.cases !== undefined) setCases(data.cases);
    if (data.optionsMap !== undefined) setOptionsMap(data.optionsMap);
    if (data.resources !== undefined) setResources(data.resources);
    if (data.ledger !== undefined) setLedger(data.ledger);
    if (data.reliability !== undefined) setReliability(data.reliability);
    if (data.disconnectedSources !== undefined) setDisconnectedSources(data.disconnectedSources);
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        applySnapshot(data);
      }
    } catch (err) {
      console.warn('Failed to poll /api/state:', err);
    }
  }, [applySnapshot]);

  // Fetch domain packs list
  const refreshPacks = useCallback(async () => {
    try {
      const res = await fetch('/api/domain-packs');
      if (res.ok) {
        const data = await res.json();
        setPacks(data.packs || []);
      }
    } catch (err) {
      console.warn('Failed to fetch packs:', err);
    }
  }, []);

  // Connect Server-Sent Events (SSE) with Polling Fallback
  useEffect(() => {
    let sse: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    try {
      sse = new EventSource('/api/stream/events');

      sse.onopen = () => {
        setStreamConnected(true);
      };

      sse.addEventListener('init', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          applySnapshot(data);
        } catch {}
      });

      sse.addEventListener('heartbeat', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setSimTime(data.simTime);
          setIsRunning(data.isRunning);
          setSimSpeedState(data.simSpeed);
        } catch {}
      });

      sse.addEventListener('signal', (e: MessageEvent) => {
        try {
          const sig: Signal = JSON.parse(e.data);
          setSignals((prev) => [sig, ...prev.slice(0, 49)]);
        } catch {}
      });

      sse.addEventListener('cases', (e: MessageEvent) => {
        try {
          const updatedCases: DecisionCase[] = JSON.parse(e.data);
          setCases(updatedCases);
          refreshState();
        } catch {}
      });

      sse.addEventListener('state_update', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          applySnapshot(data);
        } catch {}
      });

      sse.addEventListener('pack_changed', (e: MessageEvent) => {
        try {
          const pack: DomainPack = JSON.parse(e.data);
          setActivePack(pack);
          setActivePackId(pack.id);
          refreshState();
        } catch {}
      });

      sse.addEventListener('decision_approved', () => {
        refreshState();
      });

      sse.onerror = () => {
        setStreamConnected(false);
        // Start polling fallback every 3 seconds if SSE drops
        if (!pollInterval) {
          pollInterval = setInterval(refreshState, 3000);
        }
      };
    } catch {
      setStreamConnected(false);
      pollInterval = setInterval(refreshState, 3000);
    }

    refreshState();
    refreshPacks();

    return () => {
      if (sse) sse.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [applySnapshot, refreshState, refreshPacks]);

  // Actions
  const setActiveRole = async (role: UserRole) => {
    setActiveRoleState(role);
    await fetch('/api/simulation/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setRole', role }),
    });
  };

  const changePack = async (packId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/domain-packs/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId, role: activeRole }),
      });
      if (res.ok) {
        await refreshState();
        await refreshPacks();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const togglePlayPause = async () => {
    const action = isRunning ? 'pause' : 'play';
    setIsRunning(!isRunning);
    await fetch('/api/simulation/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
  };

  const resetSimulation = async () => {
    await fetch('/api/simulation/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });
    await refreshState();
  };

  const setSimSpeed = async (speed: number) => {
    setSimSpeedState(speed);
    await fetch('/api/simulation/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setSpeed', speed }),
    });
  };

  const setPrngSeed = async (seed: number) => {
    setPrngSeedState(seed);
    await fetch('/api/simulation/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setSeed', seed }),
    });
    await refreshState();
  };

  const injectEvent = async (eventData: any) => {
    const res = await fetch('/api/simulation/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'injectEvent', eventData }),
    });
    const data = await res.json();
    await refreshState();
    return data;
  };

  const disconnectSource = async (sourceId: string) => {
    await fetch('/api/simulation/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disconnectSource', sourceId }),
    });
    await refreshState();
  };

  const restoreSource = async (sourceId: string) => {
    await fetch('/api/simulation/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restoreSource', sourceId }),
    });
    await refreshState();
  };

  const approveAction = async (caseId: string, actionId: string, reason?: string, softOverrideReason?: string) => {
    const res = await fetch('/api/action/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        actionId,
        operatorRole: activeRole,
        reason,
        softOverrideReason,
      }),
    });
    const data = await res.json();
    await refreshState();
    return data;
  };

  const rejectAction = async (caseId: string, reason: string) => {
    const res = await fetch('/api/action/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        reason,
        operatorRole: activeRole,
      }),
    });
    const data = await res.json();
    await refreshState();
    return data;
  };

  const escalateAction = async (caseId: string, reason: string, escalateTo?: string) => {
    const res = await fetch('/api/action/escalate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId,
        reason,
        operatorRole: activeRole,
        escalateTo,
      }),
    });
    const data = await res.json();
    await refreshState();
    return data;
  };

  const recalculateCase = async (caseId: string) => {
    await fetch('/api/action/recalculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId }),
    });
    await refreshState();
  };

  const triggerScenario = async (scenarioId: string) => {
    await fetch('/api/simulation/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId }),
    });
    await refreshState();
  };

  const toggleGemini = async () => {
    await fetch('/api/reliability/toggle-gemini', { method: 'POST' });
    await refreshState();
  };

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  };

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
      let text = dict[key] || TRANSLATIONS.en[key] || key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return text;
    },
    [language]
  );

  return (
    <EngineContext.Provider
      value={{
        simTime,
        isRunning,
        simSpeed,
        prngSeed,
        activeRole,
        activePackId,
        activePack,
        packs,
        signals,
        cases,
        optionsMap,
        resources,
        ledger,
        reliability,
        disconnectedSources,
        streamConnected,
        activeTab,
        language,
        setLanguage,
        theme,
        setTheme,
        toggleTheme,
        t,
        setActiveTab,
        setActiveRole,
        changePack,
        togglePlayPause,
        resetSimulation,
        setSimSpeed,
        setPrngSeed,
        injectEvent,
        disconnectSource,
        restoreSource,
        approveAction,
        rejectAction,
        escalateAction,
        recalculateCase,
        triggerScenario,
        toggleGemini,
        refreshState,
        runGuidedDemo,
        setRunGuidedDemo,
      }}
    >
      {children}
    </EngineContext.Provider>
  );
};

export const useEngine = () => {
  const context = useContext(EngineContext);
  if (!context) throw new Error('useEngine must be used within an EngineProvider');
  return context;
};
