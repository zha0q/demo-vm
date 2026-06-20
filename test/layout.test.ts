import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import { createGame, findAvailableMoves, removePair } from '../src/game/board';
import { createLevelTiles, levelCatalog } from '../src/game/levels';

describe('level generation', () => {
  test('each catalog level creates an even, playable 3D board', () => {
    for (const level of levelCatalog) {
      const tiles = createLevelTiles(level.id, `seed-${level.id}`);
      const game = createGame({ tiles, level: level.id, seed: `seed-${level.id}` });

      assert.equal(tiles.length % 2, 0);
      assert.ok(new Set(tiles.map((tile) => tile.id)).size === tiles.length);
      assert.ok(findAvailableMoves(game.tiles).length > 0, `${level.name} should start with a move`);
    }
  });

  test('generated solution order clears a level without illegal matches', () => {
    const tiles = createLevelTiles(2, 'solvable-demo');
    const game = createGame({ tiles, level: 2, seed: 'solvable-demo' });
    const sortedPairs = [...new Set(tiles.map((tile) => tile.solutionPair))].sort((a, b) => a - b);

    for (const pairIndex of sortedPairs) {
      const pair = game.tiles.filter((tile) => tile.solutionPair === pairIndex);
      const result = removePair(game, pair[0].id, pair[1].id);

      assert.equal(result.ok, true, `solution pair ${pairIndex} should be removable`);
    }

    assert.equal(game.tiles.every((tile) => tile.removed), true);
  });

  test('greedy legal moves can make progress through every level', () => {
    for (const level of levelCatalog) {
      const game = createGame({
        tiles: createLevelTiles(level.id, `greedy-${level.id}`),
        level: level.id,
        seed: `greedy-${level.id}`,
      });
      let safety = game.tiles.length / 2;

      while (safety > 0 && game.tiles.some((tile) => !tile.removed)) {
        const move = findAvailableMoves(game.tiles)[0];
        assert.ok(move, `${level.name} should have a legal move`);
        assert.equal(removePair(game, move.firstId, move.secondId).ok, true);
        safety -= 1;
      }

      assert.equal(game.tiles.every((tile) => tile.removed), true, `${level.name} should clear`);
    }
  });
});
