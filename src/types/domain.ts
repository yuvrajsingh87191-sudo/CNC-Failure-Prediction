export type ProductTypeCode = 'L' | 'M' | 'H';

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export type FieldName =
  | 'Type'
  | 'Air temperature'
  | 'Process temperature'
  | 'Rotational speed'
  | 'Torque'
  | 'Tool wear';

export interface InputForm {
  type: string;
  airTemp: string;
  processTemp: string;
  rpm: string;
  torque: string;
  toolWear: string;
}

export interface SensorReading {
  readonly type: ProductTypeCode;
  readonly airTempK: number;
  readonly processTempK: number;
  readonly rpm: number;
  readonly torqueNm: number;
  readonly toolWearMin: number;
}

export interface FactorAssessment {
  readonly id: 'overstrain' | 'toolWear' | 'power' | 'heatDissipation';
  readonly label: string;
  readonly datasetCode: 'OSF' | 'TWF' | 'PWF' | 'HDF';
  readonly proximity: number;
  readonly breached: boolean;
  readonly riskContributionPercent: number;
  readonly summary: string;
}

export type PredictorMode = 'ml-model' | 'rule-based-prototype';

export interface MlEnsembleDetails {
  readonly modelType: string;
  readonly probability: number;
  readonly treeVotesPositive: number;
  readonly totalTrees: number;
  readonly thresholdUsed: number;
  readonly lowRiskLimit: number;
  readonly criticalRiskLimit: number;
  readonly latencyMs: number;
}

export interface Prediction {
  readonly riskPercent: number;
  readonly failureExpected: boolean;
  readonly level: RiskLevel;
  readonly advice: string;
  readonly headline: string;
  readonly predictorName: string;
  readonly predictorKind: PredictorMode;
  readonly factors: readonly FactorAssessment[];
  readonly derivedMetrics: {
    readonly temperatureGapK: number;
    readonly powerWatts: number;
    readonly overstrainProduct: number;
    readonly overstrainLimit: number;
  };
  readonly mlDetails?: MlEnsembleDetails;
}

export interface PredictionRecord {
  readonly id: string;
  readonly timestamp: string; // ISO-8601
  readonly reading: SensorReading;
  readonly prediction: Prediction;
}

export interface ValidationResult {
  readonly reading: SensorReading | null;
  readonly errors: Partial<Record<FieldName, string>>;
  readonly isValid: boolean;
}

export type NavSectionId =
  | 'dashboard'
  | 'predict'
  | 'history'
  | 'analytics'
  | 'ai-intelligence'
  | 'model-performance'
  | 'testing'
  | 'traceability'
  | 'architecture'
  | 'documentation'
  | 'settings';

export type UserPersona = 'Maintenance Engineer' | 'Production Supervisor';

export interface ModelMetricsConfig {
  recall: number | null;
  precision: number | null;
  f1Score: number | null;
  prAuc: number | null;
  selectedModel: string | null;
  lastUpdated: string | null;
}

export interface OptimizedModelConfig {
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

export interface TrainedModelInfo {
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
  config: OptimizedModelConfig;
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
}
