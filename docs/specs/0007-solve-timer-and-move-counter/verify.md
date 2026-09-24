# Verify: solve timer and move counter · spec 0007 · updated 2026-09-24
_Steps derived from spec 0007 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Start dev server with `npm run web` → tap Scramble → wait for scramble animation to finish → timer status is IDLE at 0.00 → AC-1
- [x] Make the first manual face turn by swiping a sticker slice → timer starts running smoothly with centisecond precision in the head up display → AC-1, AC-4
- [x] Make casual face turns on a solved cube without scrambling first → timer remains IDLE at 0.00 and no victory record appears → AC-2
- [x] Perform multiple face turns and view orientation presets → move counter increments only on face turns and ignores view presets → AC-3
- [x] Turn the final winning move to solve the cube → timer stops immediately, solve duration freezes, and victory card springs into view → AC-5, AC-7
- [x] Inspect victory card metrics → solve time, move count, and turns per second badge display with celebration trophy → AC-6, AC-7
- [x] Tap Dismiss button on victory card → card closes cleanly to inspect solved cube → AC-7
- [x] Turn a face on the solved cube after dismissing victory card → timer remains STOPPED and does not restart → AC-10
- [x] Mid solve scramble reset: start a solve, make turns, then tap Scramble or Reset Game → active timer resets immediately to 0.00 with IDLE status and in flight solve is discarded → AC-8

## Commands
- [x] `npm test` → all 120 unit tests pass across logic, store lifecycle, and UI components → AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-10
- [x] `npm run typecheck` → TypeScript compiles with zero errors across strict types → AC-6
- [x] `npm run lint` → ESLint and Expo lint checks pass cleanly with zero warnings → AC-6

## Value sourcing verification
- [x] Sourcing `id` → generated with native crypto.randomUUID() in createSolveRecord → Value sourcing (id)
- [x] Sourcing `solveStartTime` → captured via system clock Date.now() on first manual turn → Value sourcing (solveStartTime)
- [x] Sourcing `timerMs` → calculated as Date.now() minus solveStartTime during active run → Value sourcing (timerMs)
- [x] Sourcing `timeMs` → calculated as solveEndTime minus solveStartTime on solve completion → Value sourcing (timeMs)
- [x] Sourcing `moveCount` → sourced from existing store moveCount state → Value sourcing (moveCount)
- [x] Sourcing `turnsPerSecond` → calculated via calculateTurnsPerSecond(moveCount, timeMs) with zero division guard → Value sourcing (turnsPerSecond)
- [x] Sourcing `scrambleNotation` → sourced from store scrambleNotation applied prior to solve attempt → Value sourcing (scrambleNotation)

## Acceptance criteria coverage
- AC-1 covered by manual first move step and command tests
- AC-2 covered by casual unscrambled moves manual step and command tests
- AC-3 covered by move count vs orientation presets manual step and command tests
- AC-4 covered by live ticker display manual step and command tests
- AC-5 covered by winning move auto stop manual step and command tests
- AC-6 covered by victory card metrics inspection and command tests
- AC-7 covered by celebration presentation inspection and victory haptic command tests
- AC-8 covered by mid solve reset step and command tests
- AC-9 covered by wall clock timestamp derivation and command tests
- AC-10 covered by post solve turn locking step and command tests
