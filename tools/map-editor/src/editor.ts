// ClawScape Map Editor
// Web-based tool for creating and editing map squares.

import * as THREE from 'three';
import {
  MapSquare,
  MapTile,
  MapLoc,
  MapNpcSpawn,
  UnderlayConfig,
  OverlayConfig,
  LocConfig,
  TileFlags,
  createEmptyMapSquare,
  createEmptyTile,
} from '@clawscape/shared';

// ==============================
// State
// ==============================

type Tool = 'height' | 'underlay' | 'overlay' | 'objects' | 'npcs';
let currentTool: Tool = 'height';
let mapSquare: MapSquare = createEmptyMapSquare(50, 50);
let underlays: UnderlayConfig[] = [];
let overlays: OverlayConfig[] = [];
let locConfigs: LocConfig[] = [];

// Three.js
let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let renderer: THREE.WebGLRenderer;
let terrainMesh: THREE.Mesh | null = null;
let gridHelper: THREE.GridHelper;
let hoverMarker: THREE.Mesh;
let objectMarkers: THREE.Object3D[] = [];

// Input
let isMouseDown = false;
let mouseButton = 0;
let hoveredTile = { x: 0, y: 0 };
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const TILE_SIZE = 128;
const MAP_SIZE = 64;

// ==============================
// Initialization
// ==============================

async function init(): Promise<void> {
  const canvas = document.getElementById('editor-canvas') as HTMLCanvasElement;
  const viewport = document.getElementById('viewport')!;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // Orthographic camera (top-down)
  const aspect = viewport.clientWidth / viewport.clientHeight;
  const viewSize = MAP_SIZE * TILE_SIZE;
  camera = new THREE.OrthographicCamera(
    -viewSize / 2 * aspect, viewSize / 2 * aspect,
    viewSize / 2, -viewSize / 2,
    1, 20000
  );
  camera.position.set(viewSize / 2, 5000, viewSize / 2);
  camera.lookAt(viewSize / 2, 0, viewSize / 2);

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(-500, 1000, -300);
  scene.add(sun);

  // Grid
  gridHelper = new THREE.GridHelper(viewSize, MAP_SIZE, 0x333366, 0x222244);
  gridHelper.position.set(viewSize / 2, 0.5, viewSize / 2);
  scene.add(gridHelper);

  // Hover marker
  const markerGeo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0xffff00, transparent: true, opacity: 0.3, side: THREE.DoubleSide
  });
  hoverMarker = new THREE.Mesh(markerGeo, markerMat);
  hoverMarker.rotation.x = -Math.PI / 2;
  hoverMarker.position.y = 1;
  scene.add(hoverMarker);

  // Load configs
  await loadConfigs();

  // Fill default underlay (grass)
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      mapSquare.tiles[0][y][x].underlayId = ((x + y) % 2 === 0) ? 1 : 2;
    }
  }

  // Build initial terrain
  rebuildTerrain();

  // Populate sidebar selects
  populateSelects();

  // Events
  setupEvents(canvas, viewport);

  // Start render loop
  animate();
}

// ==============================
// Config Loading
// ==============================

async function loadConfigs(): Promise<void> {
  try {
    const [uResp, oResp, lResp] = await Promise.all([
      fetch('/configs/underlays.json'),
      fetch('/configs/overlays.json'),
      fetch('/configs/locs.json'),
    ]);
    underlays = await uResp.json();
    overlays = await oResp.json();
    locConfigs = await lResp.json();
  } catch {
    console.warn('Could not load configs, using defaults');
    underlays = [
      { id: 1, name: 'Grass Light', color: '#4A8A3A' },
      { id: 2, name: 'Grass Dark', color: '#3A7A2A' },
      { id: 3, name: 'Dirt', color: '#8A7050' },
    ];
    overlays = [
      { id: 1, name: 'Stone Path', color: '#888888' },
      { id: 4, name: 'Water', color: '#2060A0' },
    ];
    locConfigs = [
      { id: 1, name: 'Tree' },
      { id: 3, name: 'Rock' },
    ];
  }
}

