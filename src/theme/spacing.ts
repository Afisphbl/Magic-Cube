export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 9999,
} as const;

export const opacity = {
  default: 1.0,
  pressed: 0.8,
  disabled: 0.4,
} as const;

export const touchTarget = {
  minWidth: 44,
  minHeight: 44,
} as const;

export const spacing = {
  space,
  radii,
  opacity,
  touchTarget,
} as const;

export type SpacingTokens = typeof spacing;
export type SpacingKey = keyof typeof space;
export type RadiiKey = keyof typeof radii;
