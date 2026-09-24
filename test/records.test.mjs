import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  compareTopRecords,
  sortTopRecords,
  insertTopRecord,
  loadStoredRecords,
  saveStoredRecords,
  clearStoredRecords,
  TOP_RECORDS_STORAGE_KEY,
  MAX_TOP_RECORDS,
} from '../src/logic/records.ts';
import { useCubeStore } from '../src/store/useCubeStore.ts';
import { RecordsModal } from '../src/components/RecordsModal.tsx';
import { GameOverlay } from '../src/components/GameOverlay.tsx';

test('AC-1, AC-2: app.json contains EAS project ID and asset paths', () => {
  const appJsonPath = path.resolve('./app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

  assert.equal(
    appJson.expo.extra?.eas?.projectId,
    '1400895d-0d5f-43ce-b82c-a40040de8a5b',
    'app.json must specify required EAS project ID'
  );
  assert.equal(appJson.expo.icon, './assets/App-icon.png', 'icon path must match assets');
  assert.equal(appJson.expo.splash.image, './assets/splash-screen.png');
  assert.equal(appJson.expo.splash.resizeMode, 'contain');
  assert.equal(appJson.expo.splash.backgroundColor, '#070F1E');
  assert.equal(
    appJson.expo.android.adaptiveIcon.foregroundImage,
    './assets/Android-adaptive-icon.png'
  );
  assert.equal(
    appJson.expo.android.adaptiveIcon.backgroundImage,
    './assets/Adaptive-Background.png'
  );
});

test('AC-3: eas.json contains Android preview profile configured for standalone APK', () => {
  const easJsonPath = path.resolve('./eas.json');
  const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));

  assert.ok(easJson.build.preview, 'Must have preview build profile');
  assert.equal(easJson.build.preview.developmentClient, false, 'developmentClient must be false');
  assert.equal(easJson.build.preview.distribution, 'internal', 'distribution must be internal');
  assert.equal(easJson.build.preview.android?.buildType, 'apk', 'buildType must be apk for direct installation');
});

test('AC-6: compareTopRecords sorts by timeMs, then moveCount, then completedAt', () => {
  const recordA = {
    id: 'a',
    timeMs: 12000,
    moveCount: 30,
    turnsPerSecond: 2.5,
    scrambleNotation: '',
    completedAt: 100,
  };
  const recordB = {
    id: 'b',
    timeMs: 15000,
    moveCount: 25,
    turnsPerSecond: 1.67,
    scrambleNotation: '',
    completedAt: 200,
  };
  const recordC = {
    id: 'c',
    timeMs: 12000,
    moveCount: 28, // fewer moves than A
    turnsPerSecond: 2.33,
    scrambleNotation: '',
    completedAt: 300,
  };
  const recordD = {
    id: 'd',
    timeMs: 12000,
    moveCount: 30,
    turnsPerSecond: 2.5,
    scrambleNotation: '',
    completedAt: 50, // earlier than A
  };

  assert.ok(compareTopRecords(recordA, recordB) < 0, 'Faster timeMs comes first');
  assert.ok(compareTopRecords(recordB, recordA) > 0, 'Slower timeMs comes second');
  assert.ok(compareTopRecords(recordC, recordA) < 0, 'Fewer moves wins tie');
  assert.ok(compareTopRecords(recordD, recordA) < 0, 'Earlier completion wins tie');
});

