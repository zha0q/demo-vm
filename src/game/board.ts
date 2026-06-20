import { activeTiles, isTileFree, remainingTiles } from './boardRules';
import { canMatch, faceGroup, FLOWER_FACES, SEASON_FACES } from './matchRules';
import { createStepQueue, type StepQueueState } from './stepQueue';

export interface Tile {
  id: string;
  face: string;
  x: number;
  y: number;
  z: number;
  removed?: boolean;
  state?: 'active' | 'queued' | 'matching' | 'removed' | 'animating';
  solutionPair?: number;
}

export interface HistoryMove {
  firstId: string;
  secondId: string;
  scoreDelta: number;
  comboBefore: number;
}

export interface GameState {
  tiles: Tile[];
  selectedId: string | null;
  history: HistoryMove[];
  level: number;
  score: number;
  combo: number;
  stepQueue: StepQueueState;
  seed: string;
  startedAt: number;
  message: string;
}

export interface AvailableMove {
  firstId: string;
  secondId: string;
  faceGroup: string;
}

export interface MoveResult {
  ok: boolean;
  message?: string;
  scoreDelta?: number;
}

export const ORDINARY_FACES = [
  'B1',
  'B2',
  'B3',
  'B4',
  'B5',
  'B6',
  'B7',
  'B8',
  'B9',
  'C1',
  'C2',
  'C3',
  'C4',
  'C5',
  'C6',
  'C7',
  'C8',
  'C9',
  'D1',
  'D2',
  'D3',
  'D4',
  'D5',
  'D6',
  'D7',
  'D8',
  'D9',
  'E',
  'S',
  'W',
  'N',
  'RED',
  'GREEN',
  'WHITE',
];

export { activeTiles, canMatch, faceGroup, FLOWER_FACES, isTileFree, remainingTiles, SEASON_FACES };

export function createGame({ tiles, level = 1, seed = 'vita-mahjong-demo' }: {
  tiles: Tile[];
  level?: number;
  seed?: string;
}): GameState {
  return {
    tiles: tiles.map((tile) => ({ ...tile, removed: Boolean(tile.removed) })),
    selectedId: null,
    history: [],
    level,
    score: 0,
    combo: 0,
    stepQueue: createStepQueue(),
    seed,
    startedAt: Date.now(),
    message: '选择开放牌。相同牌面可配对，花牌和季节牌可组内配对。',
  };
}

export function cloneGame(game: GameState): GameState {
  return {
    ...game,
    tiles: game.tiles.map((tile) => ({ ...tile })),
    history: game.history.map((move) => ({ ...move })),
    stepQueue: {
      tileIds: [...(game.stepQueue?.tileIds ?? [])],
      matchingTileIds: [...(game.stepQueue?.matchingTileIds ?? [])],
    },
  };
}

export function getTile(tiles: Tile[], id: string) {
  return tiles.find((tile) => tile.id === id);
}

export function findAvailableMoves(tiles: Tile[]): AvailableMove[] {
  const freeTiles = activeTiles(tiles).filter((tile) => isTileFree(tiles, tile.id));
  const moves: AvailableMove[] = [];

  for (let leftIndex = 0; leftIndex < freeTiles.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < freeTiles.length; rightIndex += 1) {
      const first = freeTiles[leftIndex];
      const second = freeTiles[rightIndex];

      if (canMatch(first, second)) {
        moves.push({ firstId: first.id, secondId: second.id, faceGroup: faceGroup(first.face) });
      }
    }
  }

  return moves;
}

export function removePair(game: GameState, firstId: string, secondId: string): MoveResult {
  const first = getTile(game.tiles, firstId);
  const second = getTile(game.tiles, secondId);

  if (!first || !second) {
    return fail(game, 'Tile not found.');
  }

  if (!canRemoveFromCurrentState(game.tiles, firstId) || !canRemoveFromCurrentState(game.tiles, secondId)) {
    return fail(game, 'Both tiles must be reachable.');
  }

  if (!canMatch(first, second)) {
    return fail(game, 'Tiles do not match.');
  }

  first.removed = true;
  second.removed = true;
  const scoreDelta = 100 + game.combo * 20 + Math.max(0, game.level - 1) * 40;
  game.score += scoreDelta;
  game.combo += 1;
  game.selectedId = null;
  game.history.push({
    firstId,
    secondId,
    scoreDelta,
    comboBefore: game.combo - 1,
  });
  game.message = `消除 ${displayFace(first.face)} 与 ${displayFace(second.face)}，获得 ${scoreDelta} 分。`;

  return { ok: true, scoreDelta };
}

