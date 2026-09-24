import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme/colors';
import { useThemeFonts } from '../src/theme/typography';
import { useCubeStore } from '../src/store/useCubeStore';

export default function RootLayout() {
  useThemeFonts();
  const loadTopRecords = useCubeStore((state) => state.loadTopRecords);

  useEffect(() => {
    loadTopRecords();
  }, [loadTopRecords]);

  return (
    <>
      <StatusBar style="light" translucent />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.primary },
        }}
      />
    </>
  );
}
