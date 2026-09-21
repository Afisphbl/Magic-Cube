// Standard 3x3 Rubik's Cube move logic and sticker permutations

export type BaseMove = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
export type MoveName =
  | 'U' | "U'" | 'U2'
  | 'D' | "D'" | 'D2'
  | 'L' | "L'" | 'L2'
  | 'R' | "R'" | 'R2'
  | 'F' | "F'" | 'F2'
  | 'B' | "B'" | 'B2';

export type GamePhase = 'SOLVED' | 'SCRAMBLING' | 'PLAYING';

export const ALL_MOVE_NAMES: MoveName[] = [
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'L', "L'", 'L2',
  'R', "R'", 'R2',
  'F', "F'", 'F2',
  'B', "B'", 'B2',
];

export interface MoveAnimationInfo {
  axis: [number, number, number];
  angle: number; // in radians
  durationMs: number;
  easing: string;
  filter: (c: [number, number, number]) => boolean;
}

export interface CubeValidationResult {
  valid: boolean;
  error?: string;
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

export function restoreSolvedCubeState(): number[] {
  return createSolvedCubeState();
}

export function validateCubeState(state: number[]): CubeValidationResult {
  if (!Array.isArray(state)) {
    return { valid: false, error: 'Cube state must be an array' };
  }
  if (state.length !== 54) {
    return { valid: false, error: `Cube state must have exactly 54 stickers, got ${state.length}` };
  }
  const counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 54; i++) {
    const val = state[i];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0 || val > 5) {
      return { valid: false, error: `Invalid sticker color value ${val} at index ${i}` };
    }
    counts[val]++;
  }
  for (let c = 0; c < 6; c++) {
    if (counts[c] !== 9) {
      return {
        valid: false,
        error: `Color distribution invariant violated: color ${c} has ${counts[c]} stickers (expected 9)`,
      };
    }
  }
  return { valid: true };
}

