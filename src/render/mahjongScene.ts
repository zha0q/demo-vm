import * as THREE from 'three';

import { isTileFree, type AvailableMove, type GameState, type Tile } from '../game/board';
import { getMahjongFaceFrame, getMahjongSpriteUrl } from './mahjongSpriteMap';
import {
  clampCameraControls,
  createTopDownCameraState,
  panCameraControls,
  zoomCameraControls,
  type CameraControlState,
} from './cameraControls';

const TILE_WIDTH = 1.02;
const TILE_HEIGHT = 1.74;
const TILE_DEPTH = 0.34;
const TILE_STEP_X = 0.94;
const TILE_STEP_Z = 1.38;
const LAYER_RISE = 0.46;
const LAYER_OFFSET_X = -0.42;
const LAYER_OFFSET_Z = -0.32;
const CAMERA_SIDE_OFFSET = 0;
const CAMERA_DISTANCE = 24;
const HINT_DURATION_MS = 2800;
const FACE_PADDING_X = 0.14;
const FACE_PADDING_Y = 0.1;
const SPRITE_IMAGE = new Image();
const PENDING_FACE_TEXTURES = new Set<THREE.CanvasTexture>();

SPRITE_IMAGE.src = getMahjongSpriteUrl();
SPRITE_IMAGE.addEventListener('load', () => {
  for (const texture of PENDING_FACE_TEXTURES) {
    const face = texture.userData.face as string;
    const canvas = texture.image as HTMLCanvasElement;
    drawFaceToCanvas(face, canvas);
    texture.needsUpdate = true;
    PENDING_FACE_TEXTURES.delete(texture);
  }
});

interface MahjongSceneOptions {
  canvas: HTMLCanvasElement;
  onTileClick: (tileId: string) => void;
}