export function undoLastMove(game: GameState): MoveResult {
  const move = game.history.pop();

  if (!move) {
    return fail(game, 'Nothing to undo.');
  }

  const first = getTile(game.tiles, move.firstId);
  const second = getTile(game.tiles, move.secondId);

  if (first) {
    first.removed = false;
  }

  if (second) {
    second.removed = false;
  }

  game.score = Math.max(0, game.score - move.scoreDelta);
  game.combo = move.comboBefore;
  game.selectedId = null;
  game.stepQueue = createStepQueue();
  game.message = 'Last match restored.';

  return { ok: true };
}

export function shufflePlayableBoard(game: GameState): MoveResult {
  const remaining = activeTiles(game.tiles);

  if (remaining.length < 2) {
    return fail(game, 'No remaining tiles to shuffle.');
  }

  const bag = buildFaceBag(remaining.length, game.seed, game.history.length);
  const shuffledFaces = shuffle(bag, `${game.seed}:${game.history.length}:faces`);

  remaining.forEach((tile, index) => {
    tile.face = shuffledFaces[index];
  });

  game.combo = 0;
  game.selectedId = null;
  game.message = 'Board shuffled into a playable layout.';

  return { ok: true, message: game.message };
}

export function isWon(game: GameState) {
  return remainingTiles(game.tiles).length === 0;
}

export function isCleared(game: GameState) {
  return isWon(game);
}

export function hasMoves(game: GameState) {
  return findAvailableMoves(game.tiles).length > 0;
}

export function displayFace(face: string) {
  const labels: Record<string, string> = {
    B1: 'Bamboo 1',
    B2: 'Bamboo 2',
    B3: 'Bamboo 3',
    B4: 'Bamboo 4',
    B5: 'Bamboo 5',
    B6: 'Bamboo 6',
    B7: 'Bamboo 7',
    B8: 'Bamboo 8',
    B9: 'Bamboo 9',
    C1: 'Coin 1',
    C2: 'Coin 2',
    C3: 'Coin 3',
    C4: 'Coin 4',
    C5: 'Coin 5',
    C6: 'Coin 6',
    C7: 'Coin 7',
    C8: 'Coin 8',
    C9: 'Coin 9',
    D1: 'Dragon 1',
    D2: 'Dragon 2',
    D3: 'Dragon 3',
    D4: 'Dragon 4',
    D5: 'Dragon 5',
    D6: 'Dragon 6',
    D7: 'Dragon 7',
    D8: 'Dragon 8',
    D9: 'Dragon 9',
    E: 'East',
    S: 'South',
    W: 'West',
    N: 'North',
    RED: 'Red Dragon',
    GREEN: 'Green Dragon',
    WHITE: 'White Dragon',
    F1: 'Plum',
    F2: 'Orchid',
    F3: 'Chrysanthemum',
    F4: 'Bamboo Flower',
    S1: 'Spring',
    S2: 'Summer',
    S3: 'Autumn',
    S4: 'Winter',
  };

  return labels[face] ?? face;
}

export function buildFaceBag(count: number, seed = 'faces', offset = 0) {
  const bag: string[] = [];
  const ordinary = shuffle(ORDINARY_FACES, `${seed}:ordinary:${offset}`);

  for (let index = 0; bag.length + 1 < count; index += 1) {
    const face = ordinary[index % ordinary.length];
    bag.push(face, face);
  }

  if (count >= 8) {
    bag.splice(0, 8, 'F1', 'F2', 'F3', 'F4', 'S1', 'S2', 'S3', 'S4');
  }

  if (bag.length < count) {
    bag.push(bag[0] ?? 'B1');
  }

  return bag.slice(0, count);
}

export function shuffle<T>(items: T[], seed = 'seed') {
  const result = [...items];
  const random = seededRandom(seed);

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function fail(game: GameState, message: string): MoveResult {
  game.message = message;
  return { ok: false, message };
}

function canRemoveFromCurrentState(tiles: Tile[], tileId: string) {
  const tile = getTile(tiles, tileId);

  if (!tile || tile.removed) {
    return false;
  }

  if (tile.state === 'queued') {
    return true;
  }

  return isTileFree(tiles, tileId);
}

function seededRandom(seed: string) {
  let state = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
