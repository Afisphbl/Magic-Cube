import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, AppState, AppStateStatus } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCubeStore, TimerStatus, GamePhase } from '../store/useCubeStore';
import { colors } from '../theme/colors';
import { useTimerTicker } from '../hooks/useTimerTicker';
import { VictoryCard } from './VictoryCard';
import { RecordsModal } from './RecordsModal';
import { PauseModal } from './PauseModal';
import { StatBadge } from './ui';

export interface GameOverlayProps {
  moveCount?: number;
  timerText?: string;
  gamePhase?: GamePhase;
  timerStatus?: TimerStatus;
  isPaused?: boolean;
  onStartPress?: () => void;
  onRecordPress?: () => void;
  onPausePress?: () => void;
}

export const GameOverlay: React.FC<GameOverlayProps> = ({
  moveCount: propMoveCount,
  timerText: propTimerText,
  gamePhase: propGamePhase,
  timerStatus: propTimerStatus,
  isPaused: propIsPaused,
  onStartPress,
  onRecordPress,
  onPausePress,
}) => {
  const storeMoveCount = useCubeStore((state) => state.moveCount);
  const storeGamePhase = useCubeStore((state) => state.gamePhase);
  const storeTimerStatus = useCubeStore((state) => state.timerStatus);
  const storeIsPaused = useCubeStore((state) => state.isPaused);
  const startSolveGame = useCubeStore((state) => state.startSolveGame);
  const openRecordsModal = useCubeStore((state) => state.openRecordsModal);
  const pauseGame = useCubeStore((state) => state.pauseGame);

  const hookedTimerText = useTimerTicker();

  const moveCount = propMoveCount !== undefined ? propMoveCount : storeMoveCount;
  const timerText = propTimerText !== undefined ? propTimerText : hookedTimerText;
  const gamePhase = propGamePhase !== undefined ? propGamePhase : storeGamePhase;
  const timerStatus = propTimerStatus !== undefined ? propTimerStatus : storeTimerStatus;
  const isPaused = propIsPaused !== undefined ? propIsPaused : storeIsPaused;

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 380 || height < 680;
  const isShort = height < 520;

  // Auto-pause when application enters background or becomes inactive (AC-9)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/)) {
        const state = useCubeStore.getState();
        if (state.gamePhase === 'PLAYING' && state.timerStatus === 'RUNNING' && !state.isPaused) {
          state.pauseGame();
        }
      }
    };

    const subscription = AppState.addEventListener?.('change', handleAppStateChange);
    return () => {
      subscription?.remove?.();
    };
  }, []);

  const handleStart = () => {
    if (onStartPress) {
      onStartPress();
    } else {
      startSolveGame();
    }
  };

  const handleRecord = () => {
    if (onRecordPress) {
      onRecordPress();
    } else {
      openRecordsModal();
    }
  };

  const handlePause = () => {
    if (onPausePress) {
      onPausePress();
    } else {
      pauseGame();
    }
  };

  // Active play definition (AC-1, AC-2, AC-3)
  const isActivePlay = gamePhase === 'PLAYING' && timerStatus === 'RUNNING';
  const showCenterControls = !isActivePlay && !isPaused;
  const showPauseButton = isActivePlay && !isPaused;

  const actionButtons = (
    <View style={[styles.buttonGroup, isCompact && styles.buttonGroupCompact]}>
      <TouchableOpacity
        style={[
          styles.button,
          styles.startButton,
          isCompact && styles.buttonCompact,
          isShort && styles.buttonShort,
          gamePhase === 'SCRAMBLING' && styles.buttonDisabled,
        ]}
        onPress={handleStart}
        disabled={gamePhase === 'SCRAMBLING'}
        accessibilityRole="button"
        accessibilityLabel="Start solve game"
        activeOpacity={0.8}
      >
        <Ionicons
          name={gamePhase === 'SCRAMBLING' ? 'sync' : 'play'}
          size={isCompact ? 16 : 20}
          color="#070F1E"
        />
        <Text
          style={[
            styles.buttonText,
            styles.startButtonText,
            isCompact && styles.buttonTextCompact,
          ]}
        >
          {gamePhase === 'SCRAMBLING' ? 'Shuffling...' : 'Start'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          styles.recordButton,
          isCompact && styles.buttonCompact,
          isShort && styles.buttonShort,
        ]}
        onPress={handleRecord}
        accessibilityRole="button"
        accessibilityLabel="View solve records"
        activeOpacity={0.8}
      >
        <Ionicons
          name="trophy-outline"
          size={isCompact ? 16 : 20}
          color={colors.brand.gold}
        />
        <Text
          style={[
            styles.buttonText,
            styles.recordButtonText,
            isCompact && styles.buttonTextCompact,
          ]}
        >
          Record
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View
      style={[
        styles.overlay,
        {
          paddingTop: Math.max(insets.top, isShort ? 6 : (isCompact ? 10 : 16)),
          paddingBottom: Math.max(insets.bottom, isShort ? 8 : (isCompact ? 12 : 20)),
          paddingLeft: Math.max(insets.left, isCompact ? 12 : 20),
          paddingRight: Math.max(insets.right, isCompact ? 12 : 20),
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.topBar} pointerEvents="box-none">
        <Text style={[styles.title, isCompact && styles.titleCompact, isShort && styles.titleShort]}>
          Magic Cube
        </Text>
        <View style={[styles.statsRowWrapper, isCompact && styles.statsRowWrapperCompact]}>
          <View style={[styles.statsContainer, isCompact && styles.statsContainerCompact]}>
            <StatBadge
              icon="timer-outline"
              label="Time"
              value={timerText}
              variant="cyan"
              style={[styles.hudBadge, isCompact && styles.hudBadgeCompact]}
            />
            <StatBadge
              icon="swap-vertical-outline"
              label="Moves"
              value={moveCount}
              variant="orange"
              style={[styles.hudBadge, isCompact && styles.hudBadgeCompact]}
            />
          </View>
          {showPauseButton && (
            <TouchableOpacity
              testID="pause-button"
              style={[styles.pauseButton, isCompact && styles.pauseButtonCompact]}
              onPress={handlePause}
              accessibilityRole="button"
              accessibilityLabel="Pause solve game"
              activeOpacity={0.8}
            >
              <Ionicons
                name="pause"
                size={isCompact ? 18 : 22}
                color={colors.text.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.helpHint, isCompact && styles.helpHintCompact]}>
          Drag stickers to turn faces • Drag background to rotate freely (any angle)
        </Text>
      </View>

      {showCenterControls && (
        <View
          testID="game-overlay-center-controls"
          style={styles.centerContainer}
          pointerEvents="box-none"
        >
          {actionButtons}
        </View>
      )}

      <VictoryCard />
      <RecordsModal />
      <PauseModal />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  titleCompact: {
    fontSize: 22,
  },
  titleShort: {
    fontSize: 18,
  },
  statsRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 12,
  },
  statsRowWrapperCompact: {
    marginTop: 4,
    gap: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  statsContainerCompact: {
    gap: 10,
  },
  hudBadge: {
    minWidth: 110,
  },
  hudBadgeCompact: {
    minWidth: 90,
  },
  pauseButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(13, 30, 54, 0.85)',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  pauseButtonCompact: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },
  helpHint: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 420,
  },
  helpHintCompact: {
    fontSize: 11,
    marginTop: 4,
    maxWidth: 340,
  },
  centerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonGroup: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonGroupCompact: {
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 160,
    elevation: 3,
  },
  buttonCompact: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    minWidth: 140,
    borderRadius: 10,
  },
  buttonShort: {
    paddingVertical: 7,
  },
  startButton: {
    backgroundColor: colors.brand.cyan,
    borderWidth: 1,
    borderColor: '#00E5FF',
  },
  startButtonText: {
    color: '#070F1E',
    fontWeight: '800',
  },
  recordButton: {
    backgroundColor: 'rgba(13, 30, 54, 0.92)',
    borderWidth: 1.5,
    borderColor: colors.brand.gold,
  },
  recordButtonText: {
    color: colors.brand.gold,
    fontWeight: '700',
  },
  buttonText: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  buttonTextCompact: {
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
