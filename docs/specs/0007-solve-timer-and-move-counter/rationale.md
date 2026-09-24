# 0007. Solve Timer and Move Counter: Rationale

**Date**: 2026-09-24

## Context

A core appeal of solving a Rubik's Cube is measuring personal progress: tracking how quickly a puzzle can be solved and how few moves are needed. In physical speedcubing, competitors place both hands on a dedicated timer mat, inspect the cube, lift their hands to start the timer, solve the puzzle, and tap the timer pad again to stop. For a mobile game targeting casual and enthusiastic players alike, requiring manual timer taps introduces friction and detracts from the tactile flow of turning faces.

Several technical forces shape how a digital timer and move counter must operate:
1. Accuracy and drift: using JavaScript interval counters (such as setInterval) leads to clock drift over long solves and stalls completely when the operating system throttles background processes or minimizes the app. Timing must rely on true system clock differences.
2. Rendering performance: updating a React Native component tree or a global Zustand store at sixty frames per second to show centiseconds causes unnecessary re renders and battery drain, especially while Three.js renders complex 3D cube rotations. The display mechanism must be lightweight and localized.
3. Move metric conventions: speedcubing defines explicit standards such as Half Turn Metric (HTM), where any face turn of 90 degrees or 180 degrees counts as one move, whereas rotating the whole cube to view different angles does not alter the sticker permutation and must not increment move count.
4. Player satisfaction: finishing a solve requires immediate visual and tactile celebration. The victory screen should present key performance metrics (solve time, move count, turns per second) and offer an immediate action to scramble again.

## Options considered

### Option 1: Timestamp based timer engine with local display ticker hook, store level solve lifecycle, and celebratory victory card overlay

This option records the start timestamp on the first manual face turn after a scramble and derives elapsed time directly from the system clock (`Date.now()`). An explicit timer status machine (`IDLE`, `RUNNING`, `STOPPED`) lives in the Zustand store alongside move count and scramble history. A lightweight local React hook updates the timer display text at fifty millisecond intervals without triggering global state re renders. When the final move completes and the cube is verified as solved, the timer stops automatically, creates a structured `SolveRecord`, triggers celebration haptics, and opens an animated victory card overlay with quick replay options.

**Pros**:
* Eliminates timer drift completely and accurately reflects elapsed time even across app backgrounding.
* Prevents unnecessary 60fps re renders of the global Zustand store and 3D canvas during turns.
* Delivers an engaging victory payoff with key performance statistics and immediate scramble replay.
* Retains clear boundaries between pure calculation logic, state management, and visual components.

**Cons**:
* Requires a local hook to drive the head up display rather than reading a single global store value for every millisecond.
* Solve records remain in memory for this slice, requiring a subsequent slice to add persistent storage.

### Option 2: Store interval accumulator with inline header banner

This option sets up a JavaScript `setInterval` timer inside the Zustand store that ticks every ten milliseconds while the solve is active, updating `timerMs` in global state on every tick. When solved, the header banner changes color to show a brief congratulations message without opening a modal card.

**Pros**:
* Simpler state model where all components read `timerMs` directly from the Zustand store.
* Minimal user interface footprint with no overlay modals.

**Cons**:
* Broadcasting global store updates every ten milliseconds creates severe React render thrashing and battery consumption on mobile devices.
* Subject to timing drift and pauses when the device undergoes frame drops or background process throttling.
* Lacks an exciting celebration payoff for completing a challenging puzzle.

### Option 3: Separate navigation screen with full AsyncStorage history

This option pauses the 3D scene upon solve detection and uses Expo Router to navigate the player to a separate full screen results route (`/results`), displaying interactive graphs, move histories, and saving all solves permanently to device storage via AsyncStorage.

**Pros**:
* Provides rich historical analytics and persistent tracking from day one.
* Isolates the result presentation completely from the 3D game canvas.

**Cons**:
* Breaking the game loop with full screen route transitions introduces excessive friction for players who want to scramble and solve repeatedly.
* Adds unnecessary complexity and dependencies before the core timer and victory loop are proven in a working slice.
* Conflicts with the tracer bullet build approach by building heavy analytics prematurely.

## Decision

**Chosen option**: Option 1: Timestamp based timer engine with local display ticker hook, store level solve lifecycle, and celebratory victory card overlay.

## Rationale

Option 1 provides the best balance of timing precision, runtime performance, and engaging player feedback. Deriving elapsed time from wall clock timestamps (`Date.now() - solveStartTime`) guarantees that the recorded solve time remains accurate regardless of frame drops or app minimization. Keeping the rapid ticker updates inside a localized React hook protects the 3D rendering pipeline and general UI from unnecessary component renders.

Presenting the victory card as an overlay sheet on top of the 3D cube preserves the player's connection to the puzzle they just completed while providing a clear call to action to scramble and solve again. Option 2 was rejected due to performance thrashing from global store ticks and timing drift. Option 3 was rejected because full screen navigation disrupts the core game loop and overcomplicates the initial slice.
