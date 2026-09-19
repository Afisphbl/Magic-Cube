# Magic Cube — AGENTS.md

AI agent context for the Magic Cube project. Read this before touching any code.
Update it only via `/sync` after a feature lands or `/audit` after the first scaffold build.

## Project

A native Android Rubik's Cube puzzle game for casual players.
Offline only. No account. No backend. No ads.
Source of truth for the product plan: `docs/scope/scope.md`.

## Stack

| Layer | Choice | Version / notes |
|---|---|---|
| Language | Kotlin (JVM) | 2.0.x |
| UI framework | Jetpack Compose | via Compose BOM 2024.12.01 |
| 3D rendering | SceneView + Google Filament | 4.37.0 (Maven Central) |
| State | ViewModel + StateFlow + SavedStateHandle | Jetpack lifecycle 2.8.x |
| Navigation | Jetpack Navigation for Compose | 2.8.x |
| Persistence | None (SavedStateHandle only) | No Room in MVP |
| Build system | Gradle with Kotlin DSL | `build.gradle.kts` everywhere |
| Min SDK | Android 7.0 | API 24 |
| Target SDK | Android 35 | |
| Code quality | ktlint | via Gradle plugin; run `./gradlew ktlintCheck` |
| Testing | JUnit 5 + Robolectric | `useJUnitPlatform()` in app module |
| CI | GitHub Actions | `.github/workflows/android.yml` |

Spec: `docs/specs/0001-stack-and-architecture/index.md`

## Architecture

**One Activity, one NavHost.**
`MainActivity` → `setContent { MagicCubeApp() }` → `NavHost` with `game` route.

**Logical cube state is fully separated from the 3D renderer.**
- The cube state (54-element `IntArray` of face colors, values 0–5) lives in a `ViewModel`.
- The SceneView composable is a pure function of that array: reads state, updates node materials, never writes back.
- All business logic (cube state machine, timer, move count) is testable with JUnit 5 and no device.

**Saved state contract (process death survival):**
`SavedStateHandle` keys: `"cube_state"` (`IntArray`), `"timer_ms"` (`Long`), `"move_count"` (`Int`), `"game_phase"` (`String`: `SOLVED` | `SCRAMBLING` | `PLAYING`).

**3D asset pipeline:**
Cube geometry is generated programmatically in Kotlin using SceneView's node and mesh API.
26 cubie meshes at runtime. No GLTF or OBJ files.
`blender/magic_cube_prototype.py` is a visual reference only; it is never loaded by the app.

**Gesture model:**
`pointerInput` on the SceneView composable → ray cast on touch down to identify cubie face →
drag vector in screen space mapped to closest legal face rotation axis on drag.
All scene graph mutations on the main thread (SceneView requirement).

**Animation:**
`Animatable<Float>` per in-flight face rotation. `LaunchedEffect` maps angle to SceneView node quaternion.
Duration 250 ms with `FastOutSlowInEasing`. Scramble moves snap (no animation) for speed.

**DI:** Manual constructor injection. No DI framework.

## Directory layout

```
MagicCube/
  app/
    src/
      main/
        java/com/example/magiccube/
          MainActivity.kt
          ui/
            MagicCubeApp.kt          ← NavHost root
            game/
              GameScreen.kt          ← game screen composable (placeholder → real in Feature 5)
              GameViewModel.kt       ← (added in Feature 3 / Feature 5)
        res/
          values/
            themes.xml
            colors.xml
            strings.xml
        AndroidManifest.xml
      test/
        java/com/example/magiccube/
          ExampleUnitTest.kt
    build.gradle.kts
  blender/
    magic_cube_prototype.py          ← visual reference only
  docs/
    scope/scope.md
    specs/
      0001-stack-and-architecture/
        index.md
        rationale.md
  .github/
    workflows/
      android.yml
  settings.gradle.kts
  build.gradle.kts
  gradle.properties
  gradle/
    libs.versions.toml
  AGENTS.md                          ← this file
```

## Build commands

```bash
# Assemble debug APK
./gradlew assembleDebug

# Run unit tests
./gradlew test

# Lint check (ktlint)
./gradlew ktlintCheck

# Auto-fix lint
./gradlew ktlintFormat

# Install on connected device / emulator
./gradlew installDebug
```

Gradle wrapper (`gradlew`) is the canonical entry point. Never call `gradle` directly.

## Code conventions

- **Kotlin style**: follow the official Kotlin style guide, enforced by ktlint.
- **Package root**: `com.example.magiccube`
- **No hardcoded strings** in composables — use `stringResource` + `strings.xml`.
- **No 3D code outside the SceneView composable.** The ViewModel must not import SceneView.
- **ViewModel per screen**, not shared across screens.
- **State hoisting**: state lives in the ViewModel, composables are stateless functions of it.
- **Coroutines**: use `viewModelScope` for anything async in the ViewModel.
- **`IntArray` face colors**: values 0–5 map to White, Yellow, Red, Orange, Blue, Green (standard Rubik's colors).

## Git

integration: off
(No active git branching by agents yet. Run `/sync` after each feature to update AGENTS.md.)

## Agent skills

Skills installed for this project (`.agents/skills/`):

- `/architect` — design a feature, write a spec. Path: `.agents/skills/architect/`
- `/develop` — build from a spec. Path: `.agents/skills/develop/`
- `/check` — verify or review. Path: `.agents/skills/check/`
- `/test` — write tests. Path: `.agents/skills/test/`
- `/scope` — manage the product plan. Path: `.agents/skills/scope/`
- `/sync` — update AGENTS.md after a feature lands. Path: `.agents/skills/sync/`
- `/audit` — bootstrap AI context for an area. Path: `.agents/skills/audit/`
- `/debug` — root-cause and fix a bug. Path: `.agents/skills/debug/`
- `/document` — write PR/changelog/release notes. Path: `.agents/skills/document/`

## Specs

| # | Feature | Status | Spec |
|---|---|---|---|
| 0001 | Stack and architecture | Accepted | `docs/specs/0001-stack-and-architecture/index.md` |

## Open follow-ups (from spec 0001)

- Run `/audit` after the scaffold is verified to install ktlint and GitHub Actions properly and reconcile this AGENTS.md with the real project layout.
- Add Crashlytics (Firebase) only when publishing; it requires `google-services.json`.
- Revisit detekt if code quality signals worsen.
- Evaluate Kotlin Multiplatform (KMP) when iOS support is scoped.
