# 参考 Vita Mahjong 风格的 3D 麻将连连看实现计划

> **给 Agent 使用：** 在执行此计划前，必须先使用 `.agent/skills/mahjong-project-workflow`。涉及规则工作时，也要使用 `.agent/skills/mahjong-solitaire-rules`；涉及 IQ 工作时，使用 `.agent/skills/mahjong-in-game-iq`；涉及 Three.js 工作时，使用 `.agent/skills/threejs-mahjong-scene`。

**目标：** 构建一个精致的单屏 3D 堆叠式麻将连连看配对游戏，整体气质参考 Vita Mahjong 所属的广义类型，但不复制受保护的素材、关卡、品牌或文案。

**架构：** 保持规则逻辑与渲染分离。游戏真相位于 `src/game` 下的纯 TypeScript 模块中，React 负责页面状态，`src/render` 下的 Three.js 只负责把状态可视化并回传牌点击。

**技术栈：** React 18、Vite 6、TypeScript、Three.js、Less、Vitest。

---

## 1. 产品范围

### 1.1 页面

- 首页：底部有一个浮动主按钮，点击后进入最新未清关卡。
- 游戏页：单屏纵向游戏画面，包含顶部控件、局内 IQ、步骤队列、3D 棋盘和底部操作。
- 完成页：展示最终时间、分数、连击、步数和最终局内 IQ。

### 1.2 核心功能

- 3D 堆叠麻将牌棋盘。
- 可点击选牌与高亮。
- 麻将连连看可选规则：只有在未被覆盖且至少有一个水平侧面开放时才可选。
- 配对规则：普通牌只与相同牌面匹配；花牌与花牌匹配；季节牌与季节牌匹配。
- 最大 4 格的步骤队列。
- 一旦队列中出现匹配，立即移除该对子。
- 提示、洗牌、撤销、重开、关卡选择、计时、计分、连击和完成检测。
- 基于当前进度、连击和耗时的局内 IQ。
- 覆盖可选性、配对、队列、撤销、洗牌、可解性和 IQ 的纯规则测试。

### 1.3 非目标

- 不在面向用户的界面里使用 Vita Mahjong 的名称、Logo、原始美术、音效、关卡数据或受保护的 UI 表达。
- MVP 不实现账号、云存档、广告、支付或排行榜。
- 不把 IQ 当成真实智力测量。它只是本局内的鼓励分。

## 2. 现有项目快照

当前项目已经包含：

- `src/game/board.ts`：当前的棋盘规则、匹配、移除、撤销、洗牌辅助函数。
- `src/game/levels.ts`：当前的程序化关卡布局定义。
- `src/game/persistence.ts`：本地保存辅助函数。
- `src/render/mahjongScene.ts`：Three.js 棋盘渲染和点击拾取。
- `src/render/cameraControls.ts`：摄像机控制辅助函数。
- `src/App.tsx`：当前的单屏演示 UI。
- `test/*.test.ts`：针对棋盘、持久化、摄像机和布局的 Vitest 覆盖。

实现应在这个原型上演进，而不是完全推倒重来。

## 3. 目标文件结构

```txt
src/
  App.tsx
  main.tsx
  styles.less
  game/
    board.ts
    levels.ts
    persistence.ts
    constants.ts
    config.ts
    matchRules.ts
    boardRules.ts
    stepQueue.ts
    gameReducer.ts
    undoManager.ts
    hintService.ts
    shuffleService.ts
    solvabilityChecker.ts
    inGameIqCalculator.ts
    scoring.ts
  render/
    mahjongScene.ts
    cameraControls.ts
    tileMeshFactory.ts
    tileAnimations.ts
  ui/
    HomePage.tsx
    GamePage.tsx
    CompletePage.tsx
    TopBar.tsx
    MoreMenu.tsx
    IqPanel.tsx
    StepQueueView.tsx
    BottomActions.tsx
    LevelSelectModal.tsx
test/
  board.test.ts
  matchRules.test.ts
  boardRules.test.ts
  stepQueue.test.ts
  undoManager.test.ts
  hintService.test.ts
  shuffleService.test.ts
  solvabilityChecker.test.ts
  inGameIqCalculator.test.ts
```

## 4. 全局常量与配置

创建 `src/game/constants.ts`，存放静态常量：

