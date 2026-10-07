import assert from 'node:assert/strict';
import {testPhase6} from './phase6.mjs';
import {returnToMap,skipTutorial} from './support/navigation.mjs';

// Complete Jungle through normal inputs; no test hook mutates the campaign.
export async function testMapCoach(page) {
  const scene=name=>page.waitForFunction(n=>document.querySelector('#scene-name').textContent===n,name);
  const progress=()=>page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.campaign));
  const mapReady=async()=>{
    await scene('WorldMapScene');
    await page.waitForFunction(()=>!JSON.parse(document.querySelector('#lab-panel').dataset.campaign).moving);
  };
  const quietMap=async()=>{
    await mapReady();
    assert((await progress()).completed.includes('jungle'));
    assert.equal((await progress()).mapInstruction,'','No repeated LCD control instructions');
    assert(await page.locator('#console-coach').isHidden(),'No repeated HTML coach');
    assert.equal(await page.locator('.coach-ring:not([hidden])').count(),0,'No floating circle after learning');
  };
  await page.goto('http://127.0.0.1:4174/?adventure=1');
  await page.locator('#power-start').click();await page.locator('#skip-power').click();
  await scene('TitleScene');await page.locator('#lab-panel').focus();
  await page.keyboard.press('KeyK');await mapReady();
  assert(await page.locator('#console-coach').isHidden());
  assert.equal((await progress()).mapInstruction,'PRESIONA K: ENTRAR');
  await page.keyboard.press('KeyK');await scene('StageIntroScene');await skipTutorial(page);
  // Skipping practice is not finishing the first level; onboarding remains.
  await returnToMap(page);await mapReady();
  assert.equal((await progress()).mapInstruction,'PRESIONA K: ENTRAR');
  await page.keyboard.press('KeyK');await scene('JungleGreyboxScene');
  await testPhase6(page,true);
  await page.keyboard.press('KeyK');await quietMap();
  assert.equal((await progress()).selected,1);
  await page.screenshot({path:'artifacts/map-coach-learned-desktop.png'});
  // Same earned campaign on a phone viewport. Resizing cannot restore hints.
  const cdp=await page.context().newCDPSession(page);
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.body.classList.contains('touch-console'));
    await quietMap();
    await page.screenshot({path:'artifacts/map-coach-learned-phone.png'});
    const tap=async selector=>{
      const b=await page.locator(selector).boundingBox();assert(b);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    };
    await tap('#touch-a');await scene('JungleGreyboxScene');
    await returnToMap(page);await quietMap();
    // Revisit level 1 on the map: do not infer learning from selected level.
    await page.keyboard.press('KeyA');await quietMap();assert.equal((await progress()).selected,0);
    await page.locator('#console-help').click();await page.locator('#restart-game').click();
    await page.locator('#restart-confirm').click();
    await scene('TitleScene');await page.locator('#power-start').click();
    await page.locator('#skip-power').click();await tap('#touch-a');await mapReady();
    assert.deepEqual((await progress()).completed,[]);
    assert(await page.locator('#console-coach').isHidden());
    assert.equal((await progress()).mapInstruction,'PRESIONA A: ENTRAR');
    assert.equal(await page.locator('.coach-ring:not([hidden])').count(),1);
  } finally {
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();
  }
  console.log('PASS map coach: initial hint, skipped tutorial, earned Jungle completion, desktop/touch hidden hints, Ropey return, Jungle reselection and fresh campaign onboarding.');
}
