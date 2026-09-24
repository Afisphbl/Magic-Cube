# 0008. EAS Deployment and Gameplay Controls

**Date**: 2026-09-24
**Status**: Accepted

## Summary

This specification configures Expo Application Services deployment metadata and modernizes the main user interface for the Magic Cube puzzle game. It connects the application to EAS project ID 1400895d-0d5f-43ce-b82c-a40040de8a5b, wires assets from the assets directory for app icons and splash displays, and sets up preview builds producing direct Android packages (APK files). It replaces the previous multi button controls on the main screen with two focused actions, Start and Record. Tapping Start triggers a rapid 20 move scramble sequence and begins the solve timer immediately upon shuffle completion, while Record presents a modal leaderboard showing the player top five fastest solves stored persistently on the device.

## Requirements

**User stories**:
* As a player, I want a clean two button interface with Start and Record so that I can focus entirely on playing without screen clutter.
* As a speedcuber, I want the cube to shuffle rapidly and the timer to start counting the moment the shuffle completes so that my solve time is tracked accurately without animation penalties.
* As a player, I want the game to save my top five fastest solves on my device so that I can review my personal best records anytime.
* As a player, I want to tap Record to view my top five best times with rank, move count, and turns per second in an elegant modal card.
* As a developer, I want EAS configuration and project assets wired properly so that the app builds cleanly into a standalone Android APK via EAS.

**Acceptance criteria**:
* **AC-1**: EAS project identification is configured in `app.json` under `extra.eas.projectId` set to `"1400895d-0d5f-43ce-b82c-a40040de8a5b"`.
* **AC-2**: Asset metadata in `app.json` references files in `assets/`, setting `icon` to `./assets/App-icon.jpg`, `splash` to `./assets/splash-screen.jpg` with dark background `#070F1E` and contain resize mode, and `android.adaptiveIcon` with `./assets/Android-adaptive-icon.jpg` and `./assets/Adaptive-Background.jpg`.
* **AC-3**: EAS build configuration in `eas.json` defines an Android preview profile with `developmentClient: false`, `distribution: "internal"`, and `android.buildType: "apk"` enabling direct local installation on physical Android phones.
* **AC-4**: Main screen overlay in `GameOverlay` removes obsolete orientation toggle buttons, reset view buttons, and separate scramble buttons, replacing the bottom control area with a clean two button layout containing `Start` and `Record`.
* **AC-5**: Tapping Start triggers a rapid 20 move animated cube shuffle at 50ms per turn. While shuffling, further Start taps are locked out. If tapped mid solve, it immediately resets the current attempt and initiates a new shuffle. The exact moment the final shuffle move resolves, `gamePhase` transitions to `PLAYING`, the timer activates with `timerStatus` set to `RUNNING` and `timerMs` starting cleanly at zero, and `moveCount` resets to zero.
* **AC-6**: When a solve completes with `isCubeSolved` returning true, the system evaluates the final solve time against the top five records, inserts qualifying solves in ascending time order, prunes the list to at most five items, and saves the list to device storage using `@react-native-async-storage/async-storage`.
* **AC-7**: Tapping Record opens a dedicated `RecordsModal` overlay displaying the top five fastest solves with medal or numeric rank, formatted solve time, move count, turns per second, and completion date. When no records exist, it displays title 'No Solves Yet' and subtitle 'Tap Start to complete your first solve and set a record.'
* **AC-8**: Device storage loading executes during app initialization, populating the store with existing records from `@magic_cube_top_records` and recovering gracefully if storage is empty or unavailable.

## Decision

**Chosen option**: Option 1: Direct EAS preview profile with asset wiring in `app.json`, streamlined Start and Record bottom HUD, rapid 20 move shuffle with post animation zero latency timer start, and local AsyncStorage backed top five leaderboard modal.

**Implementation skills**: none

## Rationale

Reasoning and options: see rationale.md

## Feature design

**Data model sketch**:

| Entity | Primary Key / Identifier | Fields and Types | Relationships | Invariants and Rules |
|---|---|---|---|---|
| TopRecord | id: string (UUID) | id: string, timeMs: number, moveCount: number, turnsPerSecond: number, scrambleNotation: string, completedAt: number | Element of TopRecordsList | timeMs is greater than zero. moveCount is greater than or equal to one. turnsPerSecond equals moveCount divided by timeMs in seconds rounded to two decimal places. |
| TopRecordsList | key: string (`@magic_cube_top_records`) | records: TopRecord[] | Persisted in AsyncStorage, loaded into CubeStoreState | Length is between zero and five inclusive. Always sorted ascending by timeMs. New records that beat existing entries replace slower times. |
| EASConfig | file (`eas.json`) | cli: object, build: object | Root deployment configuration | Contains preview profile with developmentClient false and android buildType apk. |

