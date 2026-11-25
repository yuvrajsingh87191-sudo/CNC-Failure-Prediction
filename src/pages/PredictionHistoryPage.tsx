import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckSquare,
  Cpu,
  Download,
  Eye,
  Loader2,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { NavSectionId, PredictionRecord, ProductTypeCode, RiskLevel } from '../types/domain';
import { ConfirmModal } from '../components/ConfirmModal';
import { EmptyState } from '../components/EmptyState';
import { exportHistoryToCsv, formatTimestamp } from '../utils/formatters';
import { AiHistoryResponse, requestHistoryAiAnalysis } from '../services/aiDiagnosticService';

interface PredictionHistoryPageProps {
  history: PredictionRecord[];
  onClearHistory: () => void;
  onInspectRecord: (record: PredictionRecord) => void;
  onNavigate: (section: NavSectionId) => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, detail?: string) => void;
}

type SortOption = 'newest' | 'oldest' | 'risk-desc' | 'risk-asc';

export const PredictionHistoryPage: React.FC<PredictionHistoryPageProps> = ({
  history,
  onClearHistory,
  onInspectRecord,
  onNavigate,
  onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<'ALL' | 'FAILURE' | 'NO_FAILURE'>('ALL');
  const [levelFilter, setLevelFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ProductTypeCode>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiHistoryResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const hasActiveFilters = Boolean(
    search.trim() || resultFilter !== 'ALL' || levelFilter !== 'ALL' || typeFilter !== 'ALL'
  );

  const activeFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (search.trim()) parts.push(`Search="${search.trim()}"`);
    if (resultFilter !== 'ALL') parts.push(`Result=${resultFilter === 'FAILURE' ? 'Failure' : 'No Failure'}`);
    if (levelFilter !== 'ALL') parts.push(`Level=${levelFilter}`);
    if (typeFilter !== 'ALL') parts.push(`Type=${typeFilter}`);
    return parts.length > 0 ? parts.join(', ') : 'All stored predictions (unfiltered)';
  }, [search, resultFilter, levelFilter, typeFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = history.filter((rec) => {
      if (resultFilter === 'FAILURE' && !rec.prediction.failureExpected) return false;
      if (resultFilter === 'NO_FAILURE' && rec.prediction.failureExpected) return false;
      if (levelFilter !== 'ALL' && rec.prediction.level !== levelFilter) return false;
      if (typeFilter !== 'ALL' && rec.reading.type !== typeFilter) return false;

      if (q) {
        const haystack = [
          rec.id,
          rec.reading.type,
          rec.prediction.failureExpected ? 'failure' : 'no failure',
          rec.prediction.level,
          rec.prediction.advice,
          String(rec.reading.airTempK),
          String(rec.reading.processTempK),
          String(rec.reading.rpm),
          String(rec.reading.torqueNm),
          String(rec.reading.toolWearMin),
          String(Math.round(rec.prediction.riskPercent)),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });

    const sorted = [...list];
    if (sortBy === 'oldest') {
      sorted.reverse();
    } else if (sortBy === 'risk-desc') {
      sorted.sort((a, b) => b.prediction.riskPercent - a.prediction.riskPercent);
    } else if (sortBy === 'risk-asc') {
      sorted.sort((a, b) => a.prediction.riskPercent - b.prediction.riskPercent);
    }
    return sorted;
  }, [history, search, resultFilter, levelFilter, typeFilter, sortBy]);

  const handleExportCsv = () => {
    if (filtered.length === 0) return;
    const summary = exportHistoryToCsv(filtered, { isFiltered: hasActiveFilters });
    onNotify(
      'success',
      `Exported ${summary.rowCount} ${summary.rowCount === 1 ? 'record' : 'records'} to CSV`,
      hasActiveFilters
        ? `Saved filtered subset as ${summary.filename}`
        : `Saved complete history as ${summary.filename}`
    );
  };

  const handleAnalyzeHistory = async () => {
    if (filtered.length === 0) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const data = await requestHistoryAiAnalysis(filtered, activeFilterSummary);
      setAiAnalysis(data);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to analyze prediction history.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Prediction History
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Every valid prediction is stored newest-first (FR-05, FR-06). Export filtered rows to CSV or run AI Shift Analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={filtered.length === 0 || aiLoading}
            onClick={handleAnalyzeHistory}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {aiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Cpu className="h-4 w-4" />
            )}
            <span>
              {aiLoading
                ? 'Analyzing...'
                : hasActiveFilters
                ? `AI Analyze Filtered (${filtered.length})`
                : 'AI Shift Analysis'}
            </span>
          </button>

          <button
            type="button"
            disabled={filtered.length === 0}
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-600 bg-blue-50 dark:bg-blue-950/50 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/80 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            <span>
              {hasActiveFilters
                ? `Export to CSV (${filtered.length} filtered)`
                : `Export to CSV${history.length > 0 ? ` (${history.length})` : ''}`}
            </span>
          </button>

          <button
            type="button"
            disabled={history.length === 0}
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 px-3.5 py-2 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/70 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, readings..."
              aria-label="Search prediction history"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as 'ALL' | 'FAILURE' | 'NO_FAILURE')}
            aria-label="Filter by prediction result"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
          >
            <option value="ALL">Result: All</option>
            <option value="FAILURE">Result: Failure</option>
            <option value="NO_FAILURE">Result: No Failure</option>
          </select>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as 'ALL' | RiskLevel)}
            aria-label="Filter by risk level"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
          >
            <option value="ALL">Risk Level: All</option>
            <option value={RiskLevel.HIGH}>Risk Level: HIGH</option>
            <option value={RiskLevel.MEDIUM}>Risk Level: MEDIUM</option>
            <option value={RiskLevel.LOW}>Risk Level: LOW</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | ProductTypeCode)}
            aria-label="Filter by product type"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
          >
            <option value="ALL">Product Type: All</option>
            <option value="L">Product Type: L</option>
            <option value="M">Product Type: M</option>
            <option value="H">Product Type: H</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Sort prediction history"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="risk-desc">Sort: Highest Risk First</option>
            <option value="risk-asc">Sort: Lowest Risk First</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <span>
              Showing {filtered.length} of {history.length} records
            </span>
            {hasActiveFilters && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-sans text-blue-700 dark:text-blue-400">
                  CSV export &amp; AI analysis apply to these {filtered.length} filtered rows
                </span>
              </>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setResultFilter('ALL');
                setLevelFilter('ALL');
                setTypeFilter('ALL');
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </section>

      {/* AI History Analysis Error */}
      {aiError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/30 p-4 text-xs text-red-700 dark:text-red-300 flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{aiError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAiError(null)}
            aria-label="Dismiss AI error"
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* AI History Analysis Panel */}
      {aiAnalysis && (
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/70 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-start gap-2.5">
              <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  AI Maintenance Shift Analysis
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Analyzed {aiAnalysis.recordCount} {aiAnalysis.recordCount === 1 ? 'record' : 'records'} · Generated{' '}
                  {formatTimestamp(aiAnalysis.generatedAt)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAiAnalysis(null)}
              aria-label="Close AI shift analysis"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
            {aiAnalysis.analysis.shiftSummary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4">
              <div className="font-semibold text-slate-900 dark:text-white mb-2">
                Detected Patterns
              </div>
              <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 list-disc list-inside leading-relaxed">
                {aiAnalysis.analysis.detectedPatterns.map((p, idx) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4">
              <div className="font-semibold text-slate-900 dark:text-white mb-2">
                Priority Maintenance Actions
              </div>
              <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 leading-relaxed">
                {aiAnalysis.analysis.priorityActions.map((act, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            {aiAnalysis.analysis.dataScopeNote}
          </div>
        </section>
      )}

      {/* Table */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {history.length === 0 ? (
          <EmptyState
            title="Prediction History is Empty"
            description="Successful predictions are automatically recorded here with their timestamp, sensor inputs, risk percentage, and maintenance recommendation."
            actionLabel="Run a Prediction"
            onAction={() => onNavigate('predict')}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No Matching Records"
            description="No stored predictions match your current search or filter selection."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                  <th className="py-3 px-4 whitespace-nowrap">Timestamp</th>
                  <th className="py-3 px-3 whitespace-nowrap">Product Type</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Air Temp [K]</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Process Temp [K]</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">RPM</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Torque [Nm]</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Tool Wear [min]</th>
                  <th className="py-3 px-3 whitespace-nowrap">Prediction</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">Risk %</th>
                  <th className="py-3 px-3 whitespace-nowrap">Risk Level</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((rec) => {
                  const levelClass =
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
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
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
                      <td
                        className={`py-3 px-3 whitespace-nowrap font-semibold ${
                          rec.prediction.failureExpected
                            ? 'text-red-700 dark:text-red-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {rec.prediction.failureExpected ? 'FAILURE' : 'NO FAILURE'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                        {rec.prediction.riskPercent.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-3 whitespace-nowrap ${levelClass}`}>
                        {rec.prediction.level}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectRecord(rec);
                          }}
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Details</span>
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

      {/* Clear History Confirmation Modal (FR-08 / Wireframe W5) */}
      <ConfirmModal
        open={confirmOpen}
        title="Confirm Clear History"
        message="Are you sure you want to delete all prediction history? This action permanently removes all stored local prediction records."
        confirmLabel="Delete History"
        cancelLabel="Cancel"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          onClearHistory();
          setAiAnalysis(null);
          setConfirmOpen(false);
        }}
      />
    </div>
  );
};
