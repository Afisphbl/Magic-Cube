import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCubeStore } from '../store/useCubeStore';
import { formatTimer, SolveRecord } from '../logic/timer';
import { ThemedCard, ThemedText, ThemedButton, StatBadge } from './ui';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export interface VictoryCardProps {
  testID?: string;
  solveRecord?: SolveRecord | null;
  isDismissed?: boolean;
  onScrambleAgain?: () => void;
  onDismiss?: () => void;
}

export const VictoryCard: React.FC<VictoryCardProps> = ({
  testID,
  solveRecord,
  isDismissed,
  onScrambleAgain,
  onDismiss,
}) => {
  const storeLatestSolve = useCubeStore((state) => state.latestSolve);
  const storeIsVictoryDismissed = useCubeStore((state) => state.isVictoryDismissed);
  const timerStatus = useCubeStore((state) => state.timerStatus);
  const scrambleCube = useCubeStore((state) => state.scrambleCube);
  const dismissVictoryCard = useCubeStore((state) => state.dismissVictoryCard);

  const latestSolve = solveRecord !== undefined ? solveRecord : storeLatestSolve;
  const isVictoryDismissed = isDismissed !== undefined ? isDismissed : storeIsVictoryDismissed;

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const isVisible = Boolean(
    latestSolve &&
    !isVictoryDismissed &&
    (solveRecord !== undefined || timerStatus === 'STOPPED')
  );


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
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [isVisible, scaleAnim, opacityAnim]);

  if (!isVisible || !latestSolve) {
    return null;
  }

  const handleScrambleAgain = () => {
    if (onScrambleAgain) {
      onScrambleAgain();
    } else {
      scrambleCube();
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    } else {
      dismissVictoryCard();
    }
  };


  return (
    <View testID={testID} style={styles.backdrop} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <ThemedCard variant="glow-cyan" padding="lg" style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="trophy" size={32} color={colors.brand.gold} />
            </View>
            <ThemedText variant="title" color={colors.brand.gold} style={styles.titleText}>
              CUBE SOLVED!
            </ThemedText>
            <ThemedText variant="caption" color={colors.text.secondary}>
              Outstanding solve performance
            </ThemedText>
          </View>

          <View style={styles.primaryMetric}>
            <ThemedText variant="caption" color={colors.text.muted} style={styles.metricLabel}>
              SOLVE TIME
            </ThemedText>
            <ThemedText variant="display" color={colors.brand.cyan} style={styles.timeValue}>
              {formatTimer(latestSolve.timeMs)}
            </ThemedText>
          </View>

          <View style={styles.statsRow}>
            <StatBadge
              icon="swap-vertical-outline"
              label="Moves"
              value={latestSolve.moveCount}
              variant="orange"
              style={styles.statBadge}
            />
            <StatBadge
              icon="flash-outline"
              label="TPS"
              value={`${latestSolve.turnsPerSecond.toFixed(2)} /s`}
              variant="gold"
              style={styles.statBadge}
            />
          </View>

          {Boolean(latestSolve.scrambleNotation) && (
            <View style={styles.scramblePreview}>
              <ThemedText variant="caption" color={colors.text.muted} style={styles.scrambleLabel}>
                SCRAMBLE SEQUENCE
              </ThemedText>
              <ThemedText
                variant="caption"
                color={colors.text.secondary}
                numberOfLines={2}
                style={styles.scrambleText}
              >
                {latestSolve.scrambleNotation}
              </ThemedText>
            </View>
          )}

          <View style={styles.actionGroup}>
            <ThemedButton
              variant="action-orange"
              size="lg"
              label="SCRAMBLE AGAIN"
              fullWidth
              onPress={handleScrambleAgain}
              style={styles.actionButton}
            />
            <ThemedButton
              variant="outline"
              size="md"
              label="DISMISS"
              fullWidth
              onPress={handleDismiss}
              style={styles.actionButton}
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
    backgroundColor: 'rgba(7, 15, 30, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: spacing.space.base,
  },
  animatedContainer: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.background.card,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.space.md,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: spacing.radii.pill,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: colors.brand.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.space.xs,
  },
  titleText: {
    letterSpacing: 1.5,
    marginTop: spacing.space.xs,
    textAlign: 'center',
  },
  primaryMetric: {
    alignItems: 'center',
    marginVertical: spacing.space.sm,
    paddingVertical: spacing.space.xs,
  },
  metricLabel: {
    letterSpacing: 1.2,
    fontWeight: '700',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: 1.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.space.md,
    marginVertical: spacing.space.sm,
    width: '100%',
    justifyContent: 'center',
  },
  statBadge: {
    flex: 1,
    maxWidth: 160,
  },
  scramblePreview: {
    backgroundColor: 'rgba(13, 30, 54, 0.6)',
    borderRadius: spacing.radii.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing.space.md,
    paddingVertical: spacing.space.xs,
    marginTop: spacing.space.sm,
    marginBottom: spacing.space.xs,
    width: '100%',
    alignItems: 'center',
  },
  scrambleLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: 2,
  },
  scrambleText: {
    fontSize: 11,
    textAlign: 'center',
  },
  actionGroup: {
    width: '100%',
    marginTop: spacing.space.base,
    gap: spacing.space.sm,
  },
  actionButton: {
    width: '100%',
  },
});
