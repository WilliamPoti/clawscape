// ClawScape Asset Format Definitions
// These define the data formats for all game assets.
// Dev format: JSON files. Prod: binary packed versions of the same data.

// ==============================
// Map Format
// ==============================

/** Height at each corner of a tile (SW, SE, NE, NW) */
export interface TileHeights {
  sw: number;
  se: number;
  ne: number;
  nw: number;
}

/**
 * A single tile in the map grid.
 * Tiles are the fundamental unit of the world — 128 world units per tile.
 */
export interface MapTile {
  /** Height at each corner (world units). Used for terrain slopes. */
  heights: TileHeights;

  /** Underlay floor type ID (base ground: grass, dirt, etc). 0 = none/void. */
  underlayId: number;

  /** Overlay floor type ID (path, road, special ground). 0 = none. */
  overlayId: number;

  /**
   * Overlay shape (how the overlay blends with underlay).
   * 0 = full tile, 1-12 = RS-style diagonal/corner shapes.
   */
  overlayShape: number;

  /** Overlay rotation (0-3, 90-degree increments). */
  overlayRotation: number;

  /** Tile flags bitfield. */
  flags: number;
}

/** Tile flag constants */
export const TileFlags = {
  NONE: 0,
  BLOCKED: 1 << 0,       // Can't walk here
  WATER: 1 << 1,          // Water tile
  BRIDGE: 1 << 2,         // Walkable over lower level
  WALL_N: 1 << 3,         // Wall on north edge
  WALL_E: 1 << 4,         // Wall on east edge
  WALL_S: 1 << 5,         // Wall on south edge
  WALL_W: 1 << 6,         // Wall on west edge
  FORCE_LOWEST: 1 << 7,   // Render on level 0 even if on higher level
  NO_SHADOW: 1 << 8,      // Don't cast shadows
} as const;

/**
 * A location (object) placed on the map.
 * Locs are things like trees, walls, doors, rocks, furniture.
 */
export interface MapLoc {
  /** Loc type ID (references LocType config). */
  id: number;

  /** Tile X within the map square. */
  x: number;

  /** Tile Y within the map square. */
  y: number;

  /** Height level (0 = ground, 1 = first floor, etc). */
  level: number;

  /** Placement type: 0-3=wall, 4-8=wall decoration, 9=diagonal wall,
   *  10-11=obj, 12-21=roof, 22=ground decoration. */
  type: number;

  /** Rotation (0-3, 90-degree increments). */
  rotation: number;
}

/**
 * An NPC spawn point on the map.
 */
export interface MapNpcSpawn {
  /** NPC type ID. */
  id: number;

  /** Tile X. */
  x: number;

  /** Tile Y. */
  y: number;

  /** Height level. */
  level: number;

  /** Patrol waypoints (optional). */
  patrol?: Array<{ x: number; y: number }>;

  /** Respawn time in ticks (0 = no respawn). */
  respawnTicks: number;
}

/**
 * A map square — 64x64 tiles, up to 4 levels high.
 * This is the fundamental map file unit.
 */
export interface MapSquare {
  /** Map square X coordinate (world grid). */
  regionX: number;

  /** Map square Y coordinate (world grid). */
  regionY: number;

  /** Format version for future compatibility. */
  version: number;

  /**
   * Tile data: tiles[level][y][x]
   * level: 0-3 (ground to 3rd floor)
   * y: 0-63 (south to north)
   * x: 0-63 (west to east)
   */
  tiles: MapTile[][][];

  /** Object placements. */
  locs: MapLoc[];

  /** NPC spawn points. */
  npcSpawns: MapNpcSpawn[];
}

// ==============================
// Config Types (Floor, Loc, Item, NPC)
// ==============================

/**
 * Underlay floor type — the base ground texture.
 */
export interface UnderlayConfig {
  id: number;
  name: string;

  /** Base color (hex, e.g. "#4A7A3A"). Used for vertex coloring. */
  color: string;

  /** Texture file path (optional). If set, texture is blended with vertex color. */
  texture?: string;

  /** How much the texture blends vs vertex color (0-1). */
  textureBlend?: number;
}

/**
 * Overlay floor type — paths, roads, special ground.
 */
export interface OverlayConfig {
  id: number;
  name: string;

  /** Primary color (hex). */
  color: string;

  /** Secondary color for blending (hex, optional). */
  secondaryColor?: string;

