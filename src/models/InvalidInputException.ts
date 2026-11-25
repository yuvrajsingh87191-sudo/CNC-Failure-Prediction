import { FieldName } from '../types/domain';

/**
 * Mirrors InvalidInputException.java from the SE Report (Appendix A).
 * Carries a field-to-message map so all validation errors are reported together.
 */
export class InvalidInputException extends Error {
  public readonly fieldErrors: Partial<Record<FieldName, string>>;

  constructor(fieldErrors: Partial<Record<FieldName, string>>) {
    super(`Invalid input: ${Object.values(fieldErrors).join('; ')}`);
    this.name = 'InvalidInputException';
    this.fieldErrors = fieldErrors;
  }
}
