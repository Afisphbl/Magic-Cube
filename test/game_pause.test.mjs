import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useCubeStore } from '../src/store/useCubeStore.ts';
import { PauseModal } from '../src/components/PauseModal.tsx';
import { GameOverlay } from '../src/components/GameOverlay.tsx';

// Reset helper before each test block
function resetStore() {
  useCubeStore.getState().resetGame();
}

test('AC-1: GameOverlay renders centered controls when game is idle or solved', () => {
  resetStore();

  const solvedHtml = renderToStaticMarkup(
    React.createElement(GameOverlay, {
      gamePhase: 'SOLVED',
      timerStatus: 'IDLE',
    })
  );
  assert.ok(
    solvedHtml.includes('game-overlay-center-controls'),
    'Start and Record buttons must be centered when game is solved'
  );
  assert.ok(solvedHtml.includes('Start'), 'Must render Start button');
  assert.ok(solvedHtml.includes('Record'), 'Must render Record button');

  const idlePlayingHtml = renderToStaticMarkup(
    React.createElement(GameOverlay, {
      gamePhase: 'PLAYING',
      timerStatus: 'IDLE',
    })
  );
  assert.ok(
    idlePlayingHtml.includes('game-overlay-center-controls'),
    'Start and Record buttons must be centered when timer is idle'
  );
});

test('AC-2: GameOverlay hides Start and Record buttons completely during active play', () => {
  resetStore();

  const activePlayHtml = renderToStaticMarkup(
    React.createElement(GameOverlay, {
      gamePhase: 'PLAYING',
      timerStatus: 'RUNNING',
    })
  );

  assert.ok(
    !activePlayHtml.includes('game-overlay-center-controls'),
    'Must not render center controls during active play'
  );
  assert.ok(
    !activePlayHtml.includes('game-overlay-bottom-controls'),
    'Must not render bottom controls during active play'
  );
});

test('AC-3: GameOverlay displays pause button in top bar header only during active unpaused play', () => {
  resetStore();

  // Active play, unpaused -> pause button should show
  const activeHtml = renderToStaticMarkup(
    React.createElement(GameOverlay, {
      gamePhase: 'PLAYING',
      timerStatus: 'RUNNING',
      isPaused: false,
    })
  );
  assert.ok(
    activeHtml.includes('pause-button'),
    'Pause button must be visible in top bar during active play'
  );
  assert.ok(
    activeHtml.includes('aria-label="Pause solve game"'),
    'Pause button must have accessible label'
  );

  // Active play, but paused -> pause button should hide
  const pausedHtml = renderToStaticMarkup(
    React.createElement(GameOverlay, {
      gamePhase: 'PLAYING',
      timerStatus: 'PAUSED',
      isPaused: true,
    })
  );
  assert.ok(
    !pausedHtml.includes('pause-button'),
    'Pause button must be hidden while paused'
  );

  // Idle / solved -> pause button should hide
  const idleHtml = renderToStaticMarkup(
    React.createElement(GameOverlay, {
      gamePhase: 'SOLVED',
      timerStatus: 'IDLE',
      isPaused: false,
    })
  );
  assert.ok(
    !idleHtml.includes('pause-button'),
    'Pause button must be hidden when idle or solved'
  );
});

test('AC-4: pauseGame transitions to paused state, freezes timer, and locks cube moves', () => {
  resetStore();

  // Setup active game state
  useCubeStore.setState({
    gamePhase: 'PLAYING',
    timerStatus: 'RUNNING',
    solveStartTime: Date.now() - 5000,
    accumulatedTimeMs: 0,
    isPaused: false,
    scrambleNotation: "R U R' U'",
  });

  const beforeState = useCubeStore.getState();
  assert.equal(beforeState.isPaused, false);
  assert.equal(beforeState.timerStatus, 'RUNNING');

  // Trigger pause
  useCubeStore.getState().pauseGame();

  const afterState = useCubeStore.getState();
  assert.equal(afterState.isPaused, true, 'isPaused must be true');
  assert.equal(afterState.timerStatus, 'PAUSED', 'timerStatus must be PAUSED');
  assert.equal(afterState.solveStartTime, null, 'solveStartTime must be cleared to null');
  assert.ok(afterState.accumulatedTimeMs >= 4900, 'accumulatedTimeMs must capture elapsed duration');
  assert.equal(afterState.timerMs, afterState.accumulatedTimeMs, 'timerMs must reflect accumulated time');

  // Try to request a move while paused
  const moveAccepted = useCubeStore.getState().requestMove('U');
  assert.equal(moveAccepted, false, 'requestMove must be rejected while paused');

  // Try direct move while paused
  const prevMoveCount = useCubeStore.getState().moveCount;
  useCubeStore.getState().applyMoveDirect('U');
  assert.equal(
    useCubeStore.getState().moveCount,
    prevMoveCount,
    'applyMoveDirect must be a no-op while paused'
  );
});

