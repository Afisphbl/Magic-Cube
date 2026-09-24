import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCubeStore } from '../store/useCubeStore';
import { TopRecord } from '../logic/records';
import { formatTimer } from '../logic/timer';
import { ThemedCard, ThemedText, ThemedButton, StatBadge } from './ui';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export interface RecordsModalProps {
  testID?: string;
  isVisible?: boolean;
  records?: TopRecord[];
  onClose?: () => void;
}

export const RecordsModal: React.FC<RecordsModalProps> = ({
  testID,
  isVisible: propIsVisible,
  records: propRecords,
  onClose: propOnClose,
}) => {
  const storeIsVisible = useCubeStore((state) => state.isRecordsModalVisible);
  const storeRecords = useCubeStore((state) => state.topRecords);
  const closeRecordsModal = useCubeStore((state) => state.closeRecordsModal);

  const isVisible = propIsVisible !== undefined ? propIsVisible : storeIsVisible;
  const records = propRecords !== undefined ? propRecords : storeRecords;

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
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [isVisible, scaleAnim, opacityAnim]);

  if (!isVisible) {
    return null;
  }

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      closeRecordsModal();
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return {
        icon: 'trophy' as const,
        color: colors.brand.gold,
        bg: 'rgba(255, 215, 0, 0.15)',
        border: colors.brand.gold,
      };
    }
    if (rank === 2) {
      return {
        icon: 'medal' as const,
        color: '#E2E8F0',
        bg: 'rgba(226, 232, 240, 0.15)',
        border: '#94A3B8',
      };
    }
    if (rank === 3) {
      return {
        icon: 'medal' as const,
        color: '#F97316',
        bg: 'rgba(249, 115, 22, 0.15)',
        border: '#EA580C',
      };
    }
    return {
      icon: 'ribbon-outline' as const,
      color: colors.text.muted,
      bg: 'rgba(148, 163, 184, 0.1)',
      border: colors.border.subtle,
    };
  };

  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <View testID={testID} style={styles.backdrop} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.backdropTouchable}
        activeOpacity={1}
        onPress={handleClose}
        accessibilityLabel="Close records overlay"
      />
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <ThemedCard variant="glow-cyan" padding="md" style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="trophy-outline" size={24} color={colors.brand.cyan} />
              </View>
              <ThemedText variant="title" color={colors.brand.cyan} style={styles.headerTitle}>
                TOP SOLVES
              </ThemedText>
            </View>
            <ThemedText variant="caption" color={colors.text.secondary}>
              Your top 5 fastest speedcubing records
            </ThemedText>
          </View>

          {records.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="sparkles-outline" size={32} color={colors.brand.gold} />
              </View>
              <ThemedText variant="subtitle" color={colors.brand.gold} style={styles.emptyTitle}>
                No Solves Yet
              </ThemedText>
              <ThemedText
                variant="body"
                color={colors.text.secondary}
                style={styles.emptySubtitle}
              >
                Tap Start to complete your first solve and set a record.
              </ThemedText>
            </View>
          ) : (
            <ScrollView style={styles.recordsList} contentContainerStyle={styles.recordsListContent}>
              {records.map((record, index) => {
                const rank = index + 1;
                const badge = getRankBadge(rank);
                const formattedTime = formatTimer(record.timeMs);
                const dateText = formatDate(record.completedAt);

                return (
                  <View key={record.id || `record-${index}`} style={styles.recordRow}>
                    <View
                      style={[
                        styles.rankBadge,
                        { backgroundColor: badge.bg, borderColor: badge.border },
                      ]}
                    >
                      <Ionicons name={badge.icon} size={14} color={badge.color} />
                      <ThemedText
                        variant="caption"
                        color={badge.color}
                        style={styles.rankBadgeText}
                      >
                        {rank}
                      </ThemedText>
                    </View>

                    <View style={styles.recordDetails}>
                      <View style={styles.recordPrimary}>
                        <ThemedText
                          variant="subtitle"
                          color={colors.text.primary}
                          style={styles.recordTime}
                        >
                          {formattedTime}
                        </ThemedText>
                        {Boolean(dateText) && (
                          <ThemedText variant="caption" color={colors.text.muted}>
                            {dateText}
                          </ThemedText>
                        )}
                      </View>

                      <View style={styles.recordStats}>
                        <StatBadge
                          icon="swap-vertical-outline"
                          label="Moves"
                          value={record.moveCount}
                          variant="orange"
                          style={styles.miniStat}
                        />
                        <StatBadge
                          icon="flash-outline"
                          label="TPS"
                          value={`${record.turnsPerSecond.toFixed(2)} /s`}
                          variant="gold"
                          style={styles.miniStat}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.footer}>
            <ThemedButton
              variant="outline"
              size="md"
              label="CLOSE"
              fullWidth
              onPress={handleClose}
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
    backgroundColor: 'rgba(7, 15, 30, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
    padding: spacing.space.base,
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  animatedContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  card: {
    width: '100%',
    backgroundColor: colors.background.card,
    borderRadius: spacing.radii.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.space.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space.xs,
    marginBottom: 4,
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: spacing.radii.pill,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    letterSpacing: 1.5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.space.xl,
    paddingHorizontal: spacing.space.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: spacing.radii.pill,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.space.sm,
  },
  emptyTitle: {
    letterSpacing: 1,
    marginBottom: spacing.space.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  recordsList: {
    maxHeight: 340,
    width: '100%',
  },
  recordsListContent: {
    gap: spacing.space.xs,
    paddingVertical: spacing.space.xs,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 30, 54, 0.7)',
    borderRadius: spacing.radii.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.space.sm,
    gap: spacing.space.sm,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 38,
    height: 28,
    borderRadius: spacing.radii.sm,
    borderWidth: 1,
    paddingHorizontal: 6,
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recordDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.space.xs,
  },
  recordPrimary: {
    justifyContent: 'center',
  },
  recordTime: {
    fontFamily: Platform.OS === 'web' ? 'Roboto Mono, monospace' : 'RobotoMono_500Medium',
    letterSpacing: 0.8,
  },
  recordStats: {
    flexDirection: 'row',
    gap: spacing.space.xs,
  },
  miniStat: {
    minWidth: 70,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  footer: {
    marginTop: spacing.space.md,
    width: '100%',
  },
});
