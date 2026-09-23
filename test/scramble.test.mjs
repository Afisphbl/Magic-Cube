import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateScramble,
  formatScrambleNotation,
  isValidScrambleSequence,
  getBaseFace,
  getMoveAxis,
  FACE_TO_AXIS,
} from '../src/logic/scramble.ts';
import {
  useCubeStore,
  createSolvedCubeState,
  validateCubeState,
  isCubeSolved,
} from '../src/store/useCubeStore.ts';
import { applyMove, ALL_MOVE_NAMES } from '../src/logic/cubeMoves.ts';

// AC-1: Pseudo random scramble generator creates sequence of 20 to 25 legal Singmaster moves
test('AC-1: generateScramble produces between 20 and 25 legal moves by default', () => {
  for (let i = 0; i < 50; i++) {
    const scramble = generateScramble();
    assert.ok(scramble.length >= 20 && scramble.length <= 25, `Expected 20..25 moves, got ${scramble.length}`);
    assert.equal(isValidScrambleSequence(scramble), true, `Generated scramble must be valid: ${scramble.join(' ')}`);
  }
});

test('AC-1: generateScramble respects explicit length parameter when provided', () => {
  const scramble15 = generateScramble(15);
  assert.equal(scramble15.length, 15);
  assert.equal(isValidScrambleSequence(scramble15, false), true);

  const scramble30 = generateScramble(30);
  assert.equal(scramble30.length, 30);
  assert.equal(isValidScrambleSequence(scramble30, false), true);
});

test('AC-1: generateScramble never produces consecutive turns on the same face', () => {
  for (let i = 0; i < 50; i++) {
    const scramble = generateScramble();
    for (let j = 1; j < scramble.length; j++) {
      const prevFace = getBaseFace(scramble[j - 1]);
      const currFace = getBaseFace(scramble[j]);
      assert.notEqual(prevFace, currFace, `Consecutive face turn found at index ${j}: ${scramble[j - 1]} followed by ${scramble[j]}`);
    }
  }
});

test('AC-1: generateScramble never produces same axis sandwich cancellations', () => {
  for (let i = 0; i < 50; i++) {
    const scramble = generateScramble();
    for (let j = 2; j < scramble.length; j++) {
      const face0 = getBaseFace(scramble[j]);
      const face1 = getBaseFace(scramble[j - 1]);
      const face2 = getBaseFace(scramble[j - 2]);

      const axis0 = FACE_TO_AXIS[face0];
      const axis1 = FACE_TO_AXIS[face1];
      const axis2 = FACE_TO_AXIS[face2];

      // No 3 consecutive turns along the same axis
      const allThreeSameAxis = axis0 === axis1 && axis1 === axis2;
      assert.equal(
        allThreeSameAxis,
        false,
        `Three consecutive turns on same axis: ${scramble[j - 2]} ${scramble[j - 1]} ${scramble[j]}`
      );

      // No sandwich cancellation (e.g. R L R or U D U')
      if (axis0 === axis1) {
        assert.notEqual(
          face0,
          face2,
          `Sandwich cancellation on same face across opposite face: ${scramble[j - 2]} ${scramble[j - 1]} ${scramble[j]}`
        );
      }
    }
  }
});

test('AC-1: isValidScrambleSequence catches invalid sequences', () => {
  // Empty or non array
  assert.equal(isValidScrambleSequence([]), false);
  assert.equal(isValidScrambleSequence(null), false);

  // Too short or too long
  assert.equal(isValidScrambleSequence(['R', 'U'], true), false);
  assert.equal(isValidScrambleSequence(new Array(26).fill('R'), true), false);

  // Invalid move token
  assert.equal(isValidScrambleSequence(['R', 'U', 'X']), false);

  // Consecutive same face
  assert.equal(isValidScrambleSequence(['R', "R'", 'U', 'D']), false);
  assert.equal(isValidScrambleSequence(['F', 'F2', 'L', 'R']), false);

  // Three moves on the same axis
  assert.equal(isValidScrambleSequence(['R', 'L', 'R', 'U']), false);
  assert.equal(isValidScrambleSequence(['U', 'D', "U'", 'B']), false);
  assert.equal(isValidScrambleSequence(['F', 'B', 'F2', 'L']), false);
});

test('AC-1: formatScrambleNotation formats array into space delimited string', () => {
  assert.equal(formatScrambleNotation(['R', 'U2', "F'", 'L', 'D2', 'B']), "R U2 F' L D2 B");
  assert.equal(formatScrambleNotation([]), '');
});

