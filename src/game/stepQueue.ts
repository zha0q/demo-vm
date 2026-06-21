import { STEP_QUEUE_MAX_SIZE } from './constants';
import { canMatch } from './matchRules';
import type { Tile } from './board';

export interface StepQueueState {
  tileIds: string[];
  matchingTileIds: string[];
}

export interface StepQueueResult {
  accepted: boolean;
  queue: StepQueueState;
  matchedTileIds: string[];
  rejectedReason?: 'full';
}

export function createStepQueue(): StepQueueState {
  return {
    tileIds: [],
    matchingTileIds: [],
  };
}

export function canAcceptTile(queue: StepQueueState, tile: Tile, tiles: Tile[]) {
  return queue.tileIds.length < STEP_QUEUE_MAX_SIZE || Boolean(findEarliestMatch(queue, tile, tiles));
}

export function enqueueTile(queue: StepQueueState, tile: Tile, tiles: Tile[]): StepQueueResult {
  const match = findEarliestMatch(queue, tile, tiles);

  try {
    const queuedFaces = queue.tileIds.map((id) => tiles.find((t) => t.id === id)?.face ?? null);
    console.log('[stepQueue] enqueueTile', { tileId: tile.id, tileFace: tile.face, queueTileIds: queue.tileIds, queuedFaces, matchId: match?.id, matchFace: match?.face });
  } catch (e) {
    // ignore logging errors in environments without console
  }

  if (match) {
    const matchedTileIds = [match.id, tile.id];

    return {
      accepted: true,
      matchedTileIds,
      queue: {
        tileIds: queue.tileIds.filter((id) => id !== match.id),
        matchingTileIds: matchedTileIds,
      },
    };
  }

  if (queue.tileIds.length >= STEP_QUEUE_MAX_SIZE) {
    return {
      accepted: false,
      matchedTileIds: [],
      rejectedReason: 'full',
      queue: cloneQueue(queue),
    };
  }

  return {
    accepted: true,
    matchedTileIds: [],
    queue: {
      tileIds: [...queue.tileIds, tile.id],
      matchingTileIds: [],
    },
  };
}

function findEarliestMatch(queue: StepQueueState, tile: Tile, tiles: Tile[]) {
  return queue.tileIds.map((id) => tiles.find((candidate) => candidate.id === id)).find((queued) => canMatch(queued, tile));
}

function cloneQueue(queue: StepQueueState): StepQueueState {
  return {
    tileIds: [...queue.tileIds],
    matchingTileIds: [...queue.matchingTileIds],
  };
}
