import test from 'node:test';
import assert from 'node:assert/strict';
import { Platform } from 'react-native';
import {
  formatTimer,
  calculateTurnsPerSecond,
  createSolveRecord,
} from '../src/logic/timer.ts';
import { triggerVictoryHaptic } from '../src/logic/haptics.ts';
import mockHaptics from './mocks/expo-haptics.mjs';

// AC-4: formatTimer speedcubing notation formatting
test('AC-4: formatTimer formats sub-minute times in SS.cs notation', () => {
  assert.equal(formatTimer(0), '0.00');
  assert.equal(formatTimer(50), '0.05');
  assert.equal(formatTimer(420), '0.42');
  assert.equal(formatTimer(9420), '9.42');
  assert.equal(formatTimer(12450), '12.45');
  assert.equal(formatTimer(59990), '59.99');
});

test('AC-4: formatTimer formats multi-minute times in M:SS.cs notation', () => {
  assert.equal(formatTimer(60000), '1:00.00');
  assert.equal(formatTimer(65040), '1:05.04');
  assert.equal(formatTimer(75320), '1:15.32');
  assert.equal(formatTimer(125000), '2:05.00');
  assert.equal(formatTimer(599000), '9:59.00');
});

test('AC-4: formatTimer formats hour times in H:MM:SS.cs notation', () => {
  assert.equal(formatTimer(3600000), '1:00:00.00');
  assert.equal(formatTimer(3661020), '1:01:01.02');
});

test('AC-4: formatTimer handles negative, zero, and non-finite values safely', () => {
  assert.equal(formatTimer(-1000), '0.00');
  assert.equal(formatTimer(-0.5), '0.00');
  assert.equal(formatTimer(NaN), '0.00');
  assert.equal(formatTimer(Infinity), '0.00');
  assert.equal(formatTimer(-Infinity), '0.00');
});

// AC-6: calculateTurnsPerSecond calculations and division by zero guard
test('AC-6: calculateTurnsPerSecond computes turns per second rounded to two decimal places', () => {
  assert.equal(calculateTurnsPerSecond(25, 10000), 2.5);
  assert.equal(calculateTurnsPerSecond(25, 10200), 2.45);
  assert.equal(calculateTurnsPerSecond(54, 18500), 2.92);
  assert.equal(calculateTurnsPerSecond(1, 1000), 1);
});

test('AC-6: calculateTurnsPerSecond guards against zero, negative, and invalid values', () => {
  assert.equal(calculateTurnsPerSecond(25, 0), 0);
  assert.equal(calculateTurnsPerSecond(25, -1000), 0);
  assert.equal(calculateTurnsPerSecond(0, 10000), 0);
  assert.equal(calculateTurnsPerSecond(-5, 10000), 0);
  assert.equal(calculateTurnsPerSecond(25, NaN), 0);
  assert.equal(calculateTurnsPerSecond(NaN, 10000), 0);
  assert.equal(calculateTurnsPerSecond(25, Infinity), 0);
});

// AC-6: createSolveRecord structure and validation
test('AC-6: createSolveRecord generates valid record with id and computed TPS', () => {
  const record = createSolveRecord({
    timeMs: 14250,
    moveCount: 32,
    scrambleNotation: "R U R' U'",
  });

  assert.ok(typeof record.id === 'string' && record.id.length > 0);
  assert.equal(record.timeMs, 14250);
  assert.equal(record.moveCount, 32);
  assert.equal(record.turnsPerSecond, 2.25);
  assert.equal(record.scrambleNotation, "R U R' U'");
  assert.ok(typeof record.completedAt === 'number' && record.completedAt > 0);
});

test('AC-6: createSolveRecord creates distinct IDs for multiple records', () => {
  const r1 = createSolveRecord({ timeMs: 10000, moveCount: 20, scrambleNotation: 'U' });
  const r2 = createSolveRecord({ timeMs: 10000, moveCount: 20, scrambleNotation: 'U' });
  assert.notEqual(r1.id, r2.id);
});

test('AC-6: createSolveRecord respects explicit ID and timestamp overrides', () => {
  const record = createSolveRecord({
    timeMs: 9500,
    moveCount: 21,
    scrambleNotation: 'R',
    id: 'custom-solve-id',
    completedAt: 1700000000000,
  });

  assert.equal(record.id, 'custom-solve-id');
  assert.equal(record.completedAt, 1700000000000);
});

// AC-7: triggerVictoryHaptic executes notification feedback
test('AC-7: triggerVictoryHaptic executes success notification on mobile platform', async () => {
  mockHaptics._resetNotificationAsyncCalls();
  const originalOS = Platform.OS;

  Platform.OS = 'android';
  try {
    await triggerVictoryHaptic();
    const calls = mockHaptics._getNotificationAsyncCalls();
    assert.equal(calls.length, 1);
    assert.equal(calls[0], mockHaptics.NotificationFeedbackType.Success);
  } finally {
    Platform.OS = originalOS;
  }
});

test('AC-7: triggerVictoryHaptic fails silently on web platform without error', async () => {
  mockHaptics._resetNotificationAsyncCalls();
  const originalOS = Platform.OS;

  Platform.OS = 'web';
  try {
    await triggerVictoryHaptic();
    const calls = mockHaptics._getNotificationAsyncCalls();
    assert.equal(calls.length, 0);
  } finally {
    Platform.OS = originalOS;
  }
});

// Additional boundary precision and edge case tests
test('AC-4: formatTimer handles minute threshold boundaries with centisecond precision', () => {
  assert.equal(formatTimer(59999), '59.99');
  assert.equal(formatTimer(60000), '1:00.00');
  assert.equal(formatTimer(60010), '1:00.01');
  assert.equal(formatTimer(119990), '1:59.99');
  assert.equal(formatTimer(120000), '2:00.00');
  assert.equal(formatTimer(3599990), '59:59.99');
});

test('AC-6: calculateTurnsPerSecond handles high-speed sub-second and multi-move solves', () => {
  // 1 move in 200ms = 5.00 TPS
  assert.equal(calculateTurnsPerSecond(1, 200), 5);
  // 1 move in 250ms = 4.00 TPS
  assert.equal(calculateTurnsPerSecond(1, 250), 4);
  // 60 moves in 15000ms = 4.00 TPS
  assert.equal(calculateTurnsPerSecond(60, 15000), 4);
  // 47 moves in 12340ms = 3.81 TPS
  assert.equal(calculateTurnsPerSecond(47, 12340), 3.81);
});

test('AC-6: createSolveRecord generates ISO timestamp and strict schema fields', () => {
  const before = Date.now();
  const record = createSolveRecord({
    timeMs: 18450,
    moveCount: 45,
    scrambleNotation: "D2 F2 L2 B2 U2",
  });
  const after = Date.now();

  assert.equal(typeof record.id, 'string');
  assert.ok(record.id.length >= 16);
  assert.equal(record.timeMs, 18450);
  assert.equal(record.moveCount, 45);
  assert.equal(record.turnsPerSecond, 2.44);
  assert.equal(record.scrambleNotation, "D2 F2 L2 B2 U2");
  assert.ok(record.completedAt >= before && record.completedAt <= after);
});

