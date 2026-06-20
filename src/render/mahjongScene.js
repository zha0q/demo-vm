import * as THREE from 'three';

import { displayFace, isTileFree } from '../game/board.js';

const TILE_WIDTH = 1.08;
const TILE_HEIGHT = 1.45;
const TILE_DEPTH = 0.34;
const GAP = 0.14;
const LAYER_RISE = 0.42;

export class MahjongScene {
  constructor({ canvas, onTileClick }) {
    this.canvas = canvas;
    this.onTileClick = onTileClick;
    this.tileMeshes = new Map();
    this.selectedId = null;
    this.hoveredId = null;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b1d18');
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);

    this.setupLights();
    this.setupTable();
    this.bindEvents();
    this.resize();
    this.animate();
  }

  renderBoard(game) {
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
        removed: tile.removed,
      });
    }

    this.frameBoard(game.tiles);
  }

  flashHint(move) {
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

  setupLights() {
    const ambient = new THREE.HemisphereLight('#fff7dd', '#17362e', 1.9);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight('#fff1be', 2.5);
    key.position.set(4, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    this.scene.add(key);

    const rim = new THREE.PointLight('#5eead4', 22, 10);
    rim.position.set(-5, 3, -3);
    this.scene.add(rim);
  }

  setupTable() {
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(8.5, 9.3, 0.45, 96),
      new THREE.MeshStandardMaterial({
        color: '#173c32',
        roughness: 0.72,
        metalness: 0.05,
      }),
    );
    top.position.y = -0.38;
    top.receiveShadow = true;
    this.scene.add(top);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(8.55, 0.055, 12, 128),
      new THREE.MeshStandardMaterial({
        color: '#d7b56d',
        roughness: 0.45,
        metalness: 0.3,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.13;
    this.scene.add(ring);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event));
    this.canvas.addEventListener('pointerleave', () => {
      this.hoveredId = null;
      if (this.game) {
        this.renderBoard(this.game);
      }
    });
    this.canvas.addEventListener('click', (event) => this.handleClick(event));
  }

  handlePointerMove(event) {
    const hit = this.pickTile(event);
    const nextHoveredId = hit?.object.userData.tileId ?? null;

    if (nextHoveredId === this.hoveredId) {
      return;
    }

    this.hoveredId = nextHoveredId;

    if (this.game) {
      this.canvas.style.cursor =
        this.hoveredId && isTileFree(this.game.tiles, this.hoveredId) ? 'pointer' : 'default';
      this.renderBoard(this.game);
    }
  }

  handleClick(event) {
    const hit = this.pickTile(event);
    const tileId = hit?.object.userData.tileId;

    if (tileId && this.onTileClick) {
      this.onTileClick(tileId);
    }
  }

  pickTile(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [...this.tileMeshes.values()].filter((mesh) => mesh.visible);
    const hits = this.raycaster.intersectObjects(meshes, true);

    return hits.find((hit) => hit.object.userData.tileId);
  }

  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    if (width === 0 || height === 0) {
      return;
    }

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  frameBoard(tiles) {
    const active = tiles.filter((tile) => !tile.removed);

    if (active.length === 0) {
      this.camera.position.set(0, 8, 8);
      this.camera.lookAt(0, 0, 0);
      return;
    }

    const maxX = Math.max(...active.map((tile) => tile.x));
    const maxY = Math.max(...active.map((tile) => tile.y));
    const maxZ = Math.max(...active.map((tile) => tile.z));
    const centerX = (maxX * (TILE_WIDTH + GAP)) / 2;
    const centerZ = (maxY * (TILE_HEIGHT + GAP)) / 2;
    const span = Math.max(maxX * (TILE_WIDTH + GAP), maxY * (TILE_HEIGHT + GAP), 5);

    this.boardGroup.position.set(-centerX, 0, -centerZ);
    this.camera.position.set(0, span * 0.82 + maxZ * 0.28, span * 1.05 + 4);
    this.camera.lookAt(0, 0.35 + maxZ * 0.18, 0);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const now = performance.now();

    for (const mesh of this.tileMeshes.values()) {
      const hintActive = mesh.userData.hintUntil && mesh.userData.hintUntil > now;
      const lift = hintActive ? Math.sin(now / 95) * 0.055 + 0.08 : 0;
      mesh.position.y = mesh.userData.baseY + lift;
    }

    this.boardGroup.rotation.y = Math.sin(now / 9000) * 0.035;
    this.renderer.render(this.scene, this.camera);
  }
}

