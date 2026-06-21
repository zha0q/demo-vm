## 三、类似游戏的其他常见关卡/求解算法

下面我按实际开发里最常见的几类来对比。

### A. 固定模板布局 + 随机发牌

这是最传统的做法。

流程通常是：

1. 先准备一批经典布局模板
2. 每个模板只描述空间占位，不描述牌面
3. 开局时把牌面对随机分配进去

典型案例：

- PySol FC 的经典 Mahjongg 规则页直接给出了 Turtle 这类固定叠层布局的结构描述
- KMahjongg 用独立 `.layout` 文件保存布局，布局与牌面发放分离

优点：

- 内容生产简单
- 设计师可以大量堆模板
- 关卡外形可控性很强

缺点：

- 如果只随机发牌，不验证可解性，就容易死局
- 需要额外的“洗牌”“提示”或“仅生成可解局面”模式补救

适用场景：

- 大量经典关卡库
- 允许不总是可解
- 有洗牌或可解性开关兜底

### B. 逆向构造式配对生成

这类算法与当前项目最接近。

核心思想是：

1. 先找一条合法拆牌顺序
2. 再反向把同牌对安放到这条顺序上

外部资料中很常见的表述是“像倒着玩一局麻将连连看那样放牌”。Stack Overflow 上关于“如何保证 Mahjong Solitaire 至少有一条胜利路径”的讨论就明确提到，可以按配对逆向落牌，确保初始局面对应一个中途合法局面。

优点：

- 成本很低
- 很容易做出“保证至少一解”的布局
- 很适合和手工设计的几何模板结合

缺点：

- 很依赖排序启发式是否靠谱
- 随机性通常不如搜索式方案高
- 可能只保证“有解”，不保证“解多”“手感好”“难度稳定”

适用场景：

- 中轻度项目
- 想快速做出稳定可玩的堆叠关卡
- 更在意关卡节奏可控，而不是最大随机性

### C. 回溯/DFS 搜索式可解生成

这类方案会在生成时显式搜索。

一个很典型的开源描述是 `acvrp-lab/mahjong-solitaire-algorithm`：它先列出当前所有 exposed tiles，随机尝试移除一对；如果走到死路，就回退并继续试别的组合，直到找到完整解链，再按这条解链给棋盘赋牌。

本质上它是：

- 在生成阶段做 DFS
- 在死局时回溯
- 用搜索换更多随机性和更强的可解性保证

优点：

- 比构造式方案更灵活
- 可以适配更复杂的布局
- 能显式避开死局

缺点：

- 计算成本明显更高
- 需要写状态回退、分支剪枝、死局识别
- 如果布局复杂，性能和稳定性都要额外调

适用场景：

- 布局复杂度更高
- 想保留更多随机感
- 后期要做“每日挑战”“无限关卡”“服务端种子关卡”

### D. 完整求解器 + 剪枝 + 启发式评估

这是最重型的一类。

相关研究里，T. Stam 在《Solving Mahjong Solitaire Positions》里比较了多种求解策略；Michiel de Bondt 在《Solving Mahjong Solitaire boards with peeking》中指出，这类问题在一般情形下复杂度很高，但可以借助有效剪枝和关键组启发式做实用求解。

这类算法通常用于：

- 判断某局是否可解
- 给提示系统找更优路径
- 给洗牌结果做二次验证
- 评估关卡难度

优点：

- 能力最强
- 可做难度评级、最优步分析、死局诊断
- 适合做高级提示和 AI 辅助设计

缺点：

- 实现复杂
- 状态空间大
- 不适合作为前端实时生成的唯一手段

适用场景：

- 需要高质量难度控制
- 需要“可解性证明”
- 需要离线批量生成或后台预计算

### E. Shisen-Sho / 经典二维连连看路径算法

这一类虽然同属“连连看”，但和本项目的空间逻辑完全不同。

它的特点是：

- 棋盘只有一层
- 是否可消不看“上层覆盖/左右开放”
- 而看两张牌之间是否存在一条不穿过其他牌、且转折不超过两次的路径

KShisen 官方文档和 PySol FC 的 Shisen-Sho 规则页都采用这套规则。

这类游戏的核心算法通常不是堆叠构造，而是路径搜索。工程上最常见实现是把状态扩展为：

- 当前位置
- 当前方向
- 已使用转折数

然后用 BFS 或其变体搜索一条“转弯次数 <= 2”的路径。

这里我要明确区分一下：

- 这不是本项目当前使用的算法
- 但如果以后你们想做“传统二维连连看模式”，这会是必须引入的另一套规则核心

适用场景：

- 传统连连看
- 单层网格
- 想做重排、掉落、左右吸附、重力列坍塌等机制

## 四、各类算法横向对比

| 算法类型 | 代表思路 | 可解性保证 | 计算成本 | 布局可控性 | 随机性 | 适合本项目吗 |
|---|---|---|---|---|---|---|
| 固定模板 + 随机发牌 | 先有模板，后随机发牌 | 弱，需要额外验证 | 低 | 很高 | 中 | 一般 |
| 逆向构造式配对 | 先造解链，再投影为初始局面 | 强，至少一解 | 很低 | 很高 | 中低 | 很适合 |
| DFS/回溯生成 | 搜索可行拆牌顺序 | 强 | 中高 | 中高 | 高 | 中后期适合 |
| 完整求解器验证 | 对候选局面做求解/剪枝 | 最强 | 高 | 中 | 高 | 适合作为增强模块 |
| 二维路径连连看 | BFS 搜“最多两拐”的连线路径 | 取决于路径和布局 | 中 | 高 | 高 | 只适合另做玩法分支 |

