// Donkey Kong sprite frames, built from simple shapes and editable pose tables.
// Original art for this project, drawn after the GBC reference (see docs/art/REFERENCIA_ARTE.md).
// Cell 32x32, facing right. Anchor: feet centre at (16, 32) = bottom centre of the
// 12x16 physics body (the body spans x 10..21, y 16..31 inside the cell).
// Each body part is drawn on its own layer and outlined before compositing, so arms
// read against the torso the way hand-drawn pixel art separates them.
import { Pix, hex } from './pixel.mjs';

export const PAL = {
  K: hex('#1c0604'), // outline (sampled dark ~#1c0301)
  F1: hex('#390e16'), // Phase 6: maroon shadows, less orange than Phase 5
  F2: hex('#681e2e'),
  F3: hex('#9c3e4e'),
  S1: hex('#bb6569'),
  S2: hex('#e79a94'),
  S3: hex('#f6b7a4'),
  // Face mask, a little paler than hands/feet (user request after playtest).
  M1: hex('#f0b7a8'),
  M2: hex('#fcd8c8'),
  W: hex('#fff4e6'), // eye white
  R: hex('#d8383a'), // tie
  Y: hex('#f4cc52'), // tie letters
};

// Pose units: logical pixels in the 32x32 cell. Omitted keys use IDLE.
export const IDLE = {
  head: [18.5, 10.5],
  torso: [14.5, 19.5, 7.2, 6.4],
  backLeg: [[13, 24], [12, 29]], frontLeg: [[18.5, 24], [20, 29]],
  backFoot: [11.5, 30.3, 2.8, 1.5], frontFoot: [20.5, 30.3, 3, 1.5],
  backArm: [[10, 16], [8, 25.2]], frontArm: [[15.5, 16], [20.5, 25.2]],
  backHand: [8, 27, 2.9, 2.3], frontHand: [21, 27.2, 3.2, 2.4], tieAt: [21, 16],
  mouth: 'closed', eyes: 'open', tie: true, frontArmOnTop: true,
};

function layer(draw) { const l = new Pix(32, 32); draw(l); return l; }

