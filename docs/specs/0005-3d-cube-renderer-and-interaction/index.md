# 0005. 3D Cube Renderer and Interaction

**Date**: 2026-09-22
**Status**: Accepted

## Summary

This specification defines the 3D rendering and touch gesture interaction layer for the 3x3 Rubik's Cube puzzle game. It renders twenty six individual cubie meshes within Three.js using React Three Fiber and Expo GL, styled with standard plastic materials and scene lighting. Players can orbit the whole cube by dragging background space around world axes or rotate individual face slices by swiping cubie faces across an eighteen point threshold. Smooth animations run at sixty frames per second using cubic ease in out interpolation, synchronizing directly with the Zustand store via pure coordinate index lookups and triggering light haptics on mobile upon completion.

## Requirements

**User stories**:
- As a player, I want to inspect the cube from any angle by dragging background space so that I can see the stickers on all six faces clearly.
- As a player, I want to turn any cube face by swiping a finger across its stickers so that playing feels direct and natural like holding a real puzzle.
- As a player, I want face turns to animate smoothly and click into place with haptic feedback so that every move feels satisfying and responsive.
- As a player, I want my quick follow up swipes to queue cleanly without glitching animations or corrupting cube state.
- As a player, I want the cube to fit comfortably on my phone screen regardless of device size or aspect ratio without getting cut off by menus.

**Acceptance criteria**:
- **AC-1**: Whole cube orbit rotation allows the player to swipe on empty background space or backdrop mesh to rotate the entire cube in 3D, where horizontal drag rotates around the world Y axis and vertical drag rotates around the world X axis using screen pointer deltas with smooth exponential damping.
- **AC-2**: Face swipe gesture allows the player to drag on any visible cubie face by at least eighteen screen points, projecting 3D face tangents into 2D screen space via the current cube quaternion and taking the dot product with the swipe vector to resolve the legal Singmaster slice turn.
- **AC-3**: Slice rotation animation visually rotates the nine cubies of the active slice around their rotation axis using cubic ease in out curve over two hundred sixty milliseconds, resetting local transforms cleanly on finish.
- **AC-4**: State synchronization updates the logical fifty four sticker array in the Zustand store upon animation completion, translating static cubie coordinates to array indices via getStickerIndex to update all cubie face materials instantly.
- **AC-5**: Gesture lock and input buffering reject new cubie touch down events while an animation is active to prevent raycasting tilted meshes, while queuing at most one automated or buffered turn to execute immediately after the current turn without releasing the move lock.
- **AC-6**: Tactile haptic feedback triggers a light impact pulse on mobile devices via Expo Haptics when a slice rotation animation completes successfully, failing silently on unsupported platforms.
- **AC-7**: Responsive camera framing dynamically recalculates camera distance using field of view trigonometry and HUD clearance fractions to prevent cube clipping across all aspect ratios.
- **AC-8**: Orientation reset triggers allow the player to snap the whole cube smoothly back to standard default view (Euler -0.4, 0.6, 0) or yellow top view (180 degree X flip) via store preset triggers.

## Decision

**Chosen option**: Option 1: Component hierarchy with direct React Three Fiber pointer events, local gesture tracking, and frame rate independent damping.

The 3D cube is rendered as twenty six modular Cubie components inside a parent CubeGroup, driven by React Three Fiber pointer events on meshes and a full screen backdrop. High frequency gesture deltas are held in component refs to eliminate React re-render lag during swipes. Slice animations execute inside the useFrame render loop with cubic easing, updating the Zustand store atomically and triggering Expo Haptics upon completion.

## Rationale

Reasoning and options: see rationale.md

## Feature design

**Data model sketch**:

