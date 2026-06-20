import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import { IQ_MAX, IQ_MIN } from '../src/game/constants';
import { calculateInGameIq } from '../src/game/inGameIqCalculator';

describe('same-round mahjong IQ calculator', () => {
  test('starts near the neutral 100 score', () => {
    const result = calculateInGameIq({ clearedPairs: 0, totalPairs: 18, currentCombo: 0, elapsedSeconds: 0 });

    assert.equal(result.iq, 100);
    assert.equal(result.confidence, 0);
  });

  test('stays inside configured bounds and handles empty boards safely', () => {
    const fast = calculateInGameIq({ clearedPairs: 100, totalPairs: 100, currentCombo: 80, elapsedSeconds: 0 });
    const empty = calculateInGameIq({ clearedPairs: 0, totalPairs: 0, currentCombo: 0, elapsedSeconds: 20 });

    assert.ok(fast.iq >= IQ_MIN && fast.iq <= IQ_MAX);
    assert.ok(empty.iq >= IQ_MIN && empty.iq <= IQ_MAX);
    assert.equal(Number.isNaN(empty.iq), false);
  });

  test('progress and combo improve their component scores', () => {
    const early = calculateInGameIq({ clearedPairs: 1, totalPairs: 20, currentCombo: 1, elapsedSeconds: 20 });
    const later = calculateInGameIq({ clearedPairs: 10, totalPairs: 20, currentCombo: 6, elapsedSeconds: 20 });

    assert.ok(later.progressScore > early.progressScore);
    assert.ok(later.comboScore > early.comboScore);
  });

  test('longer elapsed time lowers the time score', () => {
    const quick = calculateInGameIq({ clearedPairs: 8, totalPairs: 20, currentCombo: 3, elapsedSeconds: 20 });
    const slow = calculateInGameIq({ clearedPairs: 8, totalPairs: 20, currentCombo: 3, elapsedSeconds: 240 });

    assert.ok(quick.timeScore > slow.timeScore);
  });
});
