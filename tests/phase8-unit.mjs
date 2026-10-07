// Phase 8 (Reptile Rumble) deterministic checks: tires, level readability, S, camera, B-01 intact.
// Run: node --experimental-strip-types --import ./tests/support/register.mjs tests/phase8-unit.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { TIRE, TireState, tireRect, tireSpeed, tireUnder } from '../src/tires.ts';
import { REPTILE, REPTILE_TIRES } from '../src/reptile-layout.ts';
import { readableStep, readableTarget, surfaceTop } from '../src/camera.ts';
import { LevelRules, HITBOX } from '../src/gameplay.ts';
import { MOVEMENT as T } from '../src/tuning.ts';

// B-01 is untouched (hash approved on 25/09/2026).
const hash = createHash('sha256').update(readFileSync(new URL('../src/tuning.ts', import.meta.url))).digest('hex');
assert.equal(hash, '87f02c4b43fdde42e00c80839ab5d9cfc1b91ed92b39dfc7f1912315f0f6c9f9', 'src/tuning.ts unchanged');

const rise = v => v * v / (2 * T.gravity);
const jumpRise = rise(T.jumpSpeed), lowRise = rise(TIRE.bounce), highRise = rise(TIRE.boost);
assert.equal(REPTILE.width,2304); assert.equal(REPTILE_TIRES.length,4);
assert(REPTILE.enemies[4].min-1680>=T.runSpeed*Math.sqrt(2*32/T.gravity)+T.width,
  'Gallery descent leaves a full running landing before the snake patrol');
const solidsOnly = [...REPTILE.solids,...REPTILE.platforms].filter(s => !REPTILE_TIRES.some(t => tireRect(t).every((v, i) => v === s[i])));
const top = (x, y) => [...REPTILE.solids,...REPTILE.platforms].find(([sx, sy, w]) => x >= sx && x < sx + w && sy === y);

