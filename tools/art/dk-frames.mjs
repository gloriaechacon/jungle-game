// Pose tables for every DK frame (editable source of the animation).
// Coordinates in the 32x32 cell; feet baseline y=32 (body bottom), body centre x=16.
import { IDLE, drawDK, drawGrip, PAL } from './dk.mjs';
import { Pix } from './pixel.mjs';

const add = (pt, dx, dy) => [pt[0] + dx, pt[1] + dy];
const bob = (pose, dy) => ({
  ...pose,
  head: add(pose.head ?? IDLE.head, 0, dy), torso: [...add((pose.torso ?? IDLE.torso).slice(0, 2), 0, dy), ...(pose.torso ?? IDLE.torso).slice(2)],
  tieAt: add(pose.tieAt ?? IDLE.tieAt, 0, dy),
  backArm: (pose.backArm ?? IDLE.backArm).map((p, i) => i === 0 ? add(p, 0, dy) : p),
  frontArm: (pose.frontArm ?? IDLE.frontArm).map((p, i) => i === 0 ? add(p, 0, dy) : p),
});

// Six distinct knuckle-walking poses: planted hand travels back while the other
// swings forward clear of the ground. Hips sit behind high shoulders, never on feet.
const gait = (running = false) => Array.from({ length: 6 }, (_, i) => {
  const phase = i / 6 * Math.PI * 2, stride = running ? 6 : 4;
  const limb = (offset, hand) => {
    // x = cos(a): during 0..PI the planted limb moves BACK relative to
    // the advancing body; during PI..2PI it lifts and swings FORWARD.
    const a = phase + offset, lift = Math.max(0, -Math.sin(a));
    return [(hand ? 21 : 9) + Math.cos(a) * stride, (hand ? 29 : 30) - lift * (running ? 7 : 5)];
  };
  const fh = limb(0, true), bh = limb(Math.PI, true);
  const ff = limb(Math.PI, false), bf = limb(0, false);
  const bobY = Math.abs(Math.sin(phase)) * (running ? 2 : 1);
  return { head: [20, 10 + bobY], torso: [12.5, 18 + bobY, 7.8, 6], tieAt: [23, 16 + bobY],
    backArm: [[15, 16 + bobY], [bh[0] - 2, bh[1] - 6], bh], backHand: [...bh, 2.5, 2],
    frontArm: [[17, 16 + bobY], [fh[0] - 3, fh[1] - 6], fh], frontHand: [...fh, 3, 2],
    backLeg: [[8, 21 + bobY], [bf[0] - 2, bf[1] - 3], bf], backFoot: [...bf, 2.7, 1.2],
    frontLeg: [[10, 22 + bobY], [ff[0] - 2, ff[1] - 4], ff], frontFoot: [...ff, 3, 1.2] };
});
const walk = gait();
const run = gait(true);

// Arms raised overhead holding a barrel (barrel is a separate sprite).
const armsUp = { armsBehindHead: true, backArm: [[10.5, 16.5], [9.5, 5.5]], backHand: [9.5, 4.5, 2.6, 2.2], frontArm: [[17.5, 16.5], [22, 5.5]], frontHand: [22.5, 4.5, 2.9, 2.3], head: [16.5, 12.5], tieAt: [19, 18] };
const carry = [
  { ...armsUp },
  ...walk.map((w, i) => ({ ...armsUp, frontLeg: w.frontLeg, frontFoot: w.frontFoot, backLeg: w.backLeg, backFoot: w.backFoot, ...(i % 2 ? { head: [18, 11], tieAt: [20.5, 16.5] } : {}) })),
];

