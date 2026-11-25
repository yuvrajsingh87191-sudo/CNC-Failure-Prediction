import { MlEnsembleDetails, RiskLevel, SensorReading, TrainedModelInfo } from '../types/domain';
import { getAuthHeaders, notifyUnauthorized } from './authService';

export interface MlPredictApiResponse {
  modelType: string;
  predictorName: string;
  probability: number;
  riskPercent: number;
  failureExpected: boolean;
  level: RiskLevel;
  advice: string;
  headline: string;
  treeVotesPositive: number;
  totalTrees: number;
  thresholdUsed: number;
  lowRiskLimit: number;
  criticalRiskLimit: number;
  latencyMs: number;
}

export async function fetchTrainedModelInfo(): Promise<TrainedModelInfo | null> {
  try {
    const res = await fetch('/api/ml/model-info', {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: getAuthHeaders(),
    });
    if (res.status === 401) {
      notifyUnauthorized();
      return null;
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok || !contentType.includes('application/json')) return null;
    return (await res.json()) as TrainedModelInfo;
  } catch {
    return null;
  }
}

export async function predictWithMlApi(reading: SensorReading): Promise<{
  prediction: MlPredictApiResponse;
  mlDetails: MlEnsembleDetails;
}> {
  const res = await fetch('/api/ml/predict', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      type: reading.type,
      airTempK: reading.airTempK,
      processTempK: reading.processTempK,
      rpm: reading.rpm,
      torqueNm: reading.torqueNm,
      toolWearMin: reading.toolWearMin,
    }),
  });

  if (res.status === 401) {
    notifyUnauthorized();
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('Unexpected response from ML prediction API. Please reload and sign in again.');
  }
  const data = (await res.json().catch(() => ({}))) as { prediction?: MlPredictApiResponse; error?: string };
  if (!res.ok || !data.prediction) {
    throw new Error(data.error || 'Trained Random Forest API request failed.');
  }

  const p = data.prediction;
  const mlDetails: MlEnsembleDetails = Object.freeze({
    modelType: p.modelType,
    probability: p.probability,
    treeVotesPositive: p.treeVotesPositive,
    totalTrees: p.totalTrees,
    thresholdUsed: p.thresholdUsed,
    lowRiskLimit: p.lowRiskLimit,
    criticalRiskLimit: p.criticalRiskLimit,
    latencyMs: p.latencyMs,
  });

  return { prediction: p, mlDetails };
}
