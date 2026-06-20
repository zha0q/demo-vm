import type { Tile } from './board';

export const FLOWER_FACES = new Set(['F1', 'F2', 'F3', 'F4']);
export const SEASON_FACES = new Set(['S1', 'S2', 'S3', 'S4']);

export function faceGroup(face: string) {
  if (FLOWER_FACES.has(face)) {
    return 'flower';
  }

  if (SEASON_FACES.has(face)) {
    return 'season';
  }

  return face;
}

export function canMatch(tileA: Tile | undefined, tileB: Tile | undefined) {
  return Boolean(tileA && tileB && tileA.id !== tileB.id && faceGroup(tileA.face) === faceGroup(tileB.face));
}
