import type { CandidateLevel, GeneratedLevelAnalysis, HintPayload } from './types.js';
import { buildSolverContext, createInitialState, listFreeTileIds, listLegalMoves, solveLevel } from './solver.js';

export function analyzeLevel(level: CandidateLevel): GeneratedLevelAnalysis {
  const context = buildSolverContext(level);
  const initialState = createInitialState(level);
  const openingFreeTiles = listFreeTileIds(context, initialState);
  const openingMatches = countOpeningMatches(level, openingFreeTiles);
  const solved = solveLevel(level);
  const branchSamples: number[] = [];
  let dangerSteps = 0;
  let state = initialState;

  for (const move of solved.bestPath) {
    const legalMoves = listLegalMoves(context, state);
    branchSamples.push(legalMoves.length);

    if (state.queueIds.length >= level.queue.capacity - 1) {
      dangerSteps += 1;
    }

    const applied = legalMoves.find((candidate) => candidate.tileId === move.clickedTileId);

    if (!applied) {
      break;
    }

    state = applied.nextState;
  }

  const avgBranchingFactor = branchSamples.length === 0 ? openingFreeTiles.length : average(branchSamples);
  const queuePressureScore = solved.queuePeak / level.queue.capacity;
  const deadEndRisk = solved.bestPath.length === 0 ? 1 : Math.min(1, dangerSteps / Math.max(1, solved.bestPath.length));
  const difficultyRaw =
    avgBranchingFactor * 0.35 +
    (1 - Math.min(1, openingMatches / Math.max(1, openingFreeTiles.length))) * 3.0 +
    queuePressureScore * 3.4 +
    deadEndRisk * 3.1;
  const difficultyScore = clamp(roundTo(difficultyRaw, 2), 1, 10);
  const iqWeight = roundTo(clamp(0.96 + difficultyScore * 0.03, 0.98, 1.2), 2);
  const recommendedHint = buildRecommendedHint(level, solved.bestPath.map((step) => step.clickedTileId));

  return {
    solvable: solved.solvable,
    difficultyScore,
    iqWeight,
    openingFreeTiles: openingFreeTiles.length,
    openingMatches,
    avgBranchingFactor: roundTo(avgBranchingFactor, 2),
    queuePressureScore: roundTo(queuePressureScore, 2),
    deadEndRisk: roundTo(deadEndRisk, 2),
    solutionDepth: solved.bestPath.length,
    expandedNodes: solved.expandedNodes,
    queuePeak: solved.queuePeak,
    recommendedHint,
  };
}

function buildRecommendedHint(level: CandidateLevel, clickedTileIds: string[]): HintPayload {
  const tileIds = clickedTileIds.slice(0, 2);

  if (tileIds.length === 0) {
    return {
      tileIds: [],
      reason: '当前候选关卡未找到稳定解链。',
    };
  }

  const firstTile = level.tiles.find((tile) => tile.id === tileIds[0]);
  const secondTile = level.tiles.find((tile) => tile.id === tileIds[1]);
  const sameFace = firstTile && secondTile && firstTile.face === secondTile.face;

  return {
    tileIds,
    reason: sameFace ? '优先拿下这一对，能用最低队列压力打开牌路。' : '先把这张牌送入托牌槽，给下一步的配对创造空间。',
  };
}

function countOpeningMatches(level: CandidateLevel, freeTileIds: string[]) {
  const tiles = freeTileIds.map((id) => level.tiles.find((tile) => tile.id === id)).filter((tile): tile is NonNullable<typeof tile> => Boolean(tile));
  const grouped = new Map<string, number>();

  for (const tile of tiles) {
    const key = faceGroup(tile.face);
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }

  let matches = 0;

  for (const count of grouped.values()) {
    if (count >= 2) {
      matches += 1;
    }
  }

  return matches;
}

function faceGroup(face: string) {
  if (face.startsWith('F')) {
    return 'flower';
  }

  if (face.startsWith('S')) {
    return 'season';
  }

  return face;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
