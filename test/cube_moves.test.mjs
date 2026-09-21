import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMove,
  isCubeSolved,
  validateCubeState,
  createSolvedCubeState,
  getMoveAnimationInfo,
  getNextGamePhase,
  getFaceTangents,
  resolveFaceDragMove,
  getStickerIndex,
  ALL_MOVE_NAMES,
} from '../src/logic/cubeMoves.ts';

const BASE_MOVES = ['U', 'D', 'L', 'R', 'F', 'B'];

test('getStickerIndex maps all valid faces and coordinates to 0..53 range without collisions', () => {
  const seenIndices = new Set();
  const faceTests = [
    { face: 0, min: 18, max: 26, getCoords: (u, v) => [1, u, v] },   // Right (+X)
    { face: 1, min: 27, max: 35, getCoords: (u, v) => [-1, u, v] },  // Left (-X)
    { face: 2, min: 0, max: 8, getCoords: (u, v) => [u, 1, v] },     // Up (+Y)
    { face: 3, min: 9, max: 17, getCoords: (u, v) => [u, -1, v] },   // Down (-Y)
    { face: 4, min: 36, max: 44, getCoords: (u, v) => [u, v, 1] },   // Front (+Z)
    { face: 5, min: 45, max: 53, getCoords: (u, v) => [u, v, -1] },  // Back (-Z)
  ];

  for (const { face, min, max, getCoords } of faceTests) {
    for (const u of [-1, 0, 1]) {
      for (const v of [-1, 0, 1]) {
        const [x, y, z] = getCoords(u, v);
        const idx = getStickerIndex(face, x, y, z);
        assert.ok(idx >= min && idx <= max, `Sticker index ${idx} out of range for face ${face}`);
        seenIndices.add(idx);
      }
    }
  }

  assert.equal(seenIndices.size, 54, 'Expected exactly 54 unique sticker indices');
  assert.equal(getStickerIndex(99, 0, 0, 0), -1, 'Invalid face index must return -1');
});

test('validateCubeState enforces array length and color conservation invariants', () => {
  const solved = createSolvedCubeState();
  const validRes = validateCubeState(solved);
  assert.equal(validRes.valid, true);

  // Invalid length
  assert.equal(validateCubeState(solved.slice(0, 50)).valid, false);
  assert.equal(validateCubeState([...solved, 0]).valid, false);

  // Non-array
  assert.equal(validateCubeState(null).valid, false);
  assert.equal(validateCubeState({}).valid, false);

  // Invalid sticker value
  const badVal = [...solved];
  badVal[0] = 99;
  assert.equal(validateCubeState(badVal).valid, false);

  // Violated color distribution (10 whites, 8 yellows)
  const imbalanced = [...solved];
  imbalanced[9] = 0; // turn a yellow sticker into white
  const imbalancedRes = validateCubeState(imbalanced);
  assert.equal(imbalancedRes.valid, false);
  assert.ok(imbalancedRes.error.includes('Color distribution invariant violated'));
});

test('isCubeSolved recognizes solved cube across arbitrary orientations', () => {
  const solved = createSolvedCubeState();
  assert.equal(isCubeSolved(solved), true, 'Standard solved state must return true');

  // Permute the colors of entire faces (simulating a cube solved in a rotated orientation)
  // Original faces: 0, 1, 2, 3, 4, 5 -> Reassigned: 1, 0, 3, 2, 5, 4
  const colorPermutation = [1, 0, 3, 2, 5, 4];
  const rotatedSolved = new Array(54);
  for (let face = 0; face < 6; face++) {
    const newColor = colorPermutation[face];
    for (let s = 0; s < 9; s++) {
      rotatedSolved[face * 9 + s] = newColor;
    }
  }
  assert.equal(isCubeSolved(rotatedSolved), true, 'Cube solved in alternative orientation must return true');

  // Altering any single sticker breaks solved status
  for (let i = 0; i < 54; i++) {
    const altered = [...solved];
    altered[i] = (altered[i] + 1) % 6;
    assert.equal(isCubeSolved(altered), false, `State with sticker ${i} changed must not be solved`);
  }

  // Two faces with identical colors is not solved
  const duplicateFace = [...solved];
  for (let s = 0; s < 9; s++) {
    duplicateFace[9 + s] = 0; // face 1 identical to face 0
  }
  assert.equal(isCubeSolved(duplicateFace), false, 'Cube with duplicate face colors must not be solved');
});

test('all 18 legal moves maintain valid 54-element sticker distribution', () => {
  const solved = createSolvedCubeState();

  for (const move of ALL_MOVE_NAMES) {
    const after = applyMove(solved, move);
    assert.equal(after.length, 54, `Move ${move} must preserve length 54`);

    const validation = validateCubeState(after);
    assert.equal(validation.valid, true, `Move ${move} must produce valid cube state: ${validation.error}`);
  }
});

test('four quarter turns of any face return cube to original state', () => {
  const initial = createSolvedCubeState();

  for (const base of BASE_MOVES) {
    let state = initial;
    for (let i = 0; i < 4; i++) {
      state = applyMove(state, base);
    }
    assert.deepEqual(state, initial, `Applying 4x ${base} must restore original state`);
  }
});

