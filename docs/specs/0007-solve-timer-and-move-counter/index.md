# 0007. Solve Timer and Move Counter

**Date**: 2026-09-24
**Status**: Accepted

## Summary

This specification defines the solve timer and move counter for the Magic Cube puzzle game. It tracks solve duration using high precision system timestamps, counts face turns using the standard Half Turn Metric, displays live stats in the head up display, and presents an animated victory card when the cube is solved. The timer starts automatically on the first face turn after a scramble, stops the instant the final move animation completes, and triggers celebration haptics with zero friction.

## Requirements

**User stories**:
* As a speedcuber or casual player, I want an automatic timer that starts on my first move after a scramble so that my solve attempt is timed with zero setup friction.
* As a player, I want to see a live timer and move counter in the head up display so that I can track my solve duration and turn count as I play.
* As a player, I want the timer to stop automatically the moment the cube is solved so that my recorded time is accurate without needing manual reflexes.
* As a player, I want to see a celebratory victory card with my final time, move count, and turns per second so that I can review my performance and celebrate the win.
* As a player, I want quick actions on the victory card to scramble again immediately or dismiss the card so that I can inspect the solved cube or begin a fresh solve.

**Acceptance criteria**:
* **AC-1**: Solve timer activation begins automatically on the first manual face turn (`requestMove` or `startMoveAnimation`) after a scramble completes or skips, transitioning `timerStatus` from `IDLE` to `RUNNING` and recording `solveStartTime` via `Date.now()`.
* **AC-2**: Casual unscrambled moves made from a clean solved state without a prior scramble do not start the solve timer or trigger victory records, preserving casual free play.
* **AC-3**: Move counter records each 90 degree or 180 degree face turn as one move (Half Turn Metric, HTM) using the existing store `moveCount` incremented in `finishMoveAnimation`. Whole cube orbit rotations, perspective swipes, and view orientation resets do not increment the move counter.
* **AC-4**: Active timer display in the head up display (`GameOverlay`) updates elapsed time smoothly using standard speedcubing notation (`SS.cs` for times under sixty seconds, `M:SS.cs` for times sixty seconds or greater), driven by a lightweight local ticker hook to prevent unnecessary store re renders.
* **AC-5**: Automatic solve completion detects the solved cube state via `isCubeSolved` from `src/logic/cubeMoves.ts` upon the completion of the final winning move animation in `finishMoveAnimation`, transitioning `timerStatus` to `STOPPED`, setting `solveEndTime`, calculating total elapsed time in milliseconds, and creating a structured `SolveRecord`.
* **AC-6**: Solve record generation creates a `SolveRecord` with a unique identifier via native `crypto.randomUUID()`, `timeMs`, `moveCount`, `turnsPerSecond` (`moveCount / (timeMs / 1000)` rounded to two decimal places with zero division guard returning 0.00 for non positive times), `scrambleNotation`, and `completedAt` timestamp, stored in `latestSolve` in Zustand.
* **AC-7**: Celebratory victory presentation displays an animated victory card overlay with spring entrance animation, tactile victory haptic notification pulse via `triggerVictoryHaptic` (`NotificationFeedbackType.Success`), formatted solve time, move count, turns per second badge, a primary Scramble Again button, and a secondary Dismiss button.
* **AC-8**: Mid solve scramble or manual game reset immediately aborts any active timer, resets `timerMs` to zero, sets `timerStatus` to `IDLE`, clears `latestSolve`, and discards in flight solve progress without recording a time. In flight animations are neutralized so delayed callbacks never trigger phantom solves.
* **AC-9**: App backgrounding resilience maintains elapsed time by deriving duration from wall clock timestamps (`Date.now() - solveStartTime`), ensuring the timer continues tracking accurately upon return to the foreground.
* **AC-10**: Post solve turn locking keeps `timerStatus` in `STOPPED` when a player turns faces on a solved cube after dismissing the victory card, ignoring further moves until a fresh scramble or reset sets `timerStatus` back to `IDLE`.

## Decision

**Chosen option**: Option 1: Timestamp based timer engine with local display ticker hook, store level solve lifecycle, and celebratory victory card overlay.

**Implementation skills**: none

## Rationale

Reasoning and options: see rationale.md

## Feature design

**Data model sketch**:

| Entity | Primary Key / Identifier | Fields and Types | Relationships | Invariants and Rules |
|---|---|---|---|---|
| TimerState | singleton (in store) | timerStatus: 'IDLE' \| 'RUNNING' \| 'STOPPED', solveStartTime: number \| null, solveEndTime: number \| null, timerMs: number | Part of CubeStoreState | Transitions: IDLE on scramble or reset; RUNNING on first manual face turn; STOPPED on solve detection via isCubeSolved. timerMs equals 0 in IDLE, equals Date.now() minus solveStartTime in RUNNING, equals solveEndTime minus solveStartTime in STOPPED. |
| SolveRecord | id: string | id: string, timeMs: number, moveCount: number, turnsPerSecond: number, scrambleNotation: string, completedAt: number | 1 to 1 with latestSolve in store | Created when cube reaches solved state while timerStatus is RUNNING. id generated via crypto.randomUUID(). timeMs is greater than 0; moveCount is greater than or equal to 1; turnsPerSecond is moveCount divided by timeMs in seconds, guarded against non positive values. |
| StoreTimerSlice | singleton (useCubeStore) | timerStatus: TimerStatus, timerMs: number, solveStartTime: number \| null, solveEndTime: number \| null, latestSolve: SolveRecord \| null, isVictoryDismissed: boolean | Integrated into CubeStoreState | Actions startTimer, stopTimer, updateTimer, resetTimer, and dismissVictoryCard synchronize timer lifecycle with move completion and game phases. Uses existing moveCount in store. |

**State transitions**:

Timer lifecycle state machine:
* IDLE: Cube is scrambled or freshly reset. Timer displays 0.00. First manual face move transitions timerStatus to RUNNING.
* RUNNING: Solve attempt in progress. Display ticker calculates elapsed milliseconds from Date.now() minus solveStartTime. Making face moves increments moveCount.
* STOPPED: Cube reached solved state via isCubeSolved. solveEndTime is recorded, final elapsed time is frozen, SolveRecord is constructed, and victory card overlay opens. Subsequent face turns do not restart timer.
* RESET / ABORT: Tapping Scramble or Reset Game at any time resets timerStatus to IDLE, clears solveStartTime and solveEndTime, resets timerMs to 0, and closes victory card.

**API surface**:

Logic surface in `src/logic/timer.ts`:
| Function | Key inputs | Key outputs | Purpose |
|---|---|---|---|
| formatTimer | ms: number | string (e.g. '12.45' or '1:03.20') | Formats milliseconds into speedcubing notation with centisecond precision |
| calculateTurnsPerSecond | moveCount: number, timeMs: number | number (e.g. 2.45) | Computes turns per second rounded to two decimal places; returns 0 if timeMs is less than or equal to 0 |
| createSolveRecord | params: { timeMs: number, moveCount: number, scrambleNotation: string } | SolveRecord | Constructs unique solve record with native crypto.randomUUID(), timestamp, and metrics |

Logic surface in `src/logic/haptics.ts`:
| Function | Key inputs | Key outputs | Purpose |
|---|---|---|---|
| triggerVictoryHaptic | none | Promise<void> | Triggers success notification haptic pulse using expo-haptics NotificationFeedbackType.Success |

Store surface in `src/store/useCubeStore.ts`:
| Action / Selector | Key inputs | Key outputs | State changes |
|---|---|---|---|
| startTimer | none | boolean | If timerStatus is IDLE and gamePhase is PLAYING and scrambleNotation is present, sets timerStatus to RUNNING and solveStartTime to Date.now() |
| stopTimer | none | SolveRecord \| null | If timerStatus is RUNNING and gamePhase is PLAYING, sets timerStatus to STOPPED, records solveEndTime, constructs SolveRecord via createSolveRecord, sets latestSolve, and returns record |
| updateTimer | now?: number | void | Sets timerMs to now minus solveStartTime while RUNNING |
| resetTimer | none | void | Resets timerStatus to IDLE, solveStartTime to null, solveEndTime to null, timerMs to 0, and isVictoryDismissed to false |
| dismissVictoryCard | none | void | Sets isVictoryDismissed to true, allowing player to inspect the solved cube without restarting timer |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| createSolveRecord | id | Generated via crypto.randomUUID() |
| startTimer | solveStartTime | System clock Date.now() |
| updateTimer | timerMs | Derived from Date.now() minus solveStartTime |
| stopTimer | timeMs | Derived from solveEndTime minus solveStartTime |
| stopTimer | moveCount | Sourced from existing store moveCount |
| stopTimer | turnsPerSecond | Derived from calculateTurnsPerSecond(moveCount, timeMs) |
| stopTimer | scrambleNotation | Sourced from store scrambleNotation |
| stopTimer | completedAt | System clock Date.now() |
| finishMoveAnimation | isSolved | Sourced from isCubeSolved(nextCubeState) in src/logic/cubeMoves.ts |
| render VictoryCard | formattedTime | Derived from formatTimer(latestSolve.timeMs) |
| render VictoryCard | turnsPerSecondText | Derived from latestSolve.turnsPerSecond |

