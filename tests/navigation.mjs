import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { testPhase10 } from './phase10.mjs';

export async function testNavigation(browser){
  await mkdir('artifacts',{recursive:true});
  for(const mobile of [false,true]){
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:768},isMobile:mobile,hasTouch:mobile});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const keys={a:'KeyK',b:'KeyJ',start:'Space',up:'KeyW',down:'KeyS',right:'KeyD'};
    const press=async action=>{if(mobile)await page.locator(`#touch-${action}`).tap();else await page.keyboard.press(keys[action]);await page.waitForTimeout(70);};
    const click=async selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
    const scene=n=>page.waitForFunction(n=>document.querySelector('#scene-name').textContent===n,n);
    const menu=()=>page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.pauseMenu||'{}'));
    const state=()=>page.locator('#movement-stats').evaluate(e=>JSON.parse(e.dataset.state||'{}'));
    const audio=()=>page.locator('#audio-toggle').evaluate(e=>JSON.parse(e.dataset.audio));
    const map=()=>page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.campaign));
    const ringsOnly=async count=>{
      assert(await page.locator('#console-coach').isHidden());
      assert.equal(await page.locator('#console-coach').textContent(),'');
      assert.equal(await page.locator('.coach-ring:not([hidden])').count(),mobile?count:0);
    };
    const exit=async()=>{await press('start');await press('up');await press('a');assert((await menu()).confirming);await press('a');await scene('WorldMapScene');};
    try{
      await page.goto('http://127.0.0.1:4174/?adventure=1');
      await scene('TitleScene');await click('#audio-toggle');await page.locator('#audio-music').fill('24');await click('#audio-close');
      assert.equal((await audio()).state,'locked','Settings before power-on remain silent');
      await click('#power-start');await page.waitForFunction(()=>document.querySelector('#console-shell').dataset.power==='ready');
      await page.waitForFunction(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).loaded);
      await ringsOnly(1);
      await page.waitForFunction(()=>getComputedStyle(document.querySelector('.lcd-boot')).opacity==='0');
      await page.screenshot({path:`artifacts/navigation-title-${mobile?'phone':'desktop'}.png`});
      await press('start');await scene('TitleScene'); // START cannot start the game.
      await press('a');await scene('WorldMapScene');
      await press('right');assert.equal((await map()).selected,0);assert.match((await map()).mapInstruction,/COMPLETA EL NIVEL 1/);
      await page.locator('canvas').screenshot({path:`artifacts/navigation-locks-${mobile?'phone':'desktop'}.png`});
      assert.equal(await page.locator('#touch-map').count(),0,'No external map shortcut');
      await press('a');await scene('StageIntroScene');await page.waitForTimeout(3000);await scene('StageIntroScene');
      await ringsOnly(0);
      await press('start');assert((await menu()).open);
      assert.deepEqual((await menu()).choices,['continue','skip','map']);
      await press('up');await press('a');await page.locator('canvas').screenshot({path:`artifacts/navigation-map-confirm-${mobile?'phone':'desktop'}.png`});
      await press('b');assert(!(await menu()).confirming,'B cancels map exit');
      await press('a');await press('a');await scene('WorldMapScene');
      await press('a');await scene('StageIntroScene');await page.waitForTimeout(350);
      // Returning to the map must NOT mark the tutorial as completed.
      await press('a');await scene('JungleGreyboxScene');
      await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').practice?.step===0);
      const box=await page.locator('canvas').boundingBox();
      assert.equal((await state()).guide.visible,true,'Single instruction inside LCD');
      assert(await page.locator('#console-coach').isHidden(),'No competing external label');
      assert.equal(await page.locator('.console-guide').textContent(),'');
      await page.screenshot({path:`artifacts/navigation-single-guide-${mobile?'phone':'desktop'}.png`});
      await press('start');assert((await menu()).open);
      const before=await state();await page.waitForTimeout(450);assert.equal((await state()).simTime,before.simTime);
      await page.screenshot({path:`artifacts/navigation-pause-${mobile?'phone':'desktop'}.png`});
      await press('a');assert(!(await menu()).open);
      assert((await state()).grounded,'Confirming resume never jumps');
      const after=await page.locator('canvas').boundingBox();assert.deepEqual(after,box,'Menu does not shift the Game Boy');
      await page.keyboard.press('Escape');await scene('JungleGreyboxScene');assert.equal((await state()).practice.step,0,'Esc is not an accidental tutorial skip');
      await click('#console-help');
      const actions=await page.locator('#controls-panel button:visible').evaluateAll(es=>es.filter(e=>e.id!=='console-help-close').map(e=>e.textContent));
      assert.deepEqual(actions,['Reiniciar Game Boy']);
      await page.screenshot({path:`artifacts/navigation-help-${mobile?'phone':'desktop'}.png`});
      await click('#console-help-close');await click('#audio-toggle');assert(!await page.locator('#controls-panel').isVisible());
      await page.waitForFunction(()=>{const a=JSON.parse(document.querySelector('#audio-toggle').dataset.audio);return a.state==='running'&&a.playingMusic&&a.settingsOpen;});
      const frozen=await state(),position=(await audio()).position;
      await page.locator('#audio-music').fill('17');await page.waitForTimeout(350);
      assert.equal((await state()).simTime,frozen.simTime,'Audio preview does not advance gameplay');
      assert.equal((await audio()).music,.17);assert((await audio()).position>position,'Preview remains audible while adjusting');
      await page.locator('#audio-muted').check();await page.waitForFunction(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).state==='suspended');
      await page.locator('#audio-muted').uncheck();await page.waitForFunction(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).state==='running');
      await click('#audio-close');
      if(!mobile){
        await testPhase10(page,true);
      }else{
        // Native finger hold: complete walk, then verify success only in LCD.
        const cdp=await context.newCDPSession(page),r=await page.locator('#touch-right').boundingBox();
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:r.x+r.width/2,y:r.y+r.height/2}]});
        await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).practice?.complete,{},{polling:20});
        assert(await page.locator('#console-coach').isHidden());
        assert.equal(await page.locator('.console-guide').evaluate(e=>getComputedStyle(e).visibility),'hidden');
        await page.locator('canvas').screenshot({path:'artifacts/navigation-success-lcd.png'});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
        await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).practice?.step===1);
        assert.equal((await state()).guide.visible,true,'Jump instruction inside LCD');
        assert.match((await state()).guide.text,/TOCA A PARA SALTAR\nMANTEN A: MAS ALTO/);
        assert(await page.locator('#console-coach').isHidden());
        await press('start');await press('down');await press('a');
        await scene('StageIntroScene');await scene('JungleGreyboxScene');
      }
      assert(!(await state()).practice,'Explicit skip/completion starts the actual level');
      await press('start');assert.deepEqual((await menu()).choices,['continue','map']);await press('start');
      await exit();await press('a');await scene('JungleGreyboxScene');assert(!(await state()).practice,'Tutorial stays finished after real completion/skip');
      // Walking alone encounters danger and cannot finish Jungle.
      await page.keyboard.down('KeyD');await page.waitForFunction(()=>{const s=JSON.parse(document.querySelector('#movement-stats').dataset.state);return s.gameplay.dying;});
      await page.keyboard.up('KeyD');assert(!(await state()).finished,'Walking without acting is not a winning route');
      await click('#console-help');await click('#restart-game');assert(await page.locator('#restart-dialog').isVisible());
      await click('#restart-cancel');await scene('JungleGreyboxScene');
      await click('#console-help');await click('#restart-game');await click('#restart-confirm');
      await scene('TitleScene');await page.waitForFunction(()=>document.querySelector('#console-shell')?.dataset.power==='off');
      assert.equal((await map()).bananas,0);assert.deepEqual((await map()).completed,[]);
      await click('#power-start');await page.waitForFunction(()=>document.querySelector('#console-shell').dataset.power==='ready');
      await ringsOnly(1);await press('a');await scene('WorldMapScene');await ringsOnly(1);
      assert.equal((await map()).mapInstruction,`PRESIONA ${mobile?'A':'K'}: ENTRAR`);
      await press('a');await scene('StageIntroScene');await ringsOnly(0);
      await page.waitForTimeout(350);await press('a');await scene('JungleGreyboxScene');
      await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).guide?.visible);
      await ringsOnly(1);assert.equal(await page.locator('.console-guide').textContent(),'');
      await page.screenshot({path:`artifacts/navigation-restarted-tutorial-${mobile?'phone':'desktop'}.png`});
      assert.deepEqual(errors,[]);
      console.log(`PASS navigation ${mobile?'native touch':'keyboard'}: A-only start, locked feedback, START/map/cancel/skip, help-only reset, LCD success, live volume with frozen game, walk-only danger.`);
    }finally{await context.close();}
  }
}