**State transitions**:

* START GAME TRIGGER:
  Player taps Start -> if solve is active, resets current solve -> locks Start button during animation -> executes 20 move shuffle animation (50ms per move) -> when final move resolves, transitions `gamePhase = 'PLAYING'`, `timerStatus = 'RUNNING'`, `solveStartTime = Date.now()`, `moveCount = 0` -> HUD timer begins ticking immediately from zero.
* SOLVE COMPLETION AND RECORD EVALUATION:
  Last move animation finishes -> `isCubeSolved` returns true -> `timerStatus = 'STOPPED'`, `solveEndTime = Date.now()` -> constructs `SolveRecord` -> evaluates against `topRecords` -> if qualified, updates `topRecords` in store and persists to AsyncStorage -> triggers celebratory victory haptic and opens victory card.
* RECORDS MODAL DISPLAY:
  Player taps Record -> `isRecordsModalVisible = true` -> `RecordsModal` renders over scene with spring animation -> Player reviews records and taps Close or outside backdrop -> `isRecordsModalVisible = false`.

**API surface**:

Store actions added or updated in `src/store/useCubeStore.ts`:
| Action / Selector | Parameters | Return | Description |
|---|---|---|---|
| startSolveGame | none | void | Aborts any active solve, triggers 20 move rapid shuffle, then transitions to PLAYING with running timer upon completion |
| openRecordsModal | none | void | Sets isRecordsModalVisible to true |
| closeRecordsModal | none | void | Sets isRecordsModalVisible to false |
| loadTopRecords | none | Promise<void> | Loads saved records from AsyncStorage into state on startup |
| recordSolveAttempt | record: SolveRecord | Promise<boolean> | Evaluates record against top five, updates state, and persists to AsyncStorage |

**Value sourcing**:

| Action or Component | Value produced or displayed | Source |
|---|---|---|
| RecordsModal row | Rank position (1 to 5) | Array index plus one from sorted topRecords |
| RecordsModal row | Solve time text | Formatted from `record.timeMs` using `formatTimer` |
| RecordsModal row | Move count badge | Value from `record.moveCount` |
| RecordsModal row | Turns per second badge | Value from `record.turnsPerSecond` formatted to two decimal places |
| RecordsModal row | Completion date text | Derived from `record.completedAt` using local date formatter |
| RecordsModal empty | Title and subtitle text | Static strings: 'No Solves Yet' and 'Tap Start to complete your first solve and set a record.' |
| Start button tap | Scramble moves sequence | Exactly 20 moves generated via `generateScramble(20)` in `src/logic/scramble.ts` |
| Start button tap | Timer start timestamp | Generated via `Date.now()` the instant the final shuffle move resolves |
| EAS Build | Project identifier | Extracted from `app.json` `extra.eas.projectId` |

**Key invariants**:
* Scramble length is fixed at 20 moves.
* The top records collection contains at most five records at all times.
* Records are strictly sorted in ascending order of `timeMs` (fastest solve first).
* Ties in `timeMs` break in favor of fewer `moveCount`, then earlier `completedAt`.
* Tapping Start while a scramble animation is in progress is ignored to prevent animation collisions.
* Tapping Start while a solve is running aborts the current attempt cleanly and begins a fresh shuffle.
* The solve timer begins only when the last shuffle move finishes, ensuring zero animation latency penalizes player solve times.
* Corrupted or missing storage data defaults safely to an empty array without crashing the app.

**Security model**:
* All data is stored purely on the local device via AsyncStorage without network transmission.
* No personal identifying information or credentials are saved.
* EAS project configuration connects to the specified project without exposing secrets.

**Configuration required**:
* `app.json`:
  * `extra.eas.projectId`: `"1400895d-0d5f-43ce-b82c-a40040de8a5b"`
  * `icon`: `"./assets/App-icon.jpg"`
  * `splash.image`: `"./assets/splash-screen.jpg"`
  * `splash.resizeMode`: `"contain"`
  * `splash.backgroundColor`: `"#070F1E"`
  * `android.adaptiveIcon.foregroundImage`: `"./assets/Android-adaptive-icon.jpg"`
  * `android.adaptiveIcon.backgroundImage`: `"./assets/Adaptive-Background.jpg"`
