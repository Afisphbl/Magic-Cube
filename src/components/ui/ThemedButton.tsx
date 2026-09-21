import React from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export type ThemedButtonVariant =
  | 'primary-cyan'
  | 'action-orange'
  | 'outline'
  | 'ghost';

export type ThemedButtonSize = 'sm' | 'md' | 'lg';

export interface ThemedButtonProps {
  variant?: ThemedButtonVariant;
  size?: ThemedButtonSize;
  label: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  variant = 'primary-cyan',
  size = 'md',
  label,
  icon,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  testID,
}) => {
  const isInteractive = !disabled && !loading;

  const sizeStyle = sizeStyles[size];
  const labelSizeStyle = labelSizeStyles[size];

  const renderContent = () => (
    <View style={styles.innerContent}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary-cyan' || variant === 'action-orange'
              ? colors.text.inverse
              : colors.brand.cyan
          }
        />
      ) : (
        <>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          <Text
            style={[
              styles.baseLabel,
              labelSizeStyle,
              variantLabelStyles[variant],
              disabled && styles.disabledLabel,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </View>
  );

  const containerBaseStyle: ViewStyle = {
    ...styles.baseContainer,
    ...sizeStyle,
    ...(fullWidth ? styles.fullWidth : {}),
    ...(disabled ? { opacity: spacing.opacity.disabled } : {}),
  };

  if (variant === 'primary-cyan') {
    return (
      <Pressable
        testID={testID}
        onPress={isInteractive ? onPress : undefined}
        disabled={!isInteractive}
        accessibilityRole="button"
        accessibilityState={{ disabled: !isInteractive }}
        style={({ pressed }) => [
          containerBaseStyle,
          pressed && isInteractive && { opacity: spacing.opacity.pressed },
          style,
        ]}
      >
        <LinearGradient
          colors={colors.gradients.primaryCyan.colors as [string, string, ...string[]]}
          start={colors.gradients.primaryCyan.start}
          end={colors.gradients.primaryCyan.end}
          style={[StyleSheet.absoluteFill, styles.gradientFill]}
        />
        {renderContent()}
      </Pressable>
    );
  }

  if (variant === 'action-orange') {
    return (
      <Pressable
        testID={testID}
        onPress={isInteractive ? onPress : undefined}
        disabled={!isInteractive}
        accessibilityRole="button"
        accessibilityState={{ disabled: !isInteractive }}
        style={({ pressed }) => [
          containerBaseStyle,
          pressed && isInteractive && { opacity: spacing.opacity.pressed },
          style,
        ]}
      >
        <LinearGradient
          colors={colors.gradients.actionOrange.colors as [string, string, ...string[]]}
          start={colors.gradients.actionOrange.start}
          end={colors.gradients.actionOrange.end}
          style={[StyleSheet.absoluteFill, styles.gradientFill]}
        />
        {renderContent()}
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive }}
      style={({ pressed }) => [
        containerBaseStyle,
        variantContainerStyles[variant],
        pressed && isInteractive && { opacity: spacing.opacity.pressed },
        style,
      ]}
    >
      {renderContent()}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    minWidth: spacing.touchTarget.minWidth,
    minHeight: spacing.touchTarget.minHeight,
    borderRadius: spacing.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradientFill: {
    borderRadius: spacing.radii.md,
  },
  innerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: spacing.space.sm,
  },
  baseLabel: {
    fontFamily: typography.families.title,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  disabledLabel: {
    opacity: 0.8,
  },
  fullWidth: {
    width: '100%',
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    height: 44,
    paddingHorizontal: spacing.space.md,
  },
  md: {
    height: 48,
    paddingHorizontal: spacing.space.lg,
  },
  lg: {
    height: 56,
    paddingHorizontal: spacing.space.xl,
  },
});

const labelSizeStyles = StyleSheet.create({
  sm: {
    fontSize: typography.sizes.caption,
  },
  md: {
    fontSize: typography.sizes.body,
  },
  lg: {
    fontSize: typography.sizes.subtitle,
  },
});

const variantContainerStyles = StyleSheet.create({
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border.active,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
});

const variantLabelStyles = StyleSheet.create({
  'primary-cyan': {
    color: colors.text.inverse,
    fontFamily: typography.families.title,
  },
  'action-orange': {
    color: colors.text.inverse,
    fontFamily: typography.families.title,
  },
  outline: {
    color: colors.brand.cyan,
  },
  ghost: {
    color: colors.text.secondary,
  },
});
