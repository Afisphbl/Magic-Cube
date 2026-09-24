import test from 'node:test';
import assert from 'node:assert/strict';
import { Platform } from 'react-native';
import {
  useCubeStore,
  createSolvedCubeState,
  validateCubeState,
  FACE_COLORS,
  PLASTIC_COLOR,
} from '../src/store/useCubeStore.ts';
import { isCubeSolved } from '../src/logic/cubeMoves.ts';
import mockHaptics from './mocks/expo-haptics.mjs';

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

// --- Slice 3: Solve Timer and Move Counter Tests ---

test('AC-1: First manual face turn after scramble starts solve timer', () => {
  useCubeStore.getState().resetGame();
  mockHaptics._resetNotificationAsyncCalls();

  // Scramble the cube
  useCubeStore.getState().scrambleCube(2);
  // Complete the scramble animations
  useCubeStore.getState().finishMoveAnimation();
  useCubeStore.getState().finishMoveAnimation();

  let state = useCubeStore.getState();
  assert.equal(state.gamePhase, 'PLAYING');
  assert.equal(state.timerStatus, 'IDLE');
  assert.equal(state.solveStartTime, null);
  assert.equal(state.timerMs, 0);

  // Player makes first manual turn
  const accepted = useCubeStore.getState().requestMove('R');
  assert.equal(accepted, true);

  state = useCubeStore.getState();
  assert.equal(state.timerStatus, 'RUNNING');
  assert.ok(typeof state.solveStartTime === 'number' && state.solveStartTime > 0);
  assert.equal(state.solveEndTime, null);
  assert.equal(state.isVictoryDismissed, false);
});

test('AC-2: Casual unscrambled moves do not start timer or trigger victory records', () => {
  useCubeStore.getState().resetGame();
  mockHaptics._resetNotificationAsyncCalls();

  let state = useCubeStore.getState();
  assert.equal(state.timerStatus, 'IDLE');
  assert.equal(state.scrambleNotation, '');

  // Perform move on unscrambled cube
  useCubeStore.getState().requestMove('R');
  state = useCubeStore.getState();
  assert.equal(state.timerStatus, 'IDLE');
  assert.equal(state.solveStartTime, null);

  useCubeStore.getState().finishMoveAnimation();
  state = useCubeStore.getState();
  assert.equal(state.timerStatus, 'IDLE');
  assert.equal(state.latestSolve, null);

  // Undo move to return to solved state
  useCubeStore.getState().requestMove("R'");
  useCubeStore.getState().finishMoveAnimation();

  state = useCubeStore.getState();
  assert.equal(isCubeSolved(state.cubeState), true);
  assert.equal(state.timerStatus, 'IDLE');
  assert.equal(state.latestSolve, null);
  assert.equal(mockHaptics._getNotificationAsyncCalls().length, 0);
});

test('AC-3: Face turns increment moveCount while orientation presets do not', () => {
  useCubeStore.getState().resetGame();
  assert.equal(useCubeStore.getState().moveCount, 0);

  // View orientation presets must not increment moveCount
  useCubeStore.getState().triggerOrientationPreset('yellow-top');
  useCubeStore.getState().triggerOrientationPreset('white-top');
  useCubeStore.getState().triggerOrientationPreset('reset');
  assert.equal(useCubeStore.getState().moveCount, 0);

  // Manual face turns increment moveCount
  useCubeStore.getState().requestMove('U');
  useCubeStore.getState().finishMoveAnimation();
  assert.equal(useCubeStore.getState().moveCount, 1);

  useCubeStore.getState().requestMove("U'");
  useCubeStore.getState().finishMoveAnimation();
  assert.equal(useCubeStore.getState().moveCount, 2);
});