export function drawDK(pose) {
  const P = { ...IDLE, ...pose };
  const [hx, hy] = P.head;
  const [tx, ty, trx, try_] = P.torso;
  const out = new Pix(32, 32);
  const put = (l, outline = true) => { if (outline) l.outline(PAL.F1); out.blit(l, 0, 0); };
  const limb = (l, joints, radius, color) => {
    for (let i = 1; i < joints.length; i++) l.capsule(...joints[i - 1], ...joints[i], radius, color);
  };

  // back arm + hand (shadowed, behind everything)
  put(layer(l => { limb(l, P.backArm, 2.6, PAL.F1); l.ellipse(...P.backHand, PAL.S1); }));
  // back leg
  put(layer(l => { limb(l, P.backLeg, 2.2, PAL.F1); l.ellipse(...P.backFoot, PAL.S1); }));
  // torso + front leg
  put(layer(l => {
    l.ellipse(tx, ty, trx, try_, PAL.F2);
    limb(l, P.frontLeg, 2.4, PAL.F2);
    l.ellipse(...P.frontFoot, PAL.S2);
    shade(l);
  }));
  const frontArm = () => put(layer(l => { limb(l, P.frontArm, 2.8, PAL.F2); shade(l); l.ellipse(...P.frontHand, PAL.S2); l.set(P.frontHand[0]-1, P.frontHand[1]+1, PAL.S1); }));
  if (P.armsBehindHead) frontArm();
  // head
  put(layer(l => {
    l.ellipse(hx, hy, 6.2, 5.6, PAL.F2);
    l.polygon([[hx - 3.5, hy - 4], [hx - 1, hy - 7], [hx + 1, hy - 5.5], [hx + 2.8, hy - 4]], PAL.F2);
    shade(l);
    // face mask + muzzle
    l.ellipse(hx - 4.5, hy + 1, 1.8, 2.3, PAL.S1); // rounded ear
    l.ellipse(hx + 2, hy + 0.2, 4.2, 3.6, PAL.M1); // light, readable face mask
    l.ellipse(hx + 3.4, hy + 3.3, 4.6, 3.2, PAL.M1); // broad jaw, not a flat snout
    l.ellipse(hx + 3.5, hy + 4, 3.5, 1.5, PAL.M2);
    l.ellipse(hx + 1.5, hy - 0.4, 1.6, 1.1, PAL.M2); // pale around the eyes
    l.ellipse(hx + 4.4, hy + 1.6, 2.7, 1.5, PAL.S1);
    // frowning brow: a clear V, low over the nose and raised at the sides
    for (const [bx, by] of [[0,-4],[1,-3],[2,-3],[3,-2],[4,-3],[5,-4],[6,-4]]) l.set(hx + bx, hy + by, PAL.K);
    for (const [bx, by] of [[1,-4],[2,-4],[4,-4],[5,-5]]) l.set(hx + bx, hy + by, PAL.F1);
    if (P.eyes === 'open') {
      l.set(hx + 1, hy - 1, PAL.W); l.set(hx + 2, hy - 1, PAL.K);
      l.set(hx + 4, hy - 1, PAL.W); l.set(hx + 5, hy - 1, PAL.K);
    } else if (P.eyes === 'shut') {
      for (const ex of [1, 2, 4, 5]) l.set(hx + ex, hy, PAL.K);
    } else { // 'hurt'
      l.set(hx + 1, hy - 1, PAL.K); l.set(hx + 2, hy, PAL.K); l.set(hx + 2, hy - 1, PAL.K); l.set(hx + 1, hy, PAL.K);
      l.set(hx + 4, hy - 1, PAL.K); l.set(hx + 5, hy, PAL.K); l.set(hx + 5, hy - 1, PAL.K); l.set(hx + 4, hy, PAL.K);
    }
    l.set(hx + 3, hy + 2, PAL.K); l.set(hx + 5, hy + 2, PAL.K);
    if (P.mouth === 'open') { for (let i = 2; i <= 6; i++) { l.set(hx + i, hy + 4, PAL.K); l.set(hx + i, hy + 5, i > 2 && i < 6 ? PAL.R : PAL.K); } }
    else for (let i = 3; i <= 6; i++) l.set(hx + i, hy + 4, PAL.S1);
  }));
  // front arm (after the head unless the pose raises the arms beside/behind it)
  if (!P.armsBehindHead) frontArm();
  // tie hangs in front of the chest (drawn after the arm so it stays readable)
  if (P.tie) put(layer(l => {
    const [nx, ny] = P.tieAt;
    l.polygon([[nx - 1.5, ny], [nx + 2, ny], [nx + 2.5, ny + 5], [nx + 1, ny + 7], [nx - 0.5, ny + 5]], PAL.R);
    l.set(nx, ny + 2, PAL.Y); l.set(nx + 1, ny + 3, PAL.Y);
  }));
  return out;
}

// Rim light on fur pixels with open space above/left, shadow below/right.
function shade(p) {
  const same = (x, y, c) => { const q = p.get(x, y); return q[3] && q[0] === c[0] && q[1] === c[1] && q[2] === c[2]; };
  const light = [], dark = [];
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (!same(x, y, PAL.F2)) continue;
    if (!p.alpha(x, y - 1) || !p.alpha(x - 1, y)) light.push([x, y]);
    else if (!p.alpha(x, y + 1) || !p.alpha(x + 1, y) || !p.alpha(x, y + 2)) dark.push([x, y]);
    // Broad, clean masses: no modulo texture, which formed diagonal stripes.
  }
  light.forEach(([x, y]) => p.set(x, y, PAL.F3));
  dark.forEach(([x, y]) => p.set(x, y, PAL.F1));
}

// Grip layer for climbing: hands (and the pressing foot) drawn IN FRONT of the vine,
// with a finger crease, so they read as wrapped around it rather than beside it.
export function drawGrip(spec) {
  const out = new Pix(32, 32);
  const part = (x, y, rx, fill, lit) => {
    const l = new Pix(32, 32);
    l.ellipse(x, y, rx, rx * 0.85, fill);
    l.set(Math.round(x) - 1, Math.round(y) - 1, lit);
    l.set(Math.round(x) + 1, Math.round(y), PAL.F1);          // finger crease across the vine
    l.set(Math.round(x) + 1, Math.round(y) + 1, PAL.F1);
    l.outline(PAL.K);
    out.blit(l, 0, 0);
  };
  for (const [x, y, r] of spec.hands) part(x, y, r, PAL.S2, PAL.S3);
  for (const [x, y, r] of spec.feet) part(x, y, r, PAL.S1, PAL.S2);
  return out;
}