```ts
// 步骤队列容量。玩家最多可以持有四张未配对的已选牌。
export const STEP_QUEUE_MAX_SIZE = 4;

// 在积累足够进度之前，局内 IQ 会尽量接近 100。
export const IQ_CONFIDENCE_PROGRESS_THRESHOLD = 0.12;

// IQ 评分使用的单对子参考耗时。
export const IQ_SECONDS_PER_PAIR = 5.0;

export const IQ_MIN = 85;
export const IQ_MAX = 155;
export const HINT_HIGHLIGHT_DURATION_MS = 1200;
export const MATCH_ANIMATION_DURATION_MS = 650;
export const MORE_MENU_STAGGER_MS = 70;
export const AUTO_COMPLETE_MAX_REMAINING_TILES = 20;
export const AUTO_COMPLETE_STEP_DELAY_MS = 260;
export const SAVE_DATA_KEY = 'mahjong-stack-save-v1';
export const BLOCK_EPSILON = 0.01;
```

创建 `src/game/config.ts`，存放关卡和玩法调参：

```ts
export interface LevelConfig {
  id: number;
  hintCount: number;
  undoCount: number;
  shuffleCount: number;
  queueOverflowFail: boolean;
  requireSolvableAfterShuffle: boolean;
  comboBreakSeconds: number;
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    id: 1,
    hintCount: 3,
    undoCount: 3,
    shuffleCount: 1,
    queueOverflowFail: false,
    requireSolvableAfterShuffle: true,
    comboBreakSeconds: 8,
  },
];
```

## 5. 规则模型

### 5.1 牌类型

保持当前 `Tile` 结构兼容，然后逐步迁移为：

```ts
export type TileState = 'active' | 'queued' | 'matching' | 'removed' | 'animating';

export interface Tile {
  id: string;
  face: string;
  x: number;
  y: number;
  z: number;
  removed?: boolean;
  state?: TileState;
  solutionPair?: number;
}
```

### 5.2 可选性

一张牌在同时满足以下条件时是可选的：

- 牌存在且未被移除。
- 没有更高层的激活牌在 x/y 投影上覆盖它。
- 同一层左侧或右侧至少有一边是开放的。

规则函数必须保持纯函数，并且有测试覆盖。

### 5.3 匹配

使用牌面分组语义：

- 普通牌只能与同一牌面匹配。
- `F1` 到 `F4` 属于花牌组，可以互相匹配。
- `S1` 到 `S4` 属于季节牌组，可以互相匹配。

## 6. 步骤队列

添加 `src/game/stepQueue.ts`。

规则：

- 队列最大值为 `STEP_QUEUE_MAX_SIZE`。
- 选中的开放牌会进入队列。
- 如果它能和已有队列牌匹配，则优先选最早入队的那张。
- 两张匹配牌会在队列里靠近、碰撞，然后被移除。
- 如果队列已满，而新牌不能立即匹配，则拒绝该操作。
- MVP 不应该因为队列溢出就直接失败关卡。

核心 API：

```ts
export interface StepQueueState {
  tileIds: string[];
  matchingTileIds: string[];
}

export function canAcceptTile(queue: StepQueueState, tile: Tile, tiles: Tile[]): boolean;
export function enqueueTile(queue: StepQueueState, tile: Tile, tiles: Tile[]): StepQueueResult;
```

## 7. 局内 IQ

添加 `src/game/inGameIqCalculator.ts`。

输入：

```ts
export interface InGameIqInput {
  clearedPairs: number;
  totalPairs: number;
  currentCombo: number;
  elapsedSeconds: number;
}
```

输出：

```ts
export interface InGameIqResult {
  iq: number;
  progressScore: number;
  comboScore: number;
  timeScore: number;
  confidence: number;
  label: string;
}
```

公式：

```ts
const P = clearedPairs / totalPairs;
const C = currentCombo;
const t = elapsedSeconds;
const N = totalPairs;
const TRef = N * 5.0;

const progressScore = 100 * Math.sqrt(P);
const comboScore = 100 * (1 - Math.exp(-C / 6));
const expectedNow = TRef * (0.10 + 0.90 * P);
const timeScore = 100 / (1 + Math.exp((t - expectedNow) / (0.18 * TRef + 8)));
const q = 0.45 * progressScore + 0.30 * timeScore + 0.25 * comboScore;
const raw = clamp(85 + 0.70 * q, 85, 155);
const confidence = clamp(P / 0.12, 0, 1);
const iq = Math.round(100 * (1 - confidence) + raw * confidence);
```

