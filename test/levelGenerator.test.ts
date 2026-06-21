import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import { createCandidateLevel } from '../packages/level-generator/src/generator';
import { solveLevel } from '../packages/level-generator/src/solver';
import type { CandidateLevel } from '../packages/level-generator/src/types';

describe('level generator quality', () => {
  test('spreads designed pairs across the step queue instead of adjacent mirror matches', () => {
    const level = createCandidateLevel({ id: 3, seed: 'generated-level-003' });
    const solved = solveLevel(level, { maxExpandedNodes: 120_000 });
    const stats = pairQualityStats(level);

    assert.equal(solved.solvable, true);
    assert.ok(stats.averageSolutionGap >= 2.5, `expected average gap >= 2.5, got ${stats.averageSolutionGap}`);
    assert.ok(stats.sameLayerRatio < 0.95, `expected cross-layer pair mixing, got sameLayerRatio ${stats.sameLayerRatio}`);
    assert.ok(stats.mirrorLikeRatio < 0.45, `expected fewer mirror-like pairs, got ${stats.mirrorLikeRatio}`);
  });
});

function pairQualityStats(level: CandidateLevel) {
  const solutionIndex = new Map(level.solutionPreview.map((tileId, index) => [tileId, index]));
  const pairMap = new Map<number, CandidateLevel['tiles']>();
  const xs = level.tiles.map((tile) => tile.x);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const gaps: number[] = [];
  let sameLayerCount = 0;
  let mirrorLikeCount = 0;
  let pairCount = 0;

  for (const tile of level.tiles) {
    const pair = pairMap.get(tile.solutionPair) ?? [];
    pair.push(tile);
    pairMap.set(tile.solutionPair, pair);
  }

  for (const pair of pairMap.values()) {
    if (pair.length !== 2) {
      continue;
    }

    const [first, second] = pair;
    const firstIndex = solutionIndex.get(first.id);
    const secondIndex = solutionIndex.get(second.id);

    if (firstIndex === undefined || secondIndex === undefined) {
      continue;
    }

    pairCount += 1;
    gaps.push(Math.abs(firstIndex - secondIndex));

    if (first.z === second.z) {
      sameLayerCount += 1;
    }

    if (first.y === second.y && first.z === second.z && Math.abs((first.x + second.x) / 2 - centerX) < 0.51) {
      mirrorLikeCount += 1;
    }
  }

  return {
    averageSolutionGap: round(average(gaps)),
    sameLayerRatio: round(sameLayerCount / Math.max(1, pairCount)),
    mirrorLikeRatio: round(mirrorLikeCount / Math.max(1, pairCount)),
  };
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
