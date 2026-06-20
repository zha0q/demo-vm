---
name: mahjong-in-game-iq
description: 用于实现或调优本麻将游戏里的本局 IQ、进度分、连击分、时间分、鼓励标签或 IQ UI 时。
---

# 麻将局内 IQ

## 核心原则

IQ 只是当前回合的鼓励分，不能被呈现为真实智力测量，也不能拿来跨关卡比较。

## 输入

```ts
interface InGameIqInput {
  clearedPairs: number;
  totalPairs: number;
  currentCombo: number;
  elapsedSeconds: number;
}
```

## 公式

```ts
const P = totalPairs <= 0 ? 0 : clearedPairs / totalPairs;
const C = currentCombo;
const t = elapsedSeconds;
const TRef = totalPairs * IQ_SECONDS_PER_PAIR;

const progressScore = 100 * Math.sqrt(P);
const comboScore = 100 * (1 - Math.exp(-C / 6));
const expectedNow = TRef * (0.10 + 0.90 * P);
const timeScore = 100 / (1 + Math.exp((t - expectedNow) / (0.18 * TRef + 8)));
const q = 0.45 * progressScore + 0.30 * timeScore + 0.25 * comboScore;
const raw = clamp(IQ_MIN + 0.70 * q, IQ_MIN, IQ_MAX);
const confidence = clamp(P / IQ_CONFIDENCE_PROGRESS_THRESHOLD, 0, 1);
const iq = Math.round(100 * (1 - confidence) + raw * confidence);
```

## 标签

| 范围 | 标签 |
|---:|---|
| 85-99 | 稳定观察中 |
| 100-114 | 思路在线 |
| 115-129 | 节奏不错 |
| 130-144 | 高效清台 |
| 145-155 | 神级状态 |

## 测试

在调参前先加测试：

- 开局状态应接近 100。
- 结果始终落在 `IQ_MIN` 和 `IQ_MAX` 之间。
- 进度越高，进度分越高。
- 连击越高，连击分越高，而且收益递减。
- 耗时越长，时间分越低。
- `totalPairs <= 0` 时必须安全，不能返回 `NaN`。

运行：

```bash
npm test -- test/inGameIqCalculator.test.ts
```

## 界面规则

- 更适合使用 `本局 IQ`、`策略 IQ` 或 `清台 IQ` 之类的标签。
- 不要写出暗示这是智力测验的文案。
- 生产 UI 里只展示最终 IQ 和简短标签。
- 子分数可以留给调试面板和测试。
