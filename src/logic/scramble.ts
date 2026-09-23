import { BaseMove, MoveName, ALL_MOVE_NAMES } from './cubeMoves';

export type MoveAxis = 0 | 1 | 2; // 0 for X (L/R), 1 for Y (U/D), 2 for Z (F/B)

export const BASE_MOVES: BaseMove[] = ['U', 'D', 'L', 'R', 'F', 'B'];

export const MOVE_MODIFIERS = ['', "'", '2'] as const;

export const FACE_TO_AXIS: Record<BaseMove, MoveAxis> = {
  L: 0,
  R: 0,
  U: 1,
  D: 1,
  F: 2,
  B: 2,
};

export const AXIS_OPPOSITE_FACES: Record<BaseMove, BaseMove> = {
  L: 'R',
  R: 'L',
  U: 'D',
  D: 'U',
  F: 'B',
  B: 'F',
};

export function getBaseFace(move: MoveName | string): BaseMove {
  return move[0] as BaseMove;
}

export function getMoveAxis(move: MoveName | string): MoveAxis {
  const base = getBaseFace(move);
  return FACE_TO_AXIS[base];
}

/**
 * Generates a pseudo random sequence of 20 to 25 legal Singmaster moves
 * following World Cube Association rules:
 * - No consecutive turns on the same face (for example R R' or R R2)
 * - No canceling turns on the same axis (for example R L R' or U D U)
 */
export function generateScramble(length?: number): MoveName[] {
  const targetLength = typeof length === 'number' && length > 0
    ? Math.floor(length)
    : Math.floor(Math.random() * 6) + 20; // 20 to 25 inclusive

  const moves: MoveName[] = [];

  for (let i = 0; i < targetLength; i++) {
    const candidateFaces: BaseMove[] = [];

    for (const face of BASE_MOVES) {
      if (moves.length > 0) {
        const lastFace = getBaseFace(moves[moves.length - 1]);
        if (face === lastFace) {
          continue;
        }

        if (moves.length >= 2) {
          const secondLastFace = getBaseFace(moves[moves.length - 2]);
          const currAxis = FACE_TO_AXIS[face];
          const lastAxis = FACE_TO_AXIS[lastFace];
          const secondLastAxis = FACE_TO_AXIS[secondLastFace];

          // Disallow third consecutive turn on the same axis (such as R L then R or L)
          if (currAxis === lastAxis && lastAxis === secondLastAxis) {
            continue;
          }

          // Disallow sandwich on the same axis (such as R L R or U D U')
          if (currAxis === secondLastAxis && lastAxis === currAxis) {
            continue;
          }
        }
      }

      candidateFaces.push(face);
    }

    const chosenFace = candidateFaces[Math.floor(Math.random() * candidateFaces.length)];
    const chosenMod = MOVE_MODIFIERS[Math.floor(Math.random() * MOVE_MODIFIERS.length)];
    const move = `${chosenFace}${chosenMod}` as MoveName;
    moves.push(move);
  }

  return moves;
}

/**
 * Formats an array of Singmaster moves into standard space delimited notation.
 */
export function formatScrambleNotation(moves: MoveName[]): string {
  if (!moves || moves.length === 0) return '';
  return moves.join(' ');
}

/**
 * Validates whether a move sequence complies with scramble length and diversity rules:
 * - Array of 20 to 25 legal moves (or custom non empty sequence)
 * - No consecutive moves on the same face
 * - No same axis sandwich cancellations
 */
export function isValidScrambleSequence(moves: MoveName[], requireStandardLength = true): boolean {
  if (!Array.isArray(moves) || moves.length === 0) {
    return false;
  }

  if (requireStandardLength && (moves.length < 20 || moves.length > 25)) {
    return false;
  }

  const validMovesSet = new Set<string>(ALL_MOVE_NAMES);

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (!validMovesSet.has(move)) {
      return false;
    }

    const face = getBaseFace(move);
    const axis = FACE_TO_AXIS[face];

    if (i > 0) {
      const prevFace = getBaseFace(moves[i - 1]);
      const prevAxis = FACE_TO_AXIS[prevFace];

      if (face === prevFace) {
        return false;
      }

      if (i > 1) {
        const secondPrevFace = getBaseFace(moves[i - 2]);
        const secondPrevAxis = FACE_TO_AXIS[secondPrevFace];

        // Three turns on the same axis in a row
        if (axis === prevAxis && prevAxis === secondPrevAxis) {
          return false;
        }

        // Turning the same face after an opposite face on the same axis
        if (face === secondPrevFace && axis === prevAxis) {
          return false;
        }
      }
    }
  }

  return true;
}