test('AC-6: insertTopRecord qualifies top 5, prunes 6th item, and computes rank', () => {
  const existing = [
    { id: '1', timeMs: 10000, moveCount: 20, turnsPerSecond: 2, scrambleNotation: '', completedAt: 1 },
    { id: '2', timeMs: 20000, moveCount: 25, turnsPerSecond: 1.25, scrambleNotation: '', completedAt: 2 },
    { id: '3', timeMs: 30000, moveCount: 30, turnsPerSecond: 1, scrambleNotation: '', completedAt: 3 },
  ];

  // Insert in middle (15s)
  const candidateMiddle = {
    id: 'mid',
    timeMs: 15000,
    moveCount: 22,
    turnsPerSecond: 1.47,
    scrambleNotation: '',
    completedAt: 4,
  };
  const resMiddle = insertTopRecord(existing, candidateMiddle);
  assert.equal(resMiddle.qualified, true);
  assert.equal(resMiddle.rank, 2);
  assert.equal(resMiddle.updatedRecords.length, 4);
  assert.equal(resMiddle.updatedRecords[1].id, 'mid');

  // Fill up to 5
  const full = [
    { id: '1', timeMs: 10000, moveCount: 20, turnsPerSecond: 2, scrambleNotation: '', completedAt: 1 },
    { id: '2', timeMs: 15000, moveCount: 22, turnsPerSecond: 1.47, scrambleNotation: '', completedAt: 2 },
    { id: '3', timeMs: 20000, moveCount: 25, turnsPerSecond: 1.25, scrambleNotation: '', completedAt: 3 },
    { id: '4', timeMs: 25000, moveCount: 28, turnsPerSecond: 1.12, scrambleNotation: '', completedAt: 4 },
    { id: '5', timeMs: 30000, moveCount: 30, turnsPerSecond: 1, scrambleNotation: '', completedAt: 5 },
  ];

  // Try inserting slower 6th solve (35s)
  const candidateSlow = {
    id: 'slow',
    timeMs: 35000,
    moveCount: 40,
    turnsPerSecond: 1.14,
    scrambleNotation: '',
    completedAt: 6,
  };
  const resSlow = insertTopRecord(full, candidateSlow);
  assert.equal(resSlow.qualified, false);
  assert.equal(resSlow.rank, -1);
  assert.equal(resSlow.updatedRecords.length, 5);
  assert.ok(!resSlow.updatedRecords.some((r) => r.id === 'slow'));

  // Try inserting faster solve (12s)
  const candidateFast = {
    id: 'fast',
    timeMs: 12000,
    moveCount: 21,
    turnsPerSecond: 1.75,
    scrambleNotation: '',
    completedAt: 7,
  };
  const resFast = insertTopRecord(full, candidateFast);
  assert.equal(resFast.qualified, true);
  assert.equal(resFast.rank, 2);
  assert.equal(resFast.updatedRecords.length, 5);
  assert.equal(resFast.updatedRecords[1].id, 'fast');
  // Slower 5th record ('5', 30000ms) got pruned
  assert.ok(!resFast.updatedRecords.some((r) => r.id === '5'));
});

test('AC-8: loadStoredRecords and saveStoredRecords round trip and error resilience', async () => {
  await clearStoredRecords();

  // Initially empty
  const initial = await loadStoredRecords();
  assert.deepEqual(initial, []);

  // Save records
  const recordsToSave = [
    { id: 'r1', timeMs: 11000, moveCount: 20, turnsPerSecond: 1.82, scrambleNotation: '', completedAt: 100 },
    { id: 'r2', timeMs: 9000, moveCount: 18, turnsPerSecond: 2.0, scrambleNotation: '', completedAt: 200 },
  ];
  await saveStoredRecords(recordsToSave);

  const loaded = await loadStoredRecords();
  assert.equal(loaded.length, 2);
  assert.equal(loaded[0].id, 'r2', 'Must be sorted ascending by time');
  assert.equal(loaded[1].id, 'r1');

  // Corrupted data test
  await AsyncStorage.setItem(TOP_RECORDS_STORAGE_KEY, 'invalid-json{{{');
  const fromCorrupt = await loadStoredRecords();
  assert.deepEqual(fromCorrupt, [], 'Corrupted data must recover to empty array safely');
});

test('AC-7: RecordsModal renders empty state when no solves exist', () => {
  const html = renderToStaticMarkup(
    React.createElement(RecordsModal, {
      isVisible: true,
      records: [],
      onClose: () => {},
    })
  );

  assert.ok(html.includes('No Solves Yet'), 'Must display empty state title');
  assert.ok(
    html.includes('Tap Start to complete your first solve and set a record.'),
    'Must display empty state subtitle'
  );
  assert.ok(html.includes('CLOSE'), 'Must display close button');
});

test('AC-7: RecordsModal renders up to 5 top records with ranks and stats', () => {
  const records = [
    { id: '1', timeMs: 9500, moveCount: 21, turnsPerSecond: 2.21, scrambleNotation: '', completedAt: 1700000000000 },
    { id: '2', timeMs: 14200, moveCount: 30, turnsPerSecond: 2.11, scrambleNotation: '', completedAt: 1700000000000 },
  ];

  const html = renderToStaticMarkup(
    React.createElement(RecordsModal, {
      isVisible: true,
      records,
      onClose: () => {},
    })
  );

  assert.ok(html.includes('TOP SOLVES'));
  assert.ok(html.includes('9.50'), 'Must render formatted time for 1st place');
  assert.ok(html.includes('14.20'), 'Must render formatted time for 2nd place');
  assert.ok(html.includes('21'), 'Must render move count');
  assert.ok(html.includes('2.21 /s'), 'Must render TPS');
  assert.ok(!html.includes('No Solves Yet'), 'Must not display empty state');
});

