import classicSpriteUrl from '../assets/classic.png';

const SPRITE_SHEET_WIDTH = 1440;
const SPRITE_SHEET_HEIGHT = 1704;

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

function rect(x: number, y: number, width: number, height: number): MahjongSpriteFrame {
  return { x, y, width, height };
}

const DEFAULT_FRAME = rect(0, 0, 160, 190);

const FACE_FRAME_MAP: Record<string, MahjongSpriteFrame> = {
  C1: rect(0, 0, 160, 190),
  C2: rect(168, 8, 150, 190),
  C3: rect(328, 8, 150, 190),
  C4: rect(488, 8, 150, 190),
  C5: rect(648, 8, 150, 190),
  C6: rect(808, 8, 150, 190),
  C7: rect(968, 8, 150, 190),
  C8: rect(1128, 8, 150, 190),
  C9: rect(1288, 8, 152, 190),
  D1: rect(16, 212, 138, 220),
  D2: rect(176, 212, 138, 220),
  D3: rect(336, 212, 138, 220),
  D4: rect(496, 212, 138, 220),
  D5: rect(656, 212, 138, 220),
  D6: rect(816, 212, 138, 220),
  D7: rect(976, 212, 138, 220),
  D8: rect(1136, 212, 138, 220),
  D9: rect(1296, 212, 138, 220),
  B1: rect(10, 430, 150, 210),
  B2: rect(174, 430, 140, 210),
  B3: rect(334, 430, 140, 210),
  B4: rect(494, 430, 140, 210),
  B5: rect(654, 430, 140, 210),
  B6: rect(814, 430, 140, 210),
  B7: rect(974, 430, 140, 210),
  B8: rect(1134, 430, 140, 210),
  B9: rect(1292, 430, 142, 210),
  N: rect(10, 640, 150, 220),
  W: rect(170, 640, 150, 220),
  S: rect(330, 640, 150, 220),
  E: rect(490, 640, 150, 220),
  F1: rect(810, 640, 150, 220),
  F2: rect(970, 640, 150, 220),
  F3: rect(1130, 640, 150, 220),
  F4: rect(1290, 640, 150, 220),
  S1: rect(10, 850, 150, 220),
  S2: rect(170, 850, 150, 220),
  S3: rect(330, 850, 150, 220),
  S4: rect(490, 850, 150, 220),
  RED: rect(960, 835, 160, 230),
  GREEN: rect(1120, 835, 160, 230),
  WHITE: rect(1282, 820, 158, 236),
};

export function getMahjongSpriteUrl() {
  return classicSpriteUrl;
}

export function getMahjongSpriteSheetSize() {
  return {
    width: SPRITE_SHEET_WIDTH,
    height: SPRITE_SHEET_HEIGHT,
  };
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
  const fitWidth = width * 0.8;
  const fitHeight = height * 0.84;
  const scale = Math.min(fitWidth / target.width, fitHeight / target.height);
  const drawnWidth = target.width * scale;
  const drawnHeight = target.height * scale;
  const offsetX = (width - drawnWidth) / 2 - target.x * scale;
  const offsetY = (height - drawnHeight) / 2 - target.y * scale;

  return {
    backgroundImage: `url(${classicSpriteUrl})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${SPRITE_SHEET_WIDTH * scale}px ${SPRITE_SHEET_HEIGHT * scale}px`,
    backgroundPosition: `${offsetX}px ${offsetY}px`,
  };
}

export function getMahjongFaceQueueSpriteStyle(face: string, width: number, height: number) {
  return getMahjongFaceSpriteStyle(face, width, height, {
    left: 6,
    right: 6,
    top: 8,
    bottom: 8,
  });
}
