import assert from 'node:assert/strict';
import {installBot} from './support/bot.mjs';
import {returnToMap} from './support/navigation.mjs';

export async function testPhase11(page) {
  await page.setViewportSize({width:1366,height:768});
  await page.goto('http://127.0.0.1:4174/?adventure=1');
  const stage=name=>page.waitForFunction(n=>document.querySelector('#console-shell')?.dataset.power===n,name);
  const scene=name=>page.waitForFunction(n=>document.querySelector('#scene-name').textContent===n,name);
  const state=()=>page.locator('#movement-stats').evaluate(e=>JSON.parse(e.dataset.state));
  const shot=name=>page.screenshot({path:`artifacts/phase-11-${name}.png`});
  await stage('off');
  // The requested welcome waits indefinitely, including a visible unfocused tab.
  await page.evaluate(()=>{
    Object.defineProperty(document,'hasFocus',{configurable:true,value:()=>false});
    window.dispatchEvent(new Event('blur'));
  });
  await scene('TitleScene');
  await page.waitForTimeout(3600);
  assert.equal(await page.locator('#console-shell').getAttribute('data-power'),'off');
  assert(await page.locator('#power-start').isVisible());
  assert.equal(await page.locator('#audio-toggle').evaluate(e=>JSON.parse(e.dataset.audio).state),'locked');
  await shot('invitation');
  await page.evaluate(()=>{delete document.hasFocus;window.dispatchEvent(new Event('focus'));});
  await page.locator('#power-start').click();
  await stage('logo');
  assert.equal(await page.locator('#console-shell').getAttribute('data-view'),'whole');
  assert.equal(await page.locator('#input-status').getAttribute('data-active'),'false');
  const samePhoto=await page.locator('.boot-logo-image').evaluate(e=>e.src===document.querySelector('.console-photo').src&&e.complete);
  assert(samePhoto,'Boot uses the exact same bezel lettering, not a replacement font');
  await page.waitForTimeout(700);await shot('power-on');
  await stage('ready');await page.waitForTimeout(350);
  assert.equal(await page.locator('#console-shell').getAttribute('data-view'),'screen','One click powers on and zooms');
  assert(await page.locator('#power-start').isHidden());
  assert(await page.locator('#console-coach').isHidden(),'Read the start instruction inside the LCD');
  assert(await page.locator('#console-coach small').isHidden());
  assert(await page.locator('#console-coach>span').isHidden());
  assert.equal(await page.locator('#console-coach').textContent(),'','No external copy of title instructions');
  await page.locator('#lab-panel').focus();
  assert.equal(await page.locator('.console-photo').evaluate(e=>e.complete&&e.naturalWidth),981);
  assert.equal(await page.locator('#input-status').getAttribute('data-active'),'true');
  assert.deepEqual(await page.locator('canvas').evaluate(e=>[e.width,e.height]),[160,144]);
  await shot('closeup');
  const stableLCD=await page.locator('canvas').boundingBox();
  const fixedFrame=async()=>{const b=await page.locator('canvas').boundingBox();for(const k of ['x','y','width','height'])assert(Math.abs(b[k]-stableLCD[k])<1,'Hint does not reframe LCD: '+k);};
  assert.equal(await page.locator('#console-view').count(),0,'No confusing whole-console toggle');
  assert.equal(await page.locator('#replay-power').count(),0,'No cosmetic restart');
  await page.keyboard.press('KeyK');await scene('WorldMapScene');
  for(const [key,action] of [['KeyW','up'],['KeyA','left'],['KeyS','down'],['KeyD','right'],['KeyJ','b'],['Space','start']]) {
    await page.keyboard.down(key);
    const button=page.locator(`[data-action=${action}]`);
    assert.equal(await button.getAttribute('data-pressed'),'true');
    await page.waitForTimeout(90);
    assert.equal(await button.evaluate(e=>getComputedStyle(e).opacity),'1');
    assert.notEqual(await button.evaluate(e=>getComputedStyle(e).clipPath),'none');
    await page.keyboard.up(key);
    assert.equal(await button.getAttribute('data-pressed'),'false');
  }
  // A+B+direction can light together; entering the practice still uses real input.
  for(const key of ['KeyD','KeyJ','KeyK'])await page.keyboard.down(key);
  await page.waitForTimeout(100);await shot('buttons-pressed');
  for(const action of ['right','b','a'])assert.equal(await page.locator(`[data-action=${action}]`).getAttribute('data-pressed'),'true');
  for(const key of ['KeyD','KeyJ','KeyK'])await page.keyboard.up(key);
  await scene('StageIntroScene');await page.waitForTimeout(350);await page.keyboard.press('KeyK');await scene('JungleGreyboxScene');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).grounded);
  await page.waitForTimeout(1650);await fixedFrame();
  await page.keyboard.down('KeyD');await page.locator('#console-help').click();
  assert.equal(await page.locator('[data-action=right]').getAttribute('data-pressed'),'false','Blur clears photographed keys');
  await page.keyboard.up('KeyD');
  await page.locator('#restart-game').click();
  const before=await state();await page.waitForTimeout(400);
  assert.equal((await state()).simTime,before.simTime,'Restart confirmation freezes game');
  await page.keyboard.press('Escape');await stage('ready');
  assert.equal(await page.locator('#scene-name').textContent(),'JungleGreyboxScene','Escape cancels restart, not the current stage');
  assert.equal((await state()).practice.step,before.practice.step);
  await returnToMap(page);
  await page.waitForTimeout(1650);await fixedFrame();
  for(const size of [{width:390,height:844},{width:320,height:568},{width:844,height:390},{width:1366,height:768}]){
    await page.setViewportSize(size);await page.waitForTimeout(1650);
    const b=await page.locator('canvas').boundingBox();
    assert(Math.abs(b.width/b.height-160/144)<.001,'LCD keeps logical ratio');
    assert(Math.abs(b.width/160-Math.round(b.width/160))<.01,'Integer close-up scale');
    assert(b.x>=-1&&b.x+b.width<=size.width+1&&b.y>=0&&b.y+b.height<=size.height,'Entire LCD fits viewport');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
    await shot(`viewport-${size.width}x${size.height}`);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.reload();await stage('off');await page.locator('#lab-panel').focus();
  await page.keyboard.down('Space');await stage('ready');
  await page.keyboard.down('Space');await scene('TitleScene');
  await page.keyboard.up('Space');
  assert.equal(await page.locator('#skip-power').isHidden(),true);
  await page.emulateMedia({reducedMotion:'no-preference'});

  // Real keyboard approaches to BOTH sides of the same rope. Keep the atlas
  // custom-pivot grip at (24,10): Phaser mirrors about it, not about cell centre.
  await page.goto('http://127.0.0.1:4174/?level=ropey');
  await page.locator('#activate-input').click();
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').grounded);
  await installBot(page);
  await page.evaluate(async()=>{
    const b=window.__bot;b.down('KeyD');await b.until(s=>s.x>=138,'approach from left');await b.stop();
    b.down('KeyW');await b.until(s=>s.rope,'right grab');b.up('KeyW');
  });
  let s=await state();assert(!s.view.dkFlip);assert.equal(s.view.gripOriginX,.75);assert(s.view.gripVisible);
  await shot('grip-right');
  await page.evaluate(async()=>{
    const b=window.__bot;b.down('KeyD');b.down('KeyK');await b.until(s=>!s.rope,'release');b.up('KeyK');
    await b.until(s=>s.x>=185,'right of rope');b.up('KeyD');await b.until(s=>s.grounded,'land');
    b.down('KeyA');await b.until(s=>s.x<=147,'approach from right');await b.stop();
    b.down('KeyW');await b.until(s=>s.rope,'left grab');b.up('KeyW');
  });
  s=await state();assert(s.view.dkFlip);assert.equal(s.view.gripOriginX,.75);assert(s.view.gripVisible);
  await shot('grip-left');
  await page.evaluate(async()=>{
    const b=window.__bot;b.down('KeyD');b.down('KeyK');await b.until(s=>!s.rope,'release right');b.up('KeyK');
    await b.until(s=>s.x>=185,'air approach setup');await b.stop();
    b.down('KeyA');b.down('KeyK');await b.until(s=>s.rope,'airborne left-facing auto-grab');b.up('KeyA');b.up('KeyK');
  });
  s=await state();assert(s.view.dkFlip);assert.equal(s.view.gripOriginX,.75);assert(s.view.gripVisible);
  await shot('grip-left-air');
  console.log('PASS phase 11: power/zoom, photographic keys, input lock/restart cancel/skip, responsive LCD, reduced motion, grip both facings.');
}
