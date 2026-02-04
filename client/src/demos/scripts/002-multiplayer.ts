// Demo #002 - Multiplayer Sync
// Shows other players joining, moving, and disconnecting

import { DemoScript } from '../types.js';

export const multiplayerDemo: DemoScript = {
  name: 'multiplayer',
  description: 'Real-time multiplayer - players join, move, and disconnect',
  actions: [
    // Header intro
    {
      type: 'wait',
      params: {},
      duration: 1000,
      header: 'Real-Time Multiplayer'
    },

    // Player 2 joins
    {
      type: 'spawn_player',
      params: { id: 100, x: 4, z: 0, name: 'Player 2' },
      duration: 800,
      caption: '👤 Player 2 joins'
    },
    {
      type: 'move_other',
      params: { id: 100, x: 4, z: 3 },
      duration: 1500,
      caption: '👤 Player 2 moves'
    },

    // Player 3 joins
    {
      type: 'spawn_player',
      params: { id: 101, x: -3, z: 0, name: 'Player 3' },
      duration: 800,
      caption: '👤 Player 3 joins'
    },
    {
      type: 'move_other',
      params: { id: 101, x: -2, z: 2 },
      duration: 1200,
      caption: '👤 Player 3 moves'
    },

    // You move toward them
    {
      type: 'move',
      params: { x: 1, z: 2 },
      caption: '🎮 You approach'
    },

    // Camera pan to see everyone
    {
      type: 'camera_rotate',
      params: { angle: 45 },
      duration: 600,
      header: 'Synchronized Movement',
      caption: '📷 Rotate camera'
    },
    {
      type: 'wait',
      params: {},
      duration: 800
    },

    // Players leave
    {
      type: 'remove_player',
      params: { id: 100 },
      duration: 600,
      header: 'Connection Handling',
      caption: '👋 Player 2 disconnects'
    },
    {
      type: 'wait',
      params: {},
      duration: 600
    },
    {
      type: 'remove_player',
      params: { id: 101 },
      duration: 600,
      caption: '👋 Player 3 disconnects'
    },

    // Reset camera
    {
      type: 'camera_rotate',
      params: { angle: 0 },
      duration: 500,
      header: ''
    },
    {
      type: 'wait',
      params: {},
      duration: 300
    }
  ]
};