**Key invariants**:
* The timer only starts on a manual face turn if the cube has been scrambled (scrambleNotation is non empty, gamePhase is PLAYING, and timerStatus is IDLE).
* Move counter increments exclusively on manual face turns using the existing `moveCount` state. Orbit swipes and view preset adjustments never increment moveCount.
* SolveRecord generation is strictly idempotent per solve: stopTimer only executes once when transitioning from RUNNING to STOPPED, guarded against mid animation scramble cancellations.
* While timerStatus is STOPPED, manual turns leave timerStatus in STOPPED, preventing accidental timer reactivation on a solved cube.
* Time elapsed is strictly non negative and calculated from wall clock time differences to eliminate backgrounding pauses or timer drift.

**Security model**:
* Offline single player game with client side state. No sensitive user data, authentication, or network exposure.
* Timer integrity is maintained locally by deriving elapsed duration from monotonic timestamps rather than mutable interval counters.

**Configuration required**:
* None. Zero external services, environment variables, or third party credentials required.

**Critical test scenarios**:
* Happy path: Scramble the cube, perform manual turns to solve, verify timer starts on first move, stops on final move completion, and creates SolveRecord with accurate time and move count, verifies **AC-1**, **AC-3**, **AC-5**, **AC-6**, **AC-7**.
* Unscrambled turns: Rotate faces from a clean solved state without scrambling, verify timer remains IDLE at 0.00 and no victory record is produced, verifies **AC-2**.
* Mid solve scramble: Tap Scramble while timer is RUNNING, verify timer immediately resets to IDLE at 0.00, move count resets, and in flight solve is discarded, verifies **AC-8**.
* Post solve turns: Dismiss victory card and turn a face, verify timer remains STOPPED at recorded time and does not reset to RUNNING, verifies **AC-10**.
* Division by zero guard: Verify calculateTurnsPerSecond returns 0.00 when timeMs is 0 or negative, verifies **AC-6**.
* Backgrounding resilience: Simulate backgrounding by advancing system time, verify elapsed time accurately reflects wall clock difference upon foregrounding, verifies **AC-9**.
* Format precision: Test formatTimer with sub minute times (e.g. 9420ms produces '9.42') and multi minute times (e.g. 75320ms produces '1:15.32'), verifies **AC-4**.

## Build plan

* [x] 1. Pure logic timer utilities and tests: implement `formatTimer`, `calculateTurnsPerSecond` with non positive guard, and `createSolveRecord` with native `crypto.randomUUID()` in `src/logic/timer.ts`, and implement `triggerVictoryHaptic` in `src/logic/haptics.ts`, with unit tests in `test/timer.test.mjs`, satisfies **AC-4**, **AC-6**, **AC-7**.
* [x] 2. Zustand store timer slice: extend `CubeStoreState` in `src/store/useCubeStore.ts` with `timerStatus`, `solveStartTime`, `solveEndTime`, `latestSolve`, `isVictoryDismissed`, and actions `startTimer`, `stopTimer`, `updateTimer`, `resetTimer`, and `dismissVictoryCard`, satisfies **AC-1**, **AC-2**, **AC-5**, **AC-6**, **AC-8**, **AC-10**.
* [x] 3. Move animation and scramble lifecycle integration: wire `startTimer` into manual face turn triggers in `requestMove` and `startMoveAnimation`, wire `stopTimer` with `isCubeSolved` and victory haptic into `finishMoveAnimation` on solve detection, and reset timer state in `scrambleCube` and `resetGame`, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-5**, **AC-8**, **AC-10**.
* [x] 4. Head up display live stats and ticker: integrate live timer text and move counter into `GameOverlay.tsx` using a local ticker hook (`useTimerTicker`) that updates display text while running without triggering global store re renders, satisfies **AC-3**, **AC-4**, **AC-9**.
* [x] 5. Victory card overlay and celebration: build `VictoryCard.tsx` with spring entrance animation, solve stats summary (time, moves, turns per second), Scramble Again button, and Dismiss button, satisfies **AC-7**.


## Consequences

**Positive**:
* Players receive instant feedback on solve time and efficiency without manual stopwatch handling.
* Timestamp based duration ensures accurate timing with zero drift across frames and background transitions.
* Local display ticker keeps UI rendering fast by preventing 60fps Zustand global state broadcasting.
* Celebratory victory card provides a satisfying payoff and immediate replay loop via Scramble Again.

**Negative / tradeoffs**:
* Solve history and personal best records remain in memory for this slice, resetting when the app is completely reloaded.
* High speed speedcubing inspection countdown is deferred to a future competitive mode slice.

**Neutral**:
* Adds a small pure logic file `src/logic/timer.ts` and a dedicated UI component `src/components/VictoryCard.tsx`.

## Follow-up

- [ ] Connect durable storage via AsyncStorage for personal best solve records when personal best statistics feature is enrolled.