{ // Tire contact: grounded, feet on the tire top, horizontally overlapping. Nothing else.
  const t = REPTILE_TIRES[0], tt = t.y - TIRE.height, hw = T.width / 2;
  assert.equal(tireUnder(REPTILE_TIRES, { x: t.x, feet: tt, grounded: true }, hw), 0);
  assert.equal(tireUnder(REPTILE_TIRES, { x: t.x + TIRE.halfW + hw - 0.5, feet: tt, grounded: true }, hw), 0, 'Edge overlap still bounces');
  assert.equal(tireUnder(REPTILE_TIRES, { x: t.x, feet: tt, grounded: false }, hw), -1, 'Airborne: no bounce');
  assert.equal(tireUnder(REPTILE_TIRES, { x: t.x - 30, feet: t.y, grounded: true }, hw), -1, 'Standing on the floor beside it: no bounce');
  assert.equal(tireSpeed(true), TIRE.boost); assert.equal(tireSpeed(false), TIRE.bounce);
  const st = new TireState(); st.hit(1, 500, TIRE.boost); assert.equal(st.count, 1); st.reset();
  assert.equal(st.count, 0); assert.equal(st.lastBounce.length, 0, 'Tire state clears on restart/return');
}
{ // Own parameters, separate from B-01, and the heights the route relies on.
  assert(TIRE.bounce !== T.jumpSpeed && TIRE.boost > TIRE.bounce);
  for (const t of REPTILE_TIRES) {
    assert(REPTILE.solids.some(s => tireRect(t).every((v, i) => v === s[i])), 'Tire is a physics solid');
    assert(solidsOnly.some(([x, y, w]) => y === t.y && t.x - TIRE.halfW >= x && t.x + TIRE.halfW <= x + w), 'Tire stands on ground');
    // It touches the next higher ground: no floor pocket between tire and wall.
    assert(solidsOnly.some(([x, y]) => x === t.x + TIRE.halfW && y < t.y - TIRE.height), 'Tire against higher ground');
    // Its top is unique nearby, so "feet on the tire top" can only mean standing on the tire.
    assert(!solidsOnly.some(([x, y, w]) => y === t.y - TIRE.height && x < t.x + 40 && x + w > t.x - 40));
  }
  const tireTop = 180 - TIRE.height;
  // 1st tire: the 48 px ledge is out of reach of a normal jump, any bounce reaches it.
  assert(top(400, 132) && 180 - jumpRise > 132 + 4, 'Normal jump cannot reach the first ledge (the tire is taught)');
  assert(tireTop - lowRise < 132 - 8, 'Low bounce clears the first ledge with margin');
  // 2nd tire: only the high bounce (hold K) clears the 64 px wall; failing drops DK back to the floor.
  assert(top(760, 116) && tireTop - lowRise > 116, 'Low bounce does not clear the wall');
  assert(tireTop - highRise < 116 - 20, 'High bounce clears the wall with margin');
  // Final ascent: third tire, then 32 px steps within a normal jump.
  assert(tireTop - lowRise < 132 - 8 && top(1240, 132) && top(1300, 100) && top(1400, 68));
  assert(32 < jumpRise - 8, 'Final steps need only a normal jump');
}
{ // Optional S: right above the first tire, only the high bounce reaches it.
  const S = REPTILE.letters.find(l => l.letter === 'S'), t = REPTILE_TIRES[0];
  assert.equal(S.x, t.x);
  const apexLow = 180 - TIRE.height - lowRise - T.height / 2, apexHigh = 180 - TIRE.height - highRise - T.height / 2;
  assert(apexLow - S.y > HITBOX.pickup.rangeY, 'Low bounce misses the S');
  assert(apexHigh <= S.y + HITBOX.pickup.rangeY, 'High bounce reaches the S');
  assert.equal(surfaceTop(REPTILE, S.recover.x), 68, 'S recovery spot on the exit plateau');
  assert(S.recover.x < REPTILE.exit.x && REPTILE.letterRecoveryFromX < S.recover.x);
}
{ // Level sanity: supported ground patrols, pickups outside solids, no low ceilings (crouch not needed).
  for (const e of REPTILE.enemies.filter(e=>e.kind!=='bee')) {
    assert(['snake','lizard'].includes(e.kind));
    for (const x of [e.min, e.max]) assert(solidsOnly.some(([sx, sy, w]) => x >= sx && x < sx + w && sy === e.y + HITBOX.enemy.halfH), `snake patrol supported at ${x}`);
  }
  for (const [x, y] of REPTILE.bananas) assert(!REPTILE.solids.some(([sx, sy, w, h]) => x >= sx && x < sx + w && y >= sy && y < sy + h), `banana ${x},${y} outside solids`);
  for (let x = 0; x < REPTILE.width; x += 2) {
    const s = surfaceTop(REPTILE, x); if (s === undefined) continue;
    assert(!REPTILE.solids.some(([sx, sy, w, h]) => x >= sx && x < sx + w && sy + h <= s && sy + h > s - 32), `no ceiling lower than 32 px over x=${x}`);
  }
  // One pit only, 32 px, after the checkpoint.
  const pits = []; let open;
  for (let x = 0; x < REPTILE.width; x++) { const s = surfaceTop(REPTILE, x); if (s === undefined && open === undefined) open = x; if (s !== undefined && open !== undefined) { pits.push([open, x]); open = undefined; } }
  assert.deepEqual(pits, [[940, 972]]); assert(REPTILE.checkpoint.x < 940);
}
{ // Rules reuse: S persists through returns, is re-offered before the exit, exit ungated, restart is fresh.
  const opts = { gravity: T.gravity, playerWidth: T.width, playerHeight: T.height };
  const p = (x, y) => ({ x, y, vy: 0, grounded: true, previousFeet: y + 8 });
  const r = new LevelRules(REPTILE, opts);
  r.step(16, p(356, 92)); assert.equal(r.letters, '----S');
  r.step(16, p(880, 172)); assert(r.checkpoint); r.respawn(); assert.equal(r.letters, '----S'); assert.deepEqual(r.spawn, REPTILE.checkpoint.spawn);
  const miss = new LevelRules(REPTILE, opts);
  miss.step(16, p(REPTILE.letterRecoveryFromX+1, 60)); const S = miss.pickups.find(q => q.letter === 'S');
  assert.deepEqual([S.x, S.y], [2190, 60]); miss.step(16, p(2190, 60)); assert.equal(miss.letters, '----S', 'Recovered S collected on safe ground');
  const bare = new LevelRules(REPTILE, opts); bare.step(16, p(REPTILE.exit.x + 1, 60)); assert(bare.finished, 'Exit does not need the S');
  assert.equal(new LevelRules(REPTILE, opts).letters, '-----');
}
{ // Readable camera: the landing below stays visible, and so does DK's whole sprite.
  const onScreen = (scroll, y) => y - scroll >= 0 && y - scroll <= 144;
  for (const [x, feet, below] of [[356, 88, 180], [790, 116, 180], [540, 132, 180], [1240, 132, 180], [1300, 100, 132]]) {
    const s = readableTarget(REPTILE, x, feet);
    assert(onScreen(s, feet - 32) && onScreen(s, feet), `DK visible at ${x},${feet}`);
    assert(onScreen(s, below) && below - s <= 132, `Landing y=${below} visible from ${x},${feet} (scroll ${s})`);
  }
  // Smoothing converges and never lets the sprite leave the screen during a high bounce.
  let s = readableTarget(REPTILE, 356, 180);
  for (let feet = 168, v = -TIRE.boost; feet <= 168; v += T.gravity / 60, feet += v / 60) {
    s = readableStep(REPTILE, s, 356, feet); assert(feet - 32 - s >= 0 && feet - s <= 144);
  }
}
console.log(`PASS phase 8 unit: B-01 hash, tire contact/speeds/state (low ${lowRise.toFixed(1)} px, high ${highRise.toFixed(1)} px vs jump ${jumpRise.toFixed(1)} px), staged heights, optional S + recovery, supported snakes, no low ceilings, single 32 px pit, ungated exit, readable camera.`);
