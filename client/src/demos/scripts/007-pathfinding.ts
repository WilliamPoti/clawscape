// Demo #007 - A* Pathfinding
// Shows pathfinding around obstacles

import { DemoScript } from '../types.js';

export const pathfindingDemo: DemoScript = {
  name: 'pathfinding',
  description: 'A* pathfinding navigation around obstacles',
  actions: [
    {
      type: 'wait',
      params: {},
      duration: 1000,
      caption: 'Pathfinding demo'
    },
    {
      type: 'move',
      params: { x: 2, z: 2 },
      caption: 'Move near the rocks'
    },
    {
      type: 'wait',
      params: {},
      duration: 500
    },
    {
      type: 'move',
      params: { x: 5, z: 5 },
      caption: 'Click behind obstacles'
    },
    {
      type: 'wait',
      params: {},
      duration: 500,
      caption: 'A* finds the path around'
    },
    {
      type: 'click_blocked',
      params: { x: 3, z: 3 },
      duration: 800,
      caption: 'Cannot walk on rocks'
    },
    {
      type: 'wait',
      params: {},
      duration: 500
    },
    {
      type: 'move',
      params: { x: 9, z: 9 },
      caption: 'Navigate to the pond'
    },
    {
      type: 'click_blocked',
      params: { x: 11, z: 11 },
      duration: 800,
      caption: 'Cannot walk on water'
    },
    {
      type: 'move',
      params: { x: 14, z: 10 },
      caption: 'Path around the water'
    },
    {
      type: 'wait',
      params: {},
      duration: 500
    }
  ]
};