function populateSelects(): void {
  const ulSelect = document.getElementById('underlay-select') as HTMLSelectElement;
  ulSelect.innerHTML = '<option value="0">None</option>';
  for (const u of underlays) {
    ulSelect.innerHTML += `<option value="${u.id}"><span class="color-swatch" style="background:${u.color}"></span>${u.name}</option>`;
  }

  const olSelect = document.getElementById('overlay-select') as HTMLSelectElement;
  olSelect.innerHTML = '<option value="0">None (Erase)</option>';
  for (const o of overlays) {
    olSelect.innerHTML += `<option value="${o.id}">${o.name}</option>`;
  }

  const objSelect = document.getElementById('object-select') as HTMLSelectElement;
  objSelect.innerHTML = '';
  for (const l of locConfigs) {
    objSelect.innerHTML += `<option value="${l.id}">${l.name}</option>`;
  }
}

// ==============================
// Terrain Rebuild
// ==============================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: ((n >> 16) & 0xFF) / 255, g: ((n >> 8) & 0xFF) / 255, b: (n & 0xFF) / 255 };
}

function rebuildTerrain(): void {
  if (terrainMesh) {
    scene.remove(terrainMesh);
    terrainMesh.geometry.dispose();
  }

  const tiles = mapSquare.tiles[0];
  const ulMap = new Map(underlays.map(u => [u.id, hexToRgb(u.color)]));
  const olMap = new Map(overlays.map(o => [o.id, hexToRgb(o.color)]));
  const defaultColor = { r: 0.2, g: 0.2, b: 0.2 };

  // Simple quad-per-tile approach for editor (fast rebuild)
  const totalTiles = MAP_SIZE * MAP_SIZE;
  const positions = new Float32Array(totalTiles * 6 * 3); // 2 tris per tile, 3 verts, xyz
  const colors = new Float32Array(totalTiles * 6 * 3);
  let idx = 0;

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const tile = tiles[y][x];
      const { heights } = tile;

      const px = x * TILE_SIZE;
      const pz = y * TILE_SIZE;

      // Determine color
      let color: { r: number; g: number; b: number };
      if (tile.overlayId > 0) {
        color = olMap.get(tile.overlayId) ?? defaultColor;
      } else {
        color = ulMap.get(tile.underlayId) ?? defaultColor;
      }

      // Tri 1: SW, SE, NE
      positions[idx] = px; positions[idx + 1] = heights.sw; positions[idx + 2] = pz;
      positions[idx + 3] = px + TILE_SIZE; positions[idx + 4] = heights.se; positions[idx + 5] = pz;
      positions[idx + 6] = px + TILE_SIZE; positions[idx + 7] = heights.ne; positions[idx + 8] = pz + TILE_SIZE;
      // Tri 2: SW, NE, NW
      positions[idx + 9] = px; positions[idx + 10] = heights.sw; positions[idx + 11] = pz;
      positions[idx + 12] = px + TILE_SIZE; positions[idx + 13] = heights.ne; positions[idx + 14] = pz + TILE_SIZE;
      positions[idx + 15] = px; positions[idx + 16] = heights.nw; positions[idx + 17] = pz + TILE_SIZE;

      for (let v = 0; v < 18; v += 3) {
        colors[idx + v] = color.r;
        colors[idx + v + 1] = color.g;
        colors[idx + v + 2] = color.b;
      }
      idx += 18;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  terrainMesh = new THREE.Mesh(geometry, material);
  scene.add(terrainMesh);

  // Rebuild object markers
  rebuildObjectMarkers();
}