| Entity | Keys and Attributes | Relationships and Cardinality | Rules and Constraints |
|---|---|---|---|
| CubieCoordinate | Key: (x, y, z) in {-1, 0, 1}; Attributes: isCenter, isEdge, isCorner | 1 to 6 with CubieFaceMaterial | Exactly 26 cubies, excluding center origin (0, 0, 0) |
| CubieFaceMaterial | Key: (cubieCoord, faceDirection); Attributes: stickerIndex, colorHex | Many to 1 with CubeStickers | 54 exterior stickers map to face colors, 102 interior faces map to plastic color |
| GestureTrackingState | Key: primaryPointerId; Attributes: mode, startCoords, cubieCoord, hitNormal | 1 active gesture per touch session | Stored in local component refs, threshold of 18 points for face turns |
| SliceAnimation | Key: animationId; Attributes: moveName, axis, targetAngle, durationMs (260), easing | 1 to 1 with store animatingMove | Cubic ease in out, resets local cubie transforms on finish |
| CameraFraming | Attributes: fov (45), viewportDimensions, computedDistance | 1 per active Canvas | Dynamic distance calculation prevents cube clipping on narrow viewports |

**State transitions**:

Interaction lifecycle states:
- IDLE: No active touches on canvas, cube orientation rests at current quaternion, no moves animating.
- ORBITING: Pointer down on backdrop plane or right click on cubie; primary pointer id locked; horizontal drag rotates around world Y axis, vertical drag rotates around world X axis; slerp damping smooths movement.
- FACE_DRAG: Left click or touch down on cubie face while isAnimating is false; primary pointer id locked; drag tracking measures distance from start screen coordinates.
- ANIMATING: Drag distance reaches eighteen points; store initiates slice rotation; active cubies rotate around axis via useFrame; cubie touch down events are locked out.
- BUFFERED: Move queued from automated sequence or buffer; store records move into pendingMove; extra inputs discarded until drained.
- MOVE_COMPLETED: Progress reaches one; local transforms reset to rest coordinates; store updates sticker state, triggers light haptics, and primary pointer unlocks.

**API surface**:

Component surface:
- `CubeCanvas`: Root container hosting the Canvas, lights, responsive camera, invisible backdrop plane, and pointer handlers with primary pointer id locking.
- `CubeGroup`: Group hosting the twenty six cubies, slerping whole cube rotation, and driving slice animation progress.
- `Cubie`: Memoized individual cubie mesh rendering six materials (exterior face color or interior plastic).

Logic surface:
- `getFaceTangents(normal: [number, number, number])`: Returns two orthogonal unit vectors in plane of cubie face.
- `resolveFaceDragMove(normal, cubie, chosenTangent)`: Computes legal MoveName from normal, cubie position, and chosen tangent.
- `getStickerIndex(faceIndex, x, y, z)`: Maps face direction (0 to 5) and cubie coordinates (-1, 0, 1) to sticker array index (0 to 53).
- `getCameraDistance(width: number, height: number)`: Calculates camera Z distance from screen aspect ratio and HUD clearance.

Store connections in `useCubeStore`:
- `cubeState`: Fifty four element array of sticker colors (0 to 5).
- `isAnimating`: Boolean flag indicating active slice turn.
- `animatingMove`: ActiveMoveAnimation object with axis, targetAngle, duration, and cubie filter.
- `startMoveAnimation(move: MoveName)`: Begins slice animation.
- `finishMoveAnimation()`: Commits move to cubeState, increments count, triggers haptics, and drains buffer.
- `viewPresetTrigger`: Object triggering whole cube rotation to white top or yellow top views.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| handleBackgroundPointerMove | whole cube rotation delta | derived from screen dx around world Y axis and dy around world X axis multiplied by 0.008 sensitivity |
| handleCubiePointerDown | hit cubie coordinate and face normal | derived from ThreeEvent intersection object (x, y, z and rounded face normal) |
| handleCubiePointerMove | chosen face move | derived from resolveFaceDragMove using face normal, cubie position, and tangent with largest dot product |
| useFrame slice rotation | cubie local position and quaternion | derived from rotating axis angle multiplied by easeInOutCubic progress |
| finishMoveAnimation | updated sticker materials and haptic pulse | derived from applyMove on current cubeState and Expo Haptics impactAsync |
| ResponsiveCamera update | camera Z position | derived from getCameraDistance using Canvas viewport width and height |

