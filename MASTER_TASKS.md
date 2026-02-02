# CLAWSCAPE - Master Task List

Building a RuneScape-like MMORPG from scratch in Three.js + Node.js.

Reference: Lost City codebase at `C:\Users\go\lostcity-ref`

---

# PHASE 0: FOUNDATION

## 0.1 Project Setup

- [x] **P0.1.1** Initialize monorepo structure (client/, server/, shared/)
- [x] **P0.1.2** Set up TypeScript configuration for all packages
- [ ] **P0.1.3** Set up ESLint + Prettier
- [x] **P0.1.4** Set up build scripts (esbuild or vite)
- [x] **P0.1.5** Create package.json for each package
- [x] **P0.1.6** Set up hot reload for development
- [ ] **P0.1.7** Create basic README with setup instructions
- [x] **P0.1.8** Set up GitHub repository
- [x] **P0.1.9** Create .gitignore

## 0.2 Client Foundation (Three.js)

- [x] **P0.2.1** Install Three.js and dependencies
- [x] **P0.2.2** Create basic HTML entry point
- [x] **P0.2.3** Initialize Three.js scene, camera, renderer
- [x] **P0.2.4** Create game loop (requestAnimationFrame)
- [x] **P0.2.5** Add window resize handling
- [x] **P0.2.6** Create basic ground plane
- [ ] **P0.2.7** Add orbit controls for debugging
- [x] **P0.2.8** Create isometric-style camera (RS perspective)
- [x] **P0.2.9** Add basic lighting

## 0.3 Server Foundation (Node.js)

- [x] **P0.3.1** Initialize Node.js server project
- [x] **P0.3.2** Set up WebSocket server (ws library)
- [x] **P0.3.3** Create basic connection handling
- [x] **P0.3.4** Create message protocol (JSON or binary)
- [x] **P0.3.5** Add heartbeat/ping-pong for connection health
- [x] **P0.3.6** Create game tick loop (600ms like RS)
- [ ] **P0.3.7** Set up SQLite for development database
- [ ] **P0.3.8** Create basic logging system

## 0.4 Shared Engine Foundation

- [x] **P0.4.1** Create shared types package
- [x] **P0.4.2** Define core entity interfaces (Player, NPC, Item, etc.)
- [x] **P0.4.3** Create coordinate system (tile-based)
- [x] **P0.4.4** Define network message types
- [x] **P0.4.5** Create shared constants (tick rate, tile size, etc.)

---

# PHASE 1: CORE GAMEPLAY

## 1.1 Player Movement

### Client
- [x] **P1.1.1** Create player entity class
- [x] **P1.1.2** Add click-to-move input handling
- [x] **P1.1.3** Display click marker on ground
- [x] **P1.1.4** Render player as placeholder cube/model
- [x] **P1.1.5** Smooth movement interpolation
- [x] **P1.1.6** Camera follow player

### Server
- [ ] **P1.1.7** Handle movement requests
- [ ] **P1.1.8** Validate movement (speed, distance)
- [ ] **P1.1.9** Broadcast position updates to nearby players
- [ ] **P1.1.10** Implement basic pathfinding (A*)

### Shared
- [ ] **P1.1.11** Movement validation logic
- [ ] **P1.1.12** Pathfinding algorithm

## 1.2 Multiplayer Sync

- [ ] **P1.2.1** Send player position to server
- [ ] **P1.2.2** Receive other players' positions
- [ ] **P1.2.3** Render other players
- [ ] **P1.2.4** Handle player join/leave
- [ ] **P1.2.5** Interpolate other players' movement
- [ ] **P1.2.6** Entity ID system
- [ ] **P1.2.7** Interest management (only sync nearby entities)

## 1.3 World/Map System

