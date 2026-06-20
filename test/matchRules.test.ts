import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import { canMatch, faceGroup } from '../src/game/matchRules';

const tile = (id: string, face: string) => ({ id, face, x: 0, y: 0, z: 0 });

describe('mahjong face matching rules', () => {
  test('ordinary tiles only match the same face', () => {
    assert.equal(faceGroup('B1'), 'B1');
    assert.equal(canMatch(tile('a', 'B1'), tile('b', 'B1')), true);
    assert.equal(canMatch(tile('a', 'B1'), tile('b', 'B2')), false);
  });

  test('flower and season tiles match inside their own groups', () => {
    assert.equal(faceGroup('F1'), 'flower');
    assert.equal(faceGroup('S4'), 'season');
    assert.equal(canMatch(tile('flower-a', 'F1'), tile('flower-b', 'F4')), true);
    assert.equal(canMatch(tile('season-a', 'S1'), tile('season-b', 'S3')), true);
    assert.equal(canMatch(tile('flower-a', 'F1'), tile('season-a', 'S1')), false);
  });

  test('a tile cannot match itself or missing tiles', () => {
    const candidate = tile('same', 'B1');

    assert.equal(canMatch(candidate, candidate), false);
    assert.equal(canMatch(candidate, undefined), false);
  });
});
