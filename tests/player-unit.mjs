// Deterministic B-01 controller tests with a fake Arcade body (no browser).
// Run: node --experimental-strip-types --import ./tests/support/register.mjs tests/player-unit.mjs
import assert from 'node:assert/strict';
import { PlayerController } from '../src/player.ts';
import { MOVEMENT as T } from '../src/tuning.ts';

const STEP = 1000 / 60;
function fakeBody() {
  return {
    velocity: { x: 0, y: 0 }, blocked: { down: true }, touching:{down:true}, position: { x: 0, y: 0 }, width: T.width, height: T.height, halfWidth: T.width / 2, halfHeight: T.height / 2,
    setMaxVelocity() { return this; }, setCollideWorldBounds() { return this; }, setSize() { return this; },
    setVelocityX(v) { this.velocity.x = v; return this; }, setVelocityY(v) { this.velocity.y = v; return this; },
    setVelocity(x, y) { this.velocity.x = x; this.velocity.y = y; return this; }, reset(x, y) { this.position.x = x - T.width / 2; this.position.y = y - T.height / 2; },
  };
}
const keys = (o = {}) => ({ up: false, down: false, left: false, right: false, a: false, b: false, start: false, ...o });
function make() {
  const body = fakeBody();
  const scene = { add: { rectangle: () => ({}) }, physics: { add: { existing: shape => { shape.body = body; } } } };
  const p = new PlayerController(scene, keys());
  return { p, body };
}

{ // Acceleration per fixed step (B-01 values)
  const { p, body } = make();
  p.input(keys({ right: true }), 0); p.update(STEP, STEP);
  assert(Math.abs(body.velocity.x - T.acceleration * STEP / 1000) < 1e-9);
  for (let i = 0; i < 60; i++) p.update(STEP * (i + 2), STEP);
  assert.equal(body.velocity.x, T.walkSpeed, 'Walk speed cap');
  p.input(keys({ right: true, b: true }), 0); for (let i = 0; i < 60; i++) p.update(STEP * (i + 70), STEP);
  assert.equal(body.velocity.x, T.runSpeed, 'Run speed cap');
}
{ // Full vs short jump
  const { p, body } = make();
  p.update(0, STEP);
  p.input(keys({ a: true }), STEP); p.update(STEP, STEP);
  assert.equal(body.velocity.y, -T.jumpSpeed, 'Held press: full impulse');
  body.blocked.down = false;
  p.input(keys(), STEP * 2); assert.equal(body.velocity.y, -T.jumpCutSpeed, 'Release cuts upward speed');
  const b = make(); b.p.update(0, STEP); b.p.input(keys({ a: true }), STEP); b.p.input(keys(), STEP + 1); b.p.update(STEP * 2, STEP);
  assert.equal(b.body.velocity.y, -T.jumpCutSpeed, 'Tap released before the step stays short');
}
{ // Holding K never auto-repeats
  const { p, body } = make();
  p.update(0, STEP); p.input(keys({ a: true }), STEP); p.update(STEP, STEP);
  body.velocity.y = 0; body.blocked.down = true;
  for (let i = 2; i < 40; i++) { p.update(STEP * i, STEP); assert.equal(body.velocity.y, 0, 'No repeat while held'); }
}
{ // Coyote window: 100 ms after leaving ground
  for (const [delay, expectJump] of [[83, true], [100, true], [117, false]]) {
    const { p, body } = make();
    p.update(0, STEP); // grounded at t=0
    body.blocked.down = false; body.velocity.y = 10;
    p.input(keys({ a: true }), delay); p.update(delay, STEP);
    assert.equal(body.velocity.y === -T.jumpSpeed, expectJump, `coyote press at ${delay} ms`);
  }
}
{ // Jump buffer: 110 ms before landing
  for (const [early, expectJump] of [[100, true], [110, true], [133, false]]) {
    const { p, body } = make();
    body.blocked.down = false; body.velocity.y = 50;
    p.update(0, STEP); // airborne
    p.input(keys({ a: true }), 1000 - early);
    p.update(1000 - early, STEP);
    body.blocked.down = true; body.velocity.y = 0;
    p.update(1000, STEP);
    assert.equal(body.velocity.y === -T.jumpSpeed, expectJump, `buffered press ${early} ms before landing`);
  }
}
{ // Stomp bounce precedence: a jump accepted in the same step wins
  const { p, body } = make();
  p.update(0, STEP); p.input(keys({ a: true }), STEP); p.update(STEP, STEP);
  assert.equal(p.bounce(150, STEP), false, 'Bounce ignored in the step a jump was accepted');
  assert.equal(body.velocity.y, -T.jumpSpeed);
  const s = make();
  s.p.update(0, STEP); s.body.blocked.down = false; s.body.velocity.y = 120; // walked off a ledge, falling
  assert.equal(s.p.bounce(150, 20), true); assert.equal(s.body.velocity.y, -150, 'Fixed rebound applied');
  s.p.input(keys({ a: true }), 40); s.p.update(40, STEP);
  assert.equal(s.body.velocity.y, -150, 'Rebound consumes ground tolerance: no extra coyote jump');
}
{ // Pause resync keeps coyote (time is frozen) but drops a pending buffered press
  const { p, body } = make();
  p.update(0, STEP); body.blocked.down = false; body.velocity.y = 10;
  p.syncInput(keys()); // pause at 50 ms sim, resume later: sim time unchanged
  p.input(keys({ a: true }), 60); p.update(60, STEP);
  assert.equal(body.velocity.y, -T.jumpSpeed, 'Coyote survives a pause');
  const b = make(); b.body.blocked.down = false; b.body.velocity.y = 50; b.p.update(0, STEP);
  b.p.input(keys({ a: true }), 900); b.p.syncInput(keys({ a: true }));
  b.body.blocked.down = true; b.body.velocity.y = 0; b.p.update(950, STEP);
  assert.equal(b.body.velocity.y, 0, 'Buffered press from before a pause does not fire as a ghost jump');
}
{
  const {p,body}=make();p.update(0,STEP);p.input(keys({a:true}),10);p.dropThrough();
  p.update(20,STEP);assert.equal(body.velocity.y,0,'Drop consumes coyote and pending jump');
  assert(!p.grounded&&!body.touching.down);assert.equal(body.position.y,1);
  p.input(keys(),30);p.input(keys({a:true}),40);p.update(40,STEP);
  assert.equal(body.velocity.y,0,'No extra jump while falling through a ledge');
}
console.log('PASS player: B-01 movement, jump edges/coyote/buffer, bounce, pause resync and deliberate ledge drop.');