test('AC-5, AC-6, AC-7: Automatic solve completion stops timer, creates SolveRecord, and triggers victory haptic', () => {
  const originalOS = Platform.OS;
  Platform.OS = 'android';
  try {
    useCubeStore.getState().resetGame();
    mockHaptics._resetNotificationAsyncCalls();

    // Scramble with a single known move R
    useCubeStore.getState().startScramble(['R']);
    useCubeStore.getState().finishMoveAnimation();

    let state = useCubeStore.getState();
    assert.equal(state.gamePhase, 'PLAYING');
    assert.equal(state.timerStatus, 'IDLE');
    assert.equal(state.scrambleNotation, 'R');

    // Solving move R'
    useCubeStore.getState().requestMove("R'");
    state = useCubeStore.getState();
    assert.equal(state.timerStatus, 'RUNNING');
    const startTime = state.solveStartTime;
    assert.ok(startTime);

    // Complete R' animation: cube reaches solved state!
    useCubeStore.getState().finishMoveAnimation();

    state = useCubeStore.getState();
    assert.equal(isCubeSolved(state.cubeState), true);
    assert.equal(state.timerStatus, 'STOPPED');
    assert.ok(typeof state.solveEndTime === 'number');
    assert.ok(state.solveEndTime >= startTime);
    assert.equal(state.moveCount, 1);

    // AC-6: Validate latestSolve record
    const solve = state.latestSolve;
    assert.ok(solve !== null, 'latestSolve must be populated');
    assert.ok(typeof solve.id === 'string' && solve.id.length > 0);
    assert.equal(solve.moveCount, 1);
    assert.equal(solve.scrambleNotation, 'R');
    assert.ok(typeof solve.timeMs === 'number');
    assert.ok(typeof solve.turnsPerSecond === 'number');
    assert.equal(state.isVictoryDismissed, false);

    // AC-7: Victory haptic triggered
    const hapticCalls = mockHaptics._getNotificationAsyncCalls();
    assert.equal(hapticCalls.length, 1);
    assert.equal(hapticCalls[0], mockHaptics.NotificationFeedbackType.Success);
  } finally {
    Platform.OS = originalOS;
  }
});

test('AC-8: Mid-solve scramble immediately aborts active timer and clears progress', () => {
  useCubeStore.getState().resetGame();

  useCubeStore.getState().startScramble(['U']);
  useCubeStore.getState().finishMoveAnimation();

  // Start timer with a manual move
  useCubeStore.getState().requestMove('R');
  assert.equal(useCubeStore.getState().timerStatus, 'RUNNING');

  // Mid-solve scramble
  useCubeStore.getState().scrambleCube(3);

  const state = useCubeStore.getState();
  assert.equal(state.timerStatus, 'IDLE');
  assert.equal(state.solveStartTime, null);
  assert.equal(state.solveEndTime, null);
  assert.equal(state.timerMs, 0);
  assert.equal(state.latestSolve, null);
  assert.equal(state.moveCount, 0);
});

test('AC-8: Manual game reset aborts active timer and clears solve state', () => {
  useCubeStore.getState().resetGame();

  useCubeStore.getState().startScramble(['F']);
  useCubeStore.getState().finishMoveAnimation();

  useCubeStore.getState().requestMove('U');
  assert.equal(useCubeStore.getState().timerStatus, 'RUNNING');

  useCubeStore.getState().resetGame();

  const state = useCubeStore.getState();
  assert.equal(state.timerStatus, 'IDLE');
  assert.equal(state.solveStartTime, null);
  assert.equal(state.solveEndTime, null);
  assert.equal(state.timerMs, 0);
  assert.equal(state.latestSolve, null);
  assert.equal(state.scrambleNotation, '');
});

test('AC-10: Post-solve face turns maintain timerStatus STOPPED', () => {
  const originalOS = Platform.OS;
  Platform.OS = 'android';
  try {
    useCubeStore.getState().resetGame();
    mockHaptics._resetNotificationAsyncCalls();

    // Fast solve: scramble R, solve with R'
    useCubeStore.getState().startScramble(['R']);
    useCubeStore.getState().finishMoveAnimation();
    useCubeStore.getState().requestMove("R'");
    useCubeStore.getState().finishMoveAnimation();

    assert.equal(useCubeStore.getState().timerStatus, 'STOPPED');
    const originalSolve = useCubeStore.getState().latestSolve;
    assert.ok(originalSolve);

    // Dismiss victory card
    useCubeStore.getState().dismissVictoryCard();
    assert.equal(useCubeStore.getState().isVictoryDismissed, true);

    // Turn face on solved cube after dismissal
    useCubeStore.getState().requestMove('U');
    useCubeStore.getState().finishMoveAnimation();

    const state = useCubeStore.getState();
    assert.equal(state.timerStatus, 'STOPPED', 'timerStatus must remain STOPPED on post-solve moves');
    assert.deepEqual(state.latestSolve, originalSolve, 'Original solve record must not be overwritten');
    assert.equal(mockHaptics._getNotificationAsyncCalls().length, 1, 'No additional victory haptics');
  } finally {
    Platform.OS = originalOS;
  }
});


