import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { ThemedText } from './ThemedText';

export type StatBadgeVariant = 'cyan' | 'orange' | 'gold';

export interface StatBadgeProps {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  variant?: StatBadgeVariant;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const StatBadge: React.FC<StatBadgeProps> = ({
  icon,
  label,
  value,
  variant = 'cyan',
  style,
  testID,
}) => {
  const accentColor = colors.brand[variant];

  return (
    <View testID={testID} style={[styles.container, style]}>
      {icon ? (
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={18} color={accentColor} />
        </View>
      ) : null}
      <View style={styles.content}>
        <ThemedText variant="statLabel" style={styles.label}>
          {label.toUpperCase()}
        </ThemedText>
        <ThemedText
          variant="statValue"
          color={accentColor}
          style={styles.value}
        >
          {value}
        </ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.cardGlass,
    borderRadius: spacing.radii.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing.space.md,
    paddingVertical: spacing.space.xs,
    minHeight: spacing.touchTarget.minHeight,
  },
  iconContainer: {
    marginRight: spacing.space.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 18,
    lineHeight: 22,
    marginTop: 1,
  },
});
