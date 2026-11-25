import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { ArrowRight, BrainCircuit, Eye, FileJson } from 'lucide-react';
import {
  NavSectionId,
  OptimizedModelConfig,
  PredictionRecord,
  PredictorMode,
  RiskLevel,
  TrainedModelInfo,
} from '../types/domain';
import { RiskGauge } from '../components/RiskGauge';
import { EmptyState } from '../components/EmptyState';
import { formatShortTime, formatTimestamp } from '../utils/formatters';

interface DashboardPageProps {
  history: PredictionRecord[];
  stats: {
    total: number;
    failures: number;
    noFailures: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    averageRisk: number | null;
    latest: PredictionRecord | null;
  };
  modelConfig: OptimizedModelConfig;
  trainedModelInfo: TrainedModelInfo | null;
  predictorMode: PredictorMode;
  onNavigate: (section: NavSectionId) => void;
  onInspectRecord: (record: PredictionRecord) => void;
}

const RISK_COLORS = {
  LOW: '#16A34A',
  MEDIUM: '#D97706',
  HIGH: '#DC2626',
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  history,
  stats,
  modelConfig,
  trainedModelInfo,
  predictorMode,
  onNavigate,
  onInspectRecord,
}) => {
  const isMl = predictorMode === 'ml-model';
  const lowCut = isMl ? Math.round(modelConfig.risk_thresholds.low_risk_limit * 100) : 30;
  const critCut = isMl ? Math.round(modelConfig.optimized_threshold * 100) : 50;

  const kpis = [
    {
      label: 'Total Predictions',
      value: String(stats.total),
      sub: stats.total === 0 ? 'No snapshots yet' : 'Stored in local session',
    },
    {
      label: 'Failure Predictions',
      value: String(stats.failures),
      sub: stats.total > 0 ? `${Math.round((stats.failures / stats.total) * 100)}% of checks` : `Threshold ≥ ${critCut}% risk`,
      tone: stats.failures > 0 ? 'text-red-700 dark:text-red-400' : undefined,
    },
    {
      label: 'No-Failure Predictions',
      value: String(stats.noFailures),
      sub: stats.total > 0 ? `${Math.round((stats.noFailures / stats.total) * 100)}% of checks` : `Threshold < ${critCut}% risk`,
      tone: stats.noFailures > 0 ? 'text-emerald-700 dark:text-emerald-400' : undefined,
    },
    {
      label: 'Average Risk',
      value: stats.averageRisk !== null ? `${stats.averageRisk.toFixed(1)}%` : '—',
      sub: stats.averageRisk !== null ? 'Across recorded checks' : 'Awaiting first check',
    },
    {
      label: 'High-Risk Cases',
      value: String(stats.highRisk),
      sub: `Risk ≥ ${critCut}% (Inspect)`,
      tone: stats.highRisk > 0 ? 'text-red-700 dark:text-red-400' : undefined,
    },
    {
      label: 'Medium-Risk Cases',
      value: String(stats.mediumRisk),
      sub: `Risk ${lowCut}% to < ${critCut}% (Monitor)`,
      tone: stats.mediumRisk > 0 ? 'text-amber-700 dark:text-amber-400' : undefined,
    },
  ];

  const distributionData = [
    { name: `Low (<${lowCut}%)`, value: stats.lowRisk, color: RISK_COLORS.LOW },
    { name: `Medium (${lowCut}–${critCut - 1}%)`, value: stats.mediumRisk, color: RISK_COLORS.MEDIUM },
    { name: `High (≥${critCut}%)`, value: stats.highRisk, color: RISK_COLORS.HIGH },
  ].filter((d) => d.value > 0);

  const trendData = [...history]
    .slice(0, 15)
    .reverse()
    .map((rec, idx) => ({
      index: `#${idx + 1}`,
      time: formatShortTime(rec.timestamp),
      risk: Number(rec.prediction.riskPercent.toFixed(1)),
      type: rec.reading.type,
    }));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            CNC Machine Failure Prediction
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            AI-powered predictive maintenance and machine risk monitoring
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('ai-intelligence')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <BrainCircuit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>AI Intelligence</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('predict')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Predict Failure</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <section aria-label="Summary metrics" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4"
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {kpi.label}
            </div>
            <div
              className={`mt-2 font-mono text-2xl font-bold tabular-nums ${
                kpi.tone ?? 'text-slate-900 dark:text-white'
              }`}
            >
              {kpi.value}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {kpi.sub}
            </div>
          </div>
        ))}
      </section>

      {/* Main Monitoring Row: Current Machine Risk + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Current Machine Risk Card */}
        <section className="lg:col-span-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Current Machine Risk
              </h2>
              {stats.latest && (
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatShortTime(stats.latest.timestamp)}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Latest evaluated operating snapshot
            </p>
          </div>

          {stats.latest ? (
            <div className="my-5 space-y-4">
              <RiskGauge
                riskPercent={stats.latest.prediction.riskPercent}
                level={stats.latest.prediction.level}
                failureExpected={stats.latest.prediction.failureExpected}
                advice={stats.latest.prediction.advice}
              />
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Type</div>
                  <div className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                    {stats.latest.reading.type}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Torque</div>
                  <div className="font-mono text-xs font-semibold text-slate-900 dark:text-white tabular-nums">
                    {stats.latest.reading.torqueNm} Nm
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Tool Wear</div>
                  <div className="font-mono text-xs font-semibold text-slate-900 dark:text-white tabular-nums">
                    {stats.latest.reading.toolWearMin} min
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onInspectRecord(stats.latest!)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Inspect Latest Snapshot
              </button>
            </div>
          ) : (
            <EmptyState
              title="No Machine Snapshot Evaluated"
              description="Run a prediction with sensor readings or load a demonstration scenario to see live risk classification."
              actionLabel="Go to Predict Failure"
              onAction={() => onNavigate('predict')}
            />
          )}
        </section>

        {/* Right 8 Columns: Distribution + Trend */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Risk Distribution */}
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Risk Distribution
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Breakdown by SRS thresholds (Low / Medium / High)
            </p>

            {stats.total > 0 ? (
              <div className="mt-4 flex-1 flex flex-col justify-between">
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={2}
                      >
                        {distributionData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#1E293B',
                          borderRadius: '8px',
                          color: '#F8FAFC',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <div className="text-emerald-700 dark:text-emerald-400 font-semibold">Low</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {stats.lowRisk}
                    </div>
                  </div>
                  <div>
                    <div className="text-amber-700 dark:text-amber-400 font-semibold">Medium</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {stats.mediumRisk}
                    </div>
                  </div>
                  <div>
                    <div className="text-red-700 dark:text-red-400 font-semibold">High</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {stats.highRisk}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  title="No Distribution Data"
                  description="Risk distribution updates automatically after predictions are saved."
                />
              </div>
            )}
          </section>

          {/* Prediction Trend */}
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Prediction Risk Trend
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Recent risk percentages (50% failure threshold marked)
            </p>

            {trendData.length > 0 ? (
              <div className="mt-4 flex-1 h-56 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" strokeOpacity={0.2} />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} unit="%" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#1E293B',
                        borderRadius: '8px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                      formatter={(val) => [`${val ?? 0}%`, 'Risk']}
                    />
                    <ReferenceLine y={50} stroke="#DC2626" strokeDasharray="4 4" label={{ value: '50% Failure', position: 'insideTopRight', fill: '#DC2626', fontSize: 10 }} />
                    <ReferenceLine y={30} stroke="#D97706" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="risk"
                      stroke="#2563EB"
                      strokeWidth={2}
                      fill="url(#riskFill)"
                      dot={{ r: 3.5, fill: '#2563EB' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  title="No Trend Data Yet"
                  description="Evaluate multiple snapshots to plot risk trends over time."
                />
              </div>
            )}
          </section>
        </div>
      </div>

      {/* AI Predictive Intelligence & Loaded Model Config Summary */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <BrainCircuit className="h-4 w-4" />
              <span>AI Decision Support & Explainability Layer</span>
            </div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Interactive AI Maintenance Advisor & Cost-Sensitive Threshold Analysis
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Query the engineering AI advisor on class imbalance, failure-mode physics, or your latest CNC snapshot; compare the 50% prototype cutoff against your tuned{' '}
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {Math.round(modelConfig.optimized_threshold * 100)}%
              </span>{' '}
              Random Forest policy; or run counterfactual “What-If” risk-reduction guidance.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('ai-intelligence')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors"
              >
                <span>Open AI Intelligence Hub</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('model-performance')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                View ML Configuration
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                <FileJson className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Trained Random Forest Model</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                {trainedModelInfo ? 'Trained & Live API' : 'Loading...'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs pt-1 border-t border-slate-200/80 dark:border-slate-700/70">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Classifier</div>
                <div className="font-mono font-semibold text-slate-900 dark:text-white truncate">
                  {modelConfig.model_type} ({modelConfig.hyperparameters.n_estimators})
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Tuned Threshold</div>
                <div className="font-mono font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
                  τ = {modelConfig.optimized_threshold.toFixed(2)} ({Math.round(modelConfig.optimized_threshold * 100)}%)
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Held-Out Recall / Prec</div>
                <div className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                  {trainedModelInfo
                    ? `${trainedModelInfo.evaluation.heldOutTest.recall.toFixed(3)} / ${trainedModelInfo.evaluation.heldOutTest.precision.toFixed(3)}`
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">PR-AUC / ROC-AUC</div>
                <div className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {trainedModelInfo
                    ? `${trainedModelInfo.evaluation.heldOutTest.prAuc.toFixed(3)} / ${trainedModelInfo.evaluation.heldOutTest.rocAuc.toFixed(3)}`
                    : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Predictions Table */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Recent Predictions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Newest predictions appear first (FR-06)
            </p>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
            >
              View All ({history.length})
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <EmptyState
            title="No Predictions Stored Yet"
            description="Your prediction history is currently empty. Submit valid CNC sensor readings on the Predict Failure screen to record your first assessment."
            actionLabel="Start First Prediction"
            onAction={() => onNavigate('predict')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                  <th className="py-3 px-4 whitespace-nowrap">Time</th>
                  <th className="py-3 px-3 whitespace-nowrap">Type</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Air Temp [K]</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Process Temp [K]</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">RPM</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Torque [Nm]</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Tool Wear [min]</th>
                  <th className="py-3 px-3 whitespace-nowrap">Result</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Risk</th>
                  <th className="py-3 px-3 whitespace-nowrap">Level</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.slice(0, 8).map((rec) => {
                  const levelColor =
                    rec.prediction.level === RiskLevel.HIGH
                      ? 'text-red-700 dark:text-red-400 font-semibold'
                      : rec.prediction.level === RiskLevel.MEDIUM
                      ? 'text-amber-700 dark:text-amber-400 font-semibold'
                      : 'text-emerald-700 dark:text-emerald-400 font-semibold';

                  return (
                    <tr
                      key={rec.id}
                      onClick={() => onInspectRecord(rec)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatTimestamp(rec.timestamp)}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                        {rec.reading.type}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {rec.reading.airTempK}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {rec.reading.processTempK}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {rec.reading.rpm}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {rec.reading.torqueNm}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {rec.reading.toolWearMin}
                      </td>
                      <td className={`py-3 px-3 whitespace-nowrap ${rec.prediction.failureExpected ? 'text-red-700 dark:text-red-400 font-semibold' : 'text-emerald-700 dark:text-emerald-400 font-semibold'}`}>
                        {rec.prediction.failureExpected ? 'FAILURE' : 'NO FAILURE'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                        {Math.round(rec.prediction.riskPercent)}%
                      </td>
                      <td className={`py-3 px-3 whitespace-nowrap ${levelColor}`}>
                        {rec.prediction.level}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectRecord(rec);
                          }}
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