// AC-2: Mathematical solvability guarantee
test('AC-2: applying scramble sequence preserves cube invariants and yields solvable non trivial state', () => {
  const solved = createSolvedCubeState();

  for (let i = 0; i < 20; i++) {
    const scramble = generateScramble();
    let state = [...solved];
    for (const move of scramble) {
      state = applyMove(state, move);
    }

    const validation = validateCubeState(state);
    assert.equal(validation.valid, true, `Cube state validation failed: ${validation.error}`);
    assert.equal(isCubeSolved(state), false, '20-move scramble must produce non trivial scrambled cube');
  }
});

// AC-3: Scramble action store initialization
test('AC-3: scrambleCube resets stats, populates queue, and sets SCRAMBLING phase', () => {
  useCubeStore.getState().resetGame();
  useCubeStore.getState().setTimerMs(45000);
  useCubeStore.getState().incrementMoveCount();
  useCubeStore.getState().incrementMoveCount();

  useCubeStore.getState().scrambleCube(20);

  const state = useCubeStore.getState();
  assert.equal(state.gamePhase, 'SCRAMBLING');
  assert.equal(state.timerMs, 0, 'Timer must be reset to zero');
  assert.equal(state.moveCount, 0, 'Move count must be reset to zero');
  assert.deepEqual(state.moveHistory, [], 'Move history must be empty');
  assert.equal(state.isAnimating, true, 'isAnimating must be true');
  assert.ok(state.animatingMove !== null, 'animatingMove must be active');
  assert.equal(state.animatingMove?.durationMs, 70, 'Scramble turn duration must be 70ms');
  assert.equal(state.latestScramble.length, 20);
  assert.equal(state.scrambleQueue.length, 19);
  assert.equal(state.scrambleNotation, state.latestScramble.join(' '));
});

// AC-4 & AC-6: High speed animation chaining and queue exhaustion
test('AC-4 & AC-6: finishMoveAnimation chains queued scramble moves at 70ms and transitions to PLAYING', () => {
  useCubeStore.getState().resetGame();
  useCubeStore.getState().scrambleCube(20);

  const totalMoves = useCubeStore.getState().latestScramble.length;

  for (let step = 0; step < totalMoves; step++) {
    const currentQueueLength = useCubeStore.getState().scrambleQueue.length;
    if (currentQueueLength > 0) {
      assert.equal(useCubeStore.getState().gamePhase, 'SCRAMBLING');
      assert.equal(useCubeStore.getState().animatingMove?.durationMs, 70);
    }
    useCubeStore.getState().finishMoveAnimation();
  }

  const finalState = useCubeStore.getState();
  assert.equal(finalState.gamePhase, 'PLAYING', 'Phase must transition to PLAYING on queue exhaustion');
  assert.equal(finalState.isAnimating, false);
  assert.equal(finalState.animatingMove, null);
  assert.equal(finalState.scrambleQueue.length, 0);
  assert.equal(finalState.moveCount, 0, 'Move count must remain 0 after scramble completion');
  assert.deepEqual(finalState.moveHistory, []);
  assert.equal(isCubeSolved(finalState.cubeState), false, 'Cube must be in scrambled state');
});

// AC-5: Instant skip interaction
test('AC-5: skipScramble aborts in flight animation, applies all remaining turns, and sets PLAYING phase', () => {
  useCubeStore.getState().resetGame();
  useCubeStore.getState().scrambleCube(22);

  const fullSequence = useCubeStore.getState().latestScramble;

  // Let 3 moves animate normally
  useCubeStore.getState().finishMoveAnimation();
  useCubeStore.getState().finishMoveAnimation();
  useCubeStore.getState().finishMoveAnimation();

  // In the middle of move 4, player triggers skip
  assert.equal(useCubeStore.getState().gamePhase, 'SCRAMBLING');
  useCubeStore.getState().skipScramble();

  const skippedState = useCubeStore.getState();
  assert.equal(skippedState.gamePhase, 'PLAYING');
  assert.equal(skippedState.isAnimating, false);
  assert.equal(skippedState.animatingMove, null);
  assert.equal(skippedState.scrambleQueue.length, 0);
  assert.equal(skippedState.moveCount, 0);
  assert.deepEqual(skippedState.moveHistory, []);

  // Compute what the state would be if all 22 moves were applied directly from solved
  let expectedState = createSolvedCubeState();
  for (const move of fullSequence) {
    expectedState = applyMove(expectedState, move);
  }

  assert.deepEqual(
    skippedState.cubeState,
    expectedState,
    'Skipping scramble must yield the exact same cubeState as letting all moves finish'
  );
});

