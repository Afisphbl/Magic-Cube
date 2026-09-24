import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCubeStore } from '../store/useCubeStore';
import { formatTimer } from '../logic/timer';
import { ThemedCard, ThemedText, ThemedButton, StatBadge } from './ui';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export interface PauseModalProps {
  testID?: string;
  isVisible?: boolean;
  timeText?: string;
  moveCount?: number;
  onResume?: () => void;
  onRestart?: () => void;
  onExit?: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  testID,
  isVisible: propIsVisible,
  timeText: propTimeText,
  moveCount: propMoveCount,
  onResume: propOnResume,
  onRestart: propOnRestart,
  onExit: propOnExit,
}) => {
  const storeIsPaused = useCubeStore((state) => state.isPaused);
  const storeAccumulatedTimeMs = useCubeStore((state) => state.accumulatedTimeMs);
  const storeMoveCount = useCubeStore((state) => state.moveCount);
  const resumeGame = useCubeStore((state) => state.resumeGame);
  const restartGame = useCubeStore((state) => state.restartGame);
  const exitToMainPage = useCubeStore((state) => state.exitToMainPage);

  const isVisible = propIsVisible !== undefined ? propIsVisible : storeIsPaused;
  const timeText = propTimeText !== undefined ? propTimeText : formatTimer(storeAccumulatedTimeMs);
  const moveCount = propMoveCount !== undefined ? propMoveCount : storeMoveCount;

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 7,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [isVisible, scaleAnim, opacityAnim]);

  if (!isVisible) {
    return null;
  }

  const handleResume = () => {
    if (propOnResume) {
      propOnResume();
    } else {
      resumeGame();
    }
  };

  const handleRestart = () => {
    if (propOnRestart) {
      propOnRestart();
    } else {
      restartGame();
    }
  };

  const handleExit = () => {
    if (propOnExit) {
      propOnExit();
    } else {
      exitToMainPage();
    }
  };

  return (
    <View
      testID={testID || 'pause-modal'}
      style={styles.backdrop}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
    >
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <ThemedCard variant="glass" style={styles.card}>
          <View style={styles.header}>
            <ThemedText variant="title" style={styles.title}>
              Game Paused
            </ThemedText>
            <ThemedText variant="caption" style={styles.subtitle}>
              Solve progress is frozen
            </ThemedText>
          </View>

          <View style={styles.statsRow}>
            <StatBadge
              icon="timer-outline"
              label="Time"
              value={timeText}
              variant="cyan"
              style={styles.statBadge}
            />
            <StatBadge
              icon="swap-vertical-outline"
              label="Moves"
              value={moveCount}
              variant="orange"
              style={styles.statBadge}
            />
          </View>

          <View style={styles.actions}>
            <ThemedButton
              variant="primary-cyan"
              label="Resume"
              icon={<Ionicons name="play" size={18} color="#070F1E" />}
              fullWidth
              onPress={handleResume}
              testID="pause-resume-button"
            />
            <ThemedButton
              variant="action-orange"
              label="Restart"
              icon={<Ionicons name="refresh" size={18} color="#070F1E" />}
              fullWidth
              onPress={handleRestart}
              testID="pause-restart-button"
            />
            <ThemedButton
              variant="ghost"
              label="Main Page"
              icon={<Ionicons name="home-outline" size={18} color={colors.text.primary} />}
              fullWidth
              onPress={handleExit}
              testID="pause-main-page-button"
            />
          </View>
        </ThemedCard>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 11, 20, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.space.lg,
    zIndex: 1000,
    elevation: 20,
  },
  animatedContainer: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    paddingVertical: spacing.space.xl,
    paddingHorizontal: spacing.space.lg,
    borderRadius: spacing.radii.lg,
    borderColor: colors.border.subtle,
    borderWidth: 1,
    backgroundColor: 'rgba(13, 30, 54, 0.95)',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.space.lg,
  },
  title: {
    color: colors.text.primary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.text.muted,
    marginTop: spacing.space.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.space.md,
    justifyContent: 'center',
    width: '100%',
    marginBottom: spacing.space.xl,
  },
  statBadge: {
    flex: 1,
    maxWidth: 140,
  },
  actions: {
    width: '100%',
    gap: spacing.space.md,
  },
});
