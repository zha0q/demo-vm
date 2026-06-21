import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCandidateLevel, generateLevelAsset } from './generator.js';
import type { CandidateLevel, GeneratedLevelAsset, GeneratedLevelIndex, GeneratedLevelIndexEntry } from './types.js';

export interface GenerateLevelSetOptions {
  count: number;
  outDir: string;
  seedBase?: string;
  candidateAttempts?: number;
}

export interface GenerateLevelSetResult {
  levels: GeneratedLevelAsset[];
  index: GeneratedLevelIndex;
  files: string[];
  elapsedMs: number;
}

export async function generateLevelSet(options: GenerateLevelSetOptions): Promise<GenerateLevelSetResult> {
  const startedAt = performance.now();
  const outDir = resolve(options.outDir);
  await mkdir(outDir, { recursive: true });

  const levels: GeneratedLevelAsset[] = [];
  const files: string[] = [];

  for (let index = 1; index <= options.count; index += 1) {
    const seedPrefix = `${options.seedBase ?? 'generated-level'}-${String(index).padStart(3, '0')}`;
    const asset = createBestLevelAsset(index, seedPrefix, options.candidateAttempts ?? 32);
    const path = resolve(outDir, `level-${String(index).padStart(3, '0')}.json`);

    await writeFile(path, JSON.stringify(asset, null, 2));
    console.log(
      `Generated #${asset.id} ${asset.name}: seed=${asset.seed}, nodes=${asset.analysis.expandedNodes}, depth=${asset.analysis.solutionDepth}, queuePeak=${asset.analysis.queuePeak}, difficulty=${asset.analysis.difficultyScore}`,
    );
    levels.push(asset);
    files.push(path);
  }

  const indexPayload: GeneratedLevelIndex = {
    version: 1,
    generatedAt: new Date().toISOString(),
    levels: levels.map<GeneratedLevelIndexEntry>((level, index) => ({
      id: level.id,
      name: level.name,
      subtitle: level.subtitle,
      difficultyScore: level.analysis.difficultyScore,
      iqWeight: level.analysis.iqWeight,
      path: `./level-${String(index + 1).padStart(3, '0')}.json`,
    })),
  };
  const indexPath = resolve(outDir, 'index.json');

  await writeFile(indexPath, JSON.stringify(indexPayload, null, 2));
  files.unshift(indexPath);

  return {
    levels,
    index: indexPayload,
    files,
    elapsedMs: Math.round(performance.now() - startedAt),
  };
}

function createBestLevelAsset(levelId: number, seedPrefix: string, attempts: number) {
  const solverAttempts = Math.min(8, attempts);
  const candidates = Array.from({ length: attempts }, (_, attempt) => {
    const seed = attempt === 0 ? seedPrefix : `${seedPrefix}-candidate-${String(attempt).padStart(2, '0')}`;
    const candidate = createCandidateLevel({ id: levelId, seed });

    return {
      candidate,
      preScore: scoreCandidateShape(candidate),
    };
  })
    .sort((left, right) => right.preScore - left.preScore)
    .slice(0, solverAttempts);
  let best: { asset: GeneratedLevelAsset; score: number } | null = null;

  for (const { candidate } of candidates) {
    const asset = generateLevelAsset(candidate);

    if (!asset.analysis.solvable) {
      continue;
    }

    const score = scoreLevelAsset(asset);

    if (!best || score > best.score) {
      best = { asset, score };
    }
  }

  return best?.asset ?? generateLevelAsset(createCandidateLevel({ id: levelId, seed: seedPrefix }));
}

function scoreCandidateShape(candidate: CandidateLevel) {
  const quality = pairQualityStats(candidate);

  return (
    quality.averageSolutionGap * 0.9 +
    quality.averageSpatialDistance * 0.48 -
    quality.nearPairRatio * 5.2 -
    quality.mirrorLikeRatio * 5.6 -
    quality.sameLayerRatio * 1.6
  );
}

