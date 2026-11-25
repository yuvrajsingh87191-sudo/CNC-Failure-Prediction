import { InputForm, Prediction, PredictionRecord, PredictorMode } from '../types/domain';
import { InvalidInputException } from '../models/InvalidInputException';
import { InputValidator } from './InputValidator';
import { FailurePredictor } from './FailurePredictor';
import { RuleBasedPredictor } from './RuleBasedPredictor';
import { IPredictionRepository, LocalStoragePredictionRepository } from './PredictionRepository';
import { predictWithMlApi } from './mlModelService';

/**
 * Mirrors PredictionService.java from the SE Report (Section 3.4, 5.2, Appendix A).
 * Orchestrates: validate -> predict -> store.
 * Preserves synchronous RuleBasedPredictor execution for SE tests AND supports
 * the live trained RandomForestClassifier API behind the pluggable predictor seam.
 */
export class PredictionService {
  private readonly validator: InputValidator;
  private readonly predictor: FailurePredictor;
  private readonly repository: IPredictionRepository;

  constructor(
    validator: InputValidator,
    predictor: FailurePredictor,
    repository: IPredictionRepository
  ) {
    this.validator = validator;
    this.predictor = predictor;
    this.repository = repository;
  }

  public predict(form: InputForm): PredictionRecord {
    const validation = this.validator.validate(form);
    if (!validation.isValid || !validation.reading) {
      throw new InvalidInputException(validation.errors);
    }

    const prediction = this.predictor.predict(validation.reading);
    return this.storePrediction(validation.reading, prediction);
  }

  public async predictWithMode(form: InputForm, mode: PredictorMode): Promise<PredictionRecord> {
    const validation = this.validator.validate(form);
    if (!validation.isValid || !validation.reading) {
      throw new InvalidInputException(validation.errors);
    }

    const reading = validation.reading;
    const physicsBaseline = this.predictor.predict(reading);

    if (mode === 'rule-based-prototype') {
      return this.storePrediction(reading, physicsBaseline);
    }

    // Live ML inference via /api/ml/predict (150-tree RandomForestClassifier trained on AI4I 2020)
    const { prediction: mlRes, mlDetails } = await predictWithMlApi(reading);

    const mlPrediction: Prediction = Object.freeze({
      riskPercent: mlRes.riskPercent,
      failureExpected: mlRes.failureExpected,
      level: mlRes.level,
      advice: mlRes.advice,
      headline: mlRes.headline,
      predictorName: mlRes.predictorName,
      predictorKind: 'ml-model',
      factors: physicsBaseline.factors,
      derivedMetrics: physicsBaseline.derivedMetrics,
      mlDetails,
    });

    return this.storePrediction(reading, mlPrediction);
  }

  private storePrediction(
    reading: PredictionRecord['reading'],
    prediction: Prediction
  ): PredictionRecord {
    const id = `PRD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const record: PredictionRecord = Object.freeze({
      id,
      timestamp: new Date().toISOString(),
      reading,
      prediction,
    });

    this.repository.add(record);
    return record;
  }

  public history(): PredictionRecord[] {
    return this.repository.findAll();
  }

  public count(): number {
    return this.repository.count();
  }

  public clearHistory(): void {
    this.repository.clear();
  }

  public getPredictorInfo(mode: PredictorMode = 'ml-model'): {
    name: string;
    kind: PredictorMode;
    description: string;
  } {
    if (mode === 'ml-model') {
      return {
        name: 'RandomForestClassifier (150 trees · τ=0.26)',
        kind: 'ml-model',
        description:
          'Trained 150-tree Random Forest classifier fitted on the stratified 80% AI4I 2020 training split (seed 42, min_samples_split=5, max_depth=null) with calibrated 0.15 / 0.26 risk thresholds, served via /api/ml/predict.',
      };
    }
    return {
      name: this.predictor.name,
      kind: this.predictor.kind,
      description: this.predictor.description,
    };
  }
}

let singletonService: PredictionService | null = null;

export function getDefaultPredictionService(): PredictionService {
  if (!singletonService) {
    singletonService = new PredictionService(
      new InputValidator(),
      new RuleBasedPredictor(),
      new LocalStoragePredictionRepository()
    );
  }
  return singletonService;
}
