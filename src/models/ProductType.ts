import { ProductTypeCode } from '../types/domain';

export interface ProductTypeSpec {
  readonly code: ProductTypeCode;
  readonly label: string;
  readonly overstrainLimit: number;
}

/**
 * Mirrors ProductType.java from the SE Report (Appendix A).
 * Each product quality variant carries its documented AI4I 2020 overstrain limit (min x Nm).
 */
export const PRODUCT_TYPES: Record<ProductTypeCode, ProductTypeSpec> = {
  L: { code: 'L', label: 'Low quality variant (L)', overstrainLimit: 11000 },
  M: { code: 'M', label: 'Medium quality variant (M)', overstrainLimit: 12000 },
  H: { code: 'H', label: 'High quality variant (H)', overstrainLimit: 13000 },
};

export const PRODUCT_TYPE_LIST: readonly ProductTypeSpec[] = [
  PRODUCT_TYPES.L,
  PRODUCT_TYPES.M,
  PRODUCT_TYPES.H,
];

export function getOverstrainLimit(code: ProductTypeCode): number {
  return PRODUCT_TYPES[code].overstrainLimit;
}

/**
 * Case-insensitive parse of "L", "M" or "H". Returns null if invalid.
 */
export function parseProductType(text: string | null | undefined): ProductTypeCode | null {
  if (text == null) return null;
  const normalized = text.trim().toUpperCase();
  if (normalized === 'L' || normalized === 'M' || normalized === 'H') {
    return normalized;
  }
  return null;
}
