# Scope: Magic Cube

A mobile Rubik's Cube puzzle game for casual players of all ages, built with Expo and React Native. The player sees a 3D cube, scrambles it, and solves it by rotating faces. Offline, no account needed, just the game working locally. Developed in the browser with `npx expo start --web`; tested on a physical Android phone via a Development Build.

**Build approach:** Tracer Bullet (prove the render, cube state, and interaction loop end to end in one real working slice, then thicken each segment).
**Workflow:** Beta (after `/develop`, run `/check verify` then `/test`). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack and architecture | Foundation | done |
| 2 | Coding standards and tooling | Foundation | done |
| 3 | Cube data model and state machine | Foundation | done |
| 4 | Design system and UI foundation | Foundation | done |
| 5 | 3D cube renderer and interaction | Slice 1 | planned |
| 6 | Scramble engine | Slice 2 | planned |
| 7 | Solve timer and move counter | Slice 3 | planned |

## Foundations

### 1. Stack and architecture · done
Decide the Expo and React Native stack and scaffold a runnable project so every later slice builds on real structure. Rendering: Three.js via `@react-three/fiber` and `expo-gl`. No Android Studio required. Develop in the browser; compile a Development Build once for on-device testing.
**Done when:** the stack is recorded in a spec, the empty scaffold boots in the browser and on a real Android phone via a Development Build, and the build passes.
- [x] Decide the stack (spec): `/architect stack and architecture`
  spec [0002](../specs/0002-stack-and-architecture/index.md) · code in `app/`, `src/`
- [x] Build it: `/develop stack and architecture`
  - [x] Scaffold the Expo managed workflow project with TypeScript and Expo Router
  - [x] Add @react-three/fiber, expo-gl, and render a placeholder cube in the browser
  - [x] Add Zustand store with the 54-element cube state shape
  - [x] Add gesture handler and reanimated; wire orbit and face-rotate gestures
  - [x] Confirm Development Build boots on a physical Android device
- [x] Verify it: `/check verify stack and architecture`
- [x] Test it: `/test stack and architecture`

### 2. Coding standards and tooling · done
Capture coding conventions, then install lint, format, and type checking enforcement from the real scaffolded project.
**Done when:** root `AGENTS.md` reflects the real Expo and React Native stack, and lint and format run clean.
- [x] Capture conventions and tooling choices: `/audit`
- [x] Install the tooling: `/develop tooling`
- [x] Check it runs clean: `/test`

### 3. Cube data model and state machine · done
Core data structure representing a 3x3 Rubik's Cube: the 54 sticker state, the 18 legal face moves (U, D, L, R, F, B and their inverses and double turns), and the solved state detection. This is the costliest thing to get wrong; a bad model breaks every feature built on it.
**Done when:** any sequence of moves applied to a solved cube produces the correct resulting state; solved detection is correct; unit tests cover every move and solved check.
- [x] Design it (spec): `/architect cube data model and state machine`
  spec [0003](../specs/0003-cube-data-model-and-state-machine/index.md) · code in `src/logic/cubeMoves.ts`, `src/store/useCubeStore.ts`
- [x] Build it: `/develop cube data model and state machine`
  - [x] Pure logic: color conservation validator, animation parameters, and game phase transitions (AC-1, AC-4, AC-6)
  - [x] Store state: move history, scramble queue, and single move input buffer (AC-4, AC-5, AC-7, AC-8)
  - [x] Execution mechanics: direct move actions and atomic animation chaining (AC-5, AC-8)
- [x] Verify it: `/check verify cube data model and state machine`
- [x] Test it: `/test cube data model and state machine`

### 4. Design system and UI foundation · done
Visual language, colors, typography, spacing, and base components so every screen feels cohesive. For a puzzle game this includes the color palette for the six cube face colors, the background, and button styles.
**Done when:** a `design.md` covers colors, typography, spacing, and cube face palette; base components handle the primary button and screen layout and are accessible.
- [x] Design it (spec): `/architect design system and UI foundation`
  spec [0004](../specs/0004-design-system-and-ui-foundation/index.md) · code in `src/theme/`, `src/components/ui/`
- [x] Build it: `/develop design system and UI foundation`
  - [x] Package setup and design tokens: colors, typography, spacing, and opacity (AC-1, AC-2, AC-3)
  - [x] Base components: ThemedText, ThemedButton, ThemedCard, and StatBadge (AC-4, AC-5, AC-6, AC-7)
  - [x] Screen layout and cube integration: ScreenContainer and useCubeStore face colors (AC-1, AC-8)
  - [x] Living documentation: design.md with swatches, typography scale, and component catalog (AC-9)
- [x] Verify it: `/check verify design system and UI foundation`
- [x] Test it: `/test design system and UI foundation`

## Slice 1: Core loop

### 5. 3D cube renderer and interaction · needs a decision
Render the solved 3x3 cube in 3D on screen using Three.js via react-three-fiber and expo-gl. The player can rotate the whole cube with a swipe gesture to inspect it from any angle, and tap or swipe a face to rotate that face by 90 degrees. This is the walking skeleton: the one real working thread proving the stack connects. No scramble, no timer yet.
**Done when:** a solved cube renders in 3D; whole-cube rotation via swipe works on a real Android phone; a face rotation move applies correctly and the sticker colors update; the cube state after any sequence of moves matches the data model.
- [ ] Design it (spec): `/architect 3D cube renderer and interaction`

## Slice 2: Scramble

### 6. Scramble engine
Generate a valid random scramble (a sequence of moves that produces a solvable, non-trivially scrambled cube) and animate the cube through those moves so the player sees it scramble. A Scramble button triggers it from the solved state or mid solve.
**Done when:** tapping Scramble applies a random sequence of at least 20 moves with smooth animation; the resulting state is always solvable; tapping Scramble again re-scrambles; the move sequence is visible to the player.
- [ ] Design it (spec): `/architect scramble engine`

## Slice 3: Timer and result

### 7. Solve timer and move counter
Start timing when the player makes the first move after a scramble; stop and show the result when the cube reaches the solved state. Display elapsed time and move count during play and on the result screen.
**Done when:** the timer starts on the first move, stops automatically on solve, and the result screen shows time and move count; solved state detection is reliable; the player can then scramble again.
- [ ] Design it (spec): `/architect solve timer and move counter`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest.
- **Undo and redo moves**: step back through move history · needs a decision
- **Step-by-step hints**: show the player the next move toward the solution · needs a decision
- **Personal best statistics**: track fastest solve and fewest moves · needs a decision
- **Settings screen**: color themes, animation speed · needs a decision
- **iOS support**: Expo makes this straightforward once Android works · needs a decision
- **2x2 and 4x4 cubes**: additional cube sizes · needs a decision

## Dropped
Removed from scope; kept for history.
- **Stack and architecture (Android/Kotlin, spec 0001)** · dropped: switched to Expo and React Native; Android Studio not available on the development machine. The old spec at `docs/specs/0001-stack-and-architecture/` is kept as a reference only.

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | `/architect` at spec capture | `Design it` ticked; spec linked; `Build it: /develop <feature>` + 2 to 5 milestones; `Verify it` and `Test it` closing boxes |
| `in-progress` (building) | `/develop` | milestone sub-boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` and milestones ticked; `Verify it` ticked |
| `done` | you, when you decide it is; `/sync` reconciles | Beta: after `/test` is the suggested point to call it done |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first. The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Workflow** (header): Beta = `/check verify` then `/test` after each feature build.
- **Pointer line** (`spec <n> · code in <path>`): added by `/architect` and `/develop` respectively.