标签：

| 范围 | 标签 |
|---:|---|
| 85-99 | 稳定观察中 |
| 100-114 | 思路在线 |
| 115-129 | 节奏不错 |
| 130-144 | 高效清台 |
| 145-155 | 神级状态 |

## 8. 撤销、提示、洗牌、可解性

### 8.1 撤销

使用基于快照的命令，这样队列、分数、连击、剩余数量、计时输入和牌状态都能完整恢复。

```ts
export interface GameCommand {
  id: string;
  type: 'select' | 'match' | 'shuffle' | 'hint';
  before: GameSnapshot;
  after: GameSnapshot;
  createdAt: number;
}
```

### 8.2 提示

提示优先级：

- 优先提示队列中的牌与棋盘开放牌的匹配。
- 其次提示两张开放棋盘牌的匹配。
- 如果没有可用提示，就不要消耗提示次数。

### 8.3 洗牌

洗牌只重新分配剩余牌面的顺序，不改变位置。洗牌后：

- 剩余牌面的分配必须仍然可配对。
- 至少要有一个可用移动。
- 如果有配置，就运行可解性检查。
- 洗牌必须可撤销。

### 8.4 可解性

规则测试和关卡校验使用带记忆化状态哈希的递归搜索。运行时可以先用轻量检查，或者以后移到 Web Worker。

```ts
export interface SolvabilityResult {
  solvable: boolean;
  searchedNodes: number;
  timedOut: boolean;
  sampleSolution?: string[];
}
```

## 9. UI 要求

### 9.1 首页

- 底部浮动主按钮进入最新未清关卡。
- 如果所有关卡都已清除，则进入最新已解锁关卡。
- 显示轻量级关卡进度。

### 9.2 游戏页

- 左上角：返回首页按钮。
- 右上角：更多按钮。
- 更多菜单从右向左展开：静音、自动完成、重开。
- 顶部居中：本局 IQ。
- IQ 下方：四格步骤队列。
- 中间：Three.js 棋盘。
- 底部：关卡选择、提示、撤销。
- 提示和撤销显示红点剩余次数。
- 用尽的操作应处于禁用状态。

### 9.3 完成页

显示：

- 关卡名称。
- 用时。
- 分数。
- 步数。
- 最大连击。
- 最终局内 IQ。
- 下一关、重玩、回首页操作。

## 10. 响应式布局

规则：

- 页面不能滚动。
- 文字和控件使用固定像素尺寸。
- 垂直间距和 Three.js 棋盘区域去适配不同屏幕差异。
- 顶部 IQ 和队列保持贴顶。
- 底部操作按钮保持贴底，并尊重安全区域。
- 3D 摄像机要把当前激活牌框在剩余的中间区域内。

目标验证尺寸：

- 375x667
- 390x844
- 430x932
- 768x1024

## 11. 原型图与浏览器验证

为以下内容创建原型视图或调试模式：

- 首页布局。
- 游戏布局。
- 完成布局。
- 针对目标视口的布局对比。
- 流程/状态图视图。

验证清单：

- 没有浏览器滚动条。
- 没有 UI 重叠。
- 队列在小屏宽度内保持完整。
- 底部按钮不会盖住棋盘。
- 更多菜单按要求朝指定方向展开。
- IQ 和队列在棋盘变化时仍保持可见。

## 12. 实现任务

### 任务 1：建立项目常量和配置

**文件：**

- 新建：`src/game/constants.ts`
- 新建：`src/game/config.ts`
- 按需修改现有模块中的导入
- 测试：`npm test`

步骤：

- [ ] 在 `constants.ts` 中创建队列、IQ、动画、保存和几何常量。
- [ ] 在 `config.ts` 中创建 `LevelConfig` 和初始关卡配置。
- [ ] 在简单且安全的地方替换散落的魔法数字。
- [ ] 运行 `npm test`。
- [ ] 提交，提交信息为 `feat: add game constants and level config`。

### 任务 2：拆分匹配和棋盘规则

**文件：**

