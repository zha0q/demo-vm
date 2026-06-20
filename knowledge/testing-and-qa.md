# 测试与质检知识

## 命令

聚焦测试：

```bash
npm test -- test/name.test.ts
```

完整测试：

```bash
npm test
```

构建：

```bash
npm run build
```

开发服务器：

```bash
npm run dev
```

## 测试驱动策略

对于规则、计分、持久化和行为变更：

1. 编写或更新一个会失败的测试。
2. 运行聚焦测试，并确认它以预期原因失败。
3. 实现最少量代码。
4. 重新运行聚焦测试，并确认通过。
5. 运行完整的相关测试套件。

对于纯视觉、仅 CSS 的变更，TDD 可能不适用，但浏览器验证仍然需要。

## 测试覆盖图

| 领域 | 测试文件 |
|---|---|
| 匹配 | `test/matchRules.test.ts` |
| 牌可选性 | `test/boardRules.test.ts` |
| 当前棋盘兼容性 | `test/board.test.ts` |
| 步骤队列 | `test/stepQueue.test.ts` |
| 局内 IQ | `test/inGameIqCalculator.test.ts` |
| 撤销 | `test/undoManager.test.ts` |
| 提示 | `test/hintService.test.ts` |
| 洗牌 | `test/shuffleService.test.ts` |
| 可解性 | `test/solvabilityChecker.test.ts` |
| 持久化 | `test/persistence.test.ts` |
| 摄像机 | `test/camera.test.ts` |
| 布局辅助函数 | `test/layout.test.ts` |

部分目标文件可能还不存在；随着相关模块引入再创建它们。

## 浏览器 QA

运行开发服务器并验证：

- 375x667
- 390x844
- 430x932
- 768x1024

检查：

- 页面没有滚动。
- 画布可见且不是空白。
- 牌面棋盘取景正常。
- 牌点击可用。
- 顶部控件没有覆盖 IQ/队列。
- 底部控件没有挡住棋盘。
- 文字没有溢出按钮或卡片。
- 完成页覆盖层居中。

## 完成声明

在说任务完成之前：

- 运行能够证明结论的验证命令。
- 读取输出结果。
- 报告任何失败或跳过的检查。

对于仅文档变更，除非文档修改了脚本或命令，否则用文件读取或 `grep` 验证即可，不必运行完整应用。

## 常见测试坑

| 坑点 | 避免方式 |
|---|---|
| 用 Three.js 输出来判断规则真相 | 直接测试 `src/game` 里的规则 |
| 测试强依赖数组顺序 | 断言行为，或先排序期望值 |
| 规则只做快照测试 | 优先使用显式断言 |
| 浏览器 QA 没有检查视口就标记完成 | 记录实际检查过的视口 |
| 在 TypeScript 重构后跳过构建 | 始终运行 `npm run build` |