  /** Texture file path (optional). */
  texture?: string;

  /** Whether this overlay hides the underlay completely. */
  hideUnderlay?: boolean;
}

/**
 * Location (object) type — defines a placeable world object.
 */
export interface LocConfig {
  id: number;
  name: string;

  /** glTF model file path. */
  model?: string;

  /** Size in tiles (width x height). Default: 1x1. */
  sizeX?: number;
  sizeY?: number;

  /** Whether this object blocks movement. */
  blocksMovement?: boolean;

  /** Whether this object blocks projectiles. */
  blocksProjectiles?: boolean;

  /** Interaction type (e.g. "chop", "mine", "open", "examine"). */
  interaction?: string[];

  /** Animation to play (idle loop). */
  animation?: string;
}

/**
 * Item type — defines an item that can exist in inventory/world.
 */
export interface ItemConfig {
  id: number;
  name: string;

  /** Description shown on examine. */
  examine: string;

  /** Inventory icon path. */
  icon: string;

  /** 3D model when dropped on ground (glTF). */
  groundModel?: string;

  /** Whether this item is stackable. */
  stackable?: boolean;

  /** Whether this item is tradeable (false for POWER items per SOUL.md). */
  tradeable?: boolean;

  /** Equipment slot (if equippable). */
  equipSlot?: 'head' | 'body' | 'legs' | 'feet' | 'hands' | 'weapon' | 'shield' | 'cape' | 'ring' | 'neck' | 'ammo';

  /** Combat stats (if equipment). */
  stats?: {
    attackBonus?: number;
    strengthBonus?: number;
    defenceBonus?: number;
    rangedBonus?: number;
    magicBonus?: number;
    prayerBonus?: number;
  };
}

/**
 * NPC type — defines an NPC's appearance and behavior.
 */
export interface NpcConfig {
  id: number;
  name: string;

  /** Examine text. */
  examine: string;

  /** 3D model (glTF). */
  model: string;

  /** Combat level (0 = non-combat). */
  combatLevel: number;

  /** Hitpoints. */
  hitpoints: number;

  /** Attack, strength, defence stats. */
  stats?: {
    attack: number;
    strength: number;
    defence: number;
    ranged: number;
    magic: number;
  };

  /** Max hit. */
  maxHit?: number;

  /** Attack speed in ticks. */
  attackSpeed?: number;

  /** Interactions available. */
  interaction?: string[];

  /** Wander radius (tiles, 0 = stationary). */
  wanderRadius?: number;

  /** Whether this NPC is aggressive. */
  aggressive?: boolean;

  /** Aggression radius (tiles). */
  aggroRadius?: number;
}

// ==============================
// Environment Config
// ==============================

/**
 * Environment/atmosphere preset — defines lighting and mood for an area.
 */
export interface EnvironmentConfig {
  id: string;
  name: string;

  /** Sun direction (normalized x,y,z). */
  sunDirection: [number, number, number];

  /** Sun color (hex). */
  sunColor: string;

  /** Sun intensity (0-2). */
  sunIntensity: number;

  /** Ambient light color (hex). */
  ambientColor: string;

  /** Ambient light intensity (0-1). */
  ambientIntensity: number;

  /** Fog color (hex). */
  fogColor: string;

  /** Fog density (0-1, exponential). */
  fogDensity: number;

  /** Sky color (hex) or skybox texture path. */
  sky: string;

  /** Shadow map resolution. */
  shadowResolution?: number;

  /** Shadow distance (world units). */
  shadowDistance?: number;
}

// ==============================
// Helpers
// ==============================

/** Create an empty tile with default values */
export function createEmptyTile(): MapTile {
  return {
    heights: { sw: 0, se: 0, ne: 0, nw: 0 },
    underlayId: 0,
    overlayId: 0,
    overlayShape: 0,
    overlayRotation: 0,
    flags: 0,
  };
}

/** Create an empty map square */
export function createEmptyMapSquare(regionX: number, regionY: number): MapSquare {
  const tiles: MapTile[][][] = [];
  for (let level = 0; level < 4; level++) {
    tiles[level] = [];
    for (let y = 0; y < 64; y++) {
      tiles[level][y] = [];
      for (let x = 0; x < 64; x++) {
        tiles[level][y][x] = createEmptyTile();
      }
    }
  }

  return {
    regionX,
    regionY,
    version: 1,
    tiles,
    locs: [],
    npcSpawns: [],
  };
}
