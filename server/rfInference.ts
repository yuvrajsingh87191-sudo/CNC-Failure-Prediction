import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CompactTree {
  f: number[];
  t: number[];
  l: number[];
  r: number[];
}

export interface EvalMetrics {
  threshold: number;
  recall: number;
  precision: number;
  f1: number;
  accuracy: number;
  prAuc: number;
  rocAuc: number;
  confusionMatrix: {
    tp: number;
    fp: number;
    tn: number;
    fn: number;
  };
}

export interface ModelBenchmarkEntry extends EvalMetrics {
  id: string;
  name: string;
  role: string;
  isSelected: boolean;
}

export interface FeatureImportanceEntry {
  key: string;
  label: string;
  importance: number;
}

export interface TrainedRandomForestArtifact {
  schemaVersion: string;
  trainedAt: string;
  trainingDurationMs: number;
  sourceModelSpecFile?: string;
  sourceDataset: {
    fileName: string;
    totalRows: number;
    totalFailures: number;
    failureRatePercent: number;
    missingValues: number;
    trainRows: number;
    trainFailures: number;
    testRows: number;
    testFailures: number;
    failureModeCounts: {
      TWF: number;
      HDF: number;
      PWF: number;
      OSF: number;
      RNF: number;
    };
    productTypeCounts: {
      L: number;
      M: number;
      H: number;
    };
  };
  config: {
    model_type: string;
    hyperparameters: {
      n_estimators: number;
      max_depth: number | null;
      min_samples_split: number;
      min_samples_leaf?: number;
      class_weight?: string | null;
      criterion?: string;
      max_features?: string;
      bootstrap?: boolean;
      random_state: number;
    };
    features: string[];
    optimized_threshold: number;
    risk_thresholds: {
      low_risk_limit: number;
      critical_risk_limit: number;
    };
  };
  modelSummary: {
    totalTrees: number;
    totalNodes: number;
    avgNodesPerTree: number;
    maxFeaturesPerSplit: number;
    splitCriterion: string;
    bootstrap: boolean;
    classWeight?: string;
  };
  featureImportances: FeatureImportanceEntry[];
  evaluation: {
    activeThreshold: number;
    heldOutTest: EvalMetrics;
    atDefaultThreshold: EvalMetrics;
    benchmarks: ModelBenchmarkEntry[];
  };
  trees: CompactTree[];
}

export interface MlPredictInput {
  type: 'L' | 'M' | 'H';
  airTempK: number;
  processTempK: number;
  rpm: number;
  torqueNm: number;
  toolWearMin: number;
}

export interface MlPredictResponse {
  modelType: string;
  predictorName: string;
  probability: number;
  riskPercent: number;
  failureExpected: boolean;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  advice: string;
  headline: string;
  treeVotesPositive: number;
  totalTrees: number;
  thresholdUsed: number;
  lowRiskLimit: number;
  criticalRiskLimit: number;
  latencyMs: number;
}

let cachedArtifact: TrainedRandomForestArtifact | null = null;

function loadArtifact(): TrainedRandomForestArtifact {
  if (cachedArtifact) return cachedArtifact;
  const artifactPath = path.resolve(__dirname, 'trained_random_forest.json');
  const raw = fs.readFileSync(artifactPath, 'utf-8');
  cachedArtifact = JSON.parse(raw) as TrainedRandomForestArtifact;
  return cachedArtifact;
}

export function isTrainedModelAvailable(): boolean {
  try {
    loadArtifact();
    return true;
  } catch {
    return false;
  }
}

export function getTrainedModelInfo(): Omit<TrainedRandomForestArtifact, 'trees'> {
  const artifact = loadArtifact();
  const { trees: _trees, ...publicInfo } = artifact;
  return publicInfo;
}

function predictSingleTree(tree: CompactTree, features: readonly number[]): number {
  let node = 0;
  while (tree.f[node] !== -1) {
    const featIdx = tree.f[node];
    node = features[featIdx] <= tree.t[node] ? tree.l[node] : tree.r[node];
  }
  return tree.t[node];
}

export function predictWithRandomForest(input: MlPredictInput): MlPredictResponse {
  const t0 = performance.now();
  const artifact = loadArtifact();
  const { trees, config } = artifact;

  // Feature order matches config.features:
  // ["Temperature_Air", "Temperature_Process", "Rotational_Speed", "Torque", "Tool_Wear"]
  const featureVector = [
    input.airTempK,
    input.processTempK,
    input.rpm,
    input.torqueNm,
    input.toolWearMin,
  ];

  let probSum = 0;
  let positiveTreeVotes = 0;

  for (let i = 0; i < trees.length; i++) {
    const pTree = predictSingleTree(trees[i], featureVector);
    probSum += pTree;
    if (pTree >= 0.5) {
      positiveTreeVotes++;
    }
  }

  const probability = Math.round((probSum / trees.length) * 10000) / 10000;
  const riskPercent = Math.round(probability * 1000) / 10;

  const lowLimit = config.risk_thresholds.low_risk_limit;
  const criticalLimit = config.optimized_threshold;

  const failureExpected = probability >= criticalLimit;
  const level: 'LOW' | 'MEDIUM' | 'HIGH' =
    probability >= criticalLimit
      ? 'HIGH'
      : probability >= lowLimit
      ? 'MEDIUM'
      : 'LOW';

  const advice =
    level === 'HIGH'
      ? `Inspect machine before next job (RF probability ${riskPercent.toFixed(1)}% >= ${Math.round(criticalLimit * 100)}% tuned threshold)`
      : level === 'MEDIUM'
      ? `Keep monitoring closely (RF probability between ${Math.round(lowLimit * 100)}% and ${Math.round(criticalLimit * 100)}%)`
      : 'No action needed';

  const rounded = Math.round(riskPercent);
  const headline = failureExpected
    ? `FAILURE — ${rounded}% risk`
    : `NO FAILURE — ${rounded}% risk`;

  const latencyMs = Math.round((performance.now() - t0) * 100) / 100;

  return {
    modelType: config.model_type,
    predictorName: `RandomForestClassifier (${trees.length} trees · τ=${criticalLimit.toFixed(2)})`,
    probability,
    riskPercent,
    failureExpected,
    level,
    advice,
    headline,
    treeVotesPositive: positiveTreeVotes,
    totalTrees: trees.length,
    thresholdUsed: criticalLimit,
    lowRiskLimit: lowLimit,
    criticalRiskLimit: config.risk_thresholds.critical_risk_limit,
    latencyMs,
  };
}
