import { create } from 'zustand';
import { CUBE_FACE_COLORS, FACE_COLORS, PLASTIC_COLOR } from '../theme/colors';
import {
  BaseMove,
  MoveName,
  GamePhase,
  MoveAnimationInfo,
  CubeValidationResult,
  createSolvedCubeState,
  validateCubeState,
  applyMove,
  isCubeSolved,
  getMoveAnimationInfo,
  getNextGamePhase,
  ALL_MOVE_NAMES,
} from '../logic/cubeMoves';

export type { GamePhase, MoveName, BaseMove, MoveAnimationInfo, CubeValidationResult };
export { createSolvedCubeState, validateCubeState, isCubeSolved, ALL_MOVE_NAMES, CUBE_FACE_COLORS, FACE_COLORS, PLASTIC_COLOR };

export type OrientationPreset = 'yellow-top' | 'white-top' | 'reset';

export interface ViewPresetTrigger {
  preset: OrientationPreset;
  id: number;
}

export interface ActiveMoveAnimation {
  move: MoveName;
  axis: [number, number, number];
  targetAngle: number;
  durationMs: number;
  easing: string;
  filter: (c: [number, number, number]) => boolean;
}

export interface CubeStoreState {
  cubeState: number[];
  timerMs: number;
  moveCount: number;
  moveHistory: MoveName[];
  gamePhase: GamePhase;
  isAnimating: boolean;
  animatingMove: ActiveMoveAnimation | null;
  pendingMove: MoveName | null;
  scrambleQueue: MoveName[];
  viewPresetTrigger: ViewPresetTrigger | null;

  setCubeState: (state: number[]) => void;
  setTimerMs: (ms: number) => void;
  incrementMoveCount: () => void;
  resetMoveCount: () => void;
  setGamePhase: (phase: GamePhase) => void;
  setAnimating: (animating: boolean) => void;

  requestMove: (move: MoveName) => boolean;
  applyMoveDirect: (move: MoveName) => void;
  startScramble: (moves: MoveName[]) => void;
  startMoveAnimation: (move: MoveName) => void;
  finishMoveAnimation: () => void;
  applyMoveAction: (move: MoveName) => void;
  resetGame: () => void;
  triggerOrientationPreset: (preset: OrientationPreset) => void;
}


function applyDirectMoveState(state: CubeStoreState, move: MoveName): Partial<CubeStoreState> {
  const nextCubeState = applyMove(state.cubeState, move);
  const solved = isCubeSolved(nextCubeState);
  const nextPhase = getNextGamePhase(state.gamePhase, solved, false, false);
  return {
    cubeState: nextCubeState,
    moveCount: state.moveCount + 1,
    moveHistory: [...state.moveHistory, move],
    gamePhase: nextPhase,
  };
}

