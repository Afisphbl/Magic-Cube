import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VictoryCard } from '../src/components/VictoryCard.tsx';
import { GameOverlay } from '../src/components/GameOverlay.tsx';
import { useCubeStore } from '../src/store/useCubeStore.ts';
import { createSolveRecord } from '../src/logic/timer.ts';

test('AC-7: VictoryCard returns null when not in STOPPED state', () => {
  useCubeStore.getState().resetGame();
  useCubeStore.setState({
    timerStatus: 'IDLE',
    latestSolve: null,
  });

  const html = renderToStaticMarkup(React.createElement(VictoryCard));
  assert.equal(html, '');
});

test('AC-7: VictoryCard returns null when dismissed even if solve record exists', () => {
  useCubeStore.getState().resetGame();
  const record = createSolveRecord({
    timeMs: 12500,
    moveCount: 28,
    scrambleNotation: "R U R' U'",
  });

  useCubeStore.setState({
    timerStatus: 'STOPPED',
    latestSolve: record,
    isVictoryDismissed: true,
  });

  const html = renderToStaticMarkup(React.createElement(VictoryCard));
  assert.equal(html, '');
});

test('AC-7: VictoryCard renders celebration, solve time, moves, and TPS when visible', () => {
  const record = createSolveRecord({
    timeMs: 14250,
    moveCount: 32,
    scrambleNotation: "R U R' U'",
  });

  const html = renderToStaticMarkup(
    React.createElement(VictoryCard, {
      solveRecord: record,
      isDismissed: false,
    })
  );

  assert.ok(html.includes('CUBE SOLVED!'), 'Must display celebration title');
  assert.ok(html.includes('14.25'), 'Must render formatted solve time');
  assert.ok(html.includes('32'), 'Must display move count');
  assert.ok(html.includes('2.25 /s'), 'Must display turns per second metric');
  assert.ok(html.includes('SCRAMBLE AGAIN'), 'Must render primary action button');
  assert.ok(html.includes('DISMISS'), 'Must render secondary dismiss action');
  assert.ok(html.includes("R U R&#x27; U&#x27;") || html.includes("R U R' U'"), 'Must render scramble sequence');
});

test('AC-7: VictoryCard omits scramble sequence block when notation is empty', () => {
  const record = createSolveRecord({
    timeMs: 8200,
    moveCount: 18,
    scrambleNotation: '',
  });

  const html = renderToStaticMarkup(
    React.createElement(VictoryCard, {
      solveRecord: record,
      isDismissed: false,
    })
  );

  assert.ok(html.includes('CUBE SOLVED!'), 'Must display celebration title');
  assert.ok(!html.includes('SCRAMBLE SEQUENCE'), 'Must omit scramble sequence block when notation is empty');
});

test('AC-7: VictoryCard renders accessibility roles and labels on action buttons', () => {
  const record = createSolveRecord({
    timeMs: 9100,
    moveCount: 22,
    scrambleNotation: 'U R U',
  });

  const html = renderToStaticMarkup(
    React.createElement(VictoryCard, {
      solveRecord: record,
      isDismissed: false,
    })
  );

  assert.ok(html.includes('role="button"'), 'Buttons must render with accessible button role');
});

test('AC-7: VictoryCard executes onScrambleAgain and onDismiss callback props', () => {
  const record = createSolveRecord({
    timeMs: 11000,
    moveCount: 25,
    scrambleNotation: 'F R U',
  });

  let scrambleAgainCalled = false;
  let dismissCalled = false;

  const element = React.createElement(VictoryCard, {
    solveRecord: record,
    isDismissed: false,
    onScrambleAgain: () => { scrambleAgainCalled = true; },
    onDismiss: () => { dismissCalled = true; },
  });

  assert.equal(typeof element.props.onScrambleAgain, 'function');
  assert.equal(typeof element.props.onDismiss, 'function');

  element.props.onScrambleAgain();
  element.props.onDismiss();

  assert.equal(scrambleAgainCalled, true, 'onScrambleAgain prop should be executable');
  assert.equal(dismissCalled, true, 'onDismiss prop should be executable');
});

test('AC-4: GameOverlay renders HUD timer badge and move counter badge', () => {
  const html = renderToStaticMarkup(
    React.createElement(GameOverlay, {
      moveCount: 15,
      timerText: '0.00',
    })
  );

  assert.ok(html.includes('TIME'), 'Must render Time HUD badge');
  assert.ok(html.includes('MOVES'), 'Must render Moves HUD badge');
  assert.ok(html.includes('0.00'), 'Must display idle timer default');
  assert.ok(html.includes('15'), 'Must display current move count');
});

test('AC-4: GameOverlay renders active running timer and custom move count', () => {
  const html = renderToStaticMarkup(
    React.createElement(GameOverlay, {
      moveCount: 42,
      timerText: '1:23.45',
    })
  );

  assert.ok(html.includes('1:23.45'), 'Must display active timer text');
  assert.ok(html.includes('42'), 'Must display updated move count');
});

test('AC-4: GameOverlay renders Scrambling banner with Skip button during SCRAMBLING phase', () => {
  const html = renderToStaticMarkup(
    React.createElement(GameOverlay, {
      gamePhase: 'SCRAMBLING',
    })
  );

  assert.ok(html.includes('Scrambling...'), 'Must render scrambling banner text');
  assert.ok(html.includes('Skip'), 'Must render Skip button');
  assert.ok(html.includes('aria-label="Skip scramble"'), 'Skip button must have accessible label');
});

test('AC-4: GameOverlay renders control and orientation buttons', () => {
  const html = renderToStaticMarkup(
    React.createElement(GameOverlay, {
      moveCount: 0,
      timerText: '0.00',
    })
  );

  assert.ok(html.includes('Yellow Top'), 'Must render default orientation preset');
  assert.ok(html.includes('Reset View'), 'Must render Reset View button');
  assert.ok(html.includes('Scramble'), 'Must render Scramble button');
  assert.ok(html.includes('Reset Game'), 'Must render Reset Game button');
});
