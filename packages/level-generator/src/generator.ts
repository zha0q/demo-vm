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

export function createCandidateLevel(options: GenerateLevelOptions): CandidateLevel {
  const template = getTemplateById(options.id);
  const coordinates = solutionOrderedCoordinates(
    template.layoutRows.map((layoutRow) => buildRow(layoutRow.y, layoutRow.z, layoutRow.count, layoutRow.startX ?? 0)),
  ).slice(0, Math.floor(template.layoutRows.reduce((sum, row) => sum + row.count, 0) / 2) * 2);
  const pairCount = Math.floor(coordinates.length / 2);
  const schedule = buildPairSchedule(pairCount, 4, `${options.seed}:schedule:${template.id}`);
  const faces = assignPairFaces(template, schedule, options.seed);
  const pairOccurrences = new Map<number, Coordinate[]>();
  const tiles: GeneratedLevelTile[] = [];
  const solutionPreview: string[] = [];

  schedule.forEach((pairIndex, eventIndex) => {
    const occurrenceIndex = pairOccurrences.get(pairIndex)?.length ?? 0;
    const coordinate = coordinates[eventIndex];
    const tileId = `l${template.id}-p${pairIndex}-${occurrenceIndex}`;

    if (!coordinate) {
      return;
    }

    pairOccurrences.set(pairIndex, [...(pairOccurrences.get(pairIndex) ?? []), coordinate]);
    tiles.push({
      id: tileId,
      face: faces[pairIndex] ?? ORDINARY_FACES[pairIndex % ORDINARY_FACES.length],
      x: coordinate.x,
      y: coordinate.y,
      z: coordinate.z,
      solutionPair: pairIndex + 1,
    });
    solutionPreview.push(tileId);
  });

  return {
    template,
    seed: options.seed,
    queue: { capacity: 4 },
    tiles: shuffle(tiles, `${options.seed}:tile-output:${template.id}`),
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

function buildPairSchedule(pairCount: number, queueCapacity: number, seed: string) {
  const random = seededRandom(seed);
  const openedAt = new Map<number, number>();
  const openPairs: number[] = [];
  const schedule: number[] = [];
  const targetPressure = Math.max(2, Math.min(queueCapacity, 3 + Math.floor(random() * 2)));
  let nextPair = 0;
  let closedPairs = 0;

  while (closedPairs < pairCount) {
    const canOpen = nextPair < pairCount && openPairs.length < queueCapacity;
    const mustOpen = openPairs.length === 0;
    const shouldBuildPressure = canOpen && openPairs.length < targetPressure && pairCount - nextPair > 1;
    const shouldOpen = mustOpen || shouldBuildPressure || (canOpen && random() < 0.42 && pairCount - nextPair > openPairs.length);

    if (shouldOpen) {
      openedAt.set(nextPair, schedule.length);
      openPairs.push(nextPair);
      schedule.push(nextPair);
      nextPair += 1;
      continue;
    }

    const closeIndex = pickCloseIndex(openPairs, openedAt, schedule.length, random);
    const [pairIndex] = openPairs.splice(closeIndex, 1);
    schedule.push(pairIndex);
    closedPairs += 1;
  }

  return schedule;
}

function pickCloseIndex(openPairs: number[], openedAt: Map<number, number>, currentIndex: number, random: () => number) {
  const weighted = openPairs.map((pairIndex, index) => {
    const age = currentIndex - (openedAt.get(pairIndex) ?? currentIndex);
    return { index, weight: Math.max(1, age) ** 1.4 };
  });
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random() * totalWeight;

  for (const item of weighted) {
    cursor -= item.weight;

    if (cursor <= 0) {
      return item.index;
    }
  }

  return weighted.at(-1)?.index ?? 0;
}

function assignPairFaces(template: LevelTemplate, schedule: number[], seed: string) {
  const faces = new Array<string>(Math.max(...schedule) + 1);
  const activeGroups = new Set<string>();
  const ordinaryPool = shuffle(ORDINARY_FACES, `${seed}:ordinary-pool:${template.id}`).slice(0, template.faceVariety);
  const facePool = template.includeSpecialFaces
    ? [...ordinaryPool, 'F1', 'F2', 'F3', 'F4', 'S1', 'S2', 'S3', 'S4']
    : ordinaryPool;
  let cursor = 0;

  for (const pairIndex of schedule) {
    const existingFace = faces[pairIndex];

    if (existingFace) {
      activeGroups.delete(faceGroup(existingFace));
      continue;
    }

    const face = pickInactiveFace(facePool, activeGroups, cursor);
    faces[pairIndex] = face;
    activeGroups.add(faceGroup(face));
    cursor += 1;
  }

  return faces;
}

function pickInactiveFace(facePool: string[], activeGroups: Set<string>, startIndex: number) {
  for (let offset = 0; offset < facePool.length; offset += 1) {
    const face = facePool[(startIndex + offset) % facePool.length];

    if (!activeGroups.has(faceGroup(face))) {
      return face;
    }
  }

  return facePool[startIndex % facePool.length] ?? ORDINARY_FACES[0];
}

function faceGroup(face: string) {
  if (face.startsWith('F')) {
    return 'flower';
  }

  if (face.startsWith('S')) {
    return 'season';
  }

  return face;
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
