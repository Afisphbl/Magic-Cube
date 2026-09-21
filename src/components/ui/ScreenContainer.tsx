import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export interface ScreenContainerProps {
  safeAreaEdges?: Edge[];
  backgroundColor?: string;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  safeAreaEdges = ['top', 'bottom', 'left', 'right'],
  backgroundColor = colors.background.primary,
  scrollable = false,
  style,
  contentContainerStyle,
  children,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Responsive guard: scale horizontal base padding down to 8 on narrow devices
  const horizontalPadding = width < 380 ? spacing.space.sm : spacing.space.base;

  const insetPadding: ViewStyle = {
    paddingTop: safeAreaEdges.includes('top') ? insets.top : 0,
    paddingBottom: safeAreaEdges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: (safeAreaEdges.includes('left') ? insets.left : 0) + horizontalPadding,
    paddingRight: (safeAreaEdges.includes('right') ? insets.right : 0) + horizontalPadding,
  };

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    ...insetPadding,
  };

  return (
    <View testID={testID} style={[styles.root, { backgroundColor }]}>
      <StatusBar style="light" translucent />
      {scrollable ? (
        <ScrollView
          style={[styles.root, style]}
          contentContainerStyle={[containerStyle, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[containerStyle, style]}>{children}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
