// Reproducible art build: `npm run art` regenerates every Phase 5 image.
// Outputs: public/assets/*.png|json (loaded by the game) and docs/art/*.png (contact sheets).
// No third-party dependencies; same input => byte-identical PNGs.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Pix, hex, label } from './pixel.mjs';
import { buildDK, FRAMES } from './dk-frames.mjs';
import { PAL } from './dk.mjs';
import { celebration } from './celebration.mjs';
import { bonusSlot } from './final-bonus.mjs';
import { bonusOops } from './bonus-oops.mjs';
import { BONUS_BARREL } from '../../src/final-bonus-presentation.ts';
import { COLLECTIBLE_WORD } from '../../src/collectibles.ts';
import * as P from './props.mjs';
import * as V from './env.mjs';
import * as T from './terrain.mjs';
import * as L from './jungle-landmarks.mjs';
import * as M from './minecart.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const assets = root + 'public/assets/';
const docs = root + 'docs/art/';
mkdirSync(assets, { recursive: true });
mkdirSync(docs, { recursive: true });

// ---- sprite list: name -> { pix, anchor } (anchor in pixels from the frame's top-left)
const sprites = {};
const addSprite = (name, pix, anchor) => { sprites[name] = { pix, anchor: anchor ?? [pix.w / 2, pix.h / 2] }; };

const dk = buildDK();
for(let i=0;i<2;i++)addSprite(`minecart-${i}`,M.minecart(i),[18,28]);
addSprite('mine-cannon',M.mineCannon());
addSprite('mine-beam',M.mineBeam());
addSprite('mine-entrance',M.mineEntrance());
addSprite('mine-wall',M.mineWall());
for(let i=0;i<8;i++)addSprite(`demo-cheer-${i}`,celebration(i),[24,48]);
for(let i=0;i<4;i++){
  addSprite(`bonus-slot-${i}`,bonusSlot(i));
  for(let t=0;t<BONUS_BARREL.turns;t++)addSprite(`bonus-slot-${i}-turn-${t}`,bonusSlot(i,t));
  addSprite(`bonus-oops-${i}`,bonusOops(i),[24,48]);
}
addSprite('comodin', P.comodin());
for (const [name, pix] of Object.entries(dk)) addSprite(name, pix, [16, 32]); // feet centre = body bottom centre
P.gnawty.forEach((pix, i) => addSprite(`gnawty-walk-${i}`, pix, [11, 16])); // feet centre on the ground
P.banana.forEach((pix, i) => addSprite(`banana-${i}`, pix));
addSprite('banana-bunch',P.bananaBunch());
for(let i=0;i<2;i++)addSprite(`bee-walk-${i}`,P.bee(i),[12,16]);
for(let i=0;i<3;i++)addSprite(`lizard-walk-${i}`,P.lizard(i),[14,22]);
for (const ch of COLLECTIBLE_WORD) addSprite(`letter-${ch}`, P.letterTile(ch));
for (const ch of COLLECTIBLE_WORD) addSprite(`hud-letter-${ch}`, P.letterTile(ch, 9));
addSprite('hud-letter-empty', P.letterSlot(9));
for (let i = 0; i < 4; i++) addSprite(`barrel-${i}`, P.barrel(i));
for (let i = 0; i < 2; i++) addSprite(`barrel-debris-${i}`, P.debris(i));
for (let i = 0; i < 2; i++) addSprite(`star-barrel-${i}`, P.starBarrel(i), [9, 20]);
for (let i = 0; i < 2; i++) addSprite(`star-${i}`, P.starIcon(i));
for (let i = 0; i < 3; i++) addSprite(`sparkle-${i}`, P.sparkle(i));
for (let i = 0; i < 2; i++) addSprite(`hit-${i}`, P.hitStar(i));
for (let i = 0; i < 3; i++) addSprite(`dust-${i}`, P.dust(i), [5, 6]);
for (let i = 0; i < 10; i++) addSprite(`digit-${i}`, P.digit(i), [0, 0]);
addSprite('hud-banana', P.banana[0], [0, 0]);
addSprite('exit-sign', P.exitSign(), [13, 22]);
addSprite('treehouse', V.treehouse(), [40, 76]);
addSprite('exit-cave', V.exitCave(), [32, 72]);
addSprite('jungle-entrance', L.jungleEntrance(), [40,80]);
addSprite('night-entrance', L.jungleEntrance(true), [40,80]);
addSprite('palm-crown', L.palmCrown(), [32,4]);
addSprite('palm-trunk', L.palmTrunk());
addSprite('jungle-fern', L.jungleFern(), [16,22]);
// Phase 8 (Reptile Rumble)
P.snake.forEach((pix, i) => addSprite(`snake-walk-${i}`, pix, [11, 12])); // feet centre on the ground
for (let i = 0; i < 2; i++) addSprite(`tire-${i}`, P.tire(i), [12, 14]); // bottom centre on the ground
// Vine pieces (Ropey): leaf with its stem on the vine, tuft leaving the canopy, curled tip.
addSprite('vine-leaf', P.vineLeaf(), [0, 2]);
addSprite('vine-tuft', P.vineTuft(), [17, 14]);
addSprite('vine-tip', P.vineTip(), [5, 1]);

