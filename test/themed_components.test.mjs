import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StyleSheet } from 'react-native';
import { ThemedButton } from '../src/components/ui/ThemedButton.tsx';
import { ThemedCard } from '../src/components/ui/ThemedCard.tsx';
import { ThemedText } from '../src/components/ui/ThemedText.tsx';
import { StatBadge } from '../src/components/ui/StatBadge.tsx';
import { ScreenContainer } from '../src/components/ui/ScreenContainer.tsx';
import * as uiIndex from '../src/components/ui/index.ts';
import { colors } from '../src/theme/colors.ts';
import { spacing } from '../src/theme/spacing.ts';
import { typography } from '../src/theme/typography.ts';
import { __setMockInsets } from './mocks/safe-area-context.mjs';

test('AC-4: ThemedButton renders primary-cyan variant with button role and touch target bounds', () => {
  const html = renderToStaticMarkup(
    React.createElement(ThemedButton, {
      label: 'Start Game',
      variant: 'primary-cyan',
      size: 'md',
    })
  );

  assert.ok(html.includes('role="button"'), 'Button must have accessible button role');
  assert.ok(html.includes('Start Game'), 'Button must render provided label');
  assert.ok(html.includes('min-width:44px'), 'Button must enforce minimum 44 point width');
  assert.ok(html.includes('min-height:44px'), 'Button must enforce minimum 44 point height');
  assert.ok(html.includes('height:48px'), 'Medium size button must have 48 point height');
});

test('AC-4: ThemedButton renders action-orange variant with gradient fill', () => {
  const html = renderToStaticMarkup(
    React.createElement(ThemedButton, {
      label: 'Scramble',
      variant: 'action-orange',
      size: 'lg',
    })
  );

  assert.ok(html.includes('role="button"'), 'Action button must render with button role');
  assert.ok(html.includes('Scramble'), 'Action button must render label text');
  assert.ok(html.includes('height:56px'), 'Large button must have 56 point height');
});

test('AC-4: ThemedButton renders outline and ghost variants', () => {
  const outlineHtml = renderToStaticMarkup(
    React.createElement(ThemedButton, {
      label: 'Reset',
      variant: 'outline',
      size: 'sm',
    })
  );
  assert.ok(outlineHtml.includes('Reset'));
  assert.ok(outlineHtml.includes('height:44px'), 'Small button must have 44 point height');

  const ghostHtml = renderToStaticMarkup(
    React.createElement(ThemedButton, {
      label: 'Cancel',
      variant: 'ghost',
    })
  );
  assert.ok(ghostHtml.includes('Cancel'));
});

test('AC-4: ThemedButton handles disabled state and loading indicator', () => {
  const disabledHtml = renderToStaticMarkup(
    React.createElement(ThemedButton, {
      label: 'Disabled Action',
      disabled: true,
    })
  );
  assert.ok(disabledHtml.includes('aria-disabled="true"'), 'Disabled button must reflect aria-disabled state');

  const loadingHtml = renderToStaticMarkup(
    React.createElement(ThemedButton, {
      label: 'Loading Action',
      loading: true,
    })
  );
  assert.ok(
    !loadingHtml.includes('Loading Action'),
    'Label should be replaced while loading is active'
  );
});

test('AC-4: ThemedButton renders optional icon and fullWidth style', () => {
  const iconNode = React.createElement('span', { key: 'test-icon' }, '★');
  const html = renderToStaticMarkup(
    React.createElement(ThemedButton, {
      label: 'Starred',
      icon: iconNode,
      fullWidth: true,
    })
  );

  assert.ok(html.includes('★'), 'Button must render provided icon node');
  assert.ok(html.includes('Starred'), 'Button must render label alongside icon');
  assert.ok(html.includes('width:100%'), 'Button must support full width layout');
});

test('AC-5: ThemedCard renders surface variant with token padding and children', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      ThemedCard,
      { variant: 'surface', padding: 'base' },
      React.createElement('span', null, 'Card Body')
    )
  );

  assert.ok(html.includes('Card Body'), 'Card must render nested children');
  assert.ok(html.includes('16px'), 'Card with base padding must use 16px');
});

test('AC-5: ThemedCard renders glass, glow-cyan, and glow-orange variants with custom padding', () => {
  const glassHtml = renderToStaticMarkup(
    React.createElement(
      ThemedCard,
      { variant: 'glass', padding: 'sm' },
      React.createElement('span', null, 'Glass Content')
    )
  );
  assert.ok(glassHtml.includes('Glass Content'));
  assert.ok(glassHtml.includes('8px'), 'Card with sm padding must use 8px');

  const cyanHtml = renderToStaticMarkup(
    React.createElement(
      ThemedCard,
      { variant: 'glow-cyan', padding: 24 },
      React.createElement('span', null, 'Cyan Glow')
    )
  );
  assert.ok(cyanHtml.includes('Cyan Glow'));
  assert.ok(cyanHtml.includes('24px'), 'Card must accept numeric custom padding');

  const orangeHtml = renderToStaticMarkup(
    React.createElement(
      ThemedCard,
      { variant: 'glow-orange' },
      React.createElement('span', null, 'Orange Glow')
    )
  );
  assert.ok(orangeHtml.includes('Orange Glow'));
});

