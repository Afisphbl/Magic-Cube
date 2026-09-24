# 0009. Game Pause and In Game Controls

**Date**: 2026-09-24
**Status**: Accepted

## Summary

This specification defines the in game control states and pause experience for the Magic Cube puzzle game. When the game is idle or solved, the Start and Record buttons sit directly in the center of the display for immediate access. When the game begins active play, those primary buttons vanish completely so the player enjoys an unobstructed view of the 3D cube. A compact pause button appears in the top bar header during play. Tapping pause freezes the solve timer, locks cube gestures, and presents a dedicated pause card with options to resume the solve, restart with a fresh shuffle, or return directly to the main screen.

## Requirements

**User stories**:
* As a player, I want the Start and Record buttons centered on screen before I start so that the main screen feels inviting and clear.
* As a speedcuber, I want all main buttons hidden while I solve the cube so that my view is clean and accidental taps do not ruin my solve.
* As a player, I want a pause icon available during play so that I can stop the game if I get interrupted.
* As a player, I want a pause menu that lets me resume, restart with a fresh scramble, or go back to the main page.
* As a mobile user, I want the game to auto pause if I switch apps or receive a phone call so that my solve time is protected.

**Acceptance criteria**:
* **AC-1**: When the game is not playing (gamePhase is SOLVED or timerStatus is IDLE), the Start and Record action buttons render centered on screen.
* **AC-2**: When the game enters active play (gamePhase is PLAYING and timerStatus is RUNNING), the centered Start and Record buttons are hidden completely from the screen.
* **AC-3**: During active play while not paused, a pause button appears in the top bar header area aligned with the HUD stats. When paused, this button is hidden.
* **AC-4**: Tapping the pause button transitions the game into a paused state, freezes the timer ticker, stops timer accumulation, and locks all 3D cube interactions so the player cannot rotate faces or orbit the view.
* **AC-5**: In the paused state, a modal overlay renders with high visual opacity (darkened backdrop) to obscure the cube state, displaying current elapsed time, move count, and three actions: Resume, Restart, and Main Page.
* **AC-6**: Tapping Resume in the pause modal dismisses the modal, restores cube interaction, and resumes the timer ticker without penalizing the player for time spent paused.
* **AC-7**: Tapping Restart in the pause modal dismisses the modal, resets accumulated time and move count, and immediately initiates a fresh 20 move scramble sequence that begins the timer the moment the shuffle completes.
* **AC-8**: Tapping Main Page in the pause modal dismisses the modal, abandons the current solve attempt, resets the cube to the solved state, resets accumulated stats to zero, and returns to the initial state showing centered Start and Record buttons.
* **AC-9**: When the mobile application transitions from active to background or inactive state during active play, the game automatically enters the paused state to prevent unfair time inflation.

## Decision

**Chosen option**: Option 1: Dedicated pause state in the Zustand store with gesture lock in the 3D scene, floating top header pause icon, AppState auto pause listener, and a glass styled pause modal with Resume, Restart, and Main Page actions.

**Implementation skills**: none

## Rationale

Reasoning and options: see rationale.md

## Feature design

**Data model sketch**:

| Entity / Property | Type | Description | Location | Invariants and Rules |
|---|---|---|---|---|
| isPaused | boolean | Indicates whether active gameplay is paused | CubeStoreState | True only when gamePhase is PLAYING and user requested pause. False when idle, solved, or active. |
| accumulatedTimeMs | number | Milliseconds accumulated across prior active segments | CubeStoreState | Non negative number. Reset to zero on restartGame, exitToMainPage, and startSolveGame. Updated on pause. |
| solveStartTime | number or null | Epoch timestamp when the current active segment started | CubeStoreState | Set to Date.now() on start or resume. Set to null when paused or stopped. |
| pauseGame | () => void | Action to pause active solve | CubeStoreState | Permitted only when gamePhase is PLAYING, isPaused is false, and cube is not solved. Freezes timer and adds elapsed segment to accumulatedTimeMs. |
| resumeGame | () => void | Action to resume active solve | CubeStoreState | Permitted only when isPaused is true. Sets solveStartTime to Date.now() and isPaused to false. |
| restartGame | () => void | Action to abandon solve and scramble again | CubeStoreState | Dismisses pause, clears accumulatedTimeMs, runs startSolveGame. Locked if currently scrambling. |
| exitToMainPage | () => void | Action to abandon solve and return to main screen | CubeStoreState | Dismisses pause, clears accumulatedTimeMs, resets cube to solved state, resets timer and moves to zero. |

**State transitions**:

* START GAME:
  Player taps centered Start button -> cube completes 20 move shuffle -> gamePhase transitions to PLAYING -> centered buttons hide completely -> top header pause icon becomes visible -> timerStatus transitions to RUNNING -> solveStartTime set to Date.now() -> accumulatedTimeMs initialized to 0.
* PAUSE GAME (Manual or AppState):
  Player taps pause icon or app enters background -> pauseGame executes -> isPaused set to true -> timerStatus set to PAUSED -> accumulatedTimeMs += (Date.now() - solveStartTime) -> solveStartTime set to null -> cube gestures locked -> top pause button hidden -> PauseModal appears on screen.