// ---- shelf-pack into one atlas (1 px transparent gutter)
const names = Object.keys(sprites).sort((a, b) => sprites[b].pix.h - sprites[a].pix.h || a.localeCompare(b));
const width = 256; let x = 0, y = 0, shelf = 0; const place = {};
for (const n of names) {
  const { w, h } = sprites[n].pix;
  if (x + w > width) { x = 0; y += shelf + 1; shelf = 0; }
  place[n] = { x, y }; x += w + 1; shelf = Math.max(shelf, h);
}
const atlasH = y + shelf;
const atlas = new Pix(width, atlasH);
const frames = {};
for (const n of names) {
  const { pix, anchor } = sprites[n]; const { x: fx, y: fy } = place[n];
  atlas.blit(pix, fx, fy);
  frames[n] = { frame: { x: fx, y: fy, w: pix.w, h: pix.h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: pix.w, h: pix.h }, sourceSize: { w: pix.w, h: pix.h }, pivot: { x: anchor[0] / pix.w, y: anchor[1] / pix.h } };
}
atlas.save(assets + 'jungle-atlas.png');
writeFileSync(assets + 'jungle-atlas.json', JSON.stringify({ frames, meta: { app: 'tools/art/build-art.mjs', image: 'jungle-atlas.png', format: 'RGBA8888', size: { w: width, h: atlasH }, scale: '1' } }, null, 1));

// ---- tiles and backdrops as standalone images (used by TileSprites)
const images = {
  // Terrain with relief (tools/art/terrain.mjs); Jungle/Ropey and cave palettes.
  'ground-top': T.bandTop(T.JUNGLE_T, 7), 'ground-fill': T.rockFill(T.JUNGLE_T, 11), 'ground-side-l': T.sideColumn(T.JUNGLE_T, false), 'ground-side-r': T.sideColumn(T.JUNGLE_T, true),
  'ground-cap-l': T.shoulder(T.JUNGLE_T, false), 'ground-cap-r': T.shoulder(T.JUNGLE_T, true), 'bg-far': V.backdropFar(), 'bg-near': V.backdropNear(),
  'canopy-night': V.canopyNight(),
  'cave-top': T.bandTop(T.CAVE_T, 81), 'cave-fill': T.rockFill(T.CAVE_T, 83), 'cave-side-l': T.sideColumn(T.CAVE_T, false), 'cave-side-r': T.sideColumn(T.CAVE_T, true),
  'cave-cap-l': T.shoulder(T.CAVE_T, false), 'cave-cap-r': T.shoulder(T.CAVE_T, true), 'cave-far': V.caveFar(), 'cave-near': T.caveFormations(),
  'font': V.fontSheet(), 'font-gold': V.fontSheet(hex('#ffe08a'), hex('#e8a020')),
  // Clean dark glyphs for opaque light help cards, without the old dark halo.
  'font-ink': V.fontSheet(hex('#193a3b'), hex('#193a3b'), false),
};
for (const [n, pix] of Object.entries(images)) pix.save(assets + n + '.png');

// ---- manifest for review (sizes, anchors, colours)
const manifest = {
  generatedBy: 'tools/art/build-art.mjs', note: 'Original pixel art for this project, drawn procedurally after the GBC reference. No pixels copied from the game.',
  sprites: Object.fromEntries(names.map(n => [n, { w: sprites[n].pix.w, h: sprites[n].pix.h, anchor: sprites[n].anchor, colors: sprites[n].pix.colors().length }])),
  images: Object.fromEntries(Object.entries(images).map(([n, p]) => [n, { w: p.w, h: p.h }])),
  dkPalette: Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, '#' + v.slice(0, 3).map(c => c.toString(16).padStart(2, '0')).join('')])),
  dkPoses: Object.keys(FRAMES),
};
writeFileSync(docs + 'manifest.json', JSON.stringify(manifest, null, 1));