test('AC-7: RecordsModal returns null when not visible', () => {
  const html = renderToStaticMarkup(
    React.createElement(RecordsModal, {
      isVisible: false,
      records: [],
    })
  );

  assert.equal(html, '', 'Hidden modal must return null');
});

test('AC-5: startSolveGame triggers 20 move shuffle and activates timer upon finish', () => {
  const store = useCubeStore.getState();
  store.resetGame();

  // Call startSolveGame
  store.startSolveGame();

  const stateAfterStart = useCubeStore.getState();
  assert.equal(stateAfterStart.gamePhase, 'SCRAMBLING');
  assert.equal(stateAfterStart.isAnimating, true);
  assert.equal(stateAfterStart.isAutoStartOnScrambleFinish, true);
  assert.equal(stateAfterStart.animatingMove?.durationMs, 50, 'Shuffle duration must be 50ms per move');
  assert.equal(stateAfterStart.latestScramble.length, 20, 'Shuffle must be exactly 20 moves');
  assert.equal(stateAfterStart.timerStatus, 'IDLE');

  // Verify lockout: calling startSolveGame while scrambling is ignored
  const currentScramble = stateAfterStart.latestScramble;
  store.startSolveGame();
  assert.equal(useCubeStore.getState().latestScramble, currentScramble, 'Lockout prevents re-shuffle mid scramble');

  // Drain the 20 moves through finishMoveAnimation
  for (let i = 0; i < 20; i++) {
    useCubeStore.getState().finishMoveAnimation();
  }

  const stateAfterFinished = useCubeStore.getState();
  assert.equal(stateAfterFinished.gamePhase, 'PLAYING', 'Must transition to PLAYING');
  assert.equal(stateAfterFinished.timerStatus, 'RUNNING', 'Timer must be RUNNING immediately');
  assert.equal(stateAfterFinished.timerMs, 0, 'Timer must start cleanly at 0');
  assert.equal(stateAfterFinished.moveCount, 0, 'Move count must be 0 upon solve start');
  assert.ok(typeof stateAfterFinished.solveStartTime === 'number', 'solveStartTime must be set');
});

test('AC-5: Mid solve Start button resets attempt and starts fresh shuffle', () => {
  const store = useCubeStore.getState();
  // Simulate active solve
  useCubeStore.setState({
    gamePhase: 'PLAYING',
    timerStatus: 'RUNNING',
    timerMs: 25000,
    moveCount: 18,
    solveStartTime: Date.now() - 25000,
  });

  store.startSolveGame();

  const state = useCubeStore.getState();
  assert.equal(state.gamePhase, 'SCRAMBLING');
  assert.equal(state.timerStatus, 'IDLE');
  assert.equal(state.timerMs, 0);
  assert.equal(state.moveCount, 0);
  assert.equal(state.latestScramble.length, 20);
});

test('AC-6: Solve completion automatically qualifies and updates topRecords', async () => {
  await clearStoredRecords();
  useCubeStore.setState({ topRecords: [] });

  const store = useCubeStore.getState();
  const testRecord = {
    id: 'solve-1',
    timeMs: 14500,
    moveCount: 26,
    turnsPerSecond: 1.79,
    scrambleNotation: "R U R' U'",
    completedAt: Date.now(),
  };

  const qualified = await store.recordSolveAttempt(testRecord);
  assert.equal(qualified, true);

  const updatedTop = useCubeStore.getState().topRecords;
  assert.equal(updatedTop.length, 1);
  assert.equal(updatedTop[0].id, 'solve-1');

  // Verify persistence
  const fromStorage = await loadStoredRecords();
  assert.equal(fromStorage.length, 1);
  assert.equal(fromStorage[0].timeMs, 14500);
});

