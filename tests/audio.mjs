import assert from 'node:assert/strict';
import { testPhase6 } from './phase6.mjs';
import {returnToMap,skipTutorial} from './support/navigation.mjs';

export async function testAudio(page) {
  page.setDefaultTimeout(12000);
  // Test-only meter at the real Web Audio output. No game/physics mutation.
  await page.addInitScript(()=>{
    const NativeContext=window.AudioContext;
    window.AudioContext=class extends NativeContext {
      constructor(...args) {
        super(...args);
        const analyser=this.createAnalyser();analyser.fftSize=2048;
        window.__audioQA={context:this,analyser};
      }
    };
    const nativeConnect=AudioNode.prototype.connect;
    AudioNode.prototype.connect=function(destination,...args) {
      const qa=window.__audioQA;
      if(qa&&destination===qa.context.destination)nativeConnect.call(this,qa.analyser);
      return nativeConnect.call(this,destination,...args);
    };
  });
  const audio=()=>page.locator('#audio-toggle').evaluate(e=>JSON.parse(e.dataset.audio));
  const waitAudio=(fn,arg)=>page.waitForFunction(fn,arg);
  const signal=()=>page.evaluate(()=>{
    const meter=window.__audioQA.analyser,pcm=new Float32Array(meter.fftSize);
    meter.getFloatTimeDomainData(pcm);return Math.sqrt(pcm.reduce((n,x)=>n+x*x,0)/pcm.length);
  });
  const audible=()=>page.waitForFunction(()=>{
    const meter=window.__audioQA.analyser,pcm=new Float32Array(meter.fftSize);
    meter.getFloatTimeDomainData(pcm);return pcm.some(x=>Math.abs(x)>.003);
  },undefined,{timeout:4000});
  await page.goto('http://127.0.0.1:4174/?adventure=1');
  await page.waitForFunction(()=>document.querySelector('#console-shell').dataset.power==='off');
  assert.equal((await audio()).state,'locked','No audio before the explicit power gesture');
  assert.equal((await audio()).music,.35,'Moderate initial music volume');
  assert.equal((await audio()).effects,.65,'Moderate initial effects volume');
  assert.equal(await page.evaluate(()=>!!window.__audioQA),false,'No audio context before a gesture');
  await page.locator('#power-start').click();
  console.log('Audio QA: first gesture');
  await waitAudio(()=>{const a=JSON.parse(document.querySelector('#audio-toggle').dataset.audio);return a.loaded&&a.state==='running';});
  await audible(); // Do not sample one instant that could be a musical rest.
  assert.equal((await audio()).track,'soundtrack/intro');
  // Inspect the actual decoded AAC, not just trim numbers in a manifest:
  // the browser must not add a recording/encoder delay before the first note.
  for(const [name,seconds] of [['intro',123.147],['map',96.375],['level',102.668],['bonus',26.42725],['tutorial-ending',62.575125]]){
    const decoded=await page.evaluate(async name=>{
      const bytes=await (await fetch(`/audio/soundtrack/${name}.m4a`)).arrayBuffer();
      const buffer=await window.__audioQA.context.decodeAudioData(bytes);
      let peak=0,first=Infinity;
      for(let c=0;c<buffer.numberOfChannels;c++){
        const pcm=buffer.getChannelData(c);
        for(let i=0;i<pcm.length;i++){
          const a=Math.abs(pcm[i]);peak=Math.max(peak,a);
          if(a>.0005)first=Math.min(first,i/buffer.sampleRate);
        }
      }
      return {duration:buffer.duration,peak,first};
    },name);
    assert(Math.abs(decoded.duration-seconds)<.05,`${name}: expected decoded duration`);
    assert(decoded.first<.02,`${name}: first captured note within 20 ms, got ${decoded.first}`);
    assert(decoded.peak>.01&&decoded.peak<.6,`${name}: nonempty signal with headroom`);
    console.log(`Audio QA decoded ${name}:`,decoded);
  }
  await page.waitForFunction(()=>document.querySelector('#console-shell').dataset.power==='ready');
  console.log('Audio QA: nonzero output');
  await page.locator('#audio-toggle').click();
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).state==='running');
  const preview=(await audio()).position;await page.waitForTimeout(220);await audible();
  assert((await audio()).position>preview,'Settings provide live music preview');
  // Change real UI, close, then test actual pause rather than just gain labels.
  await page.locator('#audio-music').fill('37');await page.locator('#audio-effects').fill('68');
  await page.locator('#audio-muted').check();await page.locator('#audio-close').click();
  await page.waitForTimeout(200);assert((await audio()).muted);
  assert.equal((await audio()).state,'suspended');
  await page.locator('#audio-toggle').click();await page.locator('#audio-muted').uncheck();
  await page.locator('#audio-close').click();
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).state==='running');
  console.log('Audio QA: volumes and mute');
  await page.keyboard.press('KeyK');
  await page.waitForFunction(()=>document.querySelector('#scene-name').textContent==='WorldMapScene');
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).track==='soundtrack/map');
  assert((await audio()).position<1,'New map theme starts at the first note, not an inherited playhead');
  await audible();
  await page.keyboard.press('KeyK'); // enter practice
  await page.waitForFunction(()=>document.querySelector('#scene-name').textContent==='StageIntroScene');
  await page.waitForTimeout(350);await page.keyboard.press('KeyK');
  await page.waitForFunction(()=>document.querySelector('#scene-name').textContent==='JungleGreyboxScene');
  // Observe the practice track before a rapid skip. The audio meter publishes
  // every ~100 ms, so otherwise an old map sample can satisfy the return wait
  // and report the PREVIOUS visit's position instead of the new start.
  await waitAudio(()=>{
    const a=JSON.parse(document.querySelector('#audio-toggle').dataset.audio);
    return a.scene==='JungleGreyboxScene'&&a.track==='soundtrack/tutorial-ending';
  });
  await audible();
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).position>.4);
  const practicePosition=(await audio()).position;
  await page.keyboard.down('KeyD');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').practice?.step===1);
  await page.keyboard.up('KeyD');await page.waitForTimeout(140);
  assert.equal((await audio()).track,'soundtrack/tutorial-ending');
  assert((await audio()).position>practicePosition,'New tutorial lesson continues the same music, not from zero');
  await page.keyboard.press('Space');
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).state==='suspended');
  const practicePaused=(await audio()).position;await page.waitForTimeout(220);
  assert(Math.abs((await audio()).position-practicePaused)<.03,'Tutorial music pauses with the lesson');
  await page.keyboard.press('Space');
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).state==='running');
  await skipTutorial(page);await returnToMap(page);
  await page.waitForFunction(()=>document.querySelector('#scene-name').textContent==='WorldMapScene');
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).track==='soundtrack/map');
  assert((await audio()).position<1,'Returning from a level restarts the map theme cleanly');
  await page.keyboard.press('KeyK'); // real Jungle
  await page.waitForFunction(()=>{const s=JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}');return s.grounded&&!s.practice;});
  console.log('Audio QA: Jungle entered');
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).track==='soundtrack/level');
  await page.keyboard.down('KeyK');await page.waitForTimeout(120);await page.keyboard.up('KeyK');
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).played.jump===1);
  await page.keyboard.press('KeyK');await page.waitForTimeout(100);
  assert.equal((await audio()).played.jump,1,'Rejected airborne K does not play jump');
  await page.keyboard.press('Space');
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).state==='suspended');
  const paused=await audio();await page.waitForTimeout(250);
  assert(Math.abs((await audio()).position-paused.position)<.03,'Pause freezes loop position');
  await page.keyboard.press('KeyK');await page.waitForTimeout(100);
  assert.deepEqual((await audio()).played,paused.played,'No effects while paused');
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).state==='running');
  // The meter refreshes every ~100 ms; wait for it rather than sampling once.
  const beforeResume=(await audio()).position;
  await waitAudio(b=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).position>b,beforeResume); // resume continues, no reset
  await page.locator('#console-help').click();await page.locator('#restart-game').click();
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).state==='suspended');
  await page.keyboard.press('Escape');
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).state==='running');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).grounded);
  // Pause right after the roll sound has really started (a fixed 60 ms delay
  // raced the next simulation step on a busy machine, also before this change).
  const rollsBefore=(await audio()).played.roll??0;
  await page.keyboard.down('KeyJ');
  await waitAudio(n=>(JSON.parse(document.querySelector('#audio-toggle').dataset.audio).played.roll??0)>n,rollsBefore);
  await page.keyboard.press('Space');await page.keyboard.up('KeyJ');
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).state==='suspended');
  assert((await audio()).voices>0,'Roll tail is frozen by pause');
  await returnToMap(page);
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).voices===0);
  await page.locator('#audio-toggle').click();
  await page.screenshot({path:'artifacts/audio-settings.png'});
  for(const size of [{width:390,height:844},{width:844,height:390}]) {
    await page.setViewportSize(size);
    const box=await page.locator('#audio-panel').boundingBox();
    assert(box.x>=0&&box.y>=0&&box.x+box.width<=size.width&&box.y+box.height<=size.height,'Settings stay inside short/narrow viewports');
  }
  await page.setViewportSize({width:1366,height:768});
  // Reload persists audio choices but still requires a fresh user gesture.
  await page.reload();await page.waitForFunction(()=>document.querySelector('#console-shell').dataset.power==='off');
  assert.equal((await audio()).music,.37);assert.equal((await audio()).effects,.68);assert.equal((await audio()).state,'locked');
  await page.locator('#power-start').click();await page.waitForFunction(()=>document.querySelector('#console-shell').dataset.power==='ready');
  await page.locator('#audio-toggle').click();await page.locator('#audio-music').fill('55');await page.locator('#audio-effects').fill('85');
  await page.locator('#audio-close').click();

  // Existing keyboard-only combat route also verifies sounds at their real events.
  await testPhase6(page);
  const done=await audio();
  for(const name of ['jump','banana','letter','hit','respawn','checkpoint','victory'])assert(done.played[name]>0,`${name} actually played on route`);
  assert.equal(done.played.victory,1,'One victory cue per finish');
  await page.waitForTimeout(1500);assert(await signal()<.001,'Summary is quiet after its completion cue');
  // The supplied level recording is currently shared by all three levels.
  for(const level of ['ropey','reptile']) {
    await page.goto(`http://127.0.0.1:4174/?level=${level}`);await page.locator('#activate-input').click();
    await waitAudio(()=>{const a=JSON.parse(document.querySelector('#audio-toggle').dataset.audio);return a.loaded&&a.state==='running';});
    await audible();
    await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).track==='soundtrack/level');
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).state==='suspended');
  }
  // A failed request is recoverable and never prevents playing.
  await page.route('**/audio/soundtrack/level.m4a',route=>route.fulfill({status:503,body:'unavailable'}));
  await page.goto('http://127.0.0.1:4174/?level=jungle');await page.locator('#activate-input').click();
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).error);
  // A mocked audio 503 can arrive before Phaser finishes loading its art. Wait
  // for the independent game startup before testing that it remains playable.
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').grounded);
  await page.keyboard.down('KeyD');await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).x>55);await page.keyboard.up('KeyD');
  await page.unroute('**/audio/soundtrack/level.m4a');
  await page.locator('#audio-toggle').click();await page.locator('#audio-close').click();
  await waitAudio(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).loaded);
  console.log('PASS audio Edge: trusted unlock, real output waveform, mute/volumes/persistence, jump edges, pause/focus/restart cancel, damage/respawn/pickups/checkpoint/victory, new map soundtrack starts from zero on entry/return + shared level theme, recoverable asset failure.');
}
