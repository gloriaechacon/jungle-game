import assert from 'node:assert/strict';
import {installBot} from './support/bot.mjs';
export async function testPhase10(page,inDemo=false) {
  // Phase 10 now teaches mechanics and adds optional routes, no cards.
  if(!inDemo){
    await page.goto('http://127.0.0.1:4174/?adventure=1&workbench=1');
    await page.waitForFunction(()=>document.querySelector('#scene-name').textContent==='WorldMapScene');
    await page.locator('#activate-input').click();await page.keyboard.press('KeyK');
  }
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').practice?.step===0);
  await installBot(page);
  await page.screenshot({path:'artifacts/phase-10-practice.png'});
  await page.evaluate(async()=>{
    const b=window.__bot;
    const lesson=async n=>{
      for(const k of [...b.held])b.up(k);
      const s=await b.until(s=>s.practice?.step===n&&s.grounded,`lesson ${n}`);
      if(n===4&&s.practice.instruction!=='MANTEN D Y PULSA K\nSALTA SOBRE EL RIVAL\nCAE ENCIMA Y VENCELO')throw new Error('Stomp lesson must explain holding D, jumping with K and landing to defeat the rival');
      await b.until(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).wantedTrack==='soundtrack/tutorial-ending',`tutorial music in lesson ${n}`);
      const bg=s.view.backdrop;
      if(bg.farTint!==0x718889||bg.shadeColor!==0x0b2423||bg.shadeAlpha!==.55)throw new Error(`Lesson ${n} must use the unchanged rope-practice backdrop`);
    };
    const retry=async(n,pause=false)=>{
      for(const k of [...b.held])b.up(k);
      const failed=await b.until(s=>s.practice?.retrying,`retry wrong action in lesson ${n}`,4000);
      if(failed.practice.complete||failed.practice.step!==n)throw new Error('Wrong attack must not complete/skip the lesson');
      if(pause){
        await b.press('Space');const time=b.S().simTime;
        await new Promise(r=>setTimeout(r,1300));
        if(!b.S().paused||b.S().simTime!==time||!b.S().practice.retrying)throw new Error('Pause must freeze the retry countdown');
        await b.press('Space');
      }
      await b.until(s=>s.practice?.step===n&&!s.practice.retrying&&s.grounded&&s.x<40&&s.gameplay.enemies.every(e=>e.alive),`fresh attempt ${n}`,4000);
      if(Object.values(b.S().gameplay.kills).some(Boolean))throw new Error('Retry must reset attempt kills');
    };
    await lesson(0);b.down('KeyD');await b.until(s=>s.practice?.complete,'walk');await lesson(1);
    b.down('KeyK');await b.until(s=>s.practice?.complete,'jump');await lesson(2);
    b.down('KeyJ');await b.until(s=>s.practice?.complete,'roll');await lesson(3);
    b.down('KeyJ');b.down('KeyD');await b.until(s=>s.practice?.complete,'run');await lesson(4);
    // Roll when asked to stomp; retry the SAME step, also across a pause.
    b.down('KeyD');await b.until(s=>s.x>=86,'wrong roll approach');b.down('KeyJ');
    await b.until(s=>s.gameplay.kills.roll===1,'wrong roll kills');await retry(4,true);
    b.down('KeyD');await b.until(s=>s.x>=86,'approach stomp');b.down('KeyK');await b.until(s=>s.x>=111,'over rival');b.up('KeyD');
    await b.until(s=>s.practice?.complete,'stomp');await lesson(5);
    // Stomp when asked to roll, then complete the replenished encounter correctly.
    b.down('KeyD');await b.until(s=>s.x>=86,'wrong stomp approach');b.down('KeyK');
    await b.until(s=>s.x>=111,'over wrong stomp');b.up('KeyD');
    await b.until(s=>s.gameplay.kills.stomp===1,'wrong stomp kills');await retry(5);
    b.down('KeyD');await b.until(s=>s.x>=86,'approach roll');b.down('KeyJ');await b.until(s=>s.practice?.complete,'roll rival');await lesson(6);
    b.down('KeyD');await b.until(s=>s.x>=86,'stomp barrel target approach');b.down('KeyK');
    await b.until(s=>s.x>=111,'over barrel target');b.up('KeyD');
    await b.until(s=>s.gameplay.kills.stomp===1,'wrong barrel target kill');await retry(6);
    // Throw the only barrel away from the enemy: a spent barrel must replenish too.
    b.down('KeyD');await b.until(s=>s.x>=47,'near barrel to miss');b.up('KeyD');b.down('KeyJ');
    await b.until(s=>s.gameplay.carrying,'carry wrong way');b.down('KeyA');
    await b.until(s=>s.gameplay.facing===-1,'face away');b.up('KeyA');b.up('KeyJ');
    await b.until(s=>s.gameplay.barrels.every(v=>v.state==='spent'),'barrel missed');await retry(6);
    b.down('KeyD');await b.until(s=>s.x>=47,'near barrel');b.up('KeyD');b.down('KeyJ');await b.until(s=>s.gameplay.carrying,'carry');b.up('KeyJ');
    await b.until(s=>s.practice?.complete,'throw');await lesson(7);
    b.down('KeyD');await b.until(s=>s.x>=54,'approach tire');b.down('KeyK');await b.until(s=>s.x>=86,'above tire');b.up('KeyD');
    await b.until(s=>s.practice?.complete,'tire');await lesson(8);
  });
  assert.match(await page.locator('#play-guide').textContent(),/MANTEN LA TECLA W/);
  await page.screenshot({path:'artifacts/phase-11-tutorial-rope.png'});
  await page.evaluate(async()=>{
    const b=window.__bot;
    b.down('KeyD');await b.until(s=>s.x>=87,'near rope');b.up('KeyD');b.down('KeyW');await b.until(s=>s.rope&&s.y<=84,'climb to visible tuft');b.up('KeyW');
  });
  await page.waitForFunction(()=>document.querySelector('#play-guide').textContent.includes('PULSA K: SUELTA'));
  const instruction=await page.locator('#movement-stats').evaluate(e=>JSON.parse(e.dataset.state).practice.instruction);
  assert(instruction.split('\n').every(line=>line.length<=21),'Rope instructions fit inside the 160px screen');
  await page.screenshot({path:'artifacts/phase-11-tutorial-grip.png'});
  await page.evaluate(async()=>{
    const b=window.__bot;b.down('KeyK');
    await b.until(s=>s.practice?.complete,'release');for(const k of [...b.held])b.up(k);
  });
  await page.waitForFunction(()=>{const s=JSON.parse(document.querySelector('#movement-stats').dataset.state);return s.practice?.step===9&&s.grounded;});
  await page.evaluate(async()=>{
    const b=window.__bot;
    // Walking off must not pass the lesson; recover by jumping back onto it.
    b.down('KeyD');await b.until(s=>s.x>=130,'walk off practice ledge');await b.stop();
    if(b.S().practice.complete)throw new Error('Walking off cannot replace S');
    b.down('KeyA');b.down('KeyK');await b.until(s=>s.x<=82,'back over practice ledge');b.up('KeyA');
    await b.until(s=>s.grounded&&s.y===80,'recover on mound');b.up('KeyK');
    b.down('KeyS');await b.until(s=>s.practice.complete&&s.grounded&&s.y===116,'S drop lesson');b.up('KeyS');
  });
  await page.locator('canvas').screenshot({path:'artifacts/tutorial-drop.png'});
  if(inDemo){
    await page.waitForFunction(()=>document.querySelector('#scene-name').textContent==='StageIntroScene');
    assert.equal(await page.locator('#scene-name').textContent(),'StageIntroScene');
    await page.waitForTimeout(1200);
    await page.locator('canvas').screenshot({path:'artifacts/demo-house-jump.png'});
  }
  await page.waitForFunction(()=>{const s=JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}');return !s.practice&&s.grounded;});
  assert.equal(await page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.campaign).completed.length),0,'Practice never completes a campaign stage');
  const gameBackdrop=await page.locator('#movement-stats').evaluate(e=>JSON.parse(e.dataset.state).view.backdrop);
  assert.equal(gameBackdrop.shadeAlpha,0,'Tutorial contrast must not darken the real level');
  if(inDemo)return;
  await page.evaluate(async()=>{
    const b=window.__bot;
    await b.travel(s=>s.x>=207,{label:'first solid step'});await b.stop();
    b.down('KeyD');await b.until(s=>s.x>=269,'under raised ledge');await b.stop();
    if(Math.abs(b.S().y-116)>1)throw new Error('Must walk underneath the 248 ledge on the lower floor');
    b.down('KeyK');await b.until(s=>!s.grounded&&s.vy>0,'jump through ledge');b.up('KeyK');
    await b.until(s=>s.grounded,'land above ledge');
    if(Math.abs(b.S().y-76)>1)throw new Error('Must land on the same one-way ledge after jumping through it');
  });
  await page.screenshot({path:'artifacts/phase-10-platform.png'});
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.querySelector('#scene-name').textContent==='WorldMapScene');
  await page.locator('#practice-again').click();
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).practice?.step===0);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.querySelector('#scene-name').textContent==='WorldMapScene');
  console.log('PASS phase 10: all ten interactive lessons, drop recovery, real Jungle transition, replay, skip, no campaign contamination.');
}
