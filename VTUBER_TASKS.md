# VTuber Integration - Task List

## Status Key

- [ ] Not started
- [x] Complete
- [~] In progress
- [-] Blocked

---

# PHASE 1: VOICE PIPELINE ✓ COMPLETE

- [x] Set up ElevenLabs account
- [x] Clone voice
- [x] Test voice generation
- [x] Document voice setup in CONTENT_PIPELINE.md
- [x] Write demo scripts (001, 002, 003)
- [x] Generate test voiceovers

---

# PHASE 2: LIVE2D RENDERER

## 2.1 Research & Setup ✓ COMPLETE

- [x] Research pixi-live2d-display library
- [x] Review library documentation and examples
- [x] Check browser compatibility requirements
- [x] Review wizard model file structure
- [x] Identify required model files (.moc3, textures, physics, etc.)

## 2.2 Basic Rendering (~) IN PROGRESS

- [x] Install pixi-live2d-display and dependencies
- [x] Load wizard.model3.json successfully
- [x] Render model to canvas
- [x] Verify model displays correctly (wizard idling!)
- [ ] Create new `vtuber/` directory in client/src
- [ ] Create VTuberRenderer class
- [ ] Test on both Chrome and Firefox

## 2.3 Model Control

- [ ] Implement model positioning (x, y)
- [ ] Implement model scaling
- [ ] Implement model rotation (if needed)
- [ ] Create position presets (corner, center, talking, etc.)
- [ ] Test smooth position transitions (tweening)

## 2.4 Expressions

- [ ] Map available expressions from model files
- [ ] Create expression trigger function
- [ ] Test each expression:
  - [ ] akazame (red face)
  - [ ] aozame (blue/pale)
  - [ ] ase (sweat)
  - [ ] asetakusann (heavy sweat)
  - [ ] bousi off (hat off)
  - [ ] tere (embarrassed)
- [ ] Create expression queue system (for chaining)

## 2.5 Animations

- [ ] Implement idle animation loop
- [ ] Implement namida (tear) motion
- [ ] Create fly-in animation (from edge)
- [ ] Create fly-out animation (to edge)
- [ ] Create bounce animation
- [ ] Create point gesture (if model supports)
- [ ] Test animation blending

---

# PHASE 3: LIPSYNC

## 3.1 Audio Analysis

- [ ] Research Web Audio API amplitude analysis
- [ ] Create AudioAnalyzer class
- [ ] Implement real-time amplitude detection
- [ ] Test with generated voiceover files
- [ ] Calibrate sensitivity thresholds

## 3.2 Mouth Mapping

- [ ] Identify mouth parameters in Live2D model
- [ ] Map amplitude levels to mouth openness
- [ ] Implement smooth mouth movement (not choppy)
- [ ] Test sync with voice clips
- [ ] Adjust timing/latency if needed

## 3.3 Integration

- [ ] Connect AudioAnalyzer to VTuberRenderer
- [ ] Test lipsync during playback
- [ ] Verify sync in recorded output
- [ ] Fine-tune for natural appearance

---

# PHASE 4: COMPOSITOR

## 4.1 Layer System

- [ ] Design layer architecture (game, vtuber, UI)
- [ ] Create Compositor class
- [ ] Implement layer ordering
- [ ] Implement layer visibility toggle
- [ ] Test multi-layer rendering

## 4.2 Format Handling

- [ ] Implement 16:9 layout mode
- [ ] Implement 9:16 layout mode
- [ ] Create format-specific position mapping
- [ ] Test VTuber positioning in both formats
- [ ] Verify game footage framing in both formats

## 4.3 Recording Integration

- [ ] Modify existing DemoRecorder to use Compositor
- [ ] Ensure MediaRecorder captures composited output
- [ ] Test recording quality
- [ ] Verify audio sync in recorded files

---

# PHASE 5: SCRIPT SYSTEM

## 5.1 Script Format Extension

- [ ] Design extended DemoScript type
- [ ] Add voice action types (speak, pause)
- [ ] Add vtuber action types (show, hide, expression, etc.)
- [ ] Add concurrent action support
- [ ] Update TypeScript interfaces

## 5.2 Voice Actions

- [ ] Implement 'speak' action
  - [ ] Load pre-generated audio
  - [ ] Play audio
  - [ ] Trigger lipsync
  - [ ] Wait for completion
- [ ] Implement 'pause' action
- [ ] Calculate action duration from audio length

## 5.3 VTuber Actions

- [ ] Implement 'vtuber_show' action
- [ ] Implement 'vtuber_hide' action
- [ ] Implement 'vtuber_enter' action (animated)
- [ ] Implement 'vtuber_exit' action (animated)
- [ ] Implement 'vtuber_expression' action
- [ ] Implement 'vtuber_gesture' action

## 5.4 Reactive System

