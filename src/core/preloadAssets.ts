import beginBackgroundUrl from '../assets/begin_bg.PNG';
import gamingBackgroundUrl from '../assets/gaming_bg.PNG';
import mahjongSpriteUrl from '../assets/classic.png';
import successTitleUrl from '../assets/success_title.PNG';
import failSoundUrl from '../assets/audio/fail.ogg';
import pengSoundUrl from '../assets/audio/peng.ogg';
import select0SoundUrl from '../assets/audio/select0.ogg';
import select1SoundUrl from '../assets/audio/select1.ogg';
import { getLevel, levelCatalog } from './levelLoader';

export interface PreloadProgress {
  loaded: number;
  total: number;
  label: string;
}

type ProgressListener = (progress: PreloadProgress) => void;

const IMAGE_ASSETS = [
  { label: '首页背景', url: beginBackgroundUrl },
  { label: '棋盘背景', url: gamingBackgroundUrl },
  { label: '麻将牌图集', url: mahjongSpriteUrl },
  { label: '通关标题', url: successTitleUrl },
] as const;

const AUDIO_ASSETS = [
  { label: '音效-失败', url: failSoundUrl },
  { label: '音效-碰', url: pengSoundUrl },
  { label: '音效-选中A', url: select0SoundUrl },
  { label: '音效-选中B', url: select1SoundUrl },
] as const;

let preloadPromise: Promise<void> | null = null;

export function preloadStaticResources(onProgress?: ProgressListener) {
  if (preloadPromise) {
    return preloadPromise;
  }

  const total = IMAGE_ASSETS.length + AUDIO_ASSETS.length + 1;
  let loaded = 0;
  const report = (label: string) => {
    loaded += 1;
    onProgress?.({ loaded, total, label });
  };

  preloadPromise = Promise.all([
    ...IMAGE_ASSETS.map((asset) => preloadImage(asset.url).then(() => report(asset.label))),
    ...AUDIO_ASSETS.map((asset) => preloadAudio(asset.url).then(() => report(asset.label))),
  ])
    .then(() => {
      preloadLevelAssets();
      report('关卡数据');
    })
    .then(() => undefined);

  return preloadPromise;
}

export function resetStaticResourcePreload() {
  preloadPromise = null;
}

function preloadImage(url: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
    image.src = url;
  });
}

function preloadAudio(url: string) {
  return new Promise<void>((resolve, reject) => {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.oncanplaythrough = () => resolve();
    audio.onerror = () => reject(new Error(`Failed to preload audio: ${url}`));
    audio.load();
  });
}

function preloadLevelAssets() {
  for (const level of levelCatalog) {
    getLevel(level.id);
  }
}
