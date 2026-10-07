import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

export async function testGameplay(page) {
  await page.goto('http://127.0.0.1:4174/?phase5=1');
  await page.waitForFunction(()=>!!document.getElementById('movement-stats').dataset.state);
  const state=()=>page.locator('#movement-stats').evaluate(el=>JSON.parse(el.dataset.state));
  const waitX=x=>page.waitForFunction(x=>JSON.parse(document.getElementById('movement-stats').dataset.state).x>=x,x);
  await page.locator('#activate-input').click();
  await page.waitForFunction(()=>JSON.parse(document.getElementById('movement-stats').dataset.state).grounded);
  await page.keyboard.press('Enter'); await page.waitForTimeout(80);
  assert(!(await state()).paused,'Enter is no longer Start');
  const scroll=await page.evaluate(()=>scrollY);
  await page.keyboard.down('Space'); await page.waitForTimeout(100);
  const paused=await state(); assert(paused.paused);
  await page.keyboard.down('Space'); // OS-style repeat must not toggle twice.
  await page.waitForTimeout(250);
  assert.deepEqual((await state()).gameplay,paused.gameplay,'Pause freezes all gameplay, including enemy patrol clocks');
  assert.equal(await page.evaluate(()=>scrollY),scroll,'Space cannot scroll while playing');
  await page.keyboard.up('Space'); await page.keyboard.press('Space');
  await page.keyboard.down('KeyD'); await waitX(130); await page.keyboard.up('KeyD');
  assert.equal((await state()).gameplay.bananas,3,'Pick up teaching bananas with real keys');
  await page.keyboard.down('KeyJ'); await page.waitForTimeout(60); assert((await state()).gameplay.rolling);
  await page.waitForTimeout(350); assert(!(await state()).gameplay.rolling,'Held J runs without repeated rolls');
  await page.keyboard.up('KeyJ');
  await page.locator('#restart-lab').click();
  await page.waitForFunction(()=>JSON.parse(document.getElementById('movement-stats').dataset.state).gameplay.bananas===0);

  // Real-key route with planned jumps; no teleporting or test-only game hooks.
  const obstacles=[176,248,320,480,584,704,864,944,1016,1040,1184,1376,1472,1600,1808,1904,1984,2016,2144,2240];
  await page.keyboard.down('KeyD'); await page.keyboard.down('KeyJ');
  let testedBarrel=false, testedDamage=false, testedCheckpointFall=false;
  const deadline=Date.now()+100000;
  while(!(await state()).finished && Date.now()<deadline) {
    const s=await state();
    if (!testedDamage && s.gameplay.checkpoint && s.x>=1264 && s.x<1300) {
      const count=s.gameplay.deaths;
      await page.waitForFunction(n=>JSON.parse(document.getElementById('movement-stats').dataset.state).gameplay.deaths>n,count,{timeout:5000});
      await page.keyboard.up('KeyD'); await page.keyboard.up('KeyJ');
      const returned=await state();
      assert(returned.x>=1264 && returned.x<1296,'Enemy contact returns to checkpoint');
      assert.equal(returned.gameplay.letters,s.gameplay.letters);
      assert(returned.gameplay.bananas>=s.gameplay.bananas);
      testedDamage=true;
      await page.keyboard.down('KeyD'); await page.keyboard.down('KeyJ');
      continue;
    }
    if (!testedCheckpointFall && s.gameplay.checkpoint && s.x>=1550 && s.x<1590) {
      const count=s.gameplay.deaths;
      // Deliberately do not jump at the next gap.
      await page.waitForFunction(n=>JSON.parse(document.getElementById('movement-stats').dataset.state).gameplay.deaths>n,count,{timeout:7000});
      await page.keyboard.up('KeyD'); await page.keyboard.up('KeyJ');
      const returned=await state();
      assert(returned.x>=1264 && returned.x<1296,'Falling returns to checkpoint');
      assert.equal(returned.gameplay.letters,s.gameplay.letters);
      assert(returned.gameplay.bananas>=s.gameplay.bananas,'No pickup loss on retry');
      testedCheckpointFall=true;
      await page.keyboard.down('KeyD'); await page.keyboard.down('KeyJ');
      continue;
    }
    if(!testedBarrel && s.x>=740 && s.x<778 && Math.abs(s.y-116)<18) {
      await page.keyboard.up('KeyD'); await page.keyboard.up('KeyJ');
      await page.waitForFunction(()=>JSON.parse(document.getElementById('movement-stats').dataset.state).vx===0);
      // Come to rest beside the barrel instead of racing a 22px pickup window
      // while Playwright delivers several key events on a busy computer.
      if ((await state()).x>764) {
        await page.keyboard.down('KeyA');
        await page.waitForFunction(()=>JSON.parse(document.getElementById('movement-stats').dataset.state).x<=760);
        await page.keyboard.up('KeyA');
      }
      await page.waitForFunction(()=>JSON.parse(document.getElementById('movement-stats').dataset.state).grounded);
      // Face the enemy without carrying movement into the pickup assertion.
      await page.keyboard.down('KeyD'); await page.keyboard.up('KeyD');
      await page.keyboard.down('KeyJ'); await page.waitForTimeout(60);
      assert((await state()).gameplay.carrying,'J picks up nearby barrel');
      await page.keyboard.press('Space'); await page.keyboard.up('KeyJ');
      const frozen=await state(); await page.waitForTimeout(150);
      assert.deepEqual((await state()).gameplay,frozen.gameplay);
      await page.keyboard.press('Space');
      assert((await state()).gameplay.carrying,'Releasing J during pause does not throw');
      await page.locator('#scale-select').focus();
      await page.waitForFunction(()=>JSON.parse(document.getElementById('movement-stats').dataset.state).paused);
      const unfocused=await state();
      await page.waitForTimeout(100);
      assert.deepEqual((await state()).gameplay,unfocused.gameplay,'Focus loss also freezes every gameplay object');
      await page.locator('#activate-input').click();
      await page.waitForFunction(()=>!JSON.parse(document.getElementById('movement-stats').dataset.state).paused);
      assert((await state()).gameplay.carrying,'Focus loss must preserve a carried barrel');
      await page.keyboard.down('KeyJ'); await page.keyboard.up('KeyJ');
      await page.waitForFunction(()=>JSON.parse(document.getElementById('movement-stats').dataset.state).gameplay.kills.barrel>0);
      testedBarrel=true;
      await page.keyboard.down('KeyD'); await page.keyboard.down('KeyJ');
    }
    const current=await state();
    const next=obstacles.find(x=>x>current.x+5);
    // Enemies can be jumped on; after a hit, invulnerability allows an easy retry.
    const enemy=current.gameplay.enemies.find(e=>e.alive && e.x>current.x && e.x-current.x<28);
    if(current.grounded && ((next!==undefined && next-current.x<28) || enemy)) {
      await page.keyboard.down('KeyK'); await page.waitForTimeout(450); await page.keyboard.up('KeyK');
    }
    await page.waitForTimeout(30);
  }
  await page.keyboard.up('KeyD'); await page.keyboard.up('KeyJ');
  const end=await state();
  assert(testedBarrel,'Route must exercise barrel interaction');
  assert(testedDamage && testedCheckpointFall,'Route must exercise both kinds of checkpoint respawn');
  assert(end.finished,JSON.stringify(end)); assert(end.gameplay.checkpoint);
  assert.equal(end.gameplay.letters,'BO---'); assert(end.gameplay.bananas>3);
  await page.waitForTimeout(150); assert.deepEqual((await state()).gameplay,end.gameplay,'Completion freezes game');
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/phase-4-exit.png',import.meta.url)),fullPage:true});
  await page.locator('#restart-lab').click();
  await page.waitForFunction(()=>!JSON.parse(document.getElementById('movement-stats').dataset.state).finished);
  const fresh=await state(); assert.equal(fresh.gameplay.bananas,0); assert(!fresh.gameplay.checkpoint); assert.equal(fresh.gameplay.letters,'-----');
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/phase-4-start.png',import.meta.url)),fullPage:true});
  console.log('PASS phase 4: Space/no Enter/no scroll/repeat, full pause, bananas, roll, barrel pickup/pause/throw/kill, real-key route, B/O, damage/fall checkpoint return with persistence, exit freeze and clean restart.');
}
