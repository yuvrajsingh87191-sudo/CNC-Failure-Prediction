import { RiskLevel } from '../types/domain';

/**
 * Mirrors RiskLevel.java from the SE Report (Appendix A).
 * LOW: below 30%, MEDIUM: 30% to below 50%, HIGH: 50% or more.
 */
export const RISK_ADVICE: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: 'No action needed.',
  [RiskLevel.MEDIUM]: 'Keep monitoring this machine.',
  [RiskLevel.HIGH]: 'Schedule an inspection before the next run.',
};

export function riskLevelFromPercent(percent: number): RiskLevel {
  if (percent >= 50) return RiskLevel.HIGH;
  if (percent >= 30) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

export function getRiskAdvice(level: RiskLevel): string {
  return RISK_ADVICE[level];
}

export function formatPredictionHeadline(riskPercent: number, failureExpected: boolean): string {
  const rounded = Math.round(riskPercent);
  return failureExpected ? `FAILURE RISK ${rounded}%` : `NO FAILURE · RISK ${rounded}%`;
}
