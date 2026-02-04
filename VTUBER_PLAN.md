# VTuber Integration - Demo System Extension

## Vision

Extend the demo recording system to include an animated VTuber that:
- Lipsyncs to AI-generated voiceover (your cloned voice)
- Reacts dynamically to demo events
- Flies in/out, appears in corners, does bits
- All scripted - no manual editing needed

**Goal**: One-click → finished video with game footage + VTuber + voice

---

## Architecture

```
Demo Script
    ↓
┌─────────────────────────────────────┐
│  Demo Runner (extended)             │
│  - Game actions (move, camera...)   │
│  - VTuber actions (appear, react..) │
│  - Voice actions (speak, pause...)  │
└─────────────────────────────────────┘
    ↓                    ↓
Game Canvas         VTuber Layer
    ↓                    ↓
└──────── Compositor ────────┘
              ↓
         Final Video
```

---

## New Action Types

### Voice Actions
```typescript
{ type: 'speak', params: { text: "..." } }     // Generate + play TTS
{ type: 'pause', params: { duration: 500 } }   // Silent pause
```

### VTuber Actions
```typescript
{ type: 'vtuber_show', params: { position: 'bottom-right' } }
{ type: 'vtuber_hide', params: { animation: 'fly-out-right' } }
{ type: 'vtuber_enter', params: { from: 'left', to: 'center' } }
{ type: 'vtuber_expression', params: { expression: 'surprised' } }
{ type: 'vtuber_gesture', params: { gesture: 'point-at-screen' } }
```

### Cursor Actions (The Dev)
```typescript
{ type: 'cursor_show' }                                      // Cursor appears
{ type: 'cursor_hide' }                                      // Cursor disappears
{ type: 'cursor_move', params: { x: 100, y: 200 } }          // Move to position
{ type: 'cursor_drag', params: { target: 'wizard', to: {x, y} } }  // Drag wizard
{ type: 'cursor_poke', params: { target: 'wizard' } }        // Poke/click wizard
{ type: 'cursor_shake' }                                     // Disapproving shake
{ type: 'cursor_circle', params: { target: 'wizard' } }      // Circle impatiently
{ type: 'cursor_highlight', params: { area: {x, y, w, h} } } // Highlight UI/area
```

### Dynamic Reactions
```typescript
{ type: 'vtuber_react', params: { trigger: 'player_move', expression: 'watching' } }
{ type: 'vtuber_react', params: { trigger: 'player_arrive', expression: 'happy' } }
```

---

## Components to Build

### Phase 1: Voice Pipeline (DONE ✓)
- [x] ElevenLabs integration
- [x] Voice cloning
- [x] Script → audio generation

### Phase 2: VTuber Renderer
- [ ] Load Live2D model in browser (using pixi-live2d-display)
- [ ] Lipsync to audio (mouth tracking from audio amplitude)
- [ ] Expression triggers
- [ ] Position/animation system (fly in, corner, center, etc.)

### Phase 3: Compositor
- [ ] Render game + VTuber to same canvas
- [ ] Support different layouts (PiP, side-by-side, cuts)
- [ ] Handle both 16:9 and 9:16 formats

### Phase 4: Smart Scripting
- [ ] Script includes voice + vtuber + game actions
- [ ] Timing auto-calculated from voice duration
- [ ] Reactions triggered by game events

### Phase 5: One-Click Pipeline
- [ ] `?demo=multiplayer&record` → full video with VTuber
- [ ] No manual editing, straight to YouTube

---

## Tech Stack

| Component | Tech | Why |
|-----------|------|-----|
| Live2D rendering | pixi-live2d-display | Works in browser, same as VTube Studio models |
| Lipsync | Audio amplitude analysis | Simple, no ML needed |
| Composition | Canvas API | Already using for demo recorder |
| Voice generation | ElevenLabs API | Already integrated |
| Video output | MediaRecorder | Already using |

---

## Example Script (Future)

```typescript
export const movementDemo: DemoScript = {
  name: 'movement',
  actions: [
    // VTuber flies in
    { type: 'vtuber_enter', params: { from: 'right', to: 'bottom-right' } },

    // VTuber speaks while player moves
    {
      type: 'speak',
      params: { text: "Alright, first thing I built was the movement system." },
      concurrent: [
        { type: 'move', params: { x: 2, z: 0 } }
      ]
    },

    // VTuber reacts
    { type: 'vtuber_expression', params: { expression: 'explaining' } },
    {
      type: 'speak',
      params: { text: "Eight directions, smooth pathfinding, hold shift to run." },
      concurrent: [
        { type: 'move', params: { x: 2, z: 2 } },
        { type: 'set_running', params: { running: true } }
      ]
    },

    // VTuber exits
    { type: 'speak', params: { text: "Simple, but it's the foundation." } },
    { type: 'vtuber_exit', params: { to: 'right' } },
  ]
};
```

