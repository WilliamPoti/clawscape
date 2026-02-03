// Demo #004 - Camera Controls
// Shows camera rotation and zoom

import { DemoScript } from '../types.js';

export const cameraDemo: DemoScript = {
  name: 'camera',
  description: 'Camera rotation and zoom controls',
  actions: [
    {
      type: 'wait',
      params: {},
      duration: 1000,
      caption: 'Camera controls'
    },
    {
      type: 'camera_rotate',
      params: { angle: 90 },
      duration: 600,
      caption: 'Press Q to rotate left'
    },
    {
      type: 'wait',
      params: {},
      duration: 500
    },
    {
      type: 'camera_rotate',
      params: { angle: 180 },
      duration: 600,
      caption: 'Rotate again'
    },
    {
      type: 'wait',
      params: {},
      duration: 500
    },
    {
      type: 'camera_rotate',
      params: { angle: 270 },
      duration: 600,
      caption: 'And again'
    },
    {
      type: 'wait',
      params: {},
      duration: 500
    },
    {
      type: 'camera_rotate',
      params: { angle: 360 },
      duration: 600,
      caption: 'Full rotation'
    },
    {
      type: 'camera_zoom',
      params: { zoom: 500 },
      duration: 600,
      caption: 'Scroll to zoom in'
    },
    {
      type: 'wait',
      params: {},
      duration: 500
    },
    {
      type: 'camera_zoom',
      params: { zoom: 1200 },
      duration: 600,
      caption: 'Scroll to zoom out'
    },
    {
      type: 'camera_zoom',
      params: { zoom: 800 },
      duration: 600,
      caption: 'Back to default'
    },
    {
      type: 'camera_rotate',
      params: { angle: 0 },
      duration: 600
    }
  ]
};