export class MahjongScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly onTileClick: (tileId: string) => void;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly boardGroup = new THREE.Group();
  private readonly tileMeshes = new Map<string, THREE.Mesh>();
  private game: GameState | null = null;
  private hoveredId: string | null = null;
  private controls = createTopDownCameraState({ boardWidth: 12, boardHeight: 9 });
  private boardSignature = '';
  private layoutSignature = '';
  private animationFrame = 0;
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private suppressClick = false;
  private pinchDistance: number | null = null;
  private readonly activePointers = new Map<number, { x: number; y: number }>();

  constructor({ canvas, onTileClick }: MahjongSceneOptions) {
    this.canvas = canvas;
    this.onTileClick = onTileClick;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.add(this.boardGroup);
    this.setupLights();
    this.bindEvents();
    this.resize();
    this.animate();
  }

  renderBoard(game: GameState) {
    this.game = game;
    const now = performance.now();
    const activeIds = new Set(game.tiles.map((tile) => tile.id));

    for (const [id, mesh] of this.tileMeshes) {
      if (!activeIds.has(id)) {
        this.boardGroup.remove(mesh);
        disposeMesh(mesh);
        this.tileMeshes.delete(id);
      }
    }

    for (const tile of game.tiles) {
      const existing = this.tileMeshes.get(tile.id);
      const mesh = existing ?? createTileMesh(tile);

      if (!existing) {
        this.tileMeshes.set(tile.id, mesh);
        this.boardGroup.add(mesh);
      }

      mesh.position.copy(tileToWorld(tile));
      mesh.userData.baseY = mesh.position.y;
      mesh.userData.tileId = tile.id;
      mesh.rotation.set(0, 0, 0);
      mesh.visible = !tile.removed && tile.state !== 'queued';
      updateTileMaterial(mesh, {
        free: isTileFree(game.tiles, tile.id),
        selected: game.selectedId === tile.id,
        hovered: this.hoveredId === tile.id,
        hinted: Boolean(mesh.userData.hintUntil && mesh.userData.hintUntil > now),
        removed: Boolean(tile.removed),
      });
    }

    this.frameBoard(game.tiles);
  }

  flashHint(move: AvailableMove | undefined) {
    if (!move) {
      return;
    }

    for (const id of [move.firstId, move.secondId]) {
      const mesh = this.tileMeshes.get(id);

      if (mesh) {
        mesh.userData.hintUntil = performance.now() + HINT_DURATION_MS;
      }
    }
  }

  dispose() {
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancel);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('wheel', this.handleWheel);

    for (const mesh of this.tileMeshes.values()) {
      disposeMesh(mesh);
    }

    this.tileMeshes.clear();
    this.renderer.dispose();
  }

  private setupLights() {
    this.scene.add(new THREE.HemisphereLight('#fff7dd', '#103328', 1.18));

    const key = new THREE.DirectionalLight('#fff1be', 2.6);
    key.position.set(-4.5, 13.5, 5.4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight('#80ffd1', 0.78);
    rim.position.set(5.5, 8.5, -4.8);
    this.scene.add(rim);
  }

  private bindEvents() {
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerCancel);
    this.canvas.addEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  private handlePointerDown = (event: PointerEvent) => {
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.pinchDistance = this.activePointers.size >= 2 ? this.measurePinchDistance() : null;
    this.suppressClick = false;
    this.dragging = true;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.canvas.setPointerCapture(event.pointerId);
  };

  private handlePointerUp = (event: PointerEvent) => {
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size < 2) {
      this.pinchDistance = null;
    }
    this.dragging = false;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  };

  private handlePointerCancel = (event: PointerEvent) => {
    this.activePointers.delete(event.pointerId);
    this.dragging = false;
    this.pinchDistance = null;
  };

  private handlePointerLeave = () => {
    this.dragging = false;
    this.activePointers.clear();
    this.pinchDistance = null;
    this.hoveredId = null;
    if (this.game) {
      this.renderBoard(this.game);
    }
  };

  private handlePointerMove = (event: PointerEvent) => {
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.activePointers.size >= 2) {
      const nextDistance = this.measurePinchDistance();

      if (this.pinchDistance && nextDistance > 0) {
        this.suppressClick = true;
        this.controls = clampCameraControls({
          ...this.controls,
          zoom: this.controls.zoom * (nextDistance / this.pinchDistance),
        });
        this.applyCamera();
      }

      this.pinchDistance = nextDistance;
      return;
    }

    if (this.dragging && event.buttons === 1) {
      const scale = 0.015 / this.controls.zoom;
      const dx = (this.lastPointer.x - event.clientX) * scale;
      const dz = (event.clientY - this.lastPointer.y) * scale;

      if (Math.abs(dx) + Math.abs(dz) > 0.02) {
        this.suppressClick = true;
      }

      this.controls = panCameraControls(this.controls, { x: dx, z: dz });
      this.lastPointer = { x: event.clientX, y: event.clientY };
      this.applyCamera();
      return;
    }

    const hit = this.pickTile(event);
    const nextHoveredId = hit?.object.userData.tileId ?? null;

    if (nextHoveredId === this.hoveredId) {
      return;
    }

    this.hoveredId = nextHoveredId;

    if (this.game) {
      this.canvas.style.cursor =
        this.hoveredId && isTileFree(this.game.tiles, this.hoveredId) ? 'pointer' : 'grab';
      this.renderBoard(this.game);
    }
  };

  private handleClick = (event: MouseEvent) => {
    console.log('[MahjongScene] handleClick', {
      movementX: event.movementX,
      movementY: event.movementY,
      pointerType: event instanceof PointerEvent ? event.pointerType : 'mouse',
      buttons: event.buttons,
    });

    if (this.suppressClick) {
      this.suppressClick = false;
      console.log('[MahjongScene] handleClick suppressed');
      return;
    }

    if (Math.abs(event.movementX) + Math.abs(event.movementY) > 3) {
      console.log('[MahjongScene] handleClick ignored due to movement');
      return;
    }

    const hit = this.pickTile(event);
    const tileId = hit?.object.userData.tileId;

    console.log('[MahjongScene] handleClick hit', { tileId });

    if (tileId) {
      this.onTileClick(tileId);
    }
  };

  private handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    this.controls = zoomCameraControls(this.controls, event.deltaY > 0 ? -1 : 1);
    this.applyCamera();
  };

  private pickTile(event: MouseEvent | PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [...this.tileMeshes.values()].filter((mesh) => mesh.visible);
    const hits = this.raycaster.intersectObjects(meshes, false);

    return hits.find((hit) => hit.object.userData.tileId);
  }

  private resize = () => {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    if (width === 0 || height === 0) {
      return;
    }

    this.renderer.setSize(width, height, false);
    if (this.game) {
      this.frameBoard(this.game.tiles, true);
      return;
    }

    this.applyCamera();
  };

  private frameBoard(tiles: Tile[], force = false) {
    const active = tiles.filter((tile) => !tile.removed);

    if (active.length === 0) {
      this.controls = createTopDownCameraState({ boardWidth: 8, boardHeight: 7 });
      this.applyCamera();
      return;
    }

    const bounds = measureTileWorldBounds(active);
    const layoutSignature = tiles.map((tile) => tile.id).sort().join('|');
    const signature = [
      bounds.minX.toFixed(2),
      bounds.maxX.toFixed(2),
      bounds.minZ.toFixed(2),
      bounds.maxZ.toFixed(2),
      active.length,
    ].join(':');
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;
    const boardWidth = Math.max(bounds.maxX - bounds.minX + 1.2, 6);
    const boardHeight = Math.max(bounds.maxZ - bounds.minZ + 1.2, 6);

    this.boardGroup.position.set(-centerX, 0, -centerZ);
    if (!force && signature === this.boardSignature) {
      return;
    }

    const isNewBoard = layoutSignature !== this.layoutSignature;
    const compactViewport = this.canvas.clientWidth < 700;
    const viewportAspect = Math.max(this.canvas.clientWidth, 1) / Math.max(this.canvas.clientHeight, 1);
    const fitHeight = Math.max(boardHeight * 1.18, (boardWidth / Math.max(viewportAspect, 0.46)) * 1.06);
    this.boardSignature = signature;
    this.layoutSignature = layoutSignature;
    this.controls = clampCameraControls({
      ...this.controls,
      bounds: { boardWidth, boardHeight },
      height: fitHeight + (compactViewport ? 0.8 : 1.5),
      zoom: isNewBoard ? (compactViewport ? 1.02 : 0.96) : this.controls.zoom,
    });
    this.applyCamera();
  }

  private applyCamera() {
    const width = Math.max(this.canvas.clientWidth, 1);
    const height = Math.max(this.canvas.clientHeight, 1);
    const aspect = width / height;
    const viewHeight = this.controls.height / this.controls.zoom;
    const viewWidth = viewHeight * aspect;
    const pitch = THREE.MathUtils.degToRad(Math.abs(this.controls.rotation.x));
    const yaw = THREE.MathUtils.degToRad(this.controls.rotation.y);
    const horizontalDistance = Math.cos(pitch) * CAMERA_DISTANCE;
    const cameraHeight = Math.sin(pitch) * CAMERA_DISTANCE;
    const cameraX = this.controls.target.x + Math.sin(yaw) * horizontalDistance + CAMERA_SIDE_OFFSET;
    const cameraZ = this.controls.target.z + Math.cos(yaw) * horizontalDistance;

    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.position.set(cameraX, cameraHeight, cameraZ);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(this.controls.target.x, 0, this.controls.target.z);
    this.camera.updateProjectionMatrix();
  }

  private animate = () => {
    this.animationFrame = requestAnimationFrame(this.animate);
    const now = performance.now();

    for (const mesh of this.tileMeshes.values()) {
      const hintActive = mesh.userData.hintUntil && mesh.userData.hintUntil > now;
      const pulse = hintActive ? (Math.sin(now / 70) + 1) * 0.5 : 0;
      const lift = hintActive ? Math.sin(now / 78) * 0.12 + 0.22 : 0;
      const baseScale = (mesh.userData.baseScale as number | undefined) ?? 1;
      mesh.position.y = mesh.userData.baseY + lift;
      mesh.rotation.z = hintActive ? Math.sin(now / 120) * 0.12 : 0;
      mesh.scale.setScalar(baseScale + (hintActive ? 0.08 + pulse * 0.1 : 0));
    }

    this.renderer.render(this.scene, this.camera);
  };

  private measurePinchDistance() {
    const [first, second] = [...this.activePointers.values()];

    if (!first || !second) {
      return 0;
    }

    return Math.hypot(first.x - second.x, first.y - second.y);
  }
}

