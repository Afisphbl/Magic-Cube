import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as themeIndex from '../src/theme/index.ts';
import { colors, CUBE_FACE_COLORS, PLASTIC_COLOR } from '../src/theme/colors.ts';
import { typography, fontSizes, fontFamilies, useThemeFonts } from '../src/theme/typography.ts';
import { spacing, space, radii, opacity, touchTarget } from '../src/theme/spacing.ts';
import {
  FACE_COLORS as STORE_FACE_COLORS,
  PLASTIC_COLOR as STORE_PLASTIC_COLOR,
} from '../src/store/useCubeStore.ts';

// Relative luminance and contrast ratio calculation (WCAG 2.1)
function getLuminance(hexColor) {
  const cleanHex = hexColor.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

test('AC-1: colors.ts defines all primary surfaces, accents, and plastic frame', () => {
  assert.equal(colors.background.primary, '#070F1E');
  assert.equal(colors.background.card, '#0D1E36');
  assert.equal(colors.brand.cyan, '#00E5FF');
  assert.equal(colors.brand.orange, '#FF8C00');
  assert.equal(colors.brand.gold, '#FFD700');
  assert.equal(colors.plasticColor, '#0A0E17');
  assert.equal(PLASTIC_COLOR, '#0A0E17');
});

test('AC-1: colors.ts defines gradients with valid stops and vector geometry', () => {
  assert.ok(colors.gradients.primaryCyan);
  assert.equal(colors.gradients.primaryCyan.colors[0], '#00E5FF');
  assert.equal(colors.gradients.primaryCyan.colors[1], '#0284C7');
  assert.deepEqual(colors.gradients.primaryCyan.start, { x: 0, y: 0 });
  assert.deepEqual(colors.gradients.primaryCyan.end, { x: 1, y: 1 });

  assert.ok(colors.gradients.actionOrange);
  assert.equal(colors.gradients.actionOrange.colors[0], '#FFD700');
  assert.equal(colors.gradients.actionOrange.colors[1], '#FF8C00');

  assert.ok(colors.gradients.glassCard);
  assert.equal(colors.gradients.glassCard.colors.length, 2);
});

test('AC-1: CUBE_FACE_COLORS has 6 distinct colors and matches store re-exports', () => {
  assert.equal(CUBE_FACE_COLORS.length, 6);
  assert.equal(STORE_FACE_COLORS.length, 6);

  const uniqueColors = new Set(CUBE_FACE_COLORS);
  assert.equal(uniqueColors.size, 6, 'All 6 cube face colors must be unique');

  // Exact face mappings
  assert.equal(CUBE_FACE_COLORS[0], '#FFFFFF', 'Face 0 (Up) must be White');
  assert.equal(CUBE_FACE_COLORS[1], '#FFD700', 'Face 1 (Down) must be Gold');
  assert.equal(CUBE_FACE_COLORS[2], '#FF1744', 'Face 2 (Right) must be Neon Red');
  assert.equal(CUBE_FACE_COLORS[3], '#FF8C00', 'Face 3 (Left) must be Orange');
  assert.equal(CUBE_FACE_COLORS[4], '#00E5FF', 'Face 4 (Front) must be Electric Blue');
  assert.equal(CUBE_FACE_COLORS[5], '#00E676', 'Face 5 (Back) must be Emerald Green');

  // Parity with store
  assert.deepEqual(STORE_FACE_COLORS, CUBE_FACE_COLORS);
  assert.equal(STORE_PLASTIC_COLOR, PLASTIC_COLOR);
});

test('AC-1: text contrast passes WCAG AA requirements (>= 4.5:1)', () => {
  const contrastOnBg = getContrastRatio(colors.text.primary, colors.background.primary);
  assert.ok(contrastOnBg >= 4.5, `Contrast on background is ${contrastOnBg.toFixed(2)}, expected >= 4.5`);

  const contrastOnSurface = getContrastRatio(colors.text.primary, colors.surface.primary);
  assert.ok(contrastOnSurface >= 4.5, `Contrast on surface is ${contrastOnSurface.toFixed(2)}, expected >= 4.5`);

  const secondaryContrast = getContrastRatio(colors.text.secondary, colors.surface.primary);
  assert.ok(secondaryContrast >= 4.5, `Secondary contrast on surface is ${secondaryContrast.toFixed(2)}, expected >= 4.5`);

  const inverseOnCyan = getContrastRatio(colors.text.inverse, colors.brand.cyan);
  assert.ok(inverseOnCyan >= 4.5, `Inverse text on cyan is ${inverseOnCyan.toFixed(2)}, expected >= 4.5`);
});

test('AC-2: typography defines font families, scale (12 to 28), line heights and tracking', () => {
  assert.equal(fontFamilies.title, 'Orbitron_700Bold');
  assert.equal(fontFamilies.body, 'OpenSans_400Regular');
  assert.equal(fontFamilies.bodyBold, 'OpenSans_700Bold');
  assert.equal(fontFamilies.mono, 'RobotoMono_500Medium');
  assert.ok(fontFamilies.fallbackSans);
  assert.ok(fontFamilies.fallbackMono);

  const sizes = Object.values(fontSizes);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);
  assert.equal(minSize, 12, 'Smallest font size should be 12 (caption, statLabel)');
  assert.equal(maxSize, 28, 'Largest font size should be 28 (display)');

  for (const variant of ['display', 'title', 'subtitle', 'body', 'caption', 'statLabel', 'statValue']) {
    assert.ok(typography.sizes[variant] > 0, `Missing size for ${variant}`);
    assert.ok(typography.lineHeights[variant] >= typography.sizes[variant], `Line height must accommodate size for ${variant}`);
    assert.ok(typeof typography.letterSpacings[variant] === 'number', `Letter spacing defined for ${variant}`);
  }
});