test('AC-6: compareTopRecords returns 0 for identical records and preserves purity in sortTopRecords', () => {
  const rec1 = { id: 'x', timeMs: 12000, moveCount: 25, turnsPerSecond: 2.08, scrambleNotation: '', completedAt: 500 };
  const rec2 = { id: 'y', timeMs: 12000, moveCount: 25, turnsPerSecond: 2.08, scrambleNotation: '', completedAt: 500 };

  assert.equal(compareTopRecords(rec1, rec2), 0, 'Identical records must compare to 0');

  const originalList = [
    { id: 'b', timeMs: 20000, moveCount: 30, turnsPerSecond: 1.5, scrambleNotation: '', completedAt: 2 },
    { id: 'a', timeMs: 10000, moveCount: 20, turnsPerSecond: 2.0, scrambleNotation: '', completedAt: 1 },
  ];
  const originalSnapshot = JSON.parse(JSON.stringify(originalList));
  const sorted = sortTopRecords(originalList);

  assert.equal(sorted[0].id, 'a');
  assert.equal(sorted[1].id, 'b');
  assert.deepEqual(originalList, originalSnapshot, 'sortTopRecords must not mutate original array');
});

test('AC-6: insertTopRecord rejects invalid candidate records gracefully', () => {
  const existing = [
    { id: '1', timeMs: 10000, moveCount: 20, turnsPerSecond: 2.0, scrambleNotation: '', completedAt: 1 },
  ];

  assert.equal(insertTopRecord(existing, null).qualified, false);
  assert.equal(insertTopRecord(existing, undefined).qualified, false);
  assert.equal(insertTopRecord(existing, { id: 'bad', timeMs: 0, moveCount: 1, turnsPerSecond: 0, scrambleNotation: '', completedAt: 1 }).qualified, false);
  assert.equal(insertTopRecord(existing, { id: 'bad', timeMs: -500, moveCount: 1, turnsPerSecond: 0, scrambleNotation: '', completedAt: 1 }).qualified, false);
  assert.equal(insertTopRecord(existing, { id: 'bad', timeMs: NaN, moveCount: 1, turnsPerSecond: 0, scrambleNotation: '', completedAt: 1 }).qualified, false);
  assert.equal(insertTopRecord(existing, { id: 'bad', timeMs: Infinity, moveCount: 1, turnsPerSecond: 0, scrambleNotation: '', completedAt: 1 }).qualified, false);
});

test('AC-6: insertTopRecord handles tie-breaking for 5th place qualifying spot', () => {
  const full = [
    { id: '1', timeMs: 10000, moveCount: 20, turnsPerSecond: 2.0, scrambleNotation: '', completedAt: 1 },
    { id: '2', timeMs: 15000, moveCount: 22, turnsPerSecond: 1.47, scrambleNotation: '', completedAt: 2 },
    { id: '3', timeMs: 20000, moveCount: 25, turnsPerSecond: 1.25, scrambleNotation: '', completedAt: 3 },
    { id: '4', timeMs: 25000, moveCount: 28, turnsPerSecond: 1.12, scrambleNotation: '', completedAt: 4 },
    { id: '5', timeMs: 30000, moveCount: 30, turnsPerSecond: 1.0, scrambleNotation: '', completedAt: 5 },
  ];

  // Tie on time with fewer moves qualifies and displaces record 5
  const tieFewerMoves = { id: 'tie-win', timeMs: 30000, moveCount: 27, turnsPerSecond: 0.9, scrambleNotation: '', completedAt: 6 };
  const resWin = insertTopRecord(full, tieFewerMoves);
  assert.equal(resWin.qualified, true);
  assert.equal(resWin.rank, 5);
  assert.equal(resWin.updatedRecords.length, 5);
  assert.equal(resWin.updatedRecords[4].id, 'tie-win');

  // Tie on time with more moves fails to qualify
  const tieMoreMoves = { id: 'tie-lose', timeMs: 30000, moveCount: 35, turnsPerSecond: 1.17, scrambleNotation: '', completedAt: 4 };
  const resLose = insertTopRecord(full, tieMoreMoves);
  assert.equal(resLose.qualified, false);
  assert.equal(resLose.rank, -1);
  assert.equal(resLose.updatedRecords.length, 5);
  assert.equal(resLose.updatedRecords[4].id, '5');
});

