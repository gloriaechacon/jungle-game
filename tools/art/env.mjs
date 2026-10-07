// Jungle environment: ground tiles, parallax backdrops, treehouse, exit cave, font.
// Palette values are rounded samples from the reference video (see REFERENCIA_ARTE.md);
// shapes are original, procedurally drawn with a fixed seed so the build is reproducible.
import { Pix, hex } from './pixel.mjs';

export const E = {
  sky: hex('#86a7d4'),
  K: hex('#1f0905'),
  p1: hex('#8f5c49'), p2: hex('#c98e74'), p3: hex('#eaa183'), p4: hex('#f4c0a0'),
  r0: hex('#120a06'), r1: hex('#2e2014'), r2: hex('#4e3c26'), r3: hex('#6e5838'),
  c1: hex('#5a4330'), c2: hex('#8c6748'), c3: hex('#ad7957'),
  f0: hex('#08140d'), f1: hex('#102817'), f2: hex('#284b29'), f3: hex('#426b38'), f4: hex('#729b4d'), f5: hex('#a0bd70'),
  fl0: hex('#591819'), fl1: hex('#a7282f'), fl2: hex('#df6469'),
  t0: hex('#2d0206'), t1: hex('#5c1a1e'), t2: hex('#733236'), t3: hex('#9a4a48'),
  w1: hex('#6a3418'), w2: hex('#a4582a'), w3: hex('#d68a4c'), w4: hex('#f0b878'), dk: hex('#d8383a'), win: hex('#f4cc52'),
};

// Deterministic PRNG (mulberry32) so regenerated art is byte-identical.
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Path surface, tiles horizontally (16 px period). Row 2 is the walking line:
// the view places this tile 2 px above the solid top so the feet sit inside the path.
export function groundTop() {
  const p = new Pix(16, 12);
  const wave = x => Math.round(Math.sin((x / 16) * Math.PI * 2) * 0.6);
  for (let x = 0; x < 16; x++) {
    const t = 1 + wave(x); // 0..2: gentle wave of the path's upper edge
    p.set(x, t, E.K);
    p.set(x, t + 1, E.p4);
    for (let y = t + 2; y < 9; y++) p.set(x, y, E.p3);
    p.set(x, 9, E.p2); p.set(x, 10, E.p1); p.set(x, 11, E.r1);
  }
  const r = rng(7);
  for (let i = 0; i < 9; i++) { const x = Math.floor(r() * 16), y = 3 + Math.floor(r() * 5); p.set(x, y, E.p2); }
  p.set(4, 4, E.p1); p.set(11, 6, E.p1);
  return p;
}

// Dark rock with leaf-shaped facets below the path (tiles both ways, 16x16).
export function groundFill() {
  const p = new Pix(16, 16).fill(E.r0);
  const leaf = (x, y, flip) => {
    const pts = flip ? [[x, y], [x + 5, y + 2], [x + 7, y + 6], [x + 2, y + 4]] : [[x + 7, y], [x + 2, y + 2], [x, y + 6], [x + 5, y + 4]];
    for (const dx of [-16, 0, 16]) for (const dy of [-16, 0, 16]) p.polygon(pts.map(([a, b]) => [a + dx, b + dy]), E.r2);
    for (const dx of [-16, 0, 16]) for (const dy of [-16, 0, 16]) { const [a, b] = pts[flip ? 1 : 0]; p.set(a + dx - (flip ? 1 : 0), b + dy + 1, E.r3); }
  };
  leaf(1, 1, false); leaf(9, 5, true); leaf(2, 10, true); leaf(10, 12, false);
  const r = rng(11); for (let i = 0; i < 10; i++) p.set(Math.floor(r() * 16), Math.floor(r() * 16), E.r1);
  return p;
}

// Rocky cliff face for exposed solid sides (6 x 16, tiles vertically).
export function groundSide(right) {
  const p = new Pix(6, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 6; x++) {
    const stone = ((y + (x > 2 ? 4 : 0)) % 8);
    p.set(x, y, stone === 0 ? E.K : stone < 3 ? E.c3 : stone < 6 ? E.c2 : E.c1);
  }
  const edge = right ? 5 : 0;
  for (let y = 0; y < 16; y++) p.set(edge, y, E.K);
  return p;
}
// Rounded end of the path band (6x12), left or right.
export function groundCap(right) {
  const p = new Pix(6, 12);
  const rows = ['..KKKK', '.KPPPP', 'KPPPPP', 'KPPPPP', 'KPPPPP', 'KPPPPP', 'KPPPPP', 'KPPPPP', 'KPPPPP', 'KSSSSS', 'KMMMMM', 'KKKKKK'];
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = { K: E.K, P: E.p3, S: E.p2, M: E.p1 }[ch]; if (c) p.set(right ? 5 - x : x, y, c);
  }));
  return p;
}

