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

### Fixed
- Scramble moves no longer count toward player solve moves or pollute move history.
- Scramble sequence completing in a solved state now accurately transitions to the solved game phase.
- User touch gestures during active scrambles are ignored to keep the scramble sequence intact.

### Removed
- Kotlin Android scaffold and Gradle build files, replaced by the Expo workflow (see spec 0002).
