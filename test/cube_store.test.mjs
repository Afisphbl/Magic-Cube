import test from 'node:test';
import assert from 'node:assert/strict';
import {
  useCubeStore,
  createSolvedCubeState,
  validateCubeState,
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
  assert.deepEqual(state.moveHistory, []);
  assert.equal(state.timerMs, 0);
  assert.equal(state.gamePhase, 'SOLVED');
  assert.equal(state.isAnimating, false);
  assert.equal(state.animatingMove, null);
  assert.equal(state.pendingMove, null);
  assert.deepEqual(state.scrambleQueue, []);
  assert.equal(isCubeSolved(state.cubeState), true);
});

test('useCubeStore direct setters modify state accurately and setCubeState recovers corrupt state', () => {
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

  // Passing corrupt state to setCubeState restores clean solved state safely
  store.setCubeState([1, 2, 3]); // invalid length
  const recovered = useCubeStore.getState().cubeState;
  assert.equal(validateCubeState(recovered).valid, true);
  assert.equal(isCubeSolved(recovered), true);
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

test('applyMoveDirect updates cube state, increments move count, logs history, and updates phase', () => {
  useCubeStore.getState().resetGame();
  assert.equal(useCubeStore.getState().gamePhase, 'SOLVED');

  // Single move breaks solved state, transitions phase to PLAYING
  useCubeStore.getState().applyMoveDirect('R');
  let state = useCubeStore.getState();
  assert.equal(state.moveCount, 1);
  assert.deepEqual(state.moveHistory, ['R']);
  assert.equal(state.gamePhase, 'PLAYING');
  assert.equal(isCubeSolved(state.cubeState), false);

  // Undoing move restores solved state, transitions phase back to SOLVED
  useCubeStore.getState().applyMoveDirect("R'");
  state = useCubeStore.getState();
  assert.equal(state.moveCount, 2);
  assert.deepEqual(state.moveHistory, ['R', "R'"]);
  assert.equal(state.gamePhase, 'SOLVED');
  assert.equal(isCubeSolved(state.cubeState), true);
});

test('requestMove handles single move buffering and atomic animation chaining', () => {
  useCubeStore.getState().resetGame();

  // 1. Initial move starts animation immediately
  const accepted1 = useCubeStore.getState().requestMove('U');
  assert.equal(accepted1, true);
  let state = useCubeStore.getState();
  assert.equal(state.isAnimating, true);
  assert.equal(state.animatingMove?.move, 'U');
  assert.equal(state.pendingMove, null);

  // 2. Second move while animating is accepted into pendingMove buffer
  const accepted2 = useCubeStore.getState().requestMove('R');
  assert.equal(accepted2, true);
  state = useCubeStore.getState();
  assert.equal(state.isAnimating, true);
  assert.equal(state.animatingMove?.move, 'U');
  assert.equal(state.pendingMove, 'R');

  // 3. Third move while animating and buffer full is rejected
  const accepted3 = useCubeStore.getState().requestMove('F');
  assert.equal(accepted3, false, 'Should reject move when buffer is already occupied');
  state = useCubeStore.getState();
  assert.equal(state.pendingMove, 'R');

  // 4. Finishing first animation immediately chains buffered move without unlocking
  useCubeStore.getState().finishMoveAnimation();
  state = useCubeStore.getState();
  assert.equal(state.isAnimating, true, 'isAnimating must stay true during atomic chaining');
  assert.equal(state.animatingMove?.move, 'R', 'animatingMove must transition to buffered move R');
  assert.equal(state.pendingMove, null, 'pendingMove must be cleared');
  assert.equal(state.moveCount, 1);
  assert.deepEqual(state.moveHistory, ['U']);

  // 5. Finishing second animation releases lock and updates game phase
  useCubeStore.getState().finishMoveAnimation();
  state = useCubeStore.getState();
  assert.equal(state.isAnimating, false);
  assert.equal(state.animatingMove, null);
  assert.equal(state.pendingMove, null);
  assert.equal(state.moveCount, 2);
  assert.deepEqual(state.moveHistory, ['U', 'R']);
  assert.equal(state.gamePhase, 'PLAYING');
});

test('startScramble enqueues moves and executes sequence until queue is empty', () => {
  useCubeStore.getState().resetGame();

  const scrambleMoves = ['R', 'U', "R'", "U'"];
  useCubeStore.getState().startScramble(scrambleMoves);

  let state = useCubeStore.getState();
  assert.equal(state.gamePhase, 'SCRAMBLING');
  assert.equal(state.isAnimating, true);
  assert.equal(state.animatingMove?.move, 'R');
  assert.deepEqual(state.scrambleQueue, ['U', "R'", "U'"]);

  // Move 1 finishes -> triggers Move 2 (U)
  useCubeStore.getState().finishMoveAnimation();
  state = useCubeStore.getState();
  assert.equal(state.gamePhase, 'SCRAMBLING');
  assert.equal(state.isAnimating, true);
  assert.equal(state.animatingMove?.move, 'U');
  assert.deepEqual(state.scrambleQueue, ["R'", "U'"]);

  // Move 2 finishes -> triggers Move 3 (R')
  useCubeStore.getState().finishMoveAnimation();
  state = useCubeStore.getState();
  assert.equal(state.gamePhase, 'SCRAMBLING');
  assert.equal(state.animatingMove?.move, "R'");
  assert.deepEqual(state.scrambleQueue, ["U'"]);

  // Move 3 finishes -> triggers Move 4 (U')
  useCubeStore.getState().finishMoveAnimation();
  state = useCubeStore.getState();
  assert.equal(state.gamePhase, 'SCRAMBLING');
  assert.equal(state.animatingMove?.move, "U'");
  assert.deepEqual(state.scrambleQueue, []);

  // Move 4 finishes -> scramble queue empty -> phase transitions to PLAYING
  useCubeStore.getState().finishMoveAnimation();
  state = useCubeStore.getState();
  assert.equal(state.isAnimating, false);
  assert.equal(state.animatingMove, null);
  assert.equal(state.moveCount, 0, 'Scramble moves must not increment player move count');
  assert.deepEqual(state.moveHistory, [], 'Scramble moves must not pollute player move history');
  assert.equal(state.gamePhase, 'PLAYING');

  // Subsequent player move in PLAYING phase increments moveCount and logs history
  useCubeStore.getState().requestMove('R');
  useCubeStore.getState().finishMoveAnimation();
  state = useCubeStore.getState();
  assert.equal(state.moveCount, 1);
  assert.deepEqual(state.moveHistory, ['R']);
});

test('finishMoveAnimation is no-op if no active move is animating', () => {
  useCubeStore.getState().resetGame();
  const before = useCubeStore.getState();

  useCubeStore.getState().finishMoveAnimation();
  const after = useCubeStore.getState();
  assert.deepEqual(before.cubeState, after.cubeState);
  assert.equal(after.moveCount, 0);
});

test('resetGame resets cube to solved and clears counters, history, queues and animations', () => {
  useCubeStore.getState().resetGame();
  useCubeStore.getState().applyMoveDirect('F');
  useCubeStore.getState().applyMoveDirect('B');
  useCubeStore.getState().setTimerMs(9999);
  useCubeStore.getState().requestMove('U');
  useCubeStore.getState().requestMove('D'); // buffered

  useCubeStore.getState().resetGame();
  const state = useCubeStore.getState();
  assert.equal(state.moveCount, 0);
  assert.deepEqual(state.moveHistory, []);
  assert.equal(state.timerMs, 0);
  assert.equal(state.gamePhase, 'SOLVED');
  assert.equal(state.isAnimating, false);
  assert.equal(state.animatingMove, null);
  assert.equal(state.pendingMove, null);
  assert.deepEqual(state.scrambleQueue, []);
  assert.equal(isCubeSolved(state.cubeState), true);
});

// AC-5: requestMove discards rapid multiple inputs when buffer is full
test('requestMove discards rapid multiple inputs when buffer is already full (AC-5)', () => {
  useCubeStore.getState().resetGame();

  assert.equal(useCubeStore.getState().requestMove('U'), true);
  assert.equal(useCubeStore.getState().requestMove('R'), true);
  assert.equal(useCubeStore.getState().pendingMove, 'R');

  // Next rapid inputs must all be rejected and not overwrite buffer
  assert.equal(useCubeStore.getState().requestMove('F'), false);
  assert.equal(useCubeStore.getState().requestMove('B'), false);
  assert.equal(useCubeStore.getState().requestMove('L'), false);
  assert.equal(useCubeStore.getState().pendingMove, 'R');
});

// AC-8: startScramble with empty moves array
test('startScramble with empty moves array is a safe no-op (AC-8)', () => {
  useCubeStore.getState().resetGame();
  useCubeStore.getState().startScramble([]);
  const state = useCubeStore.getState();
  assert.equal(state.isAnimating, false);
  assert.equal(state.animatingMove, null);
  assert.deepEqual(state.scrambleQueue, []);
});

// AC-8 & AC-7: Full 20-move scramble sequence execution
test('startScramble with 20 moves plays full sequence and ends in PLAYING phase (AC-7, AC-8)', () => {
  useCubeStore.getState().resetGame();

  const moves20 = [
    'R', 'U', "R'", "U'",
    'L', 'F', "L'", "F'",
    'D', 'B', "D'", "B'",
    'R2', 'L2', 'U2', 'D2',
    'F2', 'B2', 'R', "U'"
  ];

  useCubeStore.getState().startScramble(moves20);
  assert.equal(useCubeStore.getState().gamePhase, 'SCRAMBLING');
  assert.equal(useCubeStore.getState().isAnimating, true);
  assert.equal(useCubeStore.getState().animatingMove?.move, 'R');
  assert.equal(useCubeStore.getState().scrambleQueue.length, 19);

  // Play through all 20 moves
  for (let step = 0; step < 20; step++) {
    assert.equal(useCubeStore.getState().isAnimating, true);
    useCubeStore.getState().finishMoveAnimation();
  }

  const finalState = useCubeStore.getState();
  assert.equal(finalState.isAnimating, false);
  assert.equal(finalState.animatingMove, null);
  assert.equal(finalState.scrambleQueue.length, 0);
  assert.equal(finalState.gamePhase, 'PLAYING');
  assert.equal(finalState.moveCount, 0, 'Scramble moves must not count towards solve session move count');
  assert.deepEqual(finalState.moveHistory, [], 'Scramble moves must not pollute solve session move history');
});

test('requestMove is rejected while in SCRAMBLING phase', () => {
  useCubeStore.getState().resetGame();
  useCubeStore.getState().startScramble(['R', 'U']);

  assert.equal(useCubeStore.getState().gamePhase, 'SCRAMBLING');
  assert.equal(useCubeStore.getState().requestMove('F'), false, 'requestMove must be rejected during SCRAMBLING');
  assert.equal(useCubeStore.getState().pendingMove, null);
});

test('scramble that ends in solved state transitions to SOLVED phase', () => {
  useCubeStore.getState().resetGame();
  // R then R' returns to solved state
  useCubeStore.getState().startScramble(['R', "R'"]);

  useCubeStore.getState().finishMoveAnimation(); // completes R
  assert.equal(useCubeStore.getState().gamePhase, 'SCRAMBLING');

  useCubeStore.getState().finishMoveAnimation(); // completes R'
  assert.equal(useCubeStore.getState().gamePhase, 'SOLVED');
  assert.equal(useCubeStore.getState().moveCount, 0);
});

// AC-4 & AC-5: Deferred solve detection when finishing a move while another is buffered
test('finishMoveAnimation defers solve detection until buffered moves complete (AC-4, AC-5)', () => {
  useCubeStore.getState().resetGame();

  // Perturb cube with R
  useCubeStore.getState().applyMoveDirect('R');
  assert.equal(useCubeStore.getState().gamePhase, 'PLAYING');

  // Player starts R' (which will solve the cube), but immediately buffers U
  useCubeStore.getState().requestMove("R'");
  useCubeStore.getState().requestMove('U');

  // Finish R' animation: cube is temporarily solved, but U is buffered
  useCubeStore.getState().finishMoveAnimation();
  let state = useCubeStore.getState();
  assert.equal(state.isAnimating, true);
  assert.equal(state.animatingMove?.move, 'U');
  // Phase must stay PLAYING because U is still executing
  assert.equal(state.gamePhase, 'PLAYING');

  // Finish U animation: cube is now perturbed by U and queue is empty
  useCubeStore.getState().finishMoveAnimation();
  state = useCubeStore.getState();
  assert.equal(state.isAnimating, false);
  assert.equal(state.gamePhase, 'PLAYING');
  assert.equal(isCubeSolved(state.cubeState), false);
});
