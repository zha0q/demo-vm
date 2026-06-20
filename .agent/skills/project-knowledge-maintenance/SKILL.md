---
name: project-knowledge-maintenance
description: 用于结束开发工作、修改项目行为、发现持久决策，或更新本麻将项目里的知识和本地技能时。
---

# 项目知识维护

## 核心原则

每一次有意义的代码或设计变更，都应该让下一位 Agent 更有信息。行为变了就更新持久知识；未来 Agent 需要可复用工作流时就更新技能。

## 任务结束扫尾

在最终回复前：

1. 用 `git status --short` 检查已变更文件。
2. 如果 `src/**` 或 `test/**` 有变动，先检查 `knowledge/README.md`。
3. 更新最小范围内最相关的知识文件：
   - 架构：`knowledge/architecture.md`
   - 规则/IQ/计分：`knowledge/game-rules.md`
   - 视觉/布局：`knowledge/design-system.md`
   - 测试/QA：`knowledge/testing-and-qa.md`
   - Agent 工作流：`knowledge/agent-maintenance.md`
4. 对不显而易见的决策，在 `knowledge/decision-log.md` 里加一条带日期的记录。
5. 只有当重复的工作流、坑或检查清单确实应该指导未来 Agent 时，才更新 `.agent/skills/*/SKILL.md`。
6. 用 `find`、`sed` 或 `grep` 验证文档；如果代码变了，也要跑测试/构建。

## 更新判断

| 变更 | 更新 |
|---|---|
| 新模块或新边界 | `knowledge/architecture.md` |
| 规则行为 | `knowledge/game-rules.md` 以及相关规则技能 |
| 局内 IQ 公式或标签 | `knowledge/game-rules.md` 和 `mahjong-in-game-iq` |
| 视觉令牌或布局 | `knowledge/design-system.md`，必要时还包括 `threejs-mahjong-scene` |
| 测试命令或 QA 预期 | `knowledge/testing-and-qa.md` |
| 重复出现的 Agent 错误 | 创建或更新本地技能 |
| 产品/工程决策 | `knowledge/decision-log.md` |

## 护栏

- 不要把实现 diff 倒进知识文档。
- 优先保留稳定摘要和源码链接。
- 不要为了一个一次性的事实去更新技能。
- 在没有读过已变更文档之前，不要说知识已经是最新的。
- 对每个已编辑文件，都要遵守 before/after diff 记录规则。
