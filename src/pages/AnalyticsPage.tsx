import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ReferenceLine,
  Legend,
} from 'recharts';
import { NavSectionId, PredictionRecord, ProductTypeCode, RiskLevel } from '../types/domain';
import { VALIDATION_RANGES } from '../services/InputValidator';
import { EmptyState } from '../components/EmptyState';
import { formatShortTime } from '../utils/formatters';

interface AnalyticsPageProps {
  history: PredictionRecord[];
  onNavigate: (section: NavSectionId) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ history, onNavigate }) => {
  const computed = useMemo(() => {
    if (history.length === 0) return null;

    const low = history.filter((r) => r.prediction.level === RiskLevel.LOW).length;
    const med = history.filter((r) => r.prediction.level === RiskLevel.MEDIUM).length;
    const high = history.filter((r) => r.prediction.level === RiskLevel.HIGH).length;
    const failures = history.filter((r) => r.prediction.failureExpected).length;
    const noFailures = history.length - failures;

    const riskDistribution = [
      { name: 'Low (<30%)', value: low, color: '#16A34A' },
      { name: 'Medium (30–49%)', value: med, color: '#D97706' },
      { name: 'High (≥50%)', value: high, color: '#DC2626' },
    ];

    const resultCounts = [
      { name: 'No Failure', count: noFailures, fill: '#16A34A' },
      { name: 'Failure', count: failures, fill: '#DC2626' },
    ];

    const trend = [...history].reverse().map((r, i) => ({
      seq: `#${i + 1}`,
      time: formatShortTime(r.timestamp),
      risk: Number(r.prediction.riskPercent.toFixed(1)),
    }));

    const types: ProductTypeCode[] = ['L', 'M', 'H'];
    const byType = types.map((t) => {
      const subset = history.filter((r) => r.reading.type === t);
      const failCount = subset.filter((r) => r.prediction.failureExpected).length;
      const safeCount = subset.length - failCount;
      const avgRisk =
        subset.length > 0
          ? Number(
              (subset.reduce((acc, r) => acc + r.prediction.riskPercent, 0) / subset.length).toFixed(1)
            )
          : 0;
      return {
        type: `Type ${t}`,
        Failure: failCount,
        'No Failure': safeCount,
        avgRisk,
        total: subset.length,
      };
    });

    const summarize = (vals: number[]) => ({
      min: Math.min(...vals),
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      max: Math.max(...vals),
    });

    const sensors = [
      {
        name: 'Air Temperature',
        unit: 'K',
        allowed: `${VALIDATION_RANGES.AIR_MIN}–${VALIDATION_RANGES.AIR_MAX}`,
        ...summarize(history.map((r) => r.reading.airTempK)),
        decimals: 1,
      },
      {
        name: 'Process Temperature',
        unit: 'K',
        allowed: `${VALIDATION_RANGES.PROCESS_MIN}–${VALIDATION_RANGES.PROCESS_MAX}`,
        ...summarize(history.map((r) => r.reading.processTempK)),
        decimals: 1,
      },
      {
        name: 'Rotational Speed',
        unit: 'rpm',
        allowed: `${VALIDATION_RANGES.RPM_MIN}–${VALIDATION_RANGES.RPM_MAX}`,
        ...summarize(history.map((r) => r.reading.rpm)),
        decimals: 0,
      },
      {
        name: 'Torque',
        unit: 'Nm',
        allowed: `${VALIDATION_RANGES.TORQUE_MIN}–${VALIDATION_RANGES.TORQUE_MAX}`,
        ...summarize(history.map((r) => r.reading.torqueNm)),
        decimals: 1,
      },
      {
        name: 'Tool Wear',
        unit: 'min',
        allowed: `${VALIDATION_RANGES.WEAR_MIN}–${VALIDATION_RANGES.WEAR_MAX}`,
        ...summarize(history.map((r) => r.reading.toolWearMin)),
        decimals: 0,
      },
    ];

    return { riskDistribution, resultCounts, trend, byType, sensors };
  }, [history]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Predictive Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Real-time charts and sensor statistics derived strictly from stored prediction history.
        </p>
      </div>

      {!computed ? (
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8">
          <EmptyState
            title="No Analytics Data Available Yet"
            description="Charts and sensor summaries are computed directly from your actual stored predictions rather than synthetic placeholder figures. Run one or more predictions to populate Analytics."
            actionLabel="Predict Failure"
            onAction={() => onNavigate('predict')}
          />
        </section>
      ) : (
        <>
          {/* Row 1: Risk Distribution + Prediction Results */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Risk Distribution
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Low (&lt;30%), Medium (30–49%), High (≥50%)
              </p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={computed.riskDistribution.filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {computed.riskDistribution
                        .filter((d) => d.value > 0)
                        .map((entry) => (
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
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Prediction Results
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Binary classification counts: Failure vs No Failure
              </p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={computed.resultCounts} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" strokeOpacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#1E293B',
                        borderRadius: '8px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={72}>
                      {computed.resultCounts.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Row 2: Risk Trend + Product Type Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Risk Trend Over Time
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chronological sequence of evaluated snapshots
              </p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={computed.trend} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
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
                    <ReferenceLine y={50} stroke="#DC2626" strokeDasharray="4 4" />
                    <ReferenceLine y={30} stroke="#D97706" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="risk"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#2563EB' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Product Type Analysis (L / M / H)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comparison of Failure vs No Failure predictions by product quality variant
              </p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={computed.byType} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" strokeOpacity={0.2} />
                    <XAxis dataKey="type" tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#1E293B',
                        borderRadius: '8px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="No Failure" fill="#16A34A" radius={[4, 4, 0, 0]} maxBarSize={44} />
                    <Bar dataKey="Failure" fill="#DC2626" radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Row 3: Sensor Overview Table */}
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Sensor Overview Statistics
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Observed minimum, average, and maximum values across {history.length} stored predictions
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                    <th className="py-3 px-6">Sensor Parameter</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4">SRS Allowed Range</th>
                    <th className="py-3 px-4 text-right">Observed Min</th>
                    <th className="py-3 px-4 text-right">Observed Average</th>
                    <th className="py-3 px-6 text-right">Observed Max</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {computed.sensors.map((s) => (
                    <tr key={s.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-6 font-medium text-slate-900 dark:text-white">{s.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{s.unit}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">{s.allowed}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {s.min.toFixed(s.decimals)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-blue-700 dark:text-blue-400">
                        {s.avg.toFixed(s.decimals === 0 ? 1 : s.decimals)}
                      </td>
                      <td className="py-3 px-6 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {s.max.toFixed(s.decimals)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
