import React from 'react';
import { EngineProvider, useEngine } from './context/EngineContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CommandCenter } from './pages/CommandCenter';
import { DecisionCases } from './pages/DecisionCases';
import { ScenarioLab } from './pages/ScenarioLab';
import { DomainPackStudio } from './pages/DomainPackStudio';
import { ResourcesPage } from './pages/ResourcesPage';
import { DecisionLedger } from './pages/DecisionLedger';
import { ReliabilityConsole } from './pages/ReliabilityConsole';
import { SettingsPage } from './pages/SettingsPage';

const MainLayout: React.FC = () => {
  const { activeTab, language } = useEngine();

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'command-center':
        return <CommandCenter />;
      case 'decision-cases':
        return <DecisionCases />;
      case 'scenario-lab':
        return <ScenarioLab />;
      case 'domain-studio':
        return <DomainPackStudio />;
      case 'resources':
        return <ResourcesPage />;
      case 'decision-ledger':
        return <DecisionLedger />;
      case 'reliability':
        return <ReliabilityConsole />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <CommandCenter />;
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-950 h-[calc(100vh-3.75rem)]">
          {renderActiveTab()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <EngineProvider>
      <MainLayout />
    </EngineProvider>
  );
}
