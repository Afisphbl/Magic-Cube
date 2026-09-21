import test from 'node:test';
import assert from 'node:assert/strict';
import {
  useCubeStore,
  createSolvedCubeState,
  FACE_COLORS,
  PLASTIC_COLOR,
} from '../src/store/useCubeStore.ts';
import { isCubeSolved } from '../src/logic/cubeMoves.ts';

test('createSolvedCubeState produces 54-element array with 9 stickers per face', () => {
  const state = createSolvedCubeState();
  assert.equal(state.length, 54);

  for (let face = 0; face < 6; face++) {
    for (let s = 0; s < 9; s++) {
      assert.equal(state[face * 9 + s], face, `Face ${face} sticker ${s} mismatch`);
    }
  }

  assert.equal(isCubeSolved(state), true);
});

test('FACE_COLORS defines 6 unique standard colors and PLASTIC_COLOR is defined', () => {
  assert.equal(FACE_COLORS.length, 6);
  const uniqueColors = new Set(FACE_COLORS);
  assert.equal(uniqueColors.size, 6);
  assert.ok(typeof PLASTIC_COLOR === 'string' && PLASTIC_COLOR.startsWith('#'));
});

test('useCubeStore initializes in solved state with zeroed timer and moves', () => {
  useCubeStore.getState().resetGame();
  const state = useCubeStore.getState();

  assert.equal(state.moveCount, 0);
  assert.equal(state.timerMs, 0);
  assert.equal(state.gamePhase, 'SOLVED');
  assert.equal(state.isAnimating, false);
  assert.equal(state.animatingMove, null);
  assert.equal(isCubeSolved(state.cubeState), true);
});

test('useCubeStore direct setters modify state accurately', () => {
  const store = useCubeStore.getState();

  store.setTimerMs(12345);
  assert.equal(useCubeStore.getState().timerMs, 12345);

  store.incrementMoveCount();
  store.incrementMoveCount();
  assert.equal(useCubeStore.getState().moveCount, 2);

  store.resetMoveCount();
  assert.equal(useCubeStore.getState().moveCount, 0);

  store.setGamePhase('PLAYING');
  assert.equal(useCubeStore.getState().gamePhase, 'PLAYING');

  store.setAnimating(true);
  assert.equal(useCubeStore.getState().isAnimating, true);

  store.setAnimating(false);
  assert.equal(useCubeStore.getState().isAnimating, false);
});

test('triggerOrientationPreset increments trigger id sequentially', () => {
  const store = useCubeStore.getState();

  store.triggerOrientationPreset('yellow-top');
  const t1 = useCubeStore.getState().viewPresetTrigger;
  assert.equal(t1.preset, 'yellow-top');
  assert.ok(t1.id > 0);

  store.triggerOrientationPreset('white-top');
  const t2 = useCubeStore.getState().viewPresetTrigger;
  assert.equal(t2.preset, 'white-top');
  assert.equal(t2.id, t1.id + 1);

  store.triggerOrientationPreset('reset');
  const t3 = useCubeStore.getState().viewPresetTrigger;
  assert.equal(t3.preset, 'reset');
  assert.equal(t3.id, t2.id + 1);
});

test('applyMoveAction updates cube state, increments move count, and updates phase', () => {
  useCubeStore.getState().resetGame();
  assert.equal(useCubeStore.getState().gamePhase, 'SOLVED');

  // Single move breaks solved state, transitions phase to PLAYING
  useCubeStore.getState().applyMoveAction('R');
  let state = useCubeStore.getState();
  assert.equal(state.moveCount, 1);
  assert.equal(state.gamePhase, 'PLAYING');
  assert.equal(isCubeSolved(state.cubeState), false);

  // Undoing move restores solved state, transitions phase back to SOLVED
  useCubeStore.getState().applyMoveAction("R'");
  state = useCubeStore.getState();
  assert.equal(state.moveCount, 2);
  assert.equal(state.gamePhase, 'SOLVED');
  assert.equal(isCubeSolved(state.cubeState), true);
});

test('startMoveAnimation locks move input while in progress and finishMoveAnimation commits', () => {
  useCubeStore.getState().resetGame();

  // Start animation for move U
  useCubeStore.getState().startMoveAnimation('U');
  let state = useCubeStore.getState();
  assert.equal(state.isAnimating, true);
  assert.ok(state.animatingMove !== null);
  assert.equal(state.animatingMove.move, 'U');

  // Concurrent move input while animating must be rejected
  useCubeStore.getState().startMoveAnimation('R');
  state = useCubeStore.getState();
  assert.equal(state.animatingMove.move, 'U', 'Concurrent move must be rejected');

  // Finish animation commits move
  useCubeStore.getState().finishMoveAnimation();
  state = useCubeStore.getState();
  assert.equal(state.isAnimating, false);
  assert.equal(state.animatingMove, null);
  assert.equal(state.moveCount, 1);
  assert.equal(state.gamePhase, 'PLAYING');
  assert.equal(isCubeSolved(state.cubeState), false);
});

test('finishMoveAnimation is no-op if no active move is animating', () => {
  useCubeStore.getState().resetGame();
  const before = useCubeStore.getState();

  useCubeStore.getState().finishMoveAnimation();
  const after = useCubeStore.getState();
  assert.deepEqual(before.cubeState, after.cubeState);
  assert.equal(after.moveCount, 0);
});

test('resetGame resets cube to solved and clears counters and animations', () => {
  useCubeStore.getState().resetGame();
  useCubeStore.getState().applyMoveAction('F');
  useCubeStore.getState().applyMoveAction('B');
  useCubeStore.getState().setTimerMs(9999);
  useCubeStore.getState().startMoveAnimation('U');

  useCubeStore.getState().resetGame();
  const state = useCubeStore.getState();
  assert.equal(state.moveCount, 0);
  assert.equal(state.timerMs, 0);
  assert.equal(state.gamePhase, 'SOLVED');
  assert.equal(state.isAnimating, false);
  assert.equal(state.animatingMove, null);
  assert.equal(isCubeSolved(state.cubeState), true);
});
