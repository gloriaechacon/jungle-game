import assert from 'node:assert/strict';

/** Public scene reached from the actual cave. Only real keys/touch and read-only telemetry. */
export async function testMinecart(page,detailed=true){
  const state=()=>page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.minecart));
  const campaign=()=>page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.campaign));
  await page.waitForFunction(()=>document.querySelector('#scene-name').textContent==='MinecartScene');
  if(detailed)assert.equal((await campaign()).finished,false,'Stage three not committed before cart exit');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.minecart)?.phase==='riding');
  assert.equal((await state()).cartOriginY,1,'Wheel-bottom pivot survives animated frame changes');
  assert(Math.abs((await state()).cartBottom-(await state()).feet)<1,'Wheels rest on rail, not below it');
  await page.locator('canvas').screenshot({path:'artifacts/minecart-auto-start.png'});
  assert.match(await page.locator('#console-caption').textContent(),/./);
  if(detailed){
    await page.keyboard.press('Space');await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.minecart).paused);
    const paused=await state();await page.waitForTimeout(260);assert.deepEqual(await state(),paused);
    await page.keyboard.press('Space');await page.locator('#audio-toggle').click();
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.minecart).paused);
    const focus=await state();await page.waitForTimeout(200);assert.deepEqual(await state(),focus);
    await page.locator('#audio-close').click();
    const stable=await page.locator('canvas').boundingBox();
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.minecart).x>450);
    assert.equal((await state()).jumps,0,'No start confirmation or automatic jump');
    assert(await page.locator('#console-coach kbd').isVisible(),'Keyboard jump is shown as a keycap');
    {const box=await page.locator('canvas').boundingBox();for(const k of ['x','y','width','height'])assert(Math.abs(stable[k]-box[k])<1,'Coach must not shift LCD');}
    await page.screenshot({path:'artifacts/minecart-keyboard-coach.png'});
    await page.waitForFunction(()=>{const s=JSON.parse(document.querySelector('#lab-panel').dataset.minecart);return s.x>815&&s.grounded;});
    assert.equal((await state()).deaths,0,'Downward broken rail needs no jump');
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.minecart).phase==='retry',{},{timeout:15000});
    assert.equal((await state()).deaths,1);assert(!(await campaign()).finished);
    await page.locator('canvas').screenshot({path:'artifacts/minecart-retry.png'});await page.waitForTimeout(350);
  }
  // Phone controls for the full successful ride, including jumps. Physical phone still needs playtest.
  let cdp;
  if(detailed){cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(180);}
  const press=async()=>{
    if(!cdp)return page.keyboard.press('KeyK');
    const b=await page.locator('#touch-a').boundingBox(),point={id:1,x:b.x+b.width/2,y:b.y+b.height/2,radiusX:7,radiusY:7};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await page.waitForTimeout(55);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
  if(detailed)await press(); // Retry only. First entry always starts itself.
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.minecart).phase==='riding');
  const start=(await state()).elapsed;
  // One safe optional jump for the bananas; then jump shortly before each gap.
  const stable=await page.locator('canvas').boundingBox();
  await page.evaluate(()=>{
    window.__mineCurves={maxTilt:0,minRail:Infinity,maxRail:-Infinity,minCamera:Infinity,maxCamera:-Infinity,trace:[]};
    const panel=document.querySelector('#lab-panel');
    const watch=new MutationObserver(()=>{
      const s=JSON.parse(panel.dataset.minecart||'null');if(!s)return;
      const a=window.__mineCurves;
      a.trace.push({x:s.x,feet:s.feet,phase:s.phase,jumps:s.jumps,grounded:s.grounded});if(a.trace.length>40)a.trace.shift();
      if(s.phase==='riding'&&s.grounded){a.maxTilt=Math.max(a.maxTilt,Math.abs(s.cartTilt));a.minRail=Math.min(a.minRail,s.railY);a.maxRail=Math.max(a.maxRail,s.railY);a.minCamera=Math.min(a.minCamera,s.cameraY);a.maxCamera=Math.max(a.maxCamera,s.cameraY);}
    });watch.observe(panel,{attributes:true,attributeFilter:['data-minecart']});
    window.__stopMineCurves=()=>{watch.disconnect();return window.__mineCurves;};
  });
  const reach=async x=>{
    await page.waitForFunction(x=>{const s=JSON.parse(document.querySelector('#lab-panel').dataset.minecart);return s.x>=x||s.phase==='retry';},x,{timeout:20000});
    assert.equal((await state()).phase,'riding',`Unexpected fall: ${JSON.stringify(await page.evaluate(()=>window.__mineCurves.trace))}`);
  };
  for(const x of [405,1057,1787]){
    await page.waitForFunction(x=>{const s=JSON.parse(document.querySelector('#lab-panel').dataset.minecart);return s.x>=x&&s.grounded;},x,{timeout:20000});
    await press();
    await page.waitForFunction(()=>!JSON.parse(document.querySelector('#lab-panel').dataset.minecart).grounded);
    if(x===405){
      if(detailed)assert(await page.locator('#console-coach .console-button').isVisible(),'Touch jump has round A button and arrow');
      const box=await page.locator('canvas').boundingBox();for(const k of ['x','y','width','height'])assert(Math.abs(stable[k]-box[k])<1,'Touch/keyboard coach keeps framing fixed');
      await page.screenshot({path:'artifacts/minecart-phone-jump.png'});
      await reach(602);
      await page.locator('canvas').screenshot({path:'artifacts/minecart-steep-rise.png'});
    }
    if(x===1057){
      await reach(1430);
      await page.locator('canvas').screenshot({path:'artifacts/minecart-steep-descent.png'});
    }
    if(x===1787)await page.locator('canvas').screenshot({path:'artifacts/minecart-gap.png'});
  }
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.minecart).phase==='complete',{},{timeout:15000});
  const end=await state();assert.equal(end.deaths,detailed?1:0);assert(end.elapsed-start>15000&&end.elapsed-start<17000);assert(end.bananas>2);assert((await campaign()).finished);
  const curves=await page.evaluate(()=>window.__stopMineCurves());
  assert(curves.maxRail-curves.minRail>100,'Pronounced vertical rail variation in actual play');
  assert(curves.maxTilt>.75,'Cart inclines at least 43 degrees on steeper rails');
  assert(curves.minCamera<-35&&curves.maxCamera>10,'Camera keeps both crests and valleys in view');
  assert.equal((await page.locator('#audio-toggle').evaluate(e=>JSON.parse(e.dataset.audio))).track,'soundtrack/level');
  await page.locator('canvas').screenshot({path:'artifacts/minecart-exit.png'});
  await press();
  await page.waitForFunction(()=>['FinalBonusScene','DemoEndingScene','WorldMapScene'].includes(document.querySelector('#scene-name').textContent));
  if(cdp){await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});await cdp.detach();await page.setViewportSize({width:1366,height:768});}
  console.log('PASS minecart: automatic barrel/cart entry, 16s curved ride, natural drop without jumping, two real gaps, pause/focus/retry, stable LCD with keycap/touch hints, pickups and completion.');
}
