import { FieldName, InputForm, SensorReading, ValidationResult } from '../types/domain';
import { parseProductType } from '../models/ProductType';

/**
 * Mirrors InputValidator.java from the SE Report (Section 2.7, 3.9, Appendix A).
 * Checks every field, collects all problems at once, and never throws on bad text.
 */
export const VALIDATION_RANGES = {
  AIR_MIN: 290,
  AIR_MAX: 310,
  PROCESS_MIN: 300,
  PROCESS_MAX: 320,
  RPM_MIN: 500,
  RPM_MAX: 4000,
  TORQUE_MIN: 1,
  TORQUE_MAX: 100,
  WEAR_MIN: 0,
  WEAR_MAX: 300,
} as const;

export const FIELD_KEYS: Record<string, FieldName> = {
  TYPE: 'Type',
  AIR: 'Air temperature',
  PROCESS: 'Process temperature',
  RPM: 'Rotational speed',
  TORQUE: 'Torque',
  WEAR: 'Tool wear',
};

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

function parseStrictDecimal(raw: string): number | null {
  const trimmed = raw.trim();
  // Explicitly reject NaN, Infinity, hex, or trailing garbage
  if (/^(nan|[+-]?infinity)$/i.test(trimmed)) return null;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  return num;
}

function parseStrictWholeNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) return null;
  const num = Number(trimmed);
  if (!Number.isSafeInteger(num)) return null;
  return num;
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

export class InputValidator {
  public validate(form: InputForm): ValidationResult {
    const errors: Partial<Record<FieldName, string>> = {};

    const type = parseProductType(form.type);
    if (isBlank(form.type)) {
      errors['Type'] = 'Type is required.';
    } else if (type === null) {
      errors['Type'] = 'Type must be L, M or H.';
    }

    const air = this.validateDecimal(
      'Air temperature',
      form.airTemp,
      VALIDATION_RANGES.AIR_MIN,
      VALIDATION_RANGES.AIR_MAX,
      'K',
      errors
    );

    const process = this.validateDecimal(
      'Process temperature',
      form.processTemp,
      VALIDATION_RANGES.PROCESS_MIN,
      VALIDATION_RANGES.PROCESS_MAX,
      'K',
      errors
    );

    const rpm = this.validateWhole(
      'Rotational speed',
      form.rpm,
      VALIDATION_RANGES.RPM_MIN,
      VALIDATION_RANGES.RPM_MAX,
      'rpm',
      errors
    );

    const torque = this.validateDecimal(
      'Torque',
      form.torque,
      VALIDATION_RANGES.TORQUE_MIN,
      VALIDATION_RANGES.TORQUE_MAX,
      'Nm',
      errors
    );

    const wear = this.validateWhole(
      'Tool wear',
      form.toolWear,
      VALIDATION_RANGES.WEAR_MIN,
      VALIDATION_RANGES.WEAR_MAX,
      'min',
      errors
    );

    if (air !== null && process !== null && process <= air) {
      errors['Process temperature'] = 'Process temperature must be higher than air temperature.';
    }

    const isValid = Object.keys(errors).length === 0;
    if (!isValid || type === null || air === null || process === null || rpm === null || torque === null || wear === null) {
      return { reading: null, errors, isValid: false };
    }

    const reading: SensorReading = Object.freeze({
      type,
      airTempK: air,
      processTempK: process,
      rpm,
      torqueNm: torque,
      toolWearMin: wear,
    });

    return { reading, errors, isValid: true };
  }

  private validateDecimal(
    name: FieldName,
    raw: string,
    min: number,
    max: number,
    unit: string,
    errors: Partial<Record<FieldName, string>>
  ): number | null {
    if (isBlank(raw)) {
      errors[name] = `${name} is required.`;
      return null;
    }
    const parsed = parseStrictDecimal(raw);
    if (parsed === null) {
      errors[name] = `${name} must be a number.`;
      return null;
    }
    if (parsed < min || parsed > max) {
      errors[name] = `${name} must be between ${formatNumber(min)} and ${formatNumber(max)} ${unit}.`;
      return null;
    }
    return parsed;
  }

  private validateWhole(
    name: FieldName,
    raw: string,
    min: number,
    max: number,
    unit: string,
    errors: Partial<Record<FieldName, string>>
  ): number | null {
    if (isBlank(raw)) {
      errors[name] = `${name} is required.`;
      return null;
    }
    const parsed = parseStrictWholeNumber(raw);
    if (parsed === null) {
      errors[name] = `${name} must be a whole number.`;
      return null;
    }
    if (parsed < min || parsed > max) {
      errors[name] = `${name} must be between ${min} and ${max} ${unit}.`;
      return null;
    }
    return parsed;
  }
}
