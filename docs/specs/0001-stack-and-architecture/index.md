# 0001. Stack and Architecture

**Date**: 2026-09-19
**Status**: Superseded by [0002](../0002-stack-and-architecture/index.md)

## Summary

The Magic Cube Android app uses Kotlin (JVM) with Jetpack Compose for the UI shell and SceneView (backed by Google Filament) for 3D rendering. SceneView is a Compose-native 3D scene library maintained by Google that lets you treat 3D objects as Composables, with no C++ or raw OpenGL code needed. State is managed with Jetpack ViewModel plus StateFlow, the standard Android pattern. The first target is Android (minimum SDK 24, covering 97%+ of active devices) with iOS deferred.

## Decision

**Chosen option**: Option 1: Kotlin (JVM) + Jetpack Compose + SceneView (Filament)

We build a native Android app in Kotlin. The UI shell (menus, timer, scramble button, result screen) is built with Jetpack Compose. The 3D cube is rendered inside a SceneView composable backed by Google Filament (a PBR renderer that runs on top of Vulkan or OpenGL ES). Game state (cube state, timer, move count) is held in a ViewModel backed by `SavedStateHandle` (so the cube survives process death, not just screen rotation) and exposed as StateFlow collected by Compose. There is no database in the MVP: no solve statistics, no history; the cube state is serialized only to the system saved state bundle.

**Implementation skills**: none installed yet (no community skills configured for this project; see Follow-up)

## Proposed stack

| Layer | Choice | Reason |
|---|---|---|
| Language | Kotlin (JVM) | Standard Android language; full Jetpack, SceneView, and Filament bindings |
| UI framework | Jetpack Compose | Modern declarative Android UI; SceneView integrates as a Composable natively |
| 3D rendering | SceneView + Google Filament | Compose-native, pure Kotlin, PBR quality, no C++ needed; Google maintained |
| State management | ViewModel + StateFlow + SavedStateHandle | Survives screen rotation (StateFlow) and process death (SavedStateHandle); idiomatic Compose state |
| Persistence | None (SavedStateHandle only) | No database in MVP; cube state is serialized to the system saved state bundle; Room deferred to the stats feature |
| Build system | Gradle with Kotlin DSL (build.gradle.kts) | Standard Android build, Kotlin DSL for type safe build scripts |
| Min SDK | Android 7.0 (API 24) | 97%+ of active devices; Filament and OpenGL ES 3.x both supported |
| Code quality | ktlint | Kotlin linter, fast Gradle integration, enforces Kotlin style guide |
| Testing | JUnit 5 + Robolectric | JUnit 5 for pure Kotlin unit tests (cube state machine); Robolectric for Android context tests without a device |
| CI | GitHub Actions | Free for this project; `setup-java` + Gradle build actions cover Android builds out of the box |
| Observability | Android Logcat + Crashlytics (deferred) | Logcat covers development; Crashlytics added when publishing |
| Navigation | Jetpack Navigation for Compose | Standard single Activity navigation across game screen, result screen, and deferred settings |
| DI | Manual DI (constructor injection) | No DI framework needed for a small offline app with no backend services |

## Architecture decisions

These are the decisions `/develop` would otherwise have to invent. They are settled here so the builder has a clear answer for each one.

**3D asset pipeline (how the cube geometry is created)**
Cube geometry is generated programmatically in Kotlin using SceneView's node and mesh API: 26 cubie meshes created at runtime, each with 6 face materials assigned by position. No external GLTF or OBJ files. The Blender prototype (`blender/magic_cube_prototype.py`) is a visual reference only and not loaded by the app.

**Gesture to 3D face mapping (how a swipe becomes a face rotation)**
Touch handling uses Compose `pointerInput` on the SceneView composable. On touch down, cast a ray (SceneView node hit testing) to identify which cubie face was touched. On drag, read the drag vector in screen space and map it to the closest legal face rotation axis: the face whose normal has the smallest angle to the drag direction wins. Rotation direction follows the drag sign. This runs entirely on the main thread since SceneView scene graph mutations must happen there.