// Far layer 256x144: sky + tall palm trunks with drooping canopies (tiles horizontally).
export function backdropFar() {
  const p = new Pix(256, 144).fill(E.sky);
  const r = rng(21);
  const palm = (x, top, h) => {
    for (let y = top; y < top + h; y++) {
      const sway = Math.round(Math.sin((y - top) / 18) * 1.5);
      for (let dx = -2; dx <= 2; dx++) {
        const c = dx === -2 ? E.t0 : dx === 2 ? E.t0 : dx === -1 ? E.t3 : E.t2;
        p.set(wrap(x + dx + sway), y, (y + dx) % 6 === 0 ? E.t1 : c);
      }
    }
    canopy(p, x, top, r);
  };
  palm(26, 6, 120); palm(98, 14, 110); palm(170, 2, 124); palm(226, 20, 110);
  return p;
}
function wrap(x) { return ((x % 256) + 256) % 256; }
function canopy(p, x, top, r) {
  // Long hanging palm blades with dark slits, not rounded broadleaf crowns.
  // Hand-authored shapes informed by the supplied GBC reference sheet.
  for (const dx of [-18, 18, -12, 12, -6, 6, 0]) {
    const length = 34 - Math.abs(dx) * 0.35;
    const points = [[0,0],[dx*.65,4],[dx+4,14],[dx+2,length],[dx-3,length-8],[dx-5,14],[-2,2]];
    p.polygon(points.map(([a,b])=>[x+a,top+b]), E.f0);
    p.polygon([[x,top+1],[x+dx*.6,top+5],[x+dx+2,top+14],[x+dx,top+length-7],[x+dx-3,top+13]], E.f3);
    p.polygon([[x,top+2],[x+dx*.6,top+5],[x+dx,top+13],[x+dx-2,top+22],[x+dx-3,top+12]], E.f4);
    for (let k=5;k<22;k+=3) p.set(x+dx*k/26,top+k,(k%2) ? E.f2 : E.f5);
  }
}
const sameC = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

