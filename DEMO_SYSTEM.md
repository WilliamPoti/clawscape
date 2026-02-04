# Future Buddy Demo System - Technical Overview

*See also: [DEMO_SOUL.md](./DEMO_SOUL.md) | [DEMO_TASKS.md](./DEMO_TASKS.md)*

---

## What It Does

**For GitHub (documentation):**
```
localhost:5173?demo=pathfinding&record → MP4 downloads → Upload to YouTube → Link on GitHub
```

**For your channel (entertainment):**
```
Same MP4 → DaVinci → Add voice-over → Upload to main channel
```

Raw demos go straight to YouTube. No editing required. Captions explain what's happening.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Audience | YouTube + players + documentation | Multi-purpose content |
| Vibe | Dev log + technical showcase | Casual but informative |
| Length | 5-10 seconds per demo | Short, focused clips |
| Quantity | One demo per feature | Stitch in post if needed |
| Trigger | URL parameter `?demo=name` | Easy to bookmark and re-run |
| Server | Offline (fake multiplayer) | No dependencies, always works |
| Recording | Auto-start, auto-download | Zero friction |
| Format | MP4 (or WebM fallback) | DaVinci compatible |
| UI | Keep game visible + captions | Step-by-step explanation |

---

## System Architecture

### File Structure

```
client/src/demos/
├── index.ts              # Main exports
├── types.ts              # DemoScript, DemoAction interfaces
├── DemoRunner.ts         # Executes scripts, controls game
├── DemoRecorder.ts       # MediaRecorder → MP4
├── CaptionOverlay.ts     # Step-by-step text display
└── scripts/
    ├── index.ts          # Script registry
    ├── phase1-worldmap.ts
    ├── phase1-pathfinding.ts
    ├── phase1-camera.ts
    └── phase1-multiplayer.ts
```

### Core Interfaces

```typescript
// Every action can have an optional caption
interface DemoAction {
  type: 'move' | 'camera_rotate' | 'camera_zoom' | 'wait' |
        'spawn_player' | 'move_other' | 'remove_player' | 'click_blocked';
  params: Record<string, any>;
  duration?: number;   // How long this action takes (ms)
  caption?: string;    // Text to display during this action
}

interface DemoScript {
  name: string;                    // Used in URL: ?demo=name
  description: string;             // For humans
  actions: DemoAction[];
}
```

### Action Types

| Action | Parameters | Caption Example |
|--------|------------|-----------------|
| `move` | `{ x, z }` | "Player walks to destination" |
| `camera_rotate` | `{ angle }` | "Camera rotates 90 degrees" |
| `camera_zoom` | `{ zoom }` | "Zooming in for detail" |
| `wait` | `{ duration }` | "Checkerboard grass pattern" |
| `spawn_player` | `{ id, x, z, name }` | "Another player joins" |
| `move_other` | `{ id, x, z }` | "Player 2 approaches" |
| `remove_player` | `{ id }` | "Player 2 disconnects" |
| `click_blocked` | `{ x, z }` | "Can't walk on blocked tiles" |

---

## Example Demo Script

```typescript
// scripts/phase1-pathfinding.ts
import { DemoScript } from '../types';

export const pathfindingDemo: DemoScript = {
  name: 'pathfinding',
  description: 'Demonstrates A* pathfinding around obstacles',
  actions: [
    {
      type: 'wait',
      params: { duration: 1000 },
      caption: 'Player starts near obstacles'
    },
    {
      type: 'move',
      params: { x: 6, z: 6 },
      caption: 'Click destination behind rocks'
    },
    {
      type: 'camera_zoom',
      params: { zoom: 600 },
      caption: 'A* calculates optimal path'
    },
    {
      type: 'wait',
      params: { duration: 2000 },
      caption: 'Player navigates around obstacles'
    },
    {
      type: 'click_blocked',
      params: { x: 3, z: 3 },
      caption: 'Blocked tiles show red X'
    },
  ]
};
```

---

## URL Trigger System

### How It Works

1. Page loads with `?demo=pathfinding`
2. Game initializes normally
3. After init, check for `demo` URL parameter
4. Look up script in registry by name
5. Start DemoRunner with script
6. Start DemoRecorder
7. When demo completes:
   - Stop recording
   - Generate filename: `futurebuddy-pathfinding-20260202-143022.mp4`
   - Trigger download

### URL Examples

```
localhost:5173?demo=pathfinding          # Runs demo (no recording)
localhost:5173?demo=pathfinding&record   # Runs + records + downloads MP4
localhost:5173?demo=worldmap&record
localhost:5173?demo=camera
```

**No URL params:** Normal gameplay. You control everything.
**`?demo=name`:** Automated demo plays (for testing scripts). You watch.
**`?demo=name&record`:** Automated demo plays AND records. MP4 downloads when done.

---

## Caption System

Captions appear as overlay text explaining each step.

### Styling

```css
.demo-caption {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);

  font-family: 'Arial', sans-serif;
  font-size: 24px;
  color: white;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.8);

  background: rgba(0, 0, 0, 0.6);
  padding: 12px 24px;
  border-radius: 8px;

  opacity: 0;
  transition: opacity 0.3s ease;
}

.demo-caption.visible {
  opacity: 1;
}
```

### Behavior

- Caption appears when action starts
- Fades in over 300ms
- Stays visible for action duration
- Fades out over 300ms when next action starts
- If next action has no caption, previous fades out