// Rope grip point inside the 32x32 climbing cell (the view anchors it to the vine).
export const CLIMB_GRIP = [24, 10];
const CLIMB = [0, 1, 2, 3].map(i => {
  const [hb, hf] = [[1, 8], [3, 6], [8, 1], [6, 3]][i]; // back / front hand heights, both above the head
  const pull = i % 2 ? -1 : 0;
  const sb = [13, 16 + pull], sf = [17.5, 17 + pull];    // shoulders
  const elbow = (s, h, out) => [(s[0] + 24) / 2 + out, (s[1] + h) / 2 + (h < s[1] - 6 ? -1 : 2)];
  const footB = [22.5, 27 + (i % 2)], footF = [23.5, 30 - (i % 2)];
  return {
    pose: {
      head: [14.5, 12 + pull], torso: [15.5, 22 + pull, 5.6, 6], tieAt: [19, 18 + pull],
      armsBehindHead: true,                             // a raised front arm passes behind the head
      backArm: [sb, elbow(sb, hb, 1), [23.5, hb]], backHand: [23.5, hb, 2.2, 2],
      frontArm: [sf, elbow(sf, hf, 0), [23.5, hf]], frontHand: [23.5, hf, 2.4, 2.1],
      backLeg: [[12.5, 25 + pull], [18, 24.5 + pull], footB], backFoot: [...footB, 2.2, 1.6],
      frontLeg: [[15.5, 26 + pull], [20.5, 29], footF], frontFoot: [...footF, 2.6, 1.6],
    },
    grips: [[24, hb, 2.4], [24, hf, 2.6]], feet: [[24, footF[1], 2.4]],
  };
});
export const CLIMB_GRIPS = CLIMB.map(c => ({ hands: c.grips, feet: c.feet }));

export const FRAMES = {
  // Climbing (revised after playtest: "parece colgado del cuello"). Side-on, the
  // whole body hangs BESIDE the vine (x=24), face turned to it and clear of it.
  // Hand-over-hand: the two hands swap high/low over four frames while the
  // body pulls up a pixel; knees bent, feet pressed on the vine. The hands and
  // front foot are also exported as a separate grip layer (CLIMB_GRIPS) that
  // the view draws IN FRONT of the vine, so the fingers wrap around it.
  ...Object.fromEntries(CLIMB.map((c, i) => [`dk-climb-${i}`, c.pose])),
  'dk-hurt-head': { head: [16, 12], torso: [13, 21, 8, 6], eyes: 'hurt', mouth: 'open', tieAt: [19, 18],
    backArm: [[10, 19], [9, 6]], backHand: [10, 5, 3, 2],
    frontArm: [[17, 20], [20, 5]], frontHand: [19, 4.5, 3.5, 2.2] },
  'dk-idle-0': { ...walk[5], frontHand: [24, 29, 3, 2], frontArm: [[17, 17], [21, 24], [24, 29]] },
  'dk-idle-1': bob({ ...walk[5], frontHand: [24, 29, 3, 2], frontArm: [[17, 17], [21, 24], [24, 29]] }, 0.6),
  ...Object.fromEntries(walk.map((p, i) => [`dk-walk-${i}`, p])),
  ...Object.fromEntries(run.map((p, i) => [`dk-run-${i}`, p])),
  'dk-jump-up': { armsBehindHead: true, head: [18.5, 9.5], tieAt: [21, 15], torso: [14.5, 18.5, 7, 6.2],
    backArm: [[10, 15], [6, 8]], backHand: [5.5, 7, 2.7, 2.2], frontArm: [[16, 15], [22.5, 7.5]], frontHand: [23.5, 6.5, 3, 2.3],
    backLeg: [[13, 23], [11, 27.5]], backFoot: [10.5, 28.8, 2.8, 1.5], frontLeg: [[18, 23], [20.5, 26.5]], frontFoot: [21.5, 27.8, 3, 1.5], mouth: 'open' },
  'dk-jump-down': { head: [18.5, 10], tieAt: [21, 15.5],
    backArm: [[10, 16], [5, 20]], backHand: [4.5, 21.2, 2.7, 2.2], frontArm: [[16, 16], [24, 19]], frontHand: [25, 19.8, 3, 2.3],
    backLeg: [[13, 24], [12, 30]], backFoot: [11.5, 30.6, 2.8, 1.4], frontLeg: [[18.5, 24], [20, 30]], frontFoot: [20.5, 30.6, 3, 1.4] },
  'dk-carry-0': carry[0],
  ...Object.fromEntries(carry.slice(1).map((p, i) => [`dk-carry-walk-${i}`, p])),
  'dk-throw': { head: [18.5, 10.5], tieAt: [20.5, 16], backArm: [[11, 17], [22, 18.5]], backHand: [23, 18.5, 2.7, 2.3], frontArm: [[16, 17.5], [25, 19.5]], frontHand: [26.5, 19.5, 3, 2.4], mouth: 'open' },
  'dk-cheer-0': { ...armsUp, eyes: 'shut', mouth: 'open' },
  'dk-cheer-1': bob({ ...armsUp, head: [16.5, 12.5], eyes: 'shut', mouth: 'open', backArm: [[10.5, 16.5], [7, 6]], backHand: [6.5, 5, 2.6, 2.2], frontArm: [[17.5, 16.5], [25, 6]], frontHand: [25.5, 5, 2.9, 2.3] }, -1),
  // Teeter at a ledge (visual feedback when the feet centre has no ground under it).
  'dk-teeter-0': { armsBehindHead: true, head: [19.5, 11], tieAt: [21.5, 16.5], mouth: 'open', backArm: [[10, 16], [4, 9]], backHand: [3.5, 8, 2.6, 2.2], frontArm: [[16, 16], [25, 12]], frontHand: [26, 11, 2.9, 2.3] },
  'dk-teeter-1': { armsBehindHead: true, head: [19.5, 11.5], tieAt: [21.5, 17], mouth: 'open', backArm: [[10, 16], [5, 12]], backHand: [4.5, 11.5, 2.6, 2.2], frontArm: [[16, 16], [24, 8]], frontHand: [25, 7, 2.9, 2.3] },
  'dk-hurt': { armsBehindHead: true, eyes: 'hurt', mouth: 'open', head: [17.5, 11], tieAt: [20, 17], backArm: [[10, 16], [4.5, 11]], backHand: [4, 10, 2.6, 2.2], frontArm: [[16, 16], [24, 10]], frontHand: [24.5, 9, 2.9, 2.3] },
};

