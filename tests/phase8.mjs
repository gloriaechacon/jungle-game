import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { installBot } from './support/bot.mjs';
import { focusGame, restartStage } from './support/navigation.mjs';

// Phase 8 browser acceptance: Reptile Rumble at /?level=reptile, keyboard only
// (real key events through the in-page bot). No teleport, no test hooks.
export async function testPhase8(page, inAdventure = false) {
  page.on('console', m => { if (m.text().startsWith('REPTILE:')) console.log(m.text()); });
  await page.setViewportSize({ width: 1366, height: 768 });
  if (!inAdventure) await page.goto('http://127.0.0.1:4174/?level=reptile');
  if(!await page.evaluate(()=>typeof window.__captureCliff==='function'))
    await page.exposeFunction('__captureCliff',async()=>{
      const help=await page.locator('#console-help-close').isVisible();
      if(help)await page.locator('#console-help-close').click();
      await page.locator('canvas').screenshot({path:'artifacts/terrain-reptile-wall.png'});
      if(help)await focusGame(page);
      return true;
    });
  await focusGame(page);
  const state = () => page.locator('#movement-stats').evaluate(el => JSON.parse(el.dataset.state));
  const shot = name => page.screenshot({ path: fileURLToPath(new URL(`../artifacts/phase-8-${name}.png`, import.meta.url)) });
  await page.waitForFunction(() => JSON.parse(document.getElementById('movement-stats').dataset.state || '{}').grounded);
  const first = await state();
  assert.equal(first.tires.bounces, 0); assert.equal(first.view.tireFrames.length, 4);
  assert.equal(first.gameplay.letters, '-----'); assert(!first.rope);
  assert.equal(await page.locator('h1').textContent(), 'Reptile Rumble');
  assert.equal(await page.locator('a.level-link').count(), 2, 'Links back to Jungle and to Ropey');
  await shot('start');
  await installBot(page);
  // Every rendered frame: the fall speed must stay within B-01's cap (280) even after tire rises.
  await page.evaluate(() => { window.__vy = { max: 0, min: 0 }; const el = document.getElementById('movement-stats');
    const tick = () => { const s = JSON.parse(el.dataset.state); if(Number.isFinite(s.vy)){window.__vy.max = Math.max(window.__vy.max, s.vy); window.__vy.min = Math.min(window.__vy.min, s.vy);} requestAnimationFrame(tick); }; tick(); });

  // Approach first: both the hint and the S must be readable before jumping.
  await page.evaluate(async () => {
    const b = window.__bot;
    // React to the patrol, not a fixed X: map transitions do not reset browser timing.
    b.down('KeyD'); await b.until(s => s.grounded && s.gameplay.enemies[0].x - s.x < 24, 'to snake');
    b.down('KeyK'); await b.until(s => s.x >= 290, 'over snake'); b.up('KeyK'); await b.stop();
    b.down('KeyD'); await b.until(s => s.x >= 314, 'read tire hint'); await b.stop();
  });
  await focusGame(page);
  await page.waitForFunction(adventure=>adventure?!document.querySelector('#console-coach').hidden:JSON.parse(document.getElementById('movement-stats').dataset.state).guide?.visible,inAdventure);
  const hint = await state();
  if(inAdventure){
    await focusGame(page);
    assert(await page.locator('#console-coach').isVisible(),'First tire has the explicit external exception');
    assert(!hint.guide.visible,'No duplicated tire instruction inside LCD');
    assert.equal(await page.locator('#console-coach').innerText(),'Mantén la tecla K para saltar más alto');
    assert.equal(await page.locator('.console-guide').isVisible(),false,'No duplicated lower tire hint');
    const frame=await page.locator('canvas').boundingBox();
    // Same actual level position, responsive touch presentation only. No scene mutation.
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    for(const size of [{width:320,height:568},{width:390,height:844}]){
      await page.setViewportSize(size);await page.waitForTimeout(1650);
      assert.equal(await page.locator('#console-coach').innerText(),'Mantén A para saltar más alto');
      assert.equal(await page.locator('.coach-ring:not([hidden])').getAttribute('data-action'),'a');
      assert(!(await state()).guide.visible);
      const coach=await page.locator('#console-coach').boundingBox(),lcd=await page.locator('canvas').boundingBox(),mute=await page.locator('#quick-mute').boundingBox();
      assert(coach.x>=0&&coach.y>=0&&coach.x+coach.width<=size.width,'Reminder fits the phone');
      assert(coach.y+coach.height<=lcd.y-2,'Reminder sits above the LCD, never on the game');
      assert(coach.x+coach.width<=mute.x||coach.y>=mute.y+mute.height,'Reminder never covers mute');
      assert(await page.locator('#console-coach').evaluate(e=>e.scrollWidth<=e.clientWidth),'No clipped sentence');
      await page.screenshot({path:`artifacts/tire-reminder-phone-${size.width}.png`});
    }
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
    await page.setViewportSize({width:1366,height:768});await page.waitForTimeout(1650);
    const after=await page.locator('canvas').boundingBox();
    for(const k of ['x','y','width','height'])assert(Math.abs(after[k]-frame[k])<1,'Responsive hint keeps original framing: '+k);
    await focusGame(page);
  }else{
  assert(hint.guide.text.includes('MANTEN K'), 'First tire still explains the high bounce');
  const letterY = 92 - hint.cameraY;
  assert(letterY + 6 + 4 <= hint.guide.y, 'Whole S tile and a clear margin above the instruction panel');
  assert(hint.guide.y + hint.guide.height + 4 <= hint.y + 8 - 32 - hint.cameraY, 'Panel stays above the full player sprite');
  }
  await page.locator('canvas').screenshot({ path: fileURLToPath(new URL('../artifacts/bonus-s-guide.png', import.meta.url)) });
  // Observe every rendered frame until the next restart. Never hide the letter
  // or player with the guide during the camera movement/high and low bounces.
  await page.evaluate(adventure => {
    window.__guideAudit = { seen: 0, airborne: 0, overlaps: [] };
    const el = document.getElementById('movement-stats');
    const watch = new MutationObserver(() => {
      const s = JSON.parse(el.dataset.state), g = s.guide, a = window.__guideAudit;
      if(adventure){
        if(!s.grounded)a.airborne++;
        if(!document.querySelector('#console-coach').hidden)a.seen++;
        if(g?.visible&&g.text.includes('LLANTA'))a.overlaps.push('LCD duplicate');
        return;
      }
      if (!g?.text.includes('LLANTA')) return;
      if (!s.grounded) { a.airborne++; if (g.visible) a.overlaps.push('airborne'); }
      if (!g.visible) return;
      a.seen++;
      if (s.gameplay.letters === '-----') {
        const x = 356 - s.cameraX, y = 92 - s.cameraY;
        if (x + 6 > g.x && x - 6 < g.x + g.width && y + 6 > g.y && y - 6 < g.y + g.height) a.overlaps.push('S');
      }
      if (s.y + 8 - 32 - s.cameraY < g.y + g.height) a.overlaps.push('player');
    });
    watch.observe(el, { attributes: true, attributeFilter: ['data-state'] });
    window.__stopGuideAudit = () => { watch.disconnect(); return window.__guideAudit; };
  },inAdventure);
  // 1) First tire over safe ground: holding K gives the high bounce (and the optional S); without K, the low one.
  const tire = await page.evaluate(async () => {
    const b = window.__bot;
    const centre = s => { if (s.x >= 353) b.up('KeyD'); else if (s.x < 349) b.down('KeyD'); };
    b.down('KeyD'); await b.until(s => s.x >= 334, 'at tire');
    b.down('KeyK');                                               // hold K: onto the tire, high bounce
    const high = await b.until(s => { centre(s); return s.tires.bounces >= 1; }, 'high bounce', 4000);
    let apexHigh = 999; await b.until(s => { centre(s); apexHigh = Math.min(apexHigh, s.y); return s.vy > 0; }, 'high apex', 3000);
    const afterHigh = b.S();
    b.up('KeyK'); b.up('KeyD');                                   // K released while falling: next contact is the low bounce
    const low = await b.until(s => s.tires.bounces >= 2, 'low bounce', 3000);
    let apexLow = 999; await b.until(s => { apexLow = Math.min(apexLow, s.y); return s.vy > 0; }, 'low apex', 3000);
    const hi = high.tires.lastSpeed;
    return { lowSpeed: low.tires.lastSpeed, apexLow, highSpeed: hi, apexHigh, letters: afterHigh.gameplay.letters, deaths: afterHigh.gameplay.deaths };
  });
  assert.equal(tire.lowSpeed, 250); assert.equal(tire.highSpeed, 320);
  assert(tire.apexHigh < tire.apexLow - 25, `High bounce rises clearly more (${tire.apexLow} vs ${tire.apexHigh})`);
  assert.equal(tire.letters, '----S', 'High bounce over the first tire collects the optional S');
  const guideAudit = await page.evaluate(() => window.__stopGuideAudit());
  assert(guideAudit.seen > 0 && guideAudit.airborne > 0, 'Checked approach and airborne frames');
  assert.deepEqual(guideAudit.overlaps, [], 'Tire instructions never cover the S or DK during the bounce');
  await shot('s-tire');
  // Pause mid-bounce freezes simulation, tire squash state and camera.
  await page.keyboard.press('Space'); await page.waitForTimeout(80);
  const paused = await state(); await page.waitForTimeout(300); const still = await state();
  assert.equal(still.simTime, paused.simTime); assert.equal(still.y, paused.y); assert.equal(still.cameraY, paused.cameraY);
  assert.deepEqual(still.view.tireFrames, paused.view.tireFrames);
  await page.keyboard.press('Space');
  await page.evaluate(() => window.__bot.up('KeyK')); // (DK keeps bouncing on the tire: landing on it always bounces)
  // Restart clears everything, including the S and the tire counter.
  await restartStage(page);
  await page.waitForFunction(() => { const s = JSON.parse(document.getElementById('movement-stats').dataset.state); return s.x === 40 && s.grounded; });
  const fresh = await state(); assert.equal(fresh.gameplay.letters, '-----'); assert.equal(fresh.tires.bounces, 0);
  await focusGame(page);
  await installBot(page);

  // 2) Full keyboard route, skipping the S on purpose: wall, checkpoint, deliberate fall and
  //    snake hit after the checkpoint, final ascent; the S is re-offered before the exit.
  //    Split in segments so screenshots are taken with DK standing still.
  await page.evaluate(() => {
    const b = window.__bot, wait = ms => new Promise(r => setTimeout(r, ms));
    async function go(to, { run = true, jump = true } = {}) {
      b.down('KeyD'); if (run) b.down('KeyJ'); else b.up('KeyJ');
      let jumpUntil = 0;
      return b.until(s => {
        if(document.querySelector('#scene-name').textContent==='MinecartScene')return true;
        const now = performance.now();
        if (jumpUntil && now > jumpUntil) { b.up('KeyK'); jumpUntil = 0; }
        const e = jump && s.gameplay.enemies.find(e => e.alive && e.kind !== 'bee' && e.x > s.x && e.x - s.x < (e.kind === 'lizard' ? (run ? 50 : 42) : (run ? 34 : 26)) && Math.abs(e.y - s.y) < 26);
        if (!jumpUntil && s.grounded && e) { b.down('KeyK'); jumpUntil = now + 420; }
        return s.x >= to || s.finished;
      }, 'go ' + to, 20000);
    }
    async function onTire(at, landY, hold = true) {
      await go(at, { run: false });await b.stop();
      // Release a previous enemy jump before starting a distinct tire jump.
      b.down('KeyD');b.down('KeyK'); if (!hold) { await wait(60); b.up('KeyK'); }
      const s = await b.until(s => s.grounded && Math.abs(s.y - landY) < 1, 'tire ' + at, 6000); b.up('KeyK'); return s;
    }
    async function hop(at) {
      if(at===1400&&b.S().gameplay.enemies[7]?.alive){
        await go(1350,{run:false,jump:false});await b.stop();
        // Read the new lizard's hop, then stomp during its grounded opening.
        // Follow its visible position with normal left/right keys in the air.
        let lastY=b.S().gameplay.enemies[7].y;
        await b.until(s=>{const y=s.gameplay.enemies[7].y,land=y>lastY&&y>58;lastY=y;return land;},'cliff lizard descending',4000);
        b.down('KeyK');b.down('KeyJ');
        await b.until(s=>{
          const e=s.gameplay.enemies[7];if(!e.alive)return true;
          if(s.x<e.x-2){b.up('KeyA');b.down('KeyD');}
          else if(s.x>e.x+2){b.up('KeyD');b.down('KeyA');}
          else {b.up('KeyD');b.up('KeyA');}
          return false;
        },'stomp faster cliff lizard',4000);
        await b.stop();
      }
      await go(at, { run: false }); b.down('KeyK'); await wait(420); b.up('KeyK'); await b.until(s => s.grounded, 'hop ' + at, 4000);
    }
    window.__r8 = { go, onTire, hop, wait };
  });
  const start = (await state()).simTime;
  const seg = fn => page.evaluate(fn);
  const log = [];
  log.push(await seg(async () => { const { go, onTire } = window.__r8; await go(300); return (await onTire(330, 124, false)).tires.lastSpeed; }));
  await seg(async () => { const { go } = window.__r8, b = window.__bot; await go(560, { run: false }); await go(700);await b.stop(); });
  assert.notEqual(await page.locator('#play-guide').textContent(),'Mantén la tecla K para saltar más alto','No repeated hold reminder at the second tire');
  if(inAdventure){
    await focusGame(page);
    assert(await page.locator('#console-coach').isHidden(),'Second tire no longer shows the keycap overlay');
  }
  await shot('second-tire-reminder');
  if(inAdventure)await focusGame(page);
  log.push(await seg(async () => { const { onTire } = window.__r8, b = window.__bot;
    const s = await onTire(718, 108); await b.stop(); return s.tires.lastSpeed; }));
  assert.deepEqual(log, [250, 320], 'Low bounce is enough for the ledge; the wall needs the held-K bounce');
  await shot('wall');
  await seg(async () => { const { go } = window.__r8, b = window.__bot; await go(884, { run: false }); await b.stop(); });
  const cp = await state(); assert(cp.gameplay.checkpoint, 'Checkpoint taken');
  await shot('checkpoint');
  // Deliberate fall into the 32 px pit: return to the checkpoint with progress kept.
  const fall = await seg(async () => { const b = window.__bot, before = b.S().gameplay.bananas;
    b.down('KeyD'); await b.until(s => s.y > 190, 'into the pit', 5000); b.up('KeyD');
    const s = await b.until(s => s.gameplay.deaths === 1 && s.grounded, 'back at checkpoint', 5000);
    return { x: s.x, kept: s.gameplay.bananas >= before }; });
  assert(Math.abs(fall.x - 880) <= 2 && fall.kept, 'Fall returns to the checkpoint with progress kept');
  // Walk into the fourth snake without jumping: visible hurt, then return to the checkpoint.
  await seg(async () => { const { go, wait } = window.__r8, b = window.__bot;
    await go(924); b.down('KeyK'); await wait(380); b.up('KeyK');
    await go(1000, { jump: false, run: false }); await b.until(s => s.gameplay.dying, 'snake contact', 8000); b.up('KeyD'); await wait(150); });
  const hurt = await state(); assert(hurt.gameplay.dying && hurt.view.dkFrame.startsWith('dk-hurt'));
  await shot('hurt');
  const back = await seg(async () => { const b = window.__bot; return b.until(s => s.gameplay.deaths === 2 && !s.gameplay.dying && s.grounded, 'return after hit', 5000); });
  assert(Math.abs(back.x - 880) <= 2, 'Snake hit returns to the checkpoint');
  await seg(async () => { const { go, onTire, hop, wait } = window.__r8, b = window.__bot;
    await go(924); b.down('KeyK'); await wait(380); b.up('KeyK');
    // New hopping lizard: use the barrel provided before it. Wait for the
    // visible landing, then throw during its long grounded interval. This
    // verifies the counter instead of blindly replaying the old snake jump.
    await go(992,{run:false,jump:false});await b.stop();b.down('KeyJ');
    await b.until(s=>s.gameplay.carrying,'pick up lizard counter');
    let lastY=b.S().gameplay.enemies[3].y;
    await b.until(s=>{const y=s.gameplay.enemies[3].y,land=y>lastY&&y>169;lastY=y;return land;},'lizard descending',5000);
    b.up('KeyJ');await b.until(s=>!s.gameplay.enemies[3].alive,'barrel defeats hopping lizard',3000);
    await go(1110); await onTire(1150, 124); await hop(1244); await b.stop(); });
  const ascent = await state(); assert.equal(ascent.y, 92, 'On the second step of the final ascent'); assert.equal(ascent.gameplay.letters, '-----');
  await shot('ascent');
  // Compare the real front-pass gallery on the left with fused solid steps
  // on the right, at the exact transition reported in the playtest.
  {
    const help=await page.locator('#console-help-close').isVisible();
    if(help)await page.locator('#console-help-close').click();
    await page.locator('canvas').screenshot({path:'artifacts/terrain-solid-vs-front-cave.png'});
    if(help)await focusGame(page);
  }
  const route = await seg(async () => { const { go, hop, onTire } = window.__r8, b = window.__bot;
    await hop(1310); await hop(1400); await hop(1436); await go(1482,{run:false});await b.stop();
    const top=b.S();if(top.y!==-4||top.cameraY>=0||!top.gameplay.bunches.at(-1).collected)throw new Error('Stepped cliff summit/reward/camera');
    await window.__captureCliff();
    await go(1640); await go(1778, {run:false});
    await onTire(1818,124); await hop(1916); await hop(1980);
    await go(2228, { run: false });await b.stop();window.__r8Exit=b.S();
    await go(2240, { run: false }); for (const k of [...b.held]) b.up(k);
    const e = window.__r8Exit; return { deaths: e.gameplay.deaths, letters: e.gameplay.letters, bananas: e.gameplay.bananas, total: e.gameplay.totalBananas, log: [] }; });
  route.log = log.map(v => [0, v]);
  if(inAdventure)await page.waitForFunction(()=>document.querySelector('#scene-name').textContent==='MinecartScene');
  const done = inAdventure?await page.evaluate(()=>window.__r8Exit):await state();
  const vy = await page.evaluate(() => window.__vy);
  assert(vy.max <= 280.001, `Fall speed stays capped at B-01 280 (max ${vy.max})`);
  assert(vy.min <= -319, `High tire bounce not clipped by the fall cap (min ${vy.min})`);
  assert((inAdventure?await page.locator('#scene-name').textContent()==='MinecartScene':done.finished) && done.gameplay.checkpoint);
  assert.equal(route.letters, '----S', 'Missed S re-offered on safe ground before the exit and collected');
  assert.equal(route.deaths, 2, 'Exactly the two deliberate returns');
  await shot('finish');
  if (inAdventure) return; // Minecart now starts automatically; Space would pause IT.
  await page.keyboard.press('Space'); await page.waitForTimeout(200);
  assert.equal((await state()).simTime, done.simTime, 'Completed level stays frozen; Space does nothing');
  await page.locator('#restart-lab').click(); await page.waitForTimeout(150);
  const again = await state();
  assert(!again.finished && !again.gameplay.checkpoint && again.gameplay.letters === '-----' && again.tires.bounces === 0);
  console.log(`PASS phase 8 browser: tires low/high, optional S, pause mid-bounce, restart, keyboard route (ledge ${route.log[0][1]}, wall ${route.log[1][1]}), checkpoint fall, snake hit + return, S recovery, exit/freeze/restart. Bot route ${((done.simTime - start) / 1000).toFixed(1)} s with 2 deliberate returns; ${route.bananas} bananas collected.`);
}