**Animation mechanism (how face rotation is animated)**
Face rotation animations use Jetpack Compose `Animatable<Float>` values (one per in-flight face rotation, normally at most one at a time). The `Animatable` drives the rotation angle; a `LaunchedEffect` in the composable maps each frame's angle value to a SceneView node quaternion transform. This keeps the animation loop inside Compose and avoids a separate Filament animation system. Duration: 250ms with `FastOutSlowInEasing`. Snap (no animation) is used for scramble moves to keep the scramble fast.

**Logical cube state vs. rendering nodes (architecture constraint)**
The cube's logical state (a 54-element integer array of face colors) is owned entirely by the ViewModel and is independent of SceneView. The SceneView composable is a pure function of that array: it reads state and updates node materials, never writes back to the ViewModel. This allows JUnit 5 tests to test the full cube state machine, solver, and timer without a 3D renderer. No 3D code lives outside the composable.

**Saved state contract (what is serialized to SavedStateHandle)**
The ViewModel serializes the cube state as an `IntArray` of 54 face color integers (values 0 to 5) keyed as `"cube_state"` in `SavedStateHandle`. Timer elapsed milliseconds (`Long`), move count (`Int`), and game phase (`String` enum: `SOLVED`, `SCRAMBLING`, `PLAYING`) are also saved. This is sufficient to restore the full in-progress game after process death.

## Consequences

**Positive**:
- Pure Kotlin throughout: no C++, no JavaScript, no Dart; one language to know
- Compose and SceneView are both actively maintained by Google and the Android community
- ViewModel + StateFlow + SavedStateHandle survives both screen rotation and process death; players never lose an in-progress solve because they switched apps
- Filament gives PBR (physically based rendering) quality without writing shader code
- Logical cube state is fully separated from the 3D render layer; the state machine is unit testable without a device or emulator
- GitHub Actions is free and runs the standard Android Gradle build with no custom setup

**Negative and tradeoffs**:
- SceneView is a community wrapper around Filament; its API surface is smaller and less documented than Unity or raw OpenGL ES; keep cube visuals within standard PBR materials to avoid needing to drop down to raw Filament APIs
- Filament adds APK size (roughly 8 to 12 MB native library); acceptable for a game but worth noting
- No database means no solve history survives an uninstall; this is intentional for MVP
- ktlint only (no detekt): code smell detection is not covered; add detekt if the codebase grows and quality signals worsen
- Manual DI means wiring the ViewModel and its dependencies by hand; acceptable for a small offline app

**Neutral**:
- iOS support is explicitly deferred; when it comes up, Kotlin Multiplatform (KMP) is the natural next step for sharing the cube state machine and timer logic while keeping native UIs
- The Blender prototype (`blender/magic_cube_prototype.py`) uses the same color scheme and face-rotation animation model as the planned Filament scene, so it is a valid visual reference for the 3D interaction design

## Follow-up

- [ ] Run /audit after the scaffold is created to capture the real stack conventions into root AGENTS.md and install ktlint and GitHub Actions
- [ ] Add Crashlytics (Firebase) when the app is ready for production publishing; do not add it before, as it requires a google-services.json setup
- [ ] Revisit detekt if code quality signals worsen as the codebase grows
- [ ] When iOS support is scoped, evaluate Kotlin Multiplatform (KMP) to share the cube state machine and timer across platforms

## Rationale

Reasoning and options considered: see [rationale.md](rationale.md).

## References

**Project sources**:
- docs/scope/scope.md: the product scope that defined Android-native first, offline only, no monetization, and the feature set

**Practices and standards**:
- Foundations before features: decide the stack before writing any feature code, because a wrong rendering choice is the most expensive thing to redo in a 3D game
- Boring technology over new and exciting: Kotlin + Compose is the established Android standard; SceneView/Filament are Google-maintained; no experimental dependencies

**Links** (web verified during the landscape check on 2026-09-19):
- Android OpenGL ES developer guide: https://developer.android.com/develop/ui/views/graphics/opengl
- Google Filament: https://google.github.io/filament/
- SceneView for Android (GitHub): https://github.com/SceneView/sceneview-android
- Godot 4: https://godotengine.org/
- libGDX: https://libgdx.com/
