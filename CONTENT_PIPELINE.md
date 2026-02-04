# Future Buddy - Content Pipeline

Documentation for creating dev-log videos with AI voice and VTuber avatar.

---

## Voice Setup

### ElevenLabs

- **Account**: Starter plan ($5/month)
- **Voice ID**: `JHEAyLKdvRitymWRphcl` (cloned voice)
- **Model**: `eleven_multilingual_v2` (high quality)

### Generating Voiceovers

```python
from elevenlabs.client import ElevenLabs

client = ElevenLabs()  # Uses ELEVENLABS_API_KEY env var

audio = client.text_to_speech.convert(
    text="Your script here",
    voice_id="JHEAyLKdvRitymWRphcl",
    model_id="eleven_multilingual_v2"
)

with open("voiceover.mp3", "wb") as f:
    for chunk in audio:
        f.write(chunk)
```

---

## VTuber Setup

### Software

- **VTube Studio** (Steam, free + $15 to remove watermark)
  - https://store.steampowered.com/app/1325860/VTube_Studio/

### Avatar

- **Model**: Wizard Live2D
- **Source**: https://booth.pm/en/items/7498022
- **Local Path**: `vtuber/wizard/wizard.model3.json`
- **Cost**: 2,500 JPY (~$17)
- **Features**: Multiple expressions, tear animations, hat-off state

### Importing Model

1. Open VTube Studio
2. Click person icon (top left)
3. Click "Add Model"
4. Navigate to `clawscape/vtuber/wizard/`
5. Select `wizard.model3.json`

---

## Content Workflow

### Demo Videos with Voiceover

1. **Write script** in `recordings/scripts/XXX-demoname.txt`
2. **Generate voiceover** using ElevenLabs
3. **Record demo** with `?demo=name&record`
4. **Record avatar** in VTube Studio lipsyncing to voiceover
5. **Merge** video + avatar + audio in editor
6. **Upload** to YouTube

### File Organization

```
recordings/
├── horizontal/          # 16:9 demo recordings
├── shorts/              # 9:16 demo recordings
├── scripts/             # Written scripts
│   ├── 001-movement.txt
│   ├── 002-multiplayer.txt
│   └── 003-camera.txt
└── voiceovers/          # Generated audio (TODO: move here)
```

---

## API Keys

Stored as environment variables:

- `ELEVENLABS_API_KEY` - ElevenLabs TTS
- `OPENAI_API_KEY` - OpenAI (backup TTS)

---

## Costs

| Service | Cost | Usage |
|---------|------|-------|
| ElevenLabs Starter | $5/month | ~30k chars (~75 demos) |
| VTube Studio DLC | $15 one-time | Remove watermark |
| Wizard model | ~$17 one-time | Avatar |

---

*Last updated: 2026-02-04*
