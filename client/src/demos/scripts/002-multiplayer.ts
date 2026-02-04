// Demo #002 - Multiplayer Sync
// Shows other players joining, moving, and disconnecting
// NOTE: Keep all action within x: -2 to +2 range for 9:16 Shorts visibility

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

    // Player 2 joins - spawn close to center
    {
      type: 'spawn_player',
      params: { id: 100, x: 1, z: -1, name: 'Player 2' },
      duration: 800,
      caption: '👤 Player 2 joins'
    },
    {
      type: 'move_other',
      params: { id: 100, x: 2, z: 2 },
      duration: 1500,
      caption: '👤 Player 2 moves'
    },

    // Player 3 joins - also close to center
    {
      type: 'spawn_player',
      params: { id: 101, x: -1, z: -1, name: 'Player 3' },
      duration: 800,
      caption: '👤 Player 3 joins'
    },
    {
      type: 'move_other',
      params: { id: 101, x: -1, z: 2 },
      duration: 1200,
      caption: '👤 Player 3 moves'
    },

    // You move toward them
    {
      type: 'move',
      params: { x: 0, z: 2 },
      header: 'Synchronized Movement',
      caption: '🎮 You approach'
    },

    // Brief pause to show all 3 together
    {
      type: 'wait',
      params: {},
      duration: 1000
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

    // End
    {
      type: 'wait',
      params: {},
      duration: 300,
      header: ''
    }
  ]
};