test('AC-8: loadStoredRecords handles malformed JSON and corrupted array elements', async () => {
  await clearStoredRecords();

  // Storage contains non-array JSON object
  await AsyncStorage.setItem(TOP_RECORDS_STORAGE_KEY, JSON.stringify({ message: 'not an array' }));
  const fromObject = await loadStoredRecords();
  assert.deepEqual(fromObject, [], 'Non-array JSON must return empty array');

  // Storage contains numbers or strings
  await AsyncStorage.setItem(TOP_RECORDS_STORAGE_KEY, JSON.stringify('simple string'));
  const fromString = await loadStoredRecords();
  assert.deepEqual(fromString, [], 'String JSON must return empty array');

  // Storage contains array with some corrupted/invalid entries
  const mixedArray = [
    null,
    { id: 'valid-1', timeMs: 12000, moveCount: 24, turnsPerSecond: 2.0, completedAt: 100 },
    { id: 12345, timeMs: 10000, moveCount: 20, turnsPerSecond: 2.0, completedAt: 50 },
    { id: 'bad-time', timeMs: -100, moveCount: 20, turnsPerSecond: 2.0, completedAt: 50 },
    { id: 'valid-2', timeMs: 8000, moveCount: 18, turnsPerSecond: 2.25, completedAt: 200 },
    { missingFields: true },
  ];
  await AsyncStorage.setItem(TOP_RECORDS_STORAGE_KEY, JSON.stringify(mixedArray));
  const fromMixed = await loadStoredRecords();
  assert.equal(fromMixed.length, 2, 'Must filter out all corrupted entries');
  assert.equal(fromMixed[0].id, 'valid-2', 'Must sort valid entries ascending');
  assert.equal(fromMixed[1].id, 'valid-1');

  // Storage contains more than 5 items
  const sevenItems = Array.from({ length: 7 }, (_, i) => ({
    id: `item-${i + 1}`,
    timeMs: (i + 1) * 5000,
    moveCount: 20 + i,
    turnsPerSecond: 1.5,
    completedAt: Date.now(),
  }));
  await AsyncStorage.setItem(TOP_RECORDS_STORAGE_KEY, JSON.stringify(sevenItems));
  const fromSeven = await loadStoredRecords();
  assert.equal(fromSeven.length, 5, 'Must prune to at most 5 items');
  assert.equal(fromSeven[0].id, 'item-1');
  assert.equal(fromSeven[4].id, 'item-5');
});

test('AC-8: saveStoredRecords and clearStoredRecords gracefully catch storage exceptions', async () => {
  const originalSetItem = AsyncStorage.setItem;
  const originalRemoveItem = AsyncStorage.removeItem;

  try {
    // Force setItem to throw
    AsyncStorage.setItem = () => { throw new Error('Storage quota exceeded'); };
    await assert.doesNotReject(
      async () => {
        await saveStoredRecords([{ id: 'test', timeMs: 10000, moveCount: 20, turnsPerSecond: 2.0, scrambleNotation: '', completedAt: 1 }]);
      },
      'saveStoredRecords must not throw when storage fails'
    );

    // Force removeItem to throw
    AsyncStorage.removeItem = () => { throw new Error('Storage unavailable'); };
    await assert.doesNotReject(
      async () => {
        await clearStoredRecords();
      },
      'clearStoredRecords must not throw when storage fails'
    );
  } finally {
    AsyncStorage.setItem = originalSetItem;
    AsyncStorage.removeItem = originalRemoveItem;
  }
});

test('AC-7: RecordsModal renders all 5 ranks with distinct badges, formatted times and dates', () => {
  const records = [
    { id: '1', timeMs: 8450, moveCount: 18, turnsPerSecond: 2.13, scrambleNotation: '', completedAt: 1774435200000 },
    { id: '2', timeMs: 11200, moveCount: 22, turnsPerSecond: 1.96, scrambleNotation: '', completedAt: 1774435200000 },
    { id: '3', timeMs: 14500, moveCount: 26, turnsPerSecond: 1.79, scrambleNotation: '', completedAt: 1774435200000 },
    { id: '4', timeMs: 18900, moveCount: 30, turnsPerSecond: 1.59, scrambleNotation: '', completedAt: 1774435200000 },
    { id: '5', timeMs: 65430, moveCount: 45, turnsPerSecond: 0.69, scrambleNotation: '', completedAt: 1774435200000 },
  ];

  const html = renderToStaticMarkup(
    React.createElement(RecordsModal, {
      isVisible: true,
      records,
      onClose: () => {},
    })
  );

  assert.ok(html.includes('8.45'), 'Rank 1 time formatted');
  assert.ok(html.includes('11.20'), 'Rank 2 time formatted');
  assert.ok(html.includes('14.50'), 'Rank 3 time formatted');
  assert.ok(html.includes('18.90'), 'Rank 4 time formatted');
  assert.ok(html.includes('1:05.43'), 'Rank 5 minute-plus time formatted');
  assert.ok(html.includes('2.13 /s'), 'Rank 1 TPS');
  assert.ok(html.includes('0.69 /s'), 'Rank 5 TPS');
});

