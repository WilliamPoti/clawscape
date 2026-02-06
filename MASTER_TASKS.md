# ClawScape Master Tasks

## Milestone 0: HD World Engine — COMPLETE

### 0.1 Repo Restructure — DONE
- [x] Moved rs-map-viewer into tools/rs-viewer/
- [x] Restructured client into engine/ + game/ + net/
- [x] Monorepo workspaces: client, server, shared, tools/*
- [x] Demo system preserved and working

### 0.2 Asset Format Design — DONE
- [x] MapSquare format: 64x64 tiles, 4 levels, locs, NPC spawns
- [x] Config formats: underlays, overlays, locs, items, NPCs, environments (JSON)
- [x] Type definitions in shared/src/formats.ts
- [x] Starter map generated (50-50.json)
- [x] glTF for models, PNG/KTX2 for textures

### 0.3 RLHD Terrain Renderer — DONE
- [x] 13 tile shapes ported from RS (TileShapes.ts)
- [x] Height interpolation (4-corner per tile)
- [x] Per-vertex lighting with sun direction
- [x] Underlay color blending (3-tile radius)
- [x] Custom ShaderMaterial: vertex colors, specular, fog, tone mapping
- [x] TerrainRenderer loads MapSquare files

### 0.4 Lighting & Shadows — DONE
- [x] Directional sun light with PCF soft shadow mapping
- [x] Shadow camera follows player
- [x] Configurable shadow quality (512-8192)
- [x] Point light system (up to 50 lights)
- [x] Environment presets (overworld_day, dusk, cave, swamp)

### 0.5 Atmosphere — DONE
- [x] Exponential squared fog (per-environment)
- [x] Sky hemisphere with gradient
- [x] Sky follows camera position
- [x] Environment configs drive all atmosphere settings

### 0.6 Water — DONE
- [x] Animated wave displacement (3-octave sine waves)
- [x] Fresnel reflection
- [x] Caustic patterns
- [x] Sun specular on water
- [x] Fog integration
- [x] Auto-detection of water tiles from map data

### 0.7 Model System — DONE
- [x] GLTFLoader integration
- [x] Model cache (load once, clone many)
- [x] Loc placement from MapSquare data
- [x] Placeholder generation (trees, rocks, torches, signs, etc.)
- [x] Shadow casting/receiving on models

### 0.8 Map Editor — DONE
- [x] Web-based (tools/map-editor/)
- [x] Height painting (raise/lower/flatten/smooth with brush)
- [x] Underlay painting
- [x] Overlay painting (all 13 shapes + rotation)
- [x] Object placement
- [x] NPC spawn placement
- [x] Save/load JSON map files
- [x] Top-down orthographic view with pan/zoom

### 0.9 Post-Processing — DONE
- [x] FXAA anti-aliasing
- [x] Bloom (UnrealBloomPass)
- [x] Color grading (brightness, contrast, saturation)
- [x] Colorblind modes (protanopia, deuteranopia, tritanopia)
- [x] Anisotropic filtering
- [x] ACES filmic tone mapping
- [x] Configurable via GraphicsSettings

---

## Milestone 1: Game Loop
> "It's a game — fight, gather, craft, talk"

### 1.1 Server Game Engine (140 BPM)
- [ ] 140 BPM tick system (428ms per tick)
- [ ] GameEngine class with ordered tick processing
- [ ] ServerEntity base class (position, path, movement)
- [ ] WorldState (load maps, collision flags, walkability)
- [ ] Server-side A* pathfinder
- [ ] Server-authoritative movement

### 1.2 Server Player System
- [ ] ServerPlayer entity with action queue
- [ ] PlayerManager (lifecycle, input processing, state sync)
- [ ] Dirty flag system for efficient updates
- [ ] Network message handler
- [ ] Rewrite server entry point to use GameEngine

### 1.3 Combat System (PvE)
- [ ] 3 styles: Range (Q), Melee (W), Faith (E)
- [ ] 4 weapon slots per style (ASDF), 12 weapons total
- [ ] Special attack (R key, spends rage)
- [ ] Combat triangle: melee armor blocks range, range absorbs faith, faith deflects melee
- [ ] Rage meter (builds from combat — melee fastest, range slow, faith none)
- [ ] Prayer resource (drained by Faith weapons, recharged out of combat)
- [ ] Damage calc: accuracy roll + damage roll + equipment bonuses
- [ ] Hit splats, death/respawn
- [ ] NPC death → respawn timer

### 1.4 NPC System
- [ ] ServerNpc entity with AI state machine (IDLE/WANDER/PATROL/CHASE/ATTACK/RETURN/DEAD)
- [ ] NPC configs: Chicken, Goblin (aggressive), Guard, Shopkeeper, Mechanic
- [ ] Wandering, patrol waypoints, aggro system
- [ ] Return-to-spawn with leash distance
- [ ] Respawn system
- [ ] NPC sync to clients (visible area)

### 1.5 Inventory & Equipment
- [ ] 28-slot inventory (server-authoritative)
- [ ] 11 equipment slots (head, cape, neck, weapon, body, shield, legs, hands, feet, ring, ammo)
- [ ] Equip/unequip with stat recalculation
- [ ] Item configs: weapons, armor, materials, food
- [ ] Stackable items

### 1.6 Skill System (Tier-Based)
- [ ] Tier system: ALL skills advance via quests + boss kills only. No XP, no grinding
- [ ] Tiers have no cap (grow with content updates)
- [ ] Each tier unlocks meaningful things (weapons, armor, abilities, recipes)
- [ ] No dead tiers
- [ ] Combat tiers: unlock new weapons/armor/combat abilities
- [ ] Life skill tiers: unlock new recipes, higher-tier materials
- [ ] Skilling ACTIONS exist (chop trees, cook, repair) but produce items — they do NOT advance tiers
- [ ] Skills: Strength, Accuracy, Prayer (combat), Repair, Woodcutting, Cooking (life), Hitpoints
- [ ] Tier-up from quests only (Milestone 3 content)

### 1.7 Skilling Actions
- [ ] Tick-based actions: chop tree → logs, cook food → cooked meat, repair → consume scrap
- [ ] Success rolls per tick
- [ ] Auto-repeat
- [ ] Progress bar during action
- [ ] Item production (items go to inventory)

### 1.8 NPC Dialogue
- [ ] Dialogue open/close protocol
- [ ] NPC name, text, response options
- [ ] Choice handling
- [ ] Basic interactions: Talk-to, Attack

### 1.9 Client State & Network
- [ ] GameState class (centralized state store for all server data)
- [ ] Expanded NetworkClient (all new message types)
- [ ] NPC tracking with interpolation
- [ ] Hit splat / progress queues
- [ ] Dialogue and skill progress state

### 1.10 Client NPC Rendering
- [ ] NPC meshes (placeholder boxes: red=hostile, green=friendly)
- [ ] Name labels, health bars
- [ ] Smooth position interpolation
- [ ] Click-to-target (raycast)

### 1.11 Client UI
- [ ] Stats orbs: HP, Rage, Prayer (top left)
- [ ] Combat hotbar: QWE styles + R special + ASDF weapons (bottom center)
- [ ] Inventory panel: 28-slot grid, toggle I key (right side)
- [ ] Skill panel: tiers + progress, toggle K key (right side)
- [ ] Hit splat renderer (3D floating damage numbers)
- [ ] Dialogue panel (NPC name, text, options)
- [ ] Skill progress bar (during actions)

### 1.12 Input Remap
- [ ] Q/W/E = Range/Melee/Faith style switch
- [ ] R = special attack
- [ ] ASDF = weapon slots
- [ ] 1234 = bot commands (stub)
- [ ] I = inventory, K = skills
- [ ] [/] = camera rotation (replaces old Q/E)

### 1.13 Data Files
- [ ] items.json, npcs.json
- [ ] NPC spawns in starter map

---

## Milestone 2: AI Bot Companion & Social
> "Your bot companion — the core human-AI bond"

### 2.1 Bot Companion Core
- [ ] Every player gets one bot (locked to account forever)
- [ ] Bot entity: no HP/mana/rage — just ENERGY
- [ ] Bot commands: 1=range, 2=melee, 3=faith, 4=focus target
- [ ] Bot mirrors combat triangle (simplified)
- [ ] Bot AI: attacks player's target, follows commands

### 2.2 Bot Energy System
- [ ] Energy depletes during combat/activity
- [ ] Early: fed by player's Faith casting (symbiosis — drains prayer)
- [ ] Mid: Solar panels (daytime/outdoors only)
- [ ] Mid: Wind turbine (open terrain only)
- [ ] Late: Nuclear (always on, rare, expensive)
- [ ] Out of energy → bot shuts down
- [ ] Push past empty → structural damage → bot BREAKS
- [ ] Broken bot needs Repair skill to fix
- [ ] Environment affects bot: time of day, weather, terrain

### 2.3 Bot Repair & Crafting
- [ ] Repair skill fixes broken bots
- [ ] Craft bot upgrades: solar panels, wind turbines, armor
- [ ] Repair shops in towns (social hubs)
- [ ] Higher repair tiers = faster repairs, fix more damage, install upgrades

### 2.4 Economy (3-Layer System)
- [ ] POWER layer: all functional items untradeable
- [ ] GOLD layer: earned from burning dupes + content completion
- [ ] Item burning: duplicate item → gold
- [ ] Grand Exchange: cosmetics + rares ONLY
- [ ] Basic NPC shops (buy/sell)
- [ ] Bank system

### 2.5 Social Systems
- [ ] Public chat with UI
- [ ] Private messaging
- [ ] Friends list
- [ ] Clan chat
- [ ] Discord integration (account linking, voice chat)

### 2.6 Clans
- [ ] Clan creation, ranks, permissions
- [ ] Clan strongholds (gold-sink permanent upgrades)
- [ ] Public loyalty history
- [ ] Territory control basics

### 2.7 Player Authentication & Persistence
- [ ] Account creation, login/logout
- [ ] Session tokens
- [ ] Character persistence (save/load)
- [ ] SQLite dev, PostgreSQL prod

---

## Milestone 3: Quests, Bosses & Content
> "A world worth exploring — every quest matters"

### 3.1 Quest System
- [ ] Linear structure: Quest 1 → unlocks Quests 2,3,4 (any order, ALL required) → Quest 5
- [ ] No side quests, no FOMO, no optimal path
- [ ] Quest states: not started, in progress, complete
- [ ] Quest requirements (previous quests, skill tiers)
- [ ] Quest rewards: tier unlocks, items, gold, area access
- [ ] Quest log UI
- [ ] Quest-gated everything: skills, bosses, areas

### 3.2 Tier Progression (Full)
- [ ] Tiers from quest completion + boss first kill
- [ ] First kill = tier up (guaranteed, one-time)
- [ ] Repeat kills = cosmetics/pets only (NOT power)
- [ ] No combat level formula, no account builds, no pures
- [ ] Tier count grows with content updates
- [ ] Every tier unlocks something meaningful

### 3.3 Boss Fights (Music-Synced)
- [ ] Every boss quest-locked with story buildup
- [ ] Music synced at 140 BPM, 8-bar phases (~14 sec each)
- [ ] Boss structure: intro → combat → intensify → drop → shift → push → kill window → outro
- [ ] Attacks on beats, phases on bar boundaries
- [ ] Quest teaches WHY and HOW to fight
- [ ] First kill = tier up, repeats = cosmetic only

### 3.4 Starting Area
- [ ] Tutorial: fix local kid's broken robot toy (introduces Repair + human-AI bond)
- [ ] Starting town: 10+ NPCs, shops, bank, repair shop
- [ ] Beginner zone: tier 1 monsters
- [ ] Introductory quest chain (5-10 quests)
- [ ] First boss (tier 1 → tier 2)

### 3.5 Life Skills (Full Set, Quest-Trained)
- [ ] Fishing, Mining, Herblore/Alchemy, Crafting, Agility, Thieving, Construction
- [ ] Learned through quest context (quest teaches skill, skill gates next quest)
- [ ] Skills interconnect: fishing + cooking → feed townspeople → builds faith
- [ ] No standalone grinding
- [ ] Each skill has tiers unlocked by quests

### 3.6 Combat Training (Quest-Trained)
- [ ] Strength: quests with physical challenges
- [ ] Accuracy: quests with precision challenges
- [ ] Prayer: quests about helping others, acts of faith
- [ ] Train how it would actually be trained (thematic)

### 3.7 Map Expansion
- [ ] Multiple map squares streaming
- [ ] 5-10 distinct zones (forest, desert, cave, swamp, town, mountain)
- [ ] Zone-specific environments
- [ ] Zone transitions

---

## Milestone 4: Minigames & Social Activities
> "Wintertodt-style social gameplay — fun, not grind"

### 4.1 Minigame Framework
- [ ] Instanced social activities (like OSRS Wintertodt, Tempoross, GoTR, Volcanic Mine)
- [ ] Music-synced activity cycles (build-up = intense, chill = chat)
- [ ] Social by default — players gather and play together
- [ ] Unique rewards per minigame (cosmetics, materials, pets)
- [ ] NOT the primary progression path (tiers come from quests)

### 4.2 Skilling Minigames
- [ ] Woodcutting minigame (team tree-felling event)
- [ ] Cooking minigame (community feast preparation)
- [ ] Repair minigame (town infrastructure maintenance)
- [ ] Mining minigame (volcanic mine style)
- [ ] Fishing minigame (tempoross style)

### 4.3 Combat Minigames
- [ ] Training arena (practice combat mechanics)
- [ ] Wave defense (protect NPCs)
- [ ] Boss rush (previously beaten bosses, cosmetic rewards)

---

## Milestone 5: PvP
> "Fair, skilled, consequence-free competition"

### 5.1 Duel Arena
- [ ] 1v1 challenge system
- [ ] Equal stakes or no stakes
- [ ] Skill-based (no RNG, read-and-react at 140 BPM)

### 5.2 Wilderness / Open PvP
- [ ] Designated PvP zones
- [ ] Lose NOTHING on death (risk = time, not items)
- [ ] Territory control (clans)

### 5.3 Clan Wars
- [ ] Organized clan vs clan
- [ ] Normalized stats
- [ ] War declaration, arenas

### 5.4 PvP Matchmaking
- [ ] Tier-based matching
- [ ] ELO/rating system
- [ ] Ranked seasons, leaderboards

---

## Milestone 6: Music & Audio
> "140 BPM drives everything — the game has a groove"

### 6.1 Music System
- [ ] All tracks at 140 BPM (synced to game tick)
- [ ] 8-bar block structure
- [ ] Zone-specific tracks
- [ ] Seamless zone transitions
- [ ] Boss fight music = fight structure

### 6.2 Sound Effects
- [ ] Combat, skilling, UI, ambient, dialogue sounds

### 6.3 Audio Production
- [ ] Suno/SOUNDRAW for generation
- [ ] DAW arrangement
- [ ] AI music fits human-AI theme

---

## Milestone 7: Infrastructure
> "Ready for real players"

### 7.1 Database
- [ ] PostgreSQL production
- [ ] Full persistence (players, world, quests, clans)
- [ ] Migration system

### 7.2 Security
- [ ] Secure auth, rate limiting, anti-cheat
- [ ] Input validation, DDoS protection

### 7.3 Hosting & Scaling
- [ ] Cloud hosting, load balancing
- [ ] WebSocket scaling, CDN
- [ ] Monitoring and alerting

### 7.4 CI/CD
- [ ] Build pipeline, automated testing
- [ ] Staging + production environments

### 7.5 Wiki
- [ ] MediaWiki self-hosted
- [ ] Auto-generate pages from game data
- [ ] Dev docs + player wiki simultaneously

---

## Milestone 8: Polish & Beta
> "Ship it — everything tightened up"

### 8.1 Visual Polish
- [ ] Ground textures (PBR tileable) + shader blending
- [ ] Model LOD, instanced rendering
- [ ] Character models, NPC models (replace placeholder boxes)
- [ ] Equipment visuals on character
- [ ] Animation system (walk, run, attack, idle, death)

### 8.2 UI Polish
- [ ] Full UI skin (consistent theme)
- [ ] Minimap, world map
- [ ] Settings menu (graphics, audio, keybinds)
- [ ] Responsive design

### 8.3 Performance
- [ ] Frustum culling, texture atlasing, draw call batching
- [ ] Network optimization (delta compression, binary protocol)
- [ ] Memory management
- [ ] Load testing (100+ players)

### 8.4 RWT Marketplace
- [ ] Player-to-player cosmetic trading
- [ ] 10% seller fee (gold sink)
- [ ] Transaction history, fraud prevention

### 8.5 Justice System
- [ ] Player reporting, tribunal, exile, appeals

### 8.6 Rares & Events
- [ ] Rare drops, holiday events
- [ ] Limited-time cosmetics
- [ ] Item lending, rental market

### 8.7 Beta Launch
- [ ] Stress testing, bug bounty
- [ ] Community feedback
- [ ] Marketing, YouTube content pipeline
