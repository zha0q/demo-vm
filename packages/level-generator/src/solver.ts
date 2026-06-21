import type { CandidateLevel, GeneratedLevelTile, SolverMove, SolverResult } from './types.js';

const FLOWER_FACES = new Set(['F1', 'F2', 'F3', 'F4']);
const SEASON_FACES = new Set(['S1', 'S2', 'S3', 'S4']);

export interface SolverContext {
  tiles: GeneratedLevelTile[];
  tilesById: Map<string, GeneratedLevelTile>;
  queueCapacity: number;
}

export interface SolverState {
  activeIds: string[];
  queueIds: string[];
}

export interface LegalMove {
  tileId: string;
  immediateMatch: boolean;
  queueAfterSize: number;
  freedCount: number;
  nextState: SolverState;
  matchedTileIds: string[];
}

export interface SolveLevelOptions {
  maxExpandedNodes?: number;
}

export function buildSolverContext(level: CandidateLevel): SolverContext {
  return {
    tiles: level.tiles,
    tilesById: new Map(level.tiles.map((tile) => [tile.id, tile])),
    queueCapacity: level.queue.capacity,
  };
}

export function createInitialState(level: CandidateLevel): SolverState {
  return {
    activeIds: level.tiles.map((tile) => tile.id),
    queueIds: [],
  };
}

export function listFreeTileIds(context: SolverContext, state: SolverState) {
  const activeSet = new Set(state.activeIds);
  return state.activeIds.filter((tileId) => {
    const tile = context.tilesById.get(tileId);

    if (!tile) {
      return false;
    }

    return !isCovered(context, activeSet, tile) && (isSideOpen(context, activeSet, tile, 'left') || isSideOpen(context, activeSet, tile, 'right'));
  });
}

export function listLegalMoves(context: SolverContext, state: SolverState): LegalMove[] {
  const freeTileIds = listFreeTileIds(context, state);
  const activeBefore = freeTileIds.length;
  const moves: LegalMove[] = [];

  for (const tileId of freeTileIds) {
    const tile = context.tilesById.get(tileId);

    if (!tile) {
      continue;
    }

    const earliestMatchId = state.queueIds.find((queuedId) => canMatch(context.tilesById.get(queuedId)?.face, tile.face));

    if (!earliestMatchId && state.queueIds.length >= context.queueCapacity) {
      continue;
    }

    const nextActiveIds = state.activeIds.filter((id) => id !== tileId);
    const nextQueueIds = earliestMatchId
      ? state.queueIds.filter((id) => id !== earliestMatchId)
      : [...state.queueIds, tileId];
    const nextState: SolverState = {
      activeIds: nextActiveIds,
      queueIds: nextQueueIds,
    };
    const freedCount = Math.max(0, listFreeTileIds(context, nextState).length - activeBefore);

    moves.push({
      tileId,
      immediateMatch: Boolean(earliestMatchId),
      queueAfterSize: nextQueueIds.length,
      freedCount,
      nextState,
      matchedTileIds: earliestMatchId ? [earliestMatchId, tileId] : [],
    });
  }

  moves.sort((left, right) => scoreMove(right) - scoreMove(left));
  return moves;
}

export function solveLevel(level: CandidateLevel, options: SolveLevelOptions = {}): SolverResult {
  const context = buildSolverContext(level);
  const maxExpandedNodes = options.maxExpandedNodes ?? 200_000;
  const visited = new Set<string>();
  let expandedNodes = 0;
  let queuePeak = 0;

  function search(state: SolverState, path: SolverMove[]): SolverMove[] | null {
    expandedNodes += 1;
    queuePeak = Math.max(queuePeak, state.queueIds.length);

    if (expandedNodes > maxExpandedNodes) {
      return null;
    }

    if (state.activeIds.length === 0 && state.queueIds.length === 0) {
      return path;
    }

    if (state.activeIds.length === 0) {
      return null;
    }

    const signature = stateSignature(context, state);

    if (visited.has(signature)) {
      return null;
    }

    visited.add(signature);

    const moves = listLegalMoves(context, state);

    if (moves.length === 0) {
      return null;
    }

    for (const move of moves) {
      const nextPath = [
        ...path,
        {
          clickedTileId: move.tileId,
          queueAfter: move.nextState.queueIds.map((id) => context.tilesById.get(id)?.face ?? ''),
          matchedTileIds: move.matchedTileIds,
        },
      ];
      const result = search(move.nextState, nextPath);

      if (result) {
        return result;
      }
    }

    return null;
  }

  const bestPath = search(createInitialState(level), []) ?? [];

  return {
    solvable: bestPath.length > 0,
    bestPath,
    expandedNodes,
    queuePeak,
  };
}

function scoreMove(move: LegalMove) {
  return (
    (move.immediateMatch ? 100 : 0) +
    move.freedCount * 20 -
    move.queueAfterSize * 18 -
    (move.queueAfterSize >= 3 && !move.immediateMatch ? 25 : 0)
  );
}

function stateSignature(context: SolverContext, state: SolverState) {
  const activePart = [...state.activeIds].sort().join(',');
  const queuePart = state.queueIds.map((id) => context.tilesById.get(id)?.face ?? '').join('|');
  return `${activePart}::${queuePart}`;
}

function canMatch(faceA: string | undefined, faceB: string | undefined) {
  if (!faceA || !faceB) {
    return false;
  }

  if (FLOWER_FACES.has(faceA) && FLOWER_FACES.has(faceB)) {
    return true;
  }

  if (SEASON_FACES.has(faceA) && SEASON_FACES.has(faceB)) {
    return true;
  }

  return faceA === faceB;
}

function isCovered(context: SolverContext, activeSet: Set<string>, tile: GeneratedLevelTile) {
  return context.tiles.some((candidate) => {
    if (!activeSet.has(candidate.id) || candidate.id === tile.id) {
      return false;
    }

    return (
      candidate.z > tile.z &&
      overlaps(tile.x, tile.x + 1, candidate.x, candidate.x + 1) &&
      overlaps(tile.y, tile.y + 1, candidate.y, candidate.y + 1)
    );
  });
}

function isSideOpen(context: SolverContext, activeSet: Set<string>, tile: GeneratedLevelTile, side: 'left' | 'right') {
  return !context.tiles.some((candidate) => {
    if (!activeSet.has(candidate.id) || candidate.id === tile.id || candidate.z !== tile.z) {
      return false;
    }

    const touchesSide = side === 'left' ? rangesTouch(candidate.x + 1, tile.x) : rangesTouch(tile.x + 1, candidate.x);
    return touchesSide && overlaps(tile.y, tile.y + 1, candidate.y, candidate.y + 1);
  });
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function rangesTouch(a: number, b: number) {
  return Math.abs(a - b) < 0.01;
}
