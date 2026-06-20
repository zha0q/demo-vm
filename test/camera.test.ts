import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import {
  clampCameraControls,
  createTopDownCameraState,
  panCameraControls,
  zoomCameraControls,
} from '../src/render/cameraControls';

describe('top-down camera controls', () => {
  test('starts directly above the board with no perspective tilt', () => {
    const state = createTopDownCameraState({ boardWidth: 12, boardHeight: 9 });

    assert.deepEqual(state.target, { x: 0, y: 0, z: 0 });
    assert.equal(state.rotation.x, -90);
    assert.equal(state.rotation.y, 0);
    assert.equal(state.zoom, 1);
    assert.ok(state.height > 10);
  });

  test('zooms within readable bounds', () => {
    const state = createTopDownCameraState({ boardWidth: 12, boardHeight: 9 });

    assert.equal(zoomCameraControls(state, 8).zoom, 2.5);
    assert.equal(zoomCameraControls(state, -99).zoom, 0.55);
  });

  test('pans but remains clamped around the board', () => {
    const state = createTopDownCameraState({ boardWidth: 12, boardHeight: 9 });
    const panned = panCameraControls(state, { x: 100, z: -100 });
    const clamped = clampCameraControls(panned);

    assert.equal(clamped.target.x, 6);
    assert.equal(clamped.target.z, -4.5);
  });
});
