// Demo map for testing - a small area with obstacles

import {
  Chunk,
  CHUNK_SIZE,
  Tile,
  TileTexture,
  TILE_BLOCKED,
  TILE_WATER,
  createTile,
  createChunk,
} from './map.js';

// Create a demo chunk with some features
export function createDemoChunk(chunkX: number, chunkY: number): Chunk {
  const chunk = createChunk(chunkX, chunkY);

  // Only add features to the center chunk (0, 0)
  if (chunkX === 0 && chunkY === 0) {
    // Add a small pond (water, blocked)
    for (let y = 10; y < 14; y++) {
      for (let x = 10; x < 14; x++) {
        chunk.tiles[y][x] = createTile(TileTexture.WATER, -10, TILE_BLOCKED | TILE_WATER);
      }
    }

    // Add some rocks (blocked)
    const rocks = [[3, 3], [4, 3], [3, 4], [7, 12], [8, 12], [12, 5]];
    for (const [x, y] of rocks) {
      chunk.tiles[y][x] = createTile(TileTexture.STONE, 20, TILE_BLOCKED);
    }

    // Add a dirt path
    for (let x = 0; x < CHUNK_SIZE; x++) {
      chunk.tiles[8][x] = createTile(TileTexture.DIRT, 0, 0);
    }
    for (let y = 0; y < CHUNK_SIZE; y++) {
      chunk.tiles[y][8] = createTile(TileTexture.DIRT, 0, 0);
    }

    // Add some sand near water
    for (let y = 9; y < 15; y++) {
      for (let x = 9; x < 15; x++) {
        if (chunk.tiles[y][x].texture === TileTexture.GRASS_LIGHT ||
            chunk.tiles[y][x].texture === TileTexture.GRASS_DARK) {
          // Only replace grass tiles at the edge of water
          const nearWater = (
            (y >= 10 && y < 14 && x >= 10 && x < 14) === false &&
            (y >= 9 && y <= 14 && x >= 9 && x <= 14)
          );
          if (nearWater) {
            chunk.tiles[y][x] = createTile(TileTexture.SAND, 0, 0);
          }
        }
      }
    }
  }

  return chunk;
}

// World map - stores all loaded chunks
export class WorldMap {
  private chunks: Map<string, Chunk> = new Map();

  private getChunkKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  getChunk(chunkX: number, chunkY: number): Chunk {
    const key = this.getChunkKey(chunkX, chunkY);
    let chunk = this.chunks.get(key);

    if (!chunk) {
      // Generate chunk on demand
      chunk = createDemoChunk(chunkX, chunkY);
      this.chunks.set(key, chunk);
    }

    return chunk;
  }

  getTile(tileX: number, tileY: number): Tile | undefined {
    const chunkX = Math.floor(tileX / CHUNK_SIZE);
    const chunkY = Math.floor(tileY / CHUNK_SIZE);
    const localX = ((tileX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((tileY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk = this.getChunk(chunkX, chunkY);
    return chunk.tiles[localY]?.[localX];
  }

  isWalkable(tileX: number, tileY: number): boolean {
    const tile = this.getTile(tileX, tileY);
    if (!tile) return false;
    return (tile.flags & TILE_BLOCKED) === 0;
  }
}
