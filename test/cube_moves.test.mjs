import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMove,
  isCubeSolved,
  getMoveAnimationInfo,
  getFaceTangents,
  resolveFaceDragMove,
  getStickerIndex,
} from '../src/logic/cubeMoves.ts';

const BASE_MOVES = ['U', 'D', 'L', 'R', 'F', 'B'];
const ALL_18_MOVES = [
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'L', "L'", 'L2',
  'R', "R'", 'R2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
];

function createSolvedState() {
  const state = new Array(54);
  for (let face = 0; face < 6; face++) {
    for (let s = 0; s < 9; s++) {
      state[face * 9 + s] = face;
    }
  }
  return state;
}

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

test('isCubeSolved correctly identifies solved and perturbed states', () => {
  const solved = createSolvedState();
  assert.equal(isCubeSolved(solved), true, 'Initial state must be solved');

  // Altering any single sticker breaks solved status
  for (let i = 0; i < 54; i++) {
    const altered = [...solved];
    altered[i] = (altered[i] + 1) % 6;
    assert.equal(isCubeSolved(altered), false, `State with sticker ${i} changed must not be solved`);
  }

  // Any single quarter-turn move breaks solved status
  for (const move of ALL_18_MOVES) {
    const afterMove = applyMove(solved, move);
    assert.equal(isCubeSolved(afterMove), false, `State after ${move} must not be solved`);
  }
});

test('all 18 legal moves maintain valid 54-element sticker distribution', () => {
  const solved = createSolvedState();

  for (const move of ALL_18_MOVES) {
    const after = applyMove(solved, move);
    assert.equal(after.length, 54, `Move ${move} must preserve length 54`);

    // Must still have exactly 9 stickers of each face color
    const counts = [0, 0, 0, 0, 0, 0];
    for (const val of after) {
      counts[val]++;
    }
    assert.deepEqual(counts, [9, 9, 9, 9, 9, 9], `Move ${move} must preserve face counts`);
  }
});

test('four quarter turns of any face return cube to original state', () => {
  const initial = createSolvedState();

  for (const base of BASE_MOVES) {
    let state = initial;
    for (let i = 0; i < 4; i++) {
      state = applyMove(state, base);
    }
    assert.deepEqual(state, initial, `Applying 4x ${base} must restore original state`);
  }
});

test('inverse move cancels forward move', () => {
  const initial = createSolvedState();

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
  const initial = createSolvedState();

  for (const base of BASE_MOVES) {
    const doubleTurn = applyMove(initial, `${base}2`);
    const twoSingles = applyMove(applyMove(initial, base), base);
    assert.deepEqual(doubleTurn, twoSingles, `${base}2 must match two ${base} turns`);
  }
});

test('applyMove returns unchanged state for unknown move name', () => {
  const initial = createSolvedState();
  const unchanged = applyMove(initial, 'INVALID');
  assert.equal(unchanged, initial);
});

test('getMoveAnimationInfo provides correct axis, angle and filter for each move variation', () => {
  for (const base of BASE_MOVES) {
    const baseInfo = getMoveAnimationInfo(base);
    assert.ok(Array.isArray(baseInfo.axis) && baseInfo.axis.length === 3);
    assert.ok(typeof baseInfo.angle === 'number');
    assert.ok(typeof baseInfo.filter === 'function');

    const primeInfo = getMoveAnimationInfo(`${base}'`);
    assert.equal(primeInfo.angle, -baseInfo.angle, 'Prime move angle must be negative of base angle');
    assert.deepEqual(primeInfo.axis, baseInfo.axis, 'Prime move axis must match base axis');

    const doubleInfo = getMoveAnimationInfo(`${base}2`);
    assert.equal(doubleInfo.angle, baseInfo.angle * 2, 'Double turn angle must be double base angle');
    assert.deepEqual(doubleInfo.axis, baseInfo.axis, 'Double turn axis must match base axis');
  }
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

    // Tangents must be perpendicular to normal (dot product = 0)
    const dot1 = normal[0] * t1[0] + normal[1] * t1[1] + normal[2] * t1[2];
    const dot2 = normal[0] * t2[0] + normal[1] * t2[1] + normal[2] * t2[2];
    assert.equal(dot1, 0, 'Tangent 1 must be perpendicular to normal');
    assert.equal(dot2, 0, 'Tangent 2 must be perpendicular to normal');

    // Tangents must be perpendicular to each other
    const dotBetween = t1[0] * t2[0] + t1[1] * t2[1] + t1[2] * t2[2];
    assert.equal(dotBetween, 0, 'Tangents must be mutually perpendicular');
  }

  // Fallback for unlisted normal
  const fallback = getFaceTangents([0, 0, 0]);
  assert.deepEqual(fallback, [[1, 0, 0], [0, 1, 0]]);
});

test('resolveFaceDragMove maps drag directions to correct face rotations', () => {
  // Dragging right along top layer of front face (+Z normal, cubie [0, 1, 1], tangent [1, 0, 0])
  // rotAxis = normal x tangent = [0, 0, 1] x [1, 0, 0] = [0, 1, 0] (ay = 1) -> ay > 0 and cy === 1 -> U'
  const move1 = resolveFaceDragMove([0, 0, 1], [0, 1, 1], [1, 0, 0]);
  assert.equal(move1, "U'");

  // Dragging left along top layer of front face (tangent [-1, 0, 0])
  // rotAxis = [0, 0, 1] x [-1, 0, 0] = [0, -1, 0] (ay = -1) -> U
  const move2 = resolveFaceDragMove([0, 0, 1], [0, 1, 1], [-1, 0, 0]);
  assert.equal(move2, 'U');

  // Dragging down along right layer of front face (+Z normal, cubie [1, 0, 1], tangent [0, -1, 0])
  // rotAxis = [0, 0, 1] x [0, -1, 0] = [1, 0, 0] (ax = 1) -> ax > 0 and cx === 1 -> R'
  const move3 = resolveFaceDragMove([0, 0, 1], [1, 0, 1], [0, -1, 0]);
  assert.equal(move3, "R'");

  // Dragging up along right layer of front face (tangent [0, 1, 0])
  // rotAxis = [0, 0, 1] x [0, 1, 0] = [-1, 0, 0] (ax = -1) -> R
  const move4 = resolveFaceDragMove([0, 0, 1], [1, 0, 1], [0, 1, 0]);
  assert.equal(move4, 'R');

  // Center cubie drag that does not correspond to an outer layer rotation returns null
  const nullMove = resolveFaceDragMove([0, 0, 1], [0, 0, 1], [1, 0, 0]);
  assert.equal(nullMove, null);
});
