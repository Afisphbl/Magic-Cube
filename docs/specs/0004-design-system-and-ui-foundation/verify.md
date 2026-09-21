# Verify: Design System and UI Foundation · spec 0004 · updated 2026-09-21

_Steps derived from spec 0004 acceptance criteria and value sourcing table. `/check verify` runs these; `/test` locks the durable ones._

## Automated Commands

* [x] `npm test` runs cleanly with Node test runner, verifying all theme token values, component mount snapshots, and color array consistency (satisfies AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8)
* [x] `npm run typecheck` passes with zero TypeScript errors across theme tokens, base components, and store references
* [x] `npm run lint` passes with zero ESLint warnings or errors

## Behavioral and Value Sourcing Checks

* [x] `colors` exports background, surface, brand, text, border, and cube face palettes with correct hex constants (satisfies AC-1, value sourcing: color tokens)
* [x] `typography` exports font family names, scale sizes, line heights, and letter spacings (satisfies AC-2, value sourcing: typography tokens)
* [x] `useThemeFonts()` hook initiates font loading and provides immediate system sans fallback while loading (satisfies AC-2, value sourcing: font loader hook)
* [x] `spacing` exports 8 point geometric grid units, border radius constants, and minimum 44 point touch target bounds (satisfies AC-3, value sourcing: spacing tokens)
* [x] `ThemedButton` renders primary-cyan, action-orange, outline, and ghost variants with 44 point touch targets and active touch feedback (satisfies AC-4, value sourcing: rendered button)
* [x] `ThemedCard` renders surface, glass, and glowing neon border variants with configurable padding (satisfies AC-5, value sourcing: rendered card)
* [x] `ThemedText` renders display, title, subtitle, body, caption, statLabel, and statValue semantic variants with proper typography tokens (satisfies AC-6, value sourcing: rendered text)
* [x] `StatBadge` renders icon, category label, and monospace digital readout with colored accent highlights (satisfies AC-7, value sourcing: rendered badge)
* [x] `ScreenContainer` wraps children with safe area insets and responsive padding guards on viewports under 380 points in width (satisfies AC-8, value sourcing: rendered container)
* [x] `src/store/useCubeStore.ts` and `src/components/Cubie.tsx` import cube face colors from `src/theme/colors.ts`, ensuring single source fidelity (satisfies AC-1)
* [x] `docs/design.md` exists and details all design tokens, swatches, component catalog, and accessibility standards (satisfies AC-9)

## Acceptance Criteria Coverage

* AC-1: covered by token tests in `test/theme_tokens.test.mjs` and store color consistency checks
* AC-2: covered by typography token tests and font hook tests in `test/theme_tokens.test.mjs`
* AC-3: covered by spacing token tests and touch target dimensions in `test/theme_tokens.test.mjs`
* AC-4: covered by ThemedButton variant and touch target tests in `test/themed_components.test.mjs`
* AC-5: covered by ThemedCard variant and style tests in `test/themed_components.test.mjs`
* AC-6: covered by ThemedText variant tests in `test/themed_components.test.mjs`
* AC-7: covered by StatBadge rendering and layout tests in `test/themed_components.test.mjs`
* AC-8: covered by ScreenContainer insets and responsive guard tests in `test/themed_components.test.mjs`
* AC-9: covered by verification of `docs/design.md` existence and content completeness
