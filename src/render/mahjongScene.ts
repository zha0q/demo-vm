import * as THREE from 'three';

import { displayFace, isTileFree, type AvailableMove, type GameState, type Tile } from '../game/board';
import {
  clampCameraControls,
  createTopDownCameraState,
  panCameraControls,
  zoomCameraControls,
  type CameraControlState,
} from './cameraControls';

const TILE_WIDTH = 1.18;
const TILE_HEIGHT = 1.5;
const TILE_DEPTH = 0.18;
const GAP = 0.16;
const LAYER_RISE = 0.16;

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
  private animationFrame = 0;
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };

  constructor({ canvas, onTileClick }: MahjongSceneOptions) {
    this.canvas = canvas;
    this.onTileClick = onTileClick;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.background = new THREE.Color('#10251f');
    this.scene.add(this.boardGroup);
    this.setupLights();
    this.setupTable();
    this.bindEvents();
    this.resize();
    this.animate();
  }

  renderBoard(game: GameState) {
    this.game = game;
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
      mesh.visible = !tile.removed;
      updateTileMaterial(mesh, {
        free: isTileFree(game.tiles, tile.id),
        selected: game.selectedId === tile.id,
        hovered: this.hoveredId === tile.id,
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
        mesh.userData.hintUntil = performance.now() + 1400;
      }
    }
  }

  dispose() {
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
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
    this.scene.add(new THREE.HemisphereLight('#fff7dd', '#163c33', 1.6));

    const key = new THREE.DirectionalLight('#fff1be', 2.1);
    key.position.set(0, 10, 2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    this.scene.add(key);
  }

  private setupTable() {
    const mat = new THREE.MeshStandardMaterial({ color: '#173c32', roughness: 0.78 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(18, 0.12, 15), mat);
    top.position.y = -0.18;
    top.receiveShadow = true;
    this.scene.add(top);
  }

  private bindEvents() {
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  private handlePointerDown = (event: PointerEvent) => {
    this.dragging = true;
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.canvas.setPointerCapture(event.pointerId);
  };

  private handlePointerUp = (event: PointerEvent) => {
    this.dragging = false;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  };

  private handlePointerLeave = () => {
    this.dragging = false;
    this.hoveredId = null;
    if (this.game) {
      this.renderBoard(this.game);
    }
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (this.dragging && event.buttons === 1) {
      const scale = 0.015 / this.controls.zoom;
      const dx = (this.lastPointer.x - event.clientX) * scale;
      const dz = (event.clientY - this.lastPointer.y) * scale;
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
    if (Math.abs(event.movementX) + Math.abs(event.movementY) > 3) {
      return;
    }

    const hit = this.pickTile(event);
    const tileId = hit?.object.userData.tileId;

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
    this.applyCamera();
  };

  private frameBoard(tiles: Tile[]) {
    const active = tiles.filter((tile) => !tile.removed);

    if (active.length === 0) {
      this.controls = createTopDownCameraState({ boardWidth: 10, boardHeight: 8 });
      this.applyCamera();
      return;
    }

    const minX = Math.min(...active.map((tile) => tile.x));
    const maxX = Math.max(...active.map((tile) => tile.x));
    const minY = Math.min(...active.map((tile) => tile.y));
    const maxY = Math.max(...active.map((tile) => tile.y));
    const centerX = ((minX + maxX) * (TILE_WIDTH + GAP)) / 2;
    const centerZ = ((minY + maxY) * (TILE_HEIGHT + GAP)) / 2;
    const boardWidth = Math.max((maxX - minX + 1) * (TILE_WIDTH + GAP), 6);
    const boardHeight = Math.max((maxY - minY + 1) * (TILE_HEIGHT + GAP), 6);

    this.boardGroup.position.set(-centerX, 0, -centerZ);
    this.controls = clampCameraControls({
      ...this.controls,
      bounds: { boardWidth, boardHeight },
      height: Math.max(boardWidth, boardHeight) + 8,
    });
    this.applyCamera();
  }

  private applyCamera() {
    const width = Math.max(this.canvas.clientWidth, 1);
    const height = Math.max(this.canvas.clientHeight, 1);
    const aspect = width / height;
    const viewHeight = this.controls.height / this.controls.zoom;
    const viewWidth = viewHeight * aspect;

    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.position.set(this.controls.target.x, 24, this.controls.target.z);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(this.controls.target.x, 0, this.controls.target.z);
    this.camera.updateProjectionMatrix();
  }

  private animate = () => {
    this.animationFrame = requestAnimationFrame(this.animate);
    const now = performance.now();

    for (const mesh of this.tileMeshes.values()) {
      const hintActive = mesh.userData.hintUntil && mesh.userData.hintUntil > now;
      const lift = hintActive ? Math.sin(now / 95) * 0.035 + 0.05 : 0;
      mesh.position.y = mesh.userData.baseY + lift;
    }

    this.renderer.render(this.scene, this.camera);
  };
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

  return mesh;
}

function updateTileMaterial(mesh: THREE.Mesh, state: {
  free: boolean;
  selected: boolean;
  hovered: boolean;
  removed: boolean;
}) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const top = materials[2];
  const sideColor = state.free ? '#d7bf80' : '#82765e';
  const topTint = state.selected ? '#86ead9' : state.hovered && state.free ? '#fff2a8' : '#f8f1d8';

  materials.forEach((material, index) => {
    material.opacity = state.removed ? 0 : state.free ? 1 : 0.54;
    material.transparent = !state.free || state.removed;
    material.needsUpdate = true;

    if ('color' in material && material.color instanceof THREE.Color && index !== 2) {
      material.color.set(sideColor);
    }
  });

  if ('color' in top && top.color instanceof THREE.Color) {
    top.color.set(topTint);
  }

  mesh.scale.setScalar(state.selected ? 1.04 : 1);
}

function sideMaterial(color: string) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62 });
}

