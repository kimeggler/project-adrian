# Little Knight – Requirements

A small, lightweight, browser-based 2D jump-and-run arcade game in the style of classic handheld platformers, with a colorful 8-bit retro look.

> **For Claude Code:** Build this phase by phase, following the "Implementation Phases" section. Finish a phase and make sure it meets its acceptance criteria before you start the next one. Don't build Prio 2 features until the MVP (phases 1–6) is done. Keep tunable values in `src/game/config.ts`, not hard-coded.

---

## 1. Tech Stack

| Area | Choice | Notes |
|---|---|---|
| Framework | **Next.js** (App Router, TypeScript) | Hosts the landing page and the game page. |
| Game engine | **Phaser 3** | Arcade physics, tilemaps, input, audio, scenes. |
| Rendering | `<canvas>` via Phaser, **client-only** | Load the game component with `dynamic(() => import(...), { ssr: false })`. Phaser must never run on the server (no `window`). |
| Sound effects | **jsfxr / sfxr** | Generate retro sounds. Export them as `.wav`/`.ogg` into `public/audio/`, or generate them at runtime. |
| Art | Pixel art made in Aseprite, or CC0 asset packs (e.g. Kenney.nl) | Use placeholder rectangles until phase 5. |
| Persistence | `localStorage` | No backend for the MVP. |
| Styling (landing page) | Tailwind CSS or CSS modules | Use a pixel font (e.g. "Press Start 2P" from Google Fonts). |

### Legal constraints
- **No Minecraft, Nintendo or other copyrighted assets.** That means no sounds, sprites, music, names or logos. Every asset must be self-made, generated (jsfxr), or clearly licensed (CC0/CC-BY, with credits).
- Keep an `ASSETS_CREDITS.md` that lists the source and license of every asset.

---

## 2. Core Technical Rules

### 2.1 Rendering (pixel-perfect)
- Internal resolution: **256×144** (16:9). Tile size: **16×16 px**, so a screen is 16×9 tiles.
- Scale up by **integer factors only** (Phaser `Scale.FIT` plus integer zoom, or a custom resize handler). Letterbox any space left over.
- Set `pixelArt: true` and `roundPixels: true` in the Phaser config, and `image-rendering: pixelated` on the canvas.

### 2.2 Game loop and physics
- Use Phaser Arcade Physics with a **fixed timestep** (`fps: 60`, `fixedStep: true`) so the game behaves the same on 60 Hz, 120 Hz and 144 Hz displays.
- Collision is AABB against a tile layer. It must handle landing on top of tiles, blocking from the sides, and bumping into ceilings.
- Guard against tunneling: cap the maximum fall speed (e.g. 400 px/s).

### 2.3 Physics constants (starting values, all in `config.ts`)
```ts
GRAVITY          = 900   // px/s²
RUN_SPEED        = 90    // px/s
ACCELERATION     = 600   // px/s² (ground)
AIR_CONTROL      = 0.8   // multiplier on acceleration in the air
JUMP_VELOCITY    = -330  // px/s  -> max jump height ≈ 60 px ≈ 3.75 tiles
JUMP_CUT_FACTOR  = 0.5   // velocity multiplier when jump is released early
MAX_FALL_SPEED   = 400   // px/s
COYOTE_TIME_MS   = 100
JUMP_BUFFER_MS   = 120
```
The level generator **must derive** its limits (max gap width, max step height) from these constants. That way, tweaking the physics can't create unbeatable levels without anyone noticing.

### 2.4 Audio
- Browsers block audio until the user interacts with the page. **Unlock or resume the audio context when the player clicks "Start game"** on the landing page.
- Use separate volume channels for SFX and music, plus a global mute.

---

## 3. Requirements

Priorities: **P0 = MVP (must have)**, **P1 = MVP polish (should have)**, **P2 = after MVP**.

