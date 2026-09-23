# 0006. Scramble Engine

**Date**: 2026-09-23
**Status**: Accepted

## Summary

This specification defines the scramble engine for the Magic Cube puzzle game. It generates pseudo random sequences of twenty to twenty five legal face turns following World Cube Association rules, avoiding repeated faces and cancelling axis moves. The engine animates the cube through each turn at seventy milliseconds per move for a dynamic visual shuffle, offers an instant tap to skip option, shows the full move notation in the user interface, and transitions into active play with clean state and haptic feedback.

## Requirements

**User stories**:
* As a player, I want to tap Scramble so that the cube shuffles into a fresh, solvable puzzle without manual setup.
* As a player, I want to watch the cube quickly turn through the scramble moves so that the shuffle feels authentic and visually engaging.
* As a player, I want to tap the screen or a Skip button to finish the scramble immediately so that I can start solving right away without waiting.
* As a player, I want to see the scramble notation text so that I can verify the sequence or practice official scramble sequences.
* As a player, I want to scramble at any time mid solve so that I can abandon a bad attempt and begin a new solve with zero friction.

**Acceptance criteria**:
* **AC-1**: Pseudo random scramble generator creates a sequence of twenty to twenty five legal Singmaster moves (`U`, `D`, `L`, `R`, `F`, `B` with modifiers `''`, `'2'`, or none). No consecutive moves turn the same face (such as `R R'` or `R R2`). No sequence turns opposite faces in a canceling pattern along the same axis (defined as X axis with `L` and `R`, Y axis with `U` and `D`, and Z axis with `F` and `B`, such as `R L R'` or `U D U`).
* **AC-2**: Mathematical solvability guarantee ensures that applying the generated sequence to a valid cube state preserves edge parity, corner parity, and permutation invariants, resulting in a strictly solvable non trivial cube state.
* **AC-3**: Scramble action resets timer and move count to zero, clears any active manual animation or pending move, sets `gamePhase` to `SCRAMBLING`, populates `scrambleQueue`, stores `latestScramble` array and formatted `scrambleNotation` string in the Zustand store, and triggers an initial light tactile haptic pulse.
* **AC-4**: High speed slice animation plays each move in `scrambleQueue` sequentially with a rapid duration of seventy milliseconds per move. The existing `finishMoveAnimation` action in `useCubeStore` orchestrates the queue, advancing the next move into `animatingMove` with seventy milliseconds duration until the queue is exhausted.
* **AC-5**: Instant skip interaction allows the player to tap anywhere on the 3D canvas or tap a visible Skip button on the HUD while `gamePhase` is `SCRAMBLING`. Invoking `skipScramble` immediately aborts any in flight slice rotation, snaps cubie group positions and quaternions to neutral rest alignment, applies all remaining moves in `scrambleQueue` to `cubeState`, clears the queue, and transitions `gamePhase` to `PLAYING`.
* **AC-6**: Scramble completion executes when `scrambleQueue` empties, transitioning `gamePhase` cleanly to `PLAYING`, unlocking manual pointer controls, and triggering a final light tactile haptic pulse while keeping intermediate rapid moves muted. If `skipScramble` preempts an in flight animation, subsequent animation completion callbacks safely bail out to prevent ghost state updates.
* **AC-7**: Scramble notation display presents the formatted scramble sequence string inside a readable card or badge on `GameOverlay` so players can inspect the exact move notation during and after scramble.
* **AC-8**: Mid solve triggering allows the player to tap Scramble at any point during active play (`gamePhase === 'PLAYING'`), immediately aborting any active manual turn animation, smoothly discarding current solve progress, and initiating a fresh scramble without requiring a manual game reset or blocking dialog.

## Decision

**Chosen option**: Option 1: Pure algorithmic sequence generator with World Cube Association axis filtering, dynamic duration slice animation loop, instant skip action, and overlay notation display.

The scramble engine generates valid move sequences locally using pure math functions in `src/logic/scramble.ts`. Sequences are queued into the Zustand store (`src/store/useCubeStore.ts`) and animated inside the existing React Three Fiber render loop (`src/components/CubeGroup.tsx`) using a swift seventy millisecond duration per turn. Players can bypass the animation at any point via a canvas tap or HUD button, instantly applying all remaining permutations to the sticker state while neutralizing 3D transforms.

## Rationale

Reasoning and options: see rationale.md

## Feature design