export function getStickerIndex(faceIndex: number, x: number, y: number, z: number): number {
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

function normalToFaceIndex(nx: number, ny: number, nz: number): number {
  if (nx === 1) return 0;
  if (nx === -1) return 1;
  if (ny === 1) return 2;
  if (ny === -1) return 3;
  if (nz === 1) return 4;
  if (nz === -1) return 5;
  return -1;
}

function rotateVec(v: [number, number, number], axis: [number, number, number], angle: number): [number, number, number] {
  const c = Math.round(Math.cos(angle));
  const s = Math.round(Math.sin(angle));
  const [x, y, z] = v;
  const [ax, ay, az] = axis;

  if (ax === 1) {
    return [x, y * c - z * s, y * s + z * c];
  }
  if (ay === 1) {
    return [x * c + z * s, y, -x * s + z * c];
  }
  if (az === 1) {
    return [x * c - y * s, x * s + y * c, z];
  }
  throw new Error('Invalid rotation axis');
}

const BASE_MOVE_DEFS: Record<BaseMove, { axis: [number, number, number]; angle: number; filter: (c: [number, number, number]) => boolean }> = {
  U: { axis: [0, 1, 0], angle: -Math.PI / 2, filter: ([_x, y, _z]) => y === 1 },
  D: { axis: [0, 1, 0], angle: Math.PI / 2, filter: ([_x, y, _z]) => y === -1 },
  R: { axis: [1, 0, 0], angle: -Math.PI / 2, filter: ([x, _y, _z]) => x === 1 },
  L: { axis: [1, 0, 0], angle: Math.PI / 2, filter: ([x, _y, _z]) => x === -1 },
  F: { axis: [0, 0, 1], angle: -Math.PI / 2, filter: ([_x, _y, z]) => z === 1 },
  B: { axis: [0, 0, 1], angle: Math.PI / 2, filter: ([_x, _y, z]) => z === -1 },
};

function createBasePermutation(baseMove: BaseMove): number[] {
  const def = BASE_MOVE_DEFS[baseMove];
  const perm = new Array<number>(54);
  for (let i = 0; i < 54; i++) perm[i] = i;

  for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
    for (const x of [-1, 0, 1]) {
      for (const y of [-1, 0, 1]) {
        for (const z of [-1, 0, 1]) {
          if (x === 0 && y === 0 && z === 0) continue;
          let normal: [number, number, number] | null = null;
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

function invertPerm(p: number[]): number[] {
  const inv = new Array<number>(54);
  for (let i = 0; i < 54; i++) {
    inv[p[i]] = i;
  }
  return inv;
}

function combinePerm(p1: number[], p2: number[]): number[] {
  const res = new Array<number>(54);
  for (let i = 0; i < 54; i++) {
    res[i] = p1[p2[i]];
  }
  return res;
}

// Precomputed 54-element permutations for all 18 moves
const MOVE_PERMUTATIONS: Record<MoveName, number[]> = (() => {
  const map = {} as Record<MoveName, number[]>;
  const baseMoves: BaseMove[] = ['U', 'D', 'L', 'R', 'F', 'B'];

  for (const m of baseMoves) {
    const clockwise = createBasePermutation(m);
    const counterClockwise = invertPerm(clockwise);
    const doubleTurn = combinePerm(clockwise, clockwise);

    map[m] = clockwise;
    map[`${m}'` as MoveName] = counterClockwise;
    map[`${m}2` as MoveName] = doubleTurn;
  }
  return map;
})();

export function applyMove(state: number[], move: MoveName): number[] {
  const perm = MOVE_PERMUTATIONS[move];
  if (!perm) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(`[applyMove] Unknown or unsupported move name: "${move}". Returning unchanged state.`);
    }
    return state;
  }
  const next = new Array<number>(54);
  for (let i = 0; i < 54; i++) {
    next[i] = state[perm[i]];
  }
  return next;
}

export function isCubeSolved(state: number[]): boolean {
  if (!state || state.length !== 54) return false;
  let seenMask = 0;
  for (let f = 0; f < 6; f++) {
    const faceColor = state[f * 9];
    if (typeof faceColor !== 'number' || !Number.isInteger(faceColor) || faceColor < 0 || faceColor > 5) {
      return false;
    }
    const bit = 1 << faceColor;
    if ((seenMask & bit) !== 0) return false;
    seenMask |= bit;
    const offset = f * 9;
    for (let s = 1; s < 9; s++) {
      if (state[offset + s] !== faceColor) return false;
    }
  }
  return true;
}

export function getMoveAnimationInfo(
  move: MoveName,
  durationMs = 250,
  easing = 'ease-out'
): MoveAnimationInfo {
  const base = move[0] as BaseMove;
  const def = BASE_MOVE_DEFS[base];
  let angle = def.angle;
  if (move.includes("'")) {
    angle = -angle;
  } else if (move.includes('2')) {
    angle = angle * 2;
  }
  return {
    axis: def.axis,
    angle,
    durationMs,
    easing,
    filter: def.filter,
  };
}

export function getNextGamePhase(
  currentPhase: GamePhase,
  isSolved: boolean,
  hasPendingMoves = false,
  isScrambling = false
): GamePhase {
  if (isScrambling) {
    return 'SCRAMBLING';
  }
  if (currentPhase === 'SCRAMBLING') {
    return hasPendingMoves ? 'SCRAMBLING' : (isSolved ? 'SOLVED' : 'PLAYING');
  }
  if (hasPendingMoves) {
    return currentPhase === 'SOLVED' ? 'PLAYING' : currentPhase;
  }
  if (currentPhase === 'PLAYING') {
    return isSolved ? 'SOLVED' : 'PLAYING';
  }
  if (currentPhase === 'SOLVED') {
    return isSolved ? 'SOLVED' : 'PLAYING';
  }
  return currentPhase;
}

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function getFaceTangents(normal: [number, number, number]): [[number, number, number], [number, number, number]] {
  const [nx, ny, nz] = normal;
  if (nz === 1) {
    return [[1, 0, 0], [0, 1, 0]];
  }
  if (nz === -1) {
    return [[-1, 0, 0], [0, 1, 0]];
  }
  if (nx === 1) {
    return [[0, 0, -1], [0, 1, 0]];
  }
  if (nx === -1) {
    return [[0, 0, 1], [0, 1, 0]];
  }
  if (ny === 1) {
    return [[1, 0, 0], [0, 0, -1]];
  }
  if (ny === -1) {
    return [[1, 0, 0], [0, 0, 1]];
  }
  return [[1, 0, 0], [0, 1, 0]];
}

export function resolveFaceDragMove(
  normal: [number, number, number],
  cubie: [number, number, number],
  chosenTangent: [number, number, number]
): MoveName | null {
  const rotAxis = cross(normal, chosenTangent);
  const [ax, ay, az] = rotAxis;
  const [cx, cy, cz] = cubie;

  if (ax !== 0) {
    if (cx === 1) {
      return ax > 0 ? "R'" : 'R';
    } else if (cx === -1) {
      return ax > 0 ? 'L' : "L'";
    }
  }

  if (ay !== 0) {
    if (cy === 1) {
      return ay > 0 ? "U'" : 'U';
    } else if (cy === -1) {
      return ay > 0 ? 'D' : "D'";
    }
  }

  if (az !== 0) {
    if (cz === 1) {
      return az > 0 ? "F'" : 'F';
    } else if (cz === -1) {
      return az > 0 ? 'B' : "B'";
    }
  }

  return null;
}
