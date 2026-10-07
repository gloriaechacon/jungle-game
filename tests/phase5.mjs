// Phase 5 browser checks on the main route (Jungle with art): sprite presence,
// animation freeze on pause/focus loss, coyote window in real integration, letter
// recovery, stomp/roll/barrel defeats, hurt while carrying, checkpoint, completion
// priority over Start/focus, laptop framing and reference screenshots.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { installBot } from './support/bot.mjs';

const shot = name => fileURLToPath(new URL(`../artifacts/phase-5-${name}.png`, import.meta.url));

export async function testPhase5(page) {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('http://127.0.0.1:4174/?phase5=1');
  await page.waitForFunction(() => document.getElementById('scene-name').textContent === 'JungleGreyboxScene' && !!document.getElementById('movement-stats').dataset.state);
  await page.locator('#activate-input').click();
  const state = () => page.locator('#movement-stats').evaluate(el => JSON.parse(el.dataset.state));
  const canvas = page.locator('canvas');
  await page.waitForFunction(() => JSON.parse(document.getElementById('movement-stats').dataset.state).grounded);
  await installBot(page);
  const bot = (fn, arg) => page.evaluate(fn, arg);

  // --- sprites are the presentation (no placeholder rectangles on this route)
  let s = await state();
  assert(s.view, 'View telemetry present');
  assert.match(s.view.dkFrame, /^dk-idle-/, 'DK idles at the start');
  assert(s.view.dkVisible && s.view.hudVisible);
  assert(s.view.enemyFrames.every(f => /^gnawty-walk-/.test(f)), 'Enemies drawn as sprites');
  assert.match(s.view.starBarrel, /^star-barrel-/, 'Checkpoint star barrel visible');
  assert.equal(s.view.dkFeet, 124, 'Sprite feet on the ground line (body bottom)');
  await canvas.screenshot({ path: shot('start') });
  // Collision review toggle (set without moving keyboard focus away from the game).
  const toggle = (id, on) => page.evaluate(([id, on]) => { const el = document.getElementById(id); el.checked = on; el.dispatchEvent(new Event('change', { bubbles: true })); }, [id, on]);
  await toggle('show-body', true); await page.waitForTimeout(80);
  await canvas.screenshot({ path: shot('collisions') });
  await toggle('show-body', false);

  // --- animations and clocks freeze on Start pause and on focus loss, and resume
  await page.waitForTimeout(250);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => JSON.parse(document.getElementById('movement-stats').dataset.state).paused);
  const pausedA = await state(); await page.waitForTimeout(600); const pausedB = await state();
  assert.equal(pausedB.simTime, pausedA.simTime, 'Simulation time frozen in pause');
  assert.deepEqual(pausedB.view, pausedA.view, 'Sprite frames frozen in pause (DK, enemies, bananas, star barrel)');
  assert.deepEqual(pausedB.gameplay, pausedA.gameplay);
  assert.deepEqual(pausedB.view.overlay, ['PAUSA', 'ESPACIO: SEGUIR']);
  await canvas.screenshot({ path: shot('pause') });
  await page.keyboard.press('Space');
  await page.waitForFunction(t => JSON.parse(document.getElementById('movement-stats').dataset.state).simTime > t + 400, pausedB.simTime);
  // Animation continues after resuming.
  await page.waitForFunction(prev => { const v = JSON.parse(document.getElementById('movement-stats').dataset.state).view; return JSON.stringify(v.enemyFrames.concat(v.bananaFrames)) !== prev; },
    JSON.stringify(pausedB.view.enemyFrames.concat(pausedB.view.bananaFrames)), { timeout: 3000 });
  await page.locator('#scale-select').focus();
  await page.waitForFunction(() => JSON.parse(document.getElementById('movement-stats').dataset.state).paused);
  const unfocusedA = await state(); await page.waitForTimeout(400); const unfocusedB = await state();
  assert.equal(unfocusedB.simTime, unfocusedA.simTime, 'Focus loss freezes simulation time');
  assert.deepEqual(unfocusedB.view, unfocusedA.view, 'Focus loss freezes sprite animation');
  await page.locator('#activate-input').click();
  await page.waitForFunction(() => !JSON.parse(document.getElementById('movement-stats').dataset.state).paused);

  // --- walking and jumping frames; climb onto the 248 platform
  s = await bot(() => window.__bot.travel(s => s.x > 120, { run: false, label: 'walk' }));
  assert.match(s.view.dkFrame, /^dk-walk-/, 'Walk cycle while walking');
  await canvas.screenshot({ path: shot('walk') });
  s = await bot(() => window.__bot.travel(s => !s.grounded && s.vy < -120, { run: false, label: 'jump' }));
  assert.equal(s.view.dkFrame, 'dk-jump-up');
  await canvas.screenshot({ path: shot('jump') });
  await bot(() => window.__bot.travel(s => s.grounded && Math.abs(s.y - 82) < 1 && s.x > 262, { run: false, label: 'onto 248' }));
  await bot(() => window.__bot.stop());
  // --- ledge: feet centre past the edge while the 12 px body still rests on it -> teeter pose
  await bot(async () => { const b = window.__bot; b.down('KeyD'); await b.until(s => s.x >= 296.5, 'to ledge'); b.up('KeyD'); await b.until(s => Math.abs(s.vx) < 0.01, 'still at ledge'); });
  await page.waitForTimeout(100);
  s = await state();
  assert(s.grounded && s.x > 296 && s.x < 302, `Standing on the edge (${s.x})`);
  assert.match(s.view.dkFrame, /^dk-teeter-/, 'Teeter pose when the feet centre is over the gap');
  await canvas.screenshot({ path: shot('ledge') });

  // --- coyote window in the real game: press K ~1 frame after walking off the edge
  const coyote = await bot(async () => {
    const b = window.__bot;
    b.down('KeyD');
    const left = await b.until(s => !s.grounded && s.vy >= 0, 'leave edge');
    b.down('KeyK');
    const jumped = await b.until(s => s.vy < -150 || s.grounded, 'coyote jump or land');
    await new Promise(r => setTimeout(r, 200)); b.up('KeyK');
    return { leftAt: left.simTime, jumpAt: jumped.simTime, vy: jumped.vy, y: jumped.y };
  });
  assert(coyote.vy < -150, `Jump accepted just after leaving the ledge (${JSON.stringify(coyote)})`);
  assert(coyote.jumpAt - coyote.leftAt <= 100, 'within the 100 ms window');
  // --- jump over letter B while walking; it must not be collected yet
  await bot(() => window.__bot.until(s => s.grounded, 'land after coyote'));
  await bot(() => window.__bot.travel(s => s.grounded && s.x >= 382, { run: false, jumpEnemies: false, label: 'approach B' }));
  await bot(async () => { const b = window.__bot; b.down('KeyK'); await b.until(s => s.x > 420 && s.grounded, 'over B'); b.up('KeyK'); });
  s = await state();
  assert.equal(s.gameplay.letters, '-----', 'Jumped over B without collecting it');

  // --- late press after walking off the 584 platform: no coyote jump, no ghost jump on landing
  await bot(() => window.__bot.travel(s => s.grounded && Math.abs(s.y - 80) < 1 && s.x > 600, { run: false, label: 'onto 584' }));
  await bot(() => window.__bot.stop());
  const late = await bot(async () => {
    const b = window.__bot;
    b.down('KeyD');
    const left = await b.until(s => !s.grounded && s.vy >= 0, 'leave 584');
    await b.until(s => s.simTime - left.simTime >= 150, 'wait 150 ms sim');
    b.down('KeyK');
    let minVy = Infinity;
    const landed = await b.until(s => { minVy = Math.min(minVy, s.vy); return s.grounded; }, 'land');
    const after = await b.until(s => { minVy = Math.min(minVy, s.vy); return s.simTime - landed.simTime >= 150; }, 'after landing');
    b.up('KeyK'); b.up('KeyD');
    return { minVy, grounded: after.grounded, deaths: after.gameplay.deaths };
  });
  assert(late.minVy > -50, `No jump when K is pressed 150 ms after leaving the ledge (${JSON.stringify(late)})`);
  assert(late.grounded && late.deaths === 0);

  // --- barrel: pick up (overhead drawing), throw, defeat the first enemy
  await bot(() => window.__bot.travel(s => s.grounded && s.x >= 738 && Math.abs(s.y - 116) < 1, { label: 'to barrel 1' }));
  await bot(() => window.__bot.stop());
  s = await state();
  if (s.x > 762) { await page.keyboard.down('KeyA'); await page.waitForFunction(() => JSON.parse(document.getElementById('movement-stats').dataset.state).x <= 758); await page.keyboard.up('KeyA'); }
  await page.keyboard.down('KeyD'); await page.keyboard.up('KeyD');
  await bot(() => window.__bot.until(s => Math.abs(s.vx) < 0.01, 'still'));
  await page.keyboard.down('KeyJ');
  s = await bot(() => window.__bot.until(s => s.gameplay.carrying, 'carry'));
  await page.waitForTimeout(80); s = await state();
  assert.match(s.view.dkFrame, /^dk-carry/, 'Carry pose');
  assert(s.view.carriedVisible, 'Carried barrel drawn');
  assert(s.view.carriedY < s.view.dkFeet - 28, 'Carried barrel drawn above the head (visual anchor only)');
  const logical = s.gameplay.barrels[0];
  assert.equal(logical.y, s.y - 14, 'Logical carry position unchanged (player centre - 14)');
  assert.equal(s.gameplay.kills.barrel,0,'Target has not been defeated before the throw');
  await canvas.screenshot({ path: shot('carry') });
  await page.keyboard.up('KeyJ');
  // The shot/driver round trip can outlast a short flight into a nearby enemy.
  // A spent barrel AND its new kill proves this same transition completed;
  // waiting only for the transient 'thrown' frame produced a false timeout.
  s = await bot(() => window.__bot.until(s => s.gameplay.barrels[0].state === 'thrown' ||
    (s.gameplay.barrels[0].state === 'spent' && s.gameplay.kills.barrel === 1), 'thrown or already hit'));
  await page.waitForTimeout(40);
  await canvas.screenshot({ path: shot('throw') });
  s = await bot(() => window.__bot.until(s => s.gameplay.kills.barrel === 1, 'barrel kill'));
  await canvas.screenshot({ path: shot('barrel-hit') });

  // --- checkpoint (star barrel breaks)
  s = await bot(() => window.__bot.travel(s => s.gameplay.checkpoint, { label: 'checkpoint' }));
  await page.waitForTimeout(60);
  await canvas.screenshot({ path: shot('checkpoint') });
  await bot(() => window.__bot.stop());
  s = await state();
  assert.equal(s.view.starBarrel, null, 'Star barrel broken after activation');

  // --- hurt while carrying: barrel returns to its place, nothing is thrown
  if (s.x > 1296) { await page.keyboard.down('KeyA'); await page.waitForFunction(() => JSON.parse(document.getElementById('movement-stats').dataset.state).x <= 1290); await page.keyboard.up('KeyA'); await bot(() => window.__bot.stop()); }
  await page.keyboard.down('KeyJ');
  await bot(() => window.__bot.until(s => s.gameplay.carrying, 'carry 2'));
  const deaths0 = (await state()).gameplay.deaths;
  await page.keyboard.down('KeyD');
  s = await bot(d => window.__bot.until(s => s.gameplay.deaths > d, 'hurt while carrying'), deaths0);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(90);
  await canvas.screenshot({ path: shot('hurt') });
  await page.keyboard.up('KeyJ');
  await page.waitForTimeout(100);
  s = await state();
  assert(!s.gameplay.carrying && !s.view.carriedVisible, 'Nothing carried after the hit');
  assert.deepEqual([s.gameplay.barrels[1].state, s.gameplay.barrels[1].x], ['ready', 1288], 'Carried barrel back at its origin');
  assert(!s.gameplay.barrels.some(b => b.state === 'thrown'), 'Releasing J after the hit throws nothing');
  assert(s.x >= 1260 && s.x < 1272, 'Returned to the checkpoint');

  // --- stomp the second enemy
  await bot(() => window.__bot.until(s => !s.gameplay.invulnerable, 'grace over', 4000));
  // Stand left of the patrol, wait for the enemy to turn at its left end, then jump right onto it.
  const stomp = await bot(async () => {
    const b = window.__bot;
    for (let attempt = 0; attempt < 4; attempt++) {
      await b.travel(s => s.x >= 1288, { run: false, jumpEnemies: false, label: 'stomp stand' });
      const start = await b.stop();
      await b.until(s => { const e = s.gameplay.enemies[1]; return e.direction > 0 && e.x <= 1323; }, 'enemy turns', 8000);
      b.down('KeyD'); b.down('KeyK');
      const end = await b.until(s => s.gameplay.kills.stomp > 0 || s.gameplay.deaths > start.gameplay.deaths || (s.grounded && s.vy >= 0 && s.x > start.x + 30), 'stomp result');
      b.up('KeyK'); b.up('KeyD');
      if (end.gameplay.kills.stomp > 0) return { attempt, ok: true };
      await b.until(s => !s.gameplay.invulnerable, 'grace', 4000);
      if (end.x > 1300) return { attempt, ok: false, end };
    }
    return { ok: false };
  });
  assert(stomp.ok, 'Stomp defeats the second enemy');
  await page.waitForTimeout(60);
  await canvas.screenshot({ path: shot('stomp') });
  s = await state();
  assert.equal(s.gameplay.kills.stomp, 1);

  // --- collect O, then roll into the third enemy
  await bot(() => window.__bot.travel(s => s.gameplay.letters === '-O---' && s.x > 1722, { jumpEnemies: false, label: 'collect O' }));
  s = await bot(() => window.__bot.stop());
  assert(s.x < 1742, `Stopped short of the third enemy (${s.x})`);
  const roll = await bot(async () => {
    const b = window.__bot;
    b.up('KeyJ');
    await b.until(s => s.gameplay.enemies[2].x - s.x <= 30, 'enemy near', 8000);
    b.down('KeyJ');
    const rolling = await b.until(s => s.gameplay.rolling, 'rolling');
    const end = await b.until(s => s.gameplay.kills.roll > 0 || s.gameplay.deaths > 0 && s.gameplay.deaths > rolling.gameplay.deaths || !s.gameplay.rolling, 'roll result');
    b.up('KeyJ');
    return { frame: rolling.view.dkFrame, kills: end.gameplay.kills.roll };
  });
  assert.match(roll.frame, /^dk-roll-/, 'Roll frames while rolling');
  assert.equal(roll.kills, 1, 'Grounded roll defeats the third enemy');
  await canvas.screenshot({ path: shot('roll') });

  // --- letter recovery and exit
  s = await bot(() => window.__bot.travel(s => s.x > 2310, { label: 'to recovery' }));
  const b = s.gameplay.pickups.find(p => p.id === 'B');
  assert.deepEqual([b.x, b.y, b.collected], [2344, 112, false], 'Missed B offered again on safe ground');
  s = await bot(() => window.__bot.travel(s => s.finished, { label: 'exit' }));
  assert.equal(s.gameplay.letters, 'BO---', 'Recovered letter really collected');
  await bot(() => window.__bot.stop().catch(() => null));
  await page.waitForTimeout(700);
  const done = await state();
  assert.match(done.view.dkFrame, /^dk-cheer-/, 'Cheer pose at the exit');
  assert.deepEqual(done.view.overlay.slice(0, 2), ['JUNGLE HIJINXS', 'COMPLETADO!']);
  await canvas.screenshot({ path: shot('final') });

  // --- completion has priority: Space and focus loss change nothing
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  let after = await state();
  assert(after.finished && !after.paused, 'Space does not pause/resume a completed level');
  assert.equal(after.simTime, done.simTime, 'Simulation stays frozen');
  assert.deepEqual(after.view.overlay, done.view.overlay, 'Completion summary stays on screen');
  assert.equal(after.gameplay.bananas, done.gameplay.bananas, 'Space does not restart');
  await page.keyboard.press('Space');
  await page.locator('#scale-select').focus(); await page.waitForTimeout(200);
  after = await state();
  assert.deepEqual(after.view.overlay, done.view.overlay, 'Focus loss keeps the summary');
  await page.locator('#activate-input').click(); await page.waitForTimeout(200);
  after = await state();
  assert.equal(after.simTime, done.simTime); assert(after.finished);
  await page.screenshot({ path: shot('final-page'), fullPage: false });
  console.log(`PASS phase 5: sprites, pause/focus animation freeze, coyote (${Math.round(coyote.jumpAt - coyote.leftAt)} ms) + late press, jump over B, carry overhead/throw/kill, checkpoint, hurt while carrying, stomp, roll kill, letter recovery, completion priority. Deaths ${done.gameplay.deaths}, bananas ${done.gameplay.bananas}/24, sim ${Math.round(done.simTime / 100) / 10}s.`);
  return done;
}

// Laptop framing with the art route: largest integer scale, controls visible, no overflow.
export async function testPhase5Framing(page) {
  for (const size of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await page.goto('http://127.0.0.1:4174/?level=jungle');
    await page.waitForFunction(() => !!document.getElementById('movement-stats').dataset.state);
    await page.locator('#activate-input').click();
    await page.waitForTimeout(400);
    const box = await page.locator('canvas').boundingBox();
    const expected = size.height >= 900 ? 4 : 3;
    assert.equal(box.width, 160 * expected); assert.equal(box.height, 144 * expected);
    for (const sel of ['#console-shell', '.dpad', '[data-action="a"]', '[data-action="b"]']) {
      const r = await page.locator(sel).boundingBox();
      assert(r.y >= 0 && r.y + r.height <= size.height && r.x >= 0 && r.x + r.width <= size.width, `${sel} visible at ${size.width}x${size.height}`);
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal(await page.locator('canvas').evaluate(c => getComputedStyle(c).imageRendering), 'pixelated');
    await page.screenshot({ path: shot(`laptop-${size.width}x${size.height}`) });
  }
  console.log('PASS phase 5 framing: 1280x720 (3x), 1366x768 (3x), 1440x900 (4x) with shell and controls visible.');
}
