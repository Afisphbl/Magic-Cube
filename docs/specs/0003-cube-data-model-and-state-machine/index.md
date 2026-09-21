# 0003. Cube Data Model and State Machine

**Date**: 2026-09-21
**Status**: Accepted

## Summary

This specification establishes the core mathematical model and reactive state machine for the 3x3 Rubik's Cube. It defines a flat 54 element sticker array with precomputed permutation lookup tables for all 18 standard Singmaster face turns (quarter turns, inverse turns, and half turns). Solved state detection recognizes completion across any valid cube orientation where each of the six faces shows nine uniform stickers. Game session progression tracks three distinct phases (SOLVED, SCRAMBLING, and PLAYING) with an atomic single move input buffer and a dedicated scramble queue that prevent race conditions and visual stutter during rapid touch gestures and automated scrambles.

## Requirements

**User stories**:
- As a player, I want to rotate cube faces using standard Rubik notation so that I can scramble and solve the cube accurately.
- As a player, I want the game to recognize when the cube is solved in any orientation so that my solve completes without having to align center colors to specific starting directions.
- As a player, I want my quick swipe inputs to feel responsive without breaking cube state or glitching animations.
- As a player, I want automated scrambles to execute cleanly in sequence without interfering with manual input buffering.

**Acceptance criteria**:
- **AC-1**: Standard 54 sticker representation models the six cube faces (Up, Down, Right, Left, Front, Back) with nine stickers each, where color IDs 0 to 5 conserve exactly nine stickers per color.
- **AC-2**: All 18 Singmaster face turns (U, U prime, U2, D, D prime, D2, L, L prime, L2, R, R prime, R2, F, F prime, F2, B, B prime, B2) execute as pure permutations that preserve cube integrity, where four identical quarter turns restore the starting state and an inverse turn cancels its forward turn.
- **AC-3**: Solved state detector returns true when every face displays nine uniform stickers of identical color, regardless of whole cube orientation.
- **AC-4**: Game session state machine accurately transitions across SOLVED, SCRAMBLING, and PLAYING phases, setting PLAYING on first manual move if not scrambling, and transitioning to SOLVED automatically upon solve detection once all pending moves are drained.
- **AC-5**: Move lock and single pending move buffer accept at most one queued turn during an active animation, executing it immediately upon animation finish without releasing the animation lock in between, while discarding further inputs.
- **AC-6**: State validator detects corrupted sticker states (array length different from 54 or color distribution violating nine stickers per color) and provides a safe fallback recovery to solved state without crashing the application.
- **AC-7**: Move counter tracks total moves made during a solve session and move history records chronological MoveName entries.
- **AC-8**: Scramble queue executes sequences of moves consecutively in SCRAMBLING phase, transitioning to PLAYING when empty and deferring solve evaluation until all turns complete.

## Decision

**Chosen option**: Option 1: Pure functional 54 sticker permutation table with single move buffered Zustand state machine

The Rubik's Cube state is represented as an immutable flat array of 54 color IDs, transformed through precomputed index permutation arrays for each of the 18 Singmaster moves. Game session state lives in the central Zustand store, which delegates all state transition calculations to pure functions in `src/logic/cubeMoves.ts`. Rapid user inputs during active animations are managed through a single move buffer, while automated sequences run through a dedicated scramble queue.

**Implementation skills**: none installed yet

## Rationale

Reasoning and options: see rationale.md

## Feature design

**Data model sketch**:

| Entity | Fields | Types and Nullability | Constraints |
|---|---|---|---|
| CubeStickers | stickers | number[] (length 54, non null) | exactly 9 of each color ID (0 to 5) |
| MoveDefinition | name, permutation, axis, angle, durationMs, easing, filter | MoveName, number[54], [x,y,z], number, number, string, filter function | 18 canonical moves, precomputed permutations |
| GameSession | phase, moveCount, moveHistory, pendingMove, scrambleQueue, isAnimating, animatingMove | GamePhase, number, MoveName[], MoveName or null, MoveName[], boolean, ActiveMoveAnimation or null | phase in SOLVED/SCRAMBLING/PLAYING; moveCount matches history length |
| ActiveMoveAnimation | move, axis, targetAngle, durationMs, easing, filter | MoveName, [x,y,z], number, number, string, filter function | non null only while isAnimating is true; durationMs defaults to 250 |

