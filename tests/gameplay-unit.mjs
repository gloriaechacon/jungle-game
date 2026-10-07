// Deterministic rules tests (no browser). Run: node --experimental-strip-types --import ./tests/support/register.mjs tests/gameplay-unit.mjs
import assert from 'node:assert/strict';
import { LevelRules, ACTION, HITBOX } from '../src/gameplay.ts';
import { JUNGLE } from '../src/jungle-layout.ts';
import { MOVEMENT } from '../src/tuning.ts';

const STEP = 1000 / 60;
const flat = { ...JUNGLE, solids: [[0, 124, 2560, 68]] };
const opts = { gravity: MOVEMENT.gravity, playerWidth: MOVEMENT.width, playerHeight: MOVEMENT.height };
const make = (level = flat, o = opts) => new LevelRules(level, o);
const neutral = { left: false, right: false, b: false };
const player = (x = 40, y = 116, extra = {}) => ({ x, y, vy: 0, grounded: true, previousFeet: y + 8, ...extra });
// The scene only ever advances rules in fixed 1/60 s physics steps.
const advance = (r, ms, p = player()) => { for (let t = 0; t < ms - 1e-9; t += STEP) r.step(STEP, p); };

{ // Clock: fixed steps add up exactly; a single oversized step is guarded, never silently lengthened.
  const r = make(); advance(r, 1000); assert(Math.abs(r.now - 1000) < 1e-6, `60 steps = 1000 ms (${r.now})`);
  const g = make(); g.step(500, player()); assert(Math.abs(g.now - ACTION.maxStepMs) < 1e-9, 'Guard caps a single step');
}
{ // Pickups, checkpoint, persistence and fresh restart.
  const r = make();
  r.step(STEP, player(80)); r.step(STEP, player(80)); assert.equal(r.bananas, 1, 'Each pickup counts once');
  r.step(STEP, player(400)); assert.equal(r.letters, 'B----');
  assert.equal(typeof r.pickups.find(p => p.id === 'B').collectedAt, 'number', 'Pickup time recorded for the sparkle');
  r.step(STEP, player(JUNGLE.checkpoint.x)); assert(r.checkpoint);
  r.respawn(); assert.deepEqual(r.spawn, JUNGLE.checkpoint.spawn);
  assert.equal(r.bananas, 1); assert.equal(r.letters, 'B----');
  r.step(STEP, player(1720)); assert.equal(r.letters, 'BO---');
  assert.equal(make().bananas, 0, 'Explicit restart creates fresh progress');
}
{ // Missed letters move to safe ground before the exit and can really be collected there.
  const r = make();
  r.step(STEP, player(JUNGLE.letterRecoveryFromX + 10));
  const B = r.pickups.find(p => p.id === 'B'), O = r.pickups.find(p => p.id === 'O');
  assert.deepEqual([B.x, B.y], [JUNGLE.letters[0].recover.x, JUNGLE.letters[0].recover.y]);
  assert.deepEqual([O.x, O.y], [JUNGLE.letters[1].recover.x, JUNGLE.letters[1].recover.y]);
  r.step(STEP, player(B.x)); assert.equal(r.letters, 'B----', 'Recovered B collected at its new spot');
  r.step(STEP, player(O.x)); assert.equal(r.letters, 'BO---');
  r.step(STEP, player(JUNGLE.exit.x + 1)); assert(r.finished, 'Exit reached');
  const before = r.snapshot(); advance(r, 1000, player(80)); assert.deepEqual(r.snapshot(), before, 'Finished rules stay frozen');
}
{ // Exit never requires letters.
  const r = make(); r.step(STEP, player(JUNGLE.exit.x + 1)); assert(r.finished); assert.equal(r.letters, '-----');
}
{ // Roll: edge-triggered, grounded only, kills on contact, cannot repeat while J is held.
  const r = make(); const p = player(810);
  r.input({ ...neutral, b: true }, p); assert(r.rolling);
  assert(!r.step(STEP, p).hurt); assert.equal(r.kills.roll, 1); assert.equal(r.enemies[0].defeatedBy, 'roll');
  advance(r, 350); r.input({ ...neutral, b: true }, player()); assert(!r.rolling, 'Holding B cannot repeat rolls');
  r.input(neutral, player()); r.input({ ...neutral, b: true }, player()); assert(r.rolling);
  const air = make(); air.input({ ...neutral, b: true }, player(40, 100, { grounded: false })); assert(!air.rolling, 'No roll starts in the air');
}
{ // Stomp: descending feet within tolerance of the enemy top.
  const r = make(); const e = r.enemies[0];
  const top = e.y - HITBOX.enemy.halfH;
  const res = r.step(STEP, player(e.x, top - 8 + 2, { vy: 100, grounded: false, previousFeet: top + HITBOX.stompTolerance - 0.5 }));
  assert(res.bounce); assert(!res.hurt); assert.equal(r.kills.stomp, 1);
  assert(!r.step(STEP, player(812)).hurt, 'Dead enemies cannot hurt');
  const rising = make(); const e2 = rising.enemies[0];
  assert(rising.step(STEP, player(e2.x, 112, { vy: -100, grounded: false, previousFeet: 124 })).hurt, 'Rising into an enemy hurts');
}
{ // Damage and grace period.
  const r = make();
  assert(r.step(STEP, player(812)).hurt, 'Side contact hurts'); r.respawn();
  assert(!r.step(STEP, player(812)).hurt, 'Grace period after respawn');
  advance(r, 1600); assert(r.step(STEP, player(r.enemies[0].x)).hurt, 'Grace period expires');
}
{ // Barrel: pickup priority, focus-safe release, throw kills, gravity comes from options.
  const r = make(); const p = player(756);
  r.input({ ...neutral, b: true }, p); assert(r.carried); assert(!r.rolling, 'Barrel pickup takes priority');
  r.syncInput(neutral); r.input(neutral, p); assert(r.carried, 'Resync after focus loss cannot throw');
  r.input({ ...neutral, b: true }, p); r.input(neutral, p); assert(!r.carried); assert.equal(r.barrels[0].state, 'thrown');
  advance(r, 500, player(740)); assert.equal(r.kills.barrel, 1, 'Thrown barrel defeats enemy');
  assert.equal(r.barrels[0].state, 'spent'); assert.equal(typeof r.barrels[0].spentAt, 'number');
}
{ // Barrel gravity is the injected shared value, not a private literal.
  const heavy = make(flat, { ...opts }), none = make(flat, { ...opts, gravity: 0 });
  for (const r of [heavy, none]) { const p = player(756); r.input({ ...neutral, b: true }, p); r.input(neutral, p); r.facing = -1; }
  heavy.barrels[0].vx = none.barrels[0].vx = -50; // roll away from the enemy
  advance(heavy, 100, player(40)); advance(none, 100, player(40));
  assert(heavy.barrels[0].vy > none.barrels[0].vy, 'Injected gravity accelerates the barrel');
  assert.equal(none.barrels[0].vy, ACTION.throwVy, 'Zero gravity keeps the throw speed');
}
{ // Walls stop barrels; no hits through walls.
  const r = make({ ...flat, solids: [...flat.solids, [782, 88, 16, 36]] });
  r.input({ ...neutral, b: true }, player(756)); r.input(neutral, player(756));
  advance(r, 100, player(740)); assert.equal(r.barrels[0].state, 'spent', 'Walls stop barrels');
  assert.equal(r.kills.barrel, 0, 'No hits through walls');
}
{ // Hurt while carrying: the carried barrel returns to its origin, ready again.
  const r = make(); const p = player(756);
  r.input({ ...neutral, b: true }, p); assert(r.carried);
  advance(r, 100, player(780));
  r.respawn();
  assert(!r.carried, 'Nothing carried after respawn');
  assert.deepEqual([r.barrels[0].state, r.barrels[0].x, r.barrels[0].y], ['ready', 756, 116]);
  r.syncInput(neutral); r.input(neutral, p); assert.equal(r.barrels.filter(b => b.state === 'thrown').length, 0, 'Releasing J after respawn throws nothing');
}
console.log('PASS rules: fixed-step clock, pickups/persistence, checkpoint, letter recovery (move + collect), ungated exit, roll edges, stomp/rising contact, damage/grace, barrel priority/throw/kill/wall, injected gravity, hurt while carrying.');