### 3.1 Player and controls
| ID | Prio | Requirement |
|---|---|---|
| PL-1 | P0 | The player character is a **small knight (child)**. |
| PL-2 | P0 | Move left/right with ←/→ and A/D. Jump with Space, W or ↑. |
| PL-3 | P0 | **Variable jump height:** holding jump longer jumps higher. Releasing early multiplies upward velocity by `JUMP_CUT_FACTOR`. |
| PL-4 | P0 | **Coyote time:** the player can still jump for `COYOTE_TIME_MS` after walking off a ledge. |
| PL-5 | P0 | **Jump buffering:** a jump pressed up to `JUMP_BUFFER_MS` before landing is carried out on landing. |
| PL-6 | P0 | Animation states: idle, run, jump, fall, hurt. (Attack comes with combat in P2.) |
| PL-7 | P1 | **Mobile touch controls:** on-screen left/right/jump buttons, shown automatically on touch devices. |
| PL-8 | P1 | **Gamepad support** via the Gamepad API (D-pad or left stick to move, A to jump). |
| PL-9 | P2 | Attack button (J or X key, gamepad B) for the sword. |

### 3.2 World and levels
| ID | Prio | Requirement |
|---|---|---|
| WO-1 | P0 | **Randomized worlds** with a fixed level length (default 200 tiles wide, 9 tiles high), closed off by solid walls at the left and right ends. |
| WO-2 | P0 | A **camera scrolls horizontally** and follows the player (with a small deadzone), clamped to the level bounds. |
| WO-3 | P0 | **Obstacles** (blocks, pillars, platforms) that the player can jump over or onto. |
| WO-4 | P0 | **Level-end flag:** touching it completes the level and shows a level-complete screen (score, time, coins) with a "Next level" button. |
| WO-5 | P0 | **Seeded generation:** every level comes from a numeric seed and the same seed always produces the same level. Show the seed on the level-complete and pause screens. Allow loading a seed through a URL parameter (`?seed=4821`). |
| WO-6 | P0 | **Rule-based generation with a reachability check** (see 3.3). |
| WO-7 | P0 | **Hazards:** pits (falling out of the level) and spikes. |
| WO-8 | P1 | **Checkpoints** halfway through the level (a flag the player activates on contact; respawn there). |
| WO-9 | P1 | **Parallax background** with 2–3 layers scrolling at different speeds. |
| WO-10 | P2 | Moving platforms, breakable blocks, hidden bonus blocks. |
| WO-11 | P2 | **Daily challenge:** a seed derived from the current date (UTC), the same for everyone. Leaderboard is out of scope (see section 5). |

### 3.3 Level generator rules
- Use a seeded PRNG (e.g. mulberry32 or sfc32). **Never use `Math.random()`** in generation.
- Generate left to right in segments: flat ground, step up/down, gap, platform, obstacle block, coin cluster, and later enemy spawn.
- Hard limits, derived from the physics constants with a safety margin of about 75 %:
  - **Max step height** = `floor(maxJumpHeight / TILE * 0.8)` (≈ 3 tiles)
  - **Max gap width** = `floor(maxJumpDistance / TILE * 0.75)` (≈ 3 tiles)
  - Keep at least 3 tiles of headroom above any landing spot.
- The first 8 tiles (spawn area) and last 8 tiles (flag area) are always flat and safe.
- **Reachability check after generation:** simulate the possible jumps (or run a BFS over standable tiles using the jump arc) from spawn to the flag. If the flag can't be reached, regenerate with `seed + n` and log it in development.
- Difficulty parameters (gap frequency, hazard density, and enemy density later) are passed in per level number.
- Write unit tests for the generator: 1,000 seeds must all produce reachable levels.

### 3.4 Gameplay systems
| ID | Prio | Requirement |
|---|---|---|
| GP-1 | P0 | **Lives and hearts:** e.g. 3 hearts per life and 3 lives. Spikes cost 1 heart, pits cost a whole life. |
| GP-2 | P0 | **Game-over screen** with "Retry level" and "Back to menu". |
| GP-3 | P0 | **Coins and score.** Coins are placed by the generator. Score = coins + a time bonus. |
| GP-4 | P0 | HUD showing hearts, lives, coins, score and level number. |
| GP-5 | P1 | **Pause menu** (Esc or P, or a button on mobile): resume, restart level, settings, quit to menu. |
| GP-6 | P1 | **Restart level** keeps the same seed. |

### 3.5 Game feel ("juice")
| ID | Prio | Requirement |
|---|---|---|
| GF-1 | P1 | Dust particles on landing and when changing direction. |
| GF-2 | P1 | Small screen shake when hit (can be turned off in settings). |
| GF-3 | P1 | Squash and stretch on the knight's sprite when jumping and landing. |
| GF-4 | P1 | Brief hit-flash and invincibility frames after taking damage (~1 s). |

