import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing, SpacingKey } from '../../theme/spacing';

export type ThemedCardVariant = 'surface' | 'glass' | 'glow-cyan' | 'glow-orange';

export interface ThemedCardProps {
  variant?: ThemedCardVariant;
  padding?: SpacingKey | number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
}

export const ThemedCard: React.FC<ThemedCardProps> = ({
  variant = 'surface',
  padding = 'base',
  style,
  children,
  testID,
}) => {
  const resolvedPadding =
    typeof padding === 'number' ? padding : spacing.space[padding] ?? spacing.space.base;

  const contentPaddingStyle: ViewStyle = {
    padding: resolvedPadding,
  };

  if (variant === 'glass') {
    return (
      <View
        testID={testID}
        style={[styles.baseCard, styles.glassContainer, contentPaddingStyle, style]}
      >
        <LinearGradient
          colors={colors.gradients.glassCard.colors as [string, string, ...string[]]}
          start={colors.gradients.glassCard.start}
          end={colors.gradients.glassCard.end}
          style={[StyleSheet.absoluteFill, styles.gradientRadius]}
        />
        {children}
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.baseCard,
        variantStyles[variant],
        contentPaddingStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  baseCard: {
    borderRadius: spacing.radii.lg,
    overflow: 'hidden',
  },
  gradientRadius: {
    borderRadius: spacing.radii.lg,
  },
  glassContainer: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
});

const variantStyles = StyleSheet.create({
  surface: {
    backgroundColor: colors.surface.primary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  'glow-cyan': {
    backgroundColor: colors.surface.primary,
    borderWidth: 1.5,
    borderColor: colors.border.active,
    shadowColor: colors.brand.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  'glow-orange': {
    backgroundColor: colors.surface.primary,
    borderWidth: 1.5,
    borderColor: colors.brand.orange,
    shadowColor: colors.brand.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  glass: {},
});
