import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCandidateLevel, generateLevelAsset } from './generator.js';
import type { GeneratedLevelAsset, GeneratedLevelIndex, GeneratedLevelIndexEntry } from './types.js';

export interface GenerateLevelSetOptions {
  count: number;
  outDir: string;
  seedBase?: string;
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
    const seed = `${options.seedBase ?? 'generated-level'}-${String(index).padStart(3, '0')}`;
    const asset = generateLevelAsset(createCandidateLevel({ id: index, seed }));
    const path = resolve(outDir, `level-${String(index).padStart(3, '0')}.json`);

    await writeFile(path, JSON.stringify(asset, null, 2));
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

async function main() {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const outDir = resolve(repoRoot, 'src/assets/levels');
  const result = await generateLevelSet({ count: 20, outDir });

  console.log(`Generated ${result.levels.length} level assets in ${result.elapsedMs}ms`);
  for (const level of result.levels) {
    console.log(
      `- #${level.id} ${level.name}: nodes=${level.analysis.expandedNodes}, depth=${level.analysis.solutionDepth}, difficulty=${level.analysis.difficultyScore}, iqWeight=${level.analysis.iqWeight}`,
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
