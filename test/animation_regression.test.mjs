import test from 'node:test';
import assert from 'node:assert/strict';

// Test move logic and store invariants
const BASE_MOVES = ['U', 'D', 'L', 'R', 'F', 'B'];

function getStickerIndex(faceIndex, x, y, z) {
  switch (faceIndex) {
    case 0: { // Right (+X)
      const row = 1 - y;
      const col = 1 - z;
      return 18 + row * 3 + col;
    }
    case 1: { // Left (-X)
      const row = 1 - y;
      const col = z + 1;
      return 27 + row * 3 + col;
    }
    case 2: { // Up (+Y)
      const row = 1 - z;
      const col = x + 1;
      return 0 + row * 3 + col;
    }
    case 3: { // Down (-Y)
      const row = z + 1;
      const col = x + 1;
      return 9 + row * 3 + col;
    }
    case 4: { // Front (+Z)
      const row = 1 - y;
      const col = x + 1;
      return 36 + row * 3 + col;
    }
    case 5: { // Back (-Z)
      const row = 1 - y;
      const col = 1 - x;
      return 45 + row * 3 + col;
    }
    default:
      return -1;
  }
}

function normalToFaceIndex(nx, ny, nz) {
  if (nx === 1) return 0;
  if (nx === -1) return 1;
  if (ny === 1) return 2;
  if (ny === -1) return 3;
  if (nz === 1) return 4;
  if (nz === -1) return 5;
  return -1;
}

function rotateVec(v, axis, angle) {
  const c = Math.round(Math.cos(angle));
  const s = Math.round(Math.sin(angle));
  const [x, y, z] = v;
  const [ax, ay, az] = axis;

  if (ax === 1) return [x, y * c - z * s, y * s + z * c];
  if (ay === 1) return [x * c + z * s, y, -x * s + z * c];
  if (az === 1) return [x * c - y * s, x * s + y * c, z];
  throw new Error('Invalid axis');
}

const BASE_MOVE_DEFS = {
  U: { axis: [0, 1, 0], angle: -Math.PI / 2, filter: ([_x, y, _z]) => y === 1 },
  D: { axis: [0, 1, 0], angle: Math.PI / 2, filter: ([_x, y, _z]) => y === -1 },
  R: { axis: [1, 0, 0], angle: -Math.PI / 2, filter: ([x, _y, _z]) => x === 1 },
  L: { axis: [1, 0, 0], angle: Math.PI / 2, filter: ([x, _y, _z]) => x === -1 },
  F: { axis: [0, 0, 1], angle: -Math.PI / 2, filter: ([_x, _y, z]) => z === 1 },
  B: { axis: [0, 0, 1], angle: Math.PI / 2, filter: ([_x, _y, z]) => z === -1 },
};

function createBasePermutation(baseMove) {
  const def = BASE_MOVE_DEFS[baseMove];
  const perm = new Array(54);
  for (let i = 0; i < 54; i++) perm[i] = i;

  for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
    for (const x of [-1, 0, 1]) {
      for (const y of [-1, 0, 1]) {
        for (const z of [-1, 0, 1]) {
          if (x === 0 && y === 0 && z === 0) continue;
          let normal = null;
          if (faceIndex === 0 && x === 1) normal = [1, 0, 0];
          if (faceIndex === 1 && x === -1) normal = [-1, 0, 0];
          if (faceIndex === 2 && y === 1) normal = [0, 1, 0];
          if (faceIndex === 3 && y === -1) normal = [0, -1, 0];
          if (faceIndex === 4 && z === 1) normal = [0, 0, 1];
          if (faceIndex === 5 && z === -1) normal = [0, 0, -1];
          if (!normal) continue;

          if (def.filter([x, y, z])) {
            const newPos = rotateVec([x, y, z], def.axis, def.angle);
            const newNormal = rotateVec(normal, def.axis, def.angle);
            const newFaceIdx = normalToFaceIndex(newNormal[0], newNormal[1], newNormal[2]);
            const newStickerIdx = getStickerIndex(newFaceIdx, newPos[0], newPos[1], newPos[2]);
            const oldStickerIdx = getStickerIndex(faceIndex, x, y, z);
            perm[newStickerIdx] = oldStickerIdx;
          }
        }
      }
    }
  }
  return perm;
}

