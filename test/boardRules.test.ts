import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import { isTileCovered, isTileFree, isTileSideOpen } from '../src/game/boardRules';

const tile = (id: string, face: string, x: number, y: number, z = 0, removed = false) => ({
  id,
  face,
  x,
  y,
  z,
  removed,
});

describe('mahjong board availability rules', () => {
  test('a missing or removed tile is not free', () => {
    const tiles = [tile('removed', 'B1', 0, 0, 0, true)];

    assert.equal(isTileFree(tiles, 'missing'), false);
    assert.equal(isTileFree(tiles, 'removed'), false);
  });

  test('higher overlapping tiles cover lower tiles by x/y projection', () => {
    const tiles = [tile('base', 'B1', 1, 1), tile('cover', 'B2', 1, 1, 1), tile('offset', 'B3', 3, 1, 1)];

    assert.equal(isTileCovered(tiles, 'base'), true);
    assert.equal(isTileCovered(tiles, 'offset'), false);
    assert.equal(isTileFree(tiles, 'base'), false);
  });

  test('one open horizontal side is enough to select a tile', () => {
    const tiles = [tile('center', 'B1', 1, 0), tile('left', 'B2', 0, 0)];

    assert.equal(isTileSideOpen(tiles, 'center', 'left'), false);
    assert.equal(isTileSideOpen(tiles, 'center', 'right'), true);
    assert.equal(isTileFree(tiles, 'center'), true);
  });

  test('both horizontal sides blocked prevents selection', () => {
    const tiles = [tile('center', 'B1', 1, 0), tile('left', 'B2', 0, 0), tile('right', 'B3', 2, 0)];

    assert.equal(isTileFree(tiles, 'center'), false);
  });
});
