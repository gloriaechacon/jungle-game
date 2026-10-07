import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

export async function testMovement(page) {
  await page.goto('http://127.0.0.1:4174/?lab=1');
  await page.waitForFunction(() => document.getElementById('scene-name').textContent === 'MovementLabScene');
  const state = () => page.locator('#movement-stats').evaluate(el => JSON.parse(el.dataset.state));
  const waitGround = () => page.waitForFunction(() => JSON.parse(document.getElementById('movement-stats').dataset.state).grounded);
  const reset = async () => {
    const previous = (await state()).resets;
    await page.locator('#restart-lab').click();
    await page.waitForFunction(count => {
      const s = JSON.parse(document.getElementById('movement-stats').dataset.state);
      return s.resets > count && s.grounded && Math.abs(s.y-116) < 0.5;
    }, previous);
  };
  await reset();
  const initial = await state();
  assert(Math.abs(initial.y-116) < 1, 'Rectangle must rest on floor at y=124');
  await page.keyboard.down('KeyD'); await page.waitForTimeout(700); await page.keyboard.up('KeyD');
  const walk = await state();
  assert(walk.x > 50 && walk.vx <= 60, 'Walking moves with capped speed');
  await page.waitForTimeout(150);
  assert.equal((await state()).vx, 0, 'Player brakes to a stop');
  await reset();
  await page.keyboard.down('KeyJ'); await page.keyboard.down('KeyD');
  await page.waitForTimeout(700);
  const run = await state();
  await page.keyboard.up('KeyD'); await page.keyboard.up('KeyJ');
  assert(run.x > walk.x + 15 && run.vx <= 102, 'Running must travel further');
  const jump = async (short) => {
    await reset();
    // Sample in the browser, not between slow automation round trips. The old
    // loop delayed release by the cumulative cost of reading 3 DOM snapshots.
    const sample = page.evaluate(() => new Promise(resolve => {
      let peak = 116;
      const until = performance.now()+1100;
      function frame() {
        peak = Math.min(peak,JSON.parse(document.getElementById('movement-stats').dataset.state).y);
        if (performance.now() >= until) resolve(peak);
        else requestAnimationFrame(frame);
      }
      frame();
    }));
    await page.keyboard.down('KeyK');
    await page.waitForTimeout(short ? 60 : 900);
    await page.keyboard.up('KeyK');
    const peak = await sample;
    await waitGround();
    return peak;
  };
  const short = await jump(true);
  const full = await jump(false);
  assert(full < short - 10, `Holding K must jump higher than tapping (short apex ${short}, full apex ${full})`);
  await reset();
  await page.keyboard.down('KeyK');
  await page.waitForTimeout(900);
  assert((await state()).grounded, 'Held jump must not auto-repeat on landing');
  await page.keyboard.up('KeyK');
  await page.keyboard.press('Space');
  await page.waitForTimeout(60);
  const paused = await state();
  assert(paused.paused);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(250);
  assert.equal((await state()).x, paused.x, 'Pause must freeze physics');
  await page.keyboard.up('KeyD'); await page.keyboard.press('Space');
  await page.keyboard.down('KeyD'); await page.waitForTimeout(150);
  await page.locator('#scale-select').focus(); await page.waitForTimeout(80);
  const unfocused = await state();
  assert(unfocused.paused, 'Losing gameplay focus must pause');
  await page.waitForTimeout(200);
  assert.equal((await state()).x, unfocused.x);
  await page.keyboard.up('KeyD');

  await reset();
  await page.keyboard.down('KeyJ'); await page.keyboard.down('KeyD');
  await page.waitForTimeout(2200);
  const blocked = await state();
  assert(blocked.x >= 184 && blocked.x <= 187, 'Solid platform must block from side');
  assert(blocked.cameraX > 0, 'Camera follows into the wider laboratory');
  await page.keyboard.down('KeyK'); await page.waitForTimeout(480); await page.keyboard.up('KeyK');
  const afterPlatformJump = await state();
  assert(afterPlatformJump.x > 200, `Jump must clear the first platform: ${JSON.stringify(afterPlatformJump)}, before=${JSON.stringify(blocked)}`);
  // Traverse with real controls until beyond the steps, then deliberately walk into the gap.
  for (let i=0; i<18 && (await state()).x < 590; i++) {
    await page.waitForTimeout(100);
    await page.keyboard.down('KeyK'); await page.waitForTimeout(430); await page.keyboard.up('KeyK');
  }
  const beforeGap = await state();
  assert(beforeGap.x >= 590, 'Platform course is traversable');
  await page.waitForFunction(count => JSON.parse(document.getElementById('movement-stats').dataset.state).resets > count, beforeGap.resets, {timeout: 6000});
  await page.keyboard.up('KeyD'); await page.keyboard.up('KeyJ');
  assert((await state()).x < 100, 'Falling returns to the start');
  await reset();
  await page.keyboard.down('KeyA'); await page.waitForTimeout(900); await page.keyboard.up('KeyA');
  assert((await state()).x >= 6, 'Left world bound contains player');
  await reset();
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/phase-b.png', import.meta.url)),fullPage:true});
  console.log('PASS movement: floor, walk/run, braking, jump height, no auto-repeat, pause/focus, solid collision, camera, traversable platforms, fall recovery, world bound.');
}
