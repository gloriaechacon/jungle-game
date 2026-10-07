import assert from 'node:assert/strict';
import {installBot} from './support/bot.mjs';
export async function testReadability(page){
  await page.goto('http://127.0.0.1:4174/');
  await page.locator('#activate-input').click();
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').grounded);
  await installBot(page);
  const result=await page.evaluate(async()=>{
    const b=window.__bot;
    b.down('KeyD');await b.until(s=>s.x>=101,'roll approach');b.down('KeyJ');
    await b.until(s=>s.gameplay.kills.roll===1,'roll first rival');
    b.up('KeyJ');await b.until(s=>s.x>=270,'walk under both raised arches');
    const right=b.S();await b.stop();
    b.down('KeyA');await b.until(s=>s.x<=194,'reverse camera');b.up('KeyA');
    const left=b.S();await b.stop();
    b.down('KeyD');await b.until(s=>s.x>=271,'back under reward');await b.stop();
    const count=b.S().gameplay.bananas;
    b.down('KeyK');await b.until(s=>s.grounded&&s.y<80,'jump through and land on upper shelf');b.up('KeyK');
    return {right,left,count,above:b.S()};
  });
  assert.equal(result.right.y,116,'No wall below either former mound');
  assert(result.right.x-result.right.cameraX<65,'Forward framing leaves 95+px visible');
  assert(result.left.x-result.left.cameraX>96,'Reverse framing shows the path to the left');
  assert.equal(result.above.y,76,'One-way landing top unchanged');
  assert(result.above.gameplay.bananas-result.count>=10,'Upper bunch awards ten');
  assert(result.above.gameplay.bunches[0].collected);
  await page.screenshot({path:'artifacts/readability-upper-route.png'});
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).paused);
  const camera=await page.locator('#movement-stats').evaluate(e=>JSON.parse(e.dataset.state).cameraX);
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#movement-stats').evaluate(e=>JSON.parse(e.dataset.state).cameraX),camera,'Pause freezes camera');
  console.log('PASS readability Edge: walk below mounds, both camera directions, jump through/reward, pause.');
}
