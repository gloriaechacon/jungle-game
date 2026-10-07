import assert from 'node:assert/strict';
import {installBot} from './support/bot.mjs';

export async function testTerrain(page){
  await page.goto('http://127.0.0.1:4174/?level=jungle');
  await page.locator('#activate-input').click();
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').grounded);
  await installBot(page);
  const direction=await page.evaluate(async()=>{
    const b=window.__bot;b.down('KeyD');await b.until(s=>s.gameplay.dying,'walk into first rival');
    b.up('KeyD');b.down('KeyA'); // the held input begins during the locked hurt state
    await b.until(s=>s.gameplay.deaths===1&&!s.gameplay.dying,'respawn holding left');
    await b.until(s=>s.vx<0,'left resumes');const left=b.S();
    b.up('KeyA');b.down('KeyD');await b.until(s=>s.vx>0,'right after respawn');const right=b.S();
    await b.stop();return {left,right};
  });
  assert.equal(direction.left.gameplay.facing,-1,'Held left during damage turns the new life left');
  assert.equal(direction.right.gameplay.facing,1,'D turns back right without another death/restart');
  const drops=await page.evaluate(async()=>{
    const b=window.__bot;
    // Invulnerability is not required: defeat the patrol before testing the mound.
    b.down('KeyD');await b.until(s=>s.gameplay.enemies[0].x-s.x<24,'approach rival');b.down('KeyJ');
    await b.until(s=>!s.gameplay.enemies[0].alive,'roll rival');b.up('KeyJ');
    await b.until(s=>s.x>=271,'in front of rocky facade');await b.stop();const below=b.S();
    b.down('KeyK');await b.until(s=>s.grounded&&s.y===76,'upper platform');b.up('KeyK');
    const above=b.S();b.down('KeyS');await b.until(s=>s.grounded&&s.y===116,'drop through with S');
    await new Promise(r=>setTimeout(r,300));const landed=b.S();b.up('KeyS');
    b.down('KeyK');await b.until(s=>s.grounded&&s.y===76,'collider restored after drop');b.up('KeyK');
    return {below,above,landed};
  });
  assert.equal(drops.below.y,116);assert.equal(drops.above.y,76);assert.equal(drops.landed.y,116);
  assert.equal(drops.landed.gameplay.deaths,1,'Down cannot fall through the solid ground');
  await page.locator('canvas').screenshot({path:'artifacts/terrain-front-mound.png'});
  // The same input path for a physical Down key is used by the touch cruceta.
  await page.keyboard.down('ArrowDown');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).y===116);
  await page.keyboard.up('ArrowDown');
  await page.keyboard.down('KeyK');
  await page.waitForFunction(()=>{const s=JSON.parse(document.querySelector('#movement-stats').dataset.state);return s.grounded&&s.y===76;});
  await page.keyboard.up('KeyK');
  await page.keyboard.press('Space');await page.keyboard.press('KeyS');await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  const resumed=await page.locator('#movement-stats').evaluate(e=>JSON.parse(e.dataset.state));
  assert.equal(resumed.y,76,'A paused S press does not fire after resuming');
  const solid=await page.evaluate(async()=>{
    const b=window.__bot;await b.travel(s=>s.x>=834,{label:'solid step approach'});await b.stop();
    b.down('KeyD');await b.until(s=>s.x>=858&&s.grounded,'solid step stops walking');
    await new Promise(r=>setTimeout(r,250));const wall=b.S();
    if(wall.x!==858)throw new Error('Solid step did not block the body');
    b.down('KeyK');await b.until(s=>s.x>872&&s.grounded&&s.y===100,'jump onto solid step');
    b.up('KeyK');await b.stop();b.down('KeyS');await new Promise(r=>setTimeout(r,300));b.up('KeyS');return {wall,on:b.S()};
  });
  assert.equal(solid.wall.y,116);assert.equal(solid.on.y,100,'S never bypasses a solid step');
  await page.locator('canvas').screenshot({path:'artifacts/terrain-solid-step.png'});
  await page.evaluate(async()=>{
    const b=window.__bot;
    const move=async x=>{const k=x>b.S().x?'KeyD':'KeyA';b.down(k);await b.until(s=>k==='KeyD'?s.x>=x:s.x<=x,'align jungle terrace');await b.stop();};
    const jump=async(feet,x)=>{
      const k=x>b.S().x?'KeyD':'KeyA';b.down('KeyK');b.down(k);
      await b.until(s=>k==='KeyD'?s.x>=x:s.x<=x,`reach Jungle ${feet}`);b.up(k);
      await b.until(s=>s.grounded&&s.y===feet-8,`land Jungle ${feet}`,4000);b.up('KeyK');await b.stop();
    };
    await move(968);b.down('KeyK');await b.until(s=>s.grounded&&s.y===76,'Jungle lower shelf');b.up('KeyK');
    await move(990);await jump(52,1036);await move(1054);await jump(20,1096);
    if(b.S().gameplay.letters[1]!=='O')throw new Error('O must be collectible on the upper stair, before exit recovery');
    await move(1078);await jump(-12,1036);
    if(b.S().cameraY>=0||!b.S().gameplay.bunches.find(p=>p.x===1036).collected)throw new Error('Jungle summit/camera/reward');
  });
  await page.locator('canvas').screenshot({path:'artifacts/terrain-jungle-summit.png'});
  await page.evaluate(async()=>{
    const b=window.__bot;b.down('KeyS');await b.until(s=>s.grounded&&s.y===44,'Jungle drop to next shelf');
    await new Promise(r=>setTimeout(r,200));if(b.S().y!==44)throw new Error('Held down skipped a Jungle shelf');b.up('KeyS');
  });
  await page.evaluate(async()=>{
    const b=window.__bot;await b.travel(s=>s.x>=1818,{label:'continuous mountain'});await b.stop();
    if(b.S().y!==92)throw new Error('Mountain first step must support feet100');
    b.down('KeyD');await b.until(s=>s.x===1842&&s.grounded,'second rock face');
    await new Promise(r=>setTimeout(r,200));if(b.S().x!==1842)throw new Error('Second face must block walking');
    b.down('KeyK');await b.until(s=>s.x>=1866,'over second step');b.up('KeyD');
    await b.until(s=>s.grounded&&s.y===68,'mountain summit');b.up('KeyK');
    b.down('KeyS');await new Promise(r=>setTimeout(r,200));b.up('KeyS');
    if(b.S().y!==68)throw new Error('Cannot drop through a solid mountain');
  });
  await page.locator('canvas').screenshot({path:'artifacts/terrain-jungle-mountain.png'});
  console.log('PASS terrain Edge: death with held left then right, front-pass facade, K landing, S/Down drop, collider restoration, pause edge, solid wall/jump/no drop.');
}
