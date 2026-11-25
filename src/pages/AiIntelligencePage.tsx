import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  FileJson,
  Info,
  Loader2,
  Scale,
  Send,
  Sliders,
  RefreshCw,
} from 'lucide-react';
import {
  NavSectionId,
  OptimizedModelConfig,
  PredictionRecord,
  PredictorMode,
  RiskLevel,
  TrainedModelInfo,
  UserPersona,
} from '../types/domain';
import {
  AiAssistantReply,
  AiWhatIfResult,
  requestAiAssistant,
  requestWhatIfAnalysis,
  UPLOADED_RF_CONFIG_PATH,
} from '../services/aiDiagnosticService';
import { EmptyState } from '../components/EmptyState';
import { formatShortTime, formatTimestamp } from '../utils/formatters';

interface AiIntelligencePageProps {
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
  persona: UserPersona;
  modelConfig: OptimizedModelConfig;
  trainedModelInfo: TrainedModelInfo | null;
  predictorMode: PredictorMode;
  onNavigate: (section: NavSectionId) => void;
  onInspectRecord: (record: PredictionRecord) => void;
}

type AiTab = 'advisor' | 'decision-theory' | 'what-if';

interface AdvisorExchange {
  id: string;
  question: string;
  reply: AiAssistantReply;
  model: string;
  generatedAt: string;
}

const QUICK_PROMPTS = [
  {
    label: 'Accuracy Paradox (3.39%)',
    question:
      'Why is standard accuracy misleading on the AI4I 2020 dataset, and why did our project choose Recall >= 0.80 and Precision >= 0.50 as primary AI evaluation criteria?',
  },
  {
    label: '0.26 Threshold Trade-off',
    question:
      'Explain how lowering the Random Forest decision threshold from 0.50 to 0.26 (with a 0.15 low-risk limit) changes false negatives, false positives, and CNC maintenance cost.',
  },
  {
    label: 'Interpret Latest Snapshot',
    question:
      'Interpret our latest evaluated CNC machine snapshot from an engineering standpoint and specify what the operator should inspect first.',
  },
  {
    label: 'Prototype vs. Random Forest',
    question:
      'Compare our trained balanced RandomForestClassifier (150 trees, class_weight=balanced, τ=0.26) against our RuleBasedPredictor stand-in and explain why we kept both behind FailurePredictor.',
  },
];

const WHAT_IF_GOALS = [
  'Reduce risk safely below 15% (LOW) with minimal machining throughput loss.',
  'Bring risk below the 26% critical threshold configured for our Random Forest model.',
  'Eliminate overstrain (Wear × Torque) and heat dissipation (ΔT) risk first.',
];

