import { FactorAssessment, Prediction, SensorReading } from '../types/domain';
import { getOverstrainLimit } from '../models/ProductType';
import { formatPredictionHeadline, getRiskAdvice, riskLevelFromPercent } from '../models/RiskLevel';
import { FailurePredictor } from './FailurePredictor';

/**
 * Mirrors RuleBasedPredictor.java from the SE Report (Section 3.5 & Appendix A).
 * Scores proximity p to each documented AI4I 2020 failure rule and reports the worst case.
 * Stand-in prototype predictor until the trained ML model is connected via MlModelPredictor.
 */
export class RuleBasedPredictor implements FailurePredictor {
  public static readonly FAILURE_THRESHOLD = 0.50;
  public static readonly TOOL_WEAR_LIMIT_MIN = 200;
  public static readonly HEAT_DIFF_LIMIT_K = 8.6;
  public static readonly HEAT_RPM_LIMIT = 1380;
  public static readonly POWER_LOW_W = 3500;
  public static readonly POWER_HIGH_W = 9000;

  public readonly name = 'RuleBasedPredictor (Prototype Stand-In)';
  public readonly kind = 'rule-based-prototype' as const;
  public readonly description =
    'Transparent rule-based predictor implementing documented AI4I 2020 physical proximity rules (OSF, TWF, PWF, HDF). Designed to be replaced by MlModelPredictor.';

  public predict(r: SensorReading): Prediction {
    const powerWatts = (r.torqueNm * r.rpm * 2 * Math.PI) / 60.0;
    const tempGapK = r.processTempK - r.airTempK;
    const overstrainLimit = getOverstrainLimit(r.type);
    const overstrainProduct = r.toolWearMin * r.torqueNm;

    const overstrainP = overstrainProduct / overstrainLimit;
    const toolWearP = r.toolWearMin / RuleBasedPredictor.TOOL_WEAR_LIMIT_MIN;
    const powerP =
      powerWatts <= 0
        ? 10
        : Math.max(
            RuleBasedPredictor.POWER_LOW_W / powerWatts,
            powerWatts / RuleBasedPredictor.POWER_HIGH_W
          );
    const heatP = Math.min(
      RuleBasedPredictor.HEAT_DIFF_LIMIT_K / tempGapK,
      RuleBasedPredictor.HEAT_RPM_LIMIT / r.rpm
    );

    const overstrainBreached = overstrainP > 1;
    const toolWearBreached = toolWearP >= 1;
    const powerBreached = powerP > 1;
    const heatBreached = heatP > 1;

    const overstrainScore = RuleBasedPredictor.score(overstrainP, overstrainBreached);
    const toolWearScore = RuleBasedPredictor.score(toolWearP, toolWearBreached);
    const powerScore = RuleBasedPredictor.score(powerP, powerBreached);
    const heatScore = RuleBasedPredictor.score(heatP, heatBreached);

    const risk = Math.max(0, overstrainScore, toolWearScore, powerScore, heatScore);
    const riskPercent = Math.round(risk * 1000) / 10.0;
    const failureExpected = risk >= RuleBasedPredictor.FAILURE_THRESHOLD;
    const level = riskLevelFromPercent(riskPercent);
    const advice = getRiskAdvice(level);
    const headline = formatPredictionHeadline(riskPercent, failureExpected);

    const factors: FactorAssessment[] = [
      {
        id: 'overstrain',
        label: 'Overstrain',
        datasetCode: 'OSF',
        proximity: overstrainP,
        breached: overstrainBreached,
        riskContributionPercent: Math.round(overstrainScore * 1000) / 10.0,
        summary: `${Math.round(overstrainProduct).toLocaleString()} / ${overstrainLimit.toLocaleString()} min·Nm (Type ${r.type})`,
      },
      {
        id: 'toolWear',
        label: 'Tool Wear',
        datasetCode: 'TWF',
        proximity: toolWearP,
        breached: toolWearBreached,
        riskContributionPercent: Math.round(toolWearScore * 1000) / 10.0,
        summary: `${r.toolWearMin} / ${RuleBasedPredictor.TOOL_WEAR_LIMIT_MIN} min limit`,
      },
      {
        id: 'power',
        label: 'Power Envelope',
        datasetCode: 'PWF',
        proximity: powerP,
        breached: powerBreached,
        riskContributionPercent: Math.round(powerScore * 1000) / 10.0,
        summary: `${Math.round(powerWatts).toLocaleString()} W (safe: 3,500–9,000 W)`,
      },
      {
        id: 'heatDissipation',
        label: 'Heat Dissipation',
        datasetCode: 'HDF',
        proximity: heatP,
        breached: heatBreached,
        riskContributionPercent: Math.round(heatScore * 1000) / 10.0,
        summary: `ΔT ${tempGapK.toFixed(1)} K (min 8.6 K) · ${r.rpm} rpm (min 1,380)`,
      },
    ];

    return Object.freeze({
      riskPercent,
      failureExpected,
      level,
      advice,
      headline,
      predictorName: this.name,
      predictorKind: this.kind,
      factors,
      derivedMetrics: {
        temperatureGapK: Number(tempGapK.toFixed(2)),
        powerWatts: Math.round(powerWatts),
        overstrainProduct: Math.round(overstrainProduct),
        overstrainLimit,
      },
    });
  }

  /**
   * Exact scoring formula from RuleBasedPredictor.java:
   * p = 1 means exactly on the rule's limit. Returns risk between 0 and 0.99.
   */
  public static score(p: number, breached: boolean): number {
    if (breached) {
      return 0.80 + 0.19 * Math.min(1.0, (p - 1) * 5);
    }
    const q = Math.max(0, (p - 0.7) / 0.3);
    return 0.6 * q * q;
  }
}
