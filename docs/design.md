# Magic Cube: Living Design Guide

Welcome to the visual foundation for Magic Cube. This document serves as the single source of truth for the game visual language, design token architecture, component catalog, and accessibility guidelines.

## Character and Visual Mandate

Magic Cube embraces an arcade neon sci fi aesthetic. The visual world is defined by:
* Deep Midnight Blue background canvas (#070F1E) evoking deep space and retro futuristic gaming cabinets.
* Vibrant Electric Cyan (#00E5FF) and Action Orange (#FF8C00) providing luminous focal points for primary interactive controls.
* High Contrast Cube Face Palette engineered for instant recognition and clear distinction during rapid 3D rotation.
* Glass and Glowing Card Surfaces (#0D1E36 with subtle borders and glow shadows) adding depth without visual clutter.
* Sharp Futuristic Typography pairing Orbitron Bold for titles with Open Sans for readable content and Roboto Mono for digital timers and counters.

## Token Architecture

All visual constants live in strongly typed TypeScript modules in `src/theme/`. Components consume these tokens directly.

### 1. Color Palette (`src/theme/colors.ts`)

#### Core Surfaces
| Token Name | Hex / RGBA | Role | Contrast vs Background |
|---|---|---|---|
| `colors.background.primary` | #070F1E | Primary full screen canvas | Baseline |
| `colors.background.card` | #0D1E36 | Solid card and overlay surface | 1.3:1 (Subtle depth) |
| `colors.background.cardGlass` | rgba(13, 30, 54, 0.85) | Translucent heads up display container | Overlay |
| `colors.surface.elevated` | #132746 | Raised interactive card surface | 1.8:1 |

#### Brand and Accent Highlights
| Token Name | Hex | Role | Contrast vs Background |
|---|---|---|---|
| `colors.brand.cyan` | #00E5FF | Electric cyan, primary actions and glowing borders | 12.8:1 (Passes AAA) |
| `colors.brand.orange` | #FF8C00 | Warm action orange, primary gameplay buttons | 7.9:1 (Passes AAA) |
| `colors.brand.gold` | #FFD700 | Golden amber, records and solve highlights | 13.5:1 (Passes AAA) |

#### Text and Content
| Token Name | Hex | Role | Contrast vs Surface (#0D1E36) |
|---|---|---|---|
| `colors.text.primary` | #F8FAFC | Pure bright white text | 15.2:1 (Passes AAA) |
| `colors.text.secondary` | #94A3B8 | Crisp slate secondary labels | 7.1:1 (Passes AAA) |
| `colors.text.muted` | #64748B | Subtle supporting text and captions | 4.6:1 (Passes AA) |
| `colors.text.inverse` | #070F1E | Dark text on cyan and orange buttons | 12.8:1 (Passes AAA) |

#### Gradients
* `colors.gradients.primaryCyan`: Gradient from Electric Cyan (#00E5FF) to Deep Sky Blue (#0284C7) angled top left to bottom right.
* `colors.gradients.actionOrange`: Gradient from Golden Amber (#FFD700) to Warm Orange (#FF8C00) angled top left to bottom right.
* `colors.gradients.glassCard`: Vertical gradient from rgba(13, 30, 54, 0.85) to rgba(7, 15, 30, 0.65).

#### 3D Cube Face Colors (`colors.cubeFaceColors`)
The six canonical cube face stickers follow standard Western color orientation with elevated arcade vibrancy:
* Face 0 (Up / +Y): Pure White (#FFFFFF)
* Face 1 (Down / -Y): Golden Amber (#FFD700)
* Face 2 (Right / +X): Neon Red (#FF1744)
* Face 3 (Left / -X): Warm Action Orange (#FF8C00)
* Face 4 (Front / +Z): Electric Cyan Blue (#00E5FF)
* Face 5 (Back / -Z): Emerald Green (#00E676)
* Inner Core Plastic (`colors.plasticColor`): Obsidian Plastic (#0A0E17)

### 2. Typography (`src/theme/typography.ts`)

Typography uses Google Fonts with immediate system font fallback via Platform.select so screens render immediately even before web or native font assets resolve.

#### Font Families
* Title and Display: Orbitron Bold (`Orbitron_700Bold`), fallback to System Sans.
* Body and Labels: Open Sans (`OpenSans_400Regular` and `OpenSans_700Bold`), fallback to System Sans.
* Monospace Metrics: Roboto Mono Medium (`RobotoMono_500Medium`), fallback to Menlo (iOS) or monospace (Android).

#### Type Scale
| Variant | Size | Line Height | Letter Spacing | Font Family | Default Color |
|---|---|---|---|---|---|
| `display` | 28 | 34 | 1.5 | Orbitron Bold | #F8FAFC |
| `title` | 20 | 26 | 1.2 | Orbitron Bold | #F8FAFC |
| `subtitle` | 16 | 22 | 0.5 | Open Sans Bold | #94A3B8 |
| `body` | 14 | 20 | 0.0 | Open Sans Regular | #F8FAFC |
| `caption` | 12 | 16 | 0.4 | Open Sans Regular | #64748B |
| `statLabel` | 12 | 16 | 1.0 | Open Sans Bold (Uppercase) | #94A3B8 |
| `statValue` | 24 | 28 | 1.0 | Roboto Mono Medium | #00E5FF |

### 3. Spacing and Metrics (`src/theme/spacing.ts`)

All layout intervals follow an 8 point geometric grid scale.

#### Spacing Scale
* `space.xs`: 4
* `space.sm`: 8
* `space.md`: 12
* `space.base`: 16
* `space.lg`: 20
* `space.xl`: 28
* `space.xxl`: 40

#### Border Radii
* `radii.sm`: 6 (tags, small badges)
* `radii.md`: 10 (standard buttons, stat badges)
* `radii.lg`: 16 (dialogs, cards, game overlay containers)
* `radii.pill`: 9999 (circular controls, pill toggles)

#### Interactive Touch Targets
* `touchTarget.minWidth`: 44 points
* `touchTarget.minHeight`: 44 points
Every button and interactive control guarantees a minimum 44 by 44 point touch target for mobile accessibility.

#### Opacity Tokens
* `opacity.default`: 1.0
* `opacity.pressed`: 0.8
* `opacity.disabled`: 0.4

## Component Catalog (`src/components/ui/`)

### 1. ThemedText
Renders text using predefined semantic variants with automatic font scaling for accessibility.
```tsx
import { ThemedText } from '../components/ui';

<ThemedText variant="title">MAGIC CUBE</ThemedText>
<ThemedText variant="body" color="#94A3B8">Rotate faces to solve</ThemedText>
```

### 2. ThemedButton
High tactile pressable button rendering vibrant gradients, outlines, or ghost actions.
Props:
* `variant`: `'primary-cyan' | 'action-orange' | 'outline' | 'ghost'`
* `size`: `'sm' | 'md' | 'lg'` (default `'md'`)
* `label`: string
* `icon`: optional ReactNode
* `disabled`: boolean
* `loading`: boolean
* `fullWidth`: boolean
```tsx
import { ThemedButton } from '../components/ui';

<ThemedButton
  variant="action-orange"
  label="SCRAMBLE"
  onPress={handleScramble}
/>
```

### 3. ThemedCard
Container card providing dark surfaces, glass morphic translucency, or glowing neon outlines.
Props:
* `variant`: `'surface' | 'glass' | 'glow-cyan' | 'glow-orange'`
* `padding`: token key or number
```tsx
import { ThemedCard } from '../components/ui';

<ThemedCard variant="glass" padding="base">
  <ThemedText variant="subtitle">Session Overview</ThemedText>
</ThemedCard>
```

### 4. StatBadge
Compact heads up display component presenting a game metric with an icon, category label, and monospace numerical value.
Props:
* `icon`: Ionicons name (`'timer-outline' | 'swap-vertical-outline' | 'trophy-outline'`)
* `label`: string (rendered uppercase)
* `value`: string or number
* `variant`: `'cyan' | 'orange' | 'gold'`
```tsx
import { StatBadge } from '../components/ui';

<StatBadge
  icon="timer-outline"
  label="Time"
  value="01:24.8"
  variant="cyan"
/>
```

### 5. ScreenContainer
Root screen wrapper ensuring safe area insets on modern notched devices, responsive layout scaling on narrow screens, and light status bar integration.
Props:
* `safeAreaEdges`: array of edges (`'top'`, `'bottom'`, `'left'`, `'right'`)
* `scrollable`: boolean
* `backgroundColor`: string
```tsx
import { ScreenContainer } from '../components/ui';

<ScreenContainer>
  {/* Screen content */}
</ScreenContainer>
```

## Accessibility Standards

1. Minimum Touch Targets: All clickable elements enforce at least 44 by 44 points dimensions on screen.
2. High Contrast Compliance: All text meets WCAG AA contrast ratio standards (greater than 4.5:1 for body copy and 3.0:1 for large display titles).
3. Font Scaling: ThemedText components allow font scaling without clipping containers.
4. Screen Reader Semantics: Buttons declare `accessibilityRole="button"` and communicate their active disabled state through `accessibilityState`.
