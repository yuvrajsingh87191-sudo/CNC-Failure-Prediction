import React, { useState } from 'react';
import { ArrowDown, Database, Layers, Plug, ShieldCheck } from 'lucide-react';
import { DESIGN_DECISIONS, SQL_SCHEMA } from '../data/projectData';

type ArchTab = 'layers' | 'data-model' | 'decisions';

interface LayerSpec {
  id: string;
  title: string;
  subtitle: string;
  components: string[];
  javaClasses: string;
  responsibility: string;
  requirements: string;
}

const ARCH_LAYERS: readonly LayerSpec[] = [
  {
    id: 'presentation',
    title: 'Presentation Layer',
    subtitle: 'Collects sensor inputs and renders results, validation errors, history & analytics',
    components: ['Dashboard', 'Prediction Form', 'Result View', 'History View', 'Analytics'],
    javaClasses: 'CncPredictorApp (Swing window), ConsoleApp (text front end)',
    responsibility: 'Never implements business rules or scoring directly; communicates exclusively with PredictionService.',
    requirements: 'FR-01, FR-04, FR-06, FR-07, NFR-02',
  },
  {
    id: 'logic',
    title: 'Business / Logic Layer (Service Layer)',
    subtitle: 'Validates inputs, orchestrates prediction, computes risk & stores records',
    components: ['InputValidator', 'PredictionService', 'FailurePredictor (Interface)', 'RuleBasedPredictor / Risk Calculator'],
    javaClasses: 'PredictionService, InputValidator, FailurePredictor, RuleBasedPredictor',
    responsibility: 'Enforces all SRS ranges and constraints, invokes the pluggable predictor seam, and guarantees invalid inputs are never stored.',
    requirements: 'FR-02, FR-03, FR-04, FR-05, NFR-01, NFR-03, NFR-04',
  },
  {
    id: 'data',
    title: 'Data Layer (Model & Repository)',
    subtitle: 'Immutable domain records and history storage abstraction',
    components: ['PredictionRepository', 'Prediction History Store', 'SensorReading / Prediction / PredictionRecord'],
    javaClasses: 'PredictionRepository (in-memory in Java; localStorage in web demo), SensorReading, InputForm, Prediction, PredictionRecord, ProductType, RiskLevel',
    responsibility: 'Stores successful predictions and returns newest-first defensive copies; designed to swap in JDBC/SQLite/PostgreSQL without touching UI or service layers.',
    requirements: 'FR-05, FR-06, FR-08, NFR-04',
  },
];

const DATA_ENTITIES = [
  {
    name: 'InputForm',
    stereotype: 'record (raw text)',
    purpose: 'Captures raw untrusted user text exactly as entered before validation.',
    fields: ['type: String', 'airTemp: String', 'processTemp: String', 'rpm: String', 'torque: String', 'toolWear: String'],
  },
  {
    name: 'SensorReading',
    stereotype: 'record (validated snapshot)',
    purpose: 'Immutable validated machine snapshot — the unit of analysis passed to any predictor.',
    fields: ['type: ProductType (L | M | H)', 'airTempK: double (290–310)', 'processTempK: double (300–320)', 'rpm: int (500–4000)', 'torqueNm: double (1–100)', 'toolWearMin: int (0–300)'],
  },
  {
    name: 'Prediction',
    stereotype: 'record (output verdict)',
    purpose: 'Immutable prediction output with binary flag, risk %, level, and formatted headline().',
    fields: ['riskPercent: double (0–100)', 'failureExpected: boolean (risk >= 50%)', 'level: RiskLevel (LOW | MEDIUM | HIGH)', 'headline(): String'],
  },
  {
    name: 'PredictionRecord',
    stereotype: 'record (history row)',
    purpose: 'Pairs timestamp, validated SensorReading, and Prediction inside PredictionRepository.',
    fields: ['timestamp: LocalDateTime / ISO', 'sensorReading: SensorReading', 'prediction: Prediction'],
  },
  {
    name: 'ProductType',
    stereotype: 'enum',
    purpose: 'Part quality variant carrying documented AI4I overstrain limits.',
    fields: ['L (11,000 min·Nm)', 'M (12,000 min·Nm)', 'H (13,000 min·Nm)', 'parse(text): ProductType'],
  },
  {
    name: 'RiskLevel',
    stereotype: 'enum',
    purpose: 'Risk band classification and maintenance advice mapping.',
    fields: ['LOW (< 30%) → No action needed.', 'MEDIUM (30–49.9%) → Keep monitoring.', 'HIGH (≥ 50%) → Schedule inspection.', 'fromPercent(p): RiskLevel'],
  },
];