function rebuildObjectMarkers(): void {
  for (const m of objectMarkers) scene.remove(m);
  objectMarkers = [];

  for (const loc of mapSquare.locs) {
    const config = locConfigs.find(c => c.id === loc.id);
    const geo = new THREE.BoxGeometry(TILE_SIZE * 0.6, 60, TILE_SIZE * 0.6);
    const mat = new THREE.MeshStandardMaterial({
      color: config?.name.includes('Tree') ? 0x2A8A1A : 0x808080,
      transparent: true, opacity: 0.7,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const h = mapSquare.tiles[0][loc.y]?.[loc.x]?.heights;
    const avgH = h ? (h.sw + h.se + h.ne + h.nw) / 4 : 0;
    mesh.position.set(loc.x * TILE_SIZE + TILE_SIZE / 2, avgH + 30, loc.y * TILE_SIZE + TILE_SIZE / 2);
    scene.add(mesh);
    objectMarkers.push(mesh);
  }

  // NPC spawn markers
  for (const npc of mapSquare.npcSpawns) {
    const geo = new THREE.CylinderGeometry(TILE_SIZE * 0.2, TILE_SIZE * 0.2, 80, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xFF4444, transparent: true, opacity: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    const h = mapSquare.tiles[0][npc.y]?.[npc.x]?.heights;
    const avgH = h ? (h.sw + h.se + h.ne + h.nw) / 4 : 0;
    mesh.position.set(npc.x * TILE_SIZE + TILE_SIZE / 2, avgH + 40, npc.y * TILE_SIZE + TILE_SIZE / 2);
    scene.add(mesh);
    objectMarkers.push(mesh);
  }
}

// ==============================
// Tool Application
// ==============================

function applyTool(tx: number, ty: number): void {
  if (tx < 0 || tx >= MAP_SIZE || ty < 0 || ty >= MAP_SIZE) return;

  const tile = mapSquare.tiles[0][ty][tx];

  switch (currentTool) {
    case 'height': {
      const mode = (document.getElementById('height-mode') as HTMLSelectElement).value;
      const delta = parseInt((document.getElementById('height-delta') as HTMLInputElement).value);
      const brushSize = parseInt((document.getElementById('height-brush-size') as HTMLInputElement).value);

      for (let dy = -brushSize + 1; dy < brushSize; dy++) {
        for (let dx = -brushSize + 1; dx < brushSize; dx++) {
          const nx = tx + dx;
          const ny = ty + dy;
          if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) continue;
          const t = mapSquare.tiles[0][ny][nx];
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= brushSize) continue;
          const factor = 1 - dist / brushSize;
          const d = Math.round(delta * factor);

          if (mode === 'raise') {
            t.heights.sw += d; t.heights.se += d; t.heights.ne += d; t.heights.nw += d;
          } else if (mode === 'lower') {
            t.heights.sw -= d; t.heights.se -= d; t.heights.ne -= d; t.heights.nw -= d;
          } else if (mode === 'flatten') {
            const avg = (t.heights.sw + t.heights.se + t.heights.ne + t.heights.nw) / 4;
            t.heights.sw = avg; t.heights.se = avg; t.heights.ne = avg; t.heights.nw = avg;
          } else if (mode === 'smooth') {
            // Average with neighbors
            const neighbors: number[] = [];
            for (let sy = -1; sy <= 1; sy++) {
              for (let sx = -1; sx <= 1; sx++) {
                const snx = nx + sx, sny = ny + sy;
                if (snx >= 0 && snx < MAP_SIZE && sny >= 0 && sny < MAP_SIZE) {
                  const nt = mapSquare.tiles[0][sny][snx];
                  neighbors.push((nt.heights.sw + nt.heights.se + nt.heights.ne + nt.heights.nw) / 4);
                }
              }
            }
            const smoothed = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
            const blendFactor = 0.3 * factor;
            t.heights.sw += (smoothed - t.heights.sw) * blendFactor;
            t.heights.se += (smoothed - t.heights.se) * blendFactor;
            t.heights.ne += (smoothed - t.heights.ne) * blendFactor;
            t.heights.nw += (smoothed - t.heights.nw) * blendFactor;
          }
        }
      }
      break;
    }
    case 'underlay': {
      const id = parseInt((document.getElementById('underlay-select') as HTMLSelectElement).value);
      tile.underlayId = id;
      break;
    }
    case 'overlay': {
      const id = parseInt((document.getElementById('overlay-select') as HTMLSelectElement).value);
      const shape = parseInt((document.getElementById('overlay-shape') as HTMLSelectElement).value);
      const rotation = parseInt((document.getElementById('overlay-rotation') as HTMLSelectElement).value);
      tile.overlayId = id;
      tile.overlayShape = shape;
      tile.overlayRotation = rotation;
      if (id === 4) { // water
        tile.flags |= TileFlags.BLOCKED | TileFlags.WATER;
      } else if (id === 0) {
        tile.flags &= ~(TileFlags.WATER);
      }
      break;
    }
    case 'objects': {
      const id = parseInt((document.getElementById('object-select') as HTMLSelectElement).value);
      const rotation = parseInt((document.getElementById('object-rotation') as HTMLSelectElement).value);
      // Remove existing loc at this position
      mapSquare.locs = mapSquare.locs.filter(l => !(l.x === tx && l.y === ty && l.level === 0));
      mapSquare.locs.push({ id, x: tx, y: ty, level: 0, type: 10, rotation });
      break;
    }
    case 'npcs': {
      const npcId = parseInt((document.getElementById('npc-id') as HTMLInputElement).value);
      const respawn = parseInt((document.getElementById('npc-respawn') as HTMLInputElement).value);
      // Remove existing spawn at this position
      mapSquare.npcSpawns = mapSquare.npcSpawns.filter(n => !(n.x === tx && n.y === ty && n.level === 0));
      mapSquare.npcSpawns.push({ id: npcId, x: tx, y: ty, level: 0, respawnTicks: respawn });
      break;
    }
  }

  rebuildTerrain();
}

// ==============================
// Events
// ==============================

function setupEvents(canvas: HTMLCanvasElement, viewport: HTMLElement): void {
  // Tool buttons
  const tools: Tool[] = ['height', 'underlay', 'overlay', 'objects', 'npcs'];
  const panels = ['panel-height', 'panel-underlay', 'panel-overlay', 'panel-objects', 'panel-npcs'];

  for (let i = 0; i < tools.length; i++) {
    const btn = document.getElementById(`btn-${tools[i]}`);
    btn?.addEventListener('click', () => {
      currentTool = tools[i];
      document.querySelectorAll('#toolbar button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      panels.forEach((p, j) => {
        const el = document.getElementById(p);
        if (el) el.style.display = j === i ? 'block' : 'none';
      });
    });
  }

  // Save
  document.getElementById('btn-save')?.addEventListener('click', () => {
    const json = JSON.stringify(mapSquare);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mapSquare.regionX}-${mapSquare.regionY}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Load
  document.getElementById('btn-load')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      mapSquare = JSON.parse(text);
      rebuildTerrain();
    };
    input.click();
  });

  // Mouse events
  canvas.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    mouseButton = e.button;
    if (mouseButton === 0) applyTool(hoveredTile.x, hoveredTile.y);
  });

  canvas.addEventListener('mouseup', () => { isMouseDown = false; });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    updateHover();

    if (isMouseDown && mouseButton === 0) {
      applyTool(hoveredTile.x, hoveredTile.y);
    }
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? 1.1 : 0.9;
    camera.zoom = Math.max(0.3, Math.min(10, camera.zoom * (1 / zoomDelta)));
    camera.updateProjectionMatrix();
  }, { passive: false });

  // Pan (middle mouse)
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1 || (e.button === 2)) {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
    }
  });
  canvas.addEventListener('mousemove', (e) => {
    if (isPanning) {
      const dx = (e.clientX - panStart.x) / camera.zoom;
      const dy = (e.clientY - panStart.y) / camera.zoom;
      camera.position.x -= dx;
      camera.position.z -= dy;
      camera.lookAt(camera.position.x, 0, camera.position.z);
      panStart = { x: e.clientX, y: e.clientY };
    }
  });
  canvas.addEventListener('mouseup', () => { isPanning = false; });

  // Resize
  window.addEventListener('resize', () => {
    const w = viewport.clientWidth;
    const h = viewport.clientHeight;
    renderer.setSize(w, h);
    const aspect = w / h;
    const viewSize = MAP_SIZE * TILE_SIZE;
    camera.left = -viewSize / 2 * aspect;
    camera.right = viewSize / 2 * aspect;
    camera.top = viewSize / 2;
    camera.bottom = -viewSize / 2;
    camera.updateProjectionMatrix();
  });
}