test('AC-6: ThemedText renders all semantic typography variants', () => {
  const variants = ['display', 'title', 'subtitle', 'body', 'caption', 'statLabel', 'statValue'];

  for (const variant of variants) {
    const html = renderToStaticMarkup(
      React.createElement(ThemedText, { variant }, `Text for ${variant}`)
    );
    assert.ok(html.includes(`Text for ${variant}`), `ThemedText must render text for ${variant}`);
  }
});

test('AC-6: ThemedText supports color overrides and text alignment', () => {
  const element = React.createElement(ThemedText, {
    variant: 'title',
    color: '#00E5FF',
    align: 'center',
    children: 'Aligned Title',
  });

  const html = renderToStaticMarkup(element);
  assert.ok(html.includes('Aligned Title'));
  assert.ok(html.includes('text-align:center') || html.includes('textAlign:center'));
});

test('AC-6: ThemedText allows font scaling for accessibility', () => {
  const element = ThemedText({
    variant: 'body',
    children: 'Accessible Text',
  });

  assert.equal(element.props.allowFontScaling, true, 'allowFontScaling must be enabled for accessibility');
});

test('AC-7: StatBadge renders category label in uppercase and numeric value', () => {
  const badge = StatBadge({
    label: 'moves',
    value: 42,
    variant: 'cyan',
  });
  const flatStyle = StyleSheet.flatten(badge.props.style);
  assert.equal(flatStyle.minHeight, 44, 'StatBadge must maintain minimum 44 point touch target height');

  const html = renderToStaticMarkup(
    React.createElement(StatBadge, {
      label: 'moves',
      value: 42,
      variant: 'cyan',
    })
  );

  assert.ok(html.includes('MOVES'), 'StatBadge must render uppercase label');
  assert.ok(html.includes('42'), 'StatBadge must render numeric value');
});

test('AC-7: StatBadge renders icon and supports orange and gold variants', () => {
  const htmlTimer = renderToStaticMarkup(
    React.createElement(StatBadge, {
      icon: 'timer-outline',
      label: 'time',
      value: '01:23.4',
      variant: 'gold',
    })
  );
  assert.ok(htmlTimer.includes('TIME'));
  assert.ok(htmlTimer.includes('01:23.4'));
  assert.ok(htmlTimer.includes('icon-timer-outline'), 'StatBadge must render requested icon');

  const htmlMoves = renderToStaticMarkup(
    React.createElement(StatBadge, {
      icon: 'swap-vertical-outline',
      label: 'count',
      value: '18',
      variant: 'orange',
    })
  );
  assert.ok(htmlMoves.includes('COUNT'));
  assert.ok(htmlMoves.includes('18'));
  assert.ok(htmlMoves.includes('icon-swap-vertical-outline'));
});

test('AC-8: ScreenContainer renders background and children in non scrollable mode', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      ScreenContainer,
      { backgroundColor: '#070F1E' },
      React.createElement('span', null, 'Screen Child')
    )
  );

  assert.ok(html.includes('Screen Child'), 'ScreenContainer must render child elements');
  assert.ok(html.includes('background-color:rgba(7,15,30,1.00)'), 'ScreenContainer must apply background color');
});

test('AC-8: ScreenContainer renders ScrollView when scrollable is true', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      ScreenContainer,
      { scrollable: true },
      React.createElement('div', null, 'Scrollable Content')
    )
  );

  assert.ok(html.includes('Scrollable Content'), 'ScreenContainer must contain children');
  assert.ok(html.includes('overflow'), 'ScrollView container must configure overflow');
});

test('AC-8: ScreenContainer filters safeAreaEdges correctly', () => {
  __setMockInsets({ top: 44, bottom: 34, left: 10, right: 10 });
  const html = renderToStaticMarkup(
    React.createElement(
      ScreenContainer,
      { safeAreaEdges: ['top'] },
      React.createElement('div', null, 'Top Inset Only')
    )
  );

  assert.ok(html.includes('padding-top:44px'), 'Top inset must be 44px');
  assert.ok(html.includes('padding-bottom:0px'), 'Bottom inset must be 0px when filtered out');
});

test('UI barrel export: src/components/ui/index.ts exports all five foundation primitives', () => {
  assert.equal(typeof uiIndex.ThemedButton, 'function');
  assert.equal(typeof uiIndex.ThemedCard, 'function');
  assert.equal(typeof uiIndex.ThemedText, 'function');
  assert.equal(typeof uiIndex.StatBadge, 'function');
  assert.equal(typeof uiIndex.ScreenContainer, 'function');
});
