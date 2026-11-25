/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { NavSectionId, OptimizedModelConfig, PredictionRecord } from './types/domain';
import { usePredictionStore } from './hooks/usePredictionStore';
import {
  DEFAULT_UPLOADED_RF_CONFIG,
  loadOptimizedModelConfig,
} from './services/aiDiagnosticService';
import { AuthUser, logoutSession, registerUnauthorizedHandler } from './services/authService';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { PredictionDetailModal } from './components/PredictionDetailModal';
import { ToastStack } from './components/ToastNotification';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PredictFailurePage } from './pages/PredictFailurePage';
import { PredictionHistoryPage } from './pages/PredictionHistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AiIntelligencePage } from './pages/AiIntelligencePage';
import { ModelPerformancePage } from './pages/ModelPerformancePage';
import { TestingValidationPage } from './pages/TestingValidationPage';
import { RequirementsTraceabilityPage } from './pages/RequirementsTraceabilityPage';
import { SystemArchitecturePage } from './pages/SystemArchitecturePage';
import { DocumentationPage } from './pages/DocumentationPage';
import { SettingsAboutPage } from './pages/SettingsAboutPage';

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [activeSection, setActiveSection] = useState<NavSectionId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inspectedRecord, setInspectedRecord] = useState<PredictionRecord | null>(null);
  const [modelConfig, setModelConfig] = useState<OptimizedModelConfig>(DEFAULT_UPLOADED_RF_CONFIG);

  useEffect(() => {
    let active = true;
    void loadOptimizedModelConfig().then((cfg) => {
      if (active) setModelConfig(cfg);
    });
    return () => {
      active = false;
    };
  }, []);

  const {
    history,
    stats,
    predictorMode,
    setPredictorMode,
    predictorInfo,
    trainedModelInfo,
    runPrediction,
    clearHistory,
    toasts,
    addToast,
    dismissToast,
    persona,
    setPersona,
    darkMode,
    toggleDarkMode,
    modelMetrics,
    saveModelMetrics,
    resetModelMetrics,
  } = usePredictionStore(Boolean(authUser));

  const handleAuthenticated = (user: AuthUser) => {
    setAuthUser(user);
    setPersona(user.role);
    setActiveSection('dashboard');
    addToast('success', `Signed in as ${user.name}`, `Role: ${user.role}`);
  };

  const handleLogout = () => {
    void logoutSession();
    setAuthUser(null);
    setInspectedRecord(null);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setAuthUser(null);
      setInspectedRecord(null);
      setMobileMenuOpen(false);
    });
    return () => {
      registerUnauthorizedHandler(null);
    };
  }, []);

  if (!authUser) {
    return (
      <LoginPage
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  const renderPage = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <DashboardPage
            history={history}
            stats={stats}
            modelConfig={modelConfig}
            trainedModelInfo={trainedModelInfo}
            predictorMode={predictorMode}
            onNavigate={setActiveSection}
            onInspectRecord={setInspectedRecord}
          />
        );
      case 'predict':
        return (
          <PredictFailurePage
            onPredict={runPrediction}
            onInspectRecord={setInspectedRecord}
            predictorMode={predictorMode}
            onChangePredictorMode={setPredictorMode}
          />
        );
      case 'history':
        return (
          <PredictionHistoryPage
            history={history}
            onClearHistory={clearHistory}
            onInspectRecord={setInspectedRecord}
            onNavigate={setActiveSection}
            onNotify={addToast}
          />
        );
      case 'analytics':
        return <AnalyticsPage history={history} onNavigate={setActiveSection} />;
      case 'ai-intelligence':
        return (
          <AiIntelligencePage
            history={history}
            stats={stats}
            persona={persona}
            modelConfig={modelConfig}
            trainedModelInfo={trainedModelInfo}
            predictorMode={predictorMode}
            onNavigate={setActiveSection}
            onInspectRecord={setInspectedRecord}
          />
        );
      case 'model-performance':
        return (
          <ModelPerformancePage
            metrics={modelMetrics}
            modelConfig={modelConfig}
            trainedModelInfo={trainedModelInfo}
            predictorMode={predictorMode}
            onChangePredictorMode={setPredictorMode}
            onSaveMetrics={saveModelMetrics}
            onResetMetrics={resetModelMetrics}
          />
        );
      case 'testing':
        return <TestingValidationPage />;
      case 'traceability':
        return <RequirementsTraceabilityPage />;
      case 'architecture':
        return <SystemArchitecturePage />;
      case 'documentation':
        return <DocumentationPage />;
      case 'settings':
        return (
          <SettingsAboutPage
            predictorInfo={predictorInfo}
            predictorMode={predictorMode}
            onChangePredictorMode={setPredictorMode}
            history={history}
            onClearHistory={clearHistory}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
            persona={persona}
            onChangePersona={setPersona}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">
      <Sidebar
        activeSection={activeSection}
        onSelect={(section) => {
          setActiveSection(section);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        historyCount={history.length}
        predictorMode={predictorMode}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeSection={activeSection}
          onOpenMobile={() => setMobileMenuOpen(true)}
          authUser={authUser}
          onLogout={handleLogout}
          persona={persona}
          onChangePersona={setPersona}
          predictorMode={predictorMode}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          recentRecords={history}
          onNavigate={setActiveSection}
        />

        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {renderPage()}
        </main>
      </div>

      <PredictionDetailModal
        record={inspectedRecord}
        onClose={() => setInspectedRecord(null)}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