// A compact articulated ape doing a clockwise somersault, not a decorated ball.
// Rotate the actual head/arms/legs/tie with nearest-neighbour sampling, then
// align its lowest occupied pixel to the shared feet baseline.
export function drawRoll(i) {
  const curled = drawDK({
    head: [20, 12], torso: [13, 18, 6.5, 5.2], tieAt: [23, 17],
    backArm: [[12,16],[7,19],[7,23]], backHand: [7,23,2.4,2],
    frontArm: [[17,17],[23,19],[24,23]], frontHand: [24,23,2.8,2],
    backLeg: [[10,21],[5,21],[6,25]], backFoot: [6,25,2.5,1.5],
    frontLeg: [[13,22],[15,26],[10,27]], frontFoot: [10,27,3,1.5],
  });
  const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
  const rotated = new Pix(32, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const dx = x - 16, dy = y - 16;
    const sx = Math.round(16 + dx*c + dy*s), sy = Math.round(17 - dx*s + dy*c);
    if (curled.alpha(sx,sy)) rotated.set(x,y,curled.get(sx,sy));
  }
  const box = rotated.bbox(), out = new Pix(32,32);
  if (box) out.blit(rotated,0,32-box.y-box.h);
  return out;
}

export function buildDK() {
  const frames = {};
  for (const [name, pose] of Object.entries(FRAMES)) {
    // Ground locomotion: heavy shoulders and forward muzzle, knuckles close to
    // the path. Keep carry/jump/hit poses independent and the feet anchor fixed.
    frames[name] = drawDK(pose);
  }
  for (let i = 0; i < 8; i++) frames[`dk-roll-${i}`] = drawRoll(i);
  CLIMB_GRIPS.forEach((g, i) => { frames[`dk-climb-grip-${i}`] = drawGrip(g); });
  return frames;
}
