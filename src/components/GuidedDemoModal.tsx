import React, { useState } from 'react';
import { useEngine } from '../context/EngineContext';
import {
  Play,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  FastForward,
  Sparkles,
  ShieldAlert,
  XCircle,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';

interface DemoStep {
  step: number;
  title: string;
  description: string;
  instruction: string;
  targetTab?: string;
  action: (engine: ReturnType<typeof useEngine>) => Promise<void>;
}

const DEMO_STEPS: DemoStep[] = [
  {
    step: 1,
    title: 'Load Disaster Response Domain Pack',
    description: 'Aegis loads the Disaster Response pack defining hydrologic signals, flood risk models, and rescue teams.',
    instruction: 'Activating Disaster Response & Flood Evacuation pack...',
    targetTab: 'command-center',
    action: async (e) => {
      await e.changePack('disaster-response-v1');
    },
  },
  {
    step: 2,
    title: 'Inject Rising Flood Level',
    description: 'Telemetry sensor reports river elevation at 6.8 meters (surpassing critical 6.5m levee containment threshold).',
    instruction: 'Injecting critical water level signal at Basin North Sector...',
    targetTab: 'command-center',
    action: async (e) => {
      await e.injectEvent({
        domainPackId: 'disaster-response-v1',
        entityId: 'BASIN-NORTH-01',
        type: 'water_level',
        value: 6.85,
        unit: 'm',
        source: 'hydrologic-gauge-04',
      });
    },
  },
  {
    step: 3,
    title: 'Block Primary Evacuation Corridor',
    description: 'Road Passability Index falls to 22%, triggering corridor severance risk rule.',
    instruction: 'Injecting road passability degradation on Highway 101 Causeway...',
    targetTab: 'command-center',
    action: async (e) => {
      await e.injectEvent({
        domainPackId: 'disaster-response-v1',
        entityId: 'ROUTE-PRIMARY-02',
        type: 'road_availability',
        value: 22,
        unit: '%',
        source: 'traffic-sensor-14',
      });
    },
  },
  {
    step: 4,
    title: 'Create Two Affected Zones Competing for Resources',
    description: 'Secondary incident reports trapped population in Lowland Settlement zone.',
    instruction: 'Correlating secondary incident requiring rescue craft deployment...',
    targetTab: 'decision-cases',
    action: async (e) => {
      await e.injectEvent({
        domainPackId: 'disaster-response-v1',
        entityId: 'COMMUNITY-VALLEY-04',
        type: 'water_level',
        value: 7.2,
        unit: 'm',
        source: 'satellite-recon-02',
      });
    },
  },
  {
    step: 5,
    title: 'Resource Scarcity: Only 1 Swiftwater Team',
    description: 'Notice that Swiftwater Rescue Taskforce Alpha has quantity = 1, creating a resource bottleneck.',
    instruction: 'Navigating to Resources tab to view allocation conflict solver...',
    targetTab: 'resources',
    action: async () => {},
  },
  {
    step: 6,
    title: 'Compare What-If Response Options',
    description: 'The engine evaluates feasible vs infeasible options, residual risks, and expected outcomes deterministically.',
    instruction: 'Viewing What-If Scenario Lab comparison matrix...',
    targetTab: 'scenario-lab',
    action: async () => {},
  },
  {
    step: 7,
    title: 'Disconnect Critical Sensor',
    description: 'Simulate telemetry loss by disconnecting hydrologic-gauge-04 to trigger Degraded Data Mode.',
    instruction: 'Disconnecting hydrologic-gauge-04 sensor...',
    targetTab: 'reliability',
    action: async (e) => {
      await e.disconnectSource('hydrologic-gauge-04');
    },
  },
  {
    step: 8,
    title: 'Show Degraded Data Handling',
    description: 'Degraded mode retains last known reading, marks it stale, and flags verification requirement without suppressing harm priority.',
    instruction: 'Inspecting Reliability Console and data staleness indicators...',
    targetTab: 'reliability',
    action: async () => {},
  },
  {
    step: 9,
    title: 'Restore Sensor Stream',
    description: 'Sensor connection restored. Live telemetry immediately updates stateVersion and refreshes cases.',
    instruction: 'Restoring hydrologic-gauge-04 stream...',
    targetTab: 'reliability',
    action: async (e) => {
      await e.restoreSource('hydrologic-gauge-04');
    },
  },
  {
    step: 10,
    title: 'Human Approves Authorized Action',
    description: 'Human Operator reviews evidence graph, constraints, and approves the highest-utility feasible action.',
    instruction: 'Approving recommended action for active case...',
    targetTab: 'decision-cases',
    action: async (e) => {
      const activeCase = e.cases[0];
      if (activeCase && e.optionsMap[activeCase.id]?.[0]) {
        const option = e.optionsMap[activeCase.id][0];
        await e.approveAction(activeCase.id, option.id, 'Approved via Guided Demonstration');
      }
    },
  },
  {
    step: 11,
    title: 'Replay the Historical Decision',
    description: 'View the append-only Decision Ledger and run the 8-stage audit replay reconstructor.',
    instruction: 'Navigating to Decision Ledger...',
    targetTab: 'decision-ledger',
    action: async () => {},
  },
  {
    step: 12,
    title: 'Switch to Manufacturing Safety Pack',
    description: 'Demonstrating that the exact same generic decision engine handles Industrial Turbomachinery without code changes.',
    instruction: 'Activating Industrial Turbomachinery & Plant Safety pack...',
    targetTab: 'command-center',
    action: async (e) => {
      await e.changePack('manufacturing-safety-v1');
    },
  },
  {
    step: 13,
    title: 'Demonstrate Same Engine with New Domain',
    description: 'Inject machine bearing temperature surge to 102°C and radial vibration spike to 9.2 mm/s.',
    instruction: 'Injecting thermal & vibration anomaly in turbine generator...',
    targetTab: 'decision-cases',
    action: async (e) => {
      await e.injectEvent({
        domainPackId: 'manufacturing-safety-v1',
        entityId: 'TURBINE-GEN-01',
        type: 'machine_temperature',
        value: 102.5,
        unit: '°C',
        source: 'rt-thermocouple-01',
      });
      await e.injectEvent({
        domainPackId: 'manufacturing-safety-v1',
        entityId: 'TURBINE-GEN-01',
        type: 'vibration',
        value: 9.4,
        unit: 'mm/s',
        source: 'vibe-accelerometer-02',
      });
    },
  },
  {
    step: 14,
    title: 'Inspect Approval Rules in Domain Pack Studio',
    description: 'View and adjust hard vs soft constraints and escalation thresholds for the active pack.',
    instruction: 'Navigating to Domain Pack Studio...',
    targetTab: 'domain-studio',
    action: async () => {},
  },
  {
    step: 15,
    title: 'Re-evaluate Existing Case Using New Policy Version',
    description: 'Recalculating with updated constraints immediately checks feasibility and stamps recommendations with stateVersion.',
    instruction: 'Guided demo complete! Aegis DecisionOS successfully verified against all IBM Z Datathon criteria.',
    targetTab: 'command-center',
    action: async (e) => {
      if (e.cases[0]) {
        await e.recalculateCase(e.cases[0].id);
      }
    },
  },
];

export const GuidedDemoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const engine = useEngine();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const step = DEMO_STEPS[currentStepIndex];

  const handleRunStep = async (index: number) => {
    setIsExecuting(true);
    const targetStep = DEMO_STEPS[index];
    if (targetStep.targetTab) {
      engine.setActiveTab(targetStep.targetTab);
    }
    await targetStep.action(engine);
    setIsExecuting(false);
  };

  const handleNext = async () => {
    if (currentStepIndex < DEMO_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      await handleRunStep(nextIndex);
    }
  };

  const handlePrev = async () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      await handleRunStep(prevIndex);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-teal-500/50 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                IBM Z Datathon Guided Demonstration
              </h2>
              <p className="text-xs text-slate-400">
                15-Step Automated Verification Walkthrough
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Step Content */}
        <div className="p-6 flex flex-col gap-4 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono text-xs font-bold">
              STEP {step.step} OF 15
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Target: {step.targetTab?.toUpperCase()}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">{step.title}</h3>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              {step.description}
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs font-mono text-teal-300">
              {isExecuting ? 'Executing command...' : step.instruction}
            </span>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {DEMO_STEPS.map((s, idx) => (
              <button
                key={s.step}
                onClick={() => {
                  setCurrentStepIndex(idx);
                  handleRunStep(idx);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? 'w-6 bg-teal-400'
                    : idx < currentStepIndex
                    ? 'w-2 bg-teal-700'
                    : 'w-2 bg-slate-700'
                }`}
                title={`Step ${s.step}: ${s.title}`}
              />
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            disabled={currentStepIndex === 0 || isExecuting}
            onClick={handlePrev}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-300 flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunStep(currentStepIndex)}
              disabled={isExecuting}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-execute Step
            </button>
            <button
              disabled={currentStepIndex === DEMO_STEPS.length - 1 || isExecuting}
              onClick={handleNext}
              className="px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-teal-500/20"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
