# Ocenoid Development Plan

## Vision
Ocenoid is a 4-player LAN ocean-survival sandbox. Players begin together on a boat, gather resources from the ocean, underwater areas, floating debris, and islands, then craft vehicles, tools, buildings, and other structures. Islands contain NPC settlements with trading and eventually autonomous decision-making.

## Architecture

- **Client:** React + TypeScript + Three.js + React Three Fiber + Drei + GSAP
- **Networking:** Node.js + TypeScript + WebSocket
- **Shared:** TypeScript network/game-state contracts
- **AI services:** Python + FastAPI + NumPy (future)
- **3D pipeline:** Blender → GLB/glTF → game client
- **Source control:** GitHub

## Phase 1 — Multiplayer Foundation

### 1A — LAN connectivity — COMPLETE
- [x] Node.js WebSocket server
- [x] Client/server connection
- [x] Unique player IDs
- [x] Maximum 4 concurrent players
- [x] Player join/leave snapshots
- [x] Cross-computer LAN connectivity
- [x] Basic WASD movement synchronization

### 1B — Networked movement — COMPLETE
- [x] Server-authoritative movement validation
- [x] Fixed-rate network snapshots (20 Hz)
- [x] Client-side interpolation
- [x] Input/state separation
- [x] Basic latency handling through interpolation
- [x] Disconnect/reconnect behavior
- [x] Automated 4-player protocol test
- [x] Movement invariant tests

### Phase 1 verification
- [x] LAN multiplayer verified across different computers
- [x] 2 movement tests passed
- [x] Automated multiplayer integration test passed
- [x] 4-player limit verified
- [x] Reconnect after disconnect verified

## Phase 2 — Player & Boat — CURRENT

- [ ] Import Blender character as GLB
- [ ] Character skeleton/rig
- [ ] Third-person camera
- [ ] Idle/walk/run animations
- [ ] Player spawning on the starting boat
- [ ] Boat collision and walkable deck
- [ ] Player names/identifiers
- [ ] Basic interaction system

## Phase 3 — Ocean World

- [ ] Procedural/large ocean surface
- [ ] Waves and water shader
- [ ] Underwater rendering
- [ ] Diving and swimming
- [ ] Floating debris/resource nodes
- [ ] Day/night cycle
- [ ] Ocean boundaries/world streaming

## Phase 4 — Resources & Crafting

- [ ] Resource taxonomy
- [ ] Wood, stone, metal, fiber, etc.
- [ ] Gathering interactions
- [ ] Inventory
- [ ] Crafting recipes
- [ ] Tools
- [ ] Resource-based structural construction
- [ ] Durability/repair

## Phase 5 — Islands

- [ ] Generate islands from the 2D world map
- [ ] Detailed Blender island assets
- [ ] Beaches and underwater coastlines
- [ ] Vegetation
- [ ] Terrain resources
- [ ] Island points of interest
- [ ] Structures and settlements

## Phase 6 — NPCs & Economy

- [ ] NPC navigation
- [ ] Needs/goals/state model
- [ ] NPC memory
- [ ] Resource production
- [ ] Trading system
- [ ] Currency
- [ ] Dynamic prices
- [ ] Autonomous NPC decisions
- [ ] Python AI service integration where justified

## Phase 7 — Vehicles & Advanced Building

- [ ] Rafts
- [ ] Small boats
- [ ] Larger ships
- [ ] Vehicle physics
- [ ] Modular ship construction
- [ ] Storage
- [ ] Engines/sails
- [ ] Advanced structures

## Phase 8 — Survival & Game Systems

- [ ] Health
- [ ] Hunger/thirst
- [ ] Temperature/environment effects
- [ ] Equipment
- [ ] Weather
- [ ] Storms
- [ ] Ocean hazards
- [ ] Save/load world state

## Phase 9 — Polish

- [ ] Final character customization
- [ ] Textures/materials
- [ ] Animation polish
- [ ] Audio
- [ ] UI/HUD
- [ ] Performance optimization
- [ ] Network optimization
- [ ] Multiplayer stress testing
- [ ] Packaging/distribution

## Current Milestone

**Phase 2 — Player & Boat.**

Phase 1 multiplayer foundation is complete and verified. The next milestone is to replace the temporary player primitive with the Blender character asset, establish a third-person controller and camera, then place all four players on the starting boat with proper collision and interaction foundations.
