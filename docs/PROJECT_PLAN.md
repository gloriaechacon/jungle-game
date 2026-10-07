# Roberto Birthday Game — Phase 0 Research & Project Plan

> Historical planning draft. Superseded by [PLAN_ACTUALIZADO.md](PLAN_ACTUALIZADO.md) following the supplied-video review and the user's decisions: one character, no optional bonus rooms/minigames, BERTO letters, easier enemies, and proposed WASD + J/K controls. The scope and approval checklist below are no longer the current specification.

Status: planning only. No game code, final sprites, or levels have been created.

## 1. Product definition and scope guardrails

Create a 6–8 minute, forgiving birthday platformer that begins as a convincing miniature of **Donkey Kong Country for Game Boy Color**, then gradually reveals personal material. The complete physical Game Boy Color remains visible during play; the Phaser canvas occupies its screen, and keyboard input animates the corresponding HTML/CSS controls.

Success priority:

1. Immediate recognition of the **GBC** version—not the SNES version.
2. Responsive, enjoyable movement.
3. A clear three-level journey with an ending.
4. Personalization through the game's own visual language.
5. Polish.
6. Technical ambition.

Hard scope limits:

- Three shortened levels only: Jungle Hijinxs, Ropey Rampage, Reptile Rumble.
- One playable Kong is sufficient for the first release.
- One representative bonus room per level at most.
- No boss, lives economy, save system, minigames, animal-token system, or full K-O-N-G implementation.
- Do not start level 2 until level 1 is approved.
- Approved movement constants are frozen behind a versioned tuning object and are not silently changed later.

## 2. Research findings

### GBC-specific identity

