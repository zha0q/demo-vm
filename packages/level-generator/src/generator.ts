import { analyzeLevel } from './analyzer.js';
import { getTemplateById } from './templates.js';
import type { CandidateLevel, GenerateLevelOptions, GeneratedLevelAsset, GeneratedLevelTile, LevelTemplate } from './types.js';

const ORDINARY_FACES = [
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9',
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9',
  'E', 'S', 'W', 'N', 'RED', 'GREEN', 'WHITE',
];

interface Coordinate {
  x: number;
  y: number;
  z: number;
}

interface PairedCoordinate {
  face: string;
  coordinates: [Coordinate, Coordinate];
  solutionPair: number;
}

export function createCandidateLevel(options: GenerateLevelOptions): CandidateLevel {
  const template = getTemplateById(options.id);
  const coordinates = solutionOrderedCoordinates(
    template.layoutRows.map((layoutRow) => buildRow(layoutRow.y, layoutRow.z, layoutRow.count, layoutRow.startX ?? 0)),
  );
  const pairCount = Math.floor(coordinates.length / 2);
  const faces = buildFaceBag(template, pairCount * 2, options.seed);
  const pairs: PairedCoordinate[] = [];

  for (let index = 0; index < pairCount; index += 1) {
    pairs.push({
      face: faces[index * 2],
      coordinates: [coordinates[index * 2], coordinates[index * 2 + 1]],
      solutionPair: index + 1,
    });
  }

  const shuffledPairs = shuffle(pairs, `${options.seed}:pair-order`);
  const tiles: GeneratedLevelTile[] = [];

  shuffledPairs.forEach((pair, pairIndex) => {
    pair.coordinates.forEach((coordinate, sideIndex) => {
      tiles.push({
        id: `l${template.id}-p${pairIndex}-${sideIndex}`,
        face: pair.face,
        x: coordinate.x,
        y: coordinate.y,
        z: coordinate.z,
        solutionPair: pair.solutionPair,
      });
    });
  });

  const solutionPreview = [...tiles]
    .sort((left, right) => {
      if (left.solutionPair !== right.solutionPair) {
        return left.solutionPair - right.solutionPair;
      }

      return left.id.localeCompare(right.id);
    })
    .map((tile) => tile.id);

  return {
    template,
    seed: options.seed,
    queue: { capacity: 4 },
    tiles,
    solutionPreview,
  };
}

export function generateLevelAsset(candidate: CandidateLevel): GeneratedLevelAsset {
  const analysis = analyzeLevel(candidate);

  return {
    version: 1,
    id: candidate.template.id,
    name: candidate.template.name,
    subtitle: candidate.template.subtitle,
    seed: candidate.seed,
    queue: candidate.queue,
    hintCount: candidate.template.hintCount,
    undoCount: candidate.template.undoCount,
    comboBreakSeconds: candidate.template.comboBreakSeconds,
    tiles: candidate.tiles,
    analysis,
    solutionPreview: candidate.solutionPreview,
  };
}

function buildFaceBag(template: LevelTemplate, count: number, seed: string) {
  const bag: string[] = [];
  const ordinaryPool = shuffle(ORDINARY_FACES, `${seed}:ordinary-pool:${template.id}`).slice(0, template.faceVariety);

  if (template.includeSpecialFaces && count >= 8) {
    bag.push('F1', 'F2', 'F3', 'F4', 'S1', 'S2', 'S3', 'S4');
  }

  for (let index = 0; bag.length + 1 < count; index += 1) {
    const face = ordinaryPool[index % ordinaryPool.length] ?? ORDINARY_FACES[0];
    bag.push(face, face);
  }

  if (bag.length < count) {
    bag.push(bag[0] ?? ORDINARY_FACES[0]);
  }

  return shuffle(bag.slice(0, count), `${seed}:faces:${template.id}`);
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

function buildRow(y: number, z: number, count: number, startX = 0): Coordinate[] {
  return Array.from({ length: count }, (_, index) => ({
    x: startX + index,
    y,
    z,
  }));
}

function shuffle<T>(items: T[], seed: string) {
  const result = [...items];
  const random = seededRandom(seed);

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
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
