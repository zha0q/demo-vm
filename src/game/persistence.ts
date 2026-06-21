import { cloneGame, type GameState } from './board';
import { createStepQueue } from './stepQueue';

export const SAVE_KEY = 'vita-mahjong-save';
export const SAVE_SCHEMA_VERSION = 2;
const HISTORY_LIMIT = 5;

export interface HistoryEntry {
  id: string;
  level: number;
  score: number;
  elapsedSeconds: number;
  completedAt: number;
  won: boolean;
}

export interface SavedState {
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  currentLevel: number;
  game: GameState;
  hintCount: number;
  savedAt: number;
  history: HistoryEntry[];
}

export type SaveInput = Omit<SavedState, 'history' | 'schemaVersion'> & {
  history?: HistoryEntry[];
};

export function createEmptyHistory(): SavedState {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    currentLevel: 1,
    game: {
      tiles: [],
      selectedId: null,
      history: [],
      stepQueue: createStepQueue(),
      level: 1,
      score: 0,
      combo: 0,
      seed: 'empty',
      startedAt: 0,
      message: '',
    },
    hintCount: 0,
    savedAt: 0,
    history: [],
  };
}

export function loadSavedState(storage: Storage): SavedState | null {
  const raw = storage.getItem(SAVE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SavedState;

    if (!isSavedState(parsed)) {
      return null;
    }

    return {
      ...parsed,
      game: cloneGame(parsed.game),
      history: parsed.history.slice(0, HISTORY_LIMIT),
    };
  } catch {
    return null;
  }
}

export function saveCurrentState(storage: Storage, input: SaveInput): SavedState {
  const previous = loadSavedState(storage);
  const saved: SavedState = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    currentLevel: input.currentLevel,
    game: cloneGame(input.game),
    hintCount: input.hintCount,
    savedAt: input.savedAt,
    history: input.history ?? previous?.history ?? [],
  };

  storage.setItem(SAVE_KEY, JSON.stringify(saved));
  return saved;
}

export function recordHistoryEntry(storage: Storage, saved: SaveInput, entry: HistoryEntry): SavedState {
  const latest = loadSavedState(storage) ?? {
    schemaVersion: SAVE_SCHEMA_VERSION,
    currentLevel: saved.currentLevel,
    game: cloneGame(saved.game),
    hintCount: saved.hintCount,
    savedAt: saved.savedAt,
    history: saved.history ?? [],
  };
  const next: SavedState = {
    ...latest,
    history: [entry, ...latest.history.filter((candidate) => candidate.id !== entry.id)].slice(0, HISTORY_LIMIT),
    savedAt: Date.now(),
  };

  storage.setItem(SAVE_KEY, JSON.stringify(next));
  return next;
}

export function clearSavedState(storage: Storage) {
  storage.removeItem(SAVE_KEY);
}

function isSavedState(value: SavedState) {
  return Boolean(
    value &&
      value.schemaVersion === SAVE_SCHEMA_VERSION &&
      typeof value.currentLevel === 'number' &&
      value.game &&
      Array.isArray(value.game.tiles) &&
      Array.isArray(value.game.history) &&
      typeof value.hintCount === 'number' &&
      typeof value.savedAt === 'number' &&
      Array.isArray(value.history),
  );
}
