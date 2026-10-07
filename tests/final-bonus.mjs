import assert from 'node:assert/strict';

/** Real input and read-only telemetry, entered after completing all 3 levels. */
export async function testFinalBonus(page, mode=true) {
  const timedOut=mode==='timeout',detailed=mode===true;
  const state=()=>page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.bonus));
  const fits=(box,label)=>assert(box.x>=0&&box.y>=0&&box.x+box.width<=160&&box.y+box.height<=144,`${label} inside LCD: ${JSON.stringify(box)}`);
  const audio=()=>page.locator('#audio-toggle').evaluate(e=>JSON.parse(e.dataset.audio));
  const progress=()=>page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.campaign));
  await page.waitForFunction(()=>document.querySelector('#scene-name').textContent==='FinalBonusScene');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.bonus||'null')?.grounded);
  const before=await progress();
  let touch;
  if(!detailed){
    touch=await page.context().newCDPSession(page);
    await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.body.classList.contains('touch-console'));
    await page.waitForTimeout(180);
  }
  const hold=async action=>{
    if(!touch)return page.keyboard.down(action==='right'?'KeyD':'KeyK');
    const box=await page.locator(action==='right'?'#touch-right':'#touch-a').boundingBox();
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:box.x+box.width/2,y:box.y+box.height/2,radiusX:7,radiusY:7}]});
  };
  const release=async action=>touch?touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}):page.keyboard.up(action==='right'?'KeyD':'KeyK');
  assert.equal((await state()).phase,'instructions');
  const spawn=(await state()).x;
  const initialSymbols=(await state()).symbols;
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.bonus).elapsed>1200);
  assert.equal((await state()).phase,'instructions','No automatic start while reading');
  assert.equal((await state()).remainingMs,20000,'Reading the card never spends play time');
  assert.deepEqual((await state()).symbols,initialSymbols,'Reading time does not spin the reels');
  await page.locator('canvas').screenshot({path:`artifacts/final-bonus-instructions${touch?'-touch':''}.png`});
  {
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.bonus).elapsed>400);
    await page.locator('canvas').screenshot({path:'artifacts/final-bonus-start.png'});
    await page.keyboard.press('Space');
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.bonus).paused);
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).state==='suspended');
    const before=await state();await page.waitForTimeout(320);assert.deepEqual(await state(),before,'Pause freezes reels and player');
    await page.keyboard.press('KeyK');assert.deepEqual((await state()).locked,[null,null,null],'A resumes without selecting a barrel');
    await page.waitForFunction(()=>!JSON.parse(document.querySelector('#lab-panel').dataset.bonus).paused);
    await page.locator('#audio-toggle').click();
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.bonus).paused);
    const frozen=await state();await page.waitForTimeout(220);assert.equal((await state()).elapsed,frozen.elapsed,'Focus freezes bonus');
    await page.locator('#audio-close').click();
    assert.equal((await audio()).track,'soundtrack/bonus');
  }
  await hold('a');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.bonus).phase==='release');
  await page.waitForTimeout(600);
  assert.equal((await state()).x,spawn);assert((await state()).grounded,'Holding confirm cannot jump');
  assert.deepEqual((await state()).locked,[null,null,null]);
  await release('a');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.bonus).phase==='playing');
  const firstFrames=(await state()).presentation.slots.map(s=>s.frame);
  await page.waitForFunction(frames=>JSON.parse(document.querySelector('#lab-panel').dataset.bonus).presentation.slots.some((s,i)=>s.frame!==frames[i]),firstFrames);
  for(const s of (await state()).presentation.slots){fits(s,'Barrel');assert.equal(s.width,34);assert.equal(s.height,36);}
  // Pause during active play freezes the visible turn frames as well as selection.
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.bonus).paused);
  const still=await state();await page.waitForTimeout(200);assert.deepEqual(await state(),still);
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>!JSON.parse(document.querySelector('#lab-panel').dataset.bonus).paused);
  // A new jump in the safe entry space still cannot bump any barrel.
  await hold('a');
  await page.waitForFunction(()=>!JSON.parse(document.querySelector('#lab-panel').dataset.bonus).grounded);
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.bonus).grounded);
  await release('a');assert.deepEqual((await state()).locked,[null,null,null]);
  await page.locator('canvas').screenshot({path:'artifacts/final-bonus-safe-start.png'});
  if(timedOut){
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.bonus).expired,{},{timeout:25000});
    const expired=await state();
    assert.equal(expired.remainingMs,0);
    assert.deepEqual(expired.locked,[null,null,null],'Time running out never selects a reel for the player');
    assert.equal((await progress()).bonusBananas,before.bonusBananas,'Expiry gives no automatic prize; replay is checked after the ending');
  }
  for(const [index,x] of (timedOut?[]:[56,96,136]).entries()){
    await hold('right');
    await page.waitForFunction(x=>JSON.parse(document.querySelector('#lab-panel').dataset.bonus).x>=x-2,x);
    await release('right');
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.bonus).grounded);
    // Real timing/input only: first round deliberately matches all three,
    // second deliberately misses. Jump early in the desired symbol's window.
    if(index>0){
      const target=detailed?(await state()).locked[0]:((await state()).locked[0]+1)%4;
      await page.waitForFunction(({index,target})=>{
        const s=JSON.parse(document.querySelector('#lab-panel').dataset.bonus);
        const phase=s.reelElapsed%(300+index*35);
        return s.symbols[index]===target&&phase>=20&&phase<80;
      },{index,target});
    }
    await hold('a');
    await page.waitForFunction(i=>JSON.parse(document.querySelector('#lab-panel').dataset.bonus).locked[i]!==null,index);
    await release('a');
    assert.equal((await state()).locked.filter(s=>s!==null).length,index+1,'One jump locks only one barrel');
    assert((await state()).presentation.slots[index].frame.endsWith('-turn-0'),'Selected symbol faces forward');
  }
  const result=await state();
  assert.equal(result.reward,detailed?20:0,'Matching three wins; a mixed result does not');
  assert.equal((await progress()).bananas,before.bananas+(detailed&&!before.bonusBananas?20:0));
  assert.equal((await progress()).letters,before.letters,'Minigame never fills missing letters');
  if(detailed){
    await page.waitForFunction(()=>{const s=JSON.parse(document.querySelector('#lab-panel').dataset.bonus);return s.grounded&&s.frame.startsWith('demo-cheer-');});
  }else{
    await page.waitForFunction(()=>{const s=JSON.parse(document.querySelector('#lab-panel').dataset.bonus);return s.grounded&&s.frame==='bonus-oops-1';});
    const loss=await state();assert.equal(loss.presentation.message,timedOut?'TIEMPO AGOTADO\nBUEN INTENTO!':'SIN PREMIO\nBUEN INTENTO!');
    fits(loss.presentation.messageBounds,'Two-line loss message');fits(loss.presentation.actorBounds,'Shrug, including both palms');
    for(const slot of loss.presentation.slots)fits(slot,'Stopped barrel');
    await page.locator('canvas').screenshot({path:`artifacts/final-bonus-${timedOut?'timeout':'oops'}-canvas.png`});
    await page.screenshot({path:'artifacts/final-bonus-oops-phone.png'});
    // Responsive LCD keeps the same logical safe bounds at a narrow phone size.
    await page.setViewportSize({width:320,height:568});
    await page.waitForTimeout(80);
    const narrow=await state();fits(narrow.presentation.messageBounds,'Narrow phone message');
    await page.screenshot({path:'artifacts/final-bonus-oops-320.png'});
    await page.setViewportSize({width:390,height:844});
  }
  await page.locator('canvas').screenshot({path:`artifacts/final-bonus-result${detailed?'-win':'-loss'}.png`});
  await page.waitForFunction(()=>document.querySelector('#scene-name').textContent==='DemoEndingScene');
  await page.waitForTimeout(2100);
  assert.equal(await page.locator('#ending-actions').isVisible(),false,'New celebration is not cut short by the old 2.1s menu');
  await page.locator('canvas').screenshot({path:'artifacts/final-celebration.png'});
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).track==='soundtrack/tutorial-ending');
  await page.locator('#ending-actions').waitFor({state:'visible'});
  assert.equal((await audio()).playingMusic,true,'Shared tutorial/ending theme continues behind the menu');
  if(touch){
    await page.screenshot({path:'artifacts/final-bonus-touch-ending.png'});
    await touch.send('Emulation.setTouchEmulationEnabled',{enabled:false});await touch.detach();
    await page.setViewportSize({width:1366,height:768});
  }
  console.log(`PASS final bonus: instructions wait, confirm never jumps, safe entry jump, ${timedOut?'20-second timeout without automatic selections/prize':'real jumps into all 3 barrels'}, pause/focus/audio, celebration before ending choices.`);
}
