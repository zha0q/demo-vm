import {
  IQ_CONFIDENCE_PROGRESS_THRESHOLD,
  IQ_MAX,
  IQ_MIN,
  IQ_SECONDS_PER_PAIR,
} from './constants';

export interface InGameIqInput {
  clearedPairs: number;
  totalPairs: number;
  currentCombo: number;
  elapsedSeconds: number;
}

export interface InGameIqResult {
  iq: number;
  progressScore: number;
  comboScore: number;
  timeScore: number;
  confidence: number;
  label: string;
}

export function calculateInGameIq(input: InGameIqInput): InGameIqResult {
  const totalPairs = Math.max(0, input.totalPairs);
  const clearedPairs = clamp(input.clearedPairs, 0, totalPairs);
  const progress = totalPairs <= 0 ? 0 : clearedPairs / totalPairs;
  const combo = Math.max(0, input.currentCombo);
  const elapsedSeconds = Math.max(0, input.elapsedSeconds);
  const referenceSeconds = Math.max(IQ_SECONDS_PER_PAIR, totalPairs * IQ_SECONDS_PER_PAIR);

  const progressScore = 100 * Math.sqrt(progress);
  const comboScore = 100 * (1 - Math.exp(-combo / 6));
  const expectedNow = referenceSeconds * (0.10 + 0.90 * progress);
  const timeScore = 100 / (1 + Math.exp((elapsedSeconds - expectedNow) / (0.18 * referenceSeconds + 8)));
  const quality = 0.45 * progressScore + 0.30 * timeScore + 0.25 * comboScore;
  const raw = clamp(IQ_MIN + 0.70 * quality, IQ_MIN, IQ_MAX);
  const confidence = clamp(progress / IQ_CONFIDENCE_PROGRESS_THRESHOLD, 0, 1);
  const iq = Math.round(100 * (1 - confidence) + raw * confidence);

  return {
    iq,
    progressScore,
    comboScore,
    timeScore,
    confidence,
    label: labelForIq(iq),
  };
}

export function labelForIq(iq: number) {
  if (iq < 100) {
    return '稳定观察中';
  }

  if (iq < 115) {
    return '思路在线';
  }

  if (iq < 130) {
    return '节奏不错';
  }

  if (iq < 145) {
    return '高效清台';
  }

  return '神级状态';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
