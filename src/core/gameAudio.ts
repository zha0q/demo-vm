import { getResolvedAudioEffectSources } from './audioSources';

export type GameSoundEffect = 'select' | 'peng' | 'fail';

export interface GameAudioPlayer {
  play(effect: GameSoundEffect): void;
  playSelect(): void;
  playPeng(): void;
  playFail(): void;
}

export function createGameAudio(): GameAudioPlayer {
  const sources = getResolvedAudioEffectSources();
  const selectAudioElements = [
    createAudioElement(sources.select[0]),
    createAudioElement(sources.select[1]),
  ];
  const pengAudio = createAudioElement(sources.peng);
  const failAudio = createAudioElement(sources.fail);
  const unlockAudio = createAudioUnlocker([...selectAudioElements, pengAudio, failAudio]);
  let selectIndex = 0;

  const playSelect = () => {
    const audio = selectAudioElements[selectIndex % selectAudioElements.length];
    selectIndex += 1;
    unlockAudio();
    playSound(audio);
  };

  const playPeng = () => {
    unlockAudio();
    playSound(pengAudio);
  };

  const playFail = () => {
    unlockAudio();
    playSound(failAudio);
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
  return audio;
}

function playSound(audio: HTMLAudioElement) {
  try {
    audio.currentTime = 0;
  } catch {
    // Some browsers may reject currentTime resets before metadata is loaded.
  }

  void audio.play().catch(() => {
    // iOS Safari may still reject playback until audio is unlocked by a gesture.
  });
}

function createAudioUnlocker(audioElements: HTMLAudioElement[]) {
  let unlocked = false;

  const unlock = () => {
    if (unlocked) {
      return;
    }

    unlocked = true;
    removeUnlockListeners();

    for (const audio of audioElements) {
      primeAudioElement(audio);
    }
  };

  const removeUnlockListeners = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('keydown', unlock);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
  }

  return unlock;
}

function primeAudioElement(audio: HTMLAudioElement) {
  const previousMuted = audio.muted;
  const previousVolume = audio.volume;

  audio.muted = true;
  audio.volume = 0;

  void audio
    .play()
    .then(() => {
      audio.pause();

      try {
        audio.currentTime = 0;
      } catch {
        // Ignore currentTime resets before metadata is available.
      }
    })
    .catch(() => {
      // Ignore unlock failures and fall back to direct playback attempts.
    })
    .finally(() => {
      audio.muted = previousMuted;
      audio.volume = previousVolume;
    });
}