### 3.6 Audio
| ID | Prio | Requirement |
|---|---|---|
| AU-1 | P1 | jsfxr sound effects: jump, land, coin, hurt, death, checkpoint, level complete, menu select. |
| AU-2 | P1 | Audio unlocks when "Start game" is clicked. |
| AU-3 | P2 | Sword swing, enemy hit, power-up pickup and power-up expiring. |
| AU-4 | P2 | Background chiptune music loop (self-made or CC0). |

### 3.7 Landing page and menus
| ID | Prio | Requirement |
|---|---|---|
| LP-1 | P0 | Retro-styled landing page with the game title, a **"Start game"** button and controls help. |
| LP-2 | P0 | Built to be extended: a component-based layout so character select and settings can be added as sections or routes later. |
| LP-3 | P1 | **Settings:** SFX volume, music volume, mute, screen shake on/off, and optionally key remapping. |
| LP-4 | P1 | Shows best score and highest level reached (from local save). |
| LP-5 | P2 | **Character select** before starting a level. Locked characters are shown greyed out. |
| LP-6 | P2 | "Daily challenge" button. |

### 3.8 Persistence
| ID | Prio | Requirement |
|---|---|---|
| PS-1 | P1 | **Local save** in `localStorage` (versioned schema): settings, best score, highest level, unlocked characters, current weapon level. |
| PS-2 | P1 | Wrap every storage access in try/catch. The game must keep working if storage isn't available. |

### 3.9 Combat and enemies (P2)
| ID | Prio | Requirement |
|---|---|---|
| CB-1 | P2 | **Enemies** the player can jump over, **stomp** (land on top) or hit with the sword. |
| CB-2 | P2 | **Default weapon: sword.** Short melee hitbox in front of the knight, active for a few frames, with a cooldown. |
| CB-3 | P2 | Knockback on hit for both player and enemies. |
| CB-4 | P2 | Enemy types by behavior: **walker** (back and forth, turns at edges and walls), **jumper**, **shooter** (fires projectiles in intervals). |
| CB-5 | P2 | **Sword upgrades** through level progression (damage, range or speed). |
| CB-6 | P2 | **Power-ups and temporary weapons** that expire after a set time, with a HUD timer and a warning blink before expiry. Examples: speed boots, shield, throwing axe. |
| CB-7 | P2 | **Level-based progression:** enemies get stronger (speed, attack power, HP, density) as the level number rises. Keep all scaling in a single difficulty table in config. |
| CB-8 | P2 | **Boss or mini-boss** at the end of every Nth level (default N = 5) in a closed arena section before the flag. |
| CB-9 | P2 | **More characters** (selected on the landing page), each with a sprite set and optionally small stat differences. |

---

## 4. Implementation Phases

Each phase ends with a playable build. Use placeholder graphics (colored rectangles) until phase 5.

### MVP

**Phase 0 – Project setup**
- Next.js + TypeScript + Phaser 3. The game page loads Phaser client-only.
- Pixel-perfect scaling at 256×144, fixed-timestep physics, a `config.ts` for constants.
- Scene structure: `BootScene` (load assets) → `GameScene` → `UIScene` (HUD overlay) → `PauseScene` / `GameOverScene` / `LevelCompleteScene`.
- ✅ Done when an empty colored scene renders sharply at several window sizes with no SSR errors.

**Phase 1 – Movement and game feel core**
- Player with run, acceleration, variable jump, coyote time and jump buffering.
- One **handmade** test level to tune the physics against.
- Optional debug overlay (key F1): velocity, grounded state, coyote/buffer timers.
- ✅ Done when the controls feel tight and the physics constants are settled. They're the input for the generator.

**Phase 2 – World basics**
- Tilemap collision (floor, walls, ceilings), solid walls at both ends of the level.
- Horizontal follow camera clamped to the level bounds.
- Level-end flag and level-complete screen.
- ✅ Done when the test level can be played from start to flag.

**Phase 3 – Failure states and core loop**
- Pits and spikes, hearts and lives, respawn, game-over screen.
- Checkpoints, pause menu, restart level.
- ✅ Done when the player can die, respawn at a checkpoint, run out of lives and retry.

