// Terrain with relief (post-Phase 8 visual pass, requested by the user after comparing
// with the GBC reference): a thick "tube-shaded" path band lit from the top-left, rounded
// shoulders where the band bends down over a ledge, cobbled rock with lit/shadowed facets,
// shaded side columns and a soft shadow under the band's lip.
// Original, procedurally drawn art (fixed seeds, byte-identical rebuilds). Inspired by the
// look of the era, not copied from the game.
import { Pix, hex } from './pixel.mjs';
import { rng } from './env.mjs';

export const JUNGLE_T = {
  K: hex('#1f0905'), hi: hex('#fbe2c6'), p4: hex('#f4c0a0'), p3: hex('#eaa183'), p2: hex('#c98e74'), p1: hex('#8f5c49'), lip: hex('#5c3024'),
  r0: hex('#0e0805'), r1: hex('#241a10'), r2: hex('#3e3020'), r3: hex('#5e4c32'), r4: hex('#86704a'),
  s0: hex('#3e2c1e'), s1: hex('#5a4330'), s2: hex('#8c6748'), s3: hex('#ad7957'), s4: hex('#d09a70'),
};
export const CAVE_T = {
  K: hex('#1f0905'), hi: hex('#fde0b8'), p4: hex('#f8cc98'), p3: hex('#f0a868'), p2: hex('#e08850'), p1: hex('#b85c34'), lip: hex('#6a2a1c'),
  r0: hex('#140406'), r1: hex('#300a10'), r2: hex('#521618'), r3: hex('#7a2a26'), r4: hex('#a4483a'),
  s0: hex('#2a140e'), s1: hex('#4a2618'), s2: hex('#6a3a22'), s3: hex('#8e5630'), s4: hex('#b27844'),
};

/** Colour across the band's thickness, d = 0 (outer surface) .. BAND (lower lip). */
export const BAND = 12;
function bandColour(P, d, x, y, dark = 0) {
  const steps = [
    [1, 'K'], [2, 'hi'], [3, 'p4'], [6, 'p3'], [7, (x + y) % 2 ? 'p3' : 'p2'], [9, 'p2'], [10, 'p1'], [11, 'lip'], [12, 'K'],
  ];
  let key = 'K';
  for (const [lim, k] of steps) if (d < lim) { key = k; break; }
  if (dark && key !== 'K') key = { hi: 'p4', p4: 'p3', p3: 'p2', p2: 'p1', p1: 'lip', lip: 'lip' }[key];
  return P[key];
}

// Path band, 16x16, tiles horizontally. Row ~1 is the walking line (the view draws it
// 2 px above the solid top, as before). Rows below the lip are a dithered shadow that
// falls on the rock fill.
export function bandTop(P, seed = 7) {
  const p = new Pix(16, 16);
  const wave = x => Math.round(Math.sin((x / 16) * Math.PI * 2) * 0.6);
  const r = rng(seed);
  for (let x = 0; x < 16; x++) {
    const t = 1 + wave(x);
    for (let d = 0; d < BAND; d++) p.set(x, t + d, bandColour(P, d, x, t + d));
    const s = t + BAND; // shadow on the rock under the lip
    p.set(x, s, P.r0);
    if ((x + s) % 2 === 0) p.set(x, s + 1, P.r0);
    if (x % 4 === 1) p.set(x, s + 2, P.r0);
  }
  // pebbles and worn spots on the walking surface
  for (let i = 0; i < 7; i++) {
    const x = Math.floor(r() * 15), y = 4 + Math.floor(r() * 3);
    p.set(x, y, P.p2); p.set(x + 1, y, P.p1); p.set(x, y - 1, P.hi);
  }
  for (let i = 0; i < 6; i++) p.set(Math.floor(r() * 16), 7 + Math.floor(r() * 2), P.p1);
  return p;
}

// Cobbled rock, 32x32, tiles both ways: stones (wrapped Voronoi, stretched along a
// diagonal so they read as leaf-like slabs), each lit from the top-left, dark crevices.
export function rockFill(P, seed = 11) {
  const W = 32, p = new Pix(W, W).fill(P.r0), r = rng(seed);
  const seeds = Array.from({ length: 6 }, () => [r() * W, r() * W]);
  const dist = (x, y, [sx, sy]) => {
    let dx = x - sx, dy = y - sy;
    dx -= W * Math.round(dx / W); dy -= W * Math.round(dy / W);
    const u = (dx + dy) * 0.7071, v = (dx - dy) * 0.7071; // diagonal stretch
    return { d: Math.max(Math.abs(u) * 0.85, Math.abs(v) * 1.12) + Math.hypot(u, v) * 0.2, dx, dy };
  };
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const ds = seeds.map(s => dist(x + 0.5, y + 0.5, s)).sort((a, b) => a.d - b.d);
    const gap = ds[1].d - ds[0].d;
    if (gap < 1.1) { p.set(x, y, gap < 0.55 ? P.r0 : P.r1); continue; }
    const { dx, dy, d } = ds[0];
    const lit = -(dx + dy) / (d + 3);        // top-left facing > 0
    p.set(x, y, gap < 2 && lit > 0.2 ? P.r4 : dy < -2 && lit > 0 ? P.r3 : dx > 2 || lit < -0.45 ? P.r1 : P.r2);
  }
  for (let i = 0; i < 18; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * W); if (p.get(x, y)[0] === P.r2[0]) p.set(x, y, P.r3); }
  return p;
}

