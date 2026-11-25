import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  FlaskConical,
  HelpCircle,
  Play,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { FieldName, InputForm, PredictionRecord, PredictorMode, RiskLevel } from '../types/domain';
import { InvalidInputException } from '../models/InvalidInputException';
import { PRODUCT_TYPE_LIST } from '../models/ProductType';
import { VALIDATION_RANGES } from '../services/InputValidator';
import { DEMO_SCENARIOS, DemoScenario } from '../data/projectData';
import { RiskGauge } from '../components/RiskGauge';
import { AiDiagnosisPanel } from '../components/AiDiagnosisPanel';
import { formatTimestamp } from '../utils/formatters';

interface PredictFailurePageProps {
  onPredict: (form: InputForm) => Promise<PredictionRecord>;
  onInspectRecord: (record: PredictionRecord) => void;
  predictorMode: PredictorMode;
  onChangePredictorMode: (mode: PredictorMode) => void;
}

const INITIAL_FORM: InputForm = {
  type: 'L',
  airTemp: '',
  processTemp: '',
  rpm: '',
  torque: '',
  toolWear: '',
};

interface FieldMeta {
  key: keyof InputForm;
  errorKey: FieldName;
  label: string;
  unit: string;
  placeholder: string;
  rangeText: string;
  tooltip: string;
  inputMode: 'decimal' | 'numeric';
}

const NUMERIC_FIELDS: readonly FieldMeta[] = [
  {
    key: 'airTemp',
    errorKey: 'Air temperature',
    label: 'Air Temperature',
    unit: 'K',
    placeholder: 'e.g. 298.1',
    rangeText: `${VALIDATION_RANGES.AIR_MIN}–${VALIDATION_RANGES.AIR_MAX} K (decimal)`,
    tooltip: 'Ambient shop-floor air temperature in Kelvin. Must be between 290 and 310 K.',
    inputMode: 'decimal',
  },
  {
    key: 'processTemp',
    errorKey: 'Process temperature',
    label: 'Process Temperature',
    unit: 'K',
    placeholder: 'e.g. 308.6',
    rangeText: `${VALIDATION_RANGES.PROCESS_MIN}–${VALIDATION_RANGES.PROCESS_MAX} K (> Air Temp)`,
    tooltip: 'Cutting/process temperature in Kelvin. Must be between 300 and 320 K and strictly higher than Air Temperature.',
    inputMode: 'decimal',
  },
  {
    key: 'rpm',
    errorKey: 'Rotational speed',
    label: 'Rotational Speed',
    unit: 'rpm',
    placeholder: 'e.g. 1551',
    rangeText: `${VALIDATION_RANGES.RPM_MIN}–${VALIDATION_RANGES.RPM_MAX} rpm (whole number)`,
    tooltip: 'Spindle rotational speed in revolutions per minute. Whole integer only (no decimals).',
    inputMode: 'numeric',
  },
  {
    key: 'torque',
    errorKey: 'Torque',
    label: 'Torque',
    unit: 'Nm',
    placeholder: 'e.g. 42.8',
    rangeText: `${VALIDATION_RANGES.TORQUE_MIN}–${VALIDATION_RANGES.TORQUE_MAX} Nm (decimal)`,
    tooltip: 'Spindle torque in Newton-meters. Combined with RPM for power and with tool wear for overstrain.',
    inputMode: 'decimal',
  },
  {
    key: 'toolWear',
    errorKey: 'Tool wear',
    label: 'Tool Wear',
    unit: 'min',
    placeholder: 'e.g. 0',
    rangeText: `${VALIDATION_RANGES.WEAR_MIN}–${VALIDATION_RANGES.WEAR_MAX} min (whole number)`,
    tooltip: 'Cumulative cutting tool wear time in minutes. Whole integer only (0 to 300 min).',
    inputMode: 'numeric',
  },
];