**Key invariants**:
- Exactly twenty six cubies render in the 3D scene at coordinates -1, 0, 1 on X, Y, Z axes.
- Exactly fifty four exterior cubie faces display theme colors corresponding to cubeState indices 0 to 53 via getStickerIndex.
- All interior faces display the dark plastic frame color (#151821).
- Face drag gestures require a minimum movement of eighteen screen points before resolving into a slice turn.
- While isAnimating is true, new touch down events on cubies are ignored to prevent raycasting tilted meshes.
- Gestures lock to the first active pointer id, ignoring secondary touch points until release.
- Slice turn animation duration is fixed at two hundred sixty milliseconds with zero start and end velocity.
- At most one move can be buffered during an active animation, preventing gesture race conditions.

**Security model**:
- Purely client local single player puzzle game.
- No network communication, no remote API calls, no user accounts, and no persistent credentials.
- No sensitive user data or external permissions required beyond standard touch and haptic device features.

**Configuration required**:
- None. All visual parameters, colors, and animation timings are packaged with the client application.

**Critical test scenarios**:
- Whole cube orbit: Dragging background plane rotates whole cube quaternion around world axes and settles with smooth damping, verifying **AC-1**.
- Face slice turn: Swiping a cubie face by at least eighteen points projects tangents and triggers matching Singmaster move, verifying **AC-2**.
- Animation interpolation: Active slice cubies rotate smoothly through ninety degrees and reset local coordinates on finish, verifying **AC-3**.
- State consistency: Logical sticker state updates and getStickerIndex maps new colors to all cubies on finish, verifying **AC-4**.
- Raycast and input guard: Cubie touches during active animation are ignored and buffered moves execute cleanly, verifying **AC-5**.
- Haptic trigger: Move completion invokes light haptic impact on mobile and ignores errors on web, verifying **AC-6**.
- Responsive viewport: Camera distance increases on narrow screens to keep cube fully inside viewport without clipping, verifying **AC-7**.
- Orientation preset: Triggering orientation preset smoothly rotates cube to default or yellow top angles, verifying **AC-8**.

## Build plan

- [x] 1. Verify and polish 3D cubie geometry, standard materials, and scene lighting hierarchy, satisfies **AC-3**
- [x] 2. Wire whole cube orbit interaction with world axis mapping, pointer capture, and exponential damping, satisfies **AC-1**
- [x] 3. Wire face drag gesture detection with primary pointer locking, eighteen point threshold, and tangent projection logic, satisfies **AC-2**
- [x] 4. Wire frame rate independent slice rotation animation loop with cubic easing, satisfies **AC-3**
- [x] 5. Wire atomic move completion, getStickerIndex synchronization, and single move buffer draining, satisfies **AC-4**, **AC-5**
- [x] 6. Integrate Expo Haptics impact feedback on move animation completion, satisfies **AC-6**
- [x] 7. Implement dynamic responsive camera distance calculation with HUD clearance guard, satisfies **AC-7**
- [x] 8. Wire orientation preset triggers for quick view reset and inspection angles, satisfies **AC-8**

## Consequences

**Positive**:
- Direct touch interaction provides a tactile, engaging experience comparable to handling a physical Rubik's Cube.
- Frame rate independent slerp damping ensures smooth camera and slice rotation across both high refresh rate displays and budget devices.
- Keeping high frequency gesture coordinates inside React refs avoids unnecessary component re-renders during drags.
- Strong separation between 3D scene rendering and pure logical cube state guarantees math integrity.
- Rejecting cubie touch down events during active animation prevents raycaster corruption from tilted meshes.

**Negative / tradeoffs**:
- Swiping near the boundary of a cubie face requires careful threshold tuning to avoid accidental whole cube orbit drags.
- Rendering twenty six independent cubie meshes creates twenty six draw calls per frame, acceptable for modern mobile GPUs but higher than an instanced mesh.

**Neutral**:
- Web mouse controls require mapping right click and middle click to whole cube orbit to supplement left click face swipes.

## Follow-up

- [ ] Confirm touch gesture feel and drag threshold responsiveness on a physical Android device.
- [ ] Profile frame rate during rapid multi slice animations on entry level mobile hardware.
