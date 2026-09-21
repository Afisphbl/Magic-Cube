# Verify: Cube Data Model and State Machine · spec 0003 · updated 2026-09-21

_Steps derived from spec 0003 acceptance criteria and value sourcing table. `/check verify` runs these; `/test` locks the durable ones._

## Automated Commands

- [x] `npm test` runs cleanly with Node test runner, verifying all 30 unit tests across 18 moves, 4 turn identity, inverse cancellation, solve detection in all orientations, and store queue transitions (satisfies AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8)
- [x] `npm run typecheck` passes with zero TypeScript errors across all logic, store, and test files
- [x] `npm run lint` passes with zero ESLint warnings or errors

## Behavioral and Value Sourcing Checks

- [x] `createSolvedCubeState()` produces 54 element array with exactly 9 of each color ID (0 to 5) (satisfies AC-1, value sourcing: initial sticker array)
- [x] `applyMove(state, move)` applies pure precomputed permutation for all 18 Singmaster moves, preserving color distribution (satisfies AC-2, value sourcing: next sticker array)
- [x] `isCubeSolved(state)` returns true when each of the six faces has 9 uniform stickers of identical color across arbitrary whole cube orientations, and false when any sticker is perturbed (satisfies AC-3, value sourcing: boolean solve indicator)
- [x] `validateCubeState(state)` detects arrays with invalid length, bad color numbers, or unequal color distributions, returning a failure descriptor without throwing (satisfies AC-6, value sourcing: validation result)
- [x] `setCubeState(corruptState)` safely intercepts invalid states and restores a clean solved cube (satisfies AC-6)
- [x] `requestMove(move)` returns true and sets animatingMove with durationMs and easing parameters when idle (satisfies AC-5, value sourcing: animation descriptor)
- [x] `requestMove(move)` buffers at most one pending move while isAnimating is true, returning true, and rejects further inputs returning false (satisfies AC-5)
- [x] `finishMoveAnimation()` atomically chains a buffered move without setting isAnimating to false or unlocking the scene (satisfies AC-5, value sourcing: chained animation)
- [x] `startScramble(moves)` populates scrambleQueue, sets phase to SCRAMBLING, and plays moves sequentially until queue empties (satisfies AC-8, value sourcing: populated scrambleQueue)
- [x] `finishMoveAnimation()` defers solve evaluation until all pending and scramble moves drain (satisfies AC-4, AC-8, value sourcing: next gamePhase)
- [x] `moveCount` increments by 1 on each committed move and `moveHistory` logs chronological MoveName entries (satisfies AC-7, value sourcing: incremented moveCount, updated moveHistory)
- [x] `resetGame()` restores solved state, resets counters to zero, and clears queues (satisfies AC-4, AC-7)

## Acceptance Criteria Coverage

- AC-1: covered by `createSolvedCubeState` and `validateCubeState` tests in `test/cube_moves.test.mjs`
- AC-2: covered by 18 moves, 4 turn identity, inverse cancellation, and double turn tests in `test/cube_moves.test.mjs`
- AC-3: covered by orientation agnostic solve tests in `test/cube_moves.test.mjs`
- AC-4: covered by `getNextGamePhase` tests and store phase transition tests in `test/cube_store.test.mjs`
- AC-5: covered by `requestMove` single move buffer and atomic animation chaining tests in `test/cube_store.test.mjs`
- AC-6: covered by `validateCubeState` tests and `setCubeState` safe recovery tests in `test/cube_store.test.mjs`
- AC-7: covered by `applyMoveDirect` and `finishMoveAnimation` move count and history tests in `test/cube_store.test.mjs`
- AC-8: covered by `startScramble` and `scrambleQueue` execution sequence tests in `test/cube_store.test.mjs`
