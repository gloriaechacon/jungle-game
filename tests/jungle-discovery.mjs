import assert from 'node:assert/strict';
import {installBot} from './support/bot.mjs';

// Input-driven exploration: no teleport or simulation mutation.
export async function testJungleDiscovery(page){
  await page.setViewportSize({width:1366,height:768});
  await page.goto('http://127.0.0.1:4174/');
  await page.locator('#activate-input').click();
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').grounded);
  await installBot(page);
  const state=()=>page.locator('#movement-stats').evaluate(e=>JSON.parse(e.dataset.state));
  await page.locator('canvas').screenshot({path:'artifacts/jungle-discovery-start.png'});
  await page.evaluate(async()=>{
    const b=window.__bot;
    // Clear the introductory patrol before calmly exploring backwards above home.
    b.down('KeyD');await b.until(s=>s.gameplay.enemies[0].x-s.x<24,'first rival');
    b.down('KeyJ');await b.until(s=>!s.gameplay.enemies[0].alive,'roll first rival');b.up('KeyJ');
    await b.until(s=>s.x>=194,'first mound');await b.stop();
    b.down('KeyK');await b.until(s=>s.grounded&&s.y===76,'first mound top');b.up('KeyK');
    const move=async x=>{const k=x>b.S().x?'KeyD':'KeyA';b.down(k);await b.until(s=>k==='KeyD'?s.x>=x:s.x<=x,'align palm');await b.stop();};
    const jump=async(x,feet)=>{
      const k=x>b.S().x?'KeyD':'KeyA';b.down('KeyK');b.down(k);
      await b.until(s=>k==='KeyD'?s.x>=x:s.x<=x,'above palm');b.up(k);
      await b.until(s=>s.grounded&&s.y===feet-8,'land on palm',4000);b.up('KeyK');await b.stop();
    };
    await move(184);await jump(144,56);await move(130);await jump(88,28);
  });
  const crown=await state();
  assert.equal(crown.y,20);assert(crown.cameraY<0);
  assert(crown.gameplay.bunches.find(b=>b.x===88).collected,'Early discovery gives bananas, not a letter');
  assert.equal(crown.gameplay.deaths,0,'Introductory crown route requires no sacrifice');
  assert.equal(crown.gameplay.letters,'-----');
  assert.equal(crown.view.landmarks.palms.length,3);
  await page.locator('canvas').screenshot({path:'artifacts/jungle-discovery-crown.png'});
  await page.keyboard.down('ArrowDown');
  await page.waitForFunction(()=>{const s=JSON.parse(document.querySelector('#movement-stats').dataset.state);return s.grounded&&s.y===116;});
  await page.keyboard.up('ArrowDown');
  assert.equal((await state()).gameplay.deaths,0,'Down returns safely to the original floor');
  await page.evaluate(async()=>{
    const b=window.__bot;await b.travel(s=>s.x>=1818,{label:'progression to late discovery',timeout:60000});await b.stop();
    // The two-step mountain makes the higher shelf available. Do not drop to the ground.
    b.down('KeyD');await b.until(s=>s.x===1842&&s.grounded,'second mountain face');
    b.down('KeyK');await b.until(s=>s.x>=1866,'mountain summit');b.up('KeyD');
    await b.until(s=>s.grounded&&s.y===68,'land on mountain');b.up('KeyK');await b.stop();
    b.down('KeyD');b.down('KeyK');await b.until(s=>s.x>=1930,'higher rocky shelf');b.up('KeyD');
    await b.until(s=>s.grounded&&s.y===52,'land on rocky shelf');b.up('KeyK');await b.stop();
    b.down('KeyD');await b.until(s=>s.x>=1950,'edge of rocky shelf');await b.stop();
    b.down('KeyD');b.down('KeyK');await b.until(s=>s.x>=1988,'late palm');b.up('KeyD');
    await b.until(s=>s.grounded&&s.y===20,'late crown landing');b.up('KeyK');await b.stop();
  });
  const late=await state();assert.equal(late.y,20);
  await page.locator('canvas').screenshot({path:'artifacts/jungle-discovery-late-palm.png'});
  await page.evaluate(async()=>{
    const b=window.__bot;b.down('KeyS');await b.until(s=>s.grounded&&s.y===76,'drop to shelf below late palm');b.up('KeyS');
    b.down('KeyS');await b.until(s=>s.grounded&&s.y===116,'drop to floor');b.up('KeyS');
    await b.travel(s=>s.x>=2390,{label:'exit clearing',timeout:60000});await b.stop();
  });
  const entrance=await state();
  assert.equal(entrance.view.landmarks.exit,'jungle-entrance');assert(!entrance.finished);
  await page.locator('canvas').screenshot({path:'artifacts/jungle-discovery-entrance.png'});
  await page.evaluate(async()=>{const b=window.__bot;await b.travel(s=>s.finished,{label:'enter cave'});await b.stop();});
  assert((await state()).finished,'New doorway does not add an invisible collision');
  console.log('PASS Jungle discovery: two walking-speed palm jumps, crown reward, safe Down, later reuse, camera, new entrance and finish.');
}