---

## Effort Estimate

| Phase | Complexity |
|-------|------------|
| Phase 1 | Done |
| Phase 2 | Medium - Live2D in browser is documented |
| Phase 3 | Medium - Canvas compositing |
| Phase 4 | Medium - Script format changes |
| Phase 5 | Easy - Wire it together |

---

## Dual-Format Layout System

Since we already record two formats (16:9 horizontal + 9:16 shorts), the VTuber system needs to handle both intelligently.

### Layout Strategy: One Script, Two Renders

Instead of writing two scripts, we use **abstract positions** that the compositor translates per format:

```typescript
// Script uses abstract positions
{ type: 'vtuber_show', params: { position: 'corner' } }   // Compositor decides where
{ type: 'vtuber_show', params: { position: 'talking' } }  // Main speaking position
{ type: 'vtuber_show', params: { position: 'reacting' } } // Smaller, watching
```

### Position Mapping

| Abstract Position | Horizontal (16:9) | Shorts (9:16) |
|-------------------|-------------------|---------------|
| `corner` | Bottom-right, 25% size | Bottom, 30% size |
| `talking` | Bottom-right, 35% size | Bottom third, 40% size |
| `center` | Center, 50% size | Center, 60% size |
| `reacting` | Bottom-right, 20% size | Bottom, 25% size |
| `hidden` | Off-screen right | Off-screen bottom |

### Shorts Layout (9:16)

```
┌─────────────┐
│             │
│    GAME     │   ← Game footage (top 60-70%)
│   FOOTAGE   │
│             │
├─────────────┤
│   VTUBER    │   ← VTuber layer (bottom 30-40%)
│             │
└─────────────┘
```

- VTuber appears in **bottom third** of shorts
- Game footage letterboxed or cropped to fit top portion
- VTuber can **slide up** to overlay game when pointing at things

### Horizontal Layout (16:9)

```
┌─────────────────────────────────┐
│                                 │
│           GAME FOOTAGE          │
│                        ┌───────┐│
│                        │VTUBER ││  ← Picture-in-picture
│                        └───────┘│
└─────────────────────────────────┘
```

- VTuber in **corner overlay** (typical streaming layout)
- Game footage full-screen behind
- VTuber can **fly to center** for emphasis moments

### Implementation

The compositor runs the same script twice:

```typescript
// In demo runner
async function recordDemo(script: DemoScript) {
  // Pre-generate all voice clips
  const audioClips = await generateVoiceovers(script);

  // Record horizontal version
  await recordWithFormat(script, audioClips, '16:9');

  // Record shorts version
  await recordWithFormat(script, audioClips, '9:16');
}

function getVTuberPosition(abstract: string, format: '16:9' | '9:16') {
  const positions = {
    '16:9': {
      corner: { x: 0.75, y: 0.65, scale: 0.25 },
      talking: { x: 0.75, y: 0.55, scale: 0.35 },
      center: { x: 0.5, y: 0.5, scale: 0.5 },
    },
    '9:16': {
      corner: { x: 0.5, y: 0.80, scale: 0.30 },
      talking: { x: 0.5, y: 0.75, scale: 0.40 },
      center: { x: 0.5, y: 0.5, scale: 0.60 },
    }
  };
  return positions[format][abstract];
}
```

### Animation Differences

| Animation | Horizontal | Shorts |
|-----------|------------|--------|
| `fly-in` | From right edge | From bottom edge |
| `fly-out` | To right edge | To bottom edge |
| `bounce` | Side-to-side | Up-down |
| `point` | Point left at game | Point up at game |

---

## Resolved Questions

1. **Live2D in browser** → Use pixi-live2d-display (same ecosystem, simpler pipeline)
2. **Shorts layout** → VTuber in bottom third, game in top 60-70%
3. **Pre-generate voice** → Yes, generate all audio first, then record both formats

---

## Next Steps

1. Prototype Live2D rendering in browser
2. Test lipsync with audio amplitude
3. Extend demo script format
4. Build compositor

---

*Created: 2026-02-04*
