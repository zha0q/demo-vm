import { ORDINARY_FACES, shuffle, type Tile } from './board';
import { getLevelConfig, LEVEL_CONFIGS, type LevelConfig } from './config';

interface Coordinate {
  x: number;
  y: number;
  z: number;
}

export const levelCatalog = LEVEL_CONFIGS.map((config) => ({
  id: config.id,
  name: config.name,
  subtitle: config.subtitle,
  difficulty: config.difficulty,
}));

export function createLevelTiles(levelId = 1, seed = 'vita-mahjong-demo'): Tile[] {
  const level = getLevelConfig(levelId);
  const coordinates = solutionOrderedCoordinates(
    level.layoutRows.map((layoutRow) => row(layoutRow.y, layoutRow.z, layoutRow.count, layoutRow.startX ?? 0)),
  );
  const pairCount = Math.floor(coordinates.length / 2);
  const faces = buildLevelFaceBag(level, pairCount * 2, seed);
  const pairs = [];

  for (let index = 0; index < pairCount; index += 1) {
    pairs.push({
      face: faces[index * 2],
      coordinates: [coordinates[index * 2], coordinates[index * 2 + 1]],
      solutionPair: index + 1,
    });
  }

  const shuffledPairs = shuffle(pairs, `${seed}:${levelId}:pair-order`);
  const tiles: Tile[] = [];

  shuffledPairs.forEach((pair, pairIndex) => {
    pair.coordinates.forEach((coordinate, sideIndex) => {
      tiles.push({
        id: `l${level.id}-p${pairIndex}-${sideIndex}`,
        face: pair.face,
        x: coordinate.x,
        y: coordinate.y,
        z: coordinate.z,
        solutionPair: pair.solutionPair,
      });
    });
  });

  return tiles;
}

function buildLevelFaceBag(level: LevelConfig, count: number, seed: string) {
  const bag: string[] = [];
  const ordinaryPool = shuffle(ORDINARY_FACES, `${seed}:ordinary-pool:${level.id}`).slice(0, level.faceVariety);

  if (level.includeSpecialFaces && count >= 8) {
    bag.push('F1', 'F2', 'F3', 'F4', 'S1', 'S2', 'S3', 'S4');
  }

  for (let index = 0; bag.length + 1 < count; index += 1) {
    const face = ordinaryPool[index % ordinaryPool.length] ?? ORDINARY_FACES[0];
    bag.push(face, face);
  }

  if (bag.length < count) {
    bag.push(bag[0] ?? ORDINARY_FACES[0]);
  }

  return shuffle(bag.slice(0, count), `${seed}:level-faces:${level.id}`);
}

function solutionOrderedCoordinates(rows: Coordinate[][]) {
  const coordinates = rows.flat();

  return coordinates.sort((left, right) => {
    if (right.z !== left.z) {
      return right.z - left.z;
    }

    const leftEdgeDistance = Math.min(left.x, maxXForLayer(coordinates, left.z) - left.x);
    const rightEdgeDistance = Math.min(right.x, maxXForLayer(coordinates, right.z) - right.x);

    if (leftEdgeDistance !== rightEdgeDistance) {
      return leftEdgeDistance - rightEdgeDistance;
    }

    if (left.y !== right.y) {
      return left.y - right.y;
    }

    return left.x - right.x;
  });
}

function maxXForLayer(coordinates: Coordinate[], z: number) {
  return Math.max(...coordinates.filter((coordinate) => coordinate.z === z).map((coordinate) => coordinate.x));
}

function row(y: number, z: number, count: number, startX = 0): Coordinate[] {
  return Array.from({ length: count }, (_, index) => ({
    x: startX + index,
    y,
    z,
  }));
}
