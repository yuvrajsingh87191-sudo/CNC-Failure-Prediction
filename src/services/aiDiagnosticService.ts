import { OptimizedModelConfig, PredictionRecord, UserPersona } from '../types/domain';
import { getAuthHeaders, notifyUnauthorized } from './authService';

export interface AiSnapshotDiagnosis {
  executiveSummary: string;
  primaryRiskDrivers: string[];
  inspectionChecklist: string[];
  parameterGuidance: string;
  scopeNote: string;
}

export interface AiSnapshotResponse {
  diagnosis: AiSnapshotDiagnosis;
  model: string;
  generatedAt: string;
}

export interface AiHistoryAnalysis {
  shiftSummary: string;
  detectedPatterns: string[];
  priorityActions: string[];
  dataScopeNote: string;
}

export interface AiHistoryResponse {
  analysis: AiHistoryAnalysis;
  recordCount: number;
  model: string;
  generatedAt: string;
}

export interface AiAssistantReply {
  directAnswer: string;
  keyPoints: string[];
  actionableNextStep: string;
  groundingReference: string;
}

export interface AiAssistantResponse {
  reply: AiAssistantReply;
  model: string;
  generatedAt: string;
}

export interface AiWhatIfIntervention {
  parameter: string;
  currentValue: string;
  suggestedTarget: string;
  expectedImpact: string;
}

export interface AiWhatIfResult {
  summary: string;
  interventions: AiWhatIfIntervention[];
  tradeoffWarning: string;
}

export interface AiWhatIfResponse {
  whatIf: AiWhatIfResult;
  model: string;
  generatedAt: string;
}

export const UPLOADED_RF_CONFIG_PATH =
  '/assets/aistudio/optimized_random_forest_model_108125a0.json';

export const DEFAULT_UPLOADED_RF_CONFIG: OptimizedModelConfig = {
  model_type: 'RandomForestClassifier',
  hyperparameters: {
    n_estimators: 150,
    max_depth: null,
    min_samples_split: 5,
    min_samples_leaf: 1,
    class_weight: 'balanced',
    criterion: 'gini',
    max_features: 'sqrt',
    bootstrap: true,
    random_state: 42,
  },
  features: [
    'Temperature_Air',
    'Temperature_Process',
    'Rotational_Speed',
    'Torque',
    'Tool_Wear',
  ],
  optimized_threshold: 0.26,
  risk_thresholds: {
    low_risk_limit: 0.15,
    critical_risk_limit: 0.26,
  },
};

export async function loadOptimizedModelConfig(): Promise<OptimizedModelConfig> {
  try {
    const res = await fetch(UPLOADED_RF_CONFIG_PATH);
    if (!res.ok) return DEFAULT_UPLOADED_RF_CONFIG;
    const raw = (await res.json()) as Record<string, unknown>;
    if (!raw || typeof raw.model_type !== 'string') return DEFAULT_UPLOADED_RF_CONFIG;
    const hp = (raw.hyperparameters ?? {}) as Record<string, unknown>;
    const threshold =
      typeof raw.suggested_optimal_threshold === 'number'
        ? raw.suggested_optimal_threshold
        : typeof raw.optimized_threshold === 'number'
        ? raw.optimized_threshold
        : 0.26;
    const features = Array.isArray(raw.feature_names_in)
      ? (raw.feature_names_in as string[])
      : Array.isArray(raw.features)
      ? (raw.features as string[])
      : DEFAULT_UPLOADED_RF_CONFIG.features;

    return {
      model_type: raw.model_type,
      hyperparameters: {
        n_estimators: typeof hp.n_estimators === 'number' ? hp.n_estimators : 150,
        max_depth: typeof hp.max_depth === 'number' ? hp.max_depth : null,
        min_samples_split: typeof hp.min_samples_split === 'number' ? hp.min_samples_split : 5,
        min_samples_leaf: typeof hp.min_samples_leaf === 'number' ? hp.min_samples_leaf : 1,
        class_weight: typeof hp.class_weight === 'string' ? hp.class_weight : 'balanced',
        criterion: typeof hp.criterion === 'string' ? hp.criterion : 'gini',
        max_features: typeof hp.max_features === 'string' ? hp.max_features : 'sqrt',
        bootstrap: typeof hp.bootstrap === 'boolean' ? hp.bootstrap : true,
        random_state: typeof hp.random_state === 'number' ? hp.random_state : 42,
      },
      features,
      optimized_threshold: threshold,
      risk_thresholds: {
        low_risk_limit: 0.15,
        critical_risk_limit: threshold,
      },
    };
  } catch {
    return DEFAULT_UPLOADED_RF_CONFIG;
  }
}

async function parseAiApiResponse<T>(
  response: Response,
  fallbackError: string
): Promise<T> {
  if (response.status === 401) {
    notifyUnauthorized();
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    if (!response.ok) {
      throw new Error(`${fallbackError} (HTTP ${response.status}).`);
    }
    throw new Error(
      'Received an unexpected non-JSON response from the AI service. Please reload the page and sign in again.'
    );
  }

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error(`${fallbackError} (invalid JSON payload).`);
  }

  if (!response.ok) {
    const serverErr = typeof data.error === 'string' && data.error.trim() ? data.error : null;
    throw new Error(serverErr || `${fallbackError} (HTTP ${response.status}).`);
  }

  return data as T;
}

