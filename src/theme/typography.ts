import { Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { OpenSans_400Regular, OpenSans_700Bold } from '@expo-google-fonts/open-sans';
import { RobotoMono_500Medium } from '@expo-google-fonts/roboto-mono';

const fallbackSans = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'sans-serif',
});

const fallbackMono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const fontFamilies = {
  title: 'Orbitron_700Bold',
  body: 'OpenSans_400Regular',
  bodyBold: 'OpenSans_700Bold',
  mono: 'RobotoMono_500Medium',
  fallbackSans,
  fallbackMono,
} as const;

export const fontSizes = {
  display: 28,
  title: 20,
  subtitle: 16,
  body: 14,
  caption: 12,
  statLabel: 12,
  statValue: 24,
} as const;

export const lineHeights = {
  display: 34,
  title: 26,
  subtitle: 22,
  body: 20,
  caption: 16,
  statLabel: 16,
  statValue: 28,
} as const;

export const letterSpacings = {
  display: 1.5,
  title: 1.2,
  subtitle: 0.5,
  body: 0,
  caption: 0.4,
  statLabel: 1.0,
  statValue: 1.0,
} as const;

export const typography = {
  families: fontFamilies,
  sizes: fontSizes,
  lineHeights,
  letterSpacings,
} as const;

export type TypographyTokens = typeof typography;

export function useThemeFonts() {
  return useFonts({
    Orbitron_700Bold,
    OpenSans_400Regular,
    OpenSans_700Bold,
    RobotoMono_500Medium,
  });
}
