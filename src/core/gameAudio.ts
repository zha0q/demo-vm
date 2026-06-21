import failSoundUrl from '../assets/audio/fail.ogg';
import pengSoundUrl from '../assets/audio/peng.ogg';
import select0SoundUrl from '../assets/audio/select0.ogg';
import select1SoundUrl from '../assets/audio/select1.ogg';

export type GameSoundEffect = 'select' | 'peng' | 'fail';

export interface GameAudioPlayer {
  play(effect: GameSoundEffect): void;
  playSelect(): void;
  playPeng(): void;
  playFail(): void;
}

export function createGameAudio(): GameAudioPlayer {
  console.log('[gameAudio] createGameAudio');
  const selectAudioElements = [
    createAudioElement(select0SoundUrl),
    createAudioElement(select1SoundUrl),
  ];
  const pengAudio = createAudioElement(pengSoundUrl);
  const failAudio = createAudioElement(failSoundUrl);
  let selectIndex = 0;

  const playSelect = () => {
    const audio = selectAudioElements[selectIndex % selectAudioElements.length];
    selectIndex += 1;
    console.log('[gameAudio] playSelect', { src: audio.src });
    playSound(audio, audio.src);
  };

  const playPeng = () => {
    playSound(pengAudio, pengSoundUrl);
  };

  const playFail = () => {
    playSound(failAudio, failSoundUrl);
  };

  return {
    play(effect) {
      if (effect === 'select') {
        playSelect();
      } else if (effect === 'peng') {
        playPeng();
      } else {
        playFail();
      }
    },
    playSelect,
    playPeng,
    playFail,
  };
}

function createAudioElement(url: string) {
  const audio = new Audio(url);
  audio.preload = 'auto';
  audio.volume = 0.95;
  audio.autoplay = false;
  audio.muted = false;
  audio.load();
  console.log('[gameAudio] createAudioElement', { url, canPlayOgg: audio.canPlayType('audio/ogg') });
  return audio;
}

function playSound(audio: HTMLAudioElement, url: string) {
  try {
    audio.currentTime = 0;
  } catch (error) {
    // Some browsers may reject currentTime resets before metadata is loaded.
  }

  console.log('[gameAudio] playSound attempt', {
    url,
    readyState: audio.readyState,
    paused: audio.paused,
    muted: audio.muted,
    currentSrc: audio.currentSrc,
  });

  audio
    .play()
    .then(() => {
      console.log('[gameAudio] playSound success', { url });
    })
    .catch((error) => {
      console.error('[gameAudio] playSound failed', { url, error });
    });
}
