import React, { useEffect } from 'react';
import { X, ArrowDown, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { PredictionRecord, RiskLevel } from '../types/domain';
import { AiDiagnosisPanel } from './AiDiagnosisPanel';
import { formatTimestamp } from '../utils/formatters';

interface PredictionDetailModalProps {
  record: PredictionRecord | null;
  onClose: () => void;
}

export const PredictionDetailModal: React.FC<PredictionDetailModalProps> = ({ record, onClose }) => {
  useEffect(() => {
    if (!record) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [record, onClose]);

  if (!record) return null;

  const { reading, prediction } = record;
  const isHigh = prediction.level === RiskLevel.HIGH;
  const isMed = prediction.level === RiskLevel.MEDIUM;

  const bannerClasses = isHigh
    ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-300'
    : isMed
    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/70 text-amber-800 dark:text-amber-300'
    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/70 text-emerald-800 dark:text-emerald-300';

  const isMl = prediction.predictorKind === 'ml-model' && Boolean(prediction.mlDetails);
  const activeThresholdPct = isMl && prediction.mlDetails
    ? Math.round(prediction.mlDetails.thresholdUsed * 100)
    : 50;

  const pipelineSteps = [
    {
      title: 'Sensor Inputs',
      detail: `Type ${reading.type} · Air ${reading.airTempK} K · Process ${reading.processTempK} K · ${reading.rpm} rpm · ${reading.torqueNm} Nm · Wear ${reading.toolWearMin} min`,
    },
    {
      title: 'Validation (InputValidator)',
      detail: 'All 6 fields required, finite numeric/whole checks passed, SRS Section 2.7 ranges verified, Process Temp > Air Temp confirmed.',
    },
    {
      title: `Prediction Model (${prediction.predictorName})`,
      detail: isMl && prediction.mlDetails
        ? `Executed live server-side inference across ${prediction.mlDetails.totalTrees} trained CART trees (/api/ml/predict in ${prediction.mlDetails.latencyMs} ms). ${prediction.mlDetails.treeVotesPositive} of ${prediction.mlDetails.totalTrees} trees voted failure; mean ensemble probability = ${(prediction.mlDetails.probability * 100).toFixed(1)}%.`
        : `Evaluated proximity to documented AI4I physical rules: ΔT = ${prediction.derivedMetrics.temperatureGapK} K, Power = ${prediction.derivedMetrics.powerWatts.toLocaleString()} W, Wear×Torque = ${prediction.derivedMetrics.overstrainProduct.toLocaleString()} min·Nm.`,
    },
    {
      title: 'Risk Calculation',
      detail: isMl && prediction.mlDetails
        ? `Ensemble probability ${prediction.riskPercent.toFixed(1)}% evaluated against calibrated bands (Low < ${Math.round(prediction.mlDetails.lowRiskLimit * 100)}%, Monitor ${Math.round(prediction.mlDetails.lowRiskLimit * 100)}–${activeThresholdPct - 1}%, Critical ≥ ${activeThresholdPct}%) → ${prediction.level} RISK.`
        : `Worst-case factor score mapped to ${prediction.riskPercent.toFixed(1)}% (rounded ${Math.round(prediction.riskPercent)}%) → ${prediction.level} RISK.`,
    },
    {
      title: prediction.failureExpected
        ? `Verdict: FAILURE (>= ${activeThresholdPct}% threshold)`
        : `Verdict: NO FAILURE (< ${activeThresholdPct}% threshold)`,
      detail: prediction.advice,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prediction-detail-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="prediction-detail-title" className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Prediction Record Details
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
              {record.id} · {formatTimestamp(record.timestamp)} · {prediction.predictorName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details modal"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Verdict Summary */}
          <div className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${bannerClasses}`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-display font-bold text-lg">
                {isHigh ? (
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                ) : isMed ? (
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                )}
                <span>{prediction.failureExpected ? 'FAILURE' : 'NO FAILURE'}</span>
                <span aria-hidden="true">·</span>
                <span>{prediction.level} RISK</span>
              </div>
              <p className="text-sm font-medium">{prediction.advice}</p>
              {isMl && prediction.mlDetails && (
                <div className="text-xs font-mono opacity-90 pt-1 tabular-nums">
                  Ensemble Vote: {prediction.mlDetails.treeVotesPositive}/{prediction.mlDetails.totalTrees} trees · Tuned Cutoff τ = {prediction.mlDetails.thresholdUsed.toFixed(2)} · Inference {prediction.mlDetails.latencyMs} ms
                </div>
              )}
            </div>
            <div className="text-left sm:text-right shrink-0">
              <div className="font-mono text-3xl font-bold tabular-nums">
                {Math.round(prediction.riskPercent)}%
              </div>
              <div className="text-xs font-mono opacity-80 tabular-nums">
                Exact: {prediction.riskPercent.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Sensor Readings Grid */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Recorded Sensor Snapshot
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Product Type', value: reading.type, sub: `Limit ${prediction.derivedMetrics.overstrainLimit.toLocaleString()} min·Nm` },
                { label: 'Air Temperature', value: `${reading.airTempK} K`, sub: 'Range: 290–310 K' },
                { label: 'Process Temperature', value: `${reading.processTempK} K`, sub: `ΔT: ${prediction.derivedMetrics.temperatureGapK} K` },
                { label: 'Rotational Speed', value: `${reading.rpm} rpm`, sub: 'Range: 500–4000 rpm' },
                { label: 'Torque', value: `${reading.torqueNm} Nm`, sub: `Power: ${prediction.derivedMetrics.powerWatts.toLocaleString()} W` },
                { label: 'Tool Wear', value: `${reading.toolWearMin} min`, sub: 'Range: 0–300 min' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3.5 py-2.5"
                >
                  <div className="text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
                  <div className="font-mono text-base font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                    {item.value}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {item.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Factor Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Rule Proximity Breakdown (Report §3.5)
            </h3>
            <div className="space-y-2.5">
              {prediction.factors.map((f) => (
                <div
                  key={f.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-3.5 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {f.label}{' '}
                      <span className="text-slate-500 dark:text-slate-400 font-mono">({f.datasetCode})</span>
                    </div>
                    <div className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      p = {f.proximity.toFixed(3)} · Score: {f.riskContributionPercent.toFixed(1)}%{' '}
                      {f.breached ? '· BREACHED' : ''}
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        f.breached
                          ? 'bg-red-600'
                          : f.riskContributionPercent >= 30
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(2, f.riskContributionPercent))}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {f.summary}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Maintenance Diagnosis */}
          <AiDiagnosisPanel record={record} />

          {/* Visual Viva Pipeline Explanation */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Execution Pipeline Trace (Viva Walkthrough)
            </h3>
            <div className="flex flex-col items-stretch">
              {pipelineSteps.map((step, idx) => (
                <React.Fragment key={step.title}>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-2.5">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {idx + 1}. {step.title}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {step.detail}
                    </div>
                  </div>
                  {idx < pipelineSteps.length - 1 && (
                    <div className="flex justify-center py-1 text-slate-400 dark:text-slate-500">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end px-6 py-3.5 bg-slate-50 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 dark:bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
