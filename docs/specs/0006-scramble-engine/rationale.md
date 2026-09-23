# 0006. Scramble Engine: Decision Record

## Context

A core capability of any Rubik's Cube game is generating fresh, randomized puzzles for the player to solve. In a physical setting, competitors and casual players rely on standardized scramble sequences to ensure the puzzle is thoroughly mixed and completely fair. Without a proper scramble engine, players either face a solved cube with no puzzle to solve, or receive simplistic random moves that fail to distribute pieces across the cube.

Several technical forces shape this decision. First, the scramble must be mathematically guaranteed to produce a solvable cube state. Arbitrary sticker swapping can easily introduce impossible states (such as flipped edges or twisted corners with invalid parity) that cannot be solved through legal face turns. Generating scrambles as sequences of legal Singmaster turns guarantees solvability by construction.

Second, the scramble moves must avoid trivial cancellations. Naive random move generators often pick consecutive moves on the same face (such as `R` followed by `R'`) or redundant opposite face turns on the same axis (such as `R L R'`), wasting moves and leaving the cube under scrambled. The generation algorithm must enforce World Cube Association rules to guarantee genuine dispersion.

Third, the animation and interaction experience must respect player patience. Playing twenty moves at standard manual turn speeds (two hundred sixty milliseconds each) requires over five seconds of passive waiting before the player can touch the puzzle. The engine must provide high speed animation (seventy milliseconds per turn) and an instant skip option so players can start playing immediately whenever they choose.

## Options considered

### Option 1: Algorithmic pseudo random generator with World Cube Association axis filtering and fast animation queue (Chosen option)

Generate a sequence of twenty to twenty five moves locally using pure algorithmic selection. The generator tracks recent move faces and axes, rejecting consecutive turns on the same face and sandwich patterns on the same axis. The sequence feeds into the existing store animation queue at seventy milliseconds per move, with an instant tap to skip fallback.

**Pros**:
* Mathematical solvability guaranteed by construction through legal turn permutations.
* Zero external package dependencies, zero network requests, and zero bundle bloat.
* Smooth, fast visual animation keeps the app feeling lively while skip gives players instant control.
* Full sequence notation is available to display in the user interface.

**Cons**:
* Does not guarantee an exact distance from solved state in group theory (though twenty moves is proven to provide thorough random distribution).

### Option 2: Precomputed scramble table lookup with instant state swap

Store a static catalog of one thousand precomputed tournament scramble sequences and their resulting permutation states in a bundled JSON asset. When the player taps Scramble, the game picks a random entry and snaps the cube state directly to that target state without running move animations.

**Pros**:
* Instant execution with zero computational overhead on mobile devices.
* Curated sequences guaranteed to match official tournament distributions.

**Cons**:
* Eliminates the visual satisfaction of watching the cube twist and shuffle.
* Increases client bundle size with large static data tables.
* Limited variety once the precomputed catalog is exhausted.

### Option 3: Two phase Kociemba solver random state generator

Generate a completely random valid permutation of corners and edges directly, then run a client side two phase solver algorithm (Kociemba algorithm) to find an optimal solution path and invert it to produce the scramble sequence.

**Pros**:
* Mathematically optimal random state distribution matching professional desktop timers.
* Guarantees non trivial distance from solved state.

**Cons**:
* Heavy algorithmic complexity requiring several thousand lines of lookup tables and pruning trees.
* Noticeable initialization delay and CPU spikes on entry level mobile devices.
* Over engineered for a casual mobile puzzle game where sequential random turns achieve equal practical dispersion.

## Rationale

Option 1 provides the ideal balance of mathematical correctness, lightweight performance, and engaging visual feedback for Magic Cube. By generating sequences of twenty to twenty five legal moves, solvability is guaranteed without needing complex group theory solvers or large static data tables. The axis filtering logic ensures genuine piece distribution without redundant moves.

Running the scramble sequence through the existing React Three Fiber render loop at seventy milliseconds per turn creates an appealing, dynamic shuffle effect that lasts less than two seconds. Crucially, the tap to skip capability respects player agency, letting speedcubers jump straight to solving with zero delay.
