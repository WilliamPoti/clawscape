// ClawScape Shared Types & Constants

// Game constants
export const TICK_RATE = 600; // ms per game tick (RS standard)
export const TILE_SIZE = 128; // world units per tile

// Coordinate system
export interface Position {
  x: number;
  y: number;
  level: number; // floor/height level (0 = ground)
}

// Entity base
export interface Entity {
  id: number;
  position: Position;
}

// Network message types
export type MessageType =
  | 'auth'
  | 'player_move'
  | 'player_update'
  | 'chat'
  | 'ping'
  | 'pong';

export interface NetworkMessage {
  type: MessageType;
  payload: unknown;
  timestamp: number;
}

// Player data
export interface PlayerData extends Entity {
  username: string;
  combatLevel: number;
}

// Movement
export interface MoveRequest {
  target: Position;
}

export interface PlayerUpdate {
  id: number;
  position: Position;
  animation?: string;
}