- [ ] Design event trigger system
- [ ] Implement 'vtuber_react' action
- [ ] Connect to game events (player_move, player_arrive, etc.)
- [ ] Test dynamic reactions during demo playback

## 5.5 Timing System

- [ ] Auto-calculate timing from voice duration
- [ ] Handle concurrent actions
- [ ] Implement action queue
- [ ] Test complex scripts with multiple concurrent actions

---

# PHASE 6: VOICE GENERATION PIPELINE

## 6.1 Script Parsing

- [ ] Create script-to-voice-text extractor
- [ ] Handle multiple speak actions per script
- [ ] Generate unique filenames per clip

## 6.2 Batch Generation

- [ ] Create voice generation script (Python or Node)
- [ ] Implement ElevenLabs batch API calls
- [ ] Save clips to recordings/voiceovers/{demo}/
- [ ] Generate manifest file (clip → duration mapping)

## 6.3 Integration

- [ ] Load voice manifest before demo playback
- [ ] Pre-load all audio clips
- [ ] Verify all clips exist before recording

---

# PHASE 7: ONE-CLICK PIPELINE

## 7.1 CLI Command

- [ ] Create `npm run demo:record <name>` command
- [ ] Implement full pipeline:
  1. [ ] Generate voice clips (if missing)
  2. [ ] Launch browser with demo
  3. [ ] Record horizontal version
  4. [ ] Record shorts version
  5. [ ] Save to recordings/

## 7.2 URL Parameters

- [ ] Update `?demo=name&record` to include VTuber
- [ ] Add `?demo=name&record&novtuber` for raw recording
- [ ] Add format override `?format=horizontal` or `?format=shorts`

## 7.3 Output

- [ ] Auto-name files correctly (0000XXX name.mp4)
- [ ] Save to correct folders (horizontal/, shorts/)
- [ ] Generate thumbnail (optional)
- [ ] Log completion with file paths

---

# PHASE 8: POLISH & TESTING

## 8.1 Quality Assurance

- [ ] Test full pipeline with movement demo
- [ ] Test full pipeline with multiplayer demo
- [ ] Test full pipeline with camera demo
- [ ] Verify audio sync in all outputs
- [ ] Verify VTuber animations smooth
- [ ] Check file sizes reasonable

## 8.2 Edge Cases

- [ ] Handle missing voice clips gracefully
- [ ] Handle model load failures
- [ ] Handle recording failures
- [ ] Add error messages for common issues

## 8.3 Performance

- [ ] Profile render performance
- [ ] Optimize if frame drops occur
- [ ] Test on lower-end hardware (if applicable)

---

# PHASE 9: THUMBNAIL GENERATOR

- [ ] Research YouTube thumbnail best practices
- [ ] Define thumbnail template (text placement, character pose)
- [ ] Capture key frame from demo (or render specific pose)
- [ ] Add text overlay (demo number, title)
- [ ] Auto-generate thumbnail during recording pipeline
- [ ] Save to recordings/thumbnails/
- [ ] Test different styles (action shot vs character talking)

---

# PHASE 10: DOCUMENTATION

- [ ] Update VTUBER_PLAN.md with final architecture
- [ ] Document script format with examples
- [ ] Document CLI commands
- [ ] Create "Adding a new demo" guide
- [ ] Document voice generation workflow
- [ ] Add troubleshooting section

---

# FUTURE: PRODUCTIZATION

(Not for now - after it works for Future Buddy)

- [ ] Extract to separate package
- [ ] Make avatar configurable
- [ ] Make voice configurable
- [ ] Create setup wizard
- [ ] Write sales page
- [ ] Pricing research
- [ ] Launch strategy

---

## Task Count Summary

| Phase | Tasks |
|-------|-------|
| Phase 1: Voice | 6 (DONE) |
| Phase 2: Live2D | 22 |
| Phase 3: Lipsync | 11 |
| Phase 4: Compositor | 11 |
| Phase 5: Script System | 21 |
| Phase 6: Voice Pipeline | 8 |
| Phase 7: One-Click | 10 |
| Phase 8: Polish | 11 |
| Phase 9: Thumbnails | 7 |
| Phase 10: Documentation | 6 |
| **TOTAL** | **~113 tasks** |

**NOTE**: Phase 2 (Live2D) may change significantly if we use the in-game 3D character instead of a Live2D overlay. TBD after planning session.

---

## Recommended Order

1. **Phase 2.1-2.2** - Get model rendering first (proof of concept)
2. **Phase 3** - Add lipsync (the "wow" moment)
3. **Phase 4** - Compositor (combine with game)
4. **Phase 2.3-2.5** - Full model control
5. **Phase 5** - Script system
6. **Phase 6** - Voice pipeline automation
7. **Phase 7** - One-click pipeline
8. **Phase 8-9** - Polish and docs

---

*Created: 2026-02-04*