- 新建：`src/game/matchRules.ts`
- 新建：`src/game/boardRules.ts`
- 修改：`src/game/board.ts`
- 测试：`test/matchRules.test.ts`、`test/boardRules.test.ts`、`test/board.test.ts`

步骤：

- [ ] 为普通牌、花牌和季节牌的匹配写测试。
- [ ] 把 `faceGroup` 和 `canMatch` 移到 `matchRules.ts`。
- [ ] 为覆盖、阻挡、左侧开放、右侧开放、已移除和缺失牌写测试。
- [ ] 把可选性逻辑移到 `boardRules.ts`。
- [ ] 如果当前 UI 还在导入，保留 `board.ts` 的向后兼容导出。
- [ ] 运行 `npm test`。
- [ ] 提交，提交信息为 `refactor: split mahjong rule modules`。

### 任务 3：添加步骤队列逻辑

**文件：**

- 新建：`src/game/stepQueue.ts`
- 修改：`src/game/board.ts` 或新的 reducer 模块
- 测试：`test/stepQueue.test.ts`

步骤：

- [ ] 为入队、立即匹配、队列满时拒绝、队列满但允许立即匹配写失败测试。
- [ ] 实现队列状态和结果类型。
- [ ] 实现最早匹配选择。
- [ ] 在游戏状态里接入队列，但暂时不改渲染。
- [ ] 运行 `npm test`。
- [ ] 提交，提交信息为 `feat: add step queue matching`。

### 任务 4：添加局内 IQ 计算器

**文件：**

- 新建：`src/game/inGameIqCalculator.ts`
- 新建：`test/inGameIqCalculator.test.ts`
- 修改：后续在 `src/ui/IqPanel.tsx` 或当前 `src/App.tsx` 中接入 UI

步骤：

- [ ] 为开局 IQ 接近 100、边界 85-155、进度提升、连击提升和慢速时间惩罚写测试。
- [ ] 使用 SDD 公式实现计算器。
- [ ] 导出标签映射。
- [ ] 在当前 UI 或计划中的 `IqPanel` 中加一个临时 IQ 显示。
- [ ] 运行 `npm test`。
- [ ] 提交，提交信息为 `feat: add same-round iq calculator`。

### 任务 5：添加命令快照和撤销管理器

**文件：**

- 新建：`src/game/undoManager.ts`
- 修改：游戏状态类型
- 测试：`test/undoManager.test.ts`

步骤：

- [ ] 为撤销选择、匹配移除、洗牌、分数、连击和队列写测试。
- [ ] 添加 `GameSnapshot` 和 `GameCommand`。
- [ ] 为有效操作保存前后快照。
- [ ] 用快照恢复替换当前的仅对子撤销。
- [ ] 运行 `npm test`。
- [ ] 提交，提交信息为 `feat: add snapshot undo manager`。

### 任务 6：添加提示服务

**文件：**

- 新建：`src/game/hintService.ts`
- 测试：`test/hintService.test.ts`

步骤：

- [ ] 为“先看队列”、“棋盘成对提示”和“没有提示”写测试。
- [ ] 使用规则模块实现提示搜索。
- [ ] 确保没有提示时不会消耗次数。
- [ ] 连接到现有的 `MahjongScene.flashHint`。
- [ ] 运行 `npm test`。
- [ ] 提交，提交信息为 `feat: add hint service`。

### 任务 7：添加洗牌服务

**文件：**

- 新建：`src/game/shuffleService.ts`
- 修改：现有 `shufflePlayableBoard` 调用链
- 测试：`test/shuffleService.test.ts`

步骤：

- [ ] 为保持位置、保持剩余数量、保持可配对面、洗牌后仍有可用移动和可撤销性写测试。
- [ ] 把洗牌逻辑从 `board.ts` 中移出来。
- [ ] 增加重试次数限制和失败结果。
- [ ] 遵守 `requireSolvableAfterShuffle`。
- [ ] 运行 `npm test`。
- [ ] 提交，提交信息为 `feat: add shuffle service`。

### 任务 8：添加可解性检查器

**文件：**

- 新建：`src/game/solvabilityChecker.ts`
- 测试：`test/solvabilityChecker.test.ts`

步骤：