**Phase 4 – Procedural level generation**
- Seeded PRNG and a segment-based generator using the rules in 3.3.
- Reachability check plus regeneration fallback, and unit tests over 1,000 seeds.
- Generator places coins. Score and HUD. Seed in the URL and on screens.
- ✅ Done when every generated level is beatable and the same seed gives the same level.

**Phase 5 – Look and sound**
- Pixel-art knight (idle/run/jump/fall/hurt), tileset, flag, coins, spikes.
- Parallax background, landing dust, screen shake, squash and stretch, hit flash.
- jsfxr sound effects. Retro landing page with "Start game" that also unlocks audio.
- ✅ Done when the game looks and sounds like a finished retro game.

**Phase 6 – Platform and quality of life**
- Mobile touch controls, gamepad support.
- Settings (volume, mute, screen shake, optional key remap).
- Local save (best score, highest level, settings).
- ✅ Done when the game is playable on desktop with keyboard or gamepad and on a phone with touch. **MVP release.**

### After MVP (Prio 2)

**Phase 7 – Enemies, part 1:** walker enemy, stomping, damage on contact, invincibility frames, knockback.
**Phase 8 – Sword combat:** attack animation, hitbox, cooldown, enemy HP, sword sound effects.
**Phase 9 – Progression:** difficulty table per level, jumper and shooter enemies, sword upgrades.
**Phase 10 – Power-ups:** timed power-ups and temporary weapons with HUD timer.
**Phase 11 – Characters:** character select on the landing page, unlock rules, extra sprite sets.
**Phase 12 – World variety:** moving platforms, breakable and hidden blocks, boss every Nth level.
**Phase 13 – Daily challenge:** date-based seed and personal best per day (stored locally).

---

## 5. Out of Scope (for now)

- **Online leaderboards.** They'd need a backend and are easy to cheat in a client-only game. Revisit only if they become important (it would need server-side score validation or replay verification).
- Multiplayer.
- Level editor.
- Accounts and cloud saves.
- Any copyrighted third-party assets (Minecraft, Nintendo, etc.).

---

## 6. Known Risks and Difficulties

1. **Beatable random levels:** the hardest technical part. Settle the physics constants before building the generator, and keep the reachability tests in CI so physics changes can't silently break levels.
2. **Collision bugs:** most platformer bugs come from tile collision (corner snagging, ceiling bumps, edge cases at high speed). Rely on Phaser Arcade Physics and cap the fall speed.
3. **Pixel-art rendering:** only integer scaling, otherwise sprites look blurry or uneven on high-resolution and odd-sized screens.
4. **Browser audio rules:** sound only works after a user gesture. Tie the audio unlock to "Start game".
5. **Art is the hidden time sink:** every character needs idle/run/jump/fall/hurt/attack animations, plus enemies, tiles and backgrounds. Use placeholders early and plan for asset packs or a pixel artist.
6. **Combat complexity:** sword hitboxes, invincibility frames, knockback, enemy AI and balancing. Combat, weapon upgrades, power-ups and enemy scaling together are likely more work than the whole MVP. That's why they're P2.
7. **Leaderboards:** need a backend and anti-cheat, so they're out of scope.

---

## 7. Suggested Project Structure

```
src/
  app/
    page.tsx                 # Landing page
    play/page.tsx            # Game page (loads Game client-only)
  components/
    landing/                 # Hero, StartButton, Controls, Settings, (later) CharacterSelect
    GameCanvas.tsx           # Mounts/destroys the Phaser instance
  game/
    config.ts                # All tunable constants + difficulty table
    main.ts                  # Phaser game config/factory
    scenes/                  # Boot, Game, UI, Pause, GameOver, LevelComplete
    entities/                # Player, (later) Enemy, Projectile, PowerUp
    systems/                 # Input (keyboard/touch/gamepad), Audio, Save, Camera, Juice
    levelgen/
      rng.ts                 # Seeded PRNG
      generator.ts           # Segment-based generation
      reachability.ts        # Beatability check
      generator.test.ts      # 1,000-seed reachability test
public/
  sprites/  tiles/  audio/
ASSETS_CREDITS.md
```

## 8. Definition of Done (per feature)
- Works at 60 Hz and 144 Hz with the same behavior.
- No console errors, no SSR errors.
- Tunable values live in `config.ts`.
- Type-checks with no errors (`tsc --noEmit`) and lint passes.
- Generator changes keep the 1,000-seed reachability test green.
