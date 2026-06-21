# Step Queue Level System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline level generator for the step-queue stacked mahjong variant, emit JSON level assets with hints and difficulty metadata, and add a runtime loader that dynamically reads those assets.

**Architecture:** Introduce a new `packages/level-generator` module containing shared types, a solver, an analyzer, canned layout templates, and a CLI that writes JSON into `src/assets/levels`. At runtime, add `src/core` loader utilities that validate, cache, and expose generated levels to the React app, while keeping the existing `src/game` rules module responsible only for gameplay logic.

**Tech Stack:** TypeScript, Node.js, Vite JSON asset loading, Vitest

---

## File Structure

**Create**
- `docs/superpowers/plans/2026-06-21-step-queue-level-system.md`
- `packages/level-generator/package.json`
- `packages/level-generator/tsconfig.json`
- `packages/level-generator/src/types.ts`
- `packages/level-generator/src/templates.ts`
- `packages/level-generator/src/solver.ts`
- `packages/level-generator/src/analyzer.ts`
- `packages/level-generator/src/generator.ts`
- `packages/level-generator/src/cli.ts`
- `src/assets/levels/index.json`
- `src/assets/levels/level-001.json`
- `src/assets/levels/level-002.json`
- `src/assets/levels/level-003.json`
- `src/core/levelTypes.ts`
- `src/core/levelLoader.ts`
- `src/core/levelCatalog.ts`
- `test/levelGenerator.test.ts`
- `test/levelLoader.test.ts`

**Modify**
- `package.json`
- `tsconfig.json`
- `src/App.tsx`
- `src/game/inGameIqCalculator.ts`
- `src/game/persistence.ts`
- `src/game/config.ts`
- `src/game/levels.ts`
- `test/layout.test.ts`

## Task 1: Establish Shared Level Asset Contract

**Files:**
- Create: `packages/level-generator/src/types.ts`
- Create: `src/core/levelTypes.ts`
- Test: `test/levelLoader.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('generated level JSON includes tiles, hint, difficulty and IQ weight metadata', async () => {
  const module = await import('../src/core/levelLoader');
  const level = await module.loadLevelById(1);

  expect(level.tiles.length).toBeGreaterThan(0);
  expect(level.analysis.recommendedHint.tileIds.length).toBeGreaterThan(0);
  expect(level.analysis.difficultyScore).toBeGreaterThan(0);
  expect(level.analysis.iqWeight).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/levelLoader.test.ts`
Expected: FAIL with missing loader/types or missing asset metadata

- [ ] **Step 3: Write minimal implementation**

Define the shared schema:
- `GeneratedLevelTile`
- `GeneratedLevelHint`
- `GeneratedLevelAnalysis`
- `GeneratedLevelAsset`
- `GeneratedLevelIndexEntry`