## 五、对当前项目实现的判断

### 我对当前实现的总体判断

当前实现是一个很聪明的“MVP 到中期版本”方案。

它没有走最复杂的求解器路线，但也不是随便随机发牌；它抓住了堆叠麻将连连看最关键的三个点：

1. 关卡外形必须可设计
2. 起手必须可走
3. 至少要稳定保留一条清台路径

在这个目标下，当前方案非常合适。

### 它为什么有效

因为它把问题拆成了四个互相解耦的层次：

- 形状由 `layoutRows` 控制
- 可解链由 `solutionOrderedCoordinates()` 控制
- 规则合法性由 `boardRules.ts` 控制
- 视觉立体感由 `tileToWorld()` 控制

这种拆法很干净，也很容易继续演进。

### 它的短板

主要有三点：

1. `solutionOrderedCoordinates()` 目前只有一套启发式，复杂布局下可能不够泛化
2. 当前测试证明“至少一解”和“贪心首步可通”，但还没有正式做难度分级模型
3. 几何布局还是手工配置的，尚未进入“程序化布局族”阶段

## 六、如果继续演进，我建议的路线

### 路线 1：保留现有方案，先把“难度控制”补上

这是我最推荐的近端方案。

可以在当前生成器之上增加这些指标：

- 初始可选牌数量
- 每一步平均可选对子数量
- 顶层覆盖密度
- 同牌面分散度
- 花牌/季节牌占比
- 解链分叉数

这样你们依然保留轻量生成器，但可以更稳定地控制“简单/普通/困难”。

### 路线 2：给现有构造器加一个回溯兜底

做法是：

1. 先走当前的轻量构造
2. 如果某些复杂模板在验证里不理想
3. 再用小规模 DFS/backtracking 找替代 pair 顺序

这样可以保持大部分关卡生成速度，同时增强复杂图形的稳定性。

### 路线 3：把“布局形状生成”和“牌面对生成”分成两套系统

当前 `layoutRows` 仍偏手工。

后续可以考虑把布局形状生成单独抽成：

- 对称金字塔族
- 桥形族
- 洞穴族
- 双峰族
- 长廊族

先生成形状，再把当前的逆向配对器套上去。

这样内容量会明显提升。

### 路线 4：如果要做“传统连连看”模式，就不要复用当前 free-tile 规则

如果以后你们想加真正二维“连连看”，建议完全分开：

- 当前玩法保留为 stacked mahjong solitaire
- 新玩法单独做 path-connect rules

因为两者底层判定完全不同：

- 当前是“遮挡 + 侧边开放”
- 传统连连看是“连线路径 + 最多两拐”

这两套逻辑不应该硬揉在一起。

## 七、最值得记住的一句话

这个项目当前的关卡系统，不是“把金字塔摆出来”，而是“先定义一座能被合法拆掉的金字塔，再把它渲染成一座金字塔”。

这就是它现在能同时做到：

- 视觉上像堆叠麻将
- 规则上像经典 Shanghai
- 生成上又不必依赖重型求解器

的根本原因。

## 参考资料

### 项目内代码

- `src/game/config.ts`
- `src/game/levels.ts`
- `src/game/boardRules.ts`
- `src/render/mahjongScene.ts`
- `test/layout.test.ts`

### 外部资料

1. Stack Overflow: [Mahjong Solitaire - Arrange tiles to ensure at least one path to victory, regardless of layout](https://stackoverflow.com/questions/159547/mahjong-solitaire-arrange-tiles-to-ensure-at-least-one-path-to-victory-regard)
2. acvrp-lab: [mahjong-solitaire-algorithm](https://github.com/acvrp-lab/mahjong-solitaire-algorithm)
3. T. Stam: [Solving Mahjong Solitaire Positions](https://iivq.net/scriptie/scriptie-bsc.pdf)
4. Michiel de Bondt: [Solving Mahjong Solitaire boards with peeking](https://arxiv.org/abs/1203.6559)
5. PySol FC: [Rules for Mahjongg](https://pysolfc.sourceforge.io/doc/rules/mahjongg.html)
6. KDE KMahjongg: [cat.layout 示例布局文件](https://github.com/KDE/kmahjongg/blob/master/layouts/cat.layout)
7. KDE KMahjongg: [ChangeLog 中关于 solvable game generation 的记录](https://github.com/KDE/kmahjongg/blob/master/ChangeLog)
8. KDE KShisen Handbook: [The Shisen-Sho Handbook](https://docs.kde.org/trunk_kf6/en/kshisen/kshisen/kshisen.pdf)
9. PySol FC: [Rules for Shisen-Sho](https://pysolfc.sourceforge.io/doc/rules/shisensho.html)

## 附：哪些结论是“代码事实”，哪些是“研究推断”

### 代码事实

- 当前项目用 `layoutRows` 定义几何层级
- 当前项目用 `solutionOrderedCoordinates()` 构造解链顺序
- 当前项目用 `solutionPair` 保存配对顺序
- 当前项目用 `boardRules.ts` 做经典 free-tile 判定
- 当前项目用 `tileToWorld()` 做堆叠视觉偏移

### 研究推断

- “这套实现属于逆向构造式可解生成器”是我基于代码结构做出的归类判断
- “如果做传统二维连连看，工程上通常会用 BFS/方向状态搜索”是基于 KShisen/Shisen-Sho 规则约束做出的算法推断
- “当前方案更适合 MVP 到中期版本”是基于实现复杂度、可控性和扩展性做出的工程判断
