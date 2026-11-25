import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { CheckCircle2, Cpu, FileJson, SlidersHorizontal, RotateCcw } from 'lucide-react';
import {
  ModelMetricsConfig,
  OptimizedModelConfig,
  PredictorMode,
  TrainedModelInfo,
} from '../types/domain';
import { UPLOADED_RF_CONFIG_PATH } from '../services/aiDiagnosticService';
import {
  AI4I_FAILURE_MODES,
  AI4I_SAMPLE_ROWS,
  ML_WORKFLOW_STEPS,
  MODELS_CONSIDERED,
} from '../data/projectData';

interface ModelPerformancePageProps {
  metrics: ModelMetricsConfig;
  modelConfig: OptimizedModelConfig;
  trainedModelInfo: TrainedModelInfo | null;
  predictorMode: PredictorMode;
  onChangePredictorMode: (mode: PredictorMode) => void;
  onSaveMetrics: (next: ModelMetricsConfig) => void;
  onResetMetrics: () => void;
}

export const ModelPerformancePage: React.FC<ModelPerformancePageProps> = ({
  metrics,
  modelConfig,
  trainedModelInfo,
  predictorMode,
  onChangePredictorMode,
  onSaveMetrics,
  onResetMetrics,
}) => {
  const [configOpen, setConfigOpen] = useState(false);
  const [draft, setDraft] = useState({
    selectedModel: metrics.selectedModel ?? 'Random Forest',
    recall: metrics.recall !== null ? String(metrics.recall) : '',
    precision: metrics.precision !== null ? String(metrics.precision) : '',
    f1Score: metrics.f1Score !== null ? String(metrics.f1Score) : '',
    prAuc: metrics.prAuc !== null ? String(metrics.prAuc) : '',
  });
  const [configError, setConfigError] = useState<string | null>(null);

  const parseOptionalMetric = (val: string): number | null | 'invalid' => {
    const t = val.trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0 || n > 1) return 'invalid';
    return Number(n.toFixed(4));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const recall = parseOptionalMetric(draft.recall);
    const precision = parseOptionalMetric(draft.precision);
    const f1Score = parseOptionalMetric(draft.f1Score);
    const prAuc = parseOptionalMetric(draft.prAuc);

    if (recall === 'invalid' || precision === 'invalid' || f1Score === 'invalid' || prAuc === 'invalid') {
      setConfigError('All entered metrics must be decimal values between 0.00 and 1.00 (or left blank).');
      return;
    }

    setConfigError(null);
    onSaveMetrics({
      selectedModel: draft.selectedModel.trim() || null,
      recall,
      precision,
      f1Score,
      prAuc,
      lastUpdated: new Date().toISOString(),
    });
    setConfigOpen(false);
  };

  const heldOut = trainedModelInfo?.evaluation.heldOutTest ?? null;
  const effectiveRecall = metrics.recall ?? heldOut?.recall ?? null;
  const effectivePrecision = metrics.precision ?? heldOut?.precision ?? null;
  const effectiveF1 = metrics.f1Score ?? heldOut?.f1 ?? null;
  const effectivePrAuc = metrics.prAuc ?? heldOut?.prAuc ?? null;
  const effectiveRocAuc = heldOut?.rocAuc ?? null;

  const formatMetric = (v: number | null) => (v !== null ? v.toFixed(3) : 'Awaiting trained model results');

  const metricCards = [
    {
      label: 'Recall (Primary Metric)',
      value: formatMetric(effectiveRecall),
      target: `Project Target: ≥ 0.80 · Held-out @ τ=${modelConfig.optimized_threshold.toFixed(2)}`,
      met: effectiveRecall !== null ? effectiveRecall >= 0.8 : null,
    },
    {
      label: 'Precision',
      value: formatMetric(effectivePrecision),
      target: 'Project Target: ≥ 0.50 · Minimizes false alarms',
      met: effectivePrecision !== null ? effectivePrecision >= 0.5 : null,
    },
    {
      label: 'F1 Score',
      value: formatMetric(effectiveF1),
      target: 'Harmonic mean of Precision & Recall',
      met: null,
    },
    {
      label: 'PR-AUC (Average Precision)',
      value: formatMetric(effectivePrAuc),
      target: 'Preferred over ROC-AUC for 3.39% imbalance',
      met: null,
    },
    {
      label: 'ROC-AUC',
      value: effectiveRocAuc !== null ? effectiveRocAuc.toFixed(3) : '2,000 rows (20%)',
      target: '2,000 held-out test rows · Stratified 80/20 split',
      met: null,
    },
    {
      label: 'Primary Dataset Size',
      value: trainedModelInfo
        ? `${trainedModelInfo.sourceDataset.totalRows.toLocaleString()} rows`
        : '10,000 rows',
      target: trainedModelInfo
        ? `AI4I 2020 · ${trainedModelInfo.sourceDataset.totalFailures} failures (${trainedModelInfo.sourceDataset.failureRatePercent}%) · ${trainedModelInfo.sourceDataset.missingValues} missing`
        : 'AI4I 2020 · 339 failures (3.39%) · 0 missing',
      met: null,
    },
  ];

  const featureChartData = (trainedModelInfo?.featureImportances ?? [])
    .map((fi) => ({
      name: fi.label.replace(/\s*\[.*\]/, ''),
      key: fi.key,
      pct: Math.round(fi.importance * 1000) / 10,
    }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Model Performance & ML Evaluation
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Live trained RandomForestClassifier held-out 20% test metrics, benchmark comparison, and AI4I 2020 analysis (NFR-07).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setConfigOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>{configOpen ? 'Close Metric Override' : 'Override / Sync Metrics'}</span>
        </button>
      </div>

      {/* Pluggable Architecture Status Banner: Trained ML Model vs Rule-Based Prototype */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {trainedModelInfo ? 'Trained & Connected (Live /api/ml/predict)' : 'ML Deliverable · NFR-07'}
                </span>
                {predictorMode === 'ml-model' && (
                  <span className="font-mono text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                    ACTIVE ENGINE
                  </span>
                )}
              </div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white mt-1">
                Trained RandomForestClassifier (150 Trees · τ = {modelConfig.optimized_threshold.toFixed(2)})
              </h2>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Fitted on the stratified 80% AI4I 2020 training split (8,000 rows, seed {modelConfig.hyperparameters.random_state},{' '}
                <code className="font-mono text-[11px]">min_samples_split={modelConfig.hyperparameters.min_samples_split}</code>) with failure-mode columns strictly excluded to prevent data leakage, and evaluated once on the 2,000-row held-out test set.
              </p>
            </div>
            {predictorMode !== 'ml-model' && (
              <div>
                <button
                  type="button"
                  onClick={() => onChangePredictorMode('ml-model')}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Activate Trained Random Forest
                </button>
              </div>
            )}
          </div>

          <div className="md:border-l md:border-slate-200 md:dark:border-slate-800 md:pl-6 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  SE Prototype Stand-In (Preserved for Viva Comparison)
                </span>
                {predictorMode === 'rule-based-prototype' && (
                  <span className="font-mono text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                    ACTIVE ENGINE
                  </span>
                )}
              </div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white mt-1">
                RuleBasedPredictor (AI4I Physical Proximity Rules)
              </h2>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Deterministic physical threshold baseline (OSF, TWF, PWF, HDF) behind the same{' '}
                <code className="font-mono text-[11px]">FailurePredictor</code> architecture seam. Remains available alongside the trained Random Forest so examiners can verify both SE unit tests and ML inference.
              </p>
            </div>
            {predictorMode !== 'rule-based-prototype' && (
              <div>
                <button
                  type="button"
                  onClick={() => onChangePredictorMode('rule-based-prototype')}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Switch to Rule-Based Prototype
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trained Random Forest Configuration & Model Artifact Summary */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <FileJson className="h-4 w-4" />
              <span>Trained Model Artifact & Uploaded Configuration</span>
            </div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white mt-0.5">
              {modelConfig.model_type} · {trainedModelInfo ? `${trainedModelInfo.modelSummary.totalNodes.toLocaleString()} Decision Nodes Across ${trainedModelInfo.modelSummary.totalTrees} Trees` : 'Hyperparameters & Tuned Thresholds'}
            </h2>
          </div>
          <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg px-3 py-1 shrink-0">
            {trainedModelInfo ? 'Trained & Live on /api/ml/predict' : 'Config Loaded'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-slate-500 dark:text-slate-400">n_estimators</div>
            <div className="mt-1 font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {modelConfig.hyperparameters.n_estimators} trees
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-slate-500 dark:text-slate-400">class_weight</div>
            <div className="mt-1 font-mono font-bold text-emerald-700 dark:text-emerald-400">
              {modelConfig.hyperparameters.class_weight ?? 'balanced'}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-slate-500 dark:text-slate-400">criterion / max_feat</div>
            <div className="mt-1 font-mono font-bold text-slate-900 dark:text-white">
              {modelConfig.hyperparameters.criterion ?? 'gini'} / {modelConfig.hyperparameters.max_features ?? 'sqrt'}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-slate-500 dark:text-slate-400">split / leaf / depth</div>
            <div className="mt-1 font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {modelConfig.hyperparameters.min_samples_split} / {modelConfig.hyperparameters.min_samples_leaf ?? 1} /{' '}
              {modelConfig.hyperparameters.max_depth === null ? 'null' : modelConfig.hyperparameters.max_depth}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-slate-500 dark:text-slate-400">Optimal Threshold</div>
            <div className="mt-1 font-mono font-bold text-blue-700 dark:text-blue-400 tabular-nums">
              τ = {modelConfig.optimized_threshold.toFixed(2)} ({Math.round(modelConfig.optimized_threshold * 100)}%)
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Features ({modelConfig.features.length}): </span>
            <span className="font-mono text-[11px]">{modelConfig.features.join(', ')}</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            bootstrap = {String(modelConfig.hyperparameters.bootstrap ?? true)} · seed = {modelConfig.hyperparameters.random_state} · {UPLOADED_RF_CONFIG_PATH.split('/').pop()}
          </span>
        </div>
      </section>

      {/* Optional Metrics Config Override Panel */}
      {configOpen && (
        <section className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Metric Override / Resync
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Metrics auto-populate from the server’s live held-out 20% test evaluation. Use “Sync from Trained Model” to restore measured scores anytime.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onResetMetrics();
                if (heldOut) {
                  setDraft({
                    selectedModel: 'Random Forest',
                    recall: String(heldOut.recall),
                    precision: String(heldOut.precision),
                    f1Score: String(heldOut.f1),
                    prAuc: String(heldOut.prAuc),
                  });
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Sync from Trained Model</span>
            </button>
          </div>

          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Best Model Name
              </label>
              <select
                value={draft.selectedModel}
                onChange={(e) => setDraft((d) => ({ ...d, selectedModel: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
              >
                {MODELS_CONSIDERED.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            {[
              { key: 'recall' as const, label: 'Recall (0–1)' },
              { key: 'precision' as const, label: 'Precision (0–1)' },
              { key: 'f1Score' as const, label: 'F1 Score (0–1)' },
              { key: 'prAuc' as const, label: 'PR-AUC (0–1)' },
            ].map((item) => (
              <div key={item.key}>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {item.label}
                </label>
                <input
                  type="text"
                  value={draft[item.key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [item.key]: e.target.value }))}
                  placeholder="0.000"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono text-xs text-slate-900 dark:text-white"
                />
              </div>
            ))}
            <div className="sm:col-span-2 lg:col-span-5 flex items-center justify-between gap-3 pt-1">
              {configError ? (
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">{configError}</span>
              ) : (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Measured values come directly from evaluating the 150-tree Random Forest on the 2,000-row held-out test set.
                </span>
              )}
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Save Override
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Held-Out Test Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((card) => {
          const isAwaiting = card.value === 'Awaiting trained model results';
          return (
            <div
              key={card.label}
              className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {card.label}
                </span>
                {card.met !== null && (
                  <span
                    className={`text-[11px] font-semibold ${
                      card.met ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {card.met ? 'Target Met' : 'Near Target (Raw 5 Features)'}
                  </span>
                )}
              </div>
              <div
                className={`mt-2 ${
                  isAwaiting
                    ? 'text-sm font-medium text-slate-500 dark:text-slate-400 italic'
                    : 'font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white'
                }`}
              >
                {card.value}
              </div>
              <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{card.target}</div>
            </div>
          );
        })}
      </section>

      {/* Real Held-Out Evaluation Visuals: Confusion Matrix + Gini Feature Importances */}
      {trainedModelInfo && heldOut && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 2x2 Held-Out Confusion Matrix */}
          <section className="lg:col-span-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between space-y-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Held-Out Test Confusion Matrix
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Measured on {trainedModelInfo.sourceDataset.testRows.toLocaleString()} unseen rows ({trainedModelInfo.sourceDataset.testFailures} real failures) at τ = {heldOut.threshold.toFixed(2)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-4">
                <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  True Positive (TP)
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-900 dark:text-emerald-200">
                  {heldOut.confusionMatrix.tp}
                </div>
                <div className="text-[11px] text-emerald-700/90 dark:text-emerald-400 mt-0.5">
                  Failures caught early
                </div>
              </div>

              <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 p-4">
                <div className="text-[11px] font-semibold text-red-800 dark:text-red-300">
                  False Negative (FN)
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-red-900 dark:text-red-200">
                  {heldOut.confusionMatrix.fn}
                </div>
                <div className="text-[11px] text-red-700/90 dark:text-red-400 mt-0.5">
                  Missed failures
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4">
                <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  False Positive (FP)
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-900 dark:text-amber-200">
                  {heldOut.confusionMatrix.fp}
                </div>
                <div className="text-[11px] text-amber-700/90 dark:text-amber-400 mt-0.5">
                  Precautionary inspections
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  True Negative (TN)
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  {heldOut.confusionMatrix.tn.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Healthy runs cleared
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Accuracy is <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{(heldOut.accuracy * 100).toFixed(2)}%</span>. Lowering τ from 0.50 to 0.26 recovered +{heldOut.confusionMatrix.tp - trainedModelInfo.evaluation.atDefaultThreshold.confusionMatrix.tp} additional real failures while holding Precision at {(heldOut.precision * 100).toFixed(1)}%.
            </p>
          </section>

          {/* Gini Feature Importances Bar Chart */}
          <section className="lg:col-span-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Random Forest Feature Importances (Gini Impurity Decrease)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Measured relative split contribution across all {trainedModelInfo.modelSummary.totalTrees} trained trees on the 5 configured sensor inputs
            </p>

            <div className="mt-4 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={featureChartData}
                  layout="vertical"
                  margin={{ top: 6, right: 24, left: 20, bottom: 6 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" strokeOpacity={0.2} horizontal={false} />
                  <XAxis type="number" unit="%" domain={[0, 40]} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis type="category" dataKey="name" width={132} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#1E293B',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [`${value ?? 0}%`, 'Importance']}
                  />
                  <Bar dataKey="pct" radius={[0, 5, 5, 0]} maxBarSize={28}>
                    {featureChartData.map((entry, idx) => (
                      <Cell key={entry.key} fill={idx === 0 ? '#2563EB' : idx === 1 ? '#3B82F6' : '#64748B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      {/* Candidate Model Benchmark Table (Same Stratified 80/20 Split) */}
      {trainedModelInfo && (
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Candidate Model Comparison (Same 2,000-Row Held-Out Test Split)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Demonstrates why Random Forest beats both the trivial majority baseline (96.60% accuracy, 0.000 recall) and linear/single-tree baselines on PR-AUC and Precision–Recall balance.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Model</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-right">Threshold</th>
                  <th className="py-3 px-3 text-right">Recall</th>
                  <th className="py-3 px-3 text-right">Precision</th>
                  <th className="py-3 px-3 text-right">F1 Score</th>
                  <th className="py-3 px-3 text-right">PR-AUC</th>
                  <th className="py-3 px-3 text-right">ROC-AUC</th>
                  <th className="py-3 px-4 text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {trainedModelInfo.evaluation.benchmarks.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.isSelected
                        ? 'bg-blue-50/60 dark:bg-blue-950/30 font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }
                  >
                    <td className="py-3 px-4 text-slate-900 dark:text-white whitespace-nowrap">
                      <span className="font-semibold">{row.name}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {row.role}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {row.threshold.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {row.recall.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                      {row.precision.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900 dark:text-white">
                      {row.f1.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-blue-700 dark:text-blue-400">
                      {row.prAuc.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {row.rocAuc.toFixed(3)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {(row.accuracy * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* AI4I Failure Modes Chart + Dataset Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            AI4I 2020 Documented Failure Modes
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rows per failure mode verified in ai4i2020.csv (modes overlap; total failure rows = 339 / 10,000). Mode flags are excluded from model inputs to prevent leakage.
          </p>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...AI4I_FAILURE_MODES]} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" strokeOpacity={0.2} />
                <XAxis dataKey="code" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`${value ?? 0} rows`, 'Occurrences']}
                />
                <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={48}>
                  {AI4I_FAILURE_MODES.map((m) => (
                    <Cell key={m.code} fill={m.code === 'RNF' ? '#64748B' : '#2563EB'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
            {AI4I_FAILURE_MODES.map((m) => (
              <div key={m.code} className="flex items-start justify-between gap-2">
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 w-10 shrink-0">
                  {m.code}
                </span>
                <span className="text-slate-600 dark:text-slate-400 flex-1">{m.rule}</span>
                <span className="font-mono tabular-nums text-slate-900 dark:text-white shrink-0">
                  {m.count}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Dataset Roles & Models Considered */}
        <div className="lg:col-span-6 space-y-6">
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Datasets & Negative Control
            </h2>
            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Primary: AI4I 2020 Predictive Maintenance Dataset
                  </span>
                  <span className="font-mono text-blue-700 dark:text-blue-400">CC BY 4.0</span>
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                  S. Matzka (2020), UCI ML Repository · 10,000 rows × 14 columns · 339 failures (3.39%) · 0 missing values · Product Types: L = 6,000, M = 2,997, H = 1,003. Used for training (8,000 rows) and held-out testing (2,000 rows).
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Secondary: Machine Failure Classification (Negative Control)
                  </span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">1,000 × 6</span>
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                  300 failures (30%) · Kept strictly separate (never pooled with AI4I). 5-fold CV ROC-AUC checked at 0.47–0.48 (near chance) with every feature correlation &lt; 0.04; retained solely as a negative control sanity check.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Candidate ML Models
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Trained and evaluated on the stratified 80/20 AI4I 2020 split
            </p>
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {MODELS_CONSIDERED.map((model) => (
                <div key={model.name} className="py-2.5 flex items-start gap-3">
                  <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {model.name}{' '}
                      <span className="font-normal text-slate-500 dark:text-slate-400">
                        · {model.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{model.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* 8-Step ML Workflow */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          End-to-End Machine Learning Workflow
        </h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ML_WORKFLOW_STEPS.map((item) => (
            <div
              key={item.step}
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30"
            >
              <div className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                Step 0{item.step}
              </div>
              <div className="font-display text-sm font-semibold text-slate-900 dark:text-white mt-1">
                {item.title}
              </div>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* First Five Documented AI4I Records (Slide 8) */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Sample AI4I 2020 Records (Phase 1 Reference)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              First five rows of ai4i2020.csv used as no-failure verification inputs in TC-16 and TC-17
            </p>
          </div>
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-4">UDI</th>
                <th className="py-2.5 px-3">Product ID</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Air Temp [K]</th>
                <th className="py-2.5 px-3 text-right">Process Temp [K]</th>
                <th className="py-2.5 px-3 text-right">Speed [rpm]</th>
                <th className="py-2.5 px-3 text-right">Torque [Nm]</th>
                <th className="py-2.5 px-3 text-right">Tool Wear [min]</th>
                <th className="py-2.5 px-4 text-right">Machine Failure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
              {AI4I_SAMPLE_ROWS.map((r) => (
                <tr key={r.udi} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{r.udi}</td>
                  <td className="py-2.5 px-3 text-slate-900 dark:text-white">{r.productId}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{r.type}</td>
                  <td className="py-2.5 px-3 text-right">{r.airTemp}</td>
                  <td className="py-2.5 px-3 text-right">{r.processTemp}</td>
                  <td className="py-2.5 px-3 text-right">{r.rpm}</td>
                  <td className="py-2.5 px-3 text-right">{r.torque}</td>
                  <td className="py-2.5 px-3 text-right">{r.toolWear}</td>
                  <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400 font-semibold">
                    {r.failure}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
