# 0002. Stack and Architecture (Expo + React Native)

**Date**: 2026-09-19
**Status**: Proposed

## Summary

Magic Cube switches from Android/Kotlin to Expo and React Native with TypeScript, replacing spec 0001 which required Android Studio. The 3D cube is rendered using Three.js (the industry standard 3D library for the web and React Native) via the `@react-three/fiber` declarative wrapper on top of `expo-gl` (an OpenGL ES bridge for Expo). The whole project runs without Android Studio: you develop in a browser with `npx expo start --web`, then install a Development Build on a physical Android phone once you are ready to test on device. State is managed with Zustand, scene interactions use R3F's built-in pointer events, and the project is scaffolded as an Expo managed workflow app with Expo Router.

## Decision

**Chosen option**: Expo managed workflow + TypeScript + @react-three/fiber + expo-gl + Zustand

The Magic Cube app is built as an Expo managed workflow project using TypeScript, Expo Router for navigation, `@react-three/fiber` with `expo-gl` for 3D rendering, and Zustand for game state. Development happens in a browser (via `npx expo start --web`) with no Android Studio required. A Development Build is compiled once when you are ready to test on a physical Android device.

**Implementation skills**: none installed yet (no community skills configured; see Follow-up)

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript | Default in all new Expo projects; catches bugs early especially in the cube state machine where strict types pay off on every move |
| Project type | Expo managed workflow (CNG) | No native IDE needed; config plugins handle custom native modules; `expo prebuild` generates native projects on demand |
| Navigation | Expo Router (file based) | The current Expo default for new projects; a single `app/index.tsx` is the whole game screen; overlays (timer, result) are components inside it, not routes |
| 3D rendering | `@react-three/fiber` + `expo-gl` + Three.js | Declarative Three.js on React Native via WebGL; large community, well documented, works in both browser and Development Build; the leading choice for a 3D Expo game |
| Cube geometry | 26 `BoxGeometry(0.95, 0.95, 0.95)` cubies | Slightly smaller than 1 unit to create a visible gap between pieces; color set via six `MeshStandardMaterial` instances per cubie (one per face) |
| Scene lighting | `<ambientLight intensity={0.6}>` + `<directionalLight position={[5, 5, 5]} intensity={1}>` | `MeshStandardMaterial` requires lights; without them the cube renders pitch black; ambient fills shadows, directional gives depth |
| Camera | Perspective camera at `position={[0, 0, 6]}`, `fov={45}`, orbit at fixed radius (no user zoom) | Fixed distance prevents the player from zooming the cube to invisible; FOV 45 gives a natural, undistorted cube view |
| 3D scene interaction | R3F built-in pointer events (`onPointerDown`, `onPointerMove`) on cubie meshes + invisible background mesh for orbit | Idiomatic R3F; avoids fighting R3F's own React Native pointer system; cubie meshes capture face-rotate gestures, background mesh captures orbit gestures |
| UI gesture layer | `react-native-reanimated` for HUD overlay animations | Drives timer counter and result screen transitions on the JS thread; does not touch the 3D canvas |
| Move lock | `isAnimating: boolean` in Zustand store | Ignores new gesture inputs while a face rotation is in progress; prevents rapid swipes from corrupting the Three.js scene graph during the 250ms animation phase |
| Haptic feedback | `expo-haptics` | Built into Expo SDK; available in both Expo Go and Development Builds; triggers a light impact on each face rotation commit |
| State management | Zustand | Zero boilerplate store; state readable outside React which matters for driving the render loop; no re-render overhead for the 3D canvas on rapid animation ticks |
| Persistence | None in MVP | Cube state lives in the Zustand store and resets on app close; no database needed for the core loop |
| Code quality | ESLint + Prettier via `expo lint` | Ships with Expo; one command configures both; runs in CI with no extra setup |
| Testing | Jest + React Native Testing Library | Default Expo test setup; Jest unit tests cover the cube state machine (54-sticker array, 18 legal moves, solved detection) with no renderer; RNTL tests cover UI components |
| CI | GitHub Actions | Free; `setup-node` + `npx expo install --check` + `jest` + `eslint` covers the full check pipeline without needing a device |
| Observability | Console logging in development; no crash reporting in MVP | Offline casual game with no backend; add Sentry or Crashlytics before publishing |
| Min SDK | Android 7.0 (API 24) via Expo SDK 51+ | Same coverage target as spec 0001; OpenGL ES 3.x is available on all API 24+ devices |
| Development target | Browser first (`npx expo start --web`) then Android Development Build | Browser development requires no USB or native toolchain; Development Build is compiled once for on-device testing |


