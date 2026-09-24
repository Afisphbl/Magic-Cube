# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Scaffold for Expo and React Native with TypeScript and Expo Router (see spec 0002).
- Interactive 3D Rubik's Cube rendering powered by Three.js and `@react-three/fiber` with 26 cubies and scene lighting.
- Complete 54 sticker data model and state machine covering all 18 standard face moves (see spec 0003).
- Atomic single move input buffer and scramble queue to manage fast user swipes and automated scrambles without stutter (see spec 0003).
- Orientation invariant solved state detection and sticker validation with automatic recovery (see spec 0003).
- Pure Zustand state store tracking cube stickers, move count, move history, and game phase.
- Gesture controls for trackball orbit rotation and face twisting.
- Automated test suites covering state transitions, camera bounds, and browser interaction flows.
- Direct face swipe gestures that project 3D face tangents into screen space across an eighteen point threshold to trigger legal slice turns (see spec 0005).
- Tactile haptic feedback providing a light impact pulse on mobile devices when slice rotations finish (see spec 0005).
- Primary pointer locking that tracks the active finger and ignores secondary touch contacts until release (see spec 0005).
- World Cube Association compliant scramble generator producing pseudo random sequences of twenty to twenty five legal face turns with axis cancellation filtering (see spec 0006).
- High speed scramble animation turning cube slices at seventy milliseconds per move for a fluid visual shuffle (see spec 0006).
- Instant skip option via screen tap or banner button that immediately snaps the cube to the final scrambled state (see spec 0006).
- Scramble notation card displaying the full move sequence on screen during and after shuffling (see spec 0006).
- Seamless mid solve scramble triggering that cancels active manual turns and begins a fresh shuffle without resetting the app (see spec 0006).
- Automatic solve timer that starts on the first manual face turn after a scramble completes and freezes on solve completion (see spec 0007).
- Speedcubing timer display format showing centiseconds for fast times and minutes for longer solves (see spec 0007).
- Celebratory victory card overlay that appears when the cube is solved, showing final solve duration, move count, turns per second, and scramble notation (see spec 0007).
- Tactile victory haptic pulse on mobile devices celebrating successful puzzle completion (see spec 0007).
- Instant rematch and review options on the victory card to scramble again or dismiss the card and inspect the solved cube (see spec 0007).
- Local display ticker hook updating live timer figures smoothly without triggering global store re renders (see spec 0007).
- Move counter tracking legal face turns using the Half Turn Metric during timed solves (see spec 0007).

### Changed
- Whole cube orbit rotation now maps screen swipes directly around world axes with exponential damping for smooth inspection (see spec 0005).
- Scramble button in the overlay now initiates animated queue playback and temporarily disables to prevent conflicting turns (see spec 0006).
- Top game overlay now displays live timer and move count badges in the head up display instead of text phase labels (see spec 0007).

### Fixed
- Scramble moves no longer count toward player solve moves or pollute move history.
- Scramble sequence completing in a solved state now accurately transitions to the solved game phase.
- User touch gestures during active scrambles are ignored to keep the scramble sequence intact.
- Touch events during active slice animations are now blocked to prevent raycasting tilted cubie meshes (see spec 0005).
- Casual moves made without a prior scramble no longer trigger solve timer activation or victory records (see spec 0007).
- Post solve face turns after dismissing the victory card no longer restart the timer or overwrite the recorded solve (see spec 0007).
- Mid solve scrambles and game resets now safely abort active timers and clear solve records without ghost callbacks (see spec 0007).

### Removed
- Kotlin Android scaffold and Gradle build files, replaced by the Expo workflow (see spec 0002).
