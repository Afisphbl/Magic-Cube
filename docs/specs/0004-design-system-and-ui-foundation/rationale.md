# Rationale: Design System and UI Foundation

## Context

Magic Cube is an offline mobile puzzle game targeting casual and competitive Rubik puzzle enthusiasts. In any puzzle game, visual clarity, instant legibility, and aesthetic immersion are critical. The player interacts with a 3D cube rendered in real time while tracking key solve metrics like elapsed solve time and cumulative moves. 

Before this foundation, early prototype screens relied on hardcoded hex codes, inconsistent padding, and basic button styling scattered across temporary components. Without a cohesive design system, future feature slices (including the 3D interaction loop, automated scramble engine, and solve timer) would suffer from inconsistent layouts, conflicting touch target dimensions, and visual disharmony.

Furthermore, a digital Rubik puzzle presents unique visual constraints. The six cube face colors (Up, Down, Right, Left, Front, and Back) must remain immediately distinguishable from one another under varied lighting conditions and screen brightness levels. Concurrently, those sticker colors must harmonize with the surrounding screen environment without causing visual fatigue. 

The reference design mockup provided for the project establishes a distinct arcade neon sci fi direction. It showcases deep midnight space blue backgrounds, glowing cyan borders, warm orange and amber action buttons, and clean geometric typography using Orbitron for headings and Open Sans for body copy. Translating this visual target into a production mobile architecture requires establishing strongly typed design tokens, performant base components, and dependable font loading mechanics that avoid blocking screen interactions.

## Options considered

### Option 1: Arcade Neon Sci Fi Token Architecture with React Native StyleSheet Primitives and Google Font Typography

This option translates the reference mockup directly into a typed token architecture within `src/theme/`. Color tokens, typography rules, and geometric spacing constants are exposed as immutable TypeScript structures. Base components (`ThemedButton`, `ThemedCard`, `ThemedText`, and `StatBadge`) are implemented using standard React Native StyleSheet objects with lightweight Expo ecosystem primitives (`expo-font` for Orbitron and Open Sans, `expo-linear-gradient` for glossy button gradients, and `@expo/vector-icons` for HUD iconography). An asynchronous font loader hook provides instant fallback to system sans serif fonts while custom typography assets resolve.

**Pros**:
* Faithfully reproduces the futuristic arcade visual atmosphere defined in the project design mockup.
* Zero runtime performance overhead because styles compile through standard React Native StyleSheet structures rather than runtime CSS parsers.
* Provides reliable 44 point touch targets and WCAG AA contrast compliance out of the box.
* Immediate system font fallback ensures the application never stalls or freezes during font initialization.

**Cons**:
* Adds small asset weight from bundled Google font files.
* Requires adding `expo-font` and `expo-linear-gradient` packages to project dependencies.

### Option 2: Minimal Flat Dark Theme using Standard System Fonts and Flat Views

This option foregoes custom fonts and gradients, implementing a basic flat dark palette with system sans serif typography (Roboto on Android, San Francisco on iOS). Buttons and cards are rendered as plain flat rectangular surfaces with solid border strokes.

**Pros**:
* Zero additional external dependencies or font asset downloads.
* Extremely simple implementation footprint.

**Cons**:
* Misses the energetic arcade puzzle character and holographic feel established in the design overview image.
* Standard system typography lacks the distinct sci fi identity of Orbitron.
* Flat buttons lack the tactile gloss and affordance of gradient action buttons.

### Option 3: Third Party Styling Framework with Dynamic Theme Provider

This option introduces an external utility or component styling framework (such as NativeWind or Shopify Restyle) paired with a React context theme provider wrapping the root component tree to enable dynamic theme toggling at runtime.

**Pros**:
* Utility class syntax or theme provider hooks facilitate rapid experimentation.
* Built in theme provider facilitates adding light mode or seasonal color themes in the future.

**Cons**:
* Substantial architectural complexity and bundle size overhead for an offline game that currently requires only a polished dark theme.
* Context providers add re-render overhead across the component tree when theme state updates.
* Adds complex Babel and build tool configuration dependencies that can conflict with React 19 and Expo SDK 54.

## Rationale

Option 1 is selected because it directly fulfills the visual ambition and user experience defined in the project design overview while maintaining strict mobile performance and simplicity. 

A puzzle game succeeds on visual feedback. The combination of deep midnight navy surfaces, crisp cyan borders, and warm golden amber action buttons creates high visual hierarchy. Key player actions like Scramble and Start stand out boldly against the darker backdrop, while HUD statistics remain readable through clean monospace digits. 

By leveraging native React Native StyleSheet compilation rather than third party utility engines, Option 1 ensures zero runtime styling overhead. In a fast paced 3D game running on 60 or 120 hertz mobile screens, keeping the main thread clear of unnecessary styling computation prevents frame drops during simultaneous cube rotations and touch interactions.

The font loading strategy directly balances visual fidelity with startup resilience. Custom display typography like Orbitron gives Magic Cube its signature arcade feel, but network delays or asset loading hitches must never block gameplay. Initializing with system sans serif fonts and transitioning smoothly upon asset load provides an uninterrupted player experience.
