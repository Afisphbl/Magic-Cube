# 0005. 3D Cube Renderer and Interaction: Rationale

**Date**: 2026-09-22

## Context

A physical Rubik's Cube is an inherently tactile object. Players expect to pick it up, turn it in their hands to inspect hidden sides, and twist individual slices with their thumbs. Translating this physical manipulation to a glass screen requires solving two core interaction challenges: disambiguating whole cube inspection from slice twisting, and delivering smooth sixty frame per second animations that feel immediate and responsive.

Several forces shape this decision:
1. Touch disambiguation: A single touch screen swipe could mean "spin the cube to look at the back" or "turn the top layer right". If the interaction feels ambiguous or misinterprets player intent, the puzzle becomes frustrating.
2. Cross platform execution: The game is developed primarily in web browsers using Expo Web and tested on physical Android phones. The interaction layer must behave identically across touch gestures and mouse clicks without divergent platform forks.
3. Rendering performance: React Three Fiber bridges React component state into Three.js. Re-rendering React components on every touch drag event would cause frame drops. High frequency gesture deltas must bypass the React reconciliation tree during continuous swipes.
4. State integrity: The 3D scene must serve strictly as a visual presentation and interaction sensor. The true mathematical state of the puzzle lives in the Zustand store, preventing visual animation state from ever corrupting sticker permutations.

## Options considered

### Option 1: Component hierarchy with direct React Three Fiber pointer events and exponential damping (Recommended)

Each of the twenty six cubies is an independent React component attached to the Three.js scene graph. Gestures attach directly to cubie meshes and a full screen backdrop plane using React Three Fiber pointer events with pointer capture. Whole cube rotation uses quaternion slerping with exponential damping for smooth momentum. Face turns resolve by projecting the swipe vector against 3D face tangents when exceeding an eighteen point threshold.

**Pros**:
- Direct hit testing through Three.js raycasting automatically determines the touched cubie and surface normal without manual coordinate math.
- Pointer capture ensures smooth tracking even when a rapid swipe moves outside the physical canvas boundaries.
- Standard React Three Fiber pointer events work identically on mobile touch screens and web browser mouse clicks.
- Clean component boundaries allow each cubie to memoize its sticker material assignments independently.

**Cons**:
- Twenty six individual mesh groups generate twenty six draw calls per frame, which is slightly higher than an instanced mesh.
- Requires careful tuning of the drag threshold to prevent small exploratory touches from misfiring as slice rotations.

### Option 2: React Native Gesture Handler overlay with raycasting

Render the 3D canvas inside a native Gesture Handler container. Pan gestures are tracked natively on the UI thread, and screen coordinates are unprojected into the Three.js camera space via raycasting to detect intersecting cubies.

**Pros**:
- Native gesture recognizers handle multi touch arbitration and platform gesture cancellation natively on Android.
- Gesture velocity can drive native momentum curves.

**Cons**:
- Unprojecting native gesture coordinates into Three.js camera space requires manual bridge synchronization between the native gesture thread and Expo GL.
- Introduces platform divergent code because Gesture Handler web behavior differs significantly from native Android behavior.
- Adds unnecessary architectural complexity when React Three Fiber already provides native pointer event handling.

### Option 3: Monolithic instanced mesh with dual mode toggle switch

Combine all twenty six cubies into a single InstancedMesh to minimize GPU draw calls to one. Instead of gesture disambiguation, provide an explicit UI toggle button on the screen that switches between Orbit Mode and Turn Mode.

**Pros**:
- Maximum GPU efficiency with a single draw call for the entire cube.
- Zero risk of gesture ambiguity because the player explicitly chooses whether they are orbiting or turning.

**Cons**:
- Destroy the tactile illusion of playing with a physical cube by forcing players to constantly toggle a button just to look at the back.
- Animating individual slices with an InstancedMesh requires dynamically updating instance transformation matrices every frame, complicating animation logic.

## Rationale

Option 1 is selected because it delivers the natural feel of a physical puzzle while maintaining clean code architecture. Direct React Three Fiber pointer events eliminate the need for complex coordinate bridge plumbing, giving identical behavior in web development and on Android devices.

The twenty six draw calls produced by independent cubie meshes are negligible on modern mobile GPUs, which easily handle hundreds of draw calls per frame. In exchange, independent cubie components make slice rotation animation straightforward: during a turn, only the nine affected cubies are animated, while the remaining seventeen remain stationary.

Differentiating whole cube orbit from face slice turns via the hit target (backdrop plane versus cubie mesh) combined with an eighteen point swipe threshold provides intuitive control without artificial mode toggles. Storing active touch coordinates in component refs avoids React state re-renders during drags, ensuring fluid sixty frame per second interaction.