export async function requestSnapshotAiDiagnosis(
  record: PredictionRecord
): Promise<AiSnapshotResponse> {
  const response = await fetch('/api/ai/diagnose-snapshot', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      reading: record.reading,
      prediction: {
        riskPercent: record.prediction.riskPercent,
        failureExpected: record.prediction.failureExpected,
        level: record.prediction.level,
        advice: record.prediction.advice,
        factors: record.prediction.factors,
        derivedMetrics: record.prediction.derivedMetrics,
      },
    }),
  });

  const data = await parseAiApiResponse<AiSnapshotResponse>(response, 'AI diagnosis failed');
  if (!data?.diagnosis || typeof data.diagnosis.executiveSummary !== 'string') {
    throw new Error('AI diagnosis response was incomplete. Please try again.');
  }
  return {
    ...data,
    diagnosis: {
      executiveSummary: data.diagnosis.executiveSummary,
      primaryRiskDrivers: Array.isArray(data.diagnosis.primaryRiskDrivers)
        ? data.diagnosis.primaryRiskDrivers
        : [],
      inspectionChecklist: Array.isArray(data.diagnosis.inspectionChecklist)
        ? data.diagnosis.inspectionChecklist
        : [],
      parameterGuidance:
        typeof data.diagnosis.parameterGuidance === 'string' ? data.diagnosis.parameterGuidance : '',
      scopeNote: typeof data.diagnosis.scopeNote === 'string' ? data.diagnosis.scopeNote : '',
    },
  };
}

export async function requestHistoryAiAnalysis(
  records: PredictionRecord[],
  filterSummary: string
): Promise<AiHistoryResponse> {
  const compactRecords = records.slice(0, 50).map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    type: r.reading.type,
    airTempK: r.reading.airTempK,
    processTempK: r.reading.processTempK,
    rpm: r.reading.rpm,
    torqueNm: r.reading.torqueNm,
    toolWearMin: r.reading.toolWearMin,
    failureExpected: r.prediction.failureExpected,
    riskPercent: r.prediction.riskPercent,
    level: r.prediction.level,
  }));

  const response = await fetch('/api/ai/analyze-history', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      records: compactRecords,
      filterSummary,
    }),
  });

  const data = await parseAiApiResponse<AiHistoryResponse>(response, 'AI history analysis failed');
  if (!data?.analysis || typeof data.analysis.shiftSummary !== 'string') {
    throw new Error('AI shift analysis response was incomplete. Please try again.');
  }
  return {
    ...data,
    analysis: {
      shiftSummary: data.analysis.shiftSummary,
      detectedPatterns: Array.isArray(data.analysis.detectedPatterns)
        ? data.analysis.detectedPatterns
        : [],
      priorityActions: Array.isArray(data.analysis.priorityActions)
        ? data.analysis.priorityActions
        : [],
      dataScopeNote:
        typeof data.analysis.dataScopeNote === 'string' ? data.analysis.dataScopeNote : '',
    },
  };
}

export async function requestAiAssistant(params: {
  question: string;
  persona: UserPersona;
  sessionStats: { total: number; failures: number; averageRisk: number | null };
  latestRecord: PredictionRecord | null;
  modelConfig: OptimizedModelConfig | null;
}): Promise<AiAssistantResponse> {
  const latestSnapshot = params.latestRecord
    ? {
        reading: params.latestRecord.reading,
        prediction: {
          riskPercent: params.latestRecord.prediction.riskPercent,
          failureExpected: params.latestRecord.prediction.failureExpected,
          level: params.latestRecord.prediction.level,
          advice: params.latestRecord.prediction.advice,
          factors: params.latestRecord.prediction.factors,
          derivedMetrics: params.latestRecord.prediction.derivedMetrics,
        },
      }
    : null;

  const response = await fetch('/api/ai/assistant', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      question: params.question,
      persona: params.persona,
      sessionStats: params.sessionStats,
      latestSnapshot,
      modelConfig: params.modelConfig,
    }),
  });

  const data = await parseAiApiResponse<AiAssistantResponse>(response, 'AI advisor request failed');
  if (!data?.reply || typeof data.reply.directAnswer !== 'string') {
    throw new Error('AI advisor response was incomplete. Please try again.');
  }
  return {
    ...data,
    reply: {
      directAnswer: data.reply.directAnswer,
      keyPoints: Array.isArray(data.reply.keyPoints) ? data.reply.keyPoints : [],
      actionableNextStep:
        typeof data.reply.actionableNextStep === 'string' ? data.reply.actionableNextStep : '',
      groundingReference:
        typeof data.reply.groundingReference === 'string' ? data.reply.groundingReference : '',
    },
  };
}

export async function requestWhatIfAnalysis(
  record: PredictionRecord,
  goal?: string
): Promise<AiWhatIfResponse> {
  const response = await fetch('/api/ai/what-if', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      reading: record.reading,
      prediction: {
        riskPercent: record.prediction.riskPercent,
        failureExpected: record.prediction.failureExpected,
        level: record.prediction.level,
        advice: record.prediction.advice,
        factors: record.prediction.factors,
        derivedMetrics: record.prediction.derivedMetrics,
      },
      goal,
    }),
  });

  const data = await parseAiApiResponse<AiWhatIfResponse>(response, 'What-If AI analysis failed');
  if (!data?.whatIf || typeof data.whatIf.summary !== 'string') {
    throw new Error('Counterfactual AI response was incomplete. Please try again.');
  }
  return {
    ...data,
    whatIf: {
      summary: data.whatIf.summary,
      interventions: Array.isArray(data.whatIf.interventions) ? data.whatIf.interventions : [],
      tradeoffWarning:
        typeof data.whatIf.tradeoffWarning === 'string' ? data.whatIf.tradeoffWarning : '',
    },
  };
}