**Data model sketch**:

| Entity | Primary Key / Identifier | Fields and Types | Relationships | Invariants and Rules |
|---|---|---|---|---|
| ScrambleDefinition | scrambleId (number) | moves (MoveName[]), notation (string), length (number), createdAt (number) | 1 to 1 with active game session | Length is 20 to 25 moves; no consecutive same face moves; no same axis cancellations on X (L/R), Y (U/D), or Z (F/B) |
| ScrambleQueueState | sessionId (number) | remainingMoves (MoveName[]), isSkipped (boolean), durationMs (number = 70) | 1 to 1 with store scrambleQueue | Animates each slice over 70ms; drains to empty on finish or skip; finishMoveAnimation chains next move |
| StoreScrambleState | singleton (useCubeStore) | latestScramble (MoveName[]), scrambleNotation (string), scrambleQueue (MoveName[]) | 1 to 1 with CubeStoreState | Disables manual input during SCRAMBLING; skipScramble immediately commits all remaining moves to cubeState |

**State transitions**:

Scramble interaction lifecycle:
* SOLVED: Cube is at solved state. Tapping Scramble creates new sequence, resets stats, sets phase to SCRAMBLING.
* PLAYING: Cube is mid solve. Tapping Scramble aborts any active turn animation, clears stats and timer, creates new sequence, sets phase to SCRAMBLING.
* SCRAMBLING: Move animation runs at 70ms per turn. Manual face drag and orbit inputs are locked. Canvas tap or Skip button triggers skipScramble.
* SCRAMBLE_SKIPPED: In flight 3D mesh transforms reset to zero immediately. Remaining moves in queue are composed and applied to cubeState in one tick, queue is emptied, and phase transitions to PLAYING.
* SCRAMBLE_FINISHED: Final animation move completes normally, queue reaches zero, phase transitions to PLAYING with moveCount at 0.

**API surface**:

Logic surface in `src/logic/scramble.ts`:
* `generateScramble(length?: number): MoveName[]`: Generates 20 to 25 move sequence enforcing no duplicate faces and no axis sandwich cancellations across X, Y, and Z axes.
* `formatScrambleNotation(moves: MoveName[]): string`: Formats array of moves into standard spaced text (for example `R U2 F' L D2 B`).
* `isValidScrambleSequence(moves: MoveName[]): boolean`: Validates sequence length, face diversity, and axis cancellation invariants.

Store additions in `src/store/useCubeStore.ts`:
* `latestScramble: MoveName[]`: The most recently generated scramble sequence.
* `scrambleNotation: string`: Formatted string representation for UI display.
* `scrambleCube: (moveCount?: number) => void`: Aborts any active turn, generates scramble, sets up queue, and starts animated playback.
* `skipScramble: () => void`: Instantly aborts in flight animation, resets cubie local transforms to neutral pose, commits remaining queued moves to cubeState, and finishes scramble.
* `finishMoveAnimation: () => void`: Extended to chain queued scramble moves with durationMs 70, bailing out gracefully if scramble was skipped.

Component surface:
* `CubeGroup`: Uses `animatingMove.durationMs` (70ms for scramble, 260ms for manual turns) to scale animation speed dynamically, with instantaneous reset on animation clear.
* `CubeCanvas`: Captures tap event during SCRAMBLING to call `skipScramble()`.
* `GameOverlay`: Shows Scramble button, Scrambling banner with Skip button during active scramble, and readable scramble notation badge.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| generateScramble | legal move sequence | derived from random selection over ALL_MOVE_NAMES with axis history filter (X: L/R, Y: U/D, Z: F/B) |
| formatScrambleNotation | readable notation string | derived from joining move array with single space delimiter |
| scrambleCube | scrambleQueue and animatingMove | derived from generateScramble output and getMoveAnimationInfo with 70ms duration |
| finishMoveAnimation | next queued animatingMove | derived from popping head of scrambleQueue with 70ms duration until empty |
| skipScramble | target cubeState | derived from successive applyMove calls over all remaining scrambleQueue moves |
| finishMoveAnimation | final gamePhase ('PLAYING') | derived from getNextGamePhase when scrambleQueue reaches length zero |
| GameOverlay render | displayed scramble notation | read directly from useCubeStore scrambleNotation state |