test('AC-5: skipScramble is safe when called while not scrambling', () => {
  useCubeStore.getState().resetGame();
  const stateBefore = useCubeStore.getState();

  useCubeStore.getState().skipScramble();
  const stateAfter = useCubeStore.getState();

  assert.deepEqual(stateBefore.cubeState, stateAfter.cubeState);
  assert.equal(stateAfter.gamePhase, 'SOLVED');
});

// AC-8: Mid solve scramble triggering
test('AC-8: scrambleCube mid solve aborts active manual turns and begins fresh scramble cleanly', () => {
  useCubeStore.getState().resetGame();

  // Player starts a solve session and makes moves
  useCubeStore.getState().requestMove('R');
  useCubeStore.getState().finishMoveAnimation();
  useCubeStore.getState().requestMove('U');
  useCubeStore.getState().finishMoveAnimation();
  useCubeStore.getState().setTimerMs(32000);

  let state = useCubeStore.getState();
  assert.equal(state.gamePhase, 'PLAYING');
  assert.equal(state.moveCount, 2);
  assert.equal(state.timerMs, 32000);

  // Player starts another manual move and it is animating
  useCubeStore.getState().requestMove('F');
  assert.equal(useCubeStore.getState().isAnimating, true);

  // Mid solve, player decides to scramble
  useCubeStore.getState().scrambleCube(20);

  state = useCubeStore.getState();
  assert.equal(state.gamePhase, 'SCRAMBLING');
  assert.equal(state.timerMs, 0);
  assert.equal(state.moveCount, 0);
  assert.deepEqual(state.moveHistory, []);
  assert.equal(state.latestScramble.length, 20);
  assert.equal(state.animatingMove?.durationMs, 70);
  assert.equal(state.scrambleQueue.length, 19);

  // Finish scramble via skip
  useCubeStore.getState().skipScramble();
  assert.equal(useCubeStore.getState().gamePhase, 'PLAYING');
  assert.equal(useCubeStore.getState().moveCount, 0);
});

// AC-1 Edge cases and move mappings
test('AC-1: getBaseFace and getMoveAxis correctly categorize all 18 standard Singmaster moves', () => {
  for (const move of ALL_MOVE_NAMES) {
    const base = getBaseFace(move);
    assert.ok(['U', 'D', 'L', 'R', 'F', 'B'].includes(base), `Base face for ${move} must be valid`);

    const axis = getMoveAxis(move);
    if (base === 'L' || base === 'R') assert.equal(axis, 0);
    if (base === 'U' || base === 'D') assert.equal(axis, 1);
    if (base === 'F' || base === 'B') assert.equal(axis, 2);
  }
});

test('AC-1: generateScramble falls back to default 20..25 range on zero or negative length', () => {
  const zeroLen = generateScramble(0);
  assert.ok(zeroLen.length >= 20 && zeroLen.length <= 25);

  const negLen = generateScramble(-5);
  assert.ok(negLen.length >= 20 && negLen.length <= 25);
});

// AC-3: Clearing buffered pending moves
test('AC-3: scrambleCube clears any buffered pending move', () => {
  useCubeStore.getState().resetGame();
  useCubeStore.getState().requestMove('R'); // starts animating
  useCubeStore.getState().requestMove('U'); // buffers as pendingMove

  assert.ok(useCubeStore.getState().isAnimating);
  assert.equal(useCubeStore.getState().pendingMove, 'U');

  useCubeStore.getState().scrambleCube(20);

  const state = useCubeStore.getState();
  assert.equal(state.gamePhase, 'SCRAMBLING');
  assert.equal(state.pendingMove, null, 'Pending move buffer must be cleared on scramble');
});

// AC-6: Redundant finishMoveAnimation calls after skip
test('AC-6: redundant finishMoveAnimation calls after skipScramble are safe no-ops', () => {
  useCubeStore.getState().resetGame();
  useCubeStore.getState().scrambleCube(20);
  useCubeStore.getState().skipScramble();

  const stateAfterSkip = useCubeStore.getState();
  assert.equal(stateAfterSkip.gamePhase, 'PLAYING');
  assert.equal(stateAfterSkip.animatingMove, null);

  // Simulate late animation completion frame
  useCubeStore.getState().finishMoveAnimation();
  const stateAfterLateFrame = useCubeStore.getState();

  assert.deepEqual(stateAfterLateFrame.cubeState, stateAfterSkip.cubeState);
  assert.equal(stateAfterLateFrame.gamePhase, 'PLAYING');
  assert.equal(stateAfterLateFrame.moveCount, 0);
});
