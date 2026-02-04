// Demo Script Registry
// All demo scripts are registered here

import { DemoScript } from '../types.js';
import { movementDemo } from './001-movement.js';
import { multiplayerDemo } from './002-multiplayer.js';
import { cameraDemo } from './003-camera.js';

// Registry of all available demos
const demoScripts: Map<string, DemoScript> = new Map([
  [movementDemo.name, movementDemo],
  [multiplayerDemo.name, multiplayerDemo],
  [cameraDemo.name, cameraDemo],
]);

export function getDemoScript(name: string): DemoScript | undefined {
  return demoScripts.get(name);
}

export function listDemoScripts(): string[] {
  return Array.from(demoScripts.keys());
}

export {
  movementDemo,
  multiplayerDemo,
  cameraDemo,
};