function scoreLevelAsset(asset: GeneratedLevelAsset) {
  const quality = pairQualityStats(asset);
  const openingMatchRatio = asset.analysis.openingMatches / Math.max(1, asset.analysis.openingFreeTiles);

  return (
    asset.analysis.difficultyScore * 1.2 +
    asset.analysis.queuePressureScore * 4.2 +
    quality.averageSolutionGap * 0.58 +
    quality.averageSpatialDistance * 0.36 -
    quality.nearPairRatio * 4.0 -
    quality.mirrorLikeRatio * 4.8 -
    quality.sameLayerRatio * 1.2 -
    openingMatchRatio * 2.4
  );
}

function pairQualityStats(asset: Pick<CandidateLevel, 'tiles' | 'solutionPreview'>) {
  const solutionIndex = new Map(asset.solutionPreview.map((tileId, index) => [tileId, index]));
  const pairMap = new Map<number, CandidateLevel['tiles']>();
  const xs = asset.tiles.map((tile) => tile.x);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const gaps: number[] = [];
  const distances: number[] = [];
  let nearPairCount = 0;
  let sameLayerCount = 0;
  let mirrorLikeCount = 0;
  let pairCount = 0;

  for (const tile of asset.tiles) {
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

    const distance = Math.abs(first.x - second.x) + Math.abs(first.y - second.y) + Math.abs(first.z - second.z) * 2;
    pairCount += 1;
    gaps.push(Math.abs(firstIndex - secondIndex));
    distances.push(distance);

    if (distance <= 2) {
      nearPairCount += 1;
    }

    if (first.z === second.z) {
      sameLayerCount += 1;
    }

    if (first.y === second.y && first.z === second.z && Math.abs((first.x + second.x) / 2 - centerX) < 0.51) {
      mirrorLikeCount += 1;
    }
  }

  return {
    averageSolutionGap: average(gaps),
    averageSpatialDistance: average(distances),
    nearPairRatio: nearPairCount / Math.max(1, pairCount),
    sameLayerRatio: sameLayerCount / Math.max(1, pairCount),
    mirrorLikeRatio: mirrorLikeCount / Math.max(1, pairCount),
  };
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

async function main() {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const outDir = resolve(repoRoot, 'src/assets/levels');
  const singleLevelId = readSingleLevelId();

  if (singleLevelId) {
    await mkdir(outDir, { recursive: true });
    const seedPrefix = `generated-level-${String(singleLevelId).padStart(3, '0')}`;
    const asset = createBestLevelAsset(singleLevelId, seedPrefix, 32);
    const path = resolve(outDir, `level-${String(singleLevelId).padStart(3, '0')}.json`);

    await writeFile(path, JSON.stringify(asset, null, 2));
    console.log(
      `Generated #${asset.id} ${asset.name}: seed=${asset.seed}, nodes=${asset.analysis.expandedNodes}, depth=${asset.analysis.solutionDepth}, queuePeak=${asset.analysis.queuePeak}, difficulty=${asset.analysis.difficultyScore}`,
    );
    return;
  }

  const result = await generateLevelSet({ count: 20, outDir });

  console.log(`Generated ${result.levels.length} level assets in ${result.elapsedMs}ms`);
  for (const level of result.levels) {
    console.log(
      `- #${level.id} ${level.name}: nodes=${level.analysis.expandedNodes}, depth=${level.analysis.solutionDepth}, difficulty=${level.analysis.difficultyScore}, iqWeight=${level.analysis.iqWeight}`,
    );
  }
}

function readSingleLevelId() {
  const levelArg = process.argv.find((arg) => arg.startsWith('--level='));
  const value = levelArg?.split('=')[1];
  const levelId = value ? Number.parseInt(value, 10) : Number.NaN;

  return Number.isInteger(levelId) && levelId > 0 ? levelId : null;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
