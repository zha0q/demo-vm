export interface LevelLayoutRow {
  y: number;
  z: number;
  count: number;
  startX?: number;
}

export interface LevelTemplate {
  id: number;
  name: string;
  subtitle: string;
  faceVariety: number;
  includeSpecialFaces: boolean;
  hintCount: number;
  undoCount: number;
  comboBreakSeconds: number;
  layoutRows: LevelLayoutRow[];
}

export interface GeneratedLevelTile {
  id: string;
  face: string;
  x: number;
  y: number;
  z: number;
  solutionPair: number;
}

export interface QueueConfig {
  capacity: number;
}

export interface HintPayload {
  tileIds: string[];
  reason: string;
}

export interface GeneratedLevelAnalysis {
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
  recommendedHint: HintPayload;
}

export interface GeneratedLevelAsset {
  version: 1;
  id: number;
  name: string;
  subtitle: string;
  seed: string;
  queue: QueueConfig;
  hintCount: number;
  undoCount: number;
  comboBreakSeconds: number;
  tiles: GeneratedLevelTile[];
  analysis: GeneratedLevelAnalysis;
  solutionPreview: string[];
}

export interface GeneratedLevelIndexEntry {
  id: number;
  name: string;
  subtitle: string;
  difficultyScore: number;
  iqWeight: number;
  path: string;
}

export interface GeneratedLevelIndex {
  version: 1;
  generatedAt: string;
  levels: GeneratedLevelIndexEntry[];
}

export interface CandidateLevel {
  template: LevelTemplate;
  seed: string;
  queue: QueueConfig;
  tiles: GeneratedLevelTile[];
  solutionPreview: string[];
}

export interface SolverMove {
  clickedTileId: string;
  queueAfter: string[];
  matchedTileIds: string[];
}

export interface SolverResult {
  solvable: boolean;
  bestPath: SolverMove[];
  expandedNodes: number;
  queuePeak: number;
}

export interface GenerateLevelOptions {
  id: number;
  seed: string;
}
