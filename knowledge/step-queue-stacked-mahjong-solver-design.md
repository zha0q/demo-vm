# Step Queue 堆叠麻将求解器设计草案

## 1. 问题定义

我们当前要做的不是经典 `Mahjong Solitaire`，也不是传统二维“连连看”，而是一种新的变体：

- 棋盘是堆叠式麻将布局
- 玩家只能点击 `free tile`
- 点击后牌不会立刻必然消除
- 牌先进入一个容量有限的 `step queue`
- 当新进入的牌与队列中某张牌匹配时，才发生消除
- 当队列满且新牌无法匹配时，局面可能进入失败

这意味着，游戏状态不再只由“棋盘剩余牌”决定，还由“队列里有什么牌，以及它们的顺序”共同决定。

因此，这个问题比经典堆叠麻将更复杂。

## 2. 有没有现成最优解

结论先说：

**没有查到公开资料里存在“step queue 堆叠麻将”这一精确玩法的现成公认最优解。**

公开资料里成熟的是三类能力：

1. 经典 `Mahjong Solitaire` 的求解与可解性分析
2. 经典 `Mahjong Solitaire` 的可解关卡生成
3. 带底部 `tray/box` 的商业变体玩法

把它们拼起来，才接近我们要的东西。

### 2.1 经典堆叠麻将求解

