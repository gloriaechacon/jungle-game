import assert from 'node:assert/strict';

// Native touch + real PCM output in Edge, with a stricter gesture/interruption
// fixture. This tests our recovery path, NOT an iPhone's hardware mute switch.
export async function testAudioMobile(browser){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const qa=window.__mobileAudio={released:false,interrupted:false,types:[],resumes:0};
    let type='auto';
    Object.defineProperty(navigator,'audioSession',{configurable:true,value:{
      get type(){return type;},set type(v){type=v;qa.types.push(v);}
    }});
    for(const name of ['pointerup','touchend'])window.addEventListener(name,e=>{if(e.isTrusted)qa.released=true;},{capture:true});
    const NativeContext=window.AudioContext;
    window.AudioContext=class extends NativeContext {
      constructor(...args){super(...args);qa.context=this;qa.analyser=this.createAnalyser();qa.analyser.fftSize=2048;}
      get state(){return qa.interrupted?'interrupted':super.state;}
      resume(){
        qa.resumes++;
        if(!qa.released)return Promise.reject(new DOMException('Touch release required','NotAllowedError'));
        qa.interrupted=false;return super.resume();
      }
    };
    const connect=AudioNode.prototype.connect;
    AudioNode.prototype.connect=function(destination,...args){
      if(qa.context&&destination===qa.context.destination)connect.call(this,qa.analyser);
      return connect.call(this,destination,...args);
    };
  });
  const audio=()=>page.locator('#audio-toggle').evaluate(e=>JSON.parse(e.dataset.audio));
  const running=()=>page.waitForFunction(()=>{const a=JSON.parse(document.querySelector('#audio-toggle').dataset.audio);return a.loaded&&a.unlocked&&a.state==='running';});
  const audible=()=>page.waitForFunction(()=>{
    const a=window.__mobileAudio.analyser,pcm=new Float32Array(a.fftSize);a.getFloatTimeDomainData(pcm);
    return pcm.some(x=>Math.abs(x)>.003);
  });
  try{
    await page.goto('http://127.0.0.1:4174/?adventure=1');
    await page.waitForFunction(()=>document.querySelector('#console-shell')?.dataset.power==='off');
    assert.deepEqual(await page.evaluate(()=>window.__mobileAudio.types),[],'No media session before consent');
    assert.equal((await audio()).state,'locked');
    const cdp=await context.newCDPSession(page),box=await page.locator('#power-start').boundingBox();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:box.x+box.width/2,y:box.y+box.height/2}]});
    await page.waitForTimeout(120);
    assert.equal((await audio()).unlocked,false,'Fixture blocks down-only unlock');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await running();await audible();
    assert.equal((await audio()).mediaSession,true);
    assert.deepEqual(await page.evaluate(()=>window.__mobileAudio.types),['playback'],'Media route requested once, not every animation frame');
    await page.waitForFunction(()=>document.querySelector('#console-shell').dataset.power==='ready');
    // A phone interruption that cannot resume until another real touch.
    await page.evaluate(async()=>{
      const qa=window.__mobileAudio;await qa.context.suspend();qa.interrupted=true;qa.released=false;
    });
    await page.waitForFunction(()=>!JSON.parse(document.querySelector('#audio-toggle').dataset.audio).unlocked);
    const attempts=await page.evaluate(()=>window.__mobileAudio.resumes);await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>window.__mobileAudio.resumes),attempts,'No busy resume loop during interruption');
    await page.locator('#touch-a').tap();await running();await audible();
    await page.locator('#quick-mute').tap();
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#audio-toggle').dataset.audio).state==='suspended');
    assert.equal((await audio()).muted,true,'Game mute still wins over multimedia routing');
    await page.locator('#quick-mute').tap();await running();await audible();
    await page.locator('#audio-toggle').tap();
    await page.locator('#audio-music').fill('24');await page.locator('#audio-effects').fill('42');
    await running();await audible(); // Live preview, without unpausing gameplay.
    assert.match(await page.locator('#audio-panel').innerText(),/modo Silencio/);
    await page.screenshot({path:'artifacts/audio-mobile-help.png'});
    await page.locator('#audio-close').tap();await running();await audible();
    assert.equal((await audio()).music,.24);assert.equal((await audio()).effects,.42);
    await page.locator('#quick-mute').tap();await page.reload();
    await page.waitForFunction(()=>document.querySelector('#console-shell')?.dataset.power==='off');
    await page.locator('#power-start').tap();await page.waitForTimeout(300);
    assert.equal((await audio()).state,'locked','Persisted mute does not create a context');
    assert.deepEqual(await page.evaluate(()=>window.__mobileAudio.types),[],'Persisted mute does not claim the media route');
    assert.deepEqual(errors,[]);
    console.log('PASS mobile audio: trusted release unlock, playback feature detection, actual PCM, interrupted recovery without spin, mute/volumes/persistence. Hardware silent switch requires iPhone playtest.');
  }finally{await context.close();}
}