* RESUME GAME:
  Player taps Resume button in PauseModal -> resumeGame executes -> isPaused set to false -> timerStatus set to RUNNING -> solveStartTime set to Date.now() -> PauseModal closes -> cube gestures unlocked -> top pause button returns.
* RESTART GAME:
  Player taps Restart button in PauseModal -> restartGame executes -> isPaused set to false -> accumulatedTimeMs set to 0 -> startSolveGame runs fresh 20 move scramble -> timer begins the moment scramble resolves -> PauseModal closes.
* EXIT TO MAIN PAGE:
  Player taps Main Page button in PauseModal -> exitToMainPage executes -> isPaused set to false -> accumulatedTimeMs set to 0 -> resetGame restores solved cube -> gamePhase set to SOLVED -> centered Start and Record buttons reappear.

**API surface**:

Store actions added or updated in `src/store/useCubeStore.ts`:
* `pauseGame: () => void`
* `resumeGame: () => void`
* `restartGame: () => void`
* `exitToMainPage: () => void`

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| pauseGame | isPaused true, frozen timer text | User tap on top bar pause icon or AppState background event |
| resumeGame | isPaused false, resumed timer | User tap on Resume button |
| restartGame | fresh scramble moves and zero timer | User tap on Restart button |
| exitToMainPage | solved cube and zeroed stats | User tap on Main Page button |
| GameOverlay render | center buttons vs pause button | gamePhase, timerStatus, and isPaused in useCubeStore |
| PauseModal render | current elapsed time and moves | accumulatedTimeMs and moveCount in useCubeStore |
| Total elapsed solve time | final ms duration | accumulatedTimeMs plus (Date.now() minus solveStartTime) |

**Key invariants**:
* The centered Start and Record buttons never show during active play (while gamePhase is PLAYING).
* The pause button never shows when the game is idle, solved, scrambling, or already paused.
* Cube rotation gestures are completely ignored while isPaused is true.
* Time elapsed while paused is never counted toward the final solve time record.
* If the app is sent to background during active play, it transitions to paused automatically.

**Security model**:
* Offline single player puzzle game with no network communication or authentication requirements.

**Configuration required**:
* None. Uses existing project assets and theme tokens.

**Critical test scenarios**:
* Centered buttons display when game is idle and disappear when play starts, verifies **AC-1**, **AC-2**
* Pause icon appears during play and disappears while pause modal is open, verifies **AC-3**
* Pause action freezes timer and locks cube interactions, verifies **AC-4**
* Timer does not accumulate paused duration across multiple pause and resume cycles, verifies **AC-4**, **AC-6**
* Pause modal displays time, moves, and three functional buttons, verifies **AC-5**
* Resume dismisses modal and restores gameplay seamlessly, verifies **AC-6**
* Restart initiates new scramble sequence immediately, verifies **AC-7**
* Main Page restores solved cube and brings back centered buttons, verifies **AC-8**
* AppState background event triggers pauseGame automatically, verifies **AC-9**

## Build plan

- [x] 1. Pure logic and store state: add pause support to `CubeStoreState` with `isPaused` flag, timer segment tracking with `accumulatedTimeMs`, and `pauseGame`, `resumeGame`, `restartGame`, and `exitToMainPage` store actions, satisfies **AC-4**, **AC-6**, **AC-7**, **AC-8**
- [x] 2. Timer ticker hook update: update `useTimerTicker` to calculate total duration from `accumulatedTimeMs` plus active segment, freezing cleanly on pause, satisfies **AC-4**, **AC-6**
- [x] 3. Interaction lock: guard cube orbit and face turn gestures in `CubeCanvas` and `CubeGroup` so pointer interactions reject turns while `isPaused` is true, satisfies **AC-4**
- [x] 4. UI component PauseModal: create `PauseModal` with high opacity backdrop, stats display, and buttons for Resume, Restart, and Main Page, satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**
- [x] 5. GameOverlay layout updates: show Start and Record buttons centered only when not playing, hide them when playing, render the top right pause icon button during active play, and attach `AppState` background listener, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-9**
- [x] 6. Unit and component tests: write automated tests covering pause state transitions, timer accumulation across pauses, gesture blocking, modal rendering, AppState background handling, and navigation actions, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**

## Consequences

**Positive**:
* Screen clutter during solves drops to zero, giving players a clean view of the cube.
* Players can pause their game without losing solve progress or receiving a time penalty.
* Players can quickly restart a bad solve or return to the main screen without having to finish the solve.
* Backgrounding the app does not ruin an active solve attempt.

**Negative / tradeoffs**:
* Adding pause state adds another condition to the cube gesture handler and timer calculations.
* A darkened modal is necessary during pause so players cannot inspect the cube while the timer is frozen.

**Neutral**:
* The centered button layout before a solve remains consistent with the initial menu experience.

## Follow-up

- [ ] Confirm whether a sound effect should play when pause or resume is pressed once audio is added.