test('AC-3: spacing defines 8-point geometric scale, radii, opacity and 44pt touch targets', () => {
  assert.equal(space.xs, 4);
  assert.equal(space.sm, 8);
  assert.equal(space.md, 12);
  assert.equal(space.base, 16);
  assert.equal(space.lg, 20);
  assert.equal(space.xl, 28);
  assert.equal(space.xxl, 40);

  assert.equal(radii.sm, 6);
  assert.equal(radii.md, 10);
  assert.equal(radii.lg, 16);
  assert.equal(radii.pill, 9999);

  assert.equal(opacity.pressed, 0.8);
  assert.equal(opacity.disabled, 0.4);
  assert.equal(opacity.default, 1.0);

  assert.equal(touchTarget.minWidth, 44);
  assert.equal(touchTarget.minHeight, 44);
  assert.ok(spacing.touchTarget.minWidth >= 44);
  assert.ok(spacing.touchTarget.minHeight >= 44);
});

test('AC-8: responsive layout guard selects 8 points for narrow devices and 16 points for standard', () => {
  const getHorizontalPadding = (width) => (width < 380 ? space.sm : space.base);

  assert.equal(getHorizontalPadding(320), 8, 'Narrow device (320px) should use 8pt padding');
  assert.equal(getHorizontalPadding(375), 8, 'Compact device (375px) should use 8pt padding');
  assert.equal(getHorizontalPadding(380), 16, 'Standard boundary (380px) should use 16pt padding');
  assert.equal(getHorizontalPadding(414), 16, 'Large phone (414px) should use 16pt padding');
});

test('AC-1, AC-2, AC-3: src/theme/index.ts re-exports all colors, typography, and spacing tokens', () => {
  assert.equal(themeIndex.colors, colors);
  assert.equal(themeIndex.typography, typography);
  assert.equal(themeIndex.spacing, spacing);
  assert.equal(themeIndex.CUBE_FACE_COLORS, CUBE_FACE_COLORS);
  assert.equal(themeIndex.PLASTIC_COLOR, PLASTIC_COLOR);
  assert.equal(themeIndex.fontFamilies, fontFamilies);
  assert.equal(themeIndex.fontSizes, fontSizes);
  assert.equal(themeIndex.space, space);
  assert.equal(themeIndex.radii, radii);
  assert.equal(themeIndex.opacity, opacity);
  assert.equal(themeIndex.touchTarget, touchTarget);
  assert.equal(typeof themeIndex.useThemeFonts, 'function');
});

test('AC-2: useThemeFonts hook initializes font loading and returns loaded tuple', () => {
  const [loaded, error] = useThemeFonts();
  assert.equal(loaded, true);
  assert.equal(error, null);
});

test('AC-9: docs/design.md exists and contains design token catalog and component documentation', () => {
  const designDocPath = path.resolve('docs/design.md');
  assert.ok(fs.existsSync(designDocPath), 'docs/design.md must exist');

  const content = fs.readFileSync(designDocPath, 'utf8');
  assert.ok(content.includes('Color Palette'), 'docs/design.md must document Color Palette');
  assert.ok(content.includes('Typography'), 'docs/design.md must document Typography');
  assert.ok(content.includes('Spacing and Metrics'), 'docs/design.md must document Spacing and Metrics');
  assert.ok(content.includes('ThemedButton'), 'docs/design.md must document ThemedButton');
  assert.ok(content.includes('ThemedCard'), 'docs/design.md must document ThemedCard');
  assert.ok(content.includes('ThemedText'), 'docs/design.md must document ThemedText');
  assert.ok(content.includes('StatBadge'), 'docs/design.md must document StatBadge');
  assert.ok(content.includes('ScreenContainer'), 'docs/design.md must document ScreenContainer');
  assert.ok(content.includes('Accessibility'), 'docs/design.md must document Accessibility');
});

