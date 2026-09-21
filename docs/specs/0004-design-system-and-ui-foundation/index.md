# 0004. Design System and UI Foundation

**Date**: 2026-09-21
**Status**: Accepted

## Summary

This specification establishes the visual language, design token architecture, and core user interface components for Magic Cube. It introduces an arcade neon sci fi visual theme featuring a deep midnight blue background, vibrant cyan and amber accents, glowing card surfaces, and a high contrast six color palette for the 3D cube faces. Base primitives include strongly typed design tokens in TypeScript, custom typography using Orbitron, Open Sans, and Roboto Mono with immediate system font fallback, and four reusable interface components (ThemedButton, ThemedCard, ThemedText, and StatBadge) alongside a safe area ScreenContainer wrapper. A living documentation guide in docs/design.md provides the single source of truth for color swatches, typography rules, component APIs, and accessibility guidelines.

## Requirements

**User stories**:
* As a player, I want high visual contrast across the six cube face colors so that I can easily distinguish stickers during fast rotations.
* As a player, I want clear and comfortable touch targets on buttons so that I never trigger accidental actions on a mobile screen.
* As a player, I want an immersive arcade puzzle atmosphere with crisp typography and glowing accents that make solving exciting.
* As a developer, I want centralized design tokens and reusable primitives so that all screens stay visually cohesive with zero styling duplication.

