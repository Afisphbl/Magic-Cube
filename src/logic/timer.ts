export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED';

export interface SolveRecord {
  id: string;
  timeMs: number;
  moveCount: number;
  turnsPerSecond: number;
  scrambleNotation: string;
  completedAt: number;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Formats a duration in milliseconds to standard speedcubing timer notation:
 * - Sub minute: SS.cs (e.g. 0.00, 9.42, 12.45)
 * - Minute and above: M:SS.cs (e.g. 1:15.32)
 * - Hour and above: H:MM:SS.cs (e.g. 1:02:15.32)
 */
export function formatTimer(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0.00';
  }

  const clamped = Math.floor(ms);
  const centiseconds = Math.floor((clamped % 1000) / 10);
  const csStr = centiseconds.toString().padStart(2, '0');

  const totalSeconds = Math.floor(clamped / 1000);
  const seconds = totalSeconds % 60;

  if (totalSeconds < 60) {
    return `${seconds}.${csStr}`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const secStr = seconds.toString().padStart(2, '0');

  if (totalMinutes < 60) {
    return `${minutes}:${secStr}.${csStr}`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minStr = minutes.toString().padStart(2, '0');
  return `${hours}:${minStr}:${secStr}.${csStr}`;
}

/**
 * Calculates turns per second (TPS) rounded to two decimal places.
 * Returns 0 if timeMs <= 0 or non finite.
 */
export function calculateTurnsPerSecond(moveCount: number, timeMs: number): number {
  if (!Number.isFinite(timeMs) || timeMs <= 0 || !Number.isFinite(moveCount) || moveCount <= 0) {
    return 0;
  }

  const tps = moveCount / (timeMs / 1000);
  return Math.round(tps * 100) / 100;
}

export interface CreateSolveRecordParams {
  timeMs: number;
  moveCount: number;
  scrambleNotation: string;
  id?: string;
  completedAt?: number;
}

/**
 * Creates a unique SolveRecord.
 */
export function createSolveRecord(params: CreateSolveRecordParams): SolveRecord {
  const timeMs = Math.max(0, Number.isFinite(params.timeMs) ? params.timeMs : 0);
  const moveCount = Math.max(0, Number.isFinite(params.moveCount) ? params.moveCount : 0);
  const id = params.id || generateUUID();
  const completedAt = params.completedAt ?? Date.now();
  const turnsPerSecond = calculateTurnsPerSecond(moveCount, timeMs);

  return {
    id,
    timeMs,
    moveCount,
    turnsPerSecond,
    scrambleNotation: params.scrambleNotation || '',
    completedAt,
  };
}
