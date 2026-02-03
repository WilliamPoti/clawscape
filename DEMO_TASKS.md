# ClawScape Demo System - Task List

Building an automated demo recording system for ClawScape.

**Scope:** This system spans the entire project - all 16 phases, potentially hundreds of demos over development. Numbers go up forever (#001, #002... #347). New features get new numbers. History is preserved.

---

## Phase D.1: Core Infrastructure

### D.1.1 Type Definitions
- [x] **D.1.1.1** Create `client/src/demos/types.ts`
- [x] **D.1.1.2** Define `DemoAction` interface (type, params, duration, caption)
- [x] **D.1.1.3** Define `DemoScript` interface (name, phase, actions, resolution)
- [x] **D.1.1.4** Define action type union (`move`, `camera_rotate`, `wait`, etc.)

### D.1.2 Demo Recorder
- [x] **D.1.2.1** Create `client/src/demos/DemoRecorder.ts`
- [x] **D.1.2.2** Implement MediaRecorder initialization (MP4/WebM)
- [x] **D.1.2.3** Implement `startRecording(canvas)` method
- [x] **D.1.2.4** Implement `stopRecording()` → returns Blob
- [x] **D.1.2.5** Implement `downloadVideo(filename)` auto-download
- [x] **D.1.2.6** Handle MP4 conversion if needed (or WebM fallback)

### D.1.3 Demo Runner
- [x] **D.1.3.1** Create `client/src/demos/DemoRunner.ts`
- [x] **D.1.3.2** Implement script loading and validation
- [x] **D.1.3.3** Implement action queue and timing system
- [x] **D.1.3.4** Implement `start(script)` method
- [x] **D.1.3.5** Implement `update(delta)` method (called each frame)
- [x] **D.1.3.6** Implement `stop()` method
- [x] **D.1.3.7** Implement `isRunning()` check
- [x] **D.1.3.8** Block normal player input during demo mode

---

## Phase D.2: Action Implementations

### D.2.1 Movement Actions
- [x] **D.2.1.1** Implement `move` action - pathfind player to tile {x, z}
- [x] **D.2.1.2** Implement `click_blocked` action - click blocked tile, show red X
- [x] **D.2.1.3** Implement `wait` action - pause for {duration} ms

### D.2.2 Camera Actions
- [x] **D.2.2.1** Implement `camera_rotate` action - smooth rotate to {angle}
- [x] **D.2.2.2** Implement `camera_zoom` action - smooth zoom to {level}

### D.2.3 Multiplayer Simulation (Offline)
- [x] **D.2.3.1** Implement `spawn_player` action - create fake player {id, x, z, name}
- [x] **D.2.3.2** Implement `move_other` action - move fake player {id} to {x, z}
- [x] **D.2.3.3** Implement `remove_player` action - remove fake player {id}
- [x] **D.2.3.4** Store fake players separately from real multiplayer players

### D.2.4 Caption System
- [x] **D.2.4.1** Create caption overlay DOM element
- [x] **D.2.4.2** Style captions (position, font, background, animation)
- [x] **D.2.4.3** Implement caption show/hide with fade transitions
- [x] **D.2.4.4** Support caption field on any action

---

## Phase D.3: Demo Scripts

### D.3.1 Script Infrastructure
- [x] **D.3.1.1** Create `client/src/demos/scripts/` directory
- [x] **D.3.1.2** Create `client/src/demos/scripts/index.ts` registry
- [x] **D.3.1.3** Export all scripts from registry by name

### D.3.2 Demo Scripts (All 7)
- [x] **D.3.2.1** Create `001-movement.ts` - basic player movement
- [ ] **D.3.2.2** Create `002-click-to-move.ts` - click destination system
- [x] **D.3.2.3** Create `003-multiplayer.ts` - other players visible
- [x] **D.3.2.4** Create `004-camera.ts` - rotation and zoom
- [ ] **D.3.2.5** Create `005-collision.ts` - blocked tiles, red X feedback
- [ ] **D.3.2.6** Create `006-worldmap.ts` - tile types, chunks, biomes
- [x] **D.3.2.7** Create `007-pathfinding.ts` - A* navigation around obstacles

---

## Phase D.4: Integration

### D.4.1 Game Class Integration
- [x] **D.4.1.1** Add `demoRunner` property to Game class
- [x] **D.4.1.2** Add `demoRecorder` property to Game class
- [x] **D.4.1.3** Call `demoRunner.update(delta)` in animate loop
- [x] **D.4.1.4** Skip normal input handling when `isInDemoMode()`

### D.4.2 URL Parameter Trigger
- [x] **D.4.2.1** Parse `?demo=` URL parameter on page load
- [x] **D.4.2.2** Parse `&record` flag (optional)
- [x] **D.4.2.3** Look up script by name from registry
- [x] **D.4.2.4** Auto-start demo if parameter present
- [x] **D.4.2.5** If `&record` flag: start recording when demo starts
- [x] **D.4.2.6** If `&record` flag: auto-download video when demo completes

### D.4.3 Exports
- [x] **D.4.3.1** Create `client/src/demos/index.ts` main export
- [x] **D.4.3.2** Export DemoRunner, DemoRecorder, types
- [x] **D.4.3.3** Expose `game.runDemo(name)` for console access

---

## Phase D.5: Polish

### D.5.1 Output Quality
- [x] **D.5.1.1** Set recording resolution to 1920x1080 (+ 1080x1920 for Shorts)
- [x] **D.5.1.2** Set recording framerate to 60fps
- [x] **D.5.1.3** Generate filename: `futurebuddy-{demo}-{format}-{timestamp}.mp4`

### D.5.2 UI Cleanup During Recording
- [x] **D.5.2.1** Option to hide status panel during demo
- [x] **D.5.2.2** Keep game UI (status text) visible by default
- [x] **D.5.2.3** Captions appear below/above game UI cleanly

---

## Phase D.6: Publish

### D.6.1 YouTube Setup
- [x] **D.6.1.1** Set up YouTube API for automated uploads
- [ ] **D.6.1.2** Create YouTube playlist "ClawScape Development"

### D.6.2 YouTube Upload (All via Demo System)
- [x] **D.6.2.1** Upload #001 - Movement System (horizontal + shorts)
  - Horizontal: https://www.youtube.com/watch?v=yGDf46NYBU0
  - Shorts: https://www.youtube.com/watch?v=vJugloGgAUk
- [ ] **D.6.2.2** Upload #002 - Click to Move
- [ ] **D.6.2.3** Upload #003 - Multiplayer Sync
- [ ] **D.6.2.4** Upload #004 - Camera Controls
- [ ] **D.6.2.5** Upload #005 - Collision Detection
- [ ] **D.6.2.6** Upload #006 - World Map
- [ ] **D.6.2.7** Upload #007 - A* Pathfinding

### D.6.3 GitHub Documentation
- [x] **D.6.3.1** Update DEMOS.md with video links (in progress, #001 added)
- [ ] **D.6.3.2** Add DEMOS.md link to main README.md
- [ ] **D.6.3.3** Add YouTube playlist link to DEMOS.md

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| D.1 | 18 | Core infrastructure (types, recorder, runner) |
| D.2 | 12 | Action implementations |
| D.3 | 10 | Demo scripts (all 7 features) |
| D.4 | 9 | Game integration + URL trigger |
| D.5 | 5 | Polish |
| D.6 | 11 | Publish to YouTube + GitHub |
| **Total** | **65** | |

---

## Next Step

Start with D.1.1 (type definitions) → D.1.2 (recorder) → D.1.3 (runner).

Then implement actions (D.2), write scripts (D.3), integrate (D.4), and publish (D.6).
