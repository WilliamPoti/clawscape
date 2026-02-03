// Demo #001 - Movement System
// Shows all 8 directions of movement + walking vs running
// NOTE: Rocks at (3,3), (4,3), (3,4) - demo path avoids these

import { DemoScript } from '../types.js';

export const movementDemo: DemoScript = {
  name: 'movement',
  description: 'Player movement in all 8 directions, walking and running',
  actions: [
    // Start with header
    {
      type: 'wait',
      params: {},
      duration: 1000,
      header: '8-Directional Movement'
    },

    // Cardinal directions (walking)
    {
      type: 'move',
      params: { x: 2, z: 0 },
      caption: '→ East'
    },
    {
      type: 'move',
      params: { x: 2, z: 2 },
      caption: '↓ South'
    },
    {
      type: 'move',
      params: { x: 0, z: 2 },
      caption: '← West'
    },
    {
      type: 'move',
      params: { x: 0, z: 0 },
      caption: '↑ North'
    },

    // Diagonal directions (walking)
    {
      type: 'move',
      params: { x: 2, z: 2 },
      caption: '↘ Southeast'
    },
    {
      type: 'move',
      params: { x: 0, z: 4 },
      caption: '↙ Southwest'
    },
    {
      type: 'move',
      params: { x: -2, z: 2 },
      caption: '↖ Northwest'
    },
    {
      type: 'move',
      params: { x: 0, z: 0 },
      caption: '↗ Northeast'
    },

    // Running demonstration - new header
    {
      type: 'wait',
      params: {},
      duration: 500,
      header: 'Movement Speed',
      caption: '🚶 Walking'
    },
    {
      type: 'move',
      params: { x: 5, z: 0 },
      caption: '🚶 Walking'
    },
    {
      type: 'move',
      params: { x: 0, z: 0 },
      caption: '🚶 Walking'
    },

    {
      type: 'set_running',
      params: { running: true },
      duration: 500,
      caption: '🏃 Running (Shift)'
    },
    {
      type: 'move',
      params: { x: 5, z: 0 },
      caption: '🏃 Running (Shift)'
    },
    {
      type: 'move',
      params: { x: 0, z: 0 },
      caption: '🏃 Running (Shift)'
    },

    // End - clear header
    {
      type: 'set_running',
      params: { running: false },
      duration: 100,
      header: ''
    },
    {
      type: 'wait',
      params: {},
      duration: 300
    }
  ]
};