export const useCubeStore = create<CubeStoreState>((set) => ({
  cubeState: createSolvedCubeState(),
  timerMs: 0,
  moveCount: 0,
  moveHistory: [],
  gamePhase: 'SOLVED',
  isAnimating: false,
  animatingMove: null,
  pendingMove: null,
  scrambleQueue: [],
  viewPresetTrigger: null,

  setCubeState: (cubeState) => {
    const validation = validateCubeState(cubeState);
    if (!validation.valid) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn(`[setCubeState] Invalid cube state: ${validation.error}. Restoring solved state.`);
      }
      set({ cubeState: createSolvedCubeState() });
      return;
    }
    set({ cubeState });
  },

  setTimerMs: (timerMs) => set({ timerMs }),
  incrementMoveCount: () => set((state) => ({ moveCount: state.moveCount + 1 })),
  resetMoveCount: () => set({ moveCount: 0 }),
  setGamePhase: (gamePhase) => set({ gamePhase }),
  setAnimating: (isAnimating) => set({ isAnimating }),

  triggerOrientationPreset: (preset) =>
    set((state) => ({
      viewPresetTrigger: {
        preset,
        id: (state.viewPresetTrigger?.id ?? 0) + 1,
      },
    })),

  requestMove: (move: MoveName) => {
    let accepted = false;
    set((state) => {
      if (state.gamePhase === 'SCRAMBLING') {
        accepted = false;
        return state;
      }
      if (state.isAnimating) {
        if (state.pendingMove === null) {
          accepted = true;
          return { pendingMove: move };
        }
        accepted = false;
        return state;
      }
      const info = getMoveAnimationInfo(move);
      accepted = true;
      return {
        isAnimating: true,
        animatingMove: {
          move,
          axis: info.axis,
          targetAngle: info.angle,
          durationMs: info.durationMs,
          easing: info.easing,
          filter: info.filter,
        },
      };
    });
    return accepted;
  },

  startMoveAnimation: (move: MoveName) => {
    set((state) => {
      if (state.isAnimating) return state;
      const info = getMoveAnimationInfo(move);
      return {
        isAnimating: true,
        animatingMove: {
          move,
          axis: info.axis,
          targetAngle: info.angle,
          durationMs: info.durationMs,
          easing: info.easing,
          filter: info.filter,
        },
      };
    });
  },

  applyMoveDirect: (move: MoveName) => {
    set((state) => applyDirectMoveState(state, move));
  },

  applyMoveAction: (move: MoveName) => {
    set((state) => applyDirectMoveState(state, move));
  },

  startScramble: (moves: MoveName[]) => {
    if (!moves || moves.length === 0) {
      set((state) => ({
        gamePhase: isCubeSolved(state.cubeState) ? 'SOLVED' : 'PLAYING',
        moveCount: 0,
        moveHistory: [],
      }));
      return;
    }
    const [firstMove, ...restMoves] = moves;
    const info = getMoveAnimationInfo(firstMove);
    set({
      gamePhase: 'SCRAMBLING',
      moveCount: 0,
      moveHistory: [],
      scrambleQueue: restMoves,
      pendingMove: null,
      isAnimating: true,
      animatingMove: {
        move: firstMove,
        axis: info.axis,
        targetAngle: info.angle,
        durationMs: info.durationMs,
        easing: info.easing,
        filter: info.filter,
      },
    });
  },

  finishMoveAnimation: () => {
    set((state) => {
      if (!state.animatingMove) return state;

      const completedMove = state.animatingMove.move;
      const nextCubeState = applyMove(state.cubeState, completedMove);
      const isScrambleMove = state.gamePhase === 'SCRAMBLING';
      const nextCount = isScrambleMove ? state.moveCount : state.moveCount + 1;
      const nextHistory = isScrambleMove ? state.moveHistory : [...state.moveHistory, completedMove];

      // If active scramble moves are queued, chain immediately and defer solve check
      if (state.scrambleQueue.length > 0) {
        const [nextMove, ...remainingScramble] = state.scrambleQueue;
        const nextInfo = getMoveAnimationInfo(nextMove);
        return {
          cubeState: nextCubeState,
          moveCount: nextCount,
          moveHistory: nextHistory,
          scrambleQueue: remainingScramble,
          isAnimating: true,
          animatingMove: {
            move: nextMove,
            axis: nextInfo.axis,
            targetAngle: nextInfo.angle,
            durationMs: nextInfo.durationMs,
            easing: nextInfo.easing,
            filter: nextInfo.filter,
          },
        };
      }

      // If a manual pending move is buffered, chain immediately without releasing animation lock
      if (state.pendingMove !== null) {
        const bufferedMove = state.pendingMove;
        const nextInfo = getMoveAnimationInfo(bufferedMove);
        return {
          cubeState: nextCubeState,
          moveCount: nextCount,
          moveHistory: nextHistory,
          pendingMove: null,
          isAnimating: true,
          animatingMove: {
            move: bufferedMove,
            axis: nextInfo.axis,
            targetAngle: nextInfo.angle,
            durationMs: nextInfo.durationMs,
            easing: nextInfo.easing,
            filter: nextInfo.filter,
          },
        };
      }

      // Queue and buffer are drained: evaluate solve and transition phase
      const solved = isCubeSolved(nextCubeState);
      const nextPhase = getNextGamePhase(state.gamePhase, solved, false, false);

      return {
        cubeState: nextCubeState,
        moveCount: nextCount,
        moveHistory: nextHistory,
        isAnimating: false,
        animatingMove: null,
        pendingMove: null,
        scrambleQueue: [],
        gamePhase: nextPhase,
      };
    });
  },

  resetGame: () => {
    set({
      cubeState: createSolvedCubeState(),
      timerMs: 0,
      moveCount: 0,
      moveHistory: [],
      gamePhase: 'SOLVED',
      isAnimating: false,
      animatingMove: null,
      pendingMove: null,
      scrambleQueue: [],
    });
  },
}));
