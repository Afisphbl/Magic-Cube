# Rationale: 0002 Stack and Architecture (Expo + React Native)

## Context

The Magic Cube project originally chose Android/Kotlin with SceneView and Google Filament (spec 0001). That decision was made when Android Studio was available. The development machine can no longer run Android Studio, so the entire native Android toolchain is no longer viable for development. A new stack is needed that:

1. Does not require Android Studio or a running Android emulator to develop
2. Still renders a real interactive 3D Rubik's Cube
3. Preserves the offline, no-backend, no-account product shape
4. Keeps the cube state machine testable without a device

Expo and React Native satisfy all four constraints. The critical secondary decision was the 3D rendering approach: React Native does not have a first-party 3D API, so a third-party library is required. That choice determines everything from file structure to gesture handling to animation.

The development strategy is also constrained: `expo-gl` (the OpenGL ES bridge Expo provides) requires a Development Build on a physical device, not Expo Go. Browser development (`npx expo start --web`) works for all WebGL-using code because browsers expose WebGL natively. The chosen workflow is: develop in the browser, compile a Development Build once for physical device testing.

## Options considered

### Option 1: Expo + @react-three/fiber + expo-gl (chosen)

Expo managed workflow with TypeScript, `@react-three/fiber` (the declarative Three.js wrapper), and `expo-gl` (the Expo OpenGL bridge). Three.js is the dominant 3D library for JavaScript and has first-class React bindings via R3F. The Expo managed workflow hides native complexity; `expo prebuild` generates the native project on demand.

**Pros**:
- Largest community for React Native 3D development
- `@react-three/fiber` is actively maintained by the pmndrs collective and has Expo-specific setup documentation
- Three.js knowledge is transferable; extensive public resources, examples, and community support
- Expo managed workflow means no manual native project management
- TypeScript support is first class

**Cons**:
- `expo-gl` requires a Development Build (not Expo Go) for on-device testing; adds a one-time USB setup step
- DOM-based Three.js helpers (OrbitControls and similar) do not work on React Native; custom gesture code is needed
- Simulators and emulators often fail on GL contexts; a physical device is the reliable test target
- Adding any additional native module not covered by Expo config plugins would require ejecting to bare workflow

### Option 2: Expo + Babylon.js + @babylonjs/react-native

Babylon.js is Microsoft's 3D engine with a React Native binding (`@babylonjs/react-native`). It is a full engine (scene graph, PBR materials, animation, physics) and has been used in production React Native apps.

**Pros**:
- Full 3D engine with built-in support for animation, materials, and physics
- PBR (physically based rendering) quality out of the box
- First-party Microsoft backing

**Cons**:
- The landscape check (September 2026) found `@babylonjs/react-native` has poor Expo managed workflow support and lags behind React Native's New Architecture (Fabric)
- Much smaller community than Three.js; far fewer React Native specific examples
- Heavier bundle than Three.js + R3F for a simple cube scene
- Documentation for Expo-specific setup is sparse

### Option 3: React Native WebView + Three.js in a web page

Run Three.js inside a `WebView` component (the embedded browser in React Native). The 3D scene lives in a regular HTML file; React Native communicates with it via `postMessage`.

**Pros**:
- Works in Expo Go with no native module needed
- Three.js browser support is perfect; no React Native adapter required

**Cons**:
- `postMessage` bridge for game events (moves, gestures, state sync) is slow and awkward; a Rubik's Cube game generates continuous gesture events that would serialize poorly over the bridge
- Debugging across the bridge is painful
- No integration with React Native gesture APIs; touch events must be handled inside the WebView
- Feels like two separate applications communicating through a pipe

### Option 4: Flat 2D face layout (no 3D)

Represent the cube as six flat colored grids (one per face) instead of a 3D scene. Works in Expo Go with no native module.

**Pros**:
- Zero native dependency; works in Expo Go immediately
- Simplest possible implementation
- Easily testable with React Native Testing Library

**Cons**:
- Not a 3D cube; the product description specifies a 3D interactive cube
- Player interaction model is fundamentally different: tapping a face on a 2D grid is not the same as rotating a 3D face
- Does not validate the 3D rendering approach that all later features depend on

## Rationale

Option 1 is the right choice for three specific reasons rooted in the constraints.

First, the community reality: Three.js with `@react-three/fiber` is the dominant React Native 3D path. The landscape check confirmed active maintenance, Expo-specific setup documentation, and a large body of community examples. Babylon.js React Native lags behind the current React Native architecture (Fabric) and has a much smaller Expo community; choosing it would mean fighting the current more than using it.

Second, the constraint fit: the project needs to develop without Android Studio, and browser development with `npx expo start --web` is a clean workaround for the `expo-gl` Development Build requirement. The one-time USB build step is unavoidable if the app must run on a physical Android device, but it does not require Android Studio IDE, only the Android SDK build tools.

Third, the architecture match: `@react-three/fiber`'s `useFrame` hook is the natural place to drive 60fps cube rotation animations inside the GL thread. The Zustand store's external state reading (via `useStore.getState()`) lets the render loop read cube state without triggering React re-renders on every animation frame, which is exactly what the original spec 0001 achieved with SceneView's composable design.

Options 3 and 4 were eliminated early: Option 3 because the bridge overhead would hurt gesture responsiveness, and Option 4 because it contradicts the core product requirement for a 3D interactive cube.

## Landscape scan (September 2026)

Summary from the landscape check subagent run during this design session:

- **Expo project type**: Managed workflow with CNG (Continuous Native Generation) is the current Expo recommendation for new projects. Traditional "bare" is considered legacy.
- **@react-three/fiber**: Confirmed as the recommended declarative Three.js path for Expo. The R3F native setup uses `@react-three/fiber/native`. Note: DOM controls (OrbitControls) must be replaced with gesture handler equivalents on React Native.
- **expo-gl**: Confirmed required for R3F on a physical device. Simulators often fail on GL; physical device is the reliable target.
- **Zustand**: Confirmed as the recommended state library for high-frequency game state in React Native. Transient subscriptions (selector hooks or `getState()`) avoid re-rendering the 3D canvas on animation ticks.
- **TypeScript**: Confirmed as the default in all `create-expo-app` templates since Expo SDK 49/50.
- **Expo Router**: Confirmed as the `create-expo-app` default. For a single-screen game, overlays are components inside `app/index.tsx`, not separate routes.

## References

**Project sources**:
- `docs/scope/scope.md`: the switch to Expo was driven by Android Studio being unavailable; scope updated in the same session as this spec
- Spec 0001 (`docs/specs/0001-stack-and-architecture/`): the superseded decision; its state architecture (logical state separate from renderer) carries over

**Practices and standards**:
- Boring technology over new: Three.js is the proven 3D library for JavaScript; Expo is the proven cross-platform mobile framework
- Logical state separate from the renderer: the cube state machine is pure TypeScript, testable without a device
- Development Build over Expo Go when native modules are required: Expo's documented recommendation

**Links** (web verified during the landscape check on 2026-09-19):
- Expo: Create a Project: https://docs.expo.dev/get-started/create-a-project/
- Expo GLView: https://docs.expo.dev/versions/latest/sdk/gl-view/
- @react-three/fiber React Native setup: https://docs.pmnd.rs/react-three-fiber/getting-started/installation#react-native
- Zustand docs: https://zustand.docs.pmnd.rs/
- Expo Router introduction: https://docs.expo.dev/router/introduction/
- Expo TypeScript guide: https://docs.expo.dev/guides/typescript/