Michiel de Bondt 的研究指出，求解 `Mahjong Solitaire` 在一般情形下是 `NP-complete`，同时给出了依赖 `pruning + heuristic` 的实用求解思路。[论文](https://arxiv.org/abs/1203.6559)

同作者还提供了实际可运行的求解器页面，并公开了不同布局的大规模统计结果，说明即使经典规则下，不同布局的不可解比例差异也很大。[求解器页面](https://www.math.ru.nl/~debondt/mjsolver.html)

### 2.2 经典堆叠麻将可解生成

`acvrp-lab/mahjong-solitaire-algorithm` 使用 DFS tree search，在“尽量随机”和“保证无需额外 shuffle 也可解”之间做平衡。这说明经典麻将关卡生成的一个成熟工程方向，就是搜索式可解生成。[GitHub](https://github.com/acvrp-lab/mahjong-solitaire-algorithm)

### 2.3 带 tray/box 的商业变体

市面上已经有“点击后牌进入底部盒子，盒子满则失败”的玩法。比如 `Mahjong Match` 的官方说明就是“点牌后进入 box，两张相同牌配对；box 满 3 失败”。这类产品说明 tray-based 变体是存在的，但它仍不是我们的同一个问题。[Google Play](https://play.google.com/store/apps/details?hl=en_US&id=mahjong.solitaire.tile.pair.match.puzzle)

`3 of the Same` 这类产品也已经把“底部 tray 容量约束”做成成熟商业玩法，但它是“三消托盘”，不是“两两配对 + 堆叠麻将 + 队列顺序”的同一个问题。[App Store](https://apps.apple.com/be/app/3-of-the-same-match-3-mahjong/id1622165569)

### 2.4 总结

如果问题是“有没有现成论文或开源，可以直接解决 step queue 堆叠麻将最优策略/最优关卡生成”，我的结论是：

**没查到。**

如果问题是“有没有可以借的成熟算法母体”，结论则是：

**有，而且很明确。**

最接近的母体是：

- 状态搜索：来自经典 `Mahjong Solitaire` 求解器
- 可解生成：来自 DFS / reverse construction 一类生成器
- 好玩性评估：来自 `MCTS / utility-based automated playtesting`
- tray 约束：来自商业 `tray/box` tile-match 变体

## 3. 为什么经典算法不能直接套用

经典 `Mahjong Solitaire` 的状态主要是：

- 当前剩余牌
- 哪些牌是 `free tile`

而我们的玩法还额外包含：

- 队列里有哪些牌
- 它们进入队列的顺序
- 队列容量剩余多少
- 当前这一步点击某张牌后，是“入队”还是“立即匹配消除”

这会带来两个直接后果。

### 3.1 状态空间更大

相同的棋盘剩余牌，只要队列内容不同，就是不同状态。

例如：

- 棋盘相同 + 队列是 `[B1, C2]`
- 棋盘相同 + 队列是 `[C2, B1]`

这两个状态未来的可行路径就可能不同。

### 3.2 “好走的步”不再等于“能消的步”

经典麻将里，一个 `free pair` 就是明显好步。

但在 `step queue` 玩法里，很多时候真正重要的是：

- 哪张牌入队后能为后面制造匹配机会
- 哪张牌会占掉宝贵槽位
- 哪张牌虽然当前不消，但能保留未来分支
- 哪张牌会造成“队列满而无配对”的危险

因此，经典的“优先找可消 pair”只是基础，已经不够了。

## 4. 我们应该采用什么总体算法

我建议采用下面这条路线：

**完整求解器 + 剪枝 + 启发式评估 + 自动化 playtesting**

这是目前最适合这个玩法的工程方案。

原因很直接：

- 纯随机生成无法稳定保证体验
- 纯逆向构造在有 queue 状态后很难自然
- 只有完整求解器，才能真正判断一个局面在 `step queue` 规则下是否可解
- 只有加入启发式评估，才能把“可解”进一步变成“好玩”

## 5. 求解器状态设计

求解器中的一个状态，至少需要包含以下信息。

### 5.1 棋盘状态

- 每张牌是否还在棋盘上
- 每张牌的位置 `(x, y, z)`
- 每张牌的牌面 `face`
- 每张牌当前是否 `free`

### 5.2 队列状态

- 当前队列中的牌 ID 列表
- 队列中牌面的顺序
- 队列容量剩余多少

### 5.3 运行时统计信息

如果我们只做“能否清台”的纯解算，可以不放太多。

如果要兼顾“提示”“难度评级”“IQ 加权”，建议额外维护：

- 已走步数
- 已完成匹配数
- 队列峰值占用
- 连续危险状态次数
- 分支数
- 平均可选步数

可以抽象成：

```ts
type SolverState = {
  remainingTileIds: string[];
  queueTileIds: string[];
  removedPairs: number;
  freeTileIds: string[];
  metrics: {
    steps: number;
    queuePeak: number;
    dangerSteps: number;
  };
};
```

## 6. 状态转移

对每个状态，我们需要枚举所有合法点击。

### 6.1 合法动作

一个动作是：

- 点击某张当前可点的 `free tile`

### 6.2 动作结果

动作会产生三类结果。

#### A. 入队

如果该牌与队列中没有可匹配牌，且队列未满：

- 该牌从棋盘进入队列
- 棋盘上的可点牌集合变化
- 队列状态变化

#### B. 匹配消除

如果该牌与队列中某张牌匹配：

- 队列中的对应牌移除
- 当前点击牌也移除
- 形成一个 pair
- 棋盘暴露关系变化
- 队列容量回升

#### C. 非法/失败

如果队列已满，且当前牌无法和队列中任何牌匹配：

- 这条路径视为失败分支

## 7. 剪枝策略

如果不用剪枝，状态空间会爆炸，这里必须上强剪枝。

### 7.1 重复状态记忆化

同一个“剩余棋盘 + 队列顺序”状态，不重复搜索。

可以做状态哈希：

```txt
hash = remainingTilesBitset + "|" + queueFacesOrdered
```

注意这里必须保留 **队列顺序**，不能只记录队列集合。

### 7.2 支配剪枝

如果出现两个状态：

- 棋盘剩余完全一样
- 队列牌面集合一样
- 但其中一个队列更短、更空、更安全

那么更差那个状态可以直接剪掉。

简单说就是：

- 同样的残局，槽位更紧张的状态，通常被槽位更宽松的状态支配

### 7.3 死局提前剪枝

以下状态可以立即判死：

- 队列已满且当前无任何可匹配点击
- 棋盘上所有 `free tile` 都只能产生无效入队
- 某些牌面已经无法凑成合法匹配数
- 明显存在孤张结构

### 7.4 对称剪枝

对于同牌面、同几何作用的可交换动作，只保留一个代表。

这类剪枝在大量重复牌面时非常重要。

## 8. 启发式评估

完整求解器解决“能不能过”，启发式决定“先搜哪条路”和“哪种局面更好玩”。

我建议至少做两层启发式。

### 8.1 求解启发式

用于搜索优先级排序。

优先考虑以下动作：

1. **立即形成匹配** 的动作
2. 能 **释放更多新 free tile** 的动作
3. 能 **降低高层压顶** 的动作
4. 能 **降低队列占用** 的动作
5. 能 **制造未来匹配机会** 的动作

可以定义一个简单评分：

```txt
solverScore =
  + 100 * isImmediateMatch
  + 20 * newlyFreedTiles
  + 12 * exposedCriticalTiles
  - 18 * queueOccupancyAfterMove
  - 25 * createsDangerState
```

### 8.2 体验启发式

用于关卡评级，而不是单步搜索。

一个关卡即使可解，也可能不好玩。需要评估：

- 起手可点牌数量
- 起手可形成匹配的步数
- 平均每步合法动作数
- 队列压力曲线是否过陡
- 危险状态是否太频繁
- 解法是否过于唯一
- 是否总在赌运气，而不是做决策

这些指标后面可以用于难度分级和 IQ 加权。

## 9. 难度评级模型

生成的关卡数据不应只包含“牌怎么摆”，还要包含可供运行时使用的分析结果。

建议输出至少这些字段：

```ts
type LevelAnalysis = {
  solvable: boolean;
  estimatedDifficulty: number;
  openingFreeTiles: number;
  openingMatches: number;
  avgBranchingFactor: number;
  queuePressureScore: number;
  deadEndRisk: number;
  solutionDepth: number;
  solutionCountEstimate: number;
  recommendedHint?: {
    firstTileId: string;
    secondTileId?: string;
    reason: string;
  };
};
```

### 9.1 难度来源建议

难度不要只看“牌多不多”，建议综合：

- `openingFreeTiles` 越少，越难
- `openingMatches` 越少，越难
- `avgBranchingFactor` 太低会僵，太高会乱
- `queuePressureScore` 越高，越难
- `deadEndRisk` 越高，越难
- `solutionCountEstimate` 越低，越难

### 9.2 IQ 加权建议

如果要把关卡难度用于 IQ 计算，不要直接让高难关自动抬高 IQ，而是做温和加权。

例如：

```txt
finalIQ = baseIQ + difficultyWeight * performanceQuality
```

其中：

- `difficultyWeight` 只做小幅调节
- 核心仍看玩家在该关中的表现

否则会出现“高难关随便过一点，IQ 反而虚高”的问题。

## 10. 提示系统如何生成

提示不应该只是“随便给一对”。

既然离线生成关卡时已经跑过求解器，就可以顺手把“推荐提示”也产出来。

建议分两层。

### 10.1 静态首提示

在关卡生成时，直接记录：

- 开局最推荐的一步
- 推荐原因

例如：

- 优先释放中层
- 避免占满队列
- 先拿现成匹配，减少压力

### 10.2 动态提示

运行时根据当前状态调用轻量求解器：

- 优先找能立刻形成匹配的 `free tile`
- 如果没有，则找未来两步内最安全的入队动作
- 如果仍没有，则返回“建议洗牌/撤销”

这意味着提示系统本质上是一个局部求解器。

## 11. 关卡生成流程

在保留 `step queue` 玩法的前提下，我建议的离线生成流程是：

### 第一步：生成候选堆叠布局

- 金字塔族
- 桥形族
- 洞口族
- 偏移族
- 多峰族

### 第二步：分配牌面对

- 保证总数为偶数
- 控制重复牌密度
- 控制特殊牌比例

### 第三步：调用完整求解器验证

验证：

- 是否至少存在一条解
- 起手是否可玩
- 是否过早死局
- 队列压力是否合理

### 第四步：跑启发式分析

生成：

- 难度评级
- 提示信息
- 分支统计
- 风险评分

### 第五步：写入静态关卡资产

输出到 `assets` 里的数据不仅要有 `tiles`，还要有：

- `layoutMeta`
- `analysis`
- `recommendedHint`
- `difficultyWeight`
- `seed`
- `solutionPreview`（可选）

## 12. 工程上最现实的实现路线

如果现在就开始做，我建议按这个顺序推进。

### 阶段 1：先做“给定关卡能否求解”

先不要生成器，先实现 solver：

- 状态建模
- `free tile` 计算
- `queue` 状态转移
- DFS + memo
- 基础剪枝

这是整个系统的根。

### 阶段 2：再做“给定关卡的提示与评级”

在 solver 之上，输出：

- 最优首步 / 推荐首步
- 难度统计
- 风险指标

### 阶段 3：最后做离线生成器

生成器不应该先写，因为它依赖 solver 作为验证器。

真正稳妥的顺序应该是：

**solver -> analyzer -> generator -> runtime loader**

## 13. 最终结论

对于“带 `step queue` 的堆叠麻将玩法”，目前没有公开、标准、现成的“最优解”可以直接拿来用。

但这并不意味着没有路径。

最合理的方案是：

- 以经典 `Mahjong Solitaire` 求解研究为基础
- 把 `step queue` 视为额外状态维度
- 用 `完整求解器 + 剪枝 + 启发式评估` 搭出自己的 solver
- 再用这个 solver 反过来驱动关卡生成、提示系统和难度评级

一句话概括：

**这类玩法没有现成标准答案，但可以非常明确地落到“搜索求解器 + 体验启发式 + 离线关卡分析”这条工程路线。**

## 参考资料

1. Michiel de Bondt, *Solving Mahjong Solitaire boards with peeking*  
   [https://arxiv.org/abs/1203.6559](https://arxiv.org/abs/1203.6559)

2. Michiel de Bondt Mahjong Solver  
   [https://www.math.ru.nl/~debondt/mjsolver.html](https://www.math.ru.nl/~debondt/mjsolver.html)

3. `acvrp-lab/mahjong-solitaire-algorithm`  
   [https://github.com/acvrp-lab/mahjong-solitaire-algorithm](https://github.com/acvrp-lab/mahjong-solitaire-algorithm)

4. Mugrai et al., *Automated Playtesting of Matching Tile Games*  
   [https://arxiv.org/abs/1907.06570](https://arxiv.org/abs/1907.06570)

5. `Mahjong Match` tray/box 商业变体说明  
   [https://play.google.com/store/apps/details?hl=en_US&id=mahjong.solitaire.tile.pair.match.puzzle](https://play.google.com/store/apps/details?hl=en_US&id=mahjong.solitaire.tile.pair.match.puzzle)

6. `3 of the Same` tray-based 商业变体说明  
   [https://apps.apple.com/be/app/3-of-the-same-match-3-mahjong/id1622165569](https://apps.apple.com/be/app/3-of-the-same-match-3-mahjong/id1622165569)