* `eas.json`:
  * Android preview profile configured with `buildType: "apk"` and `developmentClient: false`.

**Critical test scenarios**:
* Post shuffle timer activation: tapping Start initiates 20 turns, finishes animation, and immediately starts the timer at 0.00 without latency penalties, verifies **AC-5**.
* Mid solve Start button interruption: tapping Start during an active solve resets the clock and triggers a new scramble, verifies **AC-5**.
* Top five record qualification: solving in 15 seconds when records are [10s, 20s, 30s] places the new solve in position 2 and maintains a maximum length of five, verifies **AC-6**.
* Sixth record exclusion: adding a sixth slower solve when five faster solves exist leaves the top five unchanged, verifies **AC-6**.
* Storage persistence round trip: records written to AsyncStorage reload identically across simulated store reloads, verifies **AC-8**.
* Record modal rendering: tapping Record displays all stored records with correct ranks and formatted times, verifies **AC-7**.
* Empty records state: opening Record modal with zero recorded solves displays 'No Solves Yet' title and explanatory subtitle, verifies **AC-7**.
* Button bar replacement: verifying that old view and reset buttons are removed and only Start and Record are visible in the HUD, verifies **AC-4**.

## Build plan

* [x] 1. Update `app.json` with EAS project ID `1400895d-0d5f-43ce-b82c-a40040de8a5b` and wire icons and splash screen from `assets/`, satisfies **AC-1**, **AC-2**
* [x] 2. Create `eas.json` with Android preview profile configured for standalone APK generation, satisfies **AC-3**
* [x] 3. Install `@react-native-async-storage/async-storage` and create record storage logic with 5 item ranking, tie breaking, and pruning functions in `src/logic/records.ts`, satisfies **AC-6**, **AC-8**
* [x] 4. Extend Zustand store `src/store/useCubeStore.ts` with top records state, `startSolveGame` rapid 20 move action with post shuffle timer activation, and solve completion persistence hooks, satisfies **AC-5**, **AC-6**, **AC-8**
* [x] 5. Create `RecordsModal` component in `src/components/RecordsModal.tsx` styled to the dark neon theme with trophy icons, rank badges, empty state card, and close button, satisfies **AC-7**
* [x] 6. Refactor `GameOverlay` in `src/components/GameOverlay.tsx` to display the streamlined Start and Record bottom bar, removing obsolete view and reset buttons, satisfies **AC-4**, **AC-5**, **AC-7**
* [x] 7. Write unit tests in `test/records.test.mjs` verifying top five insertion, sorting, storage resilience, empty state copy, and post shuffle timer activation, satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**

## Consequences

**Positive**:
* Greatly simplified player experience with intuitive Start and Record buttons replacing cluttered controls.
* Immediate timer start following rapid shuffle gives fair speedcubing feedback with zero animation time penalty.
* Long term player motivation through personal top five record tracking that persists across game launches.
* Clean EAS build readiness with verified assets and direct APK creation profile.

**Negative / tradeoffs**:
* Free orientation presets (Yellow Top / White Top and Reset View buttons) are removed from the bottom HUD; players now rotate view freely via 3D touch gestures on the background.
* Storing only top five records means intermediate solves that do not beat personal bests are not retained.

**Neutral**:
* Adds one new native dependency (`@react-native-async-storage/async-storage`), which is standard across Expo applications and requires no custom native code.

## Follow-up

- [ ] Run `npx expo install @react-native-async-storage/async-storage` during implementation
- [ ] Confirm EAS CLI build command `eas build -p android --profile preview` generates the test APK successfully

## Migration plan

**Strategy**: Direct replacement

**Phases**:
1. Configuration phase: Update `app.json` and generate `eas.json`.
2. Logic and storage phase: Install AsyncStorage dependency, implement record ranking helper, and update Zustand store.
3. Component phase: Build `RecordsModal` and refactor `GameOverlay` button bar.
4. Verification phase: Run unit tests and confirm layout on mobile and web viewports.

**Rollback**:
Revert the git commit if regressions occur; all changes are contained within client configuration, store slices, and UI overlay components.

**Risks**:
* First time EAS builds require logging into an Expo account associated with the project ID.