function createTileMesh(tile: Tile) {
  const geometry = new THREE.BoxGeometry(TILE_WIDTH, TILE_DEPTH, TILE_HEIGHT, 4, 1, 4);
  const material = [
    sideMaterial('#d9c58b'),
    sideMaterial('#c6aa67'),
    faceMaterial(tile.face),
    sideMaterial('#9d8050'),
    sideMaterial('#d0b677'),
    sideMaterial('#8b7047'),
  ];
  const mesh = new THREE.Mesh(geometry, material);

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.tileId = tile.id;
  mesh.userData.baseY = 0;
  mesh.add(createTileShadow());

  return mesh;
}

function updateTileMaterial(mesh: THREE.Mesh, state: {
  free: boolean;
  selected: boolean;
  hovered: boolean;
  hinted: boolean;
  removed: boolean;
}) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const top = materials[2];
  const sideColor = state.hinted ? '#24c95a' : state.free ? '#0f8a38' : '#244f31';
  const topTint = state.hinted
    ? '#fff7b3'
    : state.selected
      ? '#86ead9'
      : state.hovered && state.free
        ? '#fff2a8'
        : '#f8f1d8';

  materials.forEach((material, index) => {
    material.opacity = state.removed ? 0 : state.free ? 1 : 0.92;
    material.transparent = !state.free || state.removed;
    material.needsUpdate = true;

    if ('color' in material && material.color instanceof THREE.Color && index !== 2) {
      material.color.set(sideColor);
    }

    if (material instanceof THREE.MeshStandardMaterial) {
      material.emissive.set(state.hinted ? '#7a5f00' : '#000000');
      material.emissiveIntensity = state.hinted ? 0.8 : 0;
    }
  });

  if ('color' in top && top.color instanceof THREE.Color) {
    top.color.set(topTint);
  }

  mesh.userData.baseScale = state.selected ? 1.04 : 1;
  mesh.scale.setScalar(mesh.userData.baseScale);
}

