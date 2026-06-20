export interface CameraBounds {
  boardWidth: number;
  boardHeight: number;
}

export interface CameraControlState {
  target: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  height: number;
  zoom: number;
  bounds: CameraBounds;
}

export function createTopDownCameraState(bounds: CameraBounds): CameraControlState {
  return {
    target: { x: 0, y: 0, z: 0 },
    rotation: { x: -90, y: 0, z: 0 },
    height: Math.max(bounds.boardWidth, bounds.boardHeight) + 8,
    zoom: 1,
    bounds,
  };
}

export function zoomCameraControls(state: CameraControlState, delta: number) {
  return clampCameraControls({
    ...state,
    target: { ...state.target },
    rotation: { ...state.rotation },
    zoom: state.zoom + delta * 0.25,
  });
}

export function panCameraControls(state: CameraControlState, delta: { x: number; z: number }) {
  return clampCameraControls({
    ...state,
    target: {
      ...state.target,
      x: state.target.x + delta.x,
      z: state.target.z + delta.z,
    },
    rotation: { ...state.rotation },
  });
}

export function clampCameraControls(state: CameraControlState): CameraControlState {
  return {
    ...state,
    target: {
      ...state.target,
      x: clamp(state.target.x, -state.bounds.boardWidth / 2, state.bounds.boardWidth / 2),
      z: clamp(state.target.z, -state.bounds.boardHeight / 2, state.bounds.boardHeight / 2),
    },
    rotation: { ...state.rotation, x: -90, y: 0, z: 0 },
    zoom: clamp(state.zoom, 0.55, 2.5),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
