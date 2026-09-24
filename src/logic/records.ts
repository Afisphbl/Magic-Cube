import AsyncStorage from '@react-native-async-storage/async-storage';
import { SolveRecord } from './timer';

export type TopRecord = SolveRecord;

export const TOP_RECORDS_STORAGE_KEY = '@magic_cube_top_records';
export const MAX_TOP_RECORDS = 5;

/**
 * Compares two records according to speedcubing rules:
 * 1. Lower timeMs wins (faster solve)
 * 2. Tie break: lower moveCount wins (higher efficiency)
 * 3. Tie break: earlier completedAt wins (chronological seniority)
 */
export function compareTopRecords(a: TopRecord, b: TopRecord): number {
  if (a.timeMs !== b.timeMs) {
    return a.timeMs - b.timeMs;
  }
  if (a.moveCount !== b.moveCount) {
    return a.moveCount - b.moveCount;
  }
  return a.completedAt - b.completedAt;
}

/**
 * Sorts an array of records in ascending order of timeMs with tie breaking.
 */
export function sortTopRecords(records: TopRecord[]): TopRecord[] {
  return [...records].sort(compareTopRecords);
}

export interface InsertRecordResult {
  updatedRecords: TopRecord[];
  qualified: boolean;
  rank: number;
}

/**
 * Evaluates a candidate solve record against the current list of top records.
 * If it qualifies for the top 5, it is inserted at its sorted rank and the list is pruned to at most 5 items.
 */
export function insertTopRecord(
  existingRecords: TopRecord[],
  candidate: TopRecord
): InsertRecordResult {
  if (!candidate || !Number.isFinite(candidate.timeMs) || candidate.timeMs <= 0) {
    return {
      updatedRecords: sortTopRecords(existingRecords).slice(0, MAX_TOP_RECORDS),
      qualified: false,
      rank: -1,
    };
  }

  // Combine and sort
  const combined = [...existingRecords, candidate];
  const sorted = sortTopRecords(combined);
  const pruned = sorted.slice(0, MAX_TOP_RECORDS);

  const index = pruned.findIndex((item) => item.id === candidate.id);
  if (index !== -1) {
    return {
      updatedRecords: pruned,
      qualified: true,
      rank: index + 1,
    };
  }

  return {
    updatedRecords: sortTopRecords(existingRecords).slice(0, MAX_TOP_RECORDS),
    qualified: false,
    rank: -1,
  };
}

/**
 * Loads records from AsyncStorage, handling empty or corrupted data gracefully.
 */
export async function loadStoredRecords(): Promise<TopRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(TOP_RECORDS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const validRecords = parsed.filter(
      (item): item is TopRecord =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.timeMs === 'number' &&
        item.timeMs > 0 &&
        typeof item.moveCount === 'number' &&
        typeof item.turnsPerSecond === 'number' &&
        typeof item.completedAt === 'number'
    );

    return sortTopRecords(validRecords).slice(0, MAX_TOP_RECORDS);
  } catch {
    return [];
  }
}

/**
 * Persists records to AsyncStorage, ensuring at most 5 sorted records are stored.
 */
export async function saveStoredRecords(records: TopRecord[]): Promise<void> {
  try {
    const pruned = sortTopRecords(records).slice(0, MAX_TOP_RECORDS);
    await AsyncStorage.setItem(TOP_RECORDS_STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // Fail silently per spec
  }
}

/**
 * Clears the stored top records from AsyncStorage.
 */
export async function clearStoredRecords(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOP_RECORDS_STORAGE_KEY);
  } catch {
    // Fail silently per spec
  }
}