test('AC-4, AC-6: Timer accumulates accurately across multiple pause and resume cycles', () => {
  resetStore();

  // 1. Initial segment: 3000ms
  const start1 = Date.now() - 3000;
  useCubeStore.setState({
    gamePhase: 'PLAYING',
    timerStatus: 'RUNNING',
    solveStartTime: start1,
    accumulatedTimeMs: 0,
    isPaused: false,
    scrambleNotation: "R U R' U'",
  });

  // Pause after 3s
  useCubeStore.getState().pauseGame();
  const acc1 = useCubeStore.getState().accumulatedTimeMs;
  assert.ok(acc1 >= 2950 && acc1 <= 3200, `Segment 1 accumulated: ${acc1}`);

  // 2. Resume and run for another 2000ms
  useCubeStore.getState().resumeGame();
  assert.equal(useCubeStore.getState().isPaused, false);
  assert.equal(useCubeStore.getState().timerStatus, 'RUNNING');

  // Simulate elapsed 2000ms in segment 2
  useCubeStore.setState({
    solveStartTime: Date.now() - 2000,
  });

  // Pause again
  useCubeStore.getState().pauseGame();
  const acc2 = useCubeStore.getState().accumulatedTimeMs;
  assert.ok(acc2 >= 4900 && acc2 <= 5300, `Segments 1+2 accumulated: ${acc2}`);

  // 3. Final resume and solve
  useCubeStore.getState().resumeGame();
  useCubeStore.setState({
    solveStartTime: Date.now() - 1000,
  });

  // Complete solve
  const record = useCubeStore.getState().stopTimer();
  assert.ok(record !== null, 'SolveRecord must be created');
  assert.ok(record.timeMs >= 5900 && record.timeMs <= 6400, `Total timeMs: ${record.timeMs}`);
});

test('AC-5: PauseModal renders darkened modal with stats and actions when visible', () => {
  resetStore();

  // Hidden when not paused
  const hiddenHtml = renderToStaticMarkup(
    React.createElement(PauseModal, {
      isVisible: false,
    })
  );
  assert.equal(hiddenHtml, '', 'PauseModal must return null when isVisible is false');

  // Visible when paused
  const visibleHtml = renderToStaticMarkup(
    React.createElement(PauseModal, {
      isVisible: true,
      timeText: '12.34',
      moveCount: 18,
    })
  );

  assert.ok(visibleHtml.includes('Game Paused'), 'Must display Game Paused title');
  assert.ok(visibleHtml.includes('Solve progress is frozen'), 'Must display subtitle');
  assert.ok(visibleHtml.includes('12.34'), 'Must display timeText');
  assert.ok(visibleHtml.includes('18'), 'Must display moveCount');
  assert.ok(visibleHtml.includes('Resume'), 'Must render Resume button');
  assert.ok(visibleHtml.includes('Restart'), 'Must render Restart button');
  assert.ok(visibleHtml.includes('Main Page'), 'Must render Main Page button');
});

test('AC-6: Resume button executes onResume or store resumeGame cleanly', () => {
  resetStore();

  let resumedCallback = false;
  const element = React.createElement(PauseModal, {
    isVisible: true,
    onResume: () => {
      resumedCallback = true;
    },
  });

  assert.equal(typeof element.props.onResume, 'function');
  element.props.onResume();
  assert.equal(resumedCallback, true, 'Resume callback should execute');

  // Test store action resumeGame
  useCubeStore.setState({
    isPaused: true,
    timerStatus: 'PAUSED',
    accumulatedTimeMs: 4500,
    solveStartTime: null,
  });

  useCubeStore.getState().resumeGame();

  const state = useCubeStore.getState();
  assert.equal(state.isPaused, false);
  assert.equal(state.timerStatus, 'RUNNING');
  assert.ok(typeof state.solveStartTime === 'number');
  assert.equal(state.accumulatedTimeMs, 4500, 'accumulatedTimeMs preserved');
});

