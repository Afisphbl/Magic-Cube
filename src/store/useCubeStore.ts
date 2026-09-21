import { create } from 'zustand';
import { MoveName, applyMove, isCubeSolved, getMoveAnimationInfo } from '../logic/cubeMoves';

export type GamePhase = 'SOLVED' | 'SCRAMBLING' | 'PLAYING';
export type OrientationPreset = 'yellow-top' | 'white-top' | 'reset';

export interface ViewPresetTrigger {
  preset: OrientationPreset;
  id: number;
}

export interface ActiveMoveAnimation {
  move: MoveName;
  axis: [number, number, number];
  targetAngle: number;
  filter: (c: [number, number, number]) => boolean;
}

export interface CubeStoreState {
  cubeState: number[];
  timerMs: number;
  moveCount: number;
  gamePhase: GamePhase;
  isAnimating: boolean;
  animatingMove: ActiveMoveAnimation | null;
  viewPresetTrigger: ViewPresetTrigger | null;

  setCubeState: (state: number[]) => void;
  setTimerMs: (ms: number) => void;
  incrementMoveCount: () => void;
  resetMoveCount: () => void;
  setGamePhase: (phase: GamePhase) => void;
  setAnimating: (animating: boolean) => void;
  startMoveAnimation: (move: MoveName) => void;
  finishMoveAnimation: () => void;
  applyMoveAction: (move: MoveName) => void;
  resetGame: () => void;
  triggerOrientationPreset: (preset: OrientationPreset) => void;
}

export function createSolvedCubeState(): number[] {
  const state = new Array<number>(54);
  for (let face = 0; face < 6; face++) {
    for (let sticker = 0; sticker < 9; sticker++) {
      state[face * 9 + sticker] = face;
    }
  }
  return state;
}

export const FACE_COLORS = [
  '#FFFFFF', // 0: White (Up)
  '#FFD500', // 1: Yellow (Down)
  '#B71234', // 2: Red (Right)
  '#FF5800', // 3: Orange (Left)
  '#0046AD', // 4: Blue (Front)
  '#009B48', // 5: Green (Back)
];

export const PLASTIC_COLOR = '#1A1A1A';

export const useCubeStore = create<CubeStoreState>((set) => ({
  cubeState: createSolvedCubeState(),
  timerMs: 0,
  moveCount: 0,
  gamePhase: 'SOLVED',
  isAnimating: false,
  animatingMove: null,
  viewPresetTrigger: null,

  setCubeState: (cubeState) => set({ cubeState }),
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

  startMoveAnimation: (move: MoveName) =>
    set((state) => {
      if (state.isAnimating) return state;
      const info = getMoveAnimationInfo(move);
      return {
        isAnimating: true,
        animatingMove: {
          move,
          axis: info.axis,
          targetAngle: info.angle,
          filter: info.filter,
        },
      };
    }),

  finishMoveAnimation: () =>
    set((state) => {
      if (!state.animatingMove) return state;
      const nextCubeState = applyMove(state.cubeState, state.animatingMove.move);
      const solved = isCubeSolved(nextCubeState);
      let nextPhase = state.gamePhase;
      if (state.gamePhase === 'PLAYING' && solved) {
        nextPhase = 'SOLVED';
      } else if (state.gamePhase === 'SOLVED' && !solved) {
        nextPhase = 'PLAYING';
      }

      return {
        cubeState: nextCubeState,
        animatingMove: null,
        isAnimating: false,
        moveCount: state.moveCount + 1,
        gamePhase: nextPhase,
      };
    }),

  applyMoveAction: (move: MoveName) =>
    set((state) => {
      const nextCubeState = applyMove(state.cubeState, move);
      const solved = isCubeSolved(nextCubeState);
      let nextPhase = state.gamePhase;
      if (state.gamePhase === 'PLAYING' && solved) {
        nextPhase = 'SOLVED';
      } else if (state.gamePhase === 'SOLVED' && !solved) {
        nextPhase = 'PLAYING';
      }

      return {
        cubeState: nextCubeState,
        moveCount: state.moveCount + 1,
        gamePhase: nextPhase,
      };
    }),

  resetGame: () =>
    set({
      cubeState: createSolvedCubeState(),
      timerMs: 0,
      moveCount: 0,
      gamePhase: 'SOLVED',
      isAnimating: false,
      animatingMove: null,
    }),
}));
