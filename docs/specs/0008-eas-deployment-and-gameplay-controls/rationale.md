# 0008. EAS Deployment and Gameplay Controls: Decision Record

## Context

The Magic Cube puzzle game currently has multiple control buttons distributed across the bottom of the screen. These buttons include orientation presets (White Top and Yellow Top), view reset, scramble trigger, and game reset. While functional during early development slices, this multi button interface clutters the visual space, distracts casual players, and adds cognitive friction before a player can start solving. Players expect a streamlined mobile arcade flow where tapping Start gets them into the solve immediately and tapping Record allows them to inspect their personal achievements.

Furthermore, the game lacked persistent record storage across app restarts. While individual solves generated detailed metrics including elapsed milliseconds, turn counts, and turns per second, these metrics disappeared upon closing the application. Introducing persistent personal best tracking restricted to the top five fastest solves gives players ongoing motivation without overwhelming local device storage or demanding complicated data management.

Finally, the project requires preparation for cloud builds on Expo Application Services (EAS). Deploying a test build to physical Android devices necessitates connecting the project to the dedicated EAS project identifier 1400895d-0d5f-43ce-b82c-a40040de8a5b, setting up application icon and splash assets from the assets directory, and creating an EAS build profile configured to generate standalone Android APK files for direct sideload testing without developer client dependencies.

## Options considered

### Option 1: Direct EAS Preview APK with Streamlined Start and Record HUD and Local Top Five Storage (Chosen)

This option links the EAS project ID, configures existing assets in `app.json`, and defines a preview build profile in `eas.json` producing standalone APK files. On the game screen, all existing bottom buttons are replaced with two prominent buttons, Start and Record. Tapping Start triggers a rapid scramble and begins the timer immediately. Tapping Record opens a sleek modal displaying the top five fastest solves retrieved from `@react-native-async-storage/async-storage`.

**Pros**:
* Provides an intuitive two button arcade interface with zero screen distraction.
* Immediate timer activation on Start creates rapid play loop.
* Top five record retention provides clear personal benchmarks without complex data maintenance.
* Sideloadable APK profile enables frictionless on device testing without requiring Google Play Store submission.

**Cons**:
* Removes one tap orientation preset shortcuts from the screen, requiring players to orbit the cube freely using gestures.
* Slower solve attempts beyond the top five are not retained in history.

### Option 2: Full History Log with Navigation Route and Delayed Timer Start

This option keeps a full unlimited history of all past solves, navigates to a dedicated Expo Router screen (`/records`) instead of a modal card, and delays timer activation until the player makes their first manual move after the scramble animation completes.

**Pros**:
* Retains complete historical progression for analytics.
* First move timer trigger matches traditional World Cube Association tournament competition rules.

**Cons**:
* Infinite record storage requires pagination, deletion controls, and search filters.
* Screen navigation breaks 3D game immersion and requires extra user taps to return to the cube.
* Delayed timer activation feels less immediate for casual mobile arcade play compared to instant start on button tap.

### Option 3: In Memory Session Records without Persistent Storage

This option implements the two button Start and Record interface, but stores records only in volatile application memory for the active session, avoiding any additional npm storage packages.

**Pros**:
* Avoids adding the AsyncStorage dependency to package dependencies.
* Simplest possible implementation with zero asynchronous storage IO.

**Cons**:
* Player records vanish every time the application is closed or backgrounded.
* Fails to deliver lasting user progression or personal achievement value.

## Rationale

Option 1 is selected because it directly answers player expectations for mobile puzzle games while fulfilling all requested deployment requirements.

(basis: your AGENTS.md, Tracer Bullet build approach and offline local architecture)
The project architecture strictly mandates an offline only experience without user accounts or external backends. Storing the top five fastest records locally via AsyncStorage satisfies this mandate with minimal overhead. Restricting the leaderboard to the top five solves maintains a tight, prestigious personal hall of fame while keeping storage payloads negligible.

(basis: Expo Application Services official documentation for standalone APK preview builds)
Configuring EAS preview builds with `buildType: "apk"` and `developmentClient: false` allows the team to test production compiled builds directly on real Android hardware without connecting to local development servers or waiting for Play Console approval cycles.

(basis: mobile arcade puzzle game ergonomics)
Replacing four scattered utility buttons with two unambiguous primary actions (Start and Record) clarifies the primary gameplay loop. Tapping Start immediately engages the player with a rapid shuffle and active timer, eliminating unnecessary setup delays.

## References

**Project sources**:
* `AGENTS.md`: Offline first guidelines, Zustand store conventions, and mobile Expo managed workflow
* `docs/scope/scope.md`: Deferred feature personal best statistics and Tracer Bullet delivery model
* `docs/specs/0007-solve-timer-and-move-counter/index.md`: SolveRecord structure, timer formatting, and completion triggers

**Practices & standards**:
* High precision wall clock duration calculation via system timestamps
* Mobile modal overlay patterns for transient game statistics
* Standalone APK build distribution for internal Android device testing

**Links**:
* Android APK builds with EAS: https://docs.expo.dev/build-reference/apk/
* EAS configuration schema: https://docs.expo.dev/build/eas-json/
* Expo app configuration specification: https://docs.expo.dev/versions/latest/config/app/
* Expo application icon and splash guides: https://docs.expo.dev/develop/user-interface/app-icons/
* React Native AsyncStorage for Expo: https://docs.expo.dev/versions/latest/sdk/async-storage/
