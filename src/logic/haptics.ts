import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export async function triggerHapticFeedback(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return;
  }

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Fail silently when device does not support haptics or runs in a headless environment
  }
}

export async function triggerVictoryHaptic(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return;
  }

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Fail silently when device does not support haptics or runs in a headless environment
  }
}

