import type { LevelLayoutRow, LevelTemplate } from './types.js';

interface TemplateInput {
  id: number;
  name: string;
  subtitle: string;
  faceVariety: number;
  includeSpecialFaces?: boolean;
  hintCount: number;
  undoCount: number;
  comboBreakSeconds: number;
  layoutRows: LevelLayoutRow[];
}

export const LEVEL_TEMPLATES: LevelTemplate[] = [
  template({
    id: 1,
    name: '庭前叠影',
    subtitle: '开局就有三层压顶，需要观察边缘释放顺序。',
    faceVariety: 14,
    hintCount: 2,
    undoCount: 3,
    comboBreakSeconds: 7,
    layoutRows: [
      ...block(0, [10, 10, 10, 10, 8], -1),
      ...block(1, [8, 8, 6], 0, 1),
      ...block(2, [4, 4], 2, 1),
      row(2, 3, 2, 4),
    ],
  }),
  template({
    id: 2,
    name: '曲桥叠影',
    subtitle: '参考 Bridge 的横向拱桥轮廓，边缘入口更多。',
    faceVariety: 12,
    hintCount: 3,
    undoCount: 3,
    comboBreakSeconds: 8,
    layoutRows: [
      ...block(0, [10, 8, 10, 8, 10], -1),
      ...block(1, [8, 8, 8], 0, 1),
      ...block(2, [4, 4], 2, 2),
    ],
  }),
  template({
    id: 3,
    name: '龟背初叠',
    subtitle: '借鉴 Turtle 的稳定龟背，中心层压开始出现。',
    faceVariety: 14,
    hintCount: 3,
    undoCount: 2,
    comboBreakSeconds: 7,
    layoutRows: [
      ...block(0, [8, 10, 10, 10, 8], 0),
      ...block(1, [8, 8, 8], 1, 1),
      ...block(2, [6, 6], 2, 1),
      row(2, 3, 2, 4),
    ],
  }),
  template({
    id: 4,
    name: '沙漏回环',
    subtitle: '参考 Hourglass，中段收窄后再展开。',
    faceVariety: 16,
    hintCount: 3,
    undoCount: 2,
    comboBreakSeconds: 7,
    layoutRows: [
      ...block(0, [12, 8, 6, 8, 12], -1),
      ...block(1, [8, 6, 8], 1, 1),
      ...block(2, [4, 4], 3, 1),
      row(2, 3, 2, 4),
    ],
  }),
  template({
    id: 5,
    name: '黑洞外环',
    subtitle: '参考 Black Hole 的环形缺口，中心需要绕行打开。',
    faceVariety: 18,
    hintCount: 3,
    undoCount: 2,
    comboBreakSeconds: 7,
    layoutRows: [
      ...rows(0, [
        [8, 0],
        [8, 0],
        [4, 0],
        [4, 4],
        [4, 0],
        [4, 4],
        [8, 0],
        [8, 0],
      ]),
      ...block(1, [6, 4, 4, 6], 1, 1),
      ...block(2, [4, 4], 2, 2),
    ],
  }),
  template({
    id: 6,
    name: '金字塔基',
    subtitle: '参考 Pyramid，层层收束但入口仍清晰。',
    faceVariety: 18,
    hintCount: 3,
    undoCount: 2,
    comboBreakSeconds: 7,
    layoutRows: [
      ...block(0, [10, 10, 10, 10, 10, 10], -1),
      ...block(1, [8, 8, 8, 8], 0, 1),
      ...block(2, [6, 6], 1, 2),
      row(2, 3, 4, 2),
    ],
  }),
  template({
    id: 7,
    name: '蝶翼双开',
    subtitle: '参考 Butterfly，左右翼分散，托牌槽要控节奏。',
    faceVariety: 20,
    hintCount: 3,
    undoCount: 2,
    comboBreakSeconds: 6,
    layoutRows: [
      ...rows(0, [
        [4, -1],
        [4, 7],
        [6, -1],
        [6, 5],
        [8, 0],
        [8, 3],
        [6, -1],
        [6, 5],
        [4, -1],
        [4, 7],
      ]),
      ...rows(1, [
        [4, 1],
        [4, 6],
        [6, 2],
        [6, 3],
      ]),
      ...block(2, [4, 4], 3, 1),
    ],
  }),
  template({
    id: 8,
    name: '竞技场',
    subtitle: '参考 Arena，外围宽阔，内圈压住关键路口。',
    faceVariety: 20,
    hintCount: 2,
    undoCount: 2,
    comboBreakSeconds: 6,
    layoutRows: [
      ...block(0, [12, 10, 8, 8, 10, 12], -1),
      ...rows(1, [
        [4, 0],
        [4, 7],
        [6, 2],
        [6, 4],
      ]),
      ...block(2, [4, 4], 3, 2),
      row(2, 3, 2, 4),
    ],
  }),
  template({
    id: 9,
    name: '中心火种',
    subtitle: '参考 Center Point 与 Fire，中心高层决定展开顺序。',
    faceVariety: 22,
    hintCount: 2,
    undoCount: 2,
    comboBreakSeconds: 6,
    layoutRows: [
      ...block(0, [6, 8, 10, 12, 10, 8, 6], 0),
      ...block(1, [6, 8, 8, 6], 2, 1),
      ...block(2, [4, 4, 4], 3, 1),
      row(2, 3, 2, 4),
    ],
  }),
  template({
    id: 10,
    name: '断墙缺口',
    subtitle: '参考 Broken Wall，分段墙体让边缘优先级更重要。',
    faceVariety: 22,
    hintCount: 2,
    undoCount: 2,
    comboBreakSeconds: 6,
    layoutRows: [
      ...rows(0, [
        [4, -1],
        [4, 4],
        [4, 9],
        [4, -1],
        [4, 4],
        [4, 9],
        [8, 1],
        [8, 4],
        [4, -1],
        [4, 4],
        [4, 9],
      ]),
      ...block(1, [8, 6, 8], 1, 1),
      ...block(2, [4, 4], 3, 2),
      row(2, 3, 2, 4),
    ],
  }),
  template({
    id: 11,
    name: '台阶斜影',
    subtitle: '参考 Steps，斜向递进让高层释放更慢。',
    faceVariety: 24,
    hintCount: 2,
    undoCount: 2,
    comboBreakSeconds: 6,
    layoutRows: [
      ...rows(0, [
        [12, -1],
        [10, 0],
        [10, 1],
        [8, 2],
        [8, 3],
        [6, 4],
        [6, 5],
      ]),
      ...rows(1, [
        [8, 0],
        [8, 1],
        [6, 3],
        [6, 4],
      ]),
      ...rows(2, [
        [4, 3],
        [4, 4],
      ]),
      row(1, 3, 2, 5),
    ],
  }),
  template({
    id: 12,
    name: '堡垒中庭',
    subtitle: '参考 Fortress，四角厚墙夹住中庭。',
    faceVariety: 24,
    hintCount: 2,
    undoCount: 2,
    comboBreakSeconds: 6,
    layoutRows: [
      ...rows(0, [
        [6, -1],
        [6, 7],
        [4, -1],
        [4, 9],
        [8, 2],
        [8, 2],
        [4, -1],
        [4, 9],
        [6, -1],
        [6, 7],
      ]),
      ...rows(1, [
        [4, 0],
        [4, 8],
        [6, 3],
        [6, 3],
      ]),
      ...block(2, [4, 4], 4, 1),
      row(2, 3, 2, 5),
    ],
  }),
  template({
    id: 13,
    name: '神庙阶廊',
    subtitle: '参考 Temple，多层中轴压顶，分支选择增多。',
    faceVariety: 26,
    hintCount: 2,
    undoCount: 2,
    comboBreakSeconds: 5,
    layoutRows: [
      ...block(0, [12, 10, 10, 12, 12, 10, 10, 12], -1),
      ...block(1, [8, 8, 8, 8], 1, 2),
      ...block(2, [6, 6, 6], 2, 1),
      ...block(3, [4, 4], 3, 1),
    ],
  }),
  template({
    id: 14,
    name: '雪片六芒',
    subtitle: '参考 Flakes，放射状边缘多但中心压力高。',
    faceVariety: 26,
    hintCount: 2,
    undoCount: 1,
    comboBreakSeconds: 5,
    layoutRows: [
      ...rows(0, [
        [2, 0],
        [2, 11],
        [6, 3],
        [6, 5],
        [12, 0],
        [8, 2],
        [8, 4],
        [12, 0],
        [6, 3],
        [6, 5],
        [2, 0],
        [2, 11],
      ]),
      ...block(1, [8, 6, 6, 8], 2, 1),
      ...block(2, [4, 4, 4], 4, 1),
      row(2, 3, 2, 5),
    ],
  }),
  template({
    id: 15,
    name: '菱心回廊',
    subtitle: '参考 Diamond，外松内紧，后半段更依赖记忆。',
    faceVariety: 28,
    hintCount: 2,
    undoCount: 1,
    comboBreakSeconds: 5,
    layoutRows: [
      ...block(0, [4, 8, 12, 14, 12, 8, 4], -1),
      ...block(1, [6, 8, 10, 8, 6], 2, 1),
      ...block(2, [6, 6, 6], 3, 1),
      ...block(3, [4, 4], 4, 1),
      row(2, 4, 2, 5),
    ],
  }),
  template({
    id: 16,
    name: '白龙回字',
    subtitle: '参考 White Dragon，回字结构让开口判断更刁钻。',
    faceVariety: 28,
    hintCount: 2,
    undoCount: 1,
    comboBreakSeconds: 5,
    layoutRows: [
      ...rows(0, [
        [12, 0],
        [2, 0],
        [2, 10],
        [4, 3],
        [4, 5],
        [2, 0],
        [2, 10],
        [4, 3],
        [4, 5],
        [2, 0],
        [2, 10],
        [12, 0],
      ]),
      ...block(1, [10, 8, 8, 10], 1, 1),
      ...block(2, [6, 6], 3, 2),
      ...block(3, [4, 4], 4, 1),
    ],
  }),
  template({
    id: 17,
    name: '绿龙折线',
    subtitle: '参考 Green Dragon，折线多段释放，托牌槽压力提高。',
    faceVariety: 30,
    hintCount: 1,
    undoCount: 1,
    comboBreakSeconds: 5,
    layoutRows: [
      ...rows(0, [
        [4, 3],
        [6, 5],
        [8, 1],
        [4, 8],
        [10, 0],
        [6, 6],
        [10, 0],
        [4, 8],
        [8, 1],
        [6, 5],
        [4, 3],
      ]),
      ...rows(1, [
        [6, 4],
        [6, 5],
        [8, 2],
        [8, 3],
      ]),
      ...block(2, [6, 6, 4], 3, 1),
      ...block(3, [4, 4], 4, 1),
    ],
  }),
  template({
    id: 18,
    name: '红龙纵列',
    subtitle: '参考 Red Dragon，多层纵列锁定中线。',
    faceVariety: 30,
    hintCount: 1,
    undoCount: 1,
    comboBreakSeconds: 5,
    layoutRows: [
      ...rows(0, [
        [2, 5],
        [4, 4],
        [2, 5],
        [4, 4],
        [10, 0],
        [2, 5],
        [4, 4],
        [2, 5],
        [4, 4],
        [10, 0],
        [2, 5],
        [2, 5],
      ]),
      ...rows(1, [
        [2, 5],
        [4, 4],
        [8, 1],
        [4, 4],
        [2, 5],
      ]),
      ...block(2, [6, 6, 6], 3, 1),
      ...block(3, [4, 4], 4, 1),
      row(2, 4, 2, 5),
    ],
  }),
  template({
    id: 19,
    name: '龙首回旋',
    subtitle: '参考 Dragon，头尾分离，需要按高层线索拆解。',
    faceVariety: 32,
    hintCount: 1,
    undoCount: 1,
    comboBreakSeconds: 4,
    layoutRows: [
      ...rows(0, [
        [4, 1],
        [8, 3],
        [10, 1],
        [4, 9],
        [12, 0],
        [6, 6],
        [12, 0],
        [4, 9],
        [10, 1],
        [8, 3],
        [4, 1],
      ]),
      ...rows(1, [
        [6, 2],
        [8, 3],
        [8, 2],
        [6, 5],
      ]),
      ...block(2, [6, 6, 6], 3, 1),
      ...block(3, [4, 4], 4, 1),
      row(2, 4, 2, 5),
    ],
  }),
  template({
    id: 20,
    name: '终局重楼',
    subtitle: '融合 Turtle 与 Temple 的终局重楼，层压和槽位压力最高。',
    faceVariety: 34,
    hintCount: 1,
    undoCount: 1,
    comboBreakSeconds: 4,
    layoutRows: [
      ...block(0, [12, 12, 12, 12, 12, 12, 12, 12], -1),
      ...block(1, [10, 10, 10, 10, 10], 0, 1),
      ...block(2, [8, 8, 8, 8], 1, 1),
      ...block(3, [6, 6, 6], 2, 1),
      ...block(4, [4, 4], 3, 1),
    ],
  }),
];

export function getTemplateById(id: number) {
  return LEVEL_TEMPLATES.find((template) => template.id === id) ?? LEVEL_TEMPLATES[0];
}

function template(input: TemplateInput): LevelTemplate {
  return {
    includeSpecialFaces: true,
    ...input,
  };
}

function row(y: number, z: number, count: number, startX = 0): LevelLayoutRow {
  return { y, z, count, startX };
}

function block(z: number, counts: number[], startX = 0, startY = 0): LevelLayoutRow[] {
  return counts.map((count, y) => row(startY + y, z, count, startX + Math.floor((max(counts) - count) / 2)));
}

function rows(z: number, specs: Array<[count: number, startX: number]>, startY = 0): LevelLayoutRow[] {
  return specs.map(([count, startX], y) => row(startY + y, z, count, startX));
}

function max(values: number[]) {
  return Math.max(...values);
}