Face index mapping in the 54 element array:
- Up face: indices 0 to 8 (color ID 0, default White)
- Down face: indices 9 to 17 (color ID 1, default Yellow)
- Right face: indices 18 to 26 (color ID 2, default Red)
- Left face: indices 27 to 35 (color ID 3, default Orange)
- Front face: indices 36 to 44 (color ID 4, default Blue)
- Back face: indices 45 to 53 (color ID 5, default Green)

**State transitions**:

GamePhase lifecycle transitions:
- SOLVED to SCRAMBLING: triggered by startScramble action with a sequence of moves
- SCRAMBLING to PLAYING: triggered when scrambleQueue empties and the final scramble move animation completes
- SOLVED to PLAYING: triggered when player makes a manual move while cube is in SOLVED state
- PLAYING to SOLVED: triggered when all queued and pending animations drain and isCubeSolved evaluates to true
- Any phase to SOLVED: triggered when player taps Reset Game

Animation and queue lifecycle transitions:
- IDLE: isAnimating is false, animatingMove is null, pendingMove is null, scrambleQueue is empty
- IDLE to ANIMATING: player inputs move via requestMove, or store pops from scrambleQueue; store sets isAnimating true, sets animatingMove with durationMs and easing
- ANIMATING to BUFFERED: player inputs manual move during active animation; store saves move into pendingMove; subsequent manual inputs while pendingMove is occupied are discarded
- BUFFERED to ANIMATING: finishMoveAnimation runs; store applies current move, pops pendingMove, immediately initiates next animation without releasing lock, and defers solve evaluation
- SCRAMBLE to ANIMATING: finishMoveAnimation runs while in SCRAMBLING phase; store applies move, pops next move from scrambleQueue, and continues animating until queue is empty
- ANIMATING to IDLE: finishMoveAnimation runs with no pending move and empty scrambleQueue; store applies completed move, evaluates isCubeSolved, and sets isAnimating false

**API surface**:

Pure logic functions in `src/logic/cubeMoves.ts`:
- `createSolvedCubeState(): number[]`: generates a clean 54 element solved array
- `applyMove(state: number[], move: MoveName): number[]`: returns new 54 element array with permutation applied
- `isCubeSolved(state: number[]): boolean`: returns true if all six faces have nine uniform stickers
- `validateCubeState(state: number[]): { valid: boolean; error?: string }`: checks length 54 and nine of each color ID
- `getMoveAnimationInfo(move: MoveName, durationMs?: number): MoveAnimationInfo`: returns rotation axis, angle in radians, duration in milliseconds, easing name, and cubie filter predicate
- `resolveFaceDragMove(worldNormal: [number, number, number], cubie: [number, number, number], worldTangent: [number, number, number]): MoveName | null`: calculates move name from 3D pointer raycast world space normal and tangent
- `getNextGamePhase(currentPhase: GamePhase, isSolved: boolean, hasPendingMoves: boolean): GamePhase`: determines next lifecycle state

Store actions in `src/store/useCubeStore.ts`:
- `requestMove(move: MoveName): boolean`: starts animation or buffers move; returns false if buffer already occupied
- `applyMoveDirect(move: MoveName): void`: synchronously commits move to cubeState without visual animation (used for testing and instant scrambles)
- `startScramble(moves: MoveName[]): void`: sets phase to SCRAMBLING, enqueues moves into scrambleQueue, and starts initial animation
- `finishMoveAnimation(): void`: commits animating move to cubeState, increments counters, drains scrambleQueue or pendingMove, and updates gamePhase when queue is empty
- `resetGame(): void`: restores solved state, resets moveCount to 0, clears moveHistory, empties scrambleQueue, resets phase to SOLVED, and cancels animations
- `setGamePhase(phase: GamePhase): void`: explicit phase updater

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| createSolvedCubeState | initial sticker array | derived from color index loop (0 to 5, 9 stickers each) |
| applyMove | next sticker array | derived from current state indexed by MOVE_PERMUTATIONS[move] |
| isCubeSolved | boolean solve indicator | derived from checking equality of 9 stickers on each of the 6 faces |
| validateCubeState | validation result | derived from array length check and color frequency histogram |
| requestMove | animation descriptor | derived from getMoveAnimationInfo(move, 250) |
| startScramble | populated scrambleQueue | derived from passed MoveName array |
| finishMoveAnimation | incremented moveCount | derived from previous moveCount plus 1 |
| finishMoveAnimation | updated moveHistory | derived from previous moveHistory appended with completed move |
| finishMoveAnimation | next gamePhase | derived from getNextGamePhase evaluated on nextCubeState |
| finishMoveAnimation | chained animation | derived from scrambleQueue or pendingMove buffer |

