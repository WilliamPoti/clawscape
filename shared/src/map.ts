// Future Buddy Map/Tile System

export const CHUNK_SIZE = 16; // 16x16 tiles per chunk
export const TILE_SIZE = 128; // world units per tile

// Tile flags
export const TILE_BLOCKED = 1 << 0;      // Can't walk here
export const TILE_WATER = 1 << 1;        // Water tile
export const TILE_BRIDGE = 1 << 2;       // Bridge (walkable over water)
export const TILE_WALL_NORTH = 1 << 3;   // Wall on north edge
export const TILE_WALL_EAST = 1 << 4;    // Wall on east edge
export const TILE_WALL_SOUTH = 1 << 5;   // Wall on south edge
export const TILE_WALL_WEST = 1 << 6;    // Wall on west edge

// Tile textures
export enum TileTexture {
  GRASS_LIGHT = 0,
  GRASS_DARK = 1,
  DIRT = 2,
  STONE = 3,
  WATER = 4,
  SAND = 5,
  WOOD = 6,
}

// Single tile data
export interface Tile {
  texture: TileTexture;
  height: number;      // Height offset (for hills, etc.)
  flags: number;       // Collision/property flags
}

// A chunk is a 16x16 group of tiles
export interface Chunk {
  x: number;           // Chunk X coordinate
  y: number;           // Chunk Y coordinate
  tiles: Tile[][];     // 16x16 grid of tiles
}

// Create an empty tile
export function createTile(
  texture: TileTexture = TileTexture.GRASS_LIGHT,
  height: number = 0,
  flags: number = 0
): Tile {
  return { texture, height, flags };
}

// Create an empty chunk filled with grass
export function createChunk(chunkX: number, chunkY: number): Chunk {
  const tiles: Tile[][] = [];

  for (let y = 0; y < CHUNK_SIZE; y++) {
    tiles[y] = [];
    for (let x = 0; x < CHUNK_SIZE; x++) {
      // Checkerboard grass pattern using global coordinates
      const globalX = chunkX * CHUNK_SIZE + x;
      const globalY = chunkY * CHUNK_SIZE + y;
      const isLight = (globalX + globalY) % 2 === 0;
      tiles[y][x] = createTile(
        isLight ? TileTexture.GRASS_LIGHT : TileTexture.GRASS_DARK
      );
    }
  }

  return { x: chunkX, y: chunkY, tiles };
}

// Check if a tile is walkable
export function isTileWalkable(tile: Tile | undefined): boolean {
  if (!tile) return false;
  return (tile.flags & TILE_BLOCKED) === 0;
}

// Get tile from world coordinates
export function worldToTile(worldX: number, worldZ: number): { x: number; y: number } {
  return {
    x: Math.floor(worldX / TILE_SIZE),
    y: Math.floor(worldZ / TILE_SIZE)
  };
}

// Get chunk coordinates from tile coordinates
export function tileToChunk(tileX: number, tileY: number): { x: number; y: number } {
  return {
    x: Math.floor(tileX / CHUNK_SIZE),
    y: Math.floor(tileY / CHUNK_SIZE)
  };
}

// Get local tile position within chunk
export function tileToLocal(tileX: number, tileY: number): { x: number; y: number } {
  return {
    x: ((tileX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE,
    y: ((tileY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE
  };
}