- [ ] 为简单可解棋盘、明显死局、超时标记和记忆化复用写测试。
- [ ] 实现对可用匹配对的递归搜索。
- [ ] 增加节点/时间上限选项。
- [ ] 返回可选的样例解法。
- [ ] 运行 `npm test`。
- [ ] 提交，提交信息为 `feat: add mahjong solvability checker`。

### 任务 9：重构 React 页面

**文件：**

- 新建：`src/ui/HomePage.tsx`
- 新建：`src/ui/GamePage.tsx`
- 新建：`src/ui/CompletePage.tsx`
- 新建：第 3 节列出的 UI 组件
- 修改：`src/App.tsx`
- 测试：现有布局测试加手动浏览器检查

步骤：

- [ ] 引入类似路由的应用状态：home、game、complete。
- [ ] 把当前游戏控件迁移到 `GamePage`。
- [ ] 增加首页底部浮动入口。
- [ ] 增加完成页汇总屏。
- [ ] 每次拆分后都保持当前游戏还能玩。
- [ ] 运行 `npm test` 和 `npm run build`。
- [ ] 提交，提交信息为 `feat: add home game complete flow`。

### 任务 10：为队列和动画改造 Three.js 场景

**文件：**

- 修改：`src/render/mahjongScene.ts`
- 新建：`src/render/tileMeshFactory.ts`
- 新建：`src/render/tileAnimations.ts`
- 测试：后续的手动浏览器测试和交互测试

步骤：

- [ ] 从 `mahjongScene.ts` 中提取牌网格创建。
- [ ] 增加选中、队列中、匹配中和动画中的视觉状态。
- [ ] 增加牌飞向队列槽位的动画钩子。
- [ ] 增加队列碰撞和移除动画钩子。
- [ ] 为匹配牌增加简单碎片/掉落效果。
- [ ] 在动画执行期间锁定输入。
- [ ] 运行 `npm run build`。
- [ ] 提交，提交信息为 `feat: add mahjong tile animations`。

### 任务 11：添加更多菜单和自动完成

**文件：**

- 新建：`src/ui/MoreMenu.tsx`
- 修改：`src/ui/GamePage.tsx`
- 如有需要，新建服务：`src/game/autoComplete.ts`
- 测试：如果逻辑复杂，补服务测试

步骤：

- [ ] 添加右上角更多按钮。
- [ ] 让静音、自动完成和重开按钮按从右到左的方向展开。
- [ ] 持久化静音和自动完成设置。
- [ ] 只在后期局面里实现受保护的自动完成。
- [ ] 在没有可用对子、正在动画、暂停或页面失焦时停止自动完成。
- [ ] 运行 `npm test` 和 `npm run build`。
- [ ] 提交，提交信息为 `feat: add more menu and auto complete`。

### 任务 12：最终响应式 QA

**文件：**

- 修改：`src/styles.less`
- 如有布局辅助函数，修改对应测试

步骤：

- [ ] 验证 375x667 浏览器视口。
- [ ] 验证 390x844 浏览器视口。
- [ ] 验证 430x932 浏览器视口。
- [ ] 验证 768x1024 浏览器视口。
- [ ] 确认没有滚动条。
- [ ] 确认没有文字溢出。
- [ ] 确认棋盘仍然可点击且取景正确。
- [ ] 运行 `npm test` 和 `npm run build`。
- [ ] 提交，提交信息为 `chore: complete responsive qa`。

## 13. 验收标准

- `npm test` 通过。
- `npm run build` 通过。
- 首页 -> 游戏页 -> 完成页 的循环可用。
- 规则符合经典麻将连连看的可选性和匹配规则。
- 队列最大长度为 4，且匹配会立即移除对子。
- 提示、撤销和洗牌都遵守每关次数限制。
- IQ 会根据进度、连击和耗时更新，且范围固定在 85-155。
- Three.js 棋盘能够渲染、标出开放牌并处理点击。
- 页面在目标视口大小下能完整显示在一个屏幕里，不滚动。
- 面向用户的界面中不再残留 Vita Mahjong 品牌或复制素材。

## 14. 项目技能

在相关工作前，先使用这些本地技能：

- `.agent/skills/mahjong-project-workflow`
- `.agent/skills/mahjong-solitaire-rules`
- `.agent/skills/mahjong-in-game-iq`
- `.agent/skills/threejs-mahjong-scene`
