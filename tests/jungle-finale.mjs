import assert from 'node:assert/strict';
import {installBot} from './support/bot.mjs';

// Public input only: no teleport, invulnerability or enemy/physics mutation.
export async function testJungleFinale(page){
  await page.setViewportSize({width:1366,height:768});
  await page.goto('http://127.0.0.1:4174/?level=jungle');
  await page.locator('#activate-input').click();
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').grounded);
  await installBot(page);
  const state=()=>page.locator('#movement-stats').evaluate(e=>JSON.parse(e.dataset.state));
  await page.evaluate(async()=>{
    const b=window.__bot;
    await b.travel(s=>s.x>=1900,{label:'finale approach'});await b.stop();
    b.down('KeyD');await b.until(s=>s.x>=1910,'reach final barrel');await b.stop();
    b.down('KeyJ');await b.until(s=>s.gameplay.barrels.at(-1).state==='carried','pick up final barrel');
  });
  await page.locator('canvas').screenshot({path:'artifacts/jungle-finale-barrel.png'});
  const beforeThrow=await state();
  await page.evaluate(async()=>{
    const b=window.__bot;b.up('KeyJ');
    await b.until(s=>!s.gameplay.enemies[5].alive,'barrel clears lower patrol');
    b.down('KeyD');await b.until(s=>s.x===2106&&s.grounded,'walking stops at final ridge');
    await new Promise(r=>setTimeout(r,600));await b.stop();
  });
  const blocked=await state();
  assert.equal(blocked.x,2106);assert.equal(blocked.y,116);
  assert(!blocked.finished,'Holding right alone cannot finish, even after removing the patrol');
  assert.equal(blocked.gameplay.kills.barrel,beforeThrow.gameplay.kills.barrel+1);
  await page.locator('canvas').screenshot({path:'artifacts/jungle-finale-ridge.png'});
  await page.evaluate(async()=>{
    const b=window.__bot;b.down('KeyD');b.down('KeyK');
    await b.until(s=>s.x>=2140,'jump onto final ridge');b.up('KeyD');
    await b.until(s=>s.grounded&&s.y===88,'land on final ridge');b.up('KeyK');await b.stop();
    b.down('KeyS');await new Promise(r=>setTimeout(r,300));b.up('KeyS');
    if(b.S().y!==88)throw new Error('Down cannot bypass solid ridge');
  });
  await page.locator('canvas').screenshot({path:'artifacts/jungle-finale-crossing.png'});
  const beforeFall=await state();
  await page.evaluate(async()=>{
    const b=window.__bot,deaths=b.S().gameplay.deaths;
    b.down('KeyD');await b.until(s=>s.gameplay.deaths>deaths,'walking into final gap returns to checkpoint');
    b.up('KeyD');await b.stop();
  });
  const returned=await state();
  assert(returned.x>=1250&&returned.x<1300&&returned.gameplay.checkpoint);
  assert.equal(returned.gameplay.deaths,beforeFall.gameplay.deaths+1);
  assert(!returned.gameplay.enemies[5].alive,'Defeated patrol remains defeated after a fall');
  assert.equal(returned.gameplay.barrels.at(-1).state,'ready','Barrel replenishes on retry');
  await page.evaluate(async()=>{
    const b=window.__bot;
    await b.travel(s=>s.x>=2070,{label:'return to final ridge'});await b.stop();
  });
  const beforeCrossing=await state();
  await page.evaluate(async()=>{
    const b=window.__bot;
    // Walk, do not run: prove this is not a precision running-jump requirement.
    await b.travel(s=>s.x>=2270,{run:false,label:'walk-speed ridge and final gap'});await b.stop();
  });
  const landing=await state();
  assert.equal(landing.gameplay.deaths,beforeCrossing.gameplay.deaths,`Walk-speed jumps clear the final ridge and gap: ${JSON.stringify(await page.evaluate(()=>window.__bot.failures))}`);
  assert(landing.grounded&&!landing.finished&&landing.x<2290,'Safe landing before the last lizard');
  await page.locator('canvas').screenshot({path:'artifacts/jungle-finale-lizard.png'});
  await page.evaluate(async()=>{
    const b=window.__bot;
    await b.travel(s=>s.finished,{label:'final lizard and cave'});
    for(const k of [...b.held])b.up(k);
  });
  const done=await state();
  assert(done.finished&&done.gameplay.checkpoint);
  assert.equal(done.gameplay.letters,'BO---','Recovery letters still reachable past the challenges');
  assert(done.gameplay.deaths<=landing.gameplay.deaths+1,'No unavoidable repeated-damage loop');
  console.log('PASS Jungle finale: real barrel kill, walk-only ridge block, solid S protection, deliberate gap fall/checkpoint/persistence, walk-speed crossing, final lizard and exit.');
}
