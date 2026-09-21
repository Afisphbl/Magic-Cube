# Rationale: Cube Data Model and State Machine

## Context

The Rubik's Cube is a complex combinatorial mechanical puzzle with 43 quintillion reachable permutations. In a digital mobile game, representing this puzzle correctly is the single most critical structural decision. If the mathematical model is flawed, or if user inputs during rapid gestures corrupt the internal representation, every downstream feature including 3D rendering, gesture parsing, scrambling, and solve verification will fail.

The core challenge involves balancing computational efficiency with developer ergonomics and game responsiveness. On mobile devices with 60 to 120 frames per second display rates, calculating face rotations must never cause frame drops or garbage collection pauses. Furthermore, players swipe rapidly during play; the state machine must seamlessly synchronize visual animations with logical mutations without dropping gestures or causing race conditions between asynchronous animation completions and incoming touch events.

Additionally, solve detection must be mathematically robust. Speedcubers often solve puzzles starting on arbitrary face colors or rotating the cube during their solution. Requiring a fixed orientation (for example, White strictly Up and Green strictly Front) would frustrate players whose solved cube happens to rest in a different orientation.

## Options considered

### Option 1: Flat 54 sticker permutation lookup with buffered Zustand store

This option represents the cube state as a flat array of 54 integer color values. All 18 Singmaster moves are defined as precomputed permutation arrays of 54 indices. Applying a move is a pure function that copies values according to the permutation array. Game state machine transitions reside in Zustand, with a single move buffer handling rapid gestures during active animations.

**Pros**:
- Constant time O(1) move transformations with zero runtime matrix math or trigonometry
- State array is simple, serializable, and easily consumed by Three.js vertex materials
- Single move buffer provides natural touch responsiveness without queue lag buildup
- Pure functions in src/logic run in isolation with fast Node unit test execution

**Cons**:
- Generating and maintaining the precomputed permutation tables requires upfront permutation logic
- Whole cube rotations and slice turns require multiple index swaps rather than a single coordinate frame rotation

### Option 2: 3D Cubie coordinate and quaternion matrix simulation

This option models the cube as 26 individual cubie objects, each tracking its 3D position vector in grid space (-1, 0, 1) and its orientation quaternion or rotation matrix. Face rotations apply standard 3D transformation matrices to the nine affected cubie objects.

**Pros**:
- Mirrors physical construction of a mechanical cube directly
- Whole cube rotations and slice turns operate naturally by transforming spatial vectors

**Cons**:
- Floating point inaccuracies accumulate over long move sequences unless positions and quaternions are continuously snapped to orthogonal grids
- Deriving whether the cube is solved requires complex orientation and color lookups across all 26 pieces
- Substantially higher memory footprint and object allocation churn on every move

### Option 3: Cyclic permutation engine with statechart library

This option represents moves as disjoint cycles of sticker indices (for example 4 cycles of 5 stickers each) executed via a statechart library such as XState to govern game phases and animation transitions.

**Pros**:
- Formal mathematical cycle notation is concise
- Statechart library provides visual state diagrams and strict transition enforcement

**Cons**:
- Introduces an external dependency (XState) with substantial bundle weight for a relatively straightforward 3 phase lifecycle
- Iterating cycle arrays is slower and more complex than flat array permutation lookups
- Overcomplicates unit testing compared to simple pure TypeScript reducer functions

## Rationale

Option 1 is selected because it delivers optimal runtime performance, mathematical simplicity, and complete decoupling between game rules and visual rendering. In high speed puzzle games, predictability is paramount. A flat 54 element array of integers has negligible memory overhead and guarantees zero runtime allocations during play. Precomputing the 18 permutation tables transforms move execution into an immediate O(1) index copy, removing any risk of floating point drift.

The single move buffer in Zustand resolves the latency and race condition dilemmas observed in fast mobile swiping. If a player swipes while a 250ms face turn animation is playing, dropping the move causes perceived unresponsiveness, while an unbounded queue creates disorienting input lag. Buffering exactly one pending move and immediately chaining it upon animation completion creates a fluid, responsive feel while maintaining strict state integrity.

Orientation agnostic solve detection satisfies the casual and competitive player experience by evaluating face color uniformity rather than rigid world coordinates. This ensures that any legitimate solved state is instantly recognized.
