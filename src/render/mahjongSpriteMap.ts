import mahjongSpriteUrl from '../assets/mahjong.PNG';

const SPRITE_SHEET_SIZE = 2880;

const COLUMN_BOUNDS = [
  [51, 258],
  [285, 495],
  [517, 728],
  [748, 962],
  [988, 1196],
  [1221, 1429],
  [1454, 1662],
  [1688, 1896],
  [1921, 2130],
  [2156, 2365],
  [2389, 2599],
  [2623, 2835],
] as const;

const ROW_BOUNDS = [
  [29, 326],
  [346, 643],
  [664, 952],
  [978, 1275],
  [1297, 1583],
  [1610, 1891],
  [1920, 2195],
  [2223, 2487],
  [2521, 2779],
] as const;

export interface MahjongSpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FrameInset {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

function frame(row: number, column: number): MahjongSpriteFrame {
  const [left, right] = COLUMN_BOUNDS[column - 1];
  const [top, bottom] = ROW_BOUNDS[row - 1];

  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

const DEFAULT_FRAME = frame(9, 1);

const FACE_FRAME_MAP: Record<string, MahjongSpriteFrame> = {
  D1: frame(1, 1),
  D2: frame(1, 2),
  D3: frame(1, 3),
  D4: frame(1, 4),
  D5: frame(1, 5),
  D6: frame(1, 6),
  D7: frame(1, 7),
  D8: frame(1, 8),
  D9: frame(1, 9),
  B1: frame(2, 1),
  B2: frame(2, 2),
  B3: frame(2, 3),
  B4: frame(2, 4),
  B5: frame(2, 5),
  B6: frame(2, 6),
  B7: frame(2, 7),
  B8: frame(2, 8),
  B9: frame(2, 9),
  C1: frame(1, 10),
  C2: frame(1, 11),
  C3: frame(1, 12),
  C4: frame(2, 10),
  C5: frame(2, 11),
  C6: frame(2, 12),
  C7: frame(3, 10),
  C8: frame(3, 11),
  C9: frame(3, 12),
  E: frame(3, 1),
  S: frame(3, 2),
  W: frame(3, 3),
  N: frame(3, 4),
  RED: frame(3, 5),
  GREEN: frame(3, 6),
  WHITE: frame(3, 7),
  F1: frame(7, 5),
  F2: frame(7, 6),
  F3: frame(7, 7),
  F4: frame(7, 4),
  S1: frame(8, 8),
  S2: frame(8, 9),
  S3: frame(8, 10),
  S4: frame(8, 11),
};

export function getMahjongSpriteUrl() {
  return mahjongSpriteUrl;
}

export function getMahjongSpriteSheetSize() {
  return SPRITE_SHEET_SIZE;
}

export function getMahjongFaceFrame(face: string) {
  return FACE_FRAME_MAP[face] ?? DEFAULT_FRAME;
}

function insetFrame(frameRect: MahjongSpriteFrame, inset: FrameInset = {}) {
  const left = inset.left ?? 0;
  const right = inset.right ?? 0;
  const top = inset.top ?? 0;
  const bottom = inset.bottom ?? 0;

  return {
    x: frameRect.x + left,
    y: frameRect.y + top,
    width: Math.max(1, frameRect.width - left - right),
    height: Math.max(1, frameRect.height - top - bottom),
  };
}

export function getMahjongFaceSpriteStyle(face: string, width: number, height: number, inset?: FrameInset) {
  const target = insetFrame(getMahjongFaceFrame(face), inset);
  const scale = Math.min(width / target.width, height / target.height);
  const scaledSheetSize = SPRITE_SHEET_SIZE * scale;
  const offsetX = (width - target.width * scale) / 2 - target.x * scale;
  const offsetY = (height - target.height * scale) / 2 - target.y * scale;

  return {
    backgroundImage: `url(${mahjongSpriteUrl})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${scaledSheetSize}px ${scaledSheetSize}px`,
    backgroundPosition: `${offsetX}px ${offsetY}px`,
  };
}

export function getMahjongFaceQueueSpriteStyle(face: string, width: number, height: number) {
  return getMahjongFaceSpriteStyle(face, width, height, {
    left: 12,
    right: 10,
    top: 10,
    bottom: 12,
  });
}
