import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import { createGame } from '../src/game/board';
import {
  createEmptyHistory,
  loadSavedState,
  recordHistoryEntry,
  saveCurrentState,
} from '../src/game/persistence';

const tile = (id: string, face: string, x: number, y: number, z = 0) => ({ id, face, x, y, z });

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe('local save persistence', () => {
  test('saves and restores the current game with history metadata', () => {
    const storage = new MemoryStorage();
    const game = createGame({
      tiles: [tile('a', 'B1', 0, 0), tile('b', 'B1', 3, 0)],
      level: 1,
      seed: 'persisted',
    });

    game.score = 240;
    saveCurrentState(storage, {
      currentLevel: 1,
      game,
      hintCount: 2,
      savedAt: 1234,
    });

    const saved = loadSavedState(storage);

    assert.equal(saved?.currentLevel, 1);
    assert.equal(saved?.hintCount, 2);
    assert.equal(saved?.game.score, 240);
    assert.equal(saved?.game.tiles.length, 2);
  });

  test('records bounded history entries with newest first', () => {
    const storage = new MemoryStorage();
    const base = createEmptyHistory();

    for (let index = 0; index < 8; index += 1) {
      recordHistoryEntry(storage, base, {
        id: `entry-${index}`,
        level: 1,
        score: index,
        elapsedSeconds: index + 10,
        completedAt: index,
        won: index % 2 === 0,
      });
    }

    const saved = loadSavedState(storage);

    assert.equal(saved?.history.length, 5);
    assert.equal(saved?.history[0].id, 'entry-7');
    assert.equal(saved?.history[4].id, 'entry-3');
  });

  test('bad localStorage data is ignored instead of crashing', () => {
    const storage = new MemoryStorage();
    storage.setItem('vita-mahjong-save', '{not-json');

    assert.equal(loadSavedState(storage), null);
  });
});