test('inverse move cancels forward move', () => {
  const initial = createSolvedCubeState();

  for (const base of BASE_MOVES) {
    const forward = applyMove(initial, base);
    const undone = applyMove(forward, `${base}'`);
    assert.deepEqual(undone, initial, `${base} followed by ${base}' must restore state`);

    const reverseFirst = applyMove(initial, `${base}'`);
    const redone = applyMove(reverseFirst, base);
    assert.deepEqual(redone, initial, `${base}' followed by ${base} must restore state`);
  }
});

test('double turn equals two consecutive quarter turns', () => {
  const initial = createSolvedCubeState();

  for (const base of BASE_MOVES) {
    const doubleTurn = applyMove(initial, `${base}2`);
    const twoSingles = applyMove(applyMove(initial, base), base);
    assert.deepEqual(doubleTurn, twoSingles, `${base}2 must match two ${base} turns`);
  }
});

test('applyMove returns unchanged state for unknown move name', () => {
  const initial = createSolvedCubeState();
  const unchanged = applyMove(initial, 'INVALID');
  assert.equal(unchanged, initial);
});

test('getMoveAnimationInfo provides correct axis, angle, duration, and filter', () => {
  for (const base of BASE_MOVES) {
    const baseInfo = getMoveAnimationInfo(base, 250, 'ease-out');
    assert.ok(Array.isArray(baseInfo.axis) && baseInfo.axis.length === 3);
    assert.ok(typeof baseInfo.angle === 'number');
    assert.equal(baseInfo.durationMs, 250);
    assert.equal(baseInfo.easing, 'ease-out');
    assert.ok(typeof baseInfo.filter === 'function');

    const primeInfo = getMoveAnimationInfo(`${base}'`);
    assert.equal(primeInfo.angle, -baseInfo.angle, 'Prime move angle must be negative of base angle');
    assert.deepEqual(primeInfo.axis, baseInfo.axis, 'Prime move axis must match base axis');

    const doubleInfo = getMoveAnimationInfo(`${base}2`);
    assert.equal(doubleInfo.angle, baseInfo.angle * 2, 'Double turn angle must be double base angle');
    assert.deepEqual(doubleInfo.axis, baseInfo.axis, 'Double turn axis must match base axis');
  }
});

test('getNextGamePhase transitions properly across game lifecycle and buffer states', () => {
  // Scramble mode override
  assert.equal(getNextGamePhase('SOLVED', true, false, true), 'SCRAMBLING');
  assert.equal(getNextGamePhase('PLAYING', false, false, true), 'SCRAMBLING');

  // While in SCRAMBLING: stays SCRAMBLING until pending/scramble moves drain
  assert.equal(getNextGamePhase('SCRAMBLING', false, true, false), 'SCRAMBLING');
  assert.equal(getNextGamePhase('SCRAMBLING', false, false, false), 'PLAYING');
  assert.equal(getNextGamePhase('SCRAMBLING', true, false, false), 'SOLVED', 'Transitions to SOLVED if scramble ends in solved state');

  // While in PLAYING: transitions to SOLVED only if solved and buffer is drained
  assert.equal(getNextGamePhase('PLAYING', true, false, false), 'SOLVED');
  assert.equal(getNextGamePhase('PLAYING', true, true, false), 'PLAYING', 'Deferred solve if pending moves exist');
  assert.equal(getNextGamePhase('PLAYING', false, false, false), 'PLAYING');

  // While in SOLVED: becomes PLAYING on unsolved move
  assert.equal(getNextGamePhase('SOLVED', false, false, false), 'PLAYING');
  assert.equal(getNextGamePhase('SOLVED', true, false, false), 'SOLVED');
});

test('getFaceTangents returns orthogonal tangents in plane of face', () => {
  const normals = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];

  for (const normal of normals) {
    const [t1, t2] = getFaceTangents(normal);
    const dot1 = normal[0] * t1[0] + normal[1] * t1[1] + normal[2] * t1[2];
    const dot2 = normal[0] * t2[0] + normal[1] * t2[1] + normal[2] * t2[2];
    assert.equal(dot1, 0, 'Tangent 1 must be perpendicular to normal');
    assert.equal(dot2, 0, 'Tangent 2 must be perpendicular to normal');

    const dotBetween = t1[0] * t2[0] + t1[1] * t2[1] + t1[2] * t2[2];
    assert.equal(dotBetween, 0, 'Tangents must be mutually perpendicular');
  }

  const fallback = getFaceTangents([0, 0, 0]);
  assert.deepEqual(fallback, [[1, 0, 0], [0, 1, 0]]);
});

