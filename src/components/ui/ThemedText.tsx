import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export type ThemedTextVariant =
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'caption'
  | 'statLabel'
  | 'statValue';

export interface ThemedTextProps extends TextProps {
  variant?: ThemedTextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  variant = 'body',
  color,
  align,
  style,
  children,
  ...rest
}) => {
  const variantStyle = styles[variant];
  const customStyle: TextStyle = {};

  if (color) {
    customStyle.color = color;
  }
  if (align) {
    customStyle.textAlign = align;
  }

  return (
    <Text
      style={[variantStyle, customStyle, style]}
      allowFontScaling
      {...rest}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  display: {
    fontFamily: typography.families.title,
    fontSize: typography.sizes.display,
    lineHeight: typography.lineHeights.display,
    letterSpacing: typography.letterSpacings.display,
    color: colors.text.primary,
  },
  title: {
    fontFamily: typography.families.title,
    fontSize: typography.sizes.title,
    lineHeight: typography.lineHeights.title,
    letterSpacing: typography.letterSpacings.title,
    color: colors.text.primary,
  },
  subtitle: {
    fontFamily: typography.families.bodyBold,
    fontSize: typography.sizes.subtitle,
    lineHeight: typography.lineHeights.subtitle,
    letterSpacing: typography.letterSpacings.subtitle,
    color: colors.text.secondary,
  },
  body: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.body,
    lineHeight: typography.lineHeights.body,
    letterSpacing: typography.letterSpacings.body,
    color: colors.text.primary,
  },
  caption: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.caption,
    lineHeight: typography.lineHeights.caption,
    letterSpacing: typography.letterSpacings.caption,
    color: colors.text.muted,
  },
  statLabel: {
    fontFamily: typography.families.bodyBold,
    fontSize: typography.sizes.statLabel,
    lineHeight: typography.lineHeights.statLabel,
    letterSpacing: typography.letterSpacings.statLabel,
    textTransform: 'uppercase',
    color: colors.text.secondary,
  },
  statValue: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.statValue,
    lineHeight: typography.lineHeights.statValue,
    letterSpacing: typography.letterSpacings.statValue,
    color: colors.brand.cyan,
  },
});
