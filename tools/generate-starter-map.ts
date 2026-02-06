// Generate a starter map for ClawScape testing
// Run with: npx tsx tools/generate-starter-map.ts

import { writeFileSync } from 'fs';
import type { MapSquare, MapTile } from '../shared/src/formats.js';

function createTile(underlayId: number, heights = { sw: 0, se: 0, ne: 0, nw: 0 }): MapTile {
  return {
    heights,
    underlayId,
    overlayId: 0,
    overlayShape: 0,
    overlayRotation: 0,
    flags: 0,
  };
}

function generateStarterMap(): MapSquare {
  // Initialize 64x64 tile grid (1 level for now)
  const tiles: MapTile[][][] = [];
  for (let level = 0; level < 4; level++) {
    tiles[level] = [];
    for (let y = 0; y < 64; y++) {
      tiles[level][y] = [];
      for (let x = 0; x < 64; x++) {
        if (level === 0) {
          // Base terrain: mix of light and dark grass with gentle height variation
          const underlayId = ((x + y) % 3 === 0) ? 2 : 1; // dark/light grass
          const centerDist = Math.sqrt((x - 32) ** 2 + (y - 32) ** 2);
          const baseHeight = Math.max(0, 20 - centerDist * 0.3); // gentle hill in center
          const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 3;
          const h = Math.round(baseHeight + noise);
          tiles[level][y][x] = createTile(underlayId, { sw: h, se: h, ne: h, nw: h });
        } else {
          tiles[level][y][x] = createTile(0);
        }
      }
    }
  }

  // Dirt paths (cross pattern through center)
  for (let i = 10; i < 54; i++) {
    // Horizontal path at y=32
    tiles[0][32][i].underlayId = 4;
    tiles[0][31][i].underlayId = 4;
    // Vertical path at x=32
    tiles[0][i][32].underlayId = 4;
    tiles[0][i][31].underlayId = 4;
  }

  // Stone path overlay at crossroads (center)
  for (let y = 29; y < 35; y++) {
    for (let x = 29; x < 35; x++) {
      tiles[0][y][x].overlayId = 1; // stone path
      tiles[0][y][x].overlayShape = 0; // full tile
    }
  }

  // Pond (water area)
  for (let y = 40; y < 48; y++) {
    for (let x = 15; x < 23; x++) {
      const tile = tiles[0][y][x];
      tile.overlayId = 4; // water
      tile.overlayShape = 0;
      tile.heights = { sw: -8, se: -8, ne: -8, nw: -8 };
      tile.flags = 0x03; // BLOCKED | WATER
    }
  }

  // Sand around pond
  for (let y = 38; y < 50; y++) {
    for (let x = 13; x < 25; x++) {
      const tile = tiles[0][y][x];
      if (tile.overlayId !== 4) { // not water
        tile.underlayId = 6; // sand
      }
    }
  }

  // Small hill (raised heights NE corner)
  for (let y = 45; y < 55; y++) {
    for (let x = 45; x < 55; x++) {
      const dx = x - 50;
      const dy = y - 50;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hillH = Math.max(0, Math.round(40 - dist * 5));
      const tile = tiles[0][y][x];
      tile.heights = { sw: hillH, se: hillH, ne: hillH, nw: hillH };
      tile.underlayId = 3; // lush grass on the hill
    }
  }

  // Locs: trees, rocks, and town objects
  const locs = [
    // Trees scattered around
    { id: 1, x: 5, y: 5, level: 0, type: 10, rotation: 0 },
    { id: 1, x: 8, y: 12, level: 0, type: 10, rotation: 1 },
    { id: 1, x: 3, y: 20, level: 0, type: 10, rotation: 2 },
    { id: 1, x: 15, y: 8, level: 0, type: 10, rotation: 0 },
    { id: 1, x: 55, y: 10, level: 0, type: 10, rotation: 3 },
    { id: 1, x: 58, y: 15, level: 0, type: 10, rotation: 1 },
    { id: 1, x: 52, y: 20, level: 0, type: 10, rotation: 0 },
    { id: 2, x: 10, y: 55, level: 0, type: 10, rotation: 0 }, // oak tree
    { id: 2, x: 20, y: 58, level: 0, type: 10, rotation: 2 }, // oak tree

    // Rocks near the hill
    { id: 3, x: 42, y: 48, level: 0, type: 10, rotation: 0 },
    { id: 3, x: 44, y: 52, level: 0, type: 10, rotation: 1 },
    { id: 3, x: 56, y: 50, level: 0, type: 10, rotation: 2 },

    // Town objects at crossroads
    { id: 6, x: 28, y: 28, level: 0, type: 10, rotation: 0 },  // sign post
    { id: 7, x: 27, y: 32, level: 0, type: 10, rotation: 0 },  // torch
    { id: 7, x: 35, y: 32, level: 0, type: 10, rotation: 0 },  // torch
    { id: 7, x: 32, y: 27, level: 0, type: 10, rotation: 0 },  // torch
    { id: 7, x: 32, y: 35, level: 0, type: 10, rotation: 0 },  // torch
    { id: 8, x: 30, y: 35, level: 0, type: 10, rotation: 0 },  // crate
    { id: 8, x: 34, y: 35, level: 0, type: 10, rotation: 1 },  // crate
    { id: 9, x: 36, y: 30, level: 0, type: 10, rotation: 0 },  // anvil
    { id: 11, x: 28, y: 34, level: 0, type: 10, rotation: 0 }, // bank booth
  ];

  // NPC spawns
  const npcSpawns = [
    { id: 1, x: 30, y: 30, level: 0, respawnTicks: 0 }, // Guide NPC at crossroads
    { id: 2, x: 36, y: 30, level: 0, respawnTicks: 0 }, // Smithing tutor near anvil
    { id: 3, x: 28, y: 34, level: 0, respawnTicks: 0 }, // Banker
    // Goblins in south-west
    { id: 100, x: 8, y: 8, level: 0, respawnTicks: 10, patrol: [{ x: 8, y: 8 }, { x: 12, y: 8 }, { x: 12, y: 12 }, { x: 8, y: 12 }] },
    { id: 100, x: 10, y: 10, level: 0, respawnTicks: 10 },
    { id: 100, x: 6, y: 14, level: 0, respawnTicks: 10 },
  ];

  return {
    regionX: 50,
    regionY: 50,
    version: 1,
    tiles,
    locs,
    npcSpawns,
  };
}

const map = generateStarterMap();
const json = JSON.stringify(map);
writeFileSync('assets/maps/50-50.json', json);
console.log(`Generated starter map: assets/maps/50-50.json (${(json.length / 1024).toFixed(0)} KB)`);
