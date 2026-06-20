export interface LevelLayoutRow {
  y: number;
  z: number;
  count: number;
  startX?: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  difficulty: number;
  hintCount: number;
  undoCount: number;
  comboBreakSeconds: number;
  faceVariety: number;
  includeSpecialFaces: boolean;
  layoutRows: LevelLayoutRow[];
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    id: 1,
    name: '庭前小局',
    subtitle: '双层压顶很少，适合热身。',
    difficulty: 1,
    hintCount: 3,
    undoCount: 3,
    comboBreakSeconds: 8,
    faceVariety: 8,
    includeSpecialFaces: true,
    layoutRows: [
      { y: 0, z: 0, count: 8 },
      { y: 1, z: 0, count: 8 },
      { y: 2, z: 0, count: 8 },
      { y: 3, z: 0, count: 8 },
      { y: 1, z: 1, count: 6, startX: 1 },
      { y: 2, z: 1, count: 6, startX: 1 },
      { y: 1, z: 2, count: 4, startX: 2 },
      { y: 2, z: 2, count: 4, startX: 2 },
    ],
  },
  {
    id: 2,
    name: '曲桥叠影',
    subtitle: '横向更宽，中层封口更明显。',
    difficulty: 3,
    hintCount: 3,
    undoCount: 2,
    comboBreakSeconds: 7,
    faceVariety: 14,
    includeSpecialFaces: true,
    layoutRows: [
      { y: 0, z: 0, count: 10, startX: -1 },
      { y: 1, z: 0, count: 10, startX: -1 },
      { y: 2, z: 0, count: 10, startX: -1 },
      { y: 3, z: 0, count: 8 },
      { y: 1, z: 1, count: 8 },
      { y: 2, z: 1, count: 8 },
      { y: 1, z: 2, count: 6, startX: 1 },
      { y: 2, z: 2, count: 6, startX: 1 },
      { y: 1, z: 3, count: 2, startX: 3 },
      { y: 2, z: 3, count: 2, startX: 3 },
    ],
  },
  {
    id: 3,
    name: '月台重楼',
    subtitle: '高层中心锁更多，牌面种类也更杂。',
    difficulty: 5,
    hintCount: 2,
    undoCount: 2,
    comboBreakSeconds: 6,
    faceVariety: 22,
    includeSpecialFaces: true,
    layoutRows: [
      { y: 0, z: 0, count: 10, startX: -1 },
      { y: 1, z: 0, count: 10, startX: -1 },
      { y: 2, z: 0, count: 10, startX: -1 },
      { y: 3, z: 0, count: 10, startX: -1 },
      { y: 4, z: 0, count: 8 },
      { y: 1, z: 1, count: 8 },
      { y: 2, z: 1, count: 8 },
      { y: 3, z: 1, count: 8 },
      { y: 1, z: 2, count: 6, startX: 1 },
      { y: 2, z: 2, count: 6, startX: 1 },
      { y: 3, z: 2, count: 4, startX: 2 },
      { y: 2, z: 3, count: 2, startX: 3 },
    ],
  },
];

export function getLevelConfig(levelId: number) {
  return LEVEL_CONFIGS.find((config) => config.id === levelId) ?? LEVEL_CONFIGS[0];
}