function applyMove(state, perm) {
  const next = new Array(54);
  for (let i = 0; i < 54; i++) next[i] = state[perm[i]];
  return next;
}

test('every slice rotation leaves exactly 9 active cubies and 17 static cubies without gaps', () => {
  const allCubies = [];
  for (const x of [-1, 0, 1]) {
    for (const y of [-1, 0, 1]) {
      for (const z of [-1, 0, 1]) {
        if (x === 0 && y === 0 && z === 0) continue;
        allCubies.push([x, y, z]);
      }
    }
  }
  assert.equal(allCubies.length, 26);

  for (const base of BASE_MOVES) {
    const def = BASE_MOVE_DEFS[base];
    const active = allCubies.filter(def.filter);
    const inactive = allCubies.filter((c) => !def.filter(c));
    assert.equal(active.length, 9, `Active cubies for ${base} must be 9`);
    assert.equal(inactive.length, 17, `Inactive cubies for ${base} must be 17`);

    // Verify after rotation all 9 positions are still valid cube positions
    for (const cubie of active) {
      const rotated = rotateVec(cubie, def.axis, def.angle);
      assert.ok([-1, 0, 1].includes(rotated[0]));
      assert.ok([-1, 0, 1].includes(rotated[1]));
      assert.ok([-1, 0, 1].includes(rotated[2]));
      assert.ok(!(rotated[0] === 0 && rotated[1] === 0 && rotated[2] === 0));
    }
  }
});

test('permutation and physical rotation produce identical sticker positions', () => {
  const solved = Array.from({ length: 54 }, (_, i) => i);
  for (const base of BASE_MOVES) {
    const def = BASE_MOVE_DEFS[base];
    const perm = createBasePermutation(base);
    const next = applyMove(solved, perm);

    for (let x of [-1, 0, 1]) {
      for (let y of [-1, 0, 1]) {
        for (let z of [-1, 0, 1]) {
          if (x === 0 && y === 0 && z === 0) continue;
          if (!def.filter([x, y, z])) continue;

          const newPos = rotateVec([x, y, z], def.axis, def.angle);
          const faces = [
            { n: [1, 0, 0], f: 0, cond: x === 1 },
            { n: [-1, 0, 0], f: 1, cond: x === -1 },
            { n: [0, 1, 0], f: 2, cond: y === 1 },
            { n: [0, -1, 0], f: 3, cond: y === -1 },
            { n: [0, 0, 1], f: 4, cond: z === 1 },
            { n: [0, 0, -1], f: 5, cond: z === -1 },
          ];

          for (const face of faces) {
            if (!face.cond) continue;
            const oldIdx = getStickerIndex(face.f, x, y, z);
            const oldColor = solved[oldIdx];

            const newNormal = rotateVec(face.n, def.axis, def.angle);
            const newFace = normalToFaceIndex(...newNormal);
            const newIdx = getStickerIndex(newFace, ...newPos);
            const colorAfter = next[newIdx];

            assert.equal(colorAfter, oldColor, `Color mismatch on ${base} move`);
          }
        }
      }
    }
  }
});

test('store atomic animation transition invariant', () => {
  // Simulating store state transitions
  let state = {
    isAnimating: false,
    animatingMove: null,
    cubeState: Array.from({ length: 54 }, () => 0),
  };

  // Start move animation
  function startMoveAnimation(move) {
    if (state.isAnimating) return;
    state = {
      ...state,
      isAnimating: true,
      animatingMove: { move, axis: [0, 1, 0], targetAngle: -Math.PI / 2, filter: ([_, y]) => y === 1 },
    };
  }

  // Attempting concurrent move while animating must be ignored
  startMoveAnimation('U');
  assert.equal(state.isAnimating, true);
  assert.equal(state.animatingMove.move, 'U');

  startMoveAnimation('R');
  assert.equal(state.animatingMove.move, 'U', 'Concurrent move must be rejected');

  // Finish move animation
  function finishMoveAnimation() {
    if (!state.animatingMove) return;
    const perm = createBasePermutation(state.animatingMove.move);
    state = {
      ...state,
      cubeState: applyMove(state.cubeState, perm),
      animatingMove: null,
      isAnimating: false,
    };
  }

  finishMoveAnimation();
  assert.equal(state.isAnimating, false);
  assert.equal(state.animatingMove, null);
});