// ---- contact sheets (4x, labelled) for review
const sky = hex('#86a7d4'), ink = hex('#1c0604');
function contact(list, file, cellW, cellH, cols, scale = 4, bg = sky) {
  const rows = Math.ceil(list.length / cols);
  const s = new Pix(cols * cellW, rows * (cellH + 8)).fill(bg);
  list.forEach((n, i) => {
    const pix = sprites[n]?.pix ?? images[n];
    const cx = (i % cols) * cellW, cy = Math.floor(i / cols) * (cellH + 8);
    s.rect(cx, cy + cellH - 1, cellW - 1, 1, hex('#eaa183'));
    s.blit(pix, cx + Math.floor((cellW - pix.w) / 2), cy + cellH - 1 - pix.h);
    label(s, n.replace(/^dk-/, '').slice(0, Math.floor(cellW / 4)), cx + 1, cy + cellH + 1, ink);
  });
  s.scaled(scale).save(docs + file);
}
contact(names.filter(n => n.startsWith('dk-')).sort(), 'dk-frames.png', 40, 36, 8);
contact(Array.from({ length: 6 }, (_, i) => `dk-walk-${i}`), 'dk-walk-cycle.png', 40, 36, 6);
contact(Array.from({ length: 6 }, (_, i) => `dk-run-${i}`), 'dk-run-cycle.png', 40, 36, 6);
contact([...Array.from({ length: 4 }, (_, i) => `dk-climb-${i}`), ...Array.from({ length: 4 }, (_, i) => `dk-climb-grip-${i}`), 'vine-leaf', 'vine-tuft', 'vine-tip'], 'dk-climb-cycle.png', 40, 36, 4);
contact(Array.from({ length: 8 }, (_, i) => `dk-roll-${i}`), 'dk-roll-cycle.png', 40, 36, 8);
contact(Array.from({ length: 8 }, (_, i) => `demo-cheer-${i}`), 'demo-celebration.png', 56, 52, 4);
contact(Array.from({ length: 4 }, (_, i) => `bonus-slot-${i}`), 'final-bonus.png', 40, 40, 4);
contact(Array.from({ length: 8 }, (_, i) => `bonus-slot-0-turn-${i}`), 'final-bonus-turn.png', 40, 40, 8);
contact(Array.from({ length: 4 }, (_, i) => `bonus-oops-${i}`), 'final-bonus-oops.png', 52, 52, 4);
contact(names.filter(n => /^(gnawty|snake|tire|banana|letter|barrel|star|sparkle|hit|dust|hud|digit|exit-sign)/.test(n)).sort(), 'props.png', 28, 26, 10);
contact(['barrel-0','barrel-1','tire-0','tire-1','banana-bunch','bee-walk-0','bee-walk-1','lizard-walk-0','lizard-walk-1','lizard-walk-2'], 'encounters.png',32,26,5,6);
contact(['treehouse', 'exit-cave', 'ground-top', 'ground-fill', 'ground-side-l', 'ground-side-r', 'ground-cap-l', 'ground-cap-r'], 'environment.png', 84, 80, 4, 3);
contact(['jungle-entrance','night-entrance','palm-crown','palm-trunk','jungle-fern'], 'jungle-landmarks.png',88,84,5,4);
contact(['minecart-0','minecart-1','mine-cannon','mine-beam','mine-entrance'],'minecart.png',92,132,5,3);
images['bg-far'].scaled(3).save(docs + 'bg-far.png');
contact(['cave-top', 'cave-fill', 'cave-side-l', 'cave-side-r', 'cave-cap-l', 'cave-cap-r', 'tire-0', 'tire-1', 'snake-walk-0', 'snake-walk-1'], 'cave.png', 28, 26, 10, 4, hex('#2e1610'));
images['cave-far'].scaled(3).save(docs + 'cave-far.png');
images['cave-near'].scaled(3).save(docs + 'cave-near.png');
images['canopy-night'].scaled(3).save(docs + 'canopy-night.png');
images['bg-near'].scaled(3).save(docs + 'bg-near.png');
// palette swatches
const swatches = [...Object.values(PAL), ...Object.values(P.C), ...Object.values(V.E), ...Object.values(V.N), ...Object.values(V.CV), ...Object.values(P.VN)];
const sw = new Pix(swatches.length * 6, 6); swatches.forEach((c, i) => sw.rect(i * 6, 0, 6, 6, c)); sw.scaled(4).save(docs + 'palette.png');
console.log(`art: ${names.length} sprites in ${width}x${atlasH} atlas, ${Object.keys(images).length} images`);
