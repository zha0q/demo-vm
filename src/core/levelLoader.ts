import levelIndexData from '../assets/levels/index.json';
import level001Data from '../assets/levels/level-001.json';
import level002Data from '../assets/levels/level-002.json';
import level003Data from '../assets/levels/level-003.json';
import level004Data from '../assets/levels/level-004.json';
import level005Data from '../assets/levels/level-005.json';
import level006Data from '../assets/levels/level-006.json';
import level007Data from '../assets/levels/level-007.json';
import level008Data from '../assets/levels/level-008.json';
import level009Data from '../assets/levels/level-009.json';
import level010Data from '../assets/levels/level-010.json';
import level011Data from '../assets/levels/level-011.json';
import level012Data from '../assets/levels/level-012.json';
import level013Data from '../assets/levels/level-013.json';
import level014Data from '../assets/levels/level-014.json';
import level015Data from '../assets/levels/level-015.json';
import level016Data from '../assets/levels/level-016.json';
import level017Data from '../assets/levels/level-017.json';
import level018Data from '../assets/levels/level-018.json';
import level019Data from '../assets/levels/level-019.json';
import level020Data from '../assets/levels/level-020.json';
import type { Tile } from '../game/board';

export interface LevelTileAsset {
  id: string;
  face: string;
  x: number;
  y: number;
  z: number;
  solutionPair: number;
}

export interface LevelHint {
  tileIds: string[];
  reason: string;
}

export interface LevelAnalysis {
  solvable: boolean;
  difficultyScore: number;
  iqWeight: number;
  openingFreeTiles: number;
  openingMatches: number;
  avgBranchingFactor: number;
  queuePressureScore: number;
  deadEndRisk: number;
  solutionDepth: number;
  expandedNodes: number;
  queuePeak: number;
  recommendedHint: LevelHint;
}

export interface LevelAsset {
  version: 1;
  id: number;
  name: string;
  subtitle: string;
  seed: string;
  queue: {
    capacity: number;
  };
  hintCount: number;
  undoCount: number;
  comboBreakSeconds: number;
  tiles: LevelTileAsset[];
  analysis: LevelAnalysis;
  solutionPreview: string[];
}

export interface LevelCatalogEntry {
  id: number;
  name: string;
  subtitle: string;
  difficultyScore: number;
  iqWeight: number;
  path: string;
}

interface LevelIndexAsset {
  version: 1;
  generatedAt: string;
  levels: LevelCatalogEntry[];
}

export interface RuntimeLevel extends LevelAsset {
  difficultyScore: number;
  iqWeight: number;
  recommendedHint: LevelHint;
  queuePeak: number;
  expandedNodes: number;
}

const levelIndex = levelIndexData as LevelIndexAsset;
const levelAssets = [
  level001Data,
  level002Data,
  level003Data,
  level004Data,
  level005Data,
  level006Data,
  level007Data,
  level008Data,
  level009Data,
  level010Data,
  level011Data,
  level012Data,
  level013Data,
  level014Data,
  level015Data,
  level016Data,
  level017Data,
  level018Data,
  level019Data,
  level020Data,
] as LevelAsset[];
const levelsById = new Map(levelAssets.map((level) => [level.id, normalizeLevel(level)]));

export const levelCatalog = levelIndex.levels.map((entry) => ({
  id: entry.id,
  name: entry.name,
  subtitle: entry.subtitle,
  difficultyScore: entry.difficultyScore,
  iqWeight: entry.iqWeight,
}));

export function getLevel(levelId: number): RuntimeLevel {
  return levelsById.get(levelId) ?? levelsById.get(levelCatalog[0]?.id ?? 1) ?? normalizeLevel(levelAssets[0]);
}

export function createLevelTiles(levelId = 1): Tile[] {
  return getLevel(levelId).tiles.map((tile) => ({
    ...tile,
    removed: false,
    state: 'active',
  }));
}

function normalizeLevel(level: LevelAsset): RuntimeLevel {
  return {
    ...level,
    tiles: level.tiles.map((tile) => ({ ...tile })),
    analysis: {
      ...level.analysis,
      recommendedHint: {
        ...level.analysis.recommendedHint,
        tileIds: [...level.analysis.recommendedHint.tileIds],
      },
    },
    solutionPreview: [...level.solutionPreview],
    difficultyScore: level.analysis.difficultyScore,
    iqWeight: level.analysis.iqWeight,
    recommendedHint: {
      ...level.analysis.recommendedHint,
      tileIds: [...level.analysis.recommendedHint.tileIds],
    },
    queuePeak: level.analysis.queuePeak,
    expandedNodes: level.analysis.expandedNodes,
  };
}