**Key invariants**:
* Generated scramble sequence length is between twenty and twenty five moves inclusive.
* Face axes are strictly partitioned into X axis (L and R), Y axis (U and D), and Z axis (F and B).
* No two consecutive moves operate on the same face (for example `U U'` or `R R2` never occur).
* No three consecutive moves operate on opposite faces along the same axis in a canceling pattern (for example `R L R` or `U D U'` never occur).
* Applying the complete scramble sequence to a valid cube state always yields a valid, solvable cube state.
* While gamePhase is SCRAMBLING, manual face gestures are disabled to prevent state conflicts.
* Skipping a scramble resets all cubie meshes to neutral transforms immediately and yields the exact same final cubeState as letting all animations play to completion.
* Completion handlers guard against race conditions: if skipScramble emptied the queue, lingering animation frames terminate safely without updating state.
* Triggering scrambleCube while a manual turn is animating aborts the manual turn cleanly without state corruption.
* Haptic feedback triggers only once at scramble start and once at scramble completion, muting intermediate moves.
* Move count remains at zero after a scramble completes, ready for the player's first solve move.

**Security model**:
* Purely client local single player puzzle game.
* No remote network requests, external data persistence, or user permissions required.

**Configuration required**:
* None. All algorithm parameters, move definitions, and timing constants live in client source code.

**Critical test scenarios**:
* Random sequence validity: Generator produces sequences between 20 and 25 moves with zero consecutive same face turns and zero same axis sandwich cancellations, verifying **AC-1**.
* State solvability: Cube state after applying complete scramble sequence is valid and solvable, preserving color counts and parity invariants, verifying **AC-2**.
* Store state initialization: Invoking scrambleCube resets timer and move count, aborts any active turn, populates scrambleQueue, and sets gamePhase to SCRAMBLING, verifying **AC-3**.
* High speed animation: CubeGroup animates scramble moves using 70ms duration and finishMoveAnimation chains moves successively, verifying **AC-4**.
* Instant skip execution: Invoking skipScramble aborts in flight animation, resets cubie transforms, applies all remaining moves immediately, empties queue, and sets gamePhase to PLAYING with identical state to full animation, verifying **AC-5**.
* Sequence completion and haptics: Draining queue without skipping transitions to PLAYING and triggers light haptic pulse, verifying **AC-6**.
* Notation display: Formatted scramble string renders accurately in overlay UI, verifying **AC-7**.
* Mid solve reset: Triggering scramble during active solve aborts in flight manual turns and resets count and timer without errors, verifying **AC-8**.

## Build plan

* [x] 1. Create pure scramble generation and notation formatting utilities with axis mapping and cancellation tests in `src/logic/scramble.ts`, satisfies **AC-1**, **AC-2**
* [x] 2. Extend `src/store/useCubeStore.ts` with `latestScramble`, `scrambleNotation`, `scrambleCube`, and `skipScramble` actions, queue chaining in `finishMoveAnimation`, and race condition guards, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-8**
* [x] 3. Update `src/components/CubeGroup.tsx` to read dynamic duration from `animatingMove.durationMs` for fast 70ms turns and instant transform neutralization on animation abort, satisfies **AC-4**, **AC-5**
* [x] 4. Add tap to skip handling in `src/components/CubeCanvas.tsx` during SCRAMBLING phase, satisfies **AC-5**
* [x] 5. Update `src/components/GameOverlay.tsx` with Scramble button action, active scrambling indicator, Skip button, and scramble notation display card, satisfies **AC-5**, **AC-7**, **AC-8**

## Consequences

**Positive**:
* Players receive realistic, competition standard scrambles that ensure fair and non trivial puzzles.
* Fast 70ms turn animation delivers satisfying visual feedback while keeping the total wait under two seconds.
* Tap to skip gives experienced speedcubers immediate access to solving without forced animation delays.
* In flight transform neutralization prevents broken visual orientations when skipping.
* Notation display enables players to learn standard Rubik's Cube notation and share scrambles.
* Zero external dependencies maintains offline reliability and small bundle size.

**Negative / tradeoffs**:
* Rapid 70ms animations increase frame work on budget devices during the two second shuffle, though skip provides an instant bypass.
* Storing the scramble sequence adds a tiny amount of memory in the Zustand store.

**Neutral**:
* The timer feature in Slice 3 will hook into the transition from SCRAMBLING to PLAYING to detect the player's first move.

## Follow-up

* [ ] Connect solve timer (Slice 3) to start timing on the first player move following scramble completion.