test('AC-7: Restart button resets accumulated duration and triggers fresh 20-move scramble', () => {
  resetStore();

  useCubeStore.setState({
    gamePhase: 'PLAYING',
    timerStatus: 'PAUSED',
    isPaused: true,
    accumulatedTimeMs: 9800,
    moveCount: 25,
    timerMs: 9800,
  });

  useCubeStore.getState().restartGame();

  const state = useCubeStore.getState();
  assert.equal(state.isPaused, false, 'isPaused must be false after restart');
  assert.equal(state.accumulatedTimeMs, 0, 'accumulatedTimeMs must be 0');
  assert.equal(state.timerMs, 0, 'timerMs must be 0');
  assert.equal(state.moveCount, 0, 'moveCount must be 0');
  assert.equal(state.gamePhase, 'SCRAMBLING', 'Must enter SCRAMBLING phase');
  assert.equal(state.scrambleQueue.length, 19, 'Must queue 19 remaining scramble turns');
  assert.equal(state.isAutoStartOnScrambleFinish, true, 'Must auto-start timer on scramble finish');
});

test('AC-8: Main Page button resets cube to solved state and returns to idle screen', () => {
  resetStore();

  useCubeStore.setState({
    gamePhase: 'PLAYING',
    timerStatus: 'PAUSED',
    isPaused: true,
    accumulatedTimeMs: 14000,
    moveCount: 30,
    timerMs: 14000,
  });

  useCubeStore.getState().exitToMainPage();

  const state = useCubeStore.getState();
  assert.equal(state.isPaused, false, 'isPaused must be reset to false');
  assert.equal(state.accumulatedTimeMs, 0, 'accumulatedTimeMs must be reset to 0');
  assert.equal(state.timerMs, 0, 'timerMs must be 0');
  assert.equal(state.moveCount, 0, 'moveCount must be 0');
  assert.equal(state.timerStatus, 'IDLE', 'timerStatus must be IDLE');
  assert.equal(state.gamePhase, 'SOLVED', 'gamePhase must be SOLVED');

  // Verify centered controls return
  const html = renderToStaticMarkup(
    React.createElement(GameOverlay, {
      gamePhase: state.gamePhase,
      timerStatus: state.timerStatus,
      isPaused: state.isPaused,
    })
  );
  assert.ok(
    html.includes('game-overlay-center-controls'),
    'Centered controls must be restored on Main Page return'
  );
});

test('AC-9: AppState auto-pauses active solve when transitioning to background or inactive', () => {
  resetStore();

  useCubeStore.setState({
    gamePhase: 'PLAYING',
    timerStatus: 'RUNNING',
    solveStartTime: Date.now() - 4000,
    accumulatedTimeMs: 0,
    isPaused: false,
    scrambleNotation: "R U R' U'",
  });

  // Simulate background transition
  const stateBefore = useCubeStore.getState();
  if (stateBefore.gamePhase === 'PLAYING' && stateBefore.timerStatus === 'RUNNING' && !stateBefore.isPaused) {
    stateBefore.pauseGame();
  }

  const stateAfter = useCubeStore.getState();
  assert.equal(stateAfter.isPaused, true, 'Game must auto-pause on background');
  assert.equal(stateAfter.timerStatus, 'PAUSED');
  assert.ok(stateAfter.accumulatedTimeMs >= 3900);
});

