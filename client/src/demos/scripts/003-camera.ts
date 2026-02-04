// Demo #003 - Camera Controls
// Shows camera rotation and zoom

import { DemoScript } from '../types.js';

export const cameraDemo: DemoScript = {
  name: 'camera',
  description: 'Camera rotation and zoom controls',
  actions: [
    // Header intro
    {
      type: 'wait',
      params: {},
      duration: 1000,
      header: 'Camera Rotation'
    },

    // Rotation demo
    {
      type: 'camera_rotate',
      params: { angle: 90 },
      duration: 700,
      caption: '⟲ Q key - rotate left'
    },
    {
      type: 'wait',
      params: {},
      duration: 400
    },
    {
      type: 'camera_rotate',
      params: { angle: 180 },
      duration: 700,
      caption: '⟲ Q key - rotate left'
    },
    {
      type: 'wait',
      params: {},
      duration: 400
    },
    {
      type: 'camera_rotate',
      params: { angle: 270 },
      duration: 700,
      caption: '⟳ E key - rotate right'
    },
    {
      type: 'wait',
      params: {},
      duration: 400
    },
    {
      type: 'camera_rotate',
      params: { angle: 360 },
      duration: 700,
      caption: '⟳ E key - rotate right'
    },
    {
      type: 'wait',
      params: {},
      duration: 300
    },

    // Zoom demo
    {
      type: 'camera_zoom',
      params: { zoom: 500 },
      duration: 800,
      header: 'Camera Zoom',
      caption: '🔍 Scroll up - zoom in'
    },
    {
      type: 'wait',
      params: {},
      duration: 500
    },
    {
      type: 'camera_zoom',
      params: { zoom: 1200 },
      duration: 800,
      caption: '🔍 Scroll down - zoom out'
    },
    {
      type: 'wait',
      params: {},
      duration: 500
    },
    {
      type: 'camera_zoom',
      params: { zoom: 800 },
      duration: 600,
      caption: '🔍 Default view'
    },

    // Reset
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
