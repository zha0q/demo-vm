# Vita Mahjong Three.js Demo

一个基于 Vite、React、TypeScript 和 Three.js 的 Vita Mahjong 风格麻将两消 demo。美术素材使用代码生成的简易牌面，重点实现完整核心玩法。

## 已实现

- 3D 堆叠麻将牌桌、点击选牌、可选牌高亮。
- 顶视角正交相机，支持滚轮缩放和拖拽平移。
- 经典麻将 solitaire 规则：牌未被上层覆盖，且左右至少一侧开放才可选择。
- 普通牌同牌匹配，花牌组内互配，季节牌组内互配。
- 关卡切换、提示、洗牌、撤销、计分、连击、计时、通关判断。
- localStorage 自动存档和最近历史记录。
- 纯规则测试覆盖牌可用性、配对、撤销、洗牌和关卡可解性。

## 运行

```bash
npm test
npm run dev
```

打开 `http://localhost:5173`。

## 说明

这个 demo 没有使用原游戏美术、音效或商业素材。玩法参考 Vita Mahjong 常见的 3D 麻将消除体验，目标是验证核心循环和 Three.js 交互结构。