test('resolveFaceDragMove maps drag directions to correct face rotations', () => {
  const move1 = resolveFaceDragMove([0, 0, 1], [0, 1, 1], [1, 0, 0]);
  assert.equal(move1, "U'");

  const move2 = resolveFaceDragMove([0, 0, 1], [0, 1, 1], [-1, 0, 0]);
  assert.equal(move2, 'U');

  const move3 = resolveFaceDragMove([0, 0, 1], [1, 0, 1], [0, -1, 0]);
  assert.equal(move3, "R'");

  const move4 = resolveFaceDragMove([0, 0, 1], [1, 0, 1], [0, 1, 0]);
  assert.equal(move4, 'R');

  const nullMove = resolveFaceDragMove([0, 0, 1], [0, 0, 1], [1, 0, 0]);
  assert.equal(nullMove, null);
});

// AC-1: restoreSolvedCubeState produces fresh independent solved cube state
test('restoreSolvedCubeState returns fresh independent solved state array (AC-1)', () => {
  const s1 = createSolvedCubeState();
  const s2 = createSolvedCubeState();
  assert.deepEqual(s1, s2);
  s1[0] = 5;
  assert.notDeepEqual(s1, s2, 'Mutating state must not affect other instances');
});

// AC-6: validateCubeState edge cases
test('validateCubeState handles non-numeric values, negative numbers, floats, and empty arrays (AC-6)', () => {
  assert.equal(validateCubeState([]).valid, false);
  assert.equal(validateCubeState(undefined).valid, false);

  const solved = createSolvedCubeState();

  // Float value
  const floatState = [...solved];
  floatState[0] = 1.5;
  assert.equal(validateCubeState(floatState).valid, false);

  // Negative value
  const negState = [...solved];
  negState[0] = -1;
  assert.equal(validateCubeState(negState).valid, false);

  // String value
  const strState = [...solved];
  strState[0] = '0';
  assert.equal(validateCubeState(strState).valid, false);

  // NaN value
  const nanState = [...solved];
  nanState[0] = NaN;
  assert.equal(validateCubeState(nanState).valid, false);
});

// AC-3: isCubeSolved edge cases
test('isCubeSolved handles edge cases of null, undefined, and malformed inputs (AC-3)', () => {
  assert.equal(isCubeSolved(null), false);
  assert.equal(isCubeSolved(undefined), false);
  assert.equal(isCubeSolved([]), false);
  assert.equal(isCubeSolved(new Array(53).fill(0)), false);
  assert.equal(isCubeSolved(new Array(55).fill(0)), false);
});

// AC-2: Six repetitions of (R U R' U') return cube to solved state
test('six repetitions of sexy move (R U R prime U prime) return cube to solved state (AC-2)', () => {
  const initial = createSolvedCubeState();
  let state = initial;
  const cycle = ['R', 'U', "R'", "U'"];

  for (let rep = 0; rep < 6; rep++) {
    for (const move of cycle) {
      state = applyMove(state, move);
    }
  }

  assert.deepEqual(state, initial, '6x (R U R prime U prime) must return cube to solved state');
  assert.equal(isCubeSolved(state), true);
});

// AC-5: getMoveAnimationInfo slice filter coverage
test('getMoveAnimationInfo filters cubies on slice accurately (AC-5)', () => {
  const coords = [];
  for (const x of [-1, 0, 1]) {
    for (const y of [-1, 0, 1]) {
      for (const z of [-1, 0, 1]) {
        coords.push([x, y, z]);
      }
    }
  }

  const uInfo = getMoveAnimationInfo('U', 300, 'cubic-bezier(0.4, 0, 0.2, 1)');
  assert.equal(uInfo.durationMs, 300);
  assert.equal(uInfo.easing, 'cubic-bezier(0.4, 0, 0.2, 1)');

  const uCubies = coords.filter(uInfo.filter);
  assert.equal(uCubies.length, 9, 'U move must filter exactly 9 cubies where y === 1');
  assert.ok(uCubies.every(([_, y]) => y === 1));

  const dInfo = getMoveAnimationInfo('D');
  const dCubies = coords.filter(dInfo.filter);
  assert.equal(dCubies.length, 9, 'D move must filter exactly 9 cubies where y === -1');
  assert.ok(dCubies.every(([_, y]) => y === -1));

  const rInfo = getMoveAnimationInfo('R');
  const rCubies = coords.filter(rInfo.filter);
  assert.equal(rCubies.length, 9, 'R move must filter exactly 9 cubies where x === 1');
  assert.ok(rCubies.every(([x]) => x === 1));

  const lInfo = getMoveAnimationInfo('L');
  const lCubies = coords.filter(lInfo.filter);
  assert.equal(lCubies.length, 9, 'L move must filter exactly 9 cubies where x === -1');
  assert.ok(lCubies.every(([x]) => x === -1));

  const fInfo = getMoveAnimationInfo('F');
  const fCubies = coords.filter(fInfo.filter);
  assert.equal(fCubies.length, 9, 'F move must filter exactly 9 cubies where z === 1');
  assert.ok(fCubies.every(([_, __, z]) => z === 1));

  const bInfo = getMoveAnimationInfo('B');
  const bCubies = coords.filter(bInfo.filter);
  assert.equal(bCubies.length, 9, 'B move must filter exactly 9 cubies where z === -1');
  assert.ok(bCubies.every(([_, __, z]) => z === -1));
});