function createTileMesh(tile) {
  const geometry = new THREE.BoxGeometry(TILE_WIDTH, TILE_DEPTH, TILE_HEIGHT, 6, 2, 6);
  const material = [
    new THREE.MeshStandardMaterial({ color: '#dfcda2', roughness: 0.58 }),
    new THREE.MeshStandardMaterial({ color: '#c9b074', roughness: 0.62 }),
    new THREE.MeshStandardMaterial({ color: '#f5edd4', roughness: 0.52 }),
    new THREE.MeshStandardMaterial({ color: '#ad9059', roughness: 0.66 }),
    faceMaterial(tile.face),
    new THREE.MeshStandardMaterial({ color: '#8b7047', roughness: 0.72 }),
  ];
  const mesh = new THREE.Mesh(geometry, material);

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.tileId = tile.id;
  mesh.userData.baseY = 0;

  return mesh;
}

function updateTileMaterial(mesh, state) {
  const sideMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const tint = state.selected ? '#8ce9d2' : state.hovered && state.free ? '#fff5b3' : '#f5edd4';
  const side = state.free ? '#dfcda2' : '#8b7d62';

  for (const material of sideMaterials) {
    material.opacity = state.removed ? 0 : state.free ? 1 : 0.48;
    material.transparent = !state.free || state.removed;
    material.needsUpdate = true;
  }

  sideMaterials[0].color.set(side);
  sideMaterials[1].color.set(side);
  sideMaterials[4].color.set(tint);
  mesh.scale.setScalar(state.selected ? 1.045 : 1);
}

function faceMaterial(face) {
  const texture = createFaceTexture(face);
  texture.colorSpace = THREE.SRGBColorSpace;

  return new THREE.MeshStandardMaterial({
    map: texture,
    color: '#f5edd4',
    roughness: 0.48,
    metalness: 0.02,
  });
}

function createFaceTexture(face) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 340;
  const context = canvas.getContext('2d');
  const accent = faceAccent(face);

  context.fillStyle = '#f5edd4';
  roundRect(context, 8, 8, 240, 324, 26);
  context.fill();

  context.strokeStyle = '#b99d65';
  context.lineWidth = 8;
  roundRect(context, 18, 18, 220, 304, 22);
  context.stroke();

  context.fillStyle = accent;
  context.font = '900 76px Georgia, serif';
  context.textAlign = 'center';
  context.fillText(shortFace(face), 128, 156);

  context.font = '700 28px Georgia, serif';
  context.fillStyle = '#2b2d25';
  wrapText(context, displayFace(face), 128, 218, 182, 32);

  context.fillStyle = accent;
  context.beginPath();
  context.arc(128, 286, 16, 0, Math.PI * 2);
  context.fill();

  return new THREE.CanvasTexture(canvas);
}

function tileToWorld(tile) {
  const x = tile.x * (TILE_WIDTH + GAP);
  const y = tile.z * LAYER_RISE + TILE_DEPTH / 2;
  const z = tile.y * (TILE_HEIGHT + GAP);
  return new THREE.Vector3(x, y, z);
}

function faceAccent(face) {
  if (face.startsWith('B')) {
    return '#0f8b62';
  }

  if (face.startsWith('C')) {
    return '#b58228';
  }

  if (face.startsWith('D') || face === 'RED') {
    return '#c24136';
  }

  if (face === 'GREEN' || face.startsWith('F')) {
    return '#238258';
  }

  if (face.startsWith('S')) {
    return '#4b62b7';
  }

  return '#223047';
}

function shortFace(face) {
  if (face.startsWith('B') || face.startsWith('C') || face.startsWith('D')) {
    return face.slice(1);
  }

  if (face.startsWith('F')) {
    return '花';
  }

  if (face.startsWith('S') && face.length === 2) {
    return '季';
  }

  return face.slice(0, 2);
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
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

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function disposeMesh(mesh) {
  mesh.geometry.dispose();
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

  for (const material of materials) {
    material.map?.dispose();
    material.dispose();
  }
}
