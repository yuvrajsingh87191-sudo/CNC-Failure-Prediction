import { Prediction, SensorReading } from '../types/domain';

/**
 * Mirrors FailurePredictor.java from the SE Report (Section 3.4, 3.7, Appendix A).
 * The single seam between the application and any prediction model.
 * RuleBasedPredictor implements this interface for the prototype;
 * MlModelPredictor will implement the exact same interface once exported.
 */
export interface FailurePredictor {
  readonly name: string;
  readonly kind: 'rule-based-prototype' | 'ml-model';
  readonly description: string;
  predict(reading: SensorReading): Prediction;
}
