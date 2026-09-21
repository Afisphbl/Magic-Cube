import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCubeStore } from '../store/useCubeStore';
import { BaseMove, MoveName } from '../logic/cubeMoves';

const BASE_MOVES: BaseMove[] = ['U', 'D', 'L', 'R', 'F', 'B'];
const MODIFIERS = ['', "'", '2'];

export const GameOverlay: React.FC = () => {
  const moveCount = useCubeStore((state) => state.moveCount);
  const gamePhase = useCubeStore((state) => state.gamePhase);
  const resetGame = useCubeStore((state) => state.resetGame);
  const applyMoveAction = useCubeStore((state) => state.applyMoveAction);
  const setGamePhase = useCubeStore((state) => state.setGamePhase);
  const resetMoveCount = useCubeStore((state) => state.resetMoveCount);
  const triggerOrientationPreset = useCubeStore((state) => state.triggerOrientationPreset);

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 380 || height < 680;
  const isShort = height < 520;

  const [isYellowTop, setIsYellowTop] = useState<boolean>(false);

  const handleToggleTopFace = useCallback(() => {
    if (isYellowTop) {
      triggerOrientationPreset('white-top');
      setIsYellowTop(false);
    } else {
      triggerOrientationPreset('yellow-top');
      setIsYellowTop(true);
    }
  }, [isYellowTop, triggerOrientationPreset]);

  const handleResetView = useCallback(() => {
    triggerOrientationPreset('reset');
    setIsYellowTop(false);
  }, [triggerOrientationPreset]);

  const handleScramble = useCallback(() => {
    resetGame();
    // Generate 20 random moves
    let lastBase: BaseMove | null = null;
    for (let i = 0; i < 20; i++) {
      let base: BaseMove;
      do {
        base = BASE_MOVES[Math.floor(Math.random() * BASE_MOVES.length)];
      } while (base === lastBase);
      lastBase = base;
      const mod = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
      const move = `${base}${mod}` as MoveName;
      applyMoveAction(move);
    }
    resetMoveCount();
    setGamePhase('PLAYING');
  }, [applyMoveAction, resetGame, resetMoveCount, setGamePhase]);

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
        <View style={[styles.statsContainer, isCompact && styles.statsContainerCompact]}>
          <Text style={[styles.statLabel, isCompact && styles.statLabelCompact]}>
            Phase: {gamePhase}
          </Text>
          <Text style={[styles.statLabel, isCompact && styles.statLabelCompact]}>
            Moves: {moveCount}
          </Text>
        </View>
        <Text style={[styles.helpHint, isCompact && styles.helpHintCompact]}>
          Drag stickers to turn faces • Drag background to rotate freely (any angle)
        </Text>
      </View>

      <View style={styles.bottomBar} pointerEvents="box-none">
        <View style={[styles.buttonGroup, isCompact && styles.buttonGroupCompact]}>
          <TouchableOpacity
            style={[styles.button, styles.viewButton, isCompact && styles.buttonCompact, isShort && styles.buttonShort]}
            onPress={handleToggleTopFace}
          >
            <View
              style={[
                styles.colorDot,
                isCompact && styles.colorDotCompact,
                { backgroundColor: isYellowTop ? '#FFFFFF' : '#FFD500' },
              ]}
            />
            <Text style={[styles.buttonText, isCompact && styles.buttonTextCompact]}>
              {isYellowTop ? 'White Top' : 'Yellow Top'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, isCompact && styles.buttonCompact, isShort && styles.buttonShort]}
            onPress={handleResetView}
          >
            <Text style={[styles.buttonText, isCompact && styles.buttonTextCompact]}>
              Reset View
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.buttonGroup, isCompact && styles.buttonGroupCompact, { marginTop: isShort ? 6 : (isCompact ? 8 : 10) }]}>
          <TouchableOpacity
            style={[styles.button, isCompact && styles.buttonCompact, isShort && styles.buttonShort]}
            onPress={handleScramble}
          >
            <Text style={[styles.buttonText, isCompact && styles.buttonTextCompact]}>
              Scramble
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, isCompact && styles.buttonCompact, isShort && styles.buttonShort]}
            onPress={resetGame}
          >
            <Text style={[styles.buttonText, isCompact && styles.buttonTextCompact]}>
              Reset Game
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  statsContainer: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 16,
  },
  statsContainerCompact: {
    marginTop: 4,
    gap: 10,
  },
  statLabel: {
    fontSize: 13,
    color: '#A0A0A5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  statLabelCompact: {
    fontSize: 11,
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
  bottomBar: {
    alignItems: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonGroupCompact: {
    gap: 8,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
  },
  buttonCompact: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonShort: {
    paddingVertical: 6,
  },
  secondaryButton: {
    backgroundColor: '#27272A',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#27272A',
    borderWidth: 1,
    borderColor: '#52525B',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  colorDotCompact: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonTextCompact: {
    fontSize: 13,
  },
});