- The Game Boy Color display is **160 × 144 pixels (10:9)**. Nintendo specifies 32,000 displayable colors, 56 simultaneously. The game canvas should therefore use a logical 160 × 144 coordinate space (or a carefully chosen integer multiple), integer camera positions, nearest-neighbor scaling, and no texture smoothing. [Nintendo technical data](https://www.nintendo.com/en-gb/Support/Legacy-system/Technical-data-619585.html)
- The GBC remake displays only one Kong on screen; the reserve Kong is represented in the HUD and can be switched in. This makes a one-character adaptation visually defensible, although character swapping can be omitted for scope. [GBC version overview](https://www.mariowiki.com/Donkey_Kong_Country_(Game_Boy_Color))
- The GBC screenshot archive confirms the 160 × 144 presentation and contains specific references for the menu, regional map, treehouse, checkpoint, exit, bonus room, and all three target levels. It must be the visual source of truth during art production. [GBC screenshot archive](https://www.mariowiki.com/Category:Donkey_Kong_Country_(Game_Boy_Color)_screenshots)
- The GBC title is presented in vertically sequenced 160 × 144 frames; references describe two title-screen parts followed by “Press START,” then a simple main menu and regional map. [MobyGames GBC screenshots](https://www.mobygames.com/game/5199/donkey-kong-country/screenshots/gameboy-color/)
- Core GBC controls are compact: D-pad movement/climbing/crouching, A to jump, B to run/attack/pick up and throw a barrel, Start to pause, and Select to switch characters. [GBC manual scan](https://www.thegameisafootarcade.com/wp-content/uploads/2017/05/Donkey-Kong-Country-Game-Manual.pdf)

### First-three-level identity

- **Jungle Hijinxs:** daylight jungle; the treehouse and empty banana-hoard opening; simple Gnawty/Kritter/Klump encounters; banana trails; DK/barrels; checkpoint; Rambi and breakable bonus-wall language; rising treetop finish. The original first level is intentionally simple and teaches through layout rather than text. [Jungle Hijinxs reference](https://www.mariowiki.com/Jungle_Hijinxs_(Donkey_Kong_Country))
- **Ropey Rampage:** night jungle in the GBC release (do not import the SNES thunderstorm/rain as a defining GBC effect); ropes over gaps and treetops; Army, Kritter, and yellow Zinger enemies; a rope-heavy bonus; cave/tunnel exit. [Ropey Rampage reference](https://www.mariowiki.com/Ropey_Rampage)
- **Reptile Rumble:** cave palette and Cave Dweller Concert identity; Slippas, blue Kritters, and Zingers; tires used to reach ledges and cross pits; low crawl spaces; ascending rocky stairs near the exit; three bonus rooms in the full game, which should be condensed to one personalized secret here. [Reptile Rumble reference](https://www.mariowiki.com/Reptile_Rumble)
- In the original GBC world sequence, the three levels use two, two, and three bonus areas respectively. Reproducing all seven would overwhelm a 6–8 minute gift, so each adaptation should contain no more than one concise optional or semi-guided secret. [GBC level list](https://www.mariowiki.com/Donkey_Kong_Country_(Game_Boy_Color))

### Supplied-media status

Only the written brief was present in the supplied attachment folder. No screenshots or gameplay video were available to inspect. Before final art direction, add the intended screenshots/video to the project and perform a reference pass covering palette, exact sprite proportions, animation timing, title/menu transitions, HUD, and the zoomed Game Boy composition.

## 3. Technical stack verdict

**Approved:** TypeScript + Vite + Phaser + Phaser Arcade Physics + HTML/CSS.

Why it fits:

- Phaser maintains an official Vite/TypeScript template and provides scenes, cameras, audio, animation, tilemaps, input, and production builds. [Official Phaser template](https://github.com/phaserjs/template-vite-ts)
- Arcade Physics is appropriate for axis-aligned platform collisions, gravity, simple enemies, triggers, collectibles, and moving bodies without the complexity of a rigid-body simulator. [Arcade Physics documentation](https://docs.phaser.io/phaser/concepts/physics/arcade)
- HTML/CSS is the right layer for the physical console, responsive framing, lighting, power LED, button press states, and outer zoom. It keeps decorative/device concerns out of gameplay code.

Implementation constraints:

- Pin exact dependency versions when Phase 1 begins; do not target an unspecified “latest.”
- Use a fixed logical game size of 160 × 144 and integer scaling inside the shell. On displays where perfect integer scaling cannot fill the desired area, letterbox rather than distort.
- Use `pixelArt: true`, nearest-neighbor texture filtering, integer camera coordinates, and CSS `image-rendering: pixelated`.
- Prefer desktop keyboard as the required platform. Touch controls may use the visible shell later but are not part of the initial acceptance target.
- Load audio only after a user gesture because browsers block autoplay.

## 4. Architecture

The proposed scene list is sound, with two refinements: rename `MenuScene` to `AdventureMenuScene` for clarity, and share level behavior without forcing all level content into one generic scene too early.

```text
Web page / presentation layer
├─ GameBoyShell (HTML/CSS)
│  ├─ responsive body, screen bezel, LED, D-pad, A/B, Start/Select
│  └─ ShellController (power state, zoom state, pressed controls)
└─ Phaser canvas (inside screen)
   ├─ BootScene
   ├─ PreloadScene
   ├─ TitleScene
   ├─ AdventureMenuScene
   ├─ MapScene
   ├─ BaseLevelScene (shared plumbing only)
   │  ├─ JungleHijinxsScene
   │  ├─ RopeyRampageScene
   │  └─ ReptileRumbleScene
   ├─ BirthdayBonusScene
   └─ EndingScene
```

Supporting modules:

- `InputController`: maps keyboard/game actions once and emits press/release events to both Phaser and the shell.
- `PlayerController`: owns acceleration, run speed, jump, roll, damage, and animation state; it does not know about DOM or specific levels.
- `GameSession`: in-memory progression (`completedLevels`, `robLetters`, `bonusCollectibles`, `checkpoint`). No persistence is required initially.
- `LevelDefinition`: spawn points, tilemap key, music key, checkpoints, collectible IDs, and exit target.
- Small entities/components: enemy patrol, banana, ROB letter, barrel, tire, rope, checkpoint, exit, bonus entrance.
- `GameEvents`: narrow typed bridge for power/zoom, control feedback, scene changes, collection, and completion. Avoid a global catch-all event bus.
- `Tuning`: versioned movement constants with a short changelog and test scene. Once approved, changes require explicit approval.

Scene transitions should be explicit. The DOM owns only outer presentation states (`off → booting → full-console → gameplay-zoom → zoom-out`); Phaser owns the inner flow (`title → adventure → map → level → map … → bonus → ending`).

## 5. Asset inventory

All final game art should be newly created or properly licensed. Original screenshots may guide proportions, palette, and layout but should not be shipped as copied spritesheets.

| Group | Minimum release assets | Deferred / optional |
|---|---|---|
| Player | DK idle, walk/run, jump/fall, roll, hurt, victory; collision-body spec; portrait/HUD icon | Diddy and tag animations; hand slap; Rambi ride set |
| Enemies | Gnawty/simple walker; Kritter/reptile jumper; Slippa; Zinger hover; Army/armadillo if budget permits | Klump, Necky, additional variants |
| Environment | Jungle ground/ledges, trees/trunks/leaves, distant jungle layers, night palette variant, cave rock/ledges, cave background, pits, low crawl tiles, entrance/exit caves, treehouse silhouette/opening | Rain/lightning; extensive decorative variants |
| Collectibles | Banana + bunch animation, R/O/B letters, persistent `R _ _` HUD glyphs, one personalized pickup placeholder interface | Balloons, animal tokens, 100-banana life reward |
| Barrels / interactive | Normal barrel, checkpoint/star barrel, DK-styled container only if needed, breakable bonus wall/entrance, tire, rope/vine | Steel keg, TNT, barrel cannons, animal crates |
| UI | Rare/power-on placeholders, two-part title composition, “Press Start,” Adventure menu, level-name card, pause card, compact banana/ROB HUD, transition wipes, completion cue | Options, save slots, lives economy, scrapbook |
| Maps | Regional Kongo Jungle map with three nodes/path states; three greybox tilemaps; one reusable bonus-room layout; ending room | Island/world map, supporting-character locations |
| Audio | Original/licensed GBC-style title cue; map loop; daylight jungle loop; night jungle variation; cave loop; bonus/ending cues; jump, land, roll, collect, barrel, enemy, hurt, checkpoint, exit, menu sounds | Voice, many enemy-specific sounds, faithful copyrighted soundtrack reproduction |
| Game Boy interface | Full console shell, screen glass/bezel, label details, speaker slots, power LED, D-pad, A/B, Start/Select, pressed states, shadow/lighting, responsive breakpoints, zoom-in/out states | Multiple shell colors, elaborate 3D rendering |

## 6. Essential nostalgia versus safe omissions

### Essential

- 160 × 144, crisp GBC-scale presentation and compact visible play area.
- Recognizable two-part title/menu/map rhythm before the first level.
- Day jungle → night rope jungle → cave progression.
- DK silhouette, weight, run, jump, landing, roll/cartwheel-style attack, and enemy stomp.
- Banana trails that teach where to move and jump.
- Barrels as both visual language and a simple attack/secret-opening tool.
- One mid-level checkpoint per level with generous respawn.
- Level-name cards, cave exits, brief map-node progression, and original-style transitions.
- A few signature enemies, not a large bestiary.
- R/O/B acquisition presented like a native collectible system.
- One discoverable bonus-space beat, especially the final false-normal bonus entrance that becomes the birthday reveal.
- GBC-like chiptune sound design and memorable original compositions that evoke the mood without copying protected recordings/compositions.

### Strongly recommended, but cuttable if schedule demands

- A very short Rambi sequence or cameo in Jungle Hijinxs.
- Army in Ropey Rampage.
- Moveable/bouncy tires rather than fixed bounce pads in Reptile Rumble.
- One alternate upper route in Jungle Hijinxs.

### Safe to omit

- Diddy as a playable/tag character and two-character damage system.
- Lives, game-over screens, 100-banana rewards, balloons, saves, percentage completion.
- Hand slap, roll-jump-gated secrets, animal tokens, most animal friends.
- Full original enemy counts and all seven original bonus rooms.
- Cranky/Candy/Funky locations, minigames, printer/sticker features.
- Boss fights, water levels, barrel-cannon systems, world travel beyond three nodes.
- Pixel-perfect recreation of original level geometry.

Forgiveness should be invisible: 100–140 ms coyote time, 100–140 ms jump buffering, generous enemy stomp zones, safe checkpoints, fast respawns, no lost ROB letters, and bottomless pits that reset to the checkpoint without a life penalty.

## 7. Shortened level proposals

Target total timing includes roughly 45–70 seconds for power-on/title/menu, 20–35 seconds total for map transitions, 5–6 minutes of levels, and 40–60 seconds for the reveal/ending.

### Level 1 — Jungle Hijinxs (1:30–1:50)

Five beats:

1. **Recognition:** emerge at the treehouse/empty-hoard area; banana trail points right.
2. **Learn:** safe flat run/jump over one Gnawty, then a stepped ledge with a Kritter.
3. **Barrel:** pick up/throw one barrel into an enemy or weak wall; place checkpoint immediately afterward.
4. **Identity:** short treetop/raised route; optional 10–15 second Rambi cameo or bonus-wall reveal; collect **R** on the critical path.
5. **Finish:** two forgiving jumps, exit sign/cave, brief victory pose.

Retain treehouse, daylight palette, banana teaching, simple enemies, barrel, checkpoint, treetop rise, and exit. Cut most repeated flat terrain, extra lives, multiple routes, second bonus room, and the full Rambi section.

### Level 2 — Ropey Rampage (1:30–1:50)

Five beats:

1. **Contrast:** immediate night palette and tunnel emergence; one Army or Kritter on safe ground.
2. **Rope tutorial:** stationary/slow rope over a harmless shallow gap.
3. **Escalation:** two ropes over a real pit with bananas tracing release timing; checkpoint on landing.
4. **Enemy timing:** a rope arc around one slow vertical Zinger; **O** hangs on the intended arc.
5. **Finish:** short treetop landing chain and tunnel exit, with a subtle sky-lightening cue if visually readable.

Retain night jungle, verticality, ropes, gaps, treetops, Zinger, and tunnel exit. Cut long rope repetitions, hidden ground items, multiple token systems, and one of the original bonuses. Do not add SNES-style storm effects as a primary GBC identifier.

### Level 3 — Reptile Rumble (2:00–2:20)

Six beats:

1. **Palette shift:** cave entrance, barrel beside a shallow Slippa pit.
2. **Tire tutorial:** fixed tire bounce to a low ledge; no death risk.
3. **Reptile sequence:** staggered rocky steps with blue Kritter/Slippa encounters.
4. **Checkpoint challenge:** tire across a small Zinger pit, then checkpoint.
5. **Secret language:** low crawl passage and a suspicious breakable wall/bonus entrance; collect **B** shortly before or inside it so completion cannot be missed.
6. **Reveal:** what appears to be a normal bonus room transitions into `BirthdayBonusScene`; the exact content remains undefined until approved.

Retain cave audio/palette, Slippas, rocky stairs, tires, low ceilings, hidden-room expectation, and longer final cadence. Cut repeated tire pits, most enemy clusters, two of three original bonuses, token collection, and an ordinary cave exit after the reveal.

## 8. Milestone checklist and approval gates

- [x] **Phase 0A — Research and plan:** external GBC references, stack verdict, architecture, scope, risks.
- [ ] **Phase 0B — Supplied-reference audit:** review the missing screenshots/video; create a small GBC-only reference board and lock palette/proportion notes. **Approval gate.**
- [ ] **Phase 1 — Technical skeleton:** pinned Vite/TypeScript/Phaser project; 160 × 144 canvas; nearest-neighbor scaling; scene transitions; automated lint/type/build checks. No final art. **Approval gate.**
- [ ] **Phase 2 — Movement lab:** rectangles only; flat ground and test ledges; walk/run/jump/fall/collision/camera; coyote time and input buffer; tuning overlay; constants documented. **Approval gate and movement freeze.**
- [ ] **Phase 3 — Jungle greybox:** full 90–110 second route with only shapes/tiles; checkpoint and exit markers; timed playtest. **Approval gate.**
- [ ] **Phase 4 — Core systems:** banana, R letter, one enemy, barrel, checkpoint/respawn, exit, one bonus entrance; unit/smoke tests for persistent progression. **Approval gate.**
- [ ] **Phase 5 — Jungle art slice:** GBC palette and one complete player/enemy/environment set; animation and readability test at physical screen size. **Art approval gate.**
- [ ] **Phase 6 — Finish Jungle Hijinxs:** audio, transitions, balance, accessibility, 1:30–1:50 playtest. **Level 1 approval gate.**
- [ ] **Phase 7 — Ropey Rampage:** add ropes and night art only after Phase 6 approval. **Approval gate.**
- [ ] **Phase 8 — Reptile Rumble:** add tires/crawl spaces/cave art. **Approval gate.**
- [ ] **Phase 9 — Map/progression:** three nodes, ROB HUD persistence, clear destination/end framing. **Approval gate.**
- [ ] **Phase 10 — Personalized bonus foundation:** data-driven collectible slots and placeholder reveal; no invented final message. **Approval gate.**
- [ ] **Phase 11 — Game Boy shell:** responsive console, visible controls, keyboard-to-button feedback, focus handling. **Approval gate.**
- [ ] **Phase 12 — Power-on/zoom:** intro and reversible camera composition while retaining screen and controls. **Approval gate.**
- [ ] **Phase 13 — Birthday ending:** approved content only; ending and zoom-out. **Approval gate.**
- [ ] **Phase 14 — Audio/polish/QA:** 6–8 minute median, under 10 minute upper bound, restart/recovery tests, browser/device matrix, asset/license audit.

## 9. Technical and production risks

| Risk | Impact | Mitigation / decision |
|---|---|---|
| Copyright/trademark and copied assets/audio | Highest | Treat screenshots/footage as reference only; create or license all shipped art/audio; avoid copied ROM assets and soundtrack recordings; obtain legal advice before public distribution. Keep “private gift” and “public release” decisions separate. |
| Wrong-version drift toward SNES/GBA | High nostalgia loss | Maintain a GBC-only reference board; label every reference by platform; reject SNES/GBA assets unless used only to understand mechanics. |
| Movement changes during later phases | High rework | Centralize and version tuning; record Phase 2 values and acceptance video; changes require explicit approval. |
| Non-integer scaling / blurry pixels | High visual loss | Fixed 160 × 144 logical canvas, integer scale calculation, letterboxing, nearest-neighbor filtering, device-pixel-ratio tests. |
| Game Boy zoom crops physical controls | Violates core composition | Define CSS safe-frame constraints before shell art: screen + D-pad + A/B must remain inside viewport at gameplay zoom. Test narrow laptop and mobile aspect ratios. |
| Phaser canvas and DOM controls disagree | Broken physical illusion | One canonical action map; input events update gameplay and shell pressed state together; clear states on blur/visibility change. |
| Browser audio restrictions and timing drift | Silent intro / poor sync | Start audio after first user gesture; do not make progression depend on audio completion; provide mute control. |
| Tile collision snagging / camera jitter | Movement feels wrong | Simple collision shapes, integer camera rounding, slope avoidance, dedicated movement lab, repeatable traversal tests. |
| Rope and tire scope | Schedule risk | Implement minimal deterministic versions: fixed-anchor rope with forgiving grab radius; fixed tire bounce before considering movable physics. |
| Small screen readability | Unfair difficulty | Limit simultaneous enemies; high silhouette contrast; avoid important objects at screen edges; test at actual displayed size, not only enlarged dev view. |
| Player fails to reach the birthday ending | Product failure | No lives/game over; checkpoint each level; quick respawn; ROB letters cannot be permanently missed; optional assist after repeated deaths; ending entrance on critical path. |
| Scope growth through personalization | Timeline risk | Data-drive collectible slots but build no object until its meaning and final list are approved. One reveal room only for v1. |
| Missing supplied media | Art assumptions | Complete Phase 0B before locking final art, animation cadence, shell framing, or title timing. |

## 10. Smallest next implementation task

After this plan and the missing reference media are approved, implement **Phase 1A: a render-only technical spike**—not movement.

Deliverable:

- Vite + TypeScript + pinned Phaser project.
- One `BootScene` that transitions to one empty `MovementLabScene`.
- A 160 × 144 solid-color canvas rendered crisply at integer scales inside a plain placeholder frame.
- Resize/letterbox behavior and keyboard-focus handling.
- Lint, typecheck, and production build scripts.
- A tiny on-screen diagnostic showing logical resolution, display scale, and current scene.
- No Game Boy shell art, player, physics, audio, map, collectibles, or level content.

Acceptance criteria:

1. `npm run dev`, typecheck, and production build succeed.
2. The logical canvas remains exactly 160 × 144.
3. Pixel edges stay sharp at 1×–5× integer scale.
4. Resize never stretches the aspect ratio.
5. Scene transition and focus/blur behavior are observable and stable.

Only after Phase 1A is approved should Phase 2 add the rectangle player, ground, gravity, walk/run/jump, collision, and camera follow.

## Decision log for approval

Please explicitly approve or amend these five decisions before implementation:

1. One playable Kong for v1; no tag system.
2. One representative bonus area per level maximum.
3. Original/licensed GBC-style audio and art; no ripped ROM assets or copied soundtrack.
4. Fixed 160 × 144 logical gameplay resolution with integer scaling/letterboxing.
5. Phase 1A render-only spike as the next task; movement begins only in Phase 2.
