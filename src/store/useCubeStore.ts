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
import { generateScramble, formatScrambleNotation } from '../logic/scramble';
import { triggerHapticFeedback, triggerVictoryHaptic } from '../logic/haptics';
import { TimerStatus, SolveRecord, createSolveRecord } from '../logic/timer';

export type { GamePhase, MoveName, BaseMove, MoveAnimationInfo, CubeValidationResult, TimerStatus, SolveRecord };
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
  timerStatus: TimerStatus;
  solveStartTime: number | null;
  solveEndTime: number | null;
  latestSolve: SolveRecord | null;
  isVictoryDismissed: boolean;
  moveCount: number;
  moveHistory: MoveName[];
  gamePhase: GamePhase;
  isAnimating: boolean;
  animatingMove: ActiveMoveAnimation | null;
  pendingMove: MoveName | null;
  scrambleQueue: MoveName[];
  latestScramble: MoveName[];
  scrambleNotation: string;
  viewPresetTrigger: ViewPresetTrigger | null;

  setCubeState: (state: number[]) => void;
  setTimerMs: (ms: number) => void;
  incrementMoveCount: () => void;
  resetMoveCount: () => void;
  setGamePhase: (phase: GamePhase) => void;
  setAnimating: (animating: boolean) => void;

  startTimer: () => boolean;
  stopTimer: () => SolveRecord | null;
  updateTimer: (now?: number) => void;
  resetTimer: () => void;
  dismissVictoryCard: () => void;

  requestMove: (move: MoveName) => boolean;
  applyMoveDirect: (move: MoveName) => void;
  startScramble: (moves: MoveName[]) => void;
  scrambleCube: (moveCount?: number) => void;
  skipScramble: () => void;
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
  const nextCount = state.moveCount + 1;

  let timerStatus = state.timerStatus;
  let solveStartTime = state.solveStartTime;
  let solveEndTime = state.solveEndTime;
  let timerMs = state.timerMs;
  let latestSolve = state.latestSolve;

  // If timer was IDLE and scrambled, start timer on direct move
  if (
    state.timerStatus === 'IDLE' &&
    state.gamePhase === 'PLAYING' &&
    state.scrambleNotation.trim().length > 0
  ) {
    timerStatus = 'RUNNING';
    solveStartTime = Date.now();
    solveEndTime = null;
    timerMs = 0;
  }

  // If timer was RUNNING and cube is solved, stop timer and record
  if (solved && (state.timerStatus === 'RUNNING' || timerStatus === 'RUNNING')) {
    const endTime = Date.now();
    const startTime = solveStartTime ?? endTime;
    timerMs = Math.max(0, endTime - startTime);
    solveEndTime = endTime;
    timerStatus = 'STOPPED';
    latestSolve = createSolveRecord({
      timeMs: timerMs,
      moveCount: nextCount,
      scrambleNotation: state.scrambleNotation,
    });
    triggerVictoryHaptic();
  }

  return {
    cubeState: nextCubeState,
    moveCount: nextCount,
    moveHistory: [...state.moveHistory, move],
    gamePhase: nextPhase,
    timerStatus,
    solveStartTime,
    solveEndTime,
    timerMs,
    latestSolve,
  };
}

