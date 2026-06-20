import { BLOCK_EPSILON } from './constants';
import type { Tile } from './board';

export interface TileSize {
  width: number;
  height: number;
}

export const DEFAULT_TILE_SIZE: TileSize = { width: 1, height: 1 };

export function activeTiles(tiles: Tile[]) {
  return tiles.filter((tile) => !tile.removed && tile.state !== 'queued' && tile.state !== 'matching' && tile.state !== 'animating');
}

export function remainingTiles(tiles: Tile[]) {
  return tiles.filter((tile) => !tile.removed);
}

export function isTileCovered(tiles: Tile[], tileId: string, size = DEFAULT_TILE_SIZE) {
  const tile = getTile(tiles, tileId);

  if (!tile || tile.removed) {
    return false;
  }

  return activeTiles(tiles).some(
    (candidate) =>
      candidate.id !== tile.id &&
      candidate.z > tile.z &&
      overlaps(tile.x, tile.x + size.width, candidate.x, candidate.x + size.width) &&
      overlaps(tile.y, tile.y + size.height, candidate.y, candidate.y + size.height),
  );
}

export function isTileSideOpen(tiles: Tile[], tileId: string, side: 'left' | 'right', size = DEFAULT_TILE_SIZE) {
  const tile = getTile(tiles, tileId);

  if (!tile || tile.removed) {
    return false;
  }

  const blocked = activeTiles(tiles).some((candidate) => {
    if (candidate.id === tile.id || candidate.z !== tile.z) {
      return false;
    }

    const touchesSide =
      side === 'left'
        ? rangesTouch(candidate.x + size.width, tile.x)
        : rangesTouch(tile.x + size.width, candidate.x);

    return touchesSide && overlaps(tile.y, tile.y + size.height, candidate.y, candidate.y + size.height);
  });

  return !blocked;
}

export function isTileFree(tiles: Tile[], tileId: string, size = DEFAULT_TILE_SIZE) {
  const tile = getTile(tiles, tileId);

  if (!tile || tile.removed || isTileCovered(tiles, tileId, size)) {
    return false;
  }

  return isTileSideOpen(tiles, tileId, 'left', size) || isTileSideOpen(tiles, tileId, 'right', size);
}

function getTile(tiles: Tile[], id: string) {
  return tiles.find((tile) => tile.id === id);
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function rangesTouch(a: number, b: number) {
  return Math.abs(a - b) < BLOCK_EPSILON;
}