function sideMaterial(color: string) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.04 });
}

function faceMaterial(face: string) {
  const texture = createFaceTexture(face);

  return new THREE.MeshStandardMaterial({
    map: texture,
    color: '#f8f1d8',
    roughness: 0.36,
  });
}

function createFaceTexture(face: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 492;
  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.userData.face = face;

  if (SPRITE_IMAGE.complete) {
    drawFaceToCanvas(face, canvas);
    texture.needsUpdate = true;
  } else {
    PENDING_FACE_TEXTURES.add(texture);
  }

  return texture;
}

function tileToWorld(tile: Tile) {
  const x = tile.x * TILE_STEP_X + tile.z * LAYER_OFFSET_X;
  const y = tile.z * LAYER_RISE + TILE_DEPTH / 2;
  const z = tile.y * TILE_STEP_Z + tile.z * LAYER_OFFSET_Z;
  return new THREE.Vector3(x, y, z);
}

function measureTileWorldBounds(tiles: Tile[]) {
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
  };

  for (const tile of tiles) {
    const position = tileToWorld(tile);
    bounds.minX = Math.min(bounds.minX, position.x - TILE_WIDTH / 2);
    bounds.maxX = Math.max(bounds.maxX, position.x + TILE_WIDTH / 2);
    bounds.minZ = Math.min(bounds.minZ, position.z - TILE_HEIGHT / 2);
    bounds.maxZ = Math.max(bounds.maxZ, position.z + TILE_HEIGHT / 2);
  }

  return bounds;
}

function createTileShadow() {
  const texture = createShadowTexture();
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(TILE_WIDTH * 1.28, TILE_HEIGHT * 1.22), material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.075, -TILE_DEPTH / 2 - 0.02, 0.11);
  shadow.renderOrder = -1;

  return shadow;
}

function createShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas 2D context unavailable.');
  }

  const gradient = context.createRadialGradient(64, 64, 10, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
  gradient.addColorStop(0.62, 'rgba(0, 0, 0, 0.22)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawFaceToCanvas(face: string, canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d');

  if (!context) {
    return;
  }

  const frame = getMahjongFaceFrame(face);
  const drawWidthLimit = canvas.width * (1 - FACE_PADDING_X * 2);
  const drawHeightLimit = canvas.height * (1 - FACE_PADDING_Y * 2);
  const scale = Math.min(drawWidthLimit / frame.width, drawHeightLimit / frame.height);
  const drawWidth = frame.width * scale;
  const drawHeight = frame.height * scale;
  const drawX = (canvas.width - drawWidth) / 2;
  const drawY = (canvas.height - drawHeight) / 2;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#f8f1d8';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    SPRITE_IMAGE,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    drawX,
    drawY,
    drawWidth,
    drawHeight,
  );
}

function disposeMesh(mesh: THREE.Mesh) {
  mesh.geometry.dispose();
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

  for (const material of materials) {
    if (material instanceof THREE.MeshStandardMaterial) {
      material.map?.dispose();
    }
    material.dispose();
  }
}