- [ ] **P1.3.1** Define tile format (height, texture, flags)
- [ ] **P1.3.2** Create map chunk system
- [ ] **P1.3.3** Load/save map data
- [ ] **P1.3.4** Render terrain tiles
- [ ] **P1.3.5** Collision map (walkable/blocked)
- [ ] **P1.3.6** Multi-level support (bridges, buildings)
- [ ] **P1.3.7** Chunk loading/unloading based on player position
- [ ] **P1.3.8** Basic map editor tool

## 1.4 Camera System

- [ ] **P1.4.1** RS-style isometric camera angle
- [ ] **P1.4.2** Camera rotation (compass directions)
- [ ] **P1.4.3** Zoom in/out
- [ ] **P1.4.4** Smooth camera transitions
- [ ] **P1.4.5** Camera collision (don't clip through walls)

---

# PHASE 2: PLAYER SYSTEMS

## 2.1 Account System

- [ ] **P2.1.1** Registration (username, password, email)
- [ ] **P2.1.2** Login authentication
- [ ] **P2.1.3** Password hashing (bcrypt)
- [ ] **P2.1.4** Session management
- [ ] **P2.1.5** Character creation screen
- [ ] **P2.1.6** Username validation (no duplicates, appropriate)
- [ ] **P2.1.7** Account recovery flow
- [ ] **P2.1.8** **ONE ACCOUNT ENFORCEMENT** - device/IP tracking

## 2.2 Player Stats

- [ ] **P2.2.1** Define all skills (Attack, Strength, Defence, etc.)
- [ ] **P2.2.2** XP and level calculation (RS formula)
- [ ] **P2.2.3** Store stats in database
- [ ] **P2.2.4** Sync stats to client
- [ ] **P2.2.5** Stats UI panel
- [ ] **P2.2.6** XP drops display
- [ ] **P2.2.7** Level up notification
- [ ] **P2.2.8** Total level calculation
- [ ] **P2.2.9** Combat level calculation

## 2.3 Inventory System

- [ ] **P2.3.1** 28-slot inventory structure
- [ ] **P2.3.2** Item definition format (id, name, stackable, etc.)
- [ ] **P2.3.3** Add/remove items
- [ ] **P2.3.4** Stack handling
- [ ] **P2.3.5** Inventory UI rendering
- [ ] **P2.3.6** Drag and drop items
- [ ] **P2.3.7** Drop items on ground
- [ ] **P2.3.8** Pick up ground items
- [ ] **P2.3.9** Use item on item
- [ ] **P2.3.10** Use item on object/NPC
- [ ] **P2.3.11** Item examine text
- [ ] **P2.3.12** **UNTRADEABLE by default** (SOUL: ironman for POWER)

## 2.4 Equipment System

- [ ] **P2.4.1** Equipment slots (head, chest, legs, weapon, etc.)
- [ ] **P2.4.2** Equip/unequip items
- [ ] **P2.4.3** Equipment requirements (level, quest)
- [ ] **P2.4.4** Equipment stats (attack, defence bonuses)
- [ ] **P2.4.5** Equipment UI panel
- [ ] **P2.4.6** Visual equipment on player model
- [ ] **P2.4.7** Attack styles (accurate, aggressive, defensive)

## 2.5 Bank System

- [ ] **P2.5.1** Large storage (800+ slots)
- [ ] **P2.5.2** Bank booth interaction
- [ ] **P2.5.3** Deposit/withdraw
- [ ] **P2.5.4** Bank tabs
- [ ] **P2.5.5** Search/filter
- [ ] **P2.5.6** Placeholders
- [ ] **P2.5.7** Bank UI

---

# PHASE 3: ECONOMY (SOUL.md Three Layers)

## 3.1 Gold System (Luxury Currency)

- [ ] **P3.1.1** Gold as separate currency (not tradeable P2P)
- [ ] **P3.1.2** Gold earning methods (duplicate burn, content)
- [ ] **P3.1.3** Gold spending on cosmetics
- [ ] **P3.1.4** Gold balance UI
- [ ] **P3.1.5** **Gold CANNOT buy power items**

## 3.2 Item Ownership (Ironman for POWER)

- [ ] **P3.2.1** All functional items are untradeable
- [ ] **P3.2.2** Items bound to account on acquire
- [ ] **P3.2.3** No P2P item trading system (intentionally omitted)
- [ ] **P3.2.4** "You earned it" philosophy enforcement

## 3.3 Grand Exchange (Luxury/Rares Only)

- [ ] **P3.3.1** GE building/interface
- [ ] **P3.3.2** List cosmetic items for gold
- [ ] **P3.3.3** List rares for gold
- [ ] **P3.3.4** Buy orders
- [ ] **P3.3.5** Sell orders
- [ ] **P3.3.6** Price history
- [ ] **P3.3.7** **NO functional gear on GE**

## 3.4 Official RWT Marketplace

- [ ] **P3.4.1** Gold ↔ Real money exchange interface
- [ ] **P3.4.2** **10% seller fee** implementation
- [ ] **P3.4.3** Payment processing integration
- [ ] **P3.4.4** Transaction history
- [ ] **P3.4.5** Payout system for sellers
- [ ] **P3.4.6** Fraud prevention
- [ ] **P3.4.7** Price floor/ceiling mechanics

## 3.5 Item Lending (Rental Market)

- [ ] **P3.5.1** Lend item interface
- [ ] **P3.5.2** Set rental price
- [ ] **P3.5.3** Borrower limit: ONE item at a time
- [ ] **P3.5.4** **15% house cut** on rental fees
- [ ] **P3.5.5** Lender receives 85%
- [ ] **P3.5.6** Recall item anytime
- [ ] **P3.5.7** Rental duration tracking
- [ ] **P3.5.8** Lent items cannot be dropped/lost

## 3.6 Duplicate Burning

- [ ] **P3.6.1** Burn duplicate items for gold
- [ ] **P3.6.2** Gold value calculation per item
- [ ] **P3.6.3** Burn confirmation
- [ ] **P3.6.4** Item sink tracking

---

# PHASE 4: COMBAT SYSTEM

## 4.1 PvE Combat Core

- [ ] **P4.1.1** Combat tick system (600ms)
- [ ] **P4.1.2** Attack animations
- [ ] **P4.1.3** Damage calculation (RS formula)
- [ ] **P4.1.4** Hitsplats display
- [ ] **P4.1.5** Health bars
- [ ] **P4.1.6** Death handling
- [ ] **P4.1.7** Combat XP rewards
- [ ] **P4.1.8** Auto-retaliate option
- [ ] **P4.1.9** Run away / retreat

## 4.2 Prayer System

- [ ] **P4.2.1** Prayer points
- [ ] **P4.2.2** Prayer drain
- [ ] **P4.2.3** Protection prayers
- [ ] **P4.2.4** Stat boost prayers
- [ ] **P4.2.5** Prayer UI
- [ ] **P4.2.6** Altars to recharge
- [ ] **P4.2.7** Prayer switching (tick-perfect)

## 4.3 Magic System

- [ ] **P4.3.1** Spellbook interface
- [ ] **P4.3.2** Rune requirements
- [ ] **P4.3.3** Combat spells
- [ ] **P4.3.4** Utility spells (teleports)
- [ ] **P4.3.5** Spell animations/effects
- [ ] **P4.3.6** Magic accuracy/damage calculation

## 4.4 Ranged System

- [ ] **P4.4.1** Ammunition system
- [ ] **P4.4.2** Ranged weapons (bows, crossbows)
- [ ] **P4.4.3** Projectile animations
- [ ] **P4.4.4** Ranged accuracy/damage calculation

## 4.5 Special Attacks

- [ ] **P4.5.1** Special attack energy bar
- [ ] **P4.5.2** Weapon special attacks
- [ ] **P4.5.3** Special attack effects
- [ ] **P4.5.4** Energy regeneration

---

# PHASE 5: PVP SYSTEMS (SOUL.md Three Modes)

## 5.1 Duel Arena (Skill-Based, No RNG)

- [ ] **P5.1.1** Duel challenge interface
- [ ] **P5.1.2** **Equal stakes requirement**
- [ ] **P5.1.3** Arena instance creation
- [ ] **P5.1.4** **NO RNG** - hits always land
- [ ] **P5.1.5** Fixed damage values
- [ ] **P5.1.6** **One-click gear switches** (anti-AHK)
- [ ] **P5.1.7** Prayer switching mechanics
- [ ] **P5.1.8** NH bridding support
- [ ] **P5.1.9** Stakes transfer on win
- [ ] **P5.1.10** Match history/stats

## 5.2 Wilderness (Territory Control)

- [ ] **P5.2.1** Wilderness zone boundaries
- [ ] **P5.2.2** PvP enabled in wilderness
- [ ] **P5.2.3** **Players lose NOTHING on death**
- [ ] **P5.2.4** Territory zones with resources
- [ ] **P5.2.5** Territory control mechanics
- [ ] **P5.2.6** Best skilling spots in dangerous zones
- [ ] **P5.2.7** Best bosses in dangerous zones
- [ ] **P5.2.8** Clan territory claiming
- [ ] **P5.2.9** Respawn at edge of wilderness

## 5.3 Clan Wars (Normalized Combat)

- [ ] **P5.3.1** Clan Wars portal/arena
- [ ] **P5.3.2** **Everyone normalized** - same level, same items
- [ ] **P5.3.3** Team assignment
- [ ] **P5.3.4** Match types (last team standing, CTF, etc.)
- [ ] **P5.3.5** **Honor Points** reward currency
- [ ] **P5.3.6** Honor Points shop (cosmetics only)
- [ ] **P5.3.7** Match history
- [ ] **P5.3.8** Clan rankings

---

# PHASE 6: SKILLS

## 6.1 Skill Core System

- [ ] **P6.1.1** Skill action framework
- [ ] **P6.1.2** **Tick manipulation support** (3-tick, 2-tick, etc.)
- [ ] **P6.1.3** **Massive XP rewards for tick-perfect play** (3x, not 10%)
- [ ] **P6.1.4** Tool tier system (bronze → dragon)
- [ ] **P6.1.5** Resource depletion/respawn

## 6.2 Gathering Skills

### Woodcutting
- [ ] **P6.2.1** Tree objects
- [ ] **P6.2.2** Axe requirements
- [ ] **P6.2.3** Log types
- [ ] **P6.2.4** Tree respawn
- [ ] **P6.2.5** Bird nests (rare)

### Mining
- [ ] **P6.2.6** Rock objects
- [ ] **P6.2.7** Pickaxe requirements
- [ ] **P6.2.8** Ore types
- [ ] **P6.2.9** Rock respawn
- [ ] **P6.2.10** Gem finding

### Fishing
- [ ] **P6.2.11** Fishing spots
- [ ] **P6.2.12** Fishing equipment
- [ ] **P6.2.13** Fish types
- [ ] **P6.2.14** Spot movement

## 6.3 Production Skills

### Smithing
- [ ] **P6.3.1** Furnace smelting
- [ ] **P6.3.2** Anvil smithing
- [ ] **P6.3.3** Bar types
- [ ] **P6.3.4** Equipment crafting

### Cooking
- [ ] **P6.3.5** Range/fire cooking
- [ ] **P6.3.6** Food healing values
- [ ] **P6.3.7** Burn chance

### Crafting
- [ ] **P6.3.8** Leather crafting
- [ ] **P6.3.9** Jewelry crafting
- [ ] **P6.3.10** Pottery

### Fletching
- [ ] **P6.3.11** Bow making
- [ ] **P6.3.12** Arrow making
- [ ] **P6.3.13** Crossbow making

### Herblore
- [ ] **P6.3.14** Herb cleaning
- [ ] **P6.3.15** Potion making
- [ ] **P6.3.16** Potion effects

### Runecrafting
- [ ] **P6.3.17** Rune essence mining
- [ ] **P6.3.18** Altar crafting
- [ ] **P6.3.19** Multiple runes at high level

## 6.4 Support Skills

### Agility
- [ ] **P6.4.1** Agility courses
- [ ] **P6.4.2** Obstacles
- [ ] **P6.4.3** Run energy restoration bonus
- [ ] **P6.4.4** Shortcuts

### Thieving
- [ ] **P6.4.5** Pickpocketing NPCs
- [ ] **P6.4.6** Stall thieving
- [ ] **P6.4.7** Chests
- [ ] **P6.4.8** Stun on fail

### Slayer
- [ ] **P6.4.9** Slayer masters
- [ ] **P6.4.10** Task assignment
- [ ] **P6.4.11** Slayer-only monsters
- [ ] **P6.4.12** Slayer points
- [ ] **P6.4.13** Slayer equipment

### Hunter
- [ ] **P6.4.14** Trap types
- [ ] **P6.4.15** Creature tracking
- [ ] **P6.4.16** Impling catching

### Farming
- [ ] **P6.4.17** Farming patches
- [ ] **P6.4.18** Seed planting
- [ ] **P6.4.19** Growth cycles
- [ ] **P6.4.20** Disease/protection

### Construction
- [ ] **P6.4.21** Player-owned house
- [ ] **P6.4.22** Room building
- [ ] **P6.4.23** Furniture building
- [ ] **P6.4.24** House utilities (altar, portal, etc.)

---

# PHASE 7: NPCs & MONSTERS

## 7.1 NPC System

- [ ] **P7.1.1** NPC definition format
- [ ] **P7.1.2** NPC spawning
- [ ] **P7.1.3** NPC pathfinding
- [ ] **P7.1.4** NPC interaction (talk, trade, etc.)
- [ ] **P7.1.5** NPC animations

## 7.2 Dialogue System

- [ ] **P7.2.1** Dialogue trees
- [ ] **P7.2.2** Player response options
- [ ] **P7.2.3** Dialogue UI (chat box)
- [ ] **P7.2.4** Dialogue conditions (quest state, items, etc.)
- [ ] **P7.2.5** Dialogue scripting language

## 7.3 Shop System

- [ ] **P7.3.1** Shop interface
- [ ] **P7.3.2** Shop stock
- [ ] **P7.3.3** Buy/sell (for gold - luxury items only)
- [ ] **P7.3.4** Stock regeneration
- [ ] **P7.3.5** Specialty shops

## 7.4 Monster System

- [ ] **P7.4.1** Monster definitions (stats, drops)
- [ ] **P7.4.2** Monster AI (aggro, wander, return)
- [ ] **P7.4.3** Monster spawning
- [ ] **P7.4.4** Monster combat
- [ ] **P7.4.5** Boss mechanics (special attacks, phases)

## 7.5 Drop System (SOUL.md)

- [ ] **P7.5.1** Drop table structure
- [ ] **P7.5.2** Common/uncommon/rare tiers
- [ ] **P7.5.3** **Stackable Loot Boxes** - monsters drop boxes, not items
- [ ] **P7.5.4** Loot box opening interface
- [ ] **P7.5.5** **Rare drop choice** - pet OR item, player decides
- [ ] **P7.5.6** Pet system (soulbound, permanent)
- [ ] **P7.5.7** Already have pet? Auto-receive item
- [ ] **P7.5.8** **PvM drops unique items, NOT skilling resources**

---

# PHASE 8: AI COMPANIONS (SOUL.md)

## 8.1 Companion Core

- [ ] **P8.1.1** Companion entity system
- [ ] **P8.1.2** **Locked to account forever** - cannot be changed
- [ ] **P8.1.3** Companion follows player
- [ ] **P8.1.4** Companion appearance customization (initial)
- [ ] **P8.1.5** Companion naming

## 8.2 Companion Abilities

- [ ] **P8.2.1** Gathering assistance (woodcutting, mining, fishing)
- [ ] **P8.2.2** Inventory management help
- [ ] **P8.2.3** **NOT usable in dangerous content**
- [ ] **P8.2.4** Skill-based efficiency (levels up with you)
- [ ] **P8.2.5** **Can trade with companion** (inventory exchange)

## 8.3 Companion Personality

- [ ] **P8.3.1** Personality traits system
- [ ] **P8.3.2** Companion dialogue/reactions
- [ ] **P8.3.3** Grows with player over time
- [ ] **P8.3.4** Memories of adventures

## 8.4 Companion Cosmetics

- [ ] **P8.4.1** Companion skins (purchasable with gold)
- [ ] **P8.4.2** Companion accessories
- [ ] **P8.4.3** Companion animations

---

# PHASE 9: CLANS (SOUL.md)

## 9.1 Clan Core

- [ ] **P9.1.1** Clan creation
- [ ] **P9.1.2** Clan name/tag
- [ ] **P9.1.3** Clan ranks/permissions
- [ ] **P9.1.4** Invite/kick members
- [ ] **P9.1.5** Clan chat channel
- [ ] **P9.1.6** Clan list UI

## 9.2 Clan Strongholds

- [ ] **P9.2.1** Stronghold location claiming
- [ ] **P9.2.2** **Gold burns into PERMANENT upgrades** (cannot withdraw)
- [ ] **P9.2.3** Building construction (forge, altar, portal)
- [ ] **P9.2.4** Upgrade tiers
- [ ] **P9.2.5** **XP boosts from upgraded buildings**
- [ ] **P9.2.6** **Damage boosts on monsters**
- [ ] **P9.2.7** Stronghold visuals (grows over time)
- [ ] **P9.2.8** **Benefits only while IN clan**

## 9.3 Clan Loyalty System (SOUL.md)

- [ ] **P9.3.1** **PUBLIC clan history** per player
- [ ] **P9.3.2** Track: clans joined, time stayed, left vs kicked
- [ ] **P9.3.3** **History follows forever**
- [ ] **P9.3.4** Visual loyalty indicators
- [ ] **P9.3.5** New member limitations (earn trust over time)
- [ ] **P9.3.6** Long-term member benefits

## 9.4 Territory Control

- [ ] **P9.4.1** Wilderness zone ownership
- [ ] **P9.4.2** Territory claiming mechanics
- [ ] **P9.4.3** Territory benefits (exclusive resources)
- [ ] **P9.4.4** Territory wars
- [ ] **P9.4.5** Territory map UI

---

# PHASE 10: QUESTS

## 10.1 Quest System

- [ ] **P10.1.1** Quest definition format
- [ ] **P10.1.2** Quest stages/progress
- [ ] **P10.1.3** Quest requirements (skills, items, other quests)
- [ ] **P10.1.4** Quest journal UI
- [ ] **P10.1.5** Quest rewards
- [ ] **P10.1.6** Quest points

## 10.2 Quest Scripting

- [ ] **P10.2.1** Quest scripting language/system
- [ ] **P10.2.2** Cutscenes
- [ ] **P10.2.3** Quest-specific instances
- [ ] **P10.2.4** Quest NPCs/objects
- [ ] **P10.2.5** Quest items

## 10.3 Initial Quests

- [ ] **P10.3.1** Tutorial quest
- [ ] **P10.3.2** 5-10 starter quests
- [ ] **P10.3.3** Quest testing framework

---

# PHASE 11: SOCIAL SYSTEMS

## 11.1 Chat System

- [ ] **P11.1.1** Public chat
- [ ] **P11.1.2** Private messages
- [ ] **P11.1.3** Clan chat
- [ ] **P11.1.4** **X.com level freedom of speech**
- [ ] **P11.1.5** **No links allowed** (safety)
- [ ] **P11.1.6** Chat history
- [ ] **P11.1.7** Chat filtering (optional client-side)

## 11.2 Friends System

- [ ] **P11.2.1** Friends list
- [ ] **P11.2.2** Add/remove friends
- [ ] **P11.2.3** Online status
- [ ] **P11.2.4** Ignore list

## 11.3 Discord Integration (SOUL.md)

- [ ] **P11.3.1** Link Discord account
- [ ] **P11.3.2** Add players to Discord from game
- [ ] **P11.3.3** Discord VC support for clans/parties
- [ ] **P11.3.4** Discord activity status

---

# PHASE 12: JUSTICE SYSTEM (SOUL.md)

## 12.1 Exile System

- [ ] **P12.1.1** Exile status flag
- [ ] **P12.1.2** **Can still log in and play**
- [ ] **P12.1.3** **Cannot trade**
- [ ] **P12.1.4** **Cannot speak**
- [ ] **P12.1.5** **Cannot join clans**
- [ ] **P12.1.6** Visual exile indicator
- [ ] **P12.1.7** Exile duration (temporary vs permanent)

## 12.2 Player Tribunal

- [ ] **P12.2.1** Report system
- [ ] **P12.2.2** Evidence collection
- [ ] **P12.2.3** Tribunal case queue
- [ ] **P12.2.4** Community voting interface
- [ ] **P12.2.5** Verdict execution
- [ ] **P12.2.6** **Public trial records**
- [ ] **P12.2.7** **False accusation consequences**
- [ ] **P12.2.8** Tribunal eligibility requirements

---

# PHASE 13: RARES SYSTEM (SOUL.md)

## 13.1 Rare Drops

- [ ] **P13.1.1** Rare item definitions
- [ ] **P13.1.2** **Surprise drop system** - no advance announcement
- [ ] **P13.1.3** Event scheduling (hidden from players)
- [ ] **P13.1.4** **24-hour window max**
- [ ] **P13.1.5** Drop to all online players at moment
- [ ] **P13.1.6** **Miss it = miss it forever**

## 13.2 Rare Trading

- [ ] **P13.2.1** Rares tradeable on GE
- [ ] **P13.2.2** Rares tradeable for gold
- [ ] **P13.2.3** Price tracking
- [ ] **P13.2.4** **Free market chaos** - monopolies allowed

---

# PHASE 14: EVENTS & CONTENT

## 14.1 Holiday Events (SOUL.md)

- [ ] **P14.1.1** Event framework
- [ ] **P14.1.2** Easter event
- [ ] **P14.1.3** 4th of July event
- [ ] **P14.1.4** Halloween event
- [ ] **P14.1.5** Thanksgiving event
- [ ] **P14.1.6** Christmas event
- [ ] **P14.1.7** Holiday rewards (cosmetics)

## 14.2 Feast Days (SOUL.md)

- [ ] **P14.2.1** Feast day calendar
- [ ] **P14.2.2** Subtle reminders (on by default)
- [ ] **P14.2.3** Opt-out setting
- [ ] **P14.2.4** Small visual nods

## 14.3 Weekly Rosary (SOUL.md - Discord)

- [ ] **P14.3.1** Discord event scheduling
- [ ] **P14.3.2** Participation tracking
- [ ] **P14.3.3** **Spiritual Currency** reward
- [ ] **P14.3.4** Cannot be bought, only earned
- [ ] **P14.3.5** Spiritual Currency shop (wings, halos, holy cosmetics)

## 14.4 Whip Tournaments (SOUL.md)

- [ ] **P14.4.1** **Funded by burned fees** (15% lending fees, etc.)
- [ ] **P14.4.2** **Free entry** (not gambling)
- [ ] **P14.4.3** RNG whip fights
- [ ] **P14.4.4** Bracket system
- [ ] **P14.4.5** **Everyone wins something**
- [ ] **P14.4.6** Top placers win biggest shares

---

# PHASE 15: UI & POLISH

## 15.1 Game UI

- [ ] **P15.1.1** Main game interface layout
- [ ] **P15.1.2** Minimap
- [ ] **P15.1.3** Chat box
- [ ] **P15.1.4** Inventory panel
- [ ] **P15.1.5** Equipment panel
- [ ] **P15.1.6** Stats panel
- [ ] **P15.1.7** Prayer panel
- [ ] **P15.1.8** Magic panel
- [ ] **P15.1.9** Settings panel
- [ ] **P15.1.10** Quest panel
- [ ] **P15.1.11** Clan panel
- [ ] **P15.1.12** Friends panel

## 15.2 Login/Menu UI

- [ ] **P15.2.1** Title screen
- [ ] **P15.2.2** Login screen
- [ ] **P15.2.3** Character creation
- [ ] **P15.2.4** World selection
- [ ] **P15.2.5** Settings menu

## 15.3 Audio

- [ ] **P15.3.1** Audio system setup
- [ ] **P15.3.2** Sound effects
- [ ] **P15.3.3** Music system
- [ ] **P15.3.4** Ambient sounds
- [ ] **P15.3.5** Volume controls

## 15.4 Visual Polish

- [ ] **P15.4.1** Particle effects
- [ ] **P15.4.2** Combat effects
- [ ] **P15.4.3** Spell effects
- [ ] **P15.4.4** Weather system
- [ ] **P15.4.5** Day/night cycle
- [ ] **P15.4.6** Lighting improvements

---

# PHASE 16: INFRASTRUCTURE

## 16.1 Database

- [ ] **P16.1.1** Production database (Postgres)
- [ ] **P16.1.2** Database schema design
- [ ] **P16.1.3** Migrations system
- [ ] **P16.1.4** Backup system
- [ ] **P16.1.5** Data integrity checks

## 16.2 Deployment

- [ ] **P16.2.1** Server hosting setup
- [ ] **P16.2.2** CI/CD pipeline
- [ ] **P16.2.3** Domain/SSL
- [ ] **P16.2.4** Load balancing
- [ ] **P16.2.5** Multiple world servers

## 16.3 Security

- [ ] **P16.3.1** Anti-cheat system
- [ ] **P16.3.2** Rate limiting
- [ ] **P16.3.3** Input validation
- [ ] **P16.3.4** SQL injection prevention
- [ ] **P16.3.5** XSS prevention
- [ ] **P16.3.6** DDoS protection

## 16.4 Monitoring

- [ ] **P16.4.1** Server metrics
- [ ] **P16.4.2** Error tracking
- [ ] **P16.4.3** Player analytics
- [ ] **P16.4.4** Economy monitoring
- [ ] **P16.4.5** Alerting system

---

# CONTENT PHASES (Post-Launch)

## Content Phase A: Starting Area

- [ ] Complete starting town
- [ ] 10 unique NPCs
- [ ] 5 starter quests
- [ ] Beginner monsters (levels 1-20)
- [ ] Basic resources

## Content Phase B: Expansion Areas

- [ ] Second region
- [ ] Third region
- [ ] Mid-level content (20-50)
- [ ] New skills content

## Content Phase C: Endgame

- [ ] High-level areas
- [ ] Bosses
- [ ] Raids
- [ ] Endgame gear

---

# SUMMARY

| Phase | Tasks | Focus |
|-------|-------|-------|
| 0 | ~25 | Foundation |
| 1 | ~30 | Core Gameplay |
| 2 | ~45 | Player Systems |
| 3 | ~35 | Economy |
| 4 | ~35 | Combat |
| 5 | ~25 | PvP |
| 6 | ~50 | Skills |
| 7 | ~25 | NPCs/Monsters |
| 8 | ~20 | AI Companions |
| 9 | ~25 | Clans |
| 10 | ~15 | Quests |
| 11 | ~15 | Social |
| 12 | ~15 | Justice |
| 13 | ~10 | Rares |
| 14 | ~15 | Events |
| 15 | ~30 | UI/Polish |
| 16 | ~20 | Infrastructure |
| **TOTAL** | **~435** | |

---

*This is your roadmap. Every SOUL.md feature is in here.*