**Acceptance criteria**:
* **AC-1**: Centralized color tokens in `src/theme/colors.ts` provide hex values for primary background (#070F1E), card surfaces (#0D1E36), electric cyan accents (#00E5FF), warm action orange (#FF8C00), golden amber (#FFD700), obsidian plastic (#0A0E17), gradient color stops and vectors, and the six canonical cube face colors (White #FFFFFF, Gold #FFD700, Neon Red #FF1744, Orange #FF8C00, Electric Blue #00E5FF, Emerald Green #00E676).
* **AC-2**: Typography tokens in `src/theme/typography.ts` define font family mappings (Orbitron Bold for titles, Open Sans Regular and Bold for body, Roboto Mono for stats), font sizes (12 to 28), line heights, letter spacings, and an asynchronous font loader hook with immediate system sans and monospace fallback via Platform.select.
* **AC-3**: Spacing tokens in `src/theme/spacing.ts` define an 8 point geometric spacing scale (4, 8, 12, 16, 20, 28, 40), border radius constants (sm 6, md 10, lg 16, pill 9999), opacity tokens (pressed 0.8, disabled 0.4), and minimum touch target dimensions (44 by 44 points).
* **AC-4**: ThemedButton component renders four distinct visual variants (primary cyan gradient, action orange gold gradient, secondary outline, and ghost) with minimum 44 by 44 point hit targets, active touch opacity feedback, and disabled state styling.
* **AC-5**: ThemedCard component provides surface, glass, cyan glow, and orange glow containers with configurable token padding and subtle border highlights.
* **AC-6**: ThemedText component supports predefined semantic typography variants (display, title, subtitle, body, caption, statLabel, statValue) and responds to system accessibility font scaling without clipped text.
* **AC-7**: StatBadge component displays an icon (timer-outline for time, swap-vertical-outline for moves, trophy-outline for records), uppercase category label, and monospace digital readout with colored accent highlights matching the gameplay heads up display in the design mockup.
* **AC-8**: ScreenContainer component provides safe area padding using react-native-safe-area-context, responsive layout guards that scale padding down to 8 points on narrow devices under 380 pixels in width, and transparent status bar integration via expo-status-bar.
* **AC-9**: Living design guide at `docs/design.md` documents visual tokens, color swatches with contrast ratios, typography scale, component props, and accessibility rules.

## Decision

**Chosen option**: Option 1: Arcade Neon Sci Fi Token Architecture with React Native StyleSheet Primitives and Google Font Typography

We adopt a modular design system located in `src/theme/` coupled with lightweight React Native StyleSheet component primitives in `src/components/ui/`. Visual assets are anchored to the arcade neon sci fi aesthetic shown in the reference overview image, utilizing expo-font for Orbitron, Open Sans, and Roboto Mono, expo-linear-gradient for glossy buttons, expo-status-bar for system bar styling, and expo vector icons with Ionicons. Cube sticker colors in `src/store/useCubeStore.ts` and `src/components/Cubie.tsx` are refactored to import directly from the central color tokens, guaranteeing single source of truth fidelity.

**Implementation skills**: none installed yet

## Rationale

Reasoning and options: see rationale.md

## Feature design

**Data model sketch**:

| Entity | Fields | Types and Nullability | Constraints |
|---|---|---|---|
| ColorTokens | background, surface, brand, text, border, cubeFaceColors, plasticColor, gradients | Record<string, string>, string[6], GradientDef | 6 distinct cube face colors, WCAG AA compliant text contrast |
| TypographyTokens | families, sizes, lineHeights, letterSpacings | Record<string, string or number> | Sizes range 12 to 28, title uses Orbitron Bold, body uses Open Sans, stats use Roboto Mono |
| SpacingTokens | space, radii, opacity, touchTarget | Record<string, number> | 8 point geometric grid, touch target minimum 44 by 44 points, pressed opacity 0.8, disabled opacity 0.4 |
| ThemedButtonProps | variant, size, label, icon, onPress, disabled, loading, fullWidth | string, string, string, string, function, boolean | variant in primary-cyan, action-orange, outline, ghost; size in sm, md, lg |
| ThemedCardProps | variant, padding, style, children | string, string, ViewStyle, ReactNode | variant in surface, glass, glow-cyan, glow-orange |
| ThemedTextProps | variant, color, align, numberOfLines, style, children | string, string, string, number, TextStyle, ReactNode | variant in display, title, subtitle, body, caption, statLabel, statValue |
| StatBadgeProps | icon, label, value, variant, style | string, string, string or number, string, ViewStyle | variant in cyan, orange, gold; icon in timer-outline, swap-vertical-outline, trophy-outline; monospace digits for value |
| ScreenContainerProps | safeAreaEdges, backgroundColor, scrollable, style, children | string[], string, boolean, ViewStyle, ReactNode | Wraps useSafeAreaInsets with fallback min padding and expo-status-bar light styling |

Gradient definitions in `ColorTokens`:
* `primaryCyan`: colors `['#00E5FF', '#0284C7']`, start `{ x: 0, y: 0 }`, end `{ x: 1, y: 1 }`
* `actionOrange`: colors `['#FFD700', '#FF8C00']`, start `{ x: 0, y: 0 }`, end `{ x: 1, y: 1 }`
* `glassCard`: colors `['rgba(13, 30, 54, 0.85)', 'rgba(7, 15, 30, 0.65)']`, start `{ x: 0, y: 0 }`, end `{ x: 0, y: 1 }`

**State transitions**:

Font loading lifecycle:
* UNLOADED: Initial state when application starts. Components use system sans serif fallback font families (Platform.select: iOS System, Android sans-serif) and monospace fallback (iOS Menlo, Android monospace) immediately so UI renders without delay.
* LOADING: Asynchronous font loading triggered in background via expo-font with Orbitron_700Bold, OpenSans_400Regular, OpenSans_700Bold, and RobotoMono_500Medium.
* LOADED: Custom fonts resolve successfully. Custom typography renders cleanly.
* ERROR: Custom font loading fails or network timeout occurs. Graceful fallback to system fonts remains active without crashing or degrading user experience.

**API surface**:

| Module or Component | Type | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| src/theme/colors.ts | Module export | None | colors token object, cubeFaceColors array, gradients | None | None |
| src/theme/typography.ts | Module export | None | typography token object, useThemeFonts hook | None | Font load failure fallback |
| src/theme/spacing.ts | Module export | None | spacing token object, radii, opacity, touchTarget | None | None |
| src/components/ui/ThemedButton.tsx | React Component | variant, size, label, icon, onPress, disabled | Rendered Pressable with gradient or outline | None | Ignored when disabled |
| src/components/ui/ThemedCard.tsx | React Component | variant, padding, style, children | Rendered View or LinearGradient container | None | None |
| src/components/ui/ThemedText.tsx | React Component | variant, color, align, children | Rendered Text with typed font styling | None | None |
| src/components/ui/StatBadge.tsx | React Component | icon, label, value, variant | Rendered badge with icon, label, and mono value | None | None |
| src/components/ui/ScreenContainer.tsx | React Component | safeAreaEdges, scrollable, children | SafeAreaView or View with responsive insets and StatusBar | None | None |
| docs/design.md | Markdown Document | None | Formal design specification and token catalog | None | None |

**Value sourcing**:

| Action or Component | Value produced or displayed | Source |
|---|---|---|
| ThemedButton render | Background color or gradient colors and vectors | Sourced from `colors.gradients.primaryCyan` or `colors.gradients.actionOrange` |
| ThemedButton render | Touch target padding, minimum dimensions, and active opacity | Sourced from `spacing.touchTarget`, `spacing.space`, and `spacing.opacity.pressed` |
| ThemedButton disabled render | Dimmed opacity and disabled border color | Sourced from `spacing.opacity.disabled` and `colors.border.subtle` |
| ThemedCard render | Card background fill and neon border glow | Sourced from `colors.background.cardGlass` and `colors.border.cyanGlow` |
| ThemedText render | Font family, font size, and line height | Sourced from `typography.families` and `typography.sizes` |
| StatBadge render | Monospace numeral display and accent dot | Sourced from `typography.families.mono` and `colors.brand[variant]` |
| StatBadge render | Metric icon glyph | Sourced from Ionicons using mapped name (timer-outline, swap-vertical-outline) |
| ScreenContainer render | Top, bottom, left, and right safe padding | Sourced from `useSafeAreaInsets()` combined with responsive guard (8px if width < 380px, else 16px) |
| ScreenContainer render | Status bar style and translucency | Sourced from `<StatusBar style="light" translucent />` via expo-status-bar |
| 3D Cubie render | Six sticker face colors | Sourced from `colors.cubeFaceColors` |
| 3D Cubie render | Inner plastic frame color | Sourced from `colors.plasticColor` |

**Key invariants**:
* WCAG AA contrast compliance: text colors must achieve at least 4.5 to 1 contrast ratio against their respective card and screen background colors.
* Minimum touch dimensions: all interactive touch surfaces (buttons and clickable badges) must measure at least 44 by 44 points on screen.
* Cube face distinctness: all six cube face colors must remain distinct under standard and dim screen brightness settings.
* Zero runtime overhead: design tokens are plain immutable JavaScript objects with zero runtime dependency injection or provider wrapper overhead.

**Security model**:
* Completely local and offline. The design system and UI foundation manage purely client presentation logic with zero network communications and no sensitive user data.

**Configuration required**:
* None. No external service credentials or environment variables required.

**Critical test scenarios**:
* Happy path: ThemedButton, ThemedCard, ThemedText, StatBadge, and ScreenContainer mount cleanly in Jest with correct token styles applied, verifying **AC-4**, **AC-5**, **AC-6**, **AC-7**, and **AC-8**.
* Failure case: Asynchronous font loading times out or errors; typography hook gracefully retains system sans serif typography without throwing an unhandled exception, verifying **AC-2**.
* Small screen edge case: ScreenContainer renders on a narrow viewport under 380 points in width, properly applying compact spacing guards (8 points) while preserving minimum 44 point button hit areas, verifying **AC-3** and **AC-8**.
* Cube color single source test: Unit test verifies that `src/store/useCubeStore.ts` and `src/theme/colors.ts` share identical sticker hex codes across all 6 faces, verifying **AC-1**.

## Build plan

- [x] 1. Install required UI support packages (`expo-font`, `@expo-google-fonts/orbitron`, `@expo-google-fonts/open-sans`, `@expo-google-fonts/roboto-mono`, `expo-linear-gradient`, `@expo/vector-icons`), satisfies **AC-2**, **AC-4**.
- [x] 2. Create foundational token files in `src/theme/colors.ts` (including gradient stops and vectors), `src/theme/typography.ts` (with Platform.select fallback), `src/theme/spacing.ts` (with opacity constants), and barrel export `src/theme/index.ts`, satisfies **AC-1**, **AC-2**, **AC-3**.
- [x] 3. Implement `ThemedText` component with semantic typography variants and font loader hook integration, satisfies **AC-2**, **AC-6**.
- [x] 4. Implement `ThemedButton` component supporting primary cyan gradient, action orange gradient, outline, and ghost variants with 44 point touch targets and pressed and disabled states, satisfies **AC-3**, **AC-4**.
- [x] 5. Implement `ThemedCard` component supporting surface, glass, and glowing neon borders, satisfies **AC-1**, **AC-5**.
- [x] 6. Implement `StatBadge` heads up display component with mapped Ionicons for game time and move count readouts, satisfies **AC-6**, **AC-7**.
- [x] 7. Implement `ScreenContainer` component with safe area insets, compact device layout guards, and expo-status-bar integration, satisfies **AC-3**, **AC-8**.
- [x] 8. Refactor `src/store/useCubeStore.ts` and `src/components/Cubie.tsx` to source cube face colors from `src/theme/colors.ts`, satisfies **AC-1**.
- [x] 9. Author living documentation in `docs/design.md` covering all design tokens, swatches, component catalog, and accessibility standards, satisfies **AC-9**.
- [x] 10. Write unit and regression tests verifying token values, component rendering, accessibility touch targets, and cube color consistency, satisfies **AC-1**, **AC-3**, **AC-4**, **AC-7**.

## Consequences

**Positive**:
* Delivers an authentic, visually striking arcade neon sci fi aesthetic inspired directly by the design specification mockup.
* Establishes a single source of truth for all styling, preventing ad hoc colors or arbitrary margin values across future game slices.
* Ensures 44 point touch target accessibility across all mobile devices.
* Guarantees zero runtime performance penalty through static StyleSheet compilation.

**Negative / tradeoffs**:
* Custom Google fonts add minor bundle size to the native binary.
* Two additional Expo dependencies (`expo-font` and `expo-linear-gradient`) must be maintained in the project dependencies.

**Neutral**:
* Existing GameOverlay buttons can gradually migrate to ThemedButton and StatBadge primitives during Slice 1 without breaking current gameplay.

## Follow-up

* [ ] Refactor GameOverlay in Slice 1 to replace prototype buttons with ThemedButton and StatBadge components.
* [ ] Verify visual appearance on a physical Android device build following package installation.