export const SystemArchitecturePage: React.FC = () => {
  const [tab, setTab] = useState<ArchTab>('layers');
  const [selectedLayerId, setSelectedLayerId] = useState<string>('logic');

  const selectedLayer = ARCH_LAYERS.find((l) => l.id === selectedLayerId) ?? ARCH_LAYERS[1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            System Architecture & Data Model
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Layered SDD architecture, replaceable FailurePredictor seam, domain entities, and SQL schema (Report §3).
          </p>
        </div>

        {/* Sub-view Switcher */}
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 self-start">
          {(
            [
              { id: 'layers', label: 'Architecture & Seam' },
              { id: 'data-model', label: 'Data Model & SQL' },
              { id: 'decisions', label: 'Design Decisions' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === item.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'layers' && (
        <div className="space-y-6">
          {/* Interactive 3-Layer Stack + Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    Interactive Layered Architecture
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Click any layer to inspect its responsibilities, classes, and linked SRS requirements
                  </p>
                </div>
                <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>

              <div className="flex flex-col items-stretch">
                {ARCH_LAYERS.map((layer, idx) => {
                  const active = layer.id === selectedLayerId;
                  return (
                    <React.Fragment key={layer.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedLayerId(layer.id)}
                        className={`text-left rounded-xl border p-4 transition-colors ${
                          active
                            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                            {layer.title}
                          </span>
                          <span className="text-[11px] font-mono text-blue-700 dark:text-blue-400">
                            {active ? 'Selected' : 'Inspect'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {layer.subtitle}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {layer.components.map((comp) => (
                            <span
                              key={comp}
                              className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 font-mono text-[11px] text-slate-800 dark:text-slate-200"
                            >
                              {comp}
                            </span>
                          ))}
                        </div>
                      </button>

                      {idx < ARCH_LAYERS.length - 1 && (
                        <div className="flex justify-center py-1.5 text-slate-400 dark:text-slate-500">
                          <ArrowDown className="h-4 w-4" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </section>

            {/* Layer Detail Inspector */}
            <section className="lg:col-span-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div>
                <div className="text-xs font-mono text-blue-700 dark:text-blue-400">
                  Selected Architectural Layer
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {selectedLayer.title}
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-3.5">
                  <div className="font-semibold text-slate-900 dark:text-white">Primary Responsibility</div>
                  <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                    {selectedLayer.responsibility}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-3.5">
                  <div className="font-semibold text-slate-900 dark:text-white">Documented Java Classes (SDD §3.2)</div>
                  <p className="mt-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedLayer.javaClasses}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 p-3.5">
                  <div className="font-semibold text-slate-900 dark:text-white">Satisfied Requirements</div>
                  <p className="mt-1 font-mono text-[11px] text-blue-700 dark:text-blue-400">
                    {selectedLayer.requirements}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Pluggable FailurePredictor Seam Diagram */}
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Key Design Decision: Pluggable FailurePredictor Seam (NFR-04, TC-32)
                </h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
                  The prediction logic is isolated behind a single method contract{' '}
                  <code className="font-mono text-slate-900 dark:text-slate-200">predict(SensorReading): Prediction</code>.
                  When the trained ML model is exported, <code className="font-mono text-slate-900 dark:text-slate-200">MlModelPredictor</code> drops in without altering the UI, validator, service orchestration, or repository.
                </p>
              </div>
              <Plug className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            </div>

            <div className="mt-6 flex flex-col items-center">
              <div className="w-full max-w-md rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-5 py-3 text-center">
                <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">PredictionService</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  validate(form) → predictor.predict(reading) → repository.add(record)
                </div>
              </div>

              <div className="py-2 text-slate-400">
                <ArrowDown className="h-4 w-4" />
              </div>

              <div className="w-full max-w-md rounded-xl border-2 border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 px-5 py-3 text-center">
                <div className="text-[10px] font-mono text-blue-700 dark:text-blue-400">«interface»</div>
                <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">FailurePredictor</div>
                <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  + predict(reading: SensorReading): Prediction
                </div>
              </div>

              <div className="py-2 text-slate-400 text-xs font-mono">implements</div>

              <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">RuleBasedPredictor</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">Active (Prototype)</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Evaluates proximity to documented AI4I physical rules (OSF, TWF, PWF, HDF) and reports worst-case risk percentage. Verified by TC-16 to TC-26.
                  </p>
                </div>

                <div className="rounded-xl border border-dashed border-amber-400 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">MlModelPredictor</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">Planned Adapter (Future)</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Loads exported trained classifier (e.g., Random Forest / Gradient Boosting), applies identical Type encoding, scaling, ΔT &amp; Power features, and tuned probability threshold.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === 'data-model' && (
        <div className="space-y-6">
          {/* Domain Entities Grid */}
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Core Domain Entities & Relationships (SDD §3.4)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  InputForm → (InputValidator) → SensorReading → (FailurePredictor) → Prediction → wrapped in PredictionRecord
                </p>
              </div>
              <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DATA_ENTITIES.map((ent) => (
                <div
                  key={ent.name}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4"
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {ent.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {ent.stereotype}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{ent.purpose}</p>
                  <ul className="mt-3 space-y-1 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                    {ent.fields.map((f) => (
                      <li key={f} className="truncate">
                        • {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Relationship Summary + SQL Schema (SDD §3.6) */}
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Database Schema Design — Future Extension (SDD §3.6)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Entity relationships: <span className="font-mono">PREDICTION_RECORD (1:1) → SENSOR_READING (many:1) → PRODUCT_TYPE</span>. Currently in-memory / localStorage; ready for JDBC swap.
                </p>
              </div>
              <span className="text-xs font-mono text-amber-700 dark:text-amber-400 shrink-0">
                Design Spec · Phase 3
              </span>
            </div>

            <pre className="overflow-x-auto rounded-lg bg-[#0B1324] text-slate-200 p-4 font-mono text-xs leading-relaxed border border-slate-800">
              <code>{SQL_SCHEMA}</code>
            </pre>
          </section>
        </div>
      )}

      {tab === 'decisions' && (
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Architectural & Engineering Decisions (SDD §3.11)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Trade-offs documented specifically for Software Engineering viva justification
              </p>
            </div>
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
                  <th className="py-3 px-6">Decision</th>
                  <th className="py-3 px-4">Engineering Rationale</th>
                  <th className="py-3 px-6">Alternative Considered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {DESIGN_DECISIONS.map((d) => (
                  <tr key={d.decision} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-6 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {d.decision}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                      {d.rationale}
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 dark:text-slate-400">
                      {d.alternative}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
