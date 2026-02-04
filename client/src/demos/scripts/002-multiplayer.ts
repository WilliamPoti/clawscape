// Demo #003 - Multiplayer Sync
// Shows other players joining and moving

import { DemoScript } from '../types.js';

export const multiplayerDemo: DemoScript = {
  name: 'multiplayer',
  description: 'Multiplayer - other players visible',
  actions: [
    {
      type: 'wait',
      params: {},
      duration: 1000,
      caption: 'Multiplayer sync'
    },
    {
      type: 'spawn_player',
      params: { id: 100, x: 5, z: 0, name: 'Player 2' },
      duration: 500,
      caption: 'Another player joins'
    },
    {
      type: 'move_other',
      params: { id: 100, x: 5, z: 4 },
      duration: 2000,
      caption: 'Player 2 moves'
    },
    {
      type: 'spawn_player',
      params: { id: 101, x: -3, z: 0, name: 'Player 3' },
      duration: 500,
      caption: 'Player 3 joins'
    },
    {
      type: 'move',
      params: { x: 2, z: 3 },
      caption: 'You walk toward them'
    },
    {
      type: 'move_other',
      params: { id: 101, x: 0, z: 3 },
      duration: 2000,
      caption: 'Player 3 approaches'
    },
    {
      type: 'camera_rotate',
      params: { angle: 90 },
      duration: 600,
      caption: 'Rotate to see everyone'
    },
    {
      type: 'wait',
      params: {},
      duration: 1000
    },
    {
      type: 'remove_player',
      params: { id: 100 },
      duration: 500,
      caption: 'Player 2 disconnects'
    },
    {
      type: 'wait',
      params: {},
      duration: 500
    },
    {
      type: 'remove_player',
      params: { id: 101 },
      duration: 300
    },
    {
      type: 'camera_rotate',
      params: { angle: 0 },
      duration: 600
    }
  ]
};