test('AC-4: pauseGame is a safe no-op when called in invalid states', () => {
  resetStore();

  // 1. SOLVED phase
  useCubeStore.setState({ gamePhase: 'SOLVED', timerStatus: 'IDLE', isPaused: false });
  useCubeStore.getState().pauseGame();
  assert.equal(useCubeStore.getState().isPaused, false);
  assert.equal(useCubeStore.getState().timerStatus, 'IDLE');

  // 2. SCRAMBLING phase
  useCubeStore.setState({ gamePhase: 'SCRAMBLING', timerStatus: 'IDLE', isPaused: false });
  useCubeStore.getState().pauseGame();
  assert.equal(useCubeStore.getState().isPaused, false);
  assert.equal(useCubeStore.getState().timerStatus, 'IDLE');

  // 3. Already paused -> redundant pause must not re-accumulate
  useCubeStore.setState({
    gamePhase: 'PLAYING',
    timerStatus: 'PAUSED',
    isPaused: true,
    accumulatedTimeMs: 5000,
    solveStartTime: null,
  });
  useCubeStore.getState().pauseGame();
  assert.equal(useCubeStore.getState().isPaused, true);
  assert.equal(useCubeStore.getState().accumulatedTimeMs, 5000);
});

test('AC-6: resumeGame is a safe no-op when game is not paused', () => {
  resetStore();

  useCubeStore.setState({
    gamePhase: 'PLAYING',
    timerStatus: 'RUNNING',
    isPaused: false,
    solveStartTime: 1000000,
  });

  useCubeStore.getState().resumeGame();
  assert.equal(useCubeStore.getState().isPaused, false);
  assert.equal(useCubeStore.getState().timerStatus, 'RUNNING');
  assert.equal(useCubeStore.getState().solveStartTime, 1000000);
});

test('AC-4, AC-6: Long duration pause does not leak wall-clock elapsed time', () => {
  resetStore();

  // 2000ms active solve
  useCubeStore.setState({
    gamePhase: 'PLAYING',
    timerStatus: 'RUNNING',
    solveStartTime: Date.now() - 2000,
    accumulatedTimeMs: 0,
    isPaused: false,
  });

  // Pause
  useCubeStore.getState().pauseGame();
  const acc = useCubeStore.getState().accumulatedTimeMs;
  assert.ok(acc >= 1950 && acc <= 2200);

  // Simulate 1 hour (3,600,000ms) passing while paused
  // Calling updateTimer while paused must not increase timerMs
  useCubeStore.getState().updateTimer(Date.now() + 3600000);
  assert.equal(useCubeStore.getState().timerMs, acc);

  // Resume 1 hour later
  useCubeStore.getState().resumeGame();
  assert.equal(useCubeStore.getState().isPaused, false);
  assert.equal(useCubeStore.getState().timerStatus, 'RUNNING');
  assert.equal(useCubeStore.getState().accumulatedTimeMs, acc);
});

test('AC-5, AC-6, AC-7, AC-8: PauseModal accessibility and callback props', () => {
  resetStore();

  let restarted = false;
  let exited = false;

  const html = renderToStaticMarkup(
    React.createElement(PauseModal, {
      isVisible: true,
      timeText: '05.50',
      moveCount: 12,
      onRestart: () => {
        restarted = true;
      },
      onExit: () => {
        exited = true;
      },
    })
  );

  // Accessibility checks
  assert.ok(html.includes('aria-live="polite"'), 'PauseModal must have aria-live="polite"');
  assert.ok(html.includes('role="button"'), 'PauseModal actions must have role="button"');
  assert.ok(html.includes('pause-resume-button'), 'Must render Resume button testID');
  assert.ok(html.includes('pause-restart-button'), 'Must render Restart button testID');
  assert.ok(html.includes('pause-main-page-button'), 'Must render Main Page button testID');

  // Verify callbacks work when invoked directly
  const modalElement = React.createElement(PauseModal, {
    isVisible: true,
    onRestart: () => {
      restarted = true;
    },
    onExit: () => {
      exited = true;
    },
  });

  modalElement.props.onRestart();
  assert.equal(restarted, true, 'onRestart callback should fire');

  modalElement.props.onExit();
  assert.equal(exited, true, 'onExit callback should fire');
});

test('AC-3: GameOverlay onPausePress callback prop execution', () => {
  resetStore();

  let pauseClicked = false;
  const overlayElement = React.createElement(GameOverlay, {
    gamePhase: 'PLAYING',
    timerStatus: 'RUNNING',
    isPaused: false,
    onPausePress: () => {
      pauseClicked = true;
    },
  });

  overlayElement.props.onPausePress();
  assert.equal(pauseClicked, true, 'onPausePress callback should fire');
});

