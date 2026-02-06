/**
 * Well-known cache index IDs.
 */
export const enum IndexType {
  ANIMATIONS = 0,
  SKELETONS = 1,
  CONFIGS = 2,
  INTERFACES = 3,
  SOUND_EFFECTS = 4,
  MAPS = 5,
  MUSIC = 6,
  MODELS = 7,
  SPRITES = 8,
  TEXTURES = 9,
  BINARY = 10,
  FONTS = 13,
  WORLD_MAP = 16,
  DEFAULTS = 17,
}

/**
 * Well-known config archive IDs within the CONFIGS index.
 */
export const enum ConfigType {
  UNDERLAY = 1,
  IDENTITY_KIT = 3,
  OVERLAY = 4,
  INV = 5,
  LOC = 6,
  ENUM = 8,
  NPC = 9,
  OBJ = 10,
  PARAM = 11,
  SEQ = 12,
  SPOT_ANIM = 13,
  VARBIT = 14,
  VARP = 16,
  VARPLAYER = 16,
  HITSPLAT = 32,
  HEALTHBAR = 33,
  STRUCT = 34,
  AREA = 35,
  BAS = 46,
}