// Exposed ledge side, 8x16 (tiles vertically): a stone column shaded as a cylinder.
// The right side is on the shadow side of the light.
export function sideColumn(P, right) {
  const p = new Pix(8, 16);
  const ramp = right ? ['K', 's2', 's2', 's1', 's1', 's1', 's0', 's0'] : ['K', 's4', 's3', 's3', 's2', 's2', 's1', 's0'];
  for (let y = 0; y < 16; y++) for (let i = 0; i < 8; i++) {
    const x = right ? 7 - i : i;
    const joint = (y + (i > 3 ? 4 : 0)) % 8;
    let c = P[ramp[i]];
    if (i > 0 && joint === 0) c = P.s0;
    else if (i > 0 && joint === 1) c = P[right ? 's1' : 's3'];
    p.set(x, y, c);
  }
  return p;
}

// Rounded shoulder, 12x17: the path band bends down over the ledge corner (quarter
// round of radius BAND) and tucks under onto the shaded side column.
export function shoulder(P, right) {
  const W = BAND, H = 16, p = new Pix(W, H + 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let d;
    if (y < BAND) {
      const cx = BAND, cy = BAND; // centre inside the ground
      const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (r > BAND) continue;
      d = BAND - r;
    } else {
      d = x + 0.5;
      const end = H - 1 - y;               // tuck the strip under at the bottom
      if (end < 3 && d > 3 + end * 2) continue;
    }
    const X = right ? W - 1 - x : x;
    p.set(X, y + 1, bandColour(P, Math.floor(d), x, y, right ? 1 : 0));
  }
  // outline under the tucked end
  for (let x = 0; x < W; x++) for (let y = H; y > BAND; y--) {
    const X = right ? W - 1 - x : x;
    if (!p.alpha(X, y) && p.alpha(X, y - 1)) { p.set(X, y, P.K); break; }
  }
  return p;
}

// Reptile near backdrop, 256x144, full screen height (columns reach the ceiling), redrawn so it reads as rock:
// cave columns and stalagmites shaded as cylinders (lit from the left), a rounded rock
// mass along the bottom, strata lines and a dark outline against the purple wall.
export const CAVE_ROCK = {
  K: hex('#140806'), d0: hex('#241008'), d1: hex('#3a1c10'), d2: hex('#583020'), d3: hex('#7a482c'), d4: hex('#a0683c'),
};
export function caveFormations() {
  const W = 256, H = 144, p = new Pix(W, H), C = CAVE_ROCK, O = 36;
  const wrap = x => ((x % W) + W) % W;
  const shade = (u, y) => {                     // broad facets, with irregular mineral strata
    const strata = ((y + Math.floor(u * 3)) % 23 === 0) ? 1 : 0;
    const k = u < -0.7 ? 4 : u < -0.25 ? 3 : u < 0.35 ? 2 : u < 0.75 ? 1 : 0;
    return C['d' + Math.max(0, k - strata)];
  };
  // rounded rock mass along the bottom
  const top = x => O + 74 + Math.round(Math.sin(x / W * Math.PI * 6) * 5 + Math.sin(x / W * Math.PI * 16 + 1) * 3);
  for (let x = 0; x < W; x++) for (let y = top(x); y < H; y++) {
    const depth = y - top(x);
    p.set(x, y, depth < 2 ? C.d3 : depth < 5 ? C.d2 : depth < 16 ? C.d1 : C.d0);
  }
  // columns (hourglass) and stalagmites (cones), each shaded across its width
  const column = (cx, halfW, y0) => {
    for (let y = y0; y < H; y++) {
      const t = (y - y0) / (H - y0);
      const w = halfW * (0.72 + 0.28 * Math.cos(t * Math.PI * 2)) + (t > 0.7 ? (t - 0.7) * 30 : 0) + Math.sin(Math.floor(y / 8) + cx) * 1.6;
      for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) p.set(wrap(x), y, shade((x - cx) / w, y));
    }
  };
  const cone = (cx, base, h, halfW) => {
    for (let y = base - h; y < H; y++) {
      const t = Math.min(1, (y - (base - h)) / h);
      const w = Math.max(0.6, halfW * Math.pow(t, 0.8) + (t > 0.2 ? Math.sin(y * 0.8 + cx) * 0.7 : 0));
      for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) p.set(wrap(x), y, shade((x - cx) / w, y));
    }
  };
  column(34, 9, 0); column(150, 12, 0); column(214, 7, 0);
  cone(82, O + 80, 34, 11); cone(104, O + 82, 18, 7); cone(188, O + 80, 26, 9); cone(246, O + 78, 20, 8); cone(8, O + 80, 16, 6);
  // Broken boulders: broad lit top planes, shaded fronts and dark right faces.
  for (const [x, y, w, h] of [[48,112,29,21],[115,122,36,23],[172,116,26,23],[226,128,35,19]]) {
    p.polygon([[x-w/2,y],[x-6,y-h],[x+w/3,y-h+3],[x+w/2,y-5],[x+w/3,y+9],[x-w/3,y+7]], C.d1);
    p.polygon([[x-w/2,y],[x-6,y-h],[x+w/3,y-h+3],[x+2,y-3]], C.d3);
    p.polygon([[x-w/2,y],[x+2,y-3],[x+w/3,y+9],[x-w/3,y+7]], C.d2);
    p.capsule(x-6,y-h,x+w/3-2,y-h+3,0.5,C.d4);
  }
  // chips and cracks so the rock is not smooth
  const r = rng(97);
  for (let i = 0; i < 75; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H);
    if (!p.alpha(x, y)) continue;
    const c = p.get(x, y);
    if (c[0] === C.d2[0] || c[0] === C.d3[0]) { p.set(x, y, r() < 0.5 ? C.d1 : C.d4); if (r() < 0.4 && p.alpha(x, y + 1)) p.set(x, y + 1, C.d1); }
  }
  // outline against the wall
  const out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (!p.alpha(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => p.alpha(wrap(x + a), y + b))) out.push([x, y]);
  out.forEach(([x, y]) => p.set(x, y, C.K));
  return p;
}