// Near layer 256x88: dense tropical foliage (transparent top) with dark trunks, arching
// fern fronds, broad light leaves and the reference's red scallop-shaped leaves.
export function backdropNear() {
  const W = 256, H = 108;
  const p = new Pix(W, H);
  const r = rng(33);
  const top = x => 16 + Math.round(Math.sin(x / 17) * 8 + Math.sin(x / 7.1) * 4);
  for (let x = 0; x < W; x++) for (let y = top(x); y < H; y++) p.set(x, y, E.f1);
  // dark trunks rising behind the leaves
  for (const tx of [60, 140, 214]) for (let y = top(tx) + 4; y < H; y++) for (let dx = -2; dx <= 2; dx++) p.set(wrap(tx + dx), y, Math.abs(dx) === 2 ? E.t0 : dx < 0 ? E.t3 : E.t2);
  const leaf = (cx, cy, rx, ry, tilt, cBody, cTop) => {
    for (let yy = -ry - 3; yy <= ry + 3; yy++) for (let xx = -rx; xx <= rx; xx++) {
      const yy2 = yy - tilt * xx; if ((xx * xx) / (rx * rx) + (yy2 * yy2) / (ry * ry) <= 1) p.set(wrap(cx + xx), cy + yy, yy2 < -ry * 0.3 ? cTop : cBody);
    }
    for (let xx = -rx + 1; xx < rx; xx++) p.set(wrap(cx + xx), Math.round(cy + tilt * xx), E.f0);
  };
  for (let i = 0; i < 220; i++) {
    const x = Math.floor(r() * W), y = 16 + Math.floor(r() * 76), rx = 4 + Math.floor(r() * 6), ry = 2 + Math.floor(r() * 3);
    const tone = r(); leaf(x, y, rx, ry, (r() - 0.5) * 0.8, tone < 0.5 ? E.f2 : E.f3, tone < 0.5 ? E.f3 : E.f4);
  }
  // arching fern fronds along the top edge
  for (let i = 0; i < 40; i++) {
    const bx = Math.floor(r() * W), by = top(bx) + 10, dir = r() < 0.5 ? -1 : 1, len = 12 + Math.floor(r() * 10);
    for (let k = 0; k < len; k++) {
      const x = bx + dir * k * 0.8, y = by - Math.sin((k / len) * Math.PI * 0.9) * 16 + (k > len * 0.7 ? (k - len * 0.7) * 0.8 : 0);
      p.set(wrap(Math.round(x)), Math.round(y), E.f2);
      if (k % 2 === 0 && k > 1) { p.set(wrap(Math.round(x) - 1), Math.round(y) - 1, E.f3); p.set(wrap(Math.round(x) + 1), Math.round(y) - 1, E.f3); p.set(wrap(Math.round(x) - 2), Math.round(y) - 2, E.f4); p.set(wrap(Math.round(x) + 2), Math.round(y) - 2, E.f4); }
    }
  }
  // broad light leaves
  [[24, 74], [96, 86], [168, 68], [236, 82]].forEach(([x, y]) => leaf(x, y, 9, 5, 0.25, E.f4, E.f5));
  // red scallop leaves (the reference's red "shell" plants)
  const shell = (x, y, R) => {
    for (let yy = -R; yy <= 2; yy++) for (let xx = -R; xx <= R; xx++) {
      const d = Math.hypot(xx, (yy + 1) * 1.15);
      if (d <= R) { const a = Math.atan2(yy + 1, xx); const ridge = Math.round((a + Math.PI) * 9 / Math.PI) % 2; p.set(wrap(x + xx), y + yy, d > R - 1.2 ? E.fl0 : ridge ? E.fl1 : E.fl2); }
    }
    for (let yy = 3; yy < 9; yy++) p.set(wrap(x), y + yy, E.f0);
  };
  [[44, 72, 12], [124, 66, 13], [196, 78, 11]].forEach(([x, y, R]) => shell(x, y, R));
  // outline against the sky
  const add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!p.alpha(x, y) && [[1, 0], [-1, 0], [0, 1]].some(([a, b]) => p.alpha(wrap(x + a), y + b))) add.push([x, y]);
  add.forEach(([x, y]) => p.set(x, y, E.f0));
  // Depths below the path line (seen only through gaps): darkening foliage.
  for (let y = 94; y < H; y++) for (let x = 0; x < W; x++) {
    const d = y - 94;
    if (d > 6 || (x * 7 + y * 3) % (7 - Math.min(6, d)) === 0) p.set(x, y, d > 10 ? E.r0 : E.f0);
  }
  return p;
}

// Treehouse at the start (80x76): oblique cabin on a trunk, thick roof, banana plaque.
export function treehouse() {
  const p = new Pix(80, 76);
  // Rounded trunk: lit left face, deep side, roots and an overhanging deck.
  for (let y = 44; y < 76; y++) for (let x = 18; x < 62; x++) {
    const ring = Math.floor((y + (x % 7)) / 5) % 3;
    p.set(x, y, x < 21 || x > 58 ? E.K : x>45?E.c1:ring === 0 ? E.c1 : ring === 1 ? E.c2 : E.c3);
  }
  p.polygon([[20,65],[27,61],[24,75],[11,75]],E.c1);
  p.polygon([[47,60],[55,66],[66,75],[47,75]],E.c1);
  p.capsule(27,48,23,72,1,E.c3);p.capsule(40,48,39,73,1,E.r2);
  p.ellipse(41,49,24,6,E.r1);
  // Deck top, projecting front fascia and shaded right return.
  p.polygon([[7,38],[60,37],[75,41],[61,47],[5,43]],E.w3);
  p.polygon([[5,43],[61,47],[61,50],[5,46]],E.w1);
  p.polygon([[61,47],[75,41],[75,45],[61,50]],E.r2);
  for(let x=12;x<64;x+=8)p.capsule(x,40,x-5,43,.6,E.w1);
  p.capsule(7,42,59,46,.65,E.w4);
  // Front wall in sun and receding right wall under the roof's cast shadow.
  p.rect(12,17,43,23,E.w2);
  p.polygon([[55,17],[69,20],[69,37],[55,41]],E.w1);
  for(let y=20;y<41;y+=5){
    p.rect(13,y,41,1,E.w4);p.rect(13,y+3,41,1,E.w1);
    p.capsule(55,y,68,y-3,.6,E.r2);
  }
  p.rect(12,17,43,4,E.w1);
  p.polygon([[55,17],[69,20],[69,26],[55,22]],E.r2);
  // Two roof planes share a ridge; thick dark eaves give the roof real depth.
  p.polygon([[3,17],[31,2],[76,13],[57,23]],E.w1);
  p.polygon([[3,14],[31,0],[60,16],[55,20]],E.w3);
  p.polygon([[31,0],[76,10],[60,16]],E.w2);
  for(let x=11;x<50;x+=7)p.capsule(x,12-(x-11)*.32,x+10,16,.7,E.w1);
  p.capsule(5,14,54,19,.7,E.w4);p.capsule(32,1,73,10,.6,E.w4);
  // Recessed door, highlighted jamb, threshold and a projecting window sill.
  p.rect(20,23,15,18,E.w1);p.rect(22,24,12,16,E.r0);
  p.rect(22,24,2,16,E.r1);p.rect(19,23,2,18,E.w4);p.rect(21,40,14,2,E.w3);
  p.rect(41,25,11,10,E.r2);p.rect(42,26,8,7,E.win);
  p.rect(46,26,1,8,E.w1);p.rect(41,29,10,1,E.w1);
  p.polygon([[40,35],[52,35],[54,37],[40,37]],E.w4);
  // A banana plaque fits the generic demo; no new word is chosen here.
  p.rect(59,25,11,9,E.dk);p.rect(59,25,11,1,hex('#f07a6a'));
  p.capsule(62,27,63,30,1,E.win);p.capsule(63,30,67,29,1,E.win);
  p.outline(E.K);
  return p;
}