**Key invariants**:
- Color conservation: exactly nine stickers of each color ID (0 to 5) exist in valid states
- Array shape: cubeState array length is always exactly 54
- Permutation correctness: all 18 moves preserve legal Rubik geometry (no impossible parity)
- Single pending buffer: at most one manual move may be buffered while an animation is running
- Lock exclusivity: isAnimating remains true for the entire duration of an animation and its chained moves
- Solve evaluation deferral: isCubeSolved is evaluated only when both pendingMove and scrambleQueue are completely empty

**Security model**:
Client side offline execution. No user credentials, authentication tokens, network endpoints, or sensitive personal data are involved.

**Configuration required**:
None.

**Critical test scenarios**:
- Happy path: execute all 18 moves on a solved cube and confirm 4 quarter turns return to solved, verifies AC-1, AC-2, AC-3
- Lifecycle transition: start from SOLVED, make a move, verify transition to PLAYING, solve cube, verify transition to SOLVED, verifies AC-4
- Concurrency and buffer: trigger move while animating, verify move is buffered and executed atomically upon finish, verifies AC-5
- Corrupted state recovery: pass invalid sticker array to validator, verify validation failure and safe reset to solved, verifies AC-6
- Move history and count: perform 10 moves, verify moveCount is 10 and moveHistory contains exactly the 10 moves in order, verifies AC-7
- Automated scramble execution: initiate scramble with 20 moves, verify sequential execution, phase transition to PLAYING, and solve deferral, verifies AC-8

## Build plan

- [x] 1. Thicken `src/logic/cubeMoves.ts` with complete type definitions, color conservation validator, animation parameters (durationMs, easing), and game phase transition helper, satisfies AC-1, AC-4, AC-6
- [x] 2. Add move history array, scramble queue, and single move buffer state to `src/store/useCubeStore.ts` alongside requestMove, applyMoveDirect, and startScramble, satisfies AC-4, AC-5, AC-7, AC-8
- [x] 3. Implement atomic animation chaining in finishMoveAnimation so buffered moves and scramble queue items transition without releasing the animation lock, satisfies AC-5, AC-8
- [x] 4. Add comprehensive unit tests in `test/cube_moves.test.mjs` and `test/cube_store.test.mjs` verifying all 18 moves, orientation invariant solve detection, validation recovery, scramble queue sequencing, and buffer queue mechanics, satisfies AC-2, AC-3, AC-5, AC-6, AC-7, AC-8

## Consequences

**Positive**:
- O(1) move transformations with zero dynamic matrix calculations or trigonometric allocations at runtime
- Game logic is completely decoupled from React and Three.js, enabling instantaneous unit testing via Node test runner
- Orientation agnostic solve detection ensures players are never penalized for solving the cube in a rotated orientation
- Single move buffer prevents dropped inputs during enthusiastic play while avoiding runaway queue lag
- Scramble queue provides a seamless foundation for Slice 2 scramble animations

**Negative / tradeoffs**:
- Precomputed permutation tables require initial generation logic and memory footprint for 18 arrays of 54 numbers (negligible in practice, under 10 kilobytes)
- Direct slice turns (M, E, S) and whole cube rotations (x, y, z) are not atomic primitives and must be composed from face turns if needed later

**Neutral**:
- Visual rendering components must continue to map 3D cubie faces to the flat 54 sticker indices using getStickerIndex
- Raycast pointer events must convert coordinates to world space before passing to resolveFaceDragMove

## Follow-up

- [ ] Verify integration with Slice 1 (3D renderer gesture handlers) when binding user swipe gestures to requestMove
- [ ] Connect Scramble Engine (Slice 2, Feature 6) to startScramble when scramble move generator is specced
