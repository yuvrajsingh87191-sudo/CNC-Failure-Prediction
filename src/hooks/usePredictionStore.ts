import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  InputForm,
  ModelMetricsConfig,
  PredictionRecord,
  PredictorMode,
  RiskLevel,
  TrainedModelInfo,
  UserPersona,
} from '../types/domain';
import { getDefaultPredictionService } from '../services/PredictionService';
import { fetchTrainedModelInfo } from '../services/mlModelService';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  detail?: string;
}

const METRICS_STORAGE_KEY = 'cnc_ml_model_metrics_config_v1';
const THEME_STORAGE_KEY = 'cnc_dashboard_theme_v1';
const PREDICTOR_MODE_STORAGE_KEY = 'cnc_predictor_mode_v1';

const DEFAULT_METRICS: ModelMetricsConfig = {
  recall: null,
  precision: null,
  f1Score: null,
  prAuc: null,
  selectedModel: null,
  lastUpdated: null,
};

function loadModelMetrics(): ModelMetricsConfig {
  try {
    const raw = window.localStorage.getItem(METRICS_STORAGE_KEY);
    if (!raw) return DEFAULT_METRICS;
    return { ...DEFAULT_METRICS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_METRICS;
  }
}

function loadPredictorMode(): PredictorMode {
  try {
    const raw = window.localStorage.getItem(PREDICTOR_MODE_STORAGE_KEY);
    if (raw === 'rule-based-prototype' || raw === 'ml-model') return raw;
    return 'ml-model';
  } catch {
    return 'ml-model';
  }
}

export function usePredictionStore(isAuthenticated: boolean) {
  const service = useMemo(() => getDefaultPredictionService(), []);
  const [history, setHistory] = useState<PredictionRecord[]>(() => service.history());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [persona, setPersona] = useState<UserPersona>('Maintenance Engineer');
  const [predictorMode, setPredictorModeState] = useState<PredictorMode>(() => loadPredictorMode());
  const [trainedModelInfo, setTrainedModelInfo] = useState<TrainedModelInfo | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });
  const [modelMetrics, setModelMetrics] = useState<ModelMetricsConfig>(() => loadModelMetrics());

  useEffect(() => {
    if (!isAuthenticated) {
      setTrainedModelInfo(null);
      return;
    }
    let active = true;
    void fetchTrainedModelInfo().then((info) => {
      if (!active || !info) return;
      setTrainedModelInfo(info);
      setModelMetrics({
        selectedModel: `${info.config.model_type} (${info.modelSummary.totalTrees} trees · τ=${info.config.optimized_threshold.toFixed(2)})`,
        recall: info.evaluation.heldOutTest.recall,
        precision: info.evaluation.heldOutTest.precision,
        f1Score: info.evaluation.heldOutTest.f1,
        prAuc: info.evaluation.heldOutTest.prAuc,
        lastUpdated: info.trainedAt,
      });
    });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastMessage['type'], title: string, detail?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, type, title, detail }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const setPredictorMode = useCallback(
    (next: PredictorMode) => {
      setPredictorModeState(next);
      try {
        window.localStorage.setItem(PREDICTOR_MODE_STORAGE_KEY, next);
      } catch {
        // ignore
      }
      addToast(
        'info',
        next === 'ml-model'
          ? 'Switched to Trained Random Forest (150 trees)'
          : 'Switched to Rule-Based Prototype Stand-In',
        next === 'ml-model'
          ? 'Live predictions now execute via /api/ml/predict with τ = 0.26.'
          : 'Live predictions now execute locally via RuleBasedPredictor (50% cutoff).'
      );
    },
    [addToast]
  );

  const runPrediction = useCallback(
    async (form: InputForm): Promise<PredictionRecord> => {
      const record = await service.predictWithMode(form, predictorMode);
      setHistory(service.history());
      addToast(
        record.prediction.failureExpected ? 'error' : 'success',
        record.prediction.headline,
        `${record.prediction.predictorKind === 'ml-model' ? 'Random Forest ML' : 'Rule-Based Prototype'} · Risk level: ${record.prediction.level}`
      );
      return record;
    },
    [service, predictorMode, addToast]
  );

  const clearHistory = useCallback(() => {
    service.clearHistory();
    setHistory([]);
    addToast('info', 'Prediction history cleared', 'All stored prediction records have been deleted.');
  }, [service, addToast]);

  const saveModelMetrics = useCallback(
    (next: ModelMetricsConfig) => {
      const updated: ModelMetricsConfig = {
        ...next,
        lastUpdated: new Date().toISOString(),
      };
      setModelMetrics(updated);
      try {
        window.localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      addToast('success', 'Model metrics updated', 'Saved locally to the Model Performance configuration.');
    },
    [addToast]
  );

  const resetModelMetrics = useCallback(() => {
    if (trainedModelInfo) {
      setModelMetrics({
        selectedModel: `${trainedModelInfo.config.model_type} (${trainedModelInfo.modelSummary.totalTrees} trees · τ=${trainedModelInfo.config.optimized_threshold.toFixed(2)})`,
        recall: trainedModelInfo.evaluation.heldOutTest.recall,
        precision: trainedModelInfo.evaluation.heldOutTest.precision,
        f1Score: trainedModelInfo.evaluation.heldOutTest.f1,
        prAuc: trainedModelInfo.evaluation.heldOutTest.prAuc,
        lastUpdated: trainedModelInfo.trainedAt,
      });
      addToast('info', 'Model metrics synced', 'Restored measured held-out test metrics from trained Random Forest.');
      return;
    }
    setModelMetrics(DEFAULT_METRICS);
    try {
      window.localStorage.removeItem(METRICS_STORAGE_KEY);
    } catch {
      // ignore
    }
    addToast('info', 'Model metrics reset', 'Restored default state.');
  }, [addToast, trainedModelInfo]);

  const stats = useMemo(() => {
    const total = history.length;
    const failures = history.filter((r) => r.prediction.failureExpected).length;
    const noFailures = total - failures;
    const highRisk = history.filter((r) => r.prediction.level === RiskLevel.HIGH).length;
    const mediumRisk = history.filter((r) => r.prediction.level === RiskLevel.MEDIUM).length;
    const lowRisk = history.filter((r) => r.prediction.level === RiskLevel.LOW).length;
    const averageRisk =
      total === 0
        ? null
        : history.reduce((sum, r) => sum + r.prediction.riskPercent, 0) / total;

    return {
      total,
      failures,
      noFailures,
      highRisk,
      mediumRisk,
      lowRisk,
      averageRisk,
      latest: history[0] ?? null,
    };
  }, [history]);

  return {
    history,
    stats,
    predictorMode,
    setPredictorMode,
    predictorInfo: service.getPredictorInfo(predictorMode),
    trainedModelInfo,
    runPrediction,
    clearHistory,
    toasts,
    addToast,
    dismissToast,
    persona,
    setPersona,
    darkMode,
    toggleDarkMode: () => setDarkMode((prev) => !prev),
    modelMetrics,
    saveModelMetrics,
    resetModelMetrics,
  };
}