// Exit: rock arch with a dark opening (64x72); the opening's floor is the path.
export function exitCave() {
  const p = new Pix(64, 72);
  p.polygon([[2, 72], [4, 30], [14, 8], [32, 0], [50, 8], [60, 28], [62, 72]], E.c2);
  const r = rng(51);
  for (let i = 0; i < 90; i++) { const x = Math.floor(r() * 64), y = Math.floor(r() * 72); if (p.alpha(x, y)) { p.set(x, y, E.c3); p.set(x + 1, y, E.c1); } }
  for (let y = 0; y < 72; y++) for (let x = 0; x < 64; x++) if (p.alpha(x, y) && (x + y * 3) % 17 === 0) p.set(x, y, E.c1);
  // opening
  p.polygon([[18, 72], [18, 44], [24, 34], [32, 31], [40, 34], [46, 44], [46, 72]], E.r0);
  p.outline(E.K);
  return p;
}

// 5x7 font for the Game Boy screen (HUD messages, completion summary).
// Cells 8x10: glyph at (1,1) plus a dark 1 px outline. Char order = FONT_CHARS.
export const FONT_CHARS = " !'-./0123456789:?ABCDEFGHIJKLMNOPQRSTUVWXYZ+>";
const G = {
  ' ': [], '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'], "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'], '.': ['00000', '00000', '00000', '00000', '00000', '00000', '00100'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'], ':': ['00000', '00100', '00000', '00000', '00000', '00100', '00000'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '>': ['10000', '01000', '00100', '00010', '00100', '01000', '10000'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], 1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00110', '01000', '10000', '11111'], 3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'], 5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], 7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], 9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'], D: ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'], H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'], J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'], L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'], N: ['10001', '10001', '11001', '10101', '10011', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'], R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'], T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'], V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'], X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'], Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
};
export function fontSheet(fill = hex('#fff4d8'), shade = hex('#f4cc52'), outlined = true) {
  const cols = 16, rows = Math.ceil(FONT_CHARS.length / cols);
  const p = new Pix(cols * 8, rows * 10);
  [...FONT_CHARS].forEach((ch, i) => {
    const cell = new Pix(8, 10);
    (G[ch] || []).forEach((row, y) => [...row].forEach((b, x) => { if (b === '1') cell.set(1 + x, 1 + y, y < 4 ? fill : shade); }));
    if (outlined && ch !== ' ') cell.outline(hex('#1c0604'));
    p.blit(cell, (i % cols) * 8, Math.floor(i / cols) * 10);
  });
  return p;
}

