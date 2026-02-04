// Future Buddy Demo System - Type Definitions

export type DemoActionType =
  | 'move'           // Move player to tile
  | 'camera_rotate'  // Rotate camera to angle
  | 'camera_zoom'    // Zoom camera to level
  | 'wait'           // Pause for duration
  | 'spawn_player'   // Create fake multiplayer player
  | 'move_other'     // Move fake player
  | 'remove_player'  // Remove fake player
  | 'click_blocked'  // Click blocked tile (show red X)
  | 'set_running';   // Toggle running on/off

export interface DemoAction {
  type: DemoActionType;
  params: Record<string, any>;
  duration?: number;  // How long this action takes (ms)
  caption?: string;   // Text to display during this action
  header?: string;    // Persistent header text (stays until changed)
}

export interface DemoScript {
  name: string;        // Used in URL: ?demo=name
  description: string; // Human-readable description
  actions: DemoAction[];
}

// Fake player for offline multiplayer simulation
export interface FakePlayer {
  id: number;
  name: string;
  mesh: any; // THREE.Mesh - using any to avoid import
  targetX: number;
  targetZ: number;
}

// Demo runner state
export type DemoState = 'idle' | 'running' | 'complete';
