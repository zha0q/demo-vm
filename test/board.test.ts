import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import {
  createGame,
  findAvailableMoves,
  getTile,
  isTileFree,
  removePair,
  shufflePlayableBoard,
  undoLastMove,
} from '../src/game/board';

const tile = (id: string, face: string, x: number, y: number, z = 0) => ({ id, face, x, y, z });

describe('mahjong solitaire board rules', () => {
  test('a tile is free only when uncovered and one horizontal side is open', () => {
    const board = [
      tile('center', 'B1', 1, 0),
      tile('left', 'B2', 0, 0),
      tile('right', 'B3', 2, 0),
      tile('top', 'C1', 1, 0, 1),
      tile('edge', 'B1', 4, 0),
    ];

    assert.equal(isTileFree(board, 'center'), false);
    assert.equal(isTileFree(board, 'edge'), true);
  });

  test('available moves include matching free ordinary tiles and flower-season wildcards', () => {
    const board = [
      tile('bamboo-a', 'B1', 0, 0),
      tile('bamboo-b', 'B1', 3, 0),
      tile('flower-a', 'F1', 0, 2),
      tile('flower-b', 'F4', 3, 2),
      tile('blocked-a', 'C1', 1, 4),
      tile('block-left', 'D1', 0, 4),
      tile('block-right', 'D2', 2, 4),
      tile('blocked-b', 'C1', 5, 4),
    ];

    const moves = findAvailableMoves(board).map((move) => move.faceGroup).sort();

    assert.deepEqual(moves, ['B1', 'flower']);
  });

  test('removing, undoing, and scoring a pair updates state predictably', () => {
    const game = createGame({
      tiles: [tile('a', 'B1', 0, 0), tile('b', 'B1', 3, 0)],
      level: 2,
      seed: 'fixed',
    });

    const removed = removePair(game, 'a', 'b');

    assert.equal(removed.ok, true);
    assert.equal(game.tiles.every((candidate) => candidate.removed), true);
    assert.equal(game.score, 140);
    assert.equal(game.combo, 1);
    assert.equal(game.history.length, 1);

    const undone = undoLastMove(game);

    assert.equal(undone.ok, true);
    assert.equal(getTile(game.tiles, 'a')?.removed, false);
    assert.equal(game.score, 0);
    assert.equal(game.combo, 0);
  });

  test('shufflePlayableBoard keeps positions but changes remaining face assignments into at least one move', () => {
    const game = createGame({
      tiles: [
        tile('a', 'B1', 0, 0),
        tile('b', 'C1', 3, 0),
        tile('c', 'D1', 0, 2),
        tile('d', 'W1', 3, 2),
      ],
      seed: 'shuffle-test',
    });

    const positionsBefore = game.tiles.map(({ id, x, y, z }) => ({ id, x, y, z }));
    const result = shufflePlayableBoard(game);
    const positionsAfter = game.tiles.map(({ id, x, y, z }) => ({ id, x, y, z }));

    assert.equal(result.ok, true);
    assert.deepEqual(positionsAfter, positionsBefore);
    assert.ok(findAvailableMoves(game.tiles).length > 0);
  });
});