// ---- Phase 8 review: night canopy for Ropey (128x56, tiles horizontally).
// Ropes hang out of this foliage. Its lower edge sits where DK's raised hands
// stop at the climb limit, so the limit reads as "the rope goes into the leaves".
export const N = {
  n0: hex('#060d14'), n1: hex('#0d2126'), n2: hex('#163a36'), n3: hex('#245443'), n4: hex('#3b7652'), n5: hex('#5f9a64'),
};
export function canopyNight() {
  const W = 128, H = 56, p = new Pix(W, H);
  const edge = x => 42 + Math.round(Math.sin(x / W * Math.PI * 4) * 3 + Math.sin(x / W * Math.PI * 10 + 1) * 2);
  for (let x = 0; x < W; x++) for (let y = 0; y < edge(x); y++) p.set(x, y, N.n1);
  const r = rng(71);
  const wrapW = x => ((x % W) + W) % W;
  // leaf clusters: ellipses whose lower halves form the ragged hanging edge
  const blob = (cx, cy, rx, ry, body, light) => {
    for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++)
      if ((xx * xx) / (rx * rx) + (yy * yy) / (ry * ry) <= 1) p.set(wrapW(cx + xx), cy + yy, yy < -ry * 0.35 ? light : body);
  };
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * W), y = 6 + Math.floor(r() * 34), t = r();
    blob(x, y, 4 + Math.floor(r() * 5), 2 + Math.floor(r() * 3), t < 0.55 ? N.n2 : N.n3, t < 0.55 ? N.n3 : N.n4);
  }
  // hanging leaf tips along the lower edge
  for (let x = 2; x < W; x += 7 + Math.floor(r() * 5)) {
    const e = edge(x), len = 4 + Math.floor(r() * 7);
    for (let k = 0; k < len; k++) { p.set(x, e + k - 1, N.n2); if (k < len - 2) p.set(x + 1, e + k - 1, N.n3); }
    p.set(x, e + len - 1, N.n4);
  }
  for (let i = 0; i < 40; i++) { const x = Math.floor(r() * W), y = 4 + Math.floor(r() * 36); if (p.alpha(x, y)) p.set(x, y, N.n5); }
  // dark outline under the edge so it reads against the night sky
  const add = [];
  for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) if (!p.alpha(x, y) && p.alpha(x, y - 1)) add.push([x, y]);
  add.forEach(([x, y]) => p.set(x, y, N.n0));
  return p;
}

