import assert from 'node:assert/strict';
import {testPhase10} from './phase10.mjs';
import {testPhase6} from './phase6.mjs';
import {testPhase7} from './phase7.mjs';
import {testPhase8} from './phase8.mjs';
import {testFinalBonus} from './final-bonus.mjs';
import {testMinecart} from './minecart.mjs';
import {returnToMap} from './support/navigation.mjs';

// Exercise the shipped photo-console flow, not a shortcut route or test mutator.
export async function testDemo(page, bonusWin=true) {
  const expectedBonus=bonusWin===true?20:0;
  await page.setViewportSize({width:1366,height:768});
  const scene=name=>page.waitForFunction(n=>document.querySelector('#scene-name').textContent===n,name);
  const shot=name=>page.locator('canvas').screenshot({path:`artifacts/demo-${name}.png`});
  const progress=()=>page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.campaign));
  const audio=()=>page.locator('#audio-toggle').evaluate(e=>JSON.parse(e.dataset.audio));
  await page.goto('http://127.0.0.1:4174/?adventure=1');
  await page.waitForFunction(()=>document.querySelector('#console-shell').dataset.power==='off');
  await page.locator('#quick-mute').click();
  assert.equal(await page.locator('#quick-mute').getAttribute('aria-pressed'),'true');
  assert.equal((await audio()).state,'locked','Muting before power-on must not create an audio context');
  await page.locator('#power-start').click();
  await page.waitForFunction(()=>document.querySelector('#console-shell').dataset.power==='ready');
  await scene('TitleScene');await page.waitForTimeout(350);await shot('title');
  await page.locator('#quick-mute').click();
  await page.waitForFunction(()=>{const a=JSON.parse(document.querySelector('#audio-toggle').dataset.audio);return a.loaded&&a.state==='running';});
  const volumes=await audio();
  await page.locator('#quick-mute').click();
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).state==='suspended');
  assert.equal((await audio()).music,volumes.music);assert.equal((await audio()).effects,volumes.effects);
  await page.reload();await scene('TitleScene');
  assert.equal(await page.locator('#quick-mute').getAttribute('aria-pressed'),'true','Mute persists across reload');
  await page.locator('#power-start').click();await page.locator('#skip-power').click();await page.waitForTimeout(400);
  await page.keyboard.down('KeyK');await scene('WorldMapScene');await page.waitForTimeout(250);
  assert.equal((await progress()).screen,'map','Held title confirmation does not enter a level');
  await page.keyboard.up('KeyK');await shot('map-start');
  await page.keyboard.press('KeyD');assert.equal((await progress()).selected,0,'Locked stages stay locked');
  await page.keyboard.press('KeyK');await scene('StageIntroScene');
  assert.equal((await progress()).screen,'intro');
  await shot('tutorial-card');
  // Losing focus freezes the intro instead of starting a hidden game.
  await page.locator('#quick-mute').focus();await page.waitForTimeout(3000);await scene('StageIntroScene');
  await page.locator('#lab-panel').focus();await page.waitForTimeout(400);
  await page.keyboard.down('KeyK');await scene('JungleGreyboxScene');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').grounded);
  assert(!await page.locator('#movement-stats').evaluate(e=>JSON.parse(e.dataset.state).paused),'Held A that starts a card must not pause the new scene');
  await page.keyboard.up('KeyK');
  await testPhase10(page,true);
  console.log('PASS demo: quick mute, title, focus freeze, all 10 tutorial steps and level-1 house exit.');
  for(const [i,test] of [testPhase6,testPhase7,testPhase8].entries()){
    if(i){
      await page.waitForFunction(()=>!JSON.parse(document.querySelector('#lab-panel').dataset.campaign).moving);
      await page.keyboard.press('KeyK');await scene('StageIntroScene');
      assert.equal((await progress()).selected,i);
      await shot(`level-${i+1}-card`);await scene('JungleGreyboxScene');
    }
    // Mechanics helpers leave/re-enter through START when repeating an attempt.
    await test(page,true);
    if(i===2){
      await page.locator('#quick-mute').click(); // first audio unlock after a muted reload
      await page.waitForFunction(()=>{const a=JSON.parse(document.querySelector('#audio-toggle').dataset.audio);return a.loaded&&a.unlocked&&!a.muted;});
    }
    if(i<2)await page.keyboard.press('KeyK');
    if(i<2){await scene('WorldMapScene');await shot(`map-${i+1}`);}
    else {await testMinecart(page);await testFinalBonus(page,bonusWin);}
  }
  await page.locator('#ending-actions').waitFor({state:'visible'});await shot('ending');
  assert.equal((await progress()).letters,'BONUS');assert((await progress()).finished);
  assert.equal((await progress()).completed.length,3);
  assert((await audio()).finished,'Ending is a finished campaign, not an active level');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).voices===0);
  assert.equal((await audio()).track,'soundtrack/tutorial-ending','Shared tutorial/ending theme');
  assert.equal((await audio()).playingMusic,true,'Ending choices keep their background theme');
  assert.equal((await progress()).bonusBananas,expectedBonus,'Won/lost bonus appears correctly in final total');
  assert.equal((await progress()).bananas,(await progress()).levelBananas+expectedBonus);
  await page.keyboard.press('KeyD');assert.equal(await page.locator('#ending-replay').getAttribute('data-selected'),'true');
  await page.keyboard.press('KeyW');assert.equal(await page.locator('#ending-map').getAttribute('data-selected'),'true');
  const beforeMap=await progress();
  // Switch only the emulated input device, keeping the legitimately completed
  // campaign. Exercise the real touch action and layout, without game hooks.
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  for(const size of [{width:390,height:844},{width:375,height:667},{width:320,height:568}]){
    await page.setViewportSize(size);await page.waitForFunction(()=>document.body.classList.contains('touch-console'));
    await page.waitForTimeout(160);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Ending has no sideways overflow');
    const lcd=await page.locator('canvas').boundingBox();
    for(const id of ['ending-map','ending-replay']){
      const box=await page.locator(`#${id}`).boundingBox();
      assert(box.height>=24&&box.x>=lcd.x&&box.y>=lcd.y&&box.x+box.width<=lcd.x+lcd.width+.5&&box.y+box.height<=lcd.y+lcd.height+.5,`${id} stays INSIDE the LCD at ${size.width}x${size.height}; console A is an alternative large target`);
    }
    await page.screenshot({path:`artifacts/ending-menu-${size.width}x${size.height}.png`});
  }
  const mapButton=await page.locator('#ending-map').boundingBox();
  const point={id:1,x:mapButton.x+mapButton.width/2,y:mapButton.y+mapButton.height/2,radiusX:7,radiusY:7};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[point]});await scene('WorldMapScene');
  assert.equal(await page.locator('#ending-actions').isVisible(),false);
  assert.equal((await progress()).bananas,beforeMap.bananas);assert.equal((await progress()).letters,beforeMap.letters);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  await page.setViewportSize({width:1366,height:768});
  assert.equal((await progress()).completed.length,3,'Ending never resets campaign');
  await shot('map-complete');
  // Regression: keep the finished campaign, repeat Jungle, and go directly to
  // the summary instead of reopening the final bonus. Only actual input/route.
  await page.waitForFunction(()=>!JSON.parse(document.querySelector('#lab-panel').dataset.campaign).moving);
  for(let i=0;i<2;i++){
    await page.keyboard.press('KeyA');
    await page.waitForFunction(()=>!JSON.parse(document.querySelector('#lab-panel').dataset.campaign).moving);
  }
  assert.equal((await progress()).selected,0);
  await page.keyboard.press('KeyK');await scene('StageIntroScene');await scene('JungleGreyboxScene');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').grounded);
  // Keep the same keyboard bot: the later cave helpers share its held-key set.
  await page.evaluate(async()=>{
    const b=window.__bot;await b.travel(s=>s.finished,{label:'replay Jungle after bonus',timeout:60000});
    for(const k of [...b.held])b.up(k);
  });
  const replayOverlay=await page.locator('#movement-stats').evaluate(e=>JSON.parse(e.dataset.state).view.overlay);
  assert(replayOverlay.includes('K: VER RESUMEN'),'Replayed level must not advertise another bonus');
  await page.keyboard.press('KeyK');await scene('DemoEndingScene');
  await page.locator('#ending-actions').waitFor({state:'visible'});
  assert.equal((await progress()).bonusBananas,expectedBonus);
  await shot('replay-jungle-summary');
  await page.locator('#ending-map').click();await scene('WorldMapScene');
  console.log('PASS bonus once: completed bonus + keep campaign + real Jungle replay goes directly to summary, prize retained.');
  // Tutorial replay/skip is covered by navigation.mjs; Help no longer offers it.
  await page.keyboard.press('KeyD');await page.waitForFunction(()=>!JSON.parse(document.querySelector('#lab-panel').dataset.campaign).moving);
  await page.keyboard.press('KeyK');await scene('StageIntroScene');
  assert.equal((await progress()).selected,1);
  await scene('JungleGreyboxScene');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').grounded);
  assert(!await page.locator('#movement-stats').evaluate(e=>JSON.parse(e.dataset.state).practice),'Skipping tutorial card must not leak a practice into another level');
  // Return to the finished cave and replay its real route to exercise the second
  // ending choice. Existing pickups stay restored; there is no teleport or save injection.
  await returnToMap(page);await page.keyboard.press('KeyD');
  await page.waitForFunction(()=>!JSON.parse(document.querySelector('#lab-panel').dataset.campaign).moving);
  await page.keyboard.press('KeyK');await scene('StageIntroScene');
  assert.equal((await progress()).selected,2);await scene('JungleGreyboxScene');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').grounded);
  await page.evaluate(async()=>{const {go,onTire}=window.__r8;await go(300);await onTire(330,124,false);await go(560,{run:false});await go(700);await onTire(718,108);});
  await page.evaluate(async()=>{
    const {go,wait}=window.__r8,b=window.__bot;
    await go(924);b.down('KeyK');await wait(380);b.up('KeyK');
    // Replay uses the same barrel counter as the primary Reptile route now
    // that the old snake is a hopping lizard; never change game state for QA.
    await go(992,{run:false,jump:false});await b.stop();b.down('KeyJ');
    await b.until(s=>s.gameplay.carrying,'replay: pick up barrel');
    let lastY=b.S().gameplay.enemies[3].y;
    await b.until(s=>{const y=s.gameplay.enemies[3].y,land=y>lastY&&y>169;lastY=y;return land;},'replay: lizard descending',5000);
    b.up('KeyJ');await b.until(s=>!s.gameplay.enemies[3].alive,'replay: defeat lizard',3000);
    await go(1110);
  });
  await page.evaluate(async()=>{const {onTire,hop,go}=window.__r8;await onTire(1150,124);await hop(1244);await hop(1310);await hop(1400);await hop(1436);await go(1640);await go(1778,{run:false});});
  await page.evaluate(async()=>{const {onTire,hop,go}=window.__r8,b=window.__bot;await onTire(1818,124);await hop(1916);await hop(1980);await go(2240,{run:false});for(const k of [...b.held])b.up(k);});
  await testMinecart(page,false);await scene('DemoEndingScene');await page.locator('#ending-actions').waitFor({state:'visible'});
  assert.equal((await progress()).bonusBananas,expectedBonus,'Cave replay also skips the bonus and retains the original result');
  const settings=await audio();
  await page.locator('#ending-replay').click();await scene('TitleScene');
  assert.equal(await page.locator('#ending-actions').isVisible(),false);
  assert.deepEqual((await progress()).completed,[]);assert.equal((await progress()).letters,'-----');assert.equal((await progress()).bananas,0);
  for(const name of ['muted','music','effects'])assert.equal((await audio())[name],settings[name],'New game keeps sound preferences');
  await page.keyboard.down('KeyK');await scene('WorldMapScene');await page.waitForTimeout(150);await page.keyboard.up('KeyK');
  assert.equal((await progress()).selected,0);await page.keyboard.press('KeyD');assert.equal((await progress()).selected,0,'New game locks later levels');
  await page.keyboard.press('KeyK');await scene('StageIntroScene');await page.waitForTimeout(350);await page.keyboard.press('KeyK');
  await scene('JungleGreyboxScene');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').practice?.step===0);
  console.log('PASS demo: all 3 real levels, ending at 3 phone sizes, touch map preserves campaign, Jungle/cave replay skips bonus, new-game resets progress/locks/tutorial, sound settings preserved.');
}
