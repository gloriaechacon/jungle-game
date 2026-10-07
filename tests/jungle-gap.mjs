import assert from 'node:assert/strict';
import {installBot} from './support/bot.mjs';

// Real route + keyboard input: no teleport, physics writes or invulnerability.
export async function testJungleGap(page){
  await page.goto('http://127.0.0.1:4174/');
  await page.locator('#activate-input').click();
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').grounded);
  await installBot(page);
  await page.evaluate(async()=>{
    const b=window.__bot;
    await b.travel(s=>s.x>=1540,{label:'reach checkpoint gap'});await b.stop();
  });
  const results=await page.evaluate(async()=>{
    const b=window.__bot,results=[];
    for(const takeoff of [1584,1590,1596]){
      const deaths=b.S().gameplay.deaths;
      b.down('KeyD');await b.until(s=>s.x>=takeoff,'early takeoff');
      const start=b.S();b.down('KeyK');await b.until(s=>!s.grounded,'leave ground');
      const trace=[];let sampled=-1;
      await b.until(s=>{
        if(s.simTime!==sampled){sampled=s.simTime;trace.push({x:s.x,y:s.y,vy:s.vy,g:s.grounded});}
        return s.gameplay.deaths>deaths||(s.grounded&&s.x>1610);
      },'cross or fall');
      const end=b.S();await b.stop();
      results.push({takeoff:start.x,startY:start.y,land:end.x,deaths:end.gameplay.deaths-deaths,...(end.gameplay.deaths>deaths?{trace}: {})});
      if(end.gameplay.deaths>deaths)break;
      // Return over the same gap from the right, also without running.
      b.down('KeyD');await b.until(s=>s.x>=1672,'room for return');await b.stop();
      b.down('KeyA');await b.until(s=>s.x<=1642,'return takeoff');b.down('KeyK');
      await b.until(s=>!s.grounded,'return airborne');
      await b.until(s=>s.grounded&&s.x<1600,'return landing');b.up('KeyK');
      await b.until(s=>s.x<=1550,'reset approach');await b.stop();
    }
    return results;
  });
  console.log('Gap takeoffs:',JSON.stringify(results));
  assert.equal(results.length,3,'Every early takeoff should reach the other side');
  for(const r of results)assert.equal(r.deaths,0,`Walk-speed jump from ${r.takeoff}, not the exact edge, must land`);
  await page.locator('canvas').screenshot({path:'artifacts/jungle-gap-forgiving.png'});
  await page.evaluate(async()=>{
    const b=window.__bot,deaths=b.S().gameplay.deaths;
    b.down('KeyD');await b.until(s=>s.gameplay.deaths>deaths,'walking alone still falls');await b.stop();
    if(!b.S().gameplay.checkpoint||b.S().x<1250||b.S().x>1300)throw new Error('Fall must use the existing checkpoint');
  });
  console.log('PASS Jungle gap: three early walking takeoffs, reverse crossings, no jump tuning; walking alone still falls and checkpoint works.');
}
