import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import { STEP_QUEUE_MAX_SIZE } from '../src/game/constants';
import { canAcceptTile, createStepQueue, enqueueTile } from '../src/game/stepQueue';

const tile = (id: string, face: string) => ({ id, face, x: 0, y: 0, z: 0 });

describe('mahjong step queue', () => {
  test('adds unmatched tiles until capacity', () => {
    const tiles = [tile('a', 'B1'), tile('b', 'B2')];
    const first = enqueueTile(createStepQueue(), tiles[0], tiles);
    const second = enqueueTile(first.queue, tiles[1], tiles);

    assert.equal(second.accepted, true);
    assert.deepEqual(second.queue.tileIds, ['a', 'b']);
    assert.deepEqual(second.matchedTileIds, []);
  });

  test('immediately matches the earliest compatible queued tile', () => {
    const tiles = [tile('oldest', 'B1'), tile('other', 'B2'), tile('new', 'B1')];
    const queue = { tileIds: ['oldest', 'other'], matchingTileIds: [] };
    const result = enqueueTile(queue, tiles[2], tiles);

    assert.equal(result.accepted, true);
    assert.deepEqual(result.matchedTileIds, ['oldest', 'new']);
    assert.deepEqual(result.queue.tileIds, ['other']);
  });

  test('rejects an unmatched tile when the queue is full', () => {
    const queued = Array.from({ length: STEP_QUEUE_MAX_SIZE }, (_, index) => tile(`q${index}`, `B${index + 1}`));
    const incoming = tile('incoming', 'C1');
    const queue = { tileIds: queued.map((candidate) => candidate.id), matchingTileIds: [] };

    assert.equal(canAcceptTile(queue, incoming, [...queued, incoming]), false);
    assert.equal(enqueueTile(queue, incoming, [...queued, incoming]).accepted, false);
  });

  test('accepts a matching tile even when the queue is full', () => {
    const queued = Array.from({ length: STEP_QUEUE_MAX_SIZE }, (_, index) => tile(`q${index}`, `B${index + 1}`));
    const incoming = tile('incoming', 'B1');
    const queue = { tileIds: queued.map((candidate) => candidate.id), matchingTileIds: [] };
    const result = enqueueTile(queue, incoming, [...queued, incoming]);

    assert.equal(result.accepted, true);
    assert.deepEqual(result.matchedTileIds, ['q0', 'incoming']);
    assert.equal(result.queue.tileIds.includes('q0'), false);
  });
});
