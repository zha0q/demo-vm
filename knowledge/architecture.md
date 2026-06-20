# 架构知识

## 当前技术栈

- React 18 用于 UI。
- Vite 6 用于开发和构建。
- TypeScript 用于应用和规则。
- Three.js 用于 3D 麻将棋盘渲染。
- Less 用于样式。
- Vitest 用于单元测试。
- `localStorage` 用于 MVP 持久化。

## 当前重要文件

| 文件 | 职责 |
|---|---|
| `src/App.tsx` | 当前单屏应用编排；计划拆成首页、游戏页、完成页 |
| `src/game/board.ts` | 现有棋盘模型、匹配、可选性、移除、撤销、洗牌辅助函数 |
| `src/game/levels.ts` | 程序化关卡目录和牌坐标生成 |
| `src/game/persistence.ts` | 保存/读取辅助函数 |
| `src/render/mahjongScene.ts` | Three.js 场景、牌网格、射线拾取、摄像机取景 |
| `src/render/cameraControls.ts` | 俯视摄像机平移/缩放辅助函数 |
| `src/styles.less` | 当前全局 UI 样式 |
| `.agent/PLAN.md` | 实现计划 |
| `.agent/Design.md` | 视觉与交互设计规范 |

## 目标边界

规则和渲染必须保持分离：

```txt
React 界面 -> 游戏状态/动作 -> 纯游戏规则
React 界面 -> MahjongScene.renderBoard(gameState)
MahjongScene -> onTileClick(tileId) -> React/游戏动作
```

`src/game` 下的规则不能依赖 React 或 Three.js。

`src/render` 下的 Three.js 可以：

- 根据游戏状态渲染牌。
- 高亮可视状态。
- 对牌点击做射线拾取。
- 给过渡做动画。

`src/render` 下的 Three.js 不能：

- 决定某张牌是否真的可选。
- 决定两张牌是否匹配。
- 直接修改分数、连击、队列、关卡进度或保存状态。

## 规划中的模块拆分

规划中的 `src/game` 模块：

- `constants.ts`：带注释的全局静态常量。
- `config.ts`：关卡和玩法调参。
- `matchRules.ts`：牌面分组和配对匹配。
- `boardRules.ts`：覆盖、阻挡、可选逻辑。
- `stepQueue.ts`：四格队列和立即配对。
- `inGameIqCalculator.ts`：本局 IQ 计分。
- `undoManager.ts`：快照命令栈。
- `hintService.ts`：提示优先级。
- `shuffleService.ts`：仅洗牌面且保持不变式。
- `solvabilityChecker.ts`：递归规则搜索与记忆化。
- `scoring.ts`：分数和连击辅助函数。

规划中的 `src/ui` 模块：

- `HomePage.tsx`
- `GamePage.tsx`
- `CompletePage.tsx`
- `TopBar.tsx`
- `MoreMenu.tsx`
- `IqPanel.tsx`
- `StepQueueView.tsx`
- `BottomActions.tsx`
- `LevelSelectModal.tsx`

## 状态归属

游戏真相应该保存在可序列化的 `GameState` 中。

状态应包含：

- 当前关卡。
- 牌。
- 步骤队列。
- 分数。
- 移动次数。
- 连击和最大连击。
- 计时器输入。
- 剩余提示、撤销、洗牌次数。
- 运行时状态。
- 撤销命令栈。

临时动画状态可以放在 UI/渲染层。如果动画会影响规则，就必须有明确的已提交状态切换。

## 持久化

MVP 持久化使用 `localStorage`。

持久化保存应包含：

- 已解锁关卡。
- 已通关关卡。
- 各关卡最佳记录。
- 当前设置。
- 可选地保存当前进行中的回合。

使用带版本号的保存数据，方便未来安全迁移 schema。

## 架构风险

| 风险 | 护栏 |
|---|---|
| 渲染开始掌控游戏真相 | 把规则决策留在 `src/game`；渲染只接收状态 |
| `App.tsx` 变得过大 | 按 PLAN.md 拆分页面和组件 |
| 撤销只恢复了部分字段 | 对影响规则的操作使用快照 |
| 可解性阻塞 UI | 先加限制；必要时移到 worker |
| 配置值四处分散 | 把 constants/config 放到专门文件里 |
