import assert from 'node:assert/strict';
import { testPhase6 } from './phase6.mjs';
import { testPhase7 } from './phase7.mjs';
import { testPhase8 } from './phase8.mjs';

export async function testPhase9(page) {
  await page.goto('http://127.0.0.1:4174/?adventure=1&workbench=1');
  const map = () => page.waitForFunction(() => document.querySelector('#scene-name').textContent === 'WorldMapScene');
  const progress = () => page.locator('#lab-panel').evaluate(el => JSON.parse(el.dataset.campaign));
  await map(); await page.locator('#activate-input').click();
  await page.keyboard.press('KeyD'); assert.equal((await progress()).selected, 0, 'Locked Ropey cannot be selected');
  await page.screenshot({path:'artifacts/phase-9-map-start.png'});
  let bananas = 0;
  for (const [i, test] of [testPhase6, testPhase7, testPhase8].entries()) {
    assert.equal((await progress()).selected, i);
    await page.keyboard.down('KeyK');
    await page.waitForFunction(() => document.querySelector('#scene-name').textContent === 'JungleGreyboxScene');
    await page.waitForTimeout(250);
    const entered = await page.locator('#movement-stats').evaluate(el => JSON.parse(el.dataset.state));
    assert(entered.grounded && entered.vy === 0, 'Holding map confirmation must not jump in the new level');
    await page.keyboard.up('KeyK');
    // Escape works immediately after entering any stage, including Ropey.
    await page.keyboard.press('Escape'); await map();
    assert.equal((await progress()).selected,i);
    assert.equal((await progress()).completed.length,i);
    await page.keyboard.press('KeyK');
    await page.waitForFunction(()=>document.querySelector('#scene-name').textContent==='JungleGreyboxScene');
    await test(page, true); // Existing keyboard-only mechanics checks, without navigation/reload.
    const level = await page.locator('#movement-stats').evaluate(el => JSON.parse(el.dataset.state));
    bananas += level.gameplay.bananas;
    assert(level.view.overlay.includes('K: VOLVER AL MAPA'));
    await page.keyboard.press('KeyK');
    try { await map(); } catch(error) {
      console.error('Transition state', await page.locator('#movement-stats').getAttribute('data-state'));
      console.error('Scene path', await page.locator('#scene-path').textContent());
      throw error;
    }
    const s = await progress();
    assert.equal(s.completed.length, i + 1); assert.equal(s.bananas, bananas);
    assert.equal(s.letters, ['BO---', 'BONU-', 'BONUS'][i]);
    await page.screenshot({path:`artifacts/phase-9-map-${i+1}.png`});
  }
  assert((await progress()).finished);
  // Revisit Jungle: collected items restored, no stale pause/rope/tire state.
  await page.keyboard.press('KeyA');
  assert((await progress()).moving,'Selection starts a visible walk');
  await page.waitForTimeout(300);
  await page.screenshot({path:'artifacts/phase-10-map-walking.png'});
  await page.waitForFunction(()=>!JSON.parse(document.querySelector('#lab-panel').dataset.campaign).moving);
  await page.keyboard.press('KeyA');
  await page.waitForFunction(()=>!JSON.parse(document.querySelector('#lab-panel').dataset.campaign).moving);
  await page.keyboard.press('KeyK');
  await page.waitForFunction(() => { const s = JSON.parse(document.querySelector('#movement-stats').dataset.state || '{}'); return s.grounded && s.gameplay?.letters === 'BO---'; });
  await page.keyboard.press('KeyD');
  const replay = await page.locator('#movement-stats').evaluate(el => JSON.parse(el.dataset.state));
  assert(!replay.finished && !replay.paused && !replay.rope);
  await page.reload(); await map();
  assert.equal((await progress()).bananas, 0); assert.equal((await progress()).completed.length, 0);
  console.log('PASS phase 9 Edge: locked map, all three keyboard routes in ONE session, accumulated BONUS/bananas, returns, replay and reload reset.');
}

// Leaving a stage mid-way (user request after playtest): pause menu J, or the
// "Volver al mapa" button. The attempt is not saved; the map keeps the stage selected.
export async function testMapReturn(page) {
  await page.goto('http://127.0.0.1:4174/?adventure=1&workbench=1');
  const scene = name => page.waitForFunction(n => document.querySelector('#scene-name').textContent === n, name);
  const progress = () => page.locator('#lab-panel').evaluate(el => JSON.parse(el.dataset.campaign));
  const state = () => page.locator('#movement-stats').evaluate(el => JSON.parse(el.dataset.state));
  await scene('WorldMapScene'); await page.locator('#activate-input').click();
  assert(await page.locator('#to-map').isHidden(), 'No map button on the map');
  await page.keyboard.press('KeyK'); await scene('JungleGreyboxScene');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').practice);
  await page.keyboard.press('Escape');await scene('WorldMapScene');
  await page.keyboard.press('KeyK');await scene('JungleGreyboxScene');
  await page.waitForFunction(() => JSON.parse(document.querySelector('#movement-stats').dataset.state || '{}').grounded);
  assert(await page.locator('#to-map').isVisible(), 'Map button shown inside a stage');
  // Collect the first bananas, then pause: J is offered in the pause menu.
  await page.keyboard.down('KeyD'); await page.waitForFunction(() => JSON.parse(document.querySelector('#movement-stats').dataset.state).gameplay.bananas >= 1); await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyJ'); // J while playing: roll, never leaves the stage
  await page.waitForTimeout(150); assert.equal(await page.locator('#scene-name').textContent(), 'JungleGreyboxScene');
  await page.keyboard.press('Space'); await page.waitForTimeout(100);
  assert((await state()).view.overlay.includes('J: IR AL MAPA'), 'Pause menu offers the map');
  await page.screenshot({ path: 'artifacts/phase-9-pause-map.png' });
  await page.keyboard.press('KeyJ'); await page.waitForTimeout(100);
  assert.deepEqual((await state()).view.overlay, ['IR AL MAPA?', 'J: SI', 'ESPACIO: NO'], 'First J asks for confirmation');
  assert.equal(await page.locator('#scene-name').textContent(), 'JungleGreyboxScene');
  await page.keyboard.press('Space'); await page.waitForTimeout(100);
  assert(!(await state()).paused, 'Space cancels and resumes');
  await page.keyboard.press('Space'); await page.waitForTimeout(100);
  assert((await state()).view.overlay.includes('J: IR AL MAPA'), 'Menu back to its first step');
  await page.keyboard.press('KeyJ'); await page.keyboard.press('KeyJ'); await scene('WorldMapScene');
  let p = await progress();
  assert.equal(p.bananas, 0, 'Leaving mid-stage does not save the attempt'); assert.equal(p.selected, 0); assert.equal(p.completed.length, 0);
  // The HTML button does the same, and the stage can be entered again cleanly.
  await page.keyboard.press('KeyK'); await scene('JungleGreyboxScene');
  await page.waitForFunction(() => JSON.parse(document.querySelector('#movement-stats').dataset.state || '{}').grounded);
  const fresh = await state(); assert.equal(fresh.gameplay.bananas, 0); assert(!fresh.paused);
  await page.locator('#to-map').click(); await scene('WorldMapScene');
  p = await progress(); assert.equal(p.selected, 0); assert.equal(p.bananas, 0);
  console.log('PASS map return: pause-menu J + confirmation (Space cancels) and "Volver al mapa" button leave a stage without saving the attempt; J while playing still rolls.');
}
