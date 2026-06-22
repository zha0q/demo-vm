import failOggUrl from '../assets/audio/fail.ogg';
import failMp3Url from '../assets/audio/fail.mp3';
import pengOggUrl from '../assets/audio/peng.ogg';
import pengMp3Url from '../assets/audio/peng.mp3';
import select0OggUrl from '../assets/audio/select0.ogg';
import select0Mp3Url from '../assets/audio/select0.mp3';
import select1OggUrl from '../assets/audio/select1.ogg';
import select1Mp3Url from '../assets/audio/select1.mp3';

export type AudioEffectKey = 'fail' | 'peng' | 'select0' | 'select1';

interface AudioAssetVariant {
  label: string;
  mp3: string;
  ogg: string;
}

const AUDIO_ASSET_VARIANTS: Record<AudioEffectKey, AudioAssetVariant> = {
  fail: {
    label: '音效-失败',
    mp3: failMp3Url,
    ogg: failOggUrl,
  },
  peng: {
    label: '音效-碰',
    mp3: pengMp3Url,
    ogg: pengOggUrl,
  },
  select0: {
    label: '音效-选中A',
    mp3: select0Mp3Url,
    ogg: select0OggUrl,
  },
  select1: {
    label: '音效-选中B',
    mp3: select1Mp3Url,
    ogg: select1OggUrl,
  },
};

let preferredAudioFormat: 'mp3' | 'ogg' | null = null;

export function getResolvedAudioEffectSources() {
  return {
    fail: resolveAudioAsset('fail'),
    peng: resolveAudioAsset('peng'),
    select: [resolveAudioAsset('select0'), resolveAudioAsset('select1')],
  };
}

export function getResolvedPreloadAudioAssets() {
  return (Object.keys(AUDIO_ASSET_VARIANTS) as AudioEffectKey[]).map((key) => {
    const asset = AUDIO_ASSET_VARIANTS[key];

    return {
      label: asset.label,
      url: resolveAudioAsset(key),
    };
  });
}

function resolveAudioAsset(key: AudioEffectKey) {
  const asset = AUDIO_ASSET_VARIANTS[key];
  const format = detectPreferredAudioFormat();

  return format === 'ogg' ? asset.ogg : asset.mp3;
}

function detectPreferredAudioFormat() {
  if (preferredAudioFormat) {
    return preferredAudioFormat;
  }

  const probe = typeof document !== 'undefined' ? document.createElement('audio') : null;
  const canPlayMp3 = probe ? canPlayType(probe, 'audio/mpeg') : true;
  const canPlayOgg = probe ? canPlayType(probe, 'audio/ogg; codecs="vorbis"') : false;

  preferredAudioFormat = canPlayMp3 ? 'mp3' : canPlayOgg ? 'ogg' : 'mp3';
  return preferredAudioFormat;
}

function canPlayType(audio: HTMLAudioElement, mimeType: string) {
  const verdict = audio.canPlayType(mimeType);
  return verdict === 'probably' || verdict === 'maybe';
}