function faceMaterial(face: string) {
  const texture = createFaceTexture(face);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  return new THREE.MeshStandardMaterial({
    map: texture,
    color: '#f8f1d8',
    roughness: 0.42,
  });
}

function createFaceTexture(face: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 492;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas 2D context unavailable.');
  }

  const accent = faceAccent(face);
  context.fillStyle = '#f8f1d8';
  roundRect(context, 10, 10, 364, 472, 34);
  context.fill();

  context.strokeStyle = '#9d8452';
  context.lineWidth = 10;
  roundRect(context, 24, 24, 336, 444, 28);
  context.stroke();

  context.fillStyle = accent;
  context.font = '900 128px Georgia, "Noto Serif SC", serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(shortFace(face), 192, 190);

  context.font = '800 38px Georgia, "Noto Serif SC", serif';
  context.fillStyle = '#273027';
  wrapText(context, displayFace(face), 192, 310, 300, 42);

  context.strokeStyle = accent;
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(118, 390);
  context.lineTo(266, 390);
  context.stroke();

  return new THREE.CanvasTexture(canvas);
}

function tileToWorld(tile: Tile) {
  const x = tile.x * (TILE_WIDTH + GAP);
  const y = tile.z * LAYER_RISE + TILE_DEPTH / 2;
  const z = tile.y * (TILE_HEIGHT + GAP);
  return new THREE.Vector3(x, y, z);
}

function faceAccent(face: string) {
  if (face.startsWith('B')) {
    return '#087754';
  }

  if (face.startsWith('C')) {
    return '#a46712';
  }

  if (face.startsWith('D') || face === 'RED') {
    return '#b8322b';
  }

  if (face === 'GREEN' || face.startsWith('F')) {
    return '#1d7a49';
  }

  if (face.startsWith('S')) {
    return '#2f55b4';
  }

  return '#1f2937';
}

function shortFace(face: string) {
  if (face.startsWith('B')) {
    return `竹${face.slice(1)}`;
  }

  if (face.startsWith('C')) {
    return `筒${face.slice(1)}`;
  }

  if (face.startsWith('D')) {
    return `万${face.slice(1)}`;
  }

  if (face.startsWith('F')) {
    return '花';
  }

  if (face.startsWith('S') && face.length === 2) {
    return '季';
  }

  return face.slice(0, 2);
}

function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;

    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  context.fillText(line, x, y);
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
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