export const PredictFailurePage: React.FC<PredictFailurePageProps> = ({
  onPredict,
  onInspectRecord,
  predictorMode,
  onChangePredictorMode,
}) => {
  const [form, setForm] = useState<InputForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [resultRecord, setResultRecord] = useState<PredictionRecord | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [activeScenarioNote, setActiveScenarioNote] = useState<DemoScenario | null>(null);

  const handleFieldChange = (key: keyof InputForm, errorKey: FieldName, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setActiveScenarioNote(null);
    if (errors[errorKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPredicting(true);

    try {
      const record = await onPredict(form);
      setErrors({});
      setResultRecord(record);
    } catch (err) {
      if (err instanceof InvalidInputException) {
        // Matching Wireframe W3 & TC-36: show all errors at once, clear any previous result
        setErrors(err.fieldErrors);
        setResultRecord(null);
      } else {
        setErrors({
          Type: err instanceof Error ? err.message : 'Unexpected prediction error. Please verify all inputs.',
        });
        setResultRecord(null);
      }
    } finally {
      setIsPredicting(false);
    }
  };

  const handleClear = () => {
    // Matching FR-07 & TC-37: empty all five fields, reset Type to first option ('L'), clear errors and result
    setForm(INITIAL_FORM);
    setErrors({});
    setResultRecord(null);
    setActiveScenarioNote(null);
  };

  const handleLoadScenario = (scenario: DemoScenario) => {
    setForm({ ...scenario.form });
    setErrors({});
    setResultRecord(null);
    setActiveScenarioNote(scenario);
  };

  const errorList = Object.entries(errors) as [FieldName, string][];
  const hasErrors = errorList.length > 0;

  return (
    <div className="space-y-6">
      {/* Page Title + Pluggable Predictor Engine Selector */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Predict Machine Failure
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Enter a single CNC operating snapshot to validate readings, run prediction inference, and log the assessment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Cpu className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Engine:</span>
          </span>
          <button
            type="button"
            onClick={() => onChangePredictorMode('ml-model')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              predictorMode === 'ml-model'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Trained Random Forest (τ=0.26)
          </button>
          <button
            type="button"
            onClick={() => onChangePredictorMode('rule-based-prototype')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              predictorMode === 'rule-based-prototype'
                ? 'bg-slate-900 dark:bg-slate-700 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Rule-Based Prototype (50%)
          </button>
        </div>
      </div>

      {/* Demo Mode Toolbar (Section 21) */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <FlaskConical className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                Demo Mode — Predefined Viva Scenarios
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clearly labeled sample inputs from the SE Report & AI4I 2020 dataset for live presentation testing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {DEMO_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => handleLoadScenario(sc)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeScenarioNote?.id === sc.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {sc.buttonLabel}
              </button>
            ))}
          </div>
        </div>

        {activeScenarioNote && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="text-slate-700 dark:text-slate-300">
              <span className="font-semibold">Loaded scenario:</span> {activeScenarioNote.title} —{' '}
              {activeScenarioNote.description}
            </div>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              {activeScenarioNote.sourceReference}
            </span>
          </div>
        )}
      </section>

      {/* Main Split: Form (7 cols) + Live Result Panel (5 cols) on same screen (NFR-02) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Input Form */}
        <section className="xl:col-span-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Enter Machine Readings (FR-01)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                All six fields are required. Press Enter or click Predict Failure to evaluate.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
              SRS §2.7
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Product Type Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="field-type"
                    className="text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    Product Type
                  </label>
                  <span
                    className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1"
                    title="Product quality variant determines overstrain limit: L = 11,000, M = 12,000, H = 13,000 min·Nm"
                  >
                    <span>L / M / H</span>
                    <HelpCircle className="h-3.5 w-3.5" />
                  </span>
                </div>
                <select
                  id="field-type"
                  value={form.type}
                  onChange={(e) => handleFieldChange('type', 'Type', e.target.value)}
                  aria-invalid={Boolean(errors['Type'])}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                    errors['Type']
                      ? 'border-red-500 focus:ring-red-500/30'
                      : 'border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-blue-600/20'
                  }`}
                >
                  {PRODUCT_TYPE_LIST.map((pt) => (
                    <option key={pt.code} value={pt.code}>
                      {pt.code} — {pt.label} (Limit {pt.overstrainLimit.toLocaleString()} min·Nm)
                    </option>
                  ))}
                </select>
                {errors['Type'] ? (
                  <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors['Type']}</span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Required · Quality variant of machined part
                  </p>
                )}
              </div>

              {/* Five Numeric Sensor Fields */}
              {NUMERIC_FIELDS.map((field) => {
                const fieldError = errors[field.errorKey];
                return (
                  <div key={field.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor={`field-${field.key}`}
                        className="text-sm font-medium text-slate-800 dark:text-slate-200"
                      >
                        {field.label}{' '}
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          [{field.unit}]
                        </span>
                      </label>
                      <span
                        title={field.tooltip}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        id={`field-${field.key}`}
                        type="text"
                        inputMode={field.inputMode}
                        value={form[field.key]}
                        onChange={(e) => handleFieldChange(field.key, field.errorKey, e.target.value)}
                        placeholder={field.placeholder}
                        aria-invalid={Boolean(fieldError)}
                        aria-describedby={`hint-${field.key}`}
                        autoComplete="off"
                        className={`w-full rounded-lg border px-3.5 py-2.5 pr-14 font-mono text-sm tabular-nums bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-colors ${
                          fieldError
                            ? 'border-red-500 bg-red-50/40 dark:bg-red-950/20 focus:ring-red-500/30'
                            : 'border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:ring-blue-600/20'
                        }`}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400 dark:text-slate-500">
                        {field.unit}
                      </span>
                    </div>

                    {fieldError ? (
                      <p
                        id={`hint-${field.key}`}
                        role="alert"
                        className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400 flex items-start gap-1"
                      >
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{fieldError}</span>
                      </p>
                    ) : (
                      <p
                        id={`hint-${field.key}`}
                        className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono"
                      >
                        {field.rangeText}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Combined Validation Error Box (Wireframe W3 / FR-02) */}
            {hasErrors && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/30 p-4"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Validation Failed ({errorList.length} {errorList.length === 1 ? 'issue' : 'issues'}) — Prediction Blocked
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-red-700 dark:text-red-300 list-disc list-inside">
                  {errorList.map(([field, msg]) => (
                    <li key={field}>{msg}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-red-600/90 dark:text-red-400/90">
                  No prediction was computed and nothing was added to prediction history (FR-02, FR-05).
                </p>
              </div>
            )}

            {/* Primary Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="submit"
                disabled={isPredicting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold tracking-wide text-white hover:bg-blue-700 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{isPredicting ? 'EVALUATING SNAPSHOT...' : 'PREDICT FAILURE'}</span>
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span>CLEAR</span>
              </button>
            </div>
          </form>
        </section>

        {/* Right: Prediction Result Card (FR-03, FR-04, NFR-02) */}
        <section className="xl:col-span-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Machine Status
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Binary verdict, risk probability & maintenance guidance
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
              FR-03 · FR-04
            </span>
          </div>

          {isPredicting ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {predictorMode === 'ml-model'
                  ? 'Running InputValidator & 150-Tree RandomForestClassifier (/api/ml/predict)...'
                  : 'Running InputValidator & RuleBasedPredictor...'}
              </div>
            </div>
          ) : resultRecord ? (
            <div className="pt-5 space-y-5">
              {/* Headline Verdict Banner */}
              <div
                className={`rounded-xl border p-4 text-center ${
                  resultRecord.prediction.level === RiskLevel.HIGH
                    ? 'bg-red-600 border-red-700 text-white'
                    : resultRecord.prediction.level === RiskLevel.MEDIUM
                    ? 'bg-amber-600 border-amber-700 text-white'
                    : 'bg-emerald-600 border-emerald-700 text-white'
                }`}
              >
                <div className="text-xs font-medium opacity-90 tracking-wide">
                  MACHINE STATUS
                </div>
                <div className="mt-1 flex items-center justify-center gap-2 font-display text-2xl font-bold tracking-tight">
                  {resultRecord.prediction.failureExpected ? (
                    <ShieldAlert className="h-6 w-6 shrink-0" />
                  ) : resultRecord.prediction.level === RiskLevel.MEDIUM ? (
                    <AlertTriangle className="h-6 w-6 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 shrink-0" />
                  )}
                  <span>{resultRecord.prediction.failureExpected ? 'FAILURE RISK' : 'NO FAILURE'}</span>
                </div>
                <div className="mt-1 text-xs font-mono opacity-90 tabular-nums">
                  {formatTimestamp(resultRecord.timestamp)} · Saved to History
                </div>
              </div>

              {/* Risk Gauge & Advice */}
              <RiskGauge
                riskPercent={resultRecord.prediction.riskPercent}
                level={resultRecord.prediction.level}
                failureExpected={resultRecord.prediction.failureExpected}
                advice={resultRecord.prediction.advice}
              />

              {/* Live ML Ensemble Vote Breakdown when Random Forest was used */}
              {resultRecord.prediction.mlDetails && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-3.5 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-blue-900 dark:text-blue-200">
                      {resultRecord.prediction.mlDetails.modelType} Ensemble Output
                    </span>
                    <span className="font-mono text-[11px] text-blue-700 dark:text-blue-300 tabular-nums">
                      {resultRecord.prediction.mlDetails.latencyMs} ms · /api/ml/predict
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono tabular-nums text-[11px]">
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 font-sans">Tree Votes</div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {resultRecord.prediction.mlDetails.treeVotesPositive} / {resultRecord.prediction.mlDetails.totalTrees}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 font-sans">P(Failure)</div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {resultRecord.prediction.mlDetails.probability.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 font-sans">Tuned Cutoff</div>
                      <div className="font-semibold text-blue-700 dark:text-blue-300">
                        τ ≥ {Math.round(resultRecord.prediction.mlDetails.thresholdUsed * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Input Summary */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Evaluated Input Summary
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {resultRecord.id}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Type</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-white">
                      {resultRecord.reading.type}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Air / Proc</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {resultRecord.reading.airTempK} / {resultRecord.reading.processTempK} K
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Speed</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {resultRecord.reading.rpm} rpm
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Torque</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {resultRecord.reading.torqueNm} Nm
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Tool Wear</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {resultRecord.reading.toolWearMin} min
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Power</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {resultRecord.prediction.derivedMetrics.powerWatts.toLocaleString()} W
                    </div>
                  </div>
                </div>
              </div>

              {/* Compact Factor Proximity Summary */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Physical Factor Context (AI4I 2020 Rules)
                  </span>
                  <button
                    type="button"
                    onClick={() => onInspectRecord(resultRecord)}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Full Viva Trace
                  </button>
                </div>
                {resultRecord.prediction.factors.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-slate-600 dark:text-slate-400">
                      {f.label} ({f.datasetCode})
                    </span>
                    <span
                      className={`font-mono tabular-nums ${
                        f.breached
                          ? 'text-red-700 dark:text-red-400 font-semibold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      p = {f.proximity.toFixed(2)} · {f.riskContributionPercent.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>

              {/* AI Maintenance Diagnosis */}
              <AiDiagnosisPanel record={resultRecord} />
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                <Play className="h-5 w-5" />
              </div>
              <div className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Awaiting Sensor Readings
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                Fill in the six CNC operating values on the left (or select a Demo Mode scenario above) and press <span className="font-semibold text-slate-700 dark:text-slate-300">PREDICT FAILURE</span>.
              </p>
              {predictorMode === 'ml-model' ? (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <div>LOW RISK: below 15% · No action needed</div>
                  <div>MEDIUM RISK: 15% to below 26% · Keep monitoring</div>
                  <div>HIGH RISK: 26% or more · FAILURE reported (τ = 0.26)</div>
                </div>
              ) : (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <div>LOW RISK: below 30% · No action needed</div>
                  <div>MEDIUM RISK: 30% to below 50% · Keep monitoring</div>
                  <div>HIGH RISK: 50% or more · FAILURE reported</div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
