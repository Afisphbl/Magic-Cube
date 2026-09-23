# Verify: scramble engine · spec 0006 · updated 2026-09-23

_Steps derived from spec 0006 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [x] Tap Scramble button from solved state → rapid slice turns play at 70ms per turn and notation card displays full sequence → AC-1, AC-3, AC-4, AC-7
- [x] During active scramble, tap Skip button on overlay banner → turns finish instantly, cube snaps to scrambled state, and game phase transitions to PLAYING → AC-5
- [x] Start a new scramble and tap directly on 3D canvas → in flight turn aborts, cube rests in valid scrambled state, and controls unlock → AC-5
- [x] Make multiple manual turns mid solve, then tap Scramble → previous solve progress and timer clear, starting a fresh scramble cleanly → AC-8
- [x] Let all scramble turns play to completion → queue exhausts, game phase becomes PLAYING, and move count remains 0 → AC-4, AC-6

## Commands

- [x] `npm test` → all 93 unit and regression tests pass including scramble invariants → AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-8
- [x] `npm run typecheck` → TypeScript compilation succeeds with zero errors → AC-1, AC-3, AC-4, AC-5
- [x] `npx eslint src/` → ESLint verifies code cleanly without errors or warnings → AC-1, AC-3, AC-7

## Acceptance criteria coverage

- AC-1 (Pseudo random sequence generation and axis cancellation rules) covered by step 1 and unit tests in `test/scramble.test.mjs`
- AC-2 (Solvability guarantee and color preservation) covered by step 6 and unit tests in `test/scramble.test.mjs`
- AC-3 (Store initialization and scramble start) covered by step 1 and unit tests in `test/scramble.test.mjs`
- AC-4 (Dynamic 70ms slice animation queue) covered by step 1, step 5, and unit tests in `test/scramble.test.mjs`
- AC-5 (Instant skip interaction and transform neutralization) covered by step 2, step 3, and unit tests in `test/scramble.test.mjs`
- AC-6 (Scramble completion and muted intermediate haptics) covered by step 5 and unit tests in `test/scramble.test.mjs`
- AC-7 (Scramble notation text display card) covered by step 1 and visual check in `src/components/GameOverlay.tsx`
- AC-8 (Mid solve scramble triggering) covered by step 4 and unit tests in `test/scramble.test.mjs`
