import { buildFaceBag, shuffle, type Tile } from './board';

export interface LevelDefinition {
  id: number;
  name: string;
  subtitle: string;
  shape: 'gate' | 'turtle' | 'pavilion';
}

interface Coordinate {
  x: number;
  y: number;
  z: number;
}

export const levelCatalog: LevelDefinition[] = [
  {
    id: 1,
    name: 'Garden Gate',
    subtitle: 'Compact opener with a few stacked locks.',
    shape: 'gate',
  },
  {
    id: 2,
    name: 'Classic Turtle',
    subtitle: 'Wide shoulders and a small raised roof.',
    shape: 'turtle',
  },
  {
    id: 3,
    name: 'Moon Pavilion',
    subtitle: 'A taller pyramid that rewards top-down clearing.',
    shape: 'pavilion',
  },
];

export function createLevelTiles(levelId = 1, seed = 'vita-mahjong-demo'): Tile[] {
  const level = levelCatalog.find((candidate) => candidate.id === levelId) ?? levelCatalog[0];
  const coordinates = getShapeCoordinates(level.shape);
  const pairCount = Math.floor(coordinates.length / 2);
  const faces = buildFaceBag(pairCount * 2, seed, levelId);
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

function getShapeCoordinates(shape: LevelDefinition['shape']) {
  if (shape === 'gate') {
    return solutionOrderedCoordinates([
      row(0, 0, 5),
      row(1, 0, 5),
      row(2, 1, 3),
      row(3, 1, 3),
      row(4, 2, 1),
      row(5, 2, 1),
    ]);
  }

  if (shape === 'pavilion') {
    return solutionOrderedCoordinates([
      row(0, 0, 9),
      row(1, 0, 9),
      row(2, 1, 7),
      row(3, 1, 7),
      row(4, 2, 5),
      row(5, 2, 5),
      row(6, 3, 3),
      row(7, 3, 3),
      row(8, 4, 1),
      row(9, 4, 1),
    ]);
  }

  return solutionOrderedCoordinates([
    row(0, 0, 8),
    row(1, 0, 10, -1),
    row(2, 0, 10, -1),
    row(3, 0, 8),
    row(1, 1, 8),
    row(2, 1, 8),
    row(1, 2, 6),
    row(2, 2, 6),
    row(1, 3, 4),
    row(2, 3, 4),
  ]);
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
