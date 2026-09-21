export interface GradientDef {
  colors: [string, string, ...string[]];
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export const CUBE_FACE_COLORS = [
  '#FFFFFF', // 0: White (Up / +Y)
  '#FFD700', // 1: Gold / Yellow (Down / -Y)
  '#FF1744', // 2: Neon Red (Right / +X)
  '#FF8C00', // 3: Orange (Left / -X)
  '#00E5FF', // 4: Electric Blue (Front / +Z)
  '#00E676', // 5: Emerald Green (Back / -Z)
] as const;

export const FACE_COLORS = CUBE_FACE_COLORS;

export const PLASTIC_COLOR = '#0A0E17';

export const colors = {
  background: {
    primary: '#070F1E',
    card: '#0D1E36',
    cardGlass: 'rgba(13, 30, 54, 0.85)',
  },
  surface: {
    primary: '#0D1E36',
    elevated: '#132746',
    glass: 'rgba(13, 30, 54, 0.85)',
  },
  brand: {
    cyan: '#00E5FF',
    orange: '#FF8C00',
    gold: '#FFD700',
  },
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',
    inverse: '#070F1E',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.08)',
    active: '#00E5FF',
    cyanGlow: 'rgba(0, 229, 255, 0.35)',
    orangeGlow: 'rgba(255, 140, 0, 0.35)',
  },
  cubeFaceColors: CUBE_FACE_COLORS,
  plasticColor: PLASTIC_COLOR,
  gradients: {
    primaryCyan: {
      colors: ['#00E5FF', '#0284C7'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    } as GradientDef,
    actionOrange: {
      colors: ['#FFD700', '#FF8C00'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    } as GradientDef,
    glassCard: {
      colors: ['rgba(13, 30, 54, 0.85)', 'rgba(7, 15, 30, 0.65)'],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    } as GradientDef,
  },
} as const;

export type ColorTokens = typeof colors;
