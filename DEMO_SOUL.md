# ClawScape Demo System - Soul Document

*Make recording effortless so you can focus on building.*

---

## Why This Exists

Recording gameplay footage while developing is a pain:
- You have to remember what to show
- Clicks are inconsistent, timing is off
- Server might disconnect mid-recording
- You re-record the same thing 5 times

**The demo system eliminates all of that.**

Press a button. Get a clean clip. Move on.

---

## Core Philosophy

### 1. Demos Are Documentation

Every feature you build should have a demo. When you finish coding pathfinding, you should have a 5-second clip of pathfinding working. This isn't extra work - it's proof the feature exists.

### 2. Consistency Over Perfection

The same demo should look the same every time you run it. Same camera angle, same movement, same timing. Your voice-over can change, but the footage is locked.

### 3. Zero Friction

- No server required (fake multiplayer locally)
- No clicking "record" buttons
- No manual camera positioning
- Load URL → footage downloads → done

### 4. Captions Tell The Story

Each demo has step-by-step text explaining what's happening. You can mute them in post if you want, but they're there to make voice-over easier. You know exactly what's on screen at each moment.

### 5. Feature-First, Not Phase-First

One demo per feature, not one demo per phase. Small, focused clips that show ONE thing well. Stitch them together in DaVinci if you need a phase recap.

---

## What A Demo Is

A demo is a **scripted sequence** that:
- Moves the player to specific tiles
- Rotates/zooms the camera at specific moments
- Spawns fake players (for multiplayer features)
- Shows captions explaining each step
- Records everything to MP4
- Downloads automatically when done

A demo is NOT:
- Live gameplay recording
- A trailer or marketing video
- Interactive (you don't control anything during playback)

---

## The Workflow

### Raw Demos (Documentation)

```
1. Finish coding a feature
2. Write a 10-line demo script for it
3. Load localhost:5173?demo=featurename
4. Video downloads (with captions baked in)
5. Upload directly to YouTube (unlisted)
6. Link video on GitHub DEMOS.md
```

No editing. Demo system gives you upload-ready footage.

### Voiced Versions (Entertainment) - Optional

```
1. Take the same raw footage
2. Import to DaVinci
3. Add voice-over
4. Upload to main channel (public)
```

Two purposes, same source footage. GitHub gets the clean technical demos. Your channel gets the personality.

---

## Demo Script Values

### Keep Scripts Focused
5-30 seconds of footage. Simple features stay short (~5s), complex features can go longer (~30s). If your demo needs 40+ actions, split it into multiple demos.

### Show The Feature, Not The World
Don't wander around showing off the grass tiles in a pathfinding demo. Click point A, walk to point B around obstacles, done.

### Captions Are Your Script
Write captions as if you're explaining to someone watching without sound. They should understand what's happening from captions alone.

### Camera Serves The Action
Rotate camera when it helps show the feature. Don't rotate just to show off rotation (unless that's the demo).

### The Video Is The Artifact
Demo scripts are disposable tools to create videos. Once recorded and uploaded, the script's job is done. The YouTube video is the permanent record - the script can be deleted or archived. Don't worry about old scripts working with new game states.

### Numbering Tells The Story
When a feature improves, make a NEW video with a NEW number. #004 is camera controls from early dev. #089 is camera controls v2 after improvements. The YouTube timeline shows the project evolving.

### Test Before You Record
`?demo=name` runs the automated demo without recording - use this to test your script works correctly. Add `&record` when you're ready to capture the final MP4. Normal gameplay (no URL parameters) = you control everything as usual.

---

## What We Don't Want

- **Overengineered editor UI** - Scripts are code, not drag-and-drop timelines
- **Server dependencies** - Demos work offline, always
- **Manual recording** - If you have to click "record", we failed
- **Long demos** - If it's over 15 seconds, split it up
- **Inconsistent output** - Same demo = same video every time

---

## What We Do Want

- **One command, one clip** - URL parameter triggers everything
- **Captions by default** - Every action can have explanatory text
- **MP4 output** - DaVinci-ready, no conversion needed
- **Fake multiplayer** - Show "other players" without running server
- **Immediate workflow** - Feature done → demo recorded → next feature

---

## The Pitch

The demo system is your **personal cinematographer**. You tell it what to film, it films it the same way every time, and hands you the footage. You focus on building the game and telling the story.

*"I coded it. The demo proves it. Now I talk about it."*