Mirror the same type shape in `src/core/levelTypes.ts` or re-export from a runtime-safe module.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/levelLoader.test.ts`
Expected: PASS once loader can parse a seeded asset shape

- [ ] **Step 5: Commit**

```bash
git add packages/level-generator/src/types.ts src/core/levelTypes.ts test/levelLoader.test.ts
git commit -m "feat: define generated level asset contract"
```

## Task 2: Add Offline Solver and Analyzer for Step Queue Levels

**Files:**
- Create: `packages/level-generator/src/solver.ts`
- Create: `packages/level-generator/src/analyzer.ts`
- Test: `test/levelGenerator.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('solver finds a solvable path and emits a first recommended hint', async () => {
  const { solveLevel } = await import('../packages/level-generator/src/solver');
  const { createCandidateLevel } = await import('../packages/level-generator/src/generator');
  const candidate = createCandidateLevel({ id: 1, seed: 'solver-test' });

  const solved = solveLevel(candidate);

  expect(solved.solvable).toBe(true);
  expect(solved.bestPath.length).toBeGreaterThan(0);
  expect(solved.recommendedHint.tileIds.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/levelGenerator.test.ts`
Expected: FAIL because solver/generator do not exist yet

- [ ] **Step 3: Write minimal implementation**

Implement:
- state hashing with queue order
- DFS or best-first search
- memoization
- fail-fast pruning for full queue + no match
- heuristic ordering favoring immediate match, queue relief, and newly freed tiles
- analyzer metrics for branching, queue pressure, danger steps, and IQ weight

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/levelGenerator.test.ts`
Expected: PASS with a deterministic seeded candidate

- [ ] **Step 5: Commit**

```bash
git add packages/level-generator/src/solver.ts packages/level-generator/src/analyzer.ts test/levelGenerator.test.ts
git commit -m "feat: add step queue solver and analyzer"
```

## Task 3: Build Offline Generator and Emit JSON Assets

**Files:**
- Create: `packages/level-generator/src/templates.ts`
- Create: `packages/level-generator/src/generator.ts`
- Create: `packages/level-generator/src/cli.ts`
- Create: `src/assets/levels/index.json`
- Create: `src/assets/levels/level-001.json`
- Create: `src/assets/levels/level-002.json`
- Create: `src/assets/levels/level-003.json`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Test: `test/levelGenerator.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('generator CLI writes level index and per-level JSON assets', async () => {
  const { generateLevelsToDisk } = await import('../packages/level-generator/src/cli');
  const result = await generateLevelsToDisk({ outDir: 'src/assets/levels', count: 3 });

  expect(result.files.length).toBe(4);
  expect(result.files.some((file) => file.endsWith('index.json'))).toBe(true);
  expect(result.files.some((file) => file.endsWith('level-001.json'))).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/levelGenerator.test.ts`
Expected: FAIL because CLI generation does not exist yet

- [ ] **Step 3: Write minimal implementation**

Add:
- seeded layout templates
- face assignment for queue-aware solvable candidates
- CLI entry to generate all JSON assets
- `package.json` script such as `generate:levels`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/levelGenerator.test.ts`
Expected: PASS with generated files on disk

- [ ] **Step 5: Commit**

```bash
git add packages/level-generator package.json tsconfig.json src/assets/levels
git commit -m "feat: add offline level generator and emitted assets"
```

## Task 4: Add Runtime Dynamic Loader in `src/core`

**Files:**
- Create: `src/core/levelLoader.ts`
- Create: `src/core/levelCatalog.ts`
- Modify: `src/App.tsx`
- Modify: `src/game/levels.ts`
- Modify: `src/game/persistence.ts`
- Test: `test/levelLoader.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('runtime loader returns generated level catalog and lazily loads tiles by id', async () => {
  const { getLevelCatalog, loadLevelById } = await import('../src/core/levelLoader');
  const catalog = await getLevelCatalog();
  const level = await loadLevelById(catalog[0].id);

  expect(catalog.length).toBeGreaterThan(0);
  expect(level.id).toBe(catalog[0].id);
  expect(level.tiles.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/levelLoader.test.ts`
Expected: FAIL because dynamic loader does not exist yet

- [ ] **Step 3: Write minimal implementation**

Implement:
- cached JSON index loading
- per-level JSON loading
- conversion from generated asset tiles to runtime `Tile[]`
- compatibility shim for any remaining `src/game/levels.ts` imports
- App startup path that loads level data before creating a game

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/levelLoader.test.ts`
Expected: PASS with runtime loader and app integration in place

- [ ] **Step 5: Commit**

```bash
git add src/core src/App.tsx src/game/levels.ts src/game/persistence.ts test/levelLoader.test.ts
git commit -m "feat: add runtime generated level loader"
```

## Task 5: Connect Difficulty Metadata to IQ and Update Regression Tests

**Files:**
- Modify: `src/game/inGameIqCalculator.ts`
- Modify: `src/game/config.ts`
- Modify: `test/layout.test.ts`
- Modify: `test/levelLoader.test.ts`
- Modify: `test/levelGenerator.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('higher generated level difficulty slightly increases IQ weight for equal play quality', () => {
  const easy = calculateInGameIq({ clearedPairs: 10, totalPairs: 20, currentCombo: 2, elapsedSeconds: 50, difficultyWeight: 1.0 });
  const hard = calculateInGameIq({ clearedPairs: 10, totalPairs: 20, currentCombo: 2, elapsedSeconds: 50, difficultyWeight: 1.15 });

  expect(hard.iq).toBeGreaterThanOrEqual(easy.iq);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/inGameIqCalculator.test.ts`
Expected: FAIL because IQ does not accept difficulty weighting yet

- [ ] **Step 3: Write minimal implementation**

Thread level analysis metadata into:
- level config or runtime loaded metadata
- IQ calculator input
- completion summary / UI display if needed

Keep the multiplier gentle and capped.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS with updated generator, loader, IQ, and layout regressions

- [ ] **Step 5: Commit**

```bash
git add src/game/inGameIqCalculator.ts src/game/config.ts test
git commit -m "feat: weight IQ by generated level difficulty"
```