## Architecture decisions

These are the decisions `/develop` would otherwise have to invent.

**Cube geometry, lighting, and face color representation**
26 cubie meshes are created at runtime in a `<Canvas>` (R3F). Each cubie is a `BoxGeometry(0.95, 0.95, 0.95)` — slightly smaller than one unit to create a visible gap between pieces. Each cubie has six `MeshStandardMaterial` instances, one per face (right=0, left=1, top=2, bottom=3, front=4, back=5). The sticker color for each face is driven from the Zustand store's 54-element color array (`CubeState`). The mapping from the flat `CubeState` array index to a (cubie index, face index) pair is computed once at startup and memoized. The scene includes an `<ambientLight intensity={0.6}>` and a `<directionalLight position={[5, 5, 5]} intensity={1}>` so `MeshStandardMaterial` renders correctly. No GLTF or OBJ files are loaded.

**Camera**
A perspective camera is positioned at `[0, 0, 6]` with `fov={45}`. The orbit radius is fixed (no user zoom): the player can rotate the camera's viewpoint around the cube by dragging the background mesh but cannot change the distance. FOV 45 avoids fisheye distortion at close range.

**Logical cube state vs Three.js scene (architecture constraint)**
The cube's logical state (a 54-element `number[]` of face color values, 0 to 5) lives entirely in the Zustand store. The R3F canvas is a pure function of that array: it reads `CubeState` and drives cubie materials, never writes back to the store. All business logic (state machine, move application, solved detection, timer, move count) is in plain TypeScript functions importable by Jest tests without a renderer.

**Face rotation mechanics and move lock**
A face rotation is a two-phase operation, gated by `isAnimating: boolean` in the Zustand store. New gestures are ignored while `isAnimating` is `true`. Phase 1 (animation): the 8 or 9 cubies in the rotating face are added to a temporary Three.js `Group`; `useFrame` rotates that group by 90 degrees over 250 ms with an ease-out curve, and `isAnimating` is set `true`. Phase 2 (commit): when the animation completes, the Zustand store applies the logical move to `CubeState`, the group is dissolved, cubies return to world positions, and `isAnimating` is set `false`. Scramble moves skip Phase 1 (instant, `isAnimating` is never set).

**Gesture to face mapping (R3F pointer events)**
Scene interactions use R3F's built-in declarative pointer events, not `@react-native-gesture-handler` on the canvas wrapper (which would fight R3F's own React Native pointer system). The 26 cubie meshes each handle `onPointerDown` and `onPointerMove` to detect face-rotate gestures; a large invisible `<mesh>` sphere (radius 4) sits behind the cube and handles `onPointerDown` and `onPointerMove` to capture orbit gestures. Disambiguation is implicit: a pointer down on a cubie triggers face mode; a pointer down that misses all cubies reaches the background sphere and triggers orbit mode. The drag vector in screen space maps to the closest legal rotation axis by dot product.



**Expo Go limitation**
`expo-gl` and `@react-three/fiber` require a Development Build because Expo Go does not bundle the native OpenGL module. During development, use `npx expo start --web` to preview in a browser where WebGL works natively. When you are ready to test on a physical Android phone, run `npx expo run:android` once over USB (requires Android SDK build tools, approximately 500 MB, downloadable via `sdkmanager` without installing the Android Studio IDE). After that first build, development is wireless.