// ---- Phase 8: Reptile Rumble cave (original art after the GBC reference sheet:
// purple formations hanging from the ceiling, dark stone, warm orange floor band).
export const CV = {
  K: hex('#1f0905'),
  fl0: hex('#7a3422'), fl1: hex('#b85c34'), fl2: hex('#e08850'), fl3: hex('#f0a868'), fl4: hex('#f8cc98'),
  rk0: hex('#1c0608'), rk1: hex('#3a0c12'), rk2: hex('#5c1a1c'), rk3: hex('#83302a'),
  wl0: hex('#1a0c0a'), wl1: hex('#2e1610'), wl2: hex('#4a2618'), wl3: hex('#6a3a22'), wl4: hex('#8e5630'),
  pu0: hex('#2a1238'), pu1: hex('#51226a'), pu2: hex('#7c3a96'), pu3: hex('#a95cc2'), pu4: hex('#d496e4'),
};
// Warm floor band (16x12, same geometry as the Jungle path: row 2 is the walking line).
export function caveTop() {
  const p = new Pix(16, 12);
  const wave = x => Math.round(Math.sin((x / 16) * Math.PI * 2 + 0.8) * 0.6);
  for (let x = 0; x < 16; x++) {
    const t = 1 + wave(x);
    p.set(x, t, CV.K); p.set(x, t + 1, CV.fl4);
    for (let y = t + 2; y < 8; y++) p.set(x, y, CV.fl3);
    p.set(x, 8, CV.fl2); p.set(x, 9, CV.fl1); p.set(x, 10, CV.fl0); p.set(x, 11, CV.rk1);
  }
  const r = rng(81);
  for (let i = 0; i < 10; i++) { const x = Math.floor(r() * 16), y = 3 + Math.floor(r() * 5); p.set(x, y, r() < 0.5 ? CV.fl2 : CV.fl4); }
  return p;
}
// Dark red stone below the floor, dithered (tiles both ways, 16x16).
export function caveFill() {
  const p = new Pix(16, 16).fill(CV.rk1);
  const r = rng(83);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y * 2) % 4 === 0 && r() < 0.6) p.set(x, y, CV.rk2);
  const lump = (cx, cy) => { for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]) p.set((cx + dx) % 16, (cy + dy) % 16, CV.rk3); p.set((cx + 3) % 16, (cy + 2) % 16, CV.rk0); };
  lump(2, 2); lump(10, 5); lump(5, 11); lump(13, 13);
  for (let i = 0; i < 8; i++) p.set(Math.floor(r() * 16), Math.floor(r() * 16), CV.rk0);
  return p;
}
export function caveSide(right) {
  const p = new Pix(6, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 6; x++) {
    const s = (y + (x > 2 ? 5 : 0)) % 8;
    p.set(x, y, s === 0 ? CV.K : s < 3 ? CV.wl4 : s < 6 ? CV.wl3 : CV.wl2);
  }
  for (let y = 0; y < 16; y++) p.set(right ? 5 : 0, y, CV.K);
  return p;
}
export function caveCap(right) {
  const p = new Pix(6, 12);
  const rows = ['..KKKK', '.KLLLL', 'KLPPPP', 'KPPPPP', 'KPPPPP', 'KPPPPP', 'KPPPPP', 'KPPPPP', 'KSSSSS', 'KMMMMM', 'KDDDDD', 'KKKKKK'];
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = { K: CV.K, L: CV.fl4, P: CV.fl3, S: CV.fl2, M: CV.fl1, D: CV.fl0 }[ch]; if (c) p.set(right ? 5 - x : x, y, c);
  }));
  return p;
}
function wrapN(x, W) { return ((x % W) + W) % W; }
// Far layer 256x144: dark cave wall with the purple curtains hanging from the ceiling.
export function caveFar() {
  const W = 256, H = 144, p = new Pix(W, H).fill(CV.wl1);
  const r = rng(91);
  // rock facets on the back wall
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * W), y = 30 + Math.floor(r() * 110), w = 3 + Math.floor(r() * 8), h = 2 + Math.floor(r() * 4);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w - yy; xx++) p.set(wrapN(x + xx, W), y + yy, yy === 0 ? CV.wl2 : CV.wl0);
  }
  // Angular violet ceiling slabs and tapered stalactites, not striped curtains.
  for (let x = -12; x < W; x += 28) {
    const depth = 20 + Math.floor(r() * 27), tip = x + 15;
    p.polygon([[x,0],[x+32,0],[x+25,19],[tip,depth],[x+5,22]], CV.pu0);
    p.polygon([[x,0],[x+17,0],[tip-3,depth-4],[x+5,22]], CV.pu2);
    p.polygon([[x+17,0],[x+32,0],[x+25,19],[tip,depth],[tip-3,depth-4]], CV.pu1);
    p.capsule(x+4,3,tip-3,depth-7,0.7,CV.pu3);
  }
  // dark ceiling rim above the curtains
  for (let x = 0; x < W; x++) for (let y = 0; y < 3 + Math.round(Math.sin(x / 11) * 1.5 + 1.5); y++) p.set(x, y, CV.wl0);
  return p;
}
// Near layer 256x108 (transparent top): brown rock formations and stalagmites.
export function caveNear() {
  const W = 256, H = 108, p = new Pix(W, H);
  const r = rng(93);
  const top = x => 58 + Math.round(Math.sin(x / 23) * 10 + Math.sin(x / 9.3) * 4);
  for (let x = 0; x < W; x++) for (let y = top(x); y < H; y++) p.set(x, y, CV.wl2);
  // stalagmites
  for (const [x, h, w] of [[20, 34, 12], [70, 22, 9], [118, 40, 14], [170, 28, 10], [222, 36, 12]]) {
    const base = top(x) + 6;
    p.polygon([[x - w, base], [x - 1, base - h], [x + 1, base - h], [x + w, base]].map(([a, b]) => [wrapN(a, W), b]), CV.wl2);
    for (let y = base - h + 2; y < base; y++) p.set(wrapN(x - 1, W), y, CV.wl4);
  }
  // lighter rims and dark cracks
  const add = [];
  for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) if (p.alpha(x, y) && !p.alpha(x, y - 1)) add.push([x, y]);
  add.forEach(([x, y]) => { p.set(x, y, CV.wl4); p.set(x, y + 1, CV.wl3); });
  for (let i = 0; i < 120; i++) { const x = Math.floor(r() * W), y = 60 + Math.floor(r() * 46); if (p.alpha(x, y)) p.set(x, y, r() < 0.5 ? CV.wl1 : CV.wl3); }
  const out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!p.alpha(x, y) && [[1, 0], [-1, 0], [0, 1]].some(([a, b]) => p.alpha(wrapN(x + a, W), y + b))) out.push([x, y]);
  out.forEach(([x, y]) => p.set(x, y, CV.wl0));
  // darker lower part (seen only below the floor band)
  for (let y = 94; y < H; y++) for (let x = 0; x < W; x++) if (p.alpha(x, y)) p.set(x, y, (x + y) % 3 ? CV.wl1 : CV.wl0);
  return p;
}
