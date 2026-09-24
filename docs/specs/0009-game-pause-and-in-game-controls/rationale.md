# 0009. Game Pause and In Game Controls: Rationale

## Context

The Magic Cube application previously rendered Start and Record buttons at the bottom of the screen while a solve was in progress. Having large buttons present during rapid 3D cube manipulation creates visual clutter and risks accidental button presses that could interrupt an active solve. Furthermore, casual mobile players frequently experience interruptions such as phone notifications or real life distractions. Without a pause mechanism, players must choose between abandoning a solve or letting their solve time inflate unfairly.

When a player pauses an active solve, they need a clean way to either resume where they left off, start over with a fresh scramble if they made a mistake, or abandon the solve and return to the main idle page. The 3D cube must also be shielded or locked during pause to preserve speedcubing integrity and prevent players from inspecting turns while the clock is frozen.

## Options considered

### Option 1: Dedicated pause state in store with top header button and modal menu

Introduce an isPaused flag and pause methods in useCubeStore. Place a sleek pause icon button in the top bar header during active play. Hide the centered Start and Record buttons entirely while the game is playing. When paused, freeze the timer, lock cube rotations, and display a glass styled modal with Resume, Restart, and Main Page options.

**Pros**:
* Clean separation of concerns in state management and rendering.
* Completely uncluttered viewport during active gameplay.
* Fair timer accounting that tracks active duration across pauses.

**Cons**:
* Requires guarding both orbit and face drag gestures against paused input.

### Option 2: Full screen separate page route using Expo Router

Navigate away from the game canvas to a dedicated pause route (`app/pause.tsx`) using Expo Router modal presentation.

**Pros**:
* Uses file based routing constructs.

**Cons**:
* Unmounting or obscuring the WebGL canvas can cause context loss or re initialization overhead.
* Heavier mental model for a simple in game overlay.

## Rationale

Option 1 is selected because it fits the single screen 3D canvas architecture of Magic Cube without incurring route transitions or WebGL reload risks. By managing pause directly in the Zustand store, the 3D scene simply checks store state to reject interaction, and the timer hook cleanly excludes pause periods from total solve duration. Hiding the primary buttons during active play gives players maximum screen space for cube turns and viewing angles, while keeping the centered buttons prominent when the game is idle.