export const AiIntelligencePage: React.FC<AiIntelligencePageProps> = ({
  history,
  stats,
  persona,
  modelConfig,
  trainedModelInfo,
  predictorMode,
  onNavigate,
  onInspectRecord,
}) => {
  const [activeTab, setActiveTab] = useState<AiTab>('advisor');

  // Tab 1: AI Engineering Advisor state
  const [question, setQuestion] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorError, setAdvisorError] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState<AdvisorExchange[]>([]);

  // Tab 3: What-If Counterfactual XAI state
  const [selectedRecordId, setSelectedRecordId] = useState<string>(history[0]?.id ?? '');
  const [whatIfGoal, setWhatIfGoal] = useState<string>(WHAT_IF_GOALS[0]);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfError, setWhatIfError] = useState<string | null>(null);
  const [whatIfResult, setWhatIfResult] = useState<{
    recordId: string;
    result: AiWhatIfResult;
    generatedAt: string;
  } | null>(null);

  const selectedRecord = useMemo(() => {
    if (history.length === 0) return null;
    return history.find((r) => r.id === selectedRecordId) ?? history[0];
  }, [history, selectedRecordId]);

  const lowPct = Math.round(modelConfig.risk_thresholds.low_risk_limit * 100);
  const critPct = Math.round(modelConfig.optimized_threshold * 100);

  // Threshold sensitivity comparison on stored session snapshots
  const sensitivitySummary = useMemo(() => {
    let protoFailures = 0;
    let tunedCritical = 0;
    let tunedMedium = 0;
    let tunedLow = 0;
    const upgraded: PredictionRecord[] = [];

    for (const rec of history) {
      const risk = rec.prediction.riskPercent;
      if (rec.prediction.failureExpected) protoFailures++;
      if (risk >= critPct) {
        tunedCritical++;
        if (!rec.prediction.failureExpected) {
          upgraded.push(rec);
        }
      } else if (risk >= lowPct) {
        tunedMedium++;
      } else {
        tunedLow++;
      }
    }

    return {
      protoFailures,
      tunedCritical,
      tunedMedium,
      tunedLow,
      upgraded,
    };
  }, [history, critPct, lowPct]);

  const submitAdvisorQuestion = async (promptText: string) => {
    const cleaned = promptText.trim();
    if (!cleaned || advisorLoading) return;

    setAdvisorLoading(true);
    setAdvisorError(null);
    try {
      const res = await requestAiAssistant({
        question: cleaned,
        persona,
        sessionStats: {
          total: stats.total,
          failures: stats.failures,
          averageRisk: stats.averageRisk,
        },
        latestRecord: stats.latest,
        modelConfig,
      });

      setExchanges((prev) => [
        {
          id: `${Date.now()}`,
          question: cleaned,
          reply: res.reply,
          model: res.model,
          generatedAt: res.generatedAt,
        },
        ...prev,
      ]);
      setQuestion('');
    } catch (err) {
      setAdvisorError(
        err instanceof Error ? err.message : 'Unable to reach AI Engineering Advisor.'
      );
    } finally {
      setAdvisorLoading(false);
    }
  };

  const handleAdvisorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitAdvisorQuestion(question);
  };

  const handleRunWhatIf = async () => {
    if (!selectedRecord || whatIfLoading) return;
    setWhatIfLoading(true);
    setWhatIfError(null);
    try {
      const res = await requestWhatIfAnalysis(selectedRecord, whatIfGoal);
      setWhatIfResult({
        recordId: selectedRecord.id,
        result: res.whatIf,
        generatedAt: res.generatedAt,
      });
    } catch (err) {
      setWhatIfError(
        err instanceof Error ? err.message : 'Unable to generate What-If counterfactual analysis.'
      );
    } finally {
      setWhatIfLoading(false);
    }
  };

  const tabs: { id: AiTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'advisor', label: 'AI Engineering Advisor', icon: BrainCircuit },
    { id: 'decision-theory', label: 'AI Formulation & Decision Theory', icon: Scale },
    { id: 'what-if', label: 'What-If Risk Reduction (XAI)', icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            AI Intelligence & Decision Science
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Explainable AI diagnostics, cost-sensitive classification policy, and interactive Random Forest threshold analysis.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs font-mono text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
          <FileJson className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="tabular-nums">
            {modelConfig.model_type} · τ = {modelConfig.optimized_threshold.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Tab Bar */}
      <div
        role="tablist"
        aria-label="AI Intelligence views"
        className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-slate-900 dark:bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: AI ENGINEERING ADVISOR */}
      {activeTab === 'advisor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Cols: Composer + Structured Q&A Feed */}
          <div className="lg:col-span-8 space-y-5">
            <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Ask the Predictive Maintenance AI Advisor
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Grounded in your active persona ({persona}), AI4I 2020 dataset parameters, your uploaded Random Forest configuration, and your latest CNC snapshot.
                </p>
              </div>

              {/* Quick Viva / Engineering Starters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={advisorLoading}
                    onClick={() => void submitAdvisorQuestion(item.question)}
                    className="text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3 py-2.5 hover:border-blue-400 dark:hover:border-blue-600 transition-colors disabled:opacity-50"
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {item.question}
                    </div>
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={handleAdvisorSubmit} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={600}
                  placeholder="Ask about failure modes, threshold tuning, class imbalance, or your latest CNC reading..."
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={advisorLoading || question.trim().length < 2}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                >
                  {advisorLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Ask Advisor</span>
                    </>
                  )}
                </button>
              </form>

              {advisorError && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{advisorError}</span>
                </div>
              )}
            </section>

            {/* Structured Answer Feed */}
            {exchanges.length === 0 ? (
              <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center">
                <BrainCircuit className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto" />
                <h3 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-white">
                  Ready for Technical Q&A
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Select a starter prompt above or ask a custom question to get structured answers grounded in AI4I 2020 physics, decision theory, and your current session data.
                </p>
              </section>
            ) : (
              <div className="space-y-4">
                {exchanges.map((ex) => (
                  <article
                    key={ex.id}
                    className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
                  >
                    <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                        {ex.question}
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                        {formatShortTime(ex.generatedAt)}
                      </span>
                    </div>

                    <div className="p-5 space-y-4">
                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                        {ex.reply.directAnswer}
                      </p>

                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white mb-2">
                          Key Engineering Points
                        </div>
                        <ul className="space-y-1.5">
                          {ex.reply.keyPoints.map((pt, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 p-3.5">
                        <div className="text-[11px] font-semibold text-slate-900 dark:text-white">
                          Recommended Next Step
                        </div>
                        <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {ex.reply.actionableNextStep}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Grounded in: {ex.reply.groundingReference}</span>
                        <span className="font-mono">Server-side AI · Advisory only</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Right 4 Cols: Active AI Grounding Context */}
          <aside className="lg:col-span-4 space-y-4">
            <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                  Active Grounding Context
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Live facts supplied with every AI Advisor query
                </p>
              </div>

              <dl className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <dt className="text-slate-500 dark:text-slate-400">User Perspective</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">{persona}</dd>
                </div>
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <dt className="text-slate-500 dark:text-slate-400">Session Predictions</dt>
                  <dd className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                    {stats.total} ({stats.failures} failures)
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <dt className="text-slate-500 dark:text-slate-400">Active Engine</dt>
                  <dd className="font-mono text-slate-900 dark:text-white">
                    {predictorMode === 'ml-model' ? 'RandomForest (150 trees)' : 'RuleBasedPredictor'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Held-Out Test PR-AUC</dt>
                  <dd className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
                    {trainedModelInfo
                      ? `${trainedModelInfo.evaluation.heldOutTest.prAuc.toFixed(3)} (ROC ${trainedModelInfo.evaluation.heldOutTest.rocAuc.toFixed(3)})`
                      : modelConfig.model_type}
                  </dd>
                </div>
              </dl>

              {stats.latest ? (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Latest Snapshot
                    </span>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        stats.latest.prediction.level === RiskLevel.HIGH
                          ? 'text-red-700 dark:text-red-400'
                          : stats.latest.prediction.level === RiskLevel.MEDIUM
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {Math.round(stats.latest.prediction.riskPercent)}% ({stats.latest.prediction.level})
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                    Type {stats.latest.reading.type} · {stats.latest.reading.rpm} rpm ·{' '}
                    {stats.latest.reading.torqueNm} Nm · Wear {stats.latest.reading.toolWearMin} min
                  </div>
                  <button
                    type="button"
                    onClick={() => onInspectRecord(stats.latest!)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Inspect snapshot details</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 text-xs text-slate-500 dark:text-slate-400">
                  No CNC snapshot evaluated yet.{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('predict')}
                    className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Run a prediction
                  </button>{' '}
                  to ground advisor responses in live sensor numbers.
                </div>
              )}
            </section>

            <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start gap-2.5">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Academic Scope Integrity:
                  </span>{' '}
                  The AI Advisor cites only measured held-out test metrics from your trained 150-tree Random Forest, AI4I 2020 physics, and session telemetry—without claiming live PLC connectivity or RUL forecasting.
                </div>
              </div>
            </section>
          </aside>
        </div>
      )}

      {/* TAB 2: AI FORMULATION, DECISION THEORY & UPLOADED RF CONFIG */}
      {activeTab === 'decision-theory' && (
        <div className="space-y-6">
          {/* Row 1: AI Formulation + Cost of Errors */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div>
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  AI Course Foundation (Slide 3)
                </div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white mt-1">
                  AI Problem Formulation
                </h2>
              </div>

              <dl className="space-y-3 text-xs">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                  <dt className="font-semibold text-slate-900 dark:text-white">
                    Task Type & Target Variable
                  </dt>
                  <dd className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                    Supervised binary classification mapping a single CNC operating snapshot{' '}
                    <span className="font-mono text-slate-800 dark:text-slate-200">x</span> to{' '}
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      P(Machine failure = 1 | x)
                    </span>{' '}
                    and a calibrated risk tier.
                  </dd>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                  <dt className="font-semibold text-slate-900 dark:text-white">
                    Why AI Outperforms Static Single-Sensor Alarms
                  </dt>
                  <dd className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                    CNC breakdowns arise from non-linear interactions across multiple sensors (for example,
                    high torque combined with elevated tool wear causing overstrain, or narrow ΔT paired with
                    low RPM causing heat-dissipation failure). Tree ensembles learn these joint boundaries automatically.
                  </dd>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                  <dt className="font-semibold text-slate-900 dark:text-white">
                    Class Imbalance & Metric Selection
                  </dt>
                  <dd className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                    In AI4I 2020, only <span className="font-mono font-semibold">339 / 10,000 (3.39%)</span>{' '}
                    rows are failures. A trivial classifier predicting “no failure” achieves{' '}
                    <span className="font-mono font-semibold">96.61% accuracy</span> with{' '}
                    <span className="font-mono font-semibold">0.00 recall</span>. Therefore we optimize{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">Recall ≥ 0.80</span>,{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">Precision ≥ 0.50</span>, and PR-AUC.
                  </dd>
                </div>
              </dl>
            </section>

            <section className="lg:col-span-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Cost-Sensitive Decision Theory
                </div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white mt-1">
                  Asymmetric Cost of Classification Errors
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Under Bayesian decision theory, the optimal classification threshold is not 0.50 when false negatives cost significantly more than false positives.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-3">Outcome</th>
                      <th className="py-2.5 px-3">Shop-Floor Impact</th>
                      <th className="py-2.5 px-3 text-right">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="py-3 px-3 font-semibold text-red-700 dark:text-red-400 whitespace-nowrap">
                        False Negative (FN)
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        Missed CNC failure: unplanned downtime, tool/workpiece scrap, spindle damage, safety risk.
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-red-700 dark:text-red-400">
                        HIGH
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                        False Positive (FP)
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        Preventive inspection scheduled early; minor technician time without catastrophic breakdown.
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-amber-700 dark:text-amber-400">
                        LOW
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        True Positive (TP)
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        Early warning enables planned tool swap or load reduction before machine breakdown.
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                        OPTIMAL
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 p-3.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Why Threshold τ = {modelConfig.optimized_threshold.toFixed(2)}:
                </span>{' '}
                Lowering the alert boundary from <span className="font-mono">0.50</span> to{' '}
                <span className="font-mono font-semibold">{modelConfig.optimized_threshold.toFixed(2)}</span>{' '}
                prioritizes catching rare failure states (higher Recall) while keeping a separate{' '}
                <span className="font-mono">{modelConfig.risk_thresholds.low_risk_limit.toFixed(2)}</span>{' '}
                early-monitoring buffer for supervisors.
              </div>
            </section>
          </div>

          {/* Row 2: Uploaded Optimized Random Forest Config Inspector */}
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
                  <FileJson className="h-4 w-4" />
                  <span>Loaded Model Configuration Artifact</span>
                </div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white mt-1">
                  {modelConfig.model_type} · Optimized Threshold Configuration
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  Source: {UPLOADED_RF_CONFIG_PATH}
                </p>
              </div>
              <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg px-3 py-1.5 shrink-0">
                {trainedModelInfo ? 'Trained & Connected · Live API' : 'Config Loaded'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Hyperparameters */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Hyperparameters
                </div>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">n_estimators</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {modelConfig.hyperparameters.n_estimators} trees
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">max_depth</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-white">
                      {modelConfig.hyperparameters.max_depth === null
                        ? 'null (Full depth)'
                        : modelConfig.hyperparameters.max_depth}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">min_samples_split</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {modelConfig.hyperparameters.min_samples_split}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">class_weight / criterion</dt>
                    <dd className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {modelConfig.hyperparameters.class_weight ?? 'balanced'} · {modelConfig.hyperparameters.criterion ?? 'gini'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-slate-400">random_state</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {modelConfig.hyperparameters.random_state}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Calibrated Risk Bands */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Calibrated Decision Policy
                </div>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-emerald-700 dark:text-emerald-400 font-medium">Low Risk Band</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      &lt; {lowPct}% (p &lt; {modelConfig.risk_thresholds.low_risk_limit.toFixed(2)})
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-amber-700 dark:text-amber-400 font-medium">Monitor Band</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {lowPct}% – {(critPct - 0.1).toFixed(1)}%
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-red-700 dark:text-red-400 font-medium">Critical / Failure</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      ≥ {critPct}% (p ≥ {modelConfig.risk_thresholds.critical_risk_limit.toFixed(2)})
                    </dd>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <dt className="text-slate-500 dark:text-slate-400">Optimized Threshold</dt>
                    <dd className="font-mono font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                      {modelConfig.optimized_threshold.toFixed(2)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Configured Feature Vector */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Configured Input Features ({modelConfig.features.length})
                </div>
                <ul className="space-y-1.5 text-xs font-mono text-slate-700 dark:text-slate-300">
                  {modelConfig.features.map((feat, idx) => (
                    <li key={feat} className="flex items-center justify-between">
                      <span>{feat}</span>
                      <span className="text-[11px] text-slate-400">f{idx + 1}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Status: Your 150-tree <span className="font-mono">RandomForestClassifier</span> has been trained on the stratified 80% AI4I 2020 split and connected live behind{' '}
              <span className="font-mono">/api/ml/predict</span>. You can switch between the trained ML model and the deterministic{' '}
              <span className="font-mono">RuleBasedPredictor</span> prototype at any time on the Predict Failure or Model Performance pages.
            </p>
          </section>

          {/* Row 3: Live Threshold Sensitivity Comparison on Session History */}
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Threshold Sensitivity Simulation (50% Prototype vs. {critPct}% Tuned Policy)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Demonstrates on your recorded session snapshots how lowering the decision threshold increases early-warning sensitivity on borderline cases.
              </p>
            </div>

            {history.length === 0 ? (
              <EmptyState
                title="No Session Snapshots to Compare"
                description="Run a few predictions (including Medium-risk borderline readings around 30%–49%) to see how the 0.26 tuned threshold catches early warning cases compared to the 0.50 prototype cutoff."
                actionLabel="Go to Predict Failure"
                onAction={() => onNavigate('predict')}
              />
            ) : (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Prototype Cutoff (≥ 50%)
                    </div>
                    <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                      {sensitivitySummary.protoFailures} / {history.length}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Flagged as FAILURE
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Tuned RF Policy (≥ {critPct}%)
                    </div>
                    <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-red-700 dark:text-red-400">
                      {sensitivitySummary.tunedCritical} / {history.length}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Flagged as CRITICAL · {sensitivitySummary.tunedMedium} Monitor · {sensitivitySummary.tunedLow} Low
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Additional Early Warnings
                    </div>
                    <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400">
                      +{sensitivitySummary.upgraded.length}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Borderline snapshots escalated ({critPct}%–49%)
                    </div>
                  </div>
                </div>

                {sensitivitySummary.upgraded.length > 0 && (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                          <th className="py-2.5 px-4">Timestamp</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3 text-right">Risk Score</th>
                          <th className="py-2.5 px-3">At 50% Cutoff</th>
                          <th className="py-2.5 px-3">At {critPct}% Tuned Policy</th>
                          <th className="py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sensitivitySummary.upgraded.slice(0, 8).map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                              {formatTimestamp(rec.timestamp)}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                              {rec.reading.type}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                              {rec.prediction.riskPercent.toFixed(1)}%
                            </td>
                            <td className="py-2.5 px-3 text-amber-700 dark:text-amber-400 font-medium">
                              NO FAILURE ({rec.prediction.level})
                            </td>
                            <td className="py-2.5 px-3 text-red-700 dark:text-red-400 font-semibold">
                              ESCALATED (≥ {critPct}%)
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => onInspectRecord(rec)}
                                className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 3: WHAT-IF RISK REDUCTION (COUNTERFACTUAL XAI) */}
      {activeTab === 'what-if' && (
        <div className="space-y-6">
          {!selectedRecord ? (
            <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <EmptyState
                title="No Machine Snapshot Available for Counterfactual Analysis"
                description="Evaluate at least one CNC snapshot first. The What-If XAI advisor will then compute concrete sensor adjustments to reduce its failure risk."
                actionLabel="Run a Prediction"
                onAction={() => onNavigate('predict')}
              />
            </section>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Controls & Selected Snapshot */}
              <section className="lg:col-span-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                    Counterfactual Scenario Setup
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Select any stored snapshot to identify the minimal physical operating changes that lower failure risk.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="what-if-snapshot"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Target CNC Snapshot
                  </label>
                  <select
                    id="what-if-snapshot"
                    value={selectedRecord.id}
                    onChange={(e) => {
                      setSelectedRecordId(e.target.value);
                      setWhatIfResult(null);
                      setWhatIfError(null);
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
                  >
                    {history.slice(0, 25).map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {formatShortTime(rec.timestamp)} · Type {rec.reading.type} ·{' '}
                        {Math.round(rec.prediction.riskPercent)}% ({rec.prediction.level})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Current Snapshot Readout */}
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Baseline Operating State
                    </span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        selectedRecord.prediction.level === RiskLevel.HIGH
                          ? 'text-red-700 dark:text-red-400'
                          : selectedRecord.prediction.level === RiskLevel.MEDIUM
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {selectedRecord.prediction.riskPercent.toFixed(1)}% ·{' '}
                      {selectedRecord.prediction.failureExpected ? 'FAILURE' : 'NO FAILURE'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-700 dark:text-slate-300 tabular-nums">
                    <div>Type: {selectedRecord.reading.type}</div>
                    <div>ΔT: {selectedRecord.prediction.derivedMetrics.temperatureGapK} K</div>
                    <div>Speed: {selectedRecord.reading.rpm} rpm</div>
                    <div>Torque: {selectedRecord.reading.torqueNm} Nm</div>
                    <div>Tool Wear: {selectedRecord.reading.toolWearMin} min</div>
                    <div>Power: {selectedRecord.prediction.derivedMetrics.powerWatts} W</div>
                  </div>
                </div>

                {/* Optimization Goal */}
                <div className="space-y-2">
                  <label
                    htmlFor="what-if-goal"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Optimization Goal
                  </label>
                  <div className="space-y-1.5">
                    {WHAT_IF_GOALS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setWhatIfGoal(preset)}
                        className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-colors ${
                          whatIfGoal === preset
                            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 font-medium'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    id="what-if-goal"
                    type="text"
                    value={whatIfGoal}
                    onChange={(e) => setWhatIfGoal(e.target.value)}
                    maxLength={240}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void handleRunWhatIf()}
                  disabled={whatIfLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {whatIfLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Computing Counterfactuals...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Run Counterfactual Analysis</span>
                    </>
                  )}
                </button>

                {whatIfError && (
                  <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{whatIfError}</span>
                  </div>
                )}
              </section>

              {/* Right 7 Cols: Counterfactual Interventions Output */}
              <section className="lg:col-span-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
                {!whatIfResult || whatIfResult.recordId !== selectedRecord.id ? (
                  <div className="py-10 text-center space-y-2.5">
                    <Sliders className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto" />
                    <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                      Counterfactual Parameter Plan
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      Click “Run Counterfactual Analysis” to generate physically grounded “What-If” adjustments explaining which CNC parameters to modify first to bring this machine into a safe operating envelope.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                          Recommended Counterfactual Adjustments
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Generated at {formatShortTime(whatIfResult.generatedAt)} · Grounded in AI4I 2020 physical boundaries
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                      {whatIfResult.result.summary}
                    </p>

                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                            <th className="py-2.5 px-3.5">Parameter</th>
                            <th className="py-2.5 px-3">Current</th>
                            <th className="py-2.5 px-3">Suggested Target</th>
                            <th className="py-2.5 px-3.5">Expected Impact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {whatIfResult.result.interventions.map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                {item.parameter}
                              </td>
                              <td className="py-3 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {item.currentValue}
                              </td>
                              <td className="py-3 px-3 font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                {item.suggestedTarget}
                              </td>
                              <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 leading-relaxed">
                                {item.expectedImpact}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Engineering Trade-off: </span>
                        {whatIfResult.result.tradeoffWarning}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