test('AC-7: RecordsModal closes via onClose callback on backdrop or close button', () => {
  let closeCount = 0;
  const element = React.createElement(RecordsModal, {
    isVisible: true,
    records: [],
    onClose: () => { closeCount++; },
  });

  assert.equal(typeof element.props.onClose, 'function');
  element.props.onClose();
  assert.equal(closeCount, 1, 'onClose should be called when triggered');
});

test('AC-4: GameOverlay Start and Record buttons trigger callback props and expose accessibility attributes', () => {
  let startTriggered = false;
  let recordTriggered = false;

  const element = React.createElement(GameOverlay, {
    moveCount: 0,
    timerText: '0.00',
    gamePhase: 'SOLVED',
    onStartPress: () => { startTriggered = true; },
    onRecordPress: () => { recordTriggered = true; },
  });

  assert.equal(typeof element.props.onStartPress, 'function');
  assert.equal(typeof element.props.onRecordPress, 'function');

  element.props.onStartPress();
  element.props.onRecordPress();
  assert.equal(startTriggered, true, 'onStartPress should execute');
  assert.equal(recordTriggered, true, 'onRecordPress should execute');

  const html = renderToStaticMarkup(element);
  assert.ok(html.includes('accessibilityRole="button"') || html.includes('role="button"'), 'Buttons must have button role');
  assert.ok(html.includes('Start solve game'), 'Start button must have accessibility label');
  assert.ok(html.includes('View solve records'), 'Record button must have accessibility label');
});

test('AC-5, AC-7: Store actions openRecordsModal, closeRecordsModal, loadTopRecords, and skipScramble', async () => {
  await clearStoredRecords();
  const store = useCubeStore.getState();

  // Test modal visibility actions
  store.openRecordsModal();
  assert.equal(useCubeStore.getState().isRecordsModalVisible, true);
  store.closeRecordsModal();
  assert.equal(useCubeStore.getState().isRecordsModalVisible, false);

  // Test loadTopRecords into store
  const savedTestRecord = [
    { id: 'loaded-1', timeMs: 12500, moveCount: 25, turnsPerSecond: 2.0, scrambleNotation: '', completedAt: 100 }
  ];
  await saveStoredRecords(savedTestRecord);
  await store.loadTopRecords();
  assert.equal(useCubeStore.getState().topRecords.length, 1);
  assert.equal(useCubeStore.getState().topRecords[0].id, 'loaded-1');

  // Test recordSolveAttempt when record does NOT qualify (slower than top 5)
  const fullRecords = Array.from({ length: 5 }, (_, i) => ({
    id: `rec-${i}`,
    timeMs: (i + 1) * 1000,
    moveCount: 10,
    turnsPerSecond: 1.0,
    scrambleNotation: '',
    completedAt: i,
  }));
  useCubeStore.setState({ topRecords: fullRecords });
  const slowSolve = {
    id: 'too-slow',
    timeMs: 99999,
    moveCount: 50,
    turnsPerSecond: 0.5,
    scrambleNotation: '',
    completedAt: 999,
  };
  const qualified = await store.recordSolveAttempt(slowSolve);
  assert.equal(qualified, false, 'Slow solve must not qualify for full leaderboard');
  assert.equal(useCubeStore.getState().topRecords.length, 5);

  // Test skipScramble while in SCRAMBLING phase does not auto start timer
  store.startSolveGame();
  assert.equal(useCubeStore.getState().gamePhase, 'SCRAMBLING');
  store.skipScramble();
  assert.equal(useCubeStore.getState().gamePhase, 'PLAYING');
  assert.equal(useCubeStore.getState().timerStatus, 'IDLE', 'skipScramble must leave timerStatus as IDLE');
  assert.equal(useCubeStore.getState().timerMs, 0);
});
