import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { installBot } from './support/bot.mjs';
import { focusGame, restartStage } from './support/navigation.mjs';

export async function testPhase6(page, inAdventure = false) {
  await page.setViewportSize({width:1366,height:768});
  if (!inAdventure) await page.goto('http://127.0.0.1:4174/');
  await focusGame(page);
  const state = () => page.locator('#movement-stats').evaluate(el => JSON.parse(el.dataset.state));
  const wait = fn => page.waitForFunction(fn);
  const shot = name => page.screenshot({path:fileURLToPath(new URL(`../artifacts/phase-6-${name}.png`, import.meta.url))});
  await wait(() => JSON.parse(document.getElementById('movement-stats').dataset.state || '{}').grounded);
  assert.equal((await state()).gameplay.enemies.length,11,'Refined route: nine ground patrols (four lizards) and two bees');
  await shot('start');
  // Walk into the first patrol without attacking: actual keyboard, no teleport.
  await page.keyboard.down('KeyD');
  await wait(() => JSON.parse(document.getElementById('movement-stats').dataset.state).gameplay.dying);
  await page.keyboard.up('KeyD');
  await wait(() => JSON.parse(document.getElementById('movement-stats').dataset.state).view.dkFrame === 'dk-hurt-head');
  await page.keyboard.press('Space');
  await wait(() => JSON.parse(document.getElementById('movement-stats').dataset.state).paused);
  const hit = await state();
  if(!inAdventure){await page.keyboard.press('KeyK');await page.keyboard.press('KeyJ');}
  await page.waitForTimeout(750);
  const held = await state();
  assert.equal(held.simTime,hit.simTime);
  // In the adventure, J in the pause menu only asks "IR AL MAPA?" (a second J would
  // confirm); the frozen game itself must not change.
  const frozen = v => ({ ...v, overlay: undefined });
  assert.deepEqual(frozen(held.view),frozen(hit.view),'Impact pose/recoil frozen in pause');
  if (inAdventure) assert(await page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.pauseMenu).open));
  assert.equal(held.gameplay.deaths,0,'No premature respawn');
  await shot('hurt-paused');
  await page.keyboard.press('Space');
  // Wait for the resume to be published first: otherwise the paused state read
  // below can be the stale one from before Space (a race, not a freeze bug).
  await wait(() => !JSON.parse(document.getElementById('movement-stats').dataset.state).paused);
  await page.locator('#quick-mute').focus();
  await wait(() => JSON.parse(document.getElementById('movement-stats').dataset.state).paused);
  const blur = await state(); await page.waitForTimeout(350);
  assert.equal((await state()).simTime,blur.simTime,'Focus loss freezes impact');
  await focusGame(page);
  await wait(() => JSON.parse(document.getElementById('movement-stats').dataset.state).gameplay.deaths === 1);
  const returned = await state();
  assert(!returned.gameplay.dying && returned.x === 40 && returned.gameplay.invulnerable);
  assert.equal(returned.gameplay.bananas,hit.gameplay.bananas);
  // Restart clears transient death state as well as progress.
  await restartStage(page);
  await wait(() => JSON.parse(document.getElementById('movement-stats').dataset.state).gameplay.deaths === 0);
  await page.keyboard.down('KeyD');
  await wait(() => JSON.parse(document.getElementById('movement-stats').dataset.state).gameplay.dying);
  await page.keyboard.up('KeyD');
  await page.keyboard.press('Space');
  await restartStage(page);
  await wait(() => { const s=JSON.parse(document.getElementById('movement-stats').dataset.state); return !s.paused && !s.gameplay.dying && s.x===40 && s.grounded; });
  assert.equal((await state()).gameplay.bananas,0,'Restart during paused impact clears progress');
  await installBot(page);
  const start = (await state()).simTime;
  // The optional B is now above walking height: deliberately jump for it.
  await page.evaluate(async()=>{
    const b=window.__bot;await b.travel(s=>s.x>=390,{run:false,label:'raised B'});await b.stop();
    if(b.S().gameplay.letters[0]!=='B'){b.down('KeyK');await b.until(s=>s.gameplay.letters[0]==='B','jump collects raised B');b.up('KeyK');await b.stop();}
  });
  await page.evaluate(() => window.__bot.travel(s => s.gameplay.checkpoint,{label:'phase6 checkpoint',timeout:60000}));
  await shot('checkpoint');
  await page.evaluate(() => window.__bot.travel(s => s.finished,{label:'phase6 exit',timeout:60000}));
  await page.evaluate(() => { for(const k of [...window.__bot.held]) window.__bot.up(k); });
  const done = await state();
  assert(done.finished && done.gameplay.checkpoint);
  assert.equal(done.gameplay.letters,'BO---');
  assert(done.gameplay.bananas > 3);
  await shot('finish');
  if(!inAdventure)await page.keyboard.press('Space'); await page.waitForTimeout(250);
  assert.equal((await state()).simTime,done.simTime);
  assert.deepEqual((await state()).view.overlay,done.view.overlay);
  console.log(`PASS refined Jungle Edge route: damage/pose/pause/focus/respawn, ground/flying patrols, long gap, checkpoint, BONUS recovery, exit. Route ${((done.simTime-start)/1000).toFixed(1)}s, ${done.gameplay.deaths} retries (bot, not human playtime).`);
}
