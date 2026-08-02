export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  /** Large content panels / auth cards — equal on all corners */
  card: 24,
  round: 999,
  pill: 999,
} as const;

/** @deprecated Use `radii.card` — kept as a uniform alias for older imports. */
export const cardRadius = radii.card;
