# Future Buddy - AI Agent Context

## What Is This Project?

Future Buddy is a RuneScape-like MMORPG being built **from scratch** using:
- **Client**: Three.js (WebGL) + TypeScript
- **Server**: Node.js + TypeScript + WebSocket
- **Database**: SQLite (dev) / PostgreSQL (prod)

This is NOT a mod of an existing game. We are building the engine, client, and server ourselves.

## Key Documents

| File | Purpose |
|------|---------|
| `SOUL.md` | Game design vision - the "why" behind every feature |
| `MASTER_TASKS.md` | Complete task list organized by phase |
| `STATUS.json` | Machine-readable task status (source of truth) |
| `CONTEXT.md` | This file - orientation for AI agents |

## Reference Codebase

Lost City (2004scape) at `C:\Users\go\lostcity-ref` is reference code for how RuneScape mechanics work:
- `src/cache/` - File format parsers
- `src/engine/` - Game logic
- `src/scripts/` - RuneScript content

Use it to understand RS mechanics, NOT to copy code directly.

## Project Structure

```
clawscape/
├── client/           # Three.js browser client
│   ├── src/
│   │   ├── engine/   # Rendering, input, camera
│   │   ├── entities/ # Player, NPC, item renderers
│   │   ├── ui/       # HTML/CSS interfaces
│   │   └── network/  # WebSocket client
│   └── public/       # Static assets
├── server/           # Node.js game server
│   ├── src/
│   │   ├── engine/   # Game tick, world state
│   │   ├── entities/ # Player, NPC, item logic
│   │   ├── network/  # WebSocket server
│   │   └── db/       # Database layer
│   └── data/         # Game data (items, npcs, maps)
├── shared/           # Code shared between client/server
│   ├── types/        # TypeScript interfaces
│   ├── constants/    # Tick rate, formulas, etc.
│   └── utils/        # Shared utilities
├── SOUL.md
├── MASTER_TASKS.md
├── STATUS.json
└── CONTEXT.md
```

## Core SOUL.md Principles (Must Remember)

1. **Risk = Reward** - Dangerous content pays best
2. **Ironman for POWER** - All functional items are untradeable, everyone earns their own
3. **Gold = Luxury** - Gold buys cosmetics, NOT power
4. **AI Companions** - Official "bots" so players don't cheat
5. **One Account** - Anti-alt design, companion is your second account
6. **Skill Expression** - Tick manipulation = 3x XP, not 10%
7. **Three PvP Modes**:
   - Duel Arena: Skill-based, NO RNG, equal stakes
   - Wilderness: Territory control, lose NOTHING on death
   - Clan Wars: Normalized stats, pure skill

## Task Workflow

### Claiming a Task
1. Check `STATUS.json` for available tasks
2. Update task status to `"in_progress"` with your agent ID
3. Commit the STATUS.json change
4. Do the work

### Completing a Task
1. Finish the implementation
2. Update task status to `"completed"` with timestamp
3. Add to `completed_log`
4. Commit everything together

### Task Dependencies
Check `blocked_by` array - don't start blocked tasks until dependencies are complete.

## Tech Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Renderer | Three.js | Modern, well-documented, WebGL |
| Protocol | WebSocket + JSON | Simple, debuggable |
| Tick Rate | 600ms | RS standard |
| Language | TypeScript | Type safety across client/server |
| Build | Vite (client), esbuild (server) | Fast |

## Common Patterns

### Entity IDs
All entities (players, NPCs, items) have unique numeric IDs assigned by server.

### Network Messages
```typescript
interface Message {
  type: string;
  payload: unknown;
  timestamp: number;
}
```

### Coordinates
Tile-based: `{ x: number, y: number, level: number }`

## Getting Started

If you're a new agent:
1. Read `SOUL.md` to understand the vision
2. Check `STATUS.json` for available tasks
3. Look at `MASTER_TASKS.md` for task details
4. Claim a task and start working

## Questions?

If unclear about a design decision, check SOUL.md first. If still unclear, the human should be consulted.