test('Store timer actions: startTimer, stopTimer, updateTimer, resetTimer, dismissVictoryCard', () => {
  useCubeStore.getState().resetGame();

  // startTimer fails if not scrambled
  const startedCasual = useCubeStore.getState().startTimer();
  assert.equal(startedCasual, false);

  // Set scrambled notation & phase
  useCubeStore.setState({
    gamePhase: 'PLAYING',
    scrambleNotation: 'R U F',
    timerStatus: 'IDLE',
  });

  const started = useCubeStore.getState().startTimer();
  assert.equal(started, true);
  assert.equal(useCubeStore.getState().timerStatus, 'RUNNING');

  // updateTimer updates timerMs
  const startTime = useCubeStore.getState().solveStartTime;
  assert.ok(startTime);
  useCubeStore.getState().updateTimer(startTime + 3500);
  assert.equal(useCubeStore.getState().timerMs, 3500);

  // stopTimer creates record
  const record = useCubeStore.getState().stopTimer();
  assert.ok(record !== null);
  assert.equal(useCubeStore.getState().timerStatus, 'STOPPED');
  assert.deepEqual(useCubeStore.getState().latestSolve, record);

  // dismissVictoryCard
  useCubeStore.getState().dismissVictoryCard();
  assert.equal(useCubeStore.getState().isVictoryDismissed, true);

  // resetTimer
  useCubeStore.getState().resetTimer();
  const resetState = useCubeStore.getState();
  assert.equal(resetState.timerStatus, 'IDLE');
  assert.equal(resetState.solveStartTime, null);
  assert.equal(resetState.timerMs, 0);
  assert.equal(resetState.isVictoryDismissed, false);
});

test('AC-1: startMoveAnimation starts timer on scrambled cube in PLAYING phase', () => {
  useCubeStore.getState().resetGame();
  useCubeStore.setState({
    gamePhase: 'PLAYING',
    scrambleNotation: "F R U",
    timerStatus: 'IDLE',
  });

  useCubeStore.getState().startMoveAnimation('U');
  const state = useCubeStore.getState();
  assert.equal(state.timerStatus, 'RUNNING');
  assert.ok(typeof state.solveStartTime === 'number');
  assert.equal(state.isAnimating, true);
  assert.equal(state.animatingMove?.move, 'U');
});

test('AC-5: applyMoveDirect transitions to STOPPED and creates SolveRecord on solve', () => {
  useCubeStore.getState().resetGame();
  useCubeStore.setState({
    gamePhase: 'PLAYING',
    scrambleNotation: 'R',
    timerStatus: 'IDLE',
  });

  // Make move R to scramble slightly
  useCubeStore.getState().applyMoveDirect('R');
  let state = useCubeStore.getState();
  assert.equal(state.timerStatus, 'RUNNING');
  assert.equal(state.moveCount, 1);

  // Now solve with R'
  useCubeStore.getState().applyMoveDirect("R'");
  state = useCubeStore.getState();
  assert.equal(state.timerStatus, 'STOPPED');
  assert.equal(state.gamePhase, 'SOLVED');
  assert.equal(state.moveCount, 2);
  assert.ok(state.latestSolve !== null);
  assert.equal(state.latestSolve?.moveCount, 2);
  assert.equal(state.latestSolve?.scrambleNotation, 'R');
});

test('AC-9: App backgrounding simulation preserves monotonic duration tracking', () => {
  useCubeStore.getState().resetGame();
  useCubeStore.setState({
    gamePhase: 'PLAYING',
    scrambleNotation: 'U',
    timerStatus: 'IDLE',
  });

  useCubeStore.getState().startTimer();
  const startTime = useCubeStore.getState().solveStartTime;
  assert.ok(startTime);

  // Simulate returning from background 10 seconds later
  const simulatedForegroundTime = startTime + 10250;
  useCubeStore.getState().updateTimer(simulatedForegroundTime);

  const state = useCubeStore.getState();
  assert.equal(state.timerStatus, 'RUNNING');
  assert.equal(state.timerMs, 10250);
});