function updateHover(): void {
  raycaster.setFromCamera(mouse, camera);

  // Intersect with ground plane
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const target = new THREE.Vector3();
  raycaster.ray.intersectPlane(groundPlane, target);

  if (target) {
    const tx = Math.floor(target.x / TILE_SIZE);
    const tz = Math.floor(target.z / TILE_SIZE);
    hoveredTile = { x: Math.max(0, Math.min(63, tx)), y: Math.max(0, Math.min(63, tz)) };

    hoverMarker.position.set(
      hoveredTile.x * TILE_SIZE + TILE_SIZE / 2,
      1,
      hoveredTile.y * TILE_SIZE + TILE_SIZE / 2
    );

    // Update info bar
    const tile = mapSquare.tiles[0][hoveredTile.y]?.[hoveredTile.x];
    const avgH = tile
      ? Math.round((tile.heights.sw + tile.heights.se + tile.heights.ne + tile.heights.nw) / 4)
      : 0;
    const info = document.getElementById('info-bar')!;
    info.textContent = `Tile: ${hoveredTile.x}, ${hoveredTile.y} | Height: ${avgH} | UL: ${tile?.underlayId ?? 0} | OL: ${tile?.overlayId ?? 0}`;
  }
}

// ==============================
// Render Loop
// ==============================

function animate(): void {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// Copy configs to public dir at build time; in dev, serve from root
// For dev, we'll fetch from assets path
init();