---

## Offline Multiplayer Simulation

Demos can show multiplayer features without the server running.

### How It Works

```typescript
// DemoRunner maintains fake players separately
private fakePlayers: Map<number, FakePlayer> = new Map();

// spawn_player creates a visual-only player
handleSpawnPlayer(params: { id: number, x: number, z: number, name: string }) {
  const mesh = this.game.createPlayer(0x6b9fff);  // Blue cube
  mesh.position.set(params.x * TILE_SIZE, 60, params.z * TILE_SIZE);
  // Add label, store in map
  this.fakePlayers.set(params.id, { mesh, name: params.name });
}

// move_other animates the fake player
handleMoveOther(params: { id: number, x: number, z: number }) {
  const player = this.fakePlayers.get(params.id);
  if (player) {
    // Set target position, animate in update loop
    player.targetPosition = new THREE.Vector3(
      params.x * TILE_SIZE, 60, params.z * TILE_SIZE
    );
  }
}
```

This means:
- No WebSocket connection needed
- No server process running
- Demos work offline, anywhere
- Same visual result as real multiplayer

---

## Recording Output

### Specifications

| Property | Value |
|----------|-------|
| Format | MP4 (WebM fallback if MP4 unavailable) |
| Resolution | 1920 x 1080 |
| Framerate | 60fps |
| Codec | H.264 (MP4) or VP9 (WebM) |

### Filename Format

```
futurebuddy-{demoname}-{YYYYMMDD}-{HHMMSS}.mp4
```

Examples:
- `futurebuddy-pathfinding-20260202-143022.mp4`
- `futurebuddy-worldmap-20260202-143156.mp4`

---

## Integration Points

### Game Class Changes

```typescript
class Game {
  private demoRunner: DemoRunner | null = null;
  private demoRecorder: DemoRecorder | null = null;

  constructor() {
    // ... existing code ...

    // Initialize demo system
    this.demoRunner = new DemoRunner(this);
    this.demoRecorder = new DemoRecorder();

    // Check for URL parameter
    this.checkDemoParameter();
  }

  private checkDemoParameter(): void {
    const params = new URLSearchParams(window.location.search);
    const demoName = params.get('demo');
    if (demoName) {
      this.runDemo(demoName);
    }
  }

  runDemo(name: string): void {
    const script = getDemoScript(name);
    if (!script) {
      console.error(`Demo not found: ${name}`);
      return;
    }

    this.demoRecorder.startRecording(this.renderer.domElement);
    this.demoRunner.start(script, () => {
      // On complete
      this.demoRecorder.stopAndDownload(`futurebuddy-${name}`);
    });
  }

  isInDemoMode(): boolean {
    return this.demoRunner?.isRunning() ?? false;
  }

  // In animate loop:
  private animate(): void {
    // ... existing code ...

    if (this.demoRunner?.isRunning()) {
      this.demoRunner.update(delta);
    }
  }

  // In onClick - block if demo running:
  private onClick(event: MouseEvent): void {
    if (this.isInDemoMode()) return;
    // ... existing code ...
  }
}
```

---

## All Demos

| # | Script Name | Duration | What It Shows |
|---|-------------|----------|---------------|
| 001 | `movement` | ~6s | Basic player movement |
| 002 | `click-to-move` | ~6s | Click destination system |
| 003 | `multiplayer` | ~8s | Other players visible, join/leave |
| 004 | `camera` | ~6s | Q/E rotation, scroll zoom |
| 005 | `collision` | ~6s | Blocked tiles, red X feedback |
| 006 | `worldmap` | ~8s | Tile types, dirt path, water, sand |
| 007 | `pathfinding` | ~8s | A* navigation around obstacles |

---

## Phase D.6: Publish to YouTube + GitHub

After recording each demo (no editing needed):

### YouTube (Raw Demos)

1. Upload raw MP4 directly to YouTube as **unlisted**
2. Add to playlist "Future Buddy Development"
3. Title format: `Future Buddy Dev #001 - Movement System`
4. Description: Brief explanation + link to GitHub
5. Captions are baked into the video - no post-production

### YouTube (Voiced Versions - Optional)

For entertainment content on your main channel:
1. Take same raw footage
2. Add voice-over in DaVinci
3. Upload as public to main channel

### GitHub

`DEMOS.md` uses sequential numbering (already created):

```markdown
| # | Feature | Video | Date |
|---|---------|-------|------|
| 001 | Movement System | [Watch](https://youtu.be/xxxxx) | 2026-02-02 |
| 002 | Click to Move | [Watch](https://youtu.be/xxxxx) | 2026-02-02 |
| 003 | Multiplayer Sync | [Watch](https://youtu.be/xxxxx) | 2026-02-02 |
...
```

Link DEMOS.md from main README.md:

```markdown
## Development Progress

Watch the game being built: [Demo Videos](./DEMOS.md)
```

### Why This Matters

- **Employers**: See real development process, not just finished code
- **Players**: Watch the game evolve over time
- **You**: Permanent record of progress, motivation to keep shipping

---

## Next Steps

See [DEMO_TASKS.md](./DEMO_TASKS.md) for implementation checklist.

Start with:
1. D.1.1 - Type definitions
2. D.1.2 - DemoRecorder (MediaRecorder wrapper)
3. D.1.3 - DemoRunner (script executor)

Then actions, then scripts, then integration, then publish.