**Saved state contract**
The Zustand store holds: `cubeState` (`number[]` of 54 values), `timerMs` (`number`, elapsed milliseconds), `moveCount` (`number`), `gamePhase` (`'SOLVED' | 'SCRAMBLING' | 'PLAYING'`). In the MVP, state is not persisted across app launches (no AsyncStorage). This is intentional and matches the original product plan.

## Consequences

**Positive**:
- No Android Studio, no emulator: browser development is the primary loop, a physical device is needed only for final device testing
- TypeScript and Zustand give a fully testable cube state machine with no renderer dependency
- `@react-three/fiber` is the best supported Three.js path for Expo and has active maintenance
- Expo managed workflow keeps native complexity hidden; `expo prebuild` generates it on demand if ever needed
- iOS support is straightforward via Expo once the Android experience is solid, with no code changes needed

**Negative and tradeoffs**:
- `expo-gl` requires a Development Build for on-device testing; Expo Go does not work for the 3D cube (basis: Expo GL documentation, confirmed in landscape check)
- Building the Development Build requires Android SDK build tools (~500 MB) even without Android Studio
- R3F on React Native does not support `OrbitControls` or other DOM-dependent Three.js helpers; custom gesture handling is required
- Simulators and emulators often fail on GL contexts; physical device is the reliable test target
- The Expo managed workflow adds a layer of abstraction over native; if a native module is needed that has no Expo config plugin, a bare workflow migration would be required (unlikely for this offline game)
- Zustand adds a dependency that must be understood by every contributor; it is small but is not zero

**Neutral**:
- The 26-cubie geometry approach generates the scene programmatically in TypeScript, same as the original Blender reference model's intent
- iOS is straightforward to add once Android is working, via Expo's existing cross-platform support
- The `blender/magic_cube_prototype.py` file from the old project is still a valid visual reference for face layout and color scheme; it is never loaded by the app

## Follow-up

- [ ] Run `/audit` after the scaffold is created to capture the real Expo and React Native conventions into root `AGENTS.md`
- [ ] Add crash reporting (Sentry or Crashlytics) before publishing the app to the Play Store
- [ ] When ready to test on device, install Android SDK build tools: `sdkmanager "build-tools;35.0.0" "platforms;android-35"` (does not require Android Studio IDE)
- [ ] Evaluate adding `AsyncStorage` when personal best statistics are scoped (Feature 7 follow-up)
- [ ] Add iOS to the Expo project config and test via `npx expo run:ios` when an iOS device or Mac is available

## Rationale

Reasoning and options considered: see [rationale.md](rationale.md).

## References

**Project sources** (verifiable, in this repo):
- `docs/scope/scope.md`: the product scope that defined offline only, no backend, and the feature set; the switch to Expo was driven by Android Studio being unavailable on the development machine
- Spec 0001 (`docs/specs/0001-stack-and-architecture/`): the superseded Android/Kotlin decision; kept as a reference for the original 3D rendering and state architecture decisions, which carry over conceptually

**Practices and standards**:
- Boring technology over new and exciting: Expo, React Native, and TypeScript are the established cross-platform mobile standard; `@react-three/fiber` is the documented Three.js path for React Native
- Separate logical state from the renderer: the cube state machine is a pure TypeScript module, testable without a device, same principle as the original spec
- Development build over Expo Go when native modules are required: Expo's documented recommendation for projects that use `expo-gl`

**Links** (web verified during the landscape check on 2026-09-19):
- Expo: Create a Project: https://docs.expo.dev/get-started/create-a-project/
- Expo GLView: https://docs.expo.dev/versions/latest/sdk/gl-view/
- @react-three/fiber React Native setup: https://docs.pmnd.rs/react-three-fiber/getting-started/installation#react-native
- react-native-wgpu (alternative, not chosen): https://github.com/wcandillon/react-native-wgpu
- Zustand docs: https://zustand.docs.pmnd.rs/
- Expo Router introduction: https://docs.expo.dev/router/introduction/
- Expo TypeScript guide: https://docs.expo.dev/guides/typescript/
