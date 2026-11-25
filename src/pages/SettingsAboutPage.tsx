import React, { useState } from 'react';
import { Check, Download, Moon, Sun, Trash2 } from 'lucide-react';
import { PredictionRecord, PredictorMode, UserPersona } from '../types/domain';
import { VALIDATION_RANGES } from '../services/InputValidator';
import { RuleBasedPredictor } from '../services/RuleBasedPredictor';
import { ConfirmModal } from '../components/ConfirmModal';
import { exportHistoryToCsv } from '../utils/formatters';

interface SettingsAboutPageProps {
  predictorInfo: {
    name: string;
    kind: PredictorMode;
    description: string;
  };
  predictorMode: PredictorMode;
  onChangePredictorMode: (mode: PredictorMode) => void;
  history: PredictionRecord[];
  onClearHistory: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  persona: UserPersona;
  onChangePersona: (p: UserPersona) => void;
}

const CAPABILITIES_ITEMS = [
  'Predict failure / no failure for one machine operating snapshot using the 150-tree balanced Random Forest model',
  'Compute risk probability (0–100%), risk level (LOW / MEDIUM / HIGH), and actionable maintenance advice',
  'Validate every sensor input on both client and server with simultaneous field-level error messages',
  'Store and review prediction history (newest first) with filter-aware CSV export and clear-history confirmation',
  'Pluggable FailurePredictor interface allowing live switching between Trained Random Forest and Rule-Based Prototype',
  'Interactive AI Engineering Advisor, Counterfactual What-If XAI, 38 documented test cases, and full requirements traceability',
];

export const SettingsAboutPage: React.FC<SettingsAboutPageProps> = ({
  predictorInfo,
  predictorMode,
  onChangePredictorMode,
  history,
  onClearHistory,
  darkMode,
  onToggleDarkMode,
  persona,
  onChangePersona,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings & About Project
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Project summary, exact system scope, active predictor configuration, and local demo controls.
        </p>
      </div>

      {/* Problem / Solution / Inputs / Outputs / Target Users (Section 20) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            About the Project
          </h2>
          <div className="space-y-3 text-xs leading-relaxed">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">Problem</div>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                Unexpected CNC machine failures (worn tools, overheating, power faults, or spindle overload) cause unplanned production downtime, damaged tooling/parts, and costly emergency repairs.
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">Solution</div>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                Evaluate six standard CNC operating readings through a validated layered software pipeline to flag failure risk early with an actionable probability, risk band, and inspection recommendation.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white mb-1">Inputs (6 Readings)</div>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside">
                  <li>Product Type (L / M / H)</li>
                  <li>Air Temperature [K]</li>
                  <li>Process Temperature [K]</li>
                  <li>Rotational Speed [rpm]</li>
                  <li>Torque [Nm]</li>
                  <li>Tool Wear [min]</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white mb-1">Outputs & Target Users</div>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside">
                  <li>Failure / No Failure verdict</li>
                  <li>Risk Percentage (0–100%)</li>
                  <li>Risk Level (LOW / MEDIUM / HIGH)</li>
                  <li>Short maintenance advice</li>
                </ul>
                <div className="mt-2.5 text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">Users:</span> Maintenance Engineer, Production Supervisor
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Active Predictor & Validation Constants */}
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Active Engine & Documented Thresholds
          </h2>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 text-xs space-y-3">
            <div>
              <div className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                {predictorInfo.name}
              </div>
              <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                {predictorInfo.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/70">
              <button
                type="button"
                onClick={() => onChangePredictorMode('ml-model')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  predictorMode === 'ml-model'
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Trained Random Forest (τ=0.26)
              </button>
              <button
                type="button"
                onClick={() => onChangePredictorMode('rule-based-prototype')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  predictorMode === 'rule-based-prototype'
                    ? 'bg-slate-900 dark:bg-slate-700 text-white'
                    : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Rule-Based Prototype (50%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <div className="font-semibold text-slate-900 dark:text-white mb-1.5">InputValidator Constants</div>
              <ul className="space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                <li>AIR: {VALIDATION_RANGES.AIR_MIN}–{VALIDATION_RANGES.AIR_MAX} K</li>
                <li>PROCESS: {VALIDATION_RANGES.PROCESS_MIN}–{VALIDATION_RANGES.PROCESS_MAX} K</li>
                <li>RPM: {VALIDATION_RANGES.RPM_MIN}–{VALIDATION_RANGES.RPM_MAX} (int)</li>
                <li>TORQUE: {VALIDATION_RANGES.TORQUE_MIN}–{VALIDATION_RANGES.TORQUE_MAX} Nm</li>
                <li>WEAR: {VALIDATION_RANGES.WEAR_MIN}–{VALIDATION_RANGES.WEAR_MAX} min (int)</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
              <div className="font-semibold text-slate-900 dark:text-white mb-1.5">RuleBasedPredictor Limits</div>
              <ul className="space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                <li>FAILURE_THRESHOLD: {RuleBasedPredictor.FAILURE_THRESHOLD * 100}%</li>
                <li>TOOL_WEAR: ≥ {RuleBasedPredictor.TOOL_WEAR_LIMIT_MIN} min</li>
                <li>HEAT_GAP: &lt; {RuleBasedPredictor.HEAT_DIFF_LIMIT_K} K</li>
                <li>HEAT_RPM: &lt; {RuleBasedPredictor.HEAT_RPM_LIMIT} rpm</li>
                <li>POWER: {RuleBasedPredictor.POWER_LOW_W}–{RuleBasedPredictor.POWER_HIGH_W} W</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Platform Capabilities */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-4">
          Implemented System Capabilities
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {CAPABILITIES_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Demo Display & Local Data Controls */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white mb-4">
          Demo Preferences & Local Storage Controls
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">Interface Theme</div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Toggle between high-clarity light canvas and dark control-room theme.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">Active Operator Role</div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Switch between Maintenance Engineer and Production Supervisor operational views.
              </p>
            </div>
            <select
              value={persona}
              onChange={(e) => onChangePersona(e.target.value as UserPersona)}
              aria-label="Select active operator role"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              <option value="Maintenance Engineer">Maintenance Engineer</option>
              <option value="Production Supervisor">Production Supervisor</option>
            </select>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">
                Local Prediction History ({history.length})
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Export session predictions to CSV or wipe local browser storage.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={history.length === 0}
                onClick={() => exportHistoryToCsv(history)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                disabled={history.length === 0}
                onClick={() => setConfirmOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 px-3 py-2 font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/70 disabled:opacity-40 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <ConfirmModal
        open={confirmOpen}
        title="Confirm Clear History"
        message="Are you sure you want to delete all prediction history?"
        confirmLabel="Delete History"
        cancelLabel="Cancel"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          onClearHistory();
          setConfirmOpen(false);
        }}
      />
    </div>
  );
};