export const useCubeStore = create<CubeStoreState>((set) => ({
  cubeState: createSolvedCubeState(),
  timerMs: 0,
  timerStatus: 'IDLE',
  solveStartTime: null,
  solveEndTime: null,
  latestSolve: null,
  isVictoryDismissed: false,
  moveCount: 0,
  moveHistory: [],
  gamePhase: 'SOLVED',
  isAnimating: false,
  animatingMove: null,
  pendingMove: null,
  scrambleQueue: [],
  latestScramble: [],
  scrambleNotation: '',
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

  startTimer: () => {
    let started = false;
    set((state) => {
      if (
        state.timerStatus === 'IDLE' &&
        state.gamePhase === 'PLAYING' &&
        state.scrambleNotation.trim().length > 0
      ) {
        started = true;
        return {
          timerStatus: 'RUNNING',
          solveStartTime: Date.now(),
          solveEndTime: null,
          timerMs: 0,
          isVictoryDismissed: false,
        };
      }
      return state;
    });
    return started;
  },

  stopTimer: () => {
    let createdRecord: SolveRecord | null = null;
    set((state) => {
      if (state.timerStatus !== 'RUNNING') {
        return state;
      }
      const endTime = Date.now();
      const startTime = state.solveStartTime ?? endTime;
      const timeMs = Math.max(0, endTime - startTime);
      createdRecord = createSolveRecord({
        timeMs,
        moveCount: state.moveCount,
        scrambleNotation: state.scrambleNotation,
      });
      return {
        timerStatus: 'STOPPED',
        solveEndTime: endTime,
        timerMs: timeMs,
        latestSolve: createdRecord,
        isVictoryDismissed: false,
      };
    });
    return createdRecord;
  },

  updateTimer: (now?: number) => {
    set((state) => {
      if (state.timerStatus !== 'RUNNING' || state.solveStartTime === null) {
        return state;
      }
      const current = now ?? Date.now();
      return {
        timerMs: Math.max(0, current - state.solveStartTime),
      };
    });
  },

  resetTimer: () => {
    set({
      timerStatus: 'IDLE',
      solveStartTime: null,
      solveEndTime: null,
      timerMs: 0,
      isVictoryDismissed: false,
    });
  },

  dismissVictoryCard: () => {
    set({ isVictoryDismissed: true });
  },


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

      const shouldStartTimer =
        state.timerStatus === 'IDLE' &&
        state.gamePhase === 'PLAYING' &&
        state.scrambleNotation.trim().length > 0;

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
        ...(shouldStartTimer
          ? {
              timerStatus: 'RUNNING' as TimerStatus,
              solveStartTime: Date.now(),
              solveEndTime: null,
              timerMs: 0,
              isVictoryDismissed: false,
            }
          : {}),
      };
    });
    return accepted;
  },

  startMoveAnimation: (move: MoveName) => {
    set((state) => {
      if (state.isAnimating) return state;
      const info = getMoveAnimationInfo(move);
      const shouldStartTimer =
        state.timerStatus === 'IDLE' &&
        state.gamePhase === 'PLAYING' &&
        state.scrambleNotation.trim().length > 0;

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
        ...(shouldStartTimer
          ? {
              timerStatus: 'RUNNING' as TimerStatus,
              solveStartTime: Date.now(),
              solveEndTime: null,
              timerMs: 0,
              isVictoryDismissed: false,
            }
          : {}),
      };
    });
  },

  applyMoveDirect: (move: MoveName) => {
    set((state) => applyDirectMoveState(state, move));
  },

  applyMoveAction: (move: MoveName) => {
    set((state) => applyDirectMoveState(state, move));
  },

  scrambleCube: (moveCount?: number) => {
    const moves = generateScramble(moveCount);
    const notation = formatScrambleNotation(moves);
    if (!moves || moves.length === 0) {
      set({
        cubeState: createSolvedCubeState(),
        timerMs: 0,
        timerStatus: 'IDLE',
        solveStartTime: null,
        solveEndTime: null,
        latestSolve: null,
        isVictoryDismissed: false,
        moveCount: 0,
        moveHistory: [],
        gamePhase: 'SOLVED',
        latestScramble: [],
        scrambleNotation: '',
        isAnimating: false,
        animatingMove: null,
        pendingMove: null,
        scrambleQueue: [],
      });
      return;
    }

    const [firstMove, ...restMoves] = moves;
    const info = getMoveAnimationInfo(firstMove, 70);

    set({
      cubeState: createSolvedCubeState(),
      timerMs: 0,
      timerStatus: 'IDLE',
      solveStartTime: null,
      solveEndTime: null,
      latestSolve: null,
      isVictoryDismissed: false,
      moveCount: 0,
      moveHistory: [],
      gamePhase: 'SCRAMBLING',
      latestScramble: moves,
      scrambleNotation: notation,
      scrambleQueue: restMoves,
      pendingMove: null,
      isAnimating: true,
      animatingMove: {
        move: firstMove,
        axis: info.axis,
        targetAngle: info.angle,
        durationMs: 70,
        easing: info.easing,
        filter: info.filter,
      },
    });

    triggerHapticFeedback();
  },

  skipScramble: () => {
    set((state) => {
      if (state.gamePhase !== 'SCRAMBLING') {
        return state;
      }

      let nextCubeState = state.cubeState;
      if (state.animatingMove) {
        nextCubeState = applyMove(nextCubeState, state.animatingMove.move);
      }
      for (const move of state.scrambleQueue) {
        nextCubeState = applyMove(nextCubeState, move);
      }

      triggerHapticFeedback();

      return {
        cubeState: nextCubeState,
        moveCount: 0,
        moveHistory: [],
        gamePhase: 'PLAYING',
        timerMs: 0,
        timerStatus: 'IDLE',
        solveStartTime: null,
        solveEndTime: null,
        latestSolve: null,
        isVictoryDismissed: false,
        isAnimating: false,
        animatingMove: null,
        pendingMove: null,
        scrambleQueue: [],
      };
    });
  },

  startScramble: (moves: MoveName[]) => {
    if (!moves || moves.length === 0) {
      set((state) => ({
        gamePhase: isCubeSolved(state.cubeState) ? 'SOLVED' : 'PLAYING',
        timerMs: 0,
        timerStatus: 'IDLE',
        solveStartTime: null,
        solveEndTime: null,
        latestSolve: null,
        isVictoryDismissed: false,
        moveCount: 0,
        moveHistory: [],
        isAnimating: false,
        animatingMove: null,
        scrambleQueue: [],
      }));
      return;
    }
    const [firstMove, ...restMoves] = moves;
    const info = getMoveAnimationInfo(firstMove, 70);
    set({
      gamePhase: 'SCRAMBLING',
      timerMs: 0,
      timerStatus: 'IDLE',
      solveStartTime: null,
      solveEndTime: null,
      latestSolve: null,
      isVictoryDismissed: false,
      moveCount: 0,
      moveHistory: [],
      latestScramble: moves,
      scrambleNotation: formatScrambleNotation(moves),
      scrambleQueue: restMoves,
      pendingMove: null,
      isAnimating: true,
      animatingMove: {
        move: firstMove,
        axis: info.axis,
        targetAngle: info.angle,
        durationMs: 70,
        easing: info.easing,
        filter: info.filter,
      },
    });
    triggerHapticFeedback();
  },

  finishMoveAnimation: () => {
    set((state) => {
      if (!state.animatingMove) return state;

      const completedMove = state.animatingMove.move;
      const nextCubeState = applyMove(state.cubeState, completedMove);
      const isScrambleMove = state.gamePhase === 'SCRAMBLING';
      const nextCount = isScrambleMove ? state.moveCount : state.moveCount + 1;
      const nextHistory = isScrambleMove ? state.moveHistory : [...state.moveHistory, completedMove];

      // If active scramble moves are queued, chain immediately with 70ms duration
      if (state.scrambleQueue.length > 0) {
        const [nextMove, ...remainingScramble] = state.scrambleQueue;
        const nextInfo = getMoveAnimationInfo(nextMove, 70);
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
            durationMs: 70,
            easing: nextInfo.easing,
            filter: nextInfo.filter,
          },
        };
      }

      // If scramble finished normally (scrambleQueue drained)
      if (isScrambleMove) {
        triggerHapticFeedback();
        return {
          cubeState: nextCubeState,
          moveCount: 0,
          moveHistory: [],
          isAnimating: false,
          animatingMove: null,
          pendingMove: null,
          scrambleQueue: [],
          gamePhase: isCubeSolved(nextCubeState) ? 'SOLVED' : 'PLAYING',
          timerStatus: 'IDLE',
          solveStartTime: null,
          solveEndTime: null,
          timerMs: 0,
          latestSolve: null,
          isVictoryDismissed: false,
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

      let timerStatus = state.timerStatus;
      let solveEndTime = state.solveEndTime;
      let timerMs = state.timerMs;
      let latestSolve = state.latestSolve;

      if (solved && state.timerStatus === 'RUNNING') {
        const endTime = Date.now();
        const startTime = state.solveStartTime ?? endTime;
        timerMs = Math.max(0, endTime - startTime);
        solveEndTime = endTime;
        timerStatus = 'STOPPED';
        latestSolve = createSolveRecord({
          timeMs: timerMs,
          moveCount: nextCount,
          scrambleNotation: state.scrambleNotation,
        });
        triggerVictoryHaptic();
      }

      return {
        cubeState: nextCubeState,
        moveCount: nextCount,
        moveHistory: nextHistory,
        isAnimating: false,
        animatingMove: null,
        pendingMove: null,
        scrambleQueue: [],
        gamePhase: nextPhase,
        timerStatus,
        solveEndTime,
        timerMs,
        latestSolve,
      };
    });
  },

  resetGame: () => {
    set({
      cubeState: createSolvedCubeState(),
      timerMs: 0,
      timerStatus: 'IDLE',
      solveStartTime: null,
      solveEndTime: null,
      latestSolve: null,
      isVictoryDismissed: false,
      moveCount: 0,
      moveHistory: [],
      gamePhase: 'SOLVED',
      isAnimating: false,
      animatingMove: null,
      pendingMove: null,
      scrambleQueue: [],
      latestScramble: [],
      scrambleNotation: '',
    });
  },
}));

