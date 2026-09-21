import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CubeCanvas } from '../src/components/CubeCanvas';
import { GameOverlay } from '../src/components/GameOverlay';
import { colors } from '../src/theme/colors';

export default function GameScreen() {
  return (
    <View style={styles.container}>
      <CubeCanvas />
      <GameOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});
