import assert from 'node:assert/strict';

// Native Chromium touch contacts (not synthetic key events) on the public route.
export async function testTouch(browser) {
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Fault injection: emulate native pointer end/capture notifications being
  // lost, while the independent touchend still reports that all fingers lifted.
  await page.addInitScript(()=>{
    window.__dropPointerEnds=false;
    for(const name of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(name,e=>{
      if(window.__dropPointerEnds)e.stopImmediatePropagation();
    },true);
  });
  const cdp=await context.newCDPSession(page),fingers=new Map();
  const contact=async(id,x,y)=>{
    const type=fingers.has(id)?'touchMove':'touchStart';fingers.set(id,{id,x,y,radiusX:9,radiusY:9,force:1});
    await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:[...fingers.values()]});
  };
  const up=async id=>{const released=fingers.get(id);fingers.delete(id);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:released?[released]:[]});};
  const allUp=async()=>{if(!fingers.size)return;fingers.clear();await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});};
  const point=async(selector,fx=.5,fy=.5)=>{const r=await page.locator(selector).boundingBox();assert(r);return [r.x+r.width*fx,r.y+r.height*fy];};
  const tap=async selector=>{await contact(9,...await point(selector));await up(9);};
  const state=()=>page.locator('#movement-stats').evaluate(e=>JSON.parse(e.dataset.state));
  const scene=name=>page.waitForFunction(n=>document.querySelector('#scene-name').textContent===n,name);
  const pressed=async(action,value)=>page.waitForFunction(({action,value})=>document.querySelector(`[data-action=${action}]`).dataset.pressed===String(value),{action,value},{timeout:2000});
  try {
    await page.goto('http://127.0.0.1:4174/?adventure=1&revision=touch');
    await page.waitForFunction(()=>document.querySelector('#console-shell')?.dataset.power==='off');
    assert.equal(await page.locator('#console-shell').getAttribute('data-view'),'whole','Power-on starts with the whole console');
    const wholeLCD=await page.locator('canvas').boundingBox();
    await page.screenshot({path:'artifacts/touch-power-invitation.png'});
    // The first tap on photographed A powers on only, without confirming title.
    await tap('#touch-a');
    await page.waitForFunction(()=>document.querySelector('#console-shell')?.dataset.power==='ready');
    await scene('TitleScene');
    assert.equal(await page.locator('#console-shell').getAttribute('data-view'),'controls','Phone automatically frames LCD and controls together');
    assert((await page.locator('canvas').boundingBox()).width>=wholeLCD.width*1.1,'Automatic mobile close-up enlarges LCD by at least 10%');
    assert.match(await page.locator('.console-guide').textContent(),/A para comenzar/);
    assert.equal(await page.locator('#touch-a').getAttribute('aria-pressed'),'false');
    assert.equal(await page.locator('#console-coach').getAttribute('data-target'),'a');
    assert(await page.locator('#console-coach').isHidden(),'Starting instruction lives in the LCD');
    assert(await page.locator('#console-coach small').isHidden());
    assert(await page.locator('#console-coach>span').isHidden());
    for(const size of [{width:390,height:844},{width:375,height:667},{width:320,height:568},{width:430,height:932}]){
      await page.setViewportSize(size);await page.waitForTimeout(160);
      const panel=await page.locator('#lab-panel').boundingBox();
      for(const selector of ['canvas','#touch-pad','#touch-a','#touch-b','#touch-start']){
        const b=await page.locator(selector).boundingBox();
        assert(b.x>=0&&b.y>=0&&b.x+b.width<=size.width&&b.y+b.height<=size.height,`${selector} fits ${size.width}x${size.height}`);
        assert(b.x>=panel.x&&b.y>=panel.y&&b.x+b.width<=panel.x+panel.width&&b.y+b.height<=panel.y+panel.height,`${selector} is not clipped by the camera`);
        if(selector.startsWith('#touch-')&&selector!=='#touch-pad')assert(b.width>=44&&b.height>=44,'At least 44px photo-aligned A/B/START target');
      }
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No sideways overflow');
      const ring=await page.locator('.coach-ring:not([hidden])').boundingBox(),target=await page.locator('#touch-a').boundingBox();
      assert(ring,'Button ring remains visible without external text');
      assert(Math.abs(ring.x+ring.width/2-target.x-target.width/2)<1,'Ring aligns with real A button horizontally');
      assert(Math.abs(ring.y+ring.height/2-target.y-target.height/2)<1,'Ring aligns with real A button vertically');
      assert(await page.locator('#console-coach').isHidden());
      await page.screenshot({path:`artifacts/touch-${size.width}x${size.height}.png`});
    }
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(160);
    const stableLCD=await page.locator('canvas').boundingBox();
    // START never starts. A -> map -> stage card -> ten-step tutorial.
    await contact(1,...await point('#touch-start'));await pressed('start',true);
    await page.screenshot({path:'artifacts/touch-start-pressed.png'});await up(1);await pressed('start',false);
    await scene('TitleScene');await tap('#touch-a');await scene('WorldMapScene');
    assert(await page.locator('#console-coach').isHidden());
    assert.equal(await page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.campaign).mapInstruction),'PRESIONA A: ENTRAR');
    assert(await page.locator('#console-coach small').isHidden());
    assert(await page.locator('#console-coach>span').isHidden());
    await tap('#touch-a');await scene('StageIntroScene');
    assert.equal(await page.locator('.coach-ring:not([hidden])').count(),0,'No repeated ring on Aprende jugando');
    await page.waitForFunction(()=>{const a=JSON.parse(document.querySelector('#audio-toggle').dataset.audio);return a.loaded&&a.unlocked;});
    await page.waitForTimeout(350);await tap('#touch-a');await scene('JungleGreyboxScene');
    await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).grounded);
    assert.equal((await state()).practice.step,0);assert.match((await state()).practice.instruction,/FLECHA DERECHA/);
    assert.equal(await page.locator('#console-coach').getAttribute('data-target'),'right');
    {const b=await page.locator('canvas').boundingBox();for(const k of ['x','y','width','height'])assert(Math.abs(b[k]-stableLCD[k])<1,'Touch hint never moves/scales LCD: '+k);}
    await page.screenshot({path:'artifacts/touch-practice-coach.png'});
    // Direction: slide through corners without ever activating two arrows.
    await page.evaluate(()=>{
      window.__touchTrace=[];
      for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','blur'])window.addEventListener(type,e=>{
        window.__touchTrace.push({type,id:e.pointerId,target:e.target?.id,x:e.clientX,y:e.clientY,active:document.activeElement?.id});
        if(window.__touchTrace.length>25)window.__touchTrace.shift();
      },true);
    });
    await contact(1,...await point('#touch-pad',.88,.5));await pressed('right',true);
    await contact(1,...await point('#touch-pad',.85,.25));await pressed('right',true);await pressed('up',false);
    await contact(1,...await point('#touch-pad',.6,.85));await pressed('down',true);await pressed('right',false);
    await contact(1,...await point('#touch-pad',.12,.5));await pressed('left',true);await pressed('right',false);await pressed('up',false);
    const pad=await page.locator('#touch-pad').boundingBox();await contact(1,pad.x-20,pad.y);
    await pressed('left',false);await up(1);
    // Three simultaneous fingers: direction, B/run and A/jump. Native release
    // of A must not stop the other two, and an ordinary click must not double-fire.
    // Observe the brief ascent before slow screenshots/assertions can miss it.
    await page.evaluate(()=>{
      window.__touchJumpSeen=false;
      const meter=document.querySelector('#movement-stats');
      const watch=new MutationObserver(()=>{if(JSON.parse(meter.dataset.state).vy<0){window.__touchJumpSeen=true;watch.disconnect();}});
      watch.observe(meter,{attributes:true,attributeFilter:['data-state']});
    });
    await contact(1,...await point('#touch-pad',.88,.5));
    await contact(2,...await point('#touch-b'));await contact(3,...await point('#touch-a'));
    for(const a of ['right','b','a'])await pressed(a,true);
    await page.screenshot({path:'artifacts/touch-run-jump.png'});
    await page.waitForFunction(()=>window.__touchJumpSeen);
    await up(3);await pressed('a',false);await pressed('b',true);await pressed('right',true);
    await allUp();for(const a of ['right','b','a'])await pressed(a,false);
    // Pause/resume and menu exit on the same real buttons, no keyboard needed.
    await tap('#touch-start');await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).paused);
    assert(await page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.pauseMenu).open));
    await tap('#touch-start');await page.waitForFunction(()=>!JSON.parse(document.querySelector('#movement-stats').dataset.state).paused);
    await contact(2,...await point('#touch-b'));
    await page.locator('#console-help').tap();await pressed('b',false);await allUp();
    await page.locator('#console-help-close').tap();
    // Browser cancellation and lost focus cannot leave a direction held.
    await contact(1,...await point('#touch-pad',.12,.5));await pressed('left',true);await allUp();await pressed('left',false);
    await contact(1,...await point('#touch-pad',.12,.5));
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await pressed('left',false);await allUp();
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await tap('#touch-start');await tap('#touch-up');await tap('#touch-a');await tap('#touch-a');await scene('WorldMapScene');
    // Rotation intentionally requests portrait instead of shrinking the controls.
    await contact(1,...await point('#touch-pad',.88,.5));await page.setViewportSize({width:844,height:390});
    await page.waitForFunction(()=>document.body.classList.contains('touch-landscape'));await pressed('right',false);
    assert(await page.locator('.rotate-phone').isVisible());await allUp();
    await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>!document.body.classList.contains('touch-landscape'));
    await tap('#touch-a');await scene('StageIntroScene');
    // Repeat the real tutorial from a fresh session, using only the photo's
    // native touch contacts all the way through barrel, tire and vine lessons.
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.reload();await tap('#power-start');await page.waitForFunction(()=>document.querySelector('#console-shell').dataset.power==='ready');
    assert.equal(await page.locator('#console-shell').getAttribute('data-view'),'controls');
    assert.equal(await page.locator('#console-shell').evaluate(e=>getComputedStyle(e).transitionDuration),'0s','Reduced motion retains the enlarged frame without animation');
    await tap('#touch-a');await scene('WorldMapScene');await tap('#touch-a');await scene('StageIntroScene');await page.waitForTimeout(350);await tap('#touch-a');await scene('JungleGreyboxScene');
    const until=predicate=>page.waitForFunction(predicate,undefined,{timeout:10000});
    const lesson=async n=>{
      await allUp();await page.waitForFunction(n=>{const s=JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}');return s.practice?.step===n&&s.grounded;},n);
      assert((await state()).practice.instruction.split('\n').every(t=>t.length<=21));
      assert.equal((await state()).guide.visible,true,'Instruction inside the LCD');
      assert.equal(await page.locator('.console-guide').textContent(),'','No competing instruction below the controls');
      assert.equal(await page.locator('#console-coach').textContent(),'','Rings do not carry a hidden duplicate lesson');
      assert(await page.locator('#console-coach small').isHidden());
      assert(await page.locator('#console-coach>span').isHidden());
      // Long lessons must fit small phones, not just the short title prompt.
      for(const size of ([1,4,7].includes(n)?[{width:320,height:568},{width:360,height:640},{width:430,height:932},{width:390,height:844}]:[{width:390,height:844}])){
        await page.setViewportSize(size);await page.waitForTimeout(100);
        assert(await page.locator('#console-coach').isHidden(),`Lesson ${n}: no external text at ${size.width}`);
        const lcd=await page.locator('canvas').boundingBox(),guide=(await state()).guide;
        assert(lcd.x>=0&&lcd.x+lcd.width<=size.width,'LCD fits narrow phones');
        assert(guide.visible&&guide.x>=0&&guide.x+guide.width<=160&&guide.y+guide.height<=53,'Instruction stays in the top LCD area');
        for(const ring of await page.locator('.coach-ring:not([hidden])').all()){
          const b=await ring.boundingBox();assert(b.x>=0&&b.x+b.width<=size.width&&b.y>=lcd.y+lcd.height,'Only circles outside LCD');
        }
      }
      assert.equal(await page.locator('#console-coach').getAttribute('data-target'),['right','a','b','b','a','b','right','a','up','down'][n]);
      await page.waitForFunction(n=>document.querySelectorAll('.coach-ring:not([hidden])').length===([3,4].includes(n)?2:1),n);
      if([3,4].includes(n)){
        const targets=await page.locator('.coach-ring:not([hidden])').evaluateAll(es=>es.map(e=>e.dataset.action).sort());
        assert.deepEqual(targets,[n===3?'b':'a','right']);
        assert.doesNotMatch(await page.locator('.console-guide').textContent(),/dos dedos/);
        await page.screenshot({path:`artifacts/touch-two-controls-${n}.png`});
      }
    };
    const done=()=>until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).practice?.complete);
    const hold=async(id,action)=>contact(id,...await point(`#touch-${action}`));
    const retry=async n=>{
      await allUp();
      await until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).practice?.retrying);
      assert.equal((await state()).practice.step,n);assert.equal((await state()).practice.complete,false);
      assert.match((await state()).practice.instruction,/OTRA VEZ!/);
      await page.screenshot({path:`artifacts/touch-tutorial-retry-${n}.png`});
      await page.waitForFunction(n=>{const s=JSON.parse(document.querySelector('#movement-stats').dataset.state);return s.practice?.step===n&&!s.practice.retrying&&s.grounded&&s.x<40&&s.gameplay.enemies.every(e=>e.alive);},n);
      assert.deepEqual((await state()).gameplay.kills,{stomp:0,roll:0,barrel:0});
    };
    await lesson(0);await hold(1,'right');await done();
    await lesson(1);await hold(2,'a');await done();
    await lesson(2);await hold(2,'b');await done();
    await lesson(3);await hold(1,'right');await hold(2,'b');await done();
    await lesson(4);
    await hold(1,'right');await until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).x>=86);await hold(2,'b');
    await until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).gameplay.kills.roll===1);await retry(4);
    await hold(1,'right');await until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).x>=86);
    await hold(2,'a');await until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).x>=109);await up(1);await done();
    await lesson(5);
    await hold(1,'right');await until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).x>=86);
    await hold(2,'a');await until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).x>=109);await up(1);
    await until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).gameplay.kills.stomp===1);await retry(5);
    await hold(1,'right');await until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).x>=86);await hold(2,'b');await done();
    await lesson(6);
    assert.match((await state()).guide.text,/ACERCATE AL BARRIL/);
    await page.screenshot({path:'artifacts/touch-barrel-approach.png'});
    await hold(1,'right');await until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).x>=47);await up(1);
    assert.match((await state()).guide.text,/MANTEN EL BOTON B/);
    await page.screenshot({path:'artifacts/touch-barrel-grab.png'});
    await hold(2,'b');await until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).gameplay.carrying);
    assert.match((await state()).guide.text,/SUELTA EL BOTON B/);
    await page.screenshot({path:'artifacts/touch-barrel-throw.png'});
    await up(2);await done();
    await lesson(7);await hold(1,'right');await until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).x>=54);
    await hold(2,'a');await until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).x>=86);await up(1);await done();
    await lesson(8);await hold(1,'right');await until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).x>=87);await up(1);
    await hold(1,'up');await until(()=>{const s=JSON.parse(document.querySelector('#movement-stats').dataset.state);return s.rope&&s.y<=84;});await up(1);
    assert.match((await state()).practice.instruction,/TOCA A: SUELTA/);
    assert.equal(await page.locator('#console-coach').getAttribute('data-target'),'a');
    await page.screenshot({path:'artifacts/touch-vine.png'});
    await hold(2,'a');await done();await allUp();
    await lesson(9);assert.equal(await page.locator('#console-coach').getAttribute('data-target'),'down');
    await page.screenshot({path:'artifacts/touch-drop-coach.png'});
    await hold(1,'down');await done();await allUp();await scene('StageIntroScene');
    assert.equal(await page.locator('.console-guide').textContent(),'','No duplicate instructions outside the stage card');
    await scene('JungleGreyboxScene');
    assert.equal(await page.locator('#lab-panel').evaluate(el=>JSON.parse(el.dataset.campaign).completed.length),0,'Tutorial never completes a real stage');
    await until(()=>{const s=JSON.parse(document.querySelector('#movement-stats').dataset.state);return !s.practice&&s.grounded;});
    // Reported level-1 case: two fingers on right/down. Only the last direction
    // wins; both release orders leave no stuck arrow, and the game keeps ticking.
    for(const firstUp of [1,2]){
      await hold(1,'right');await pressed('right',true);
      await hold(2,'down');await pressed('down',true);await pressed('right',false);
      await page.screenshot({path:'artifacts/touch-one-direction.png'});
      await up(firstUp);await pressed(firstUp===1?'down':'right',true);
      await up(firstUp===1?2:1);
      for(const a of ['up','down','left','right'])await pressed(a,false);
    }
    // A+B remain available with one selected direction even if a second arrow
    // is touched; releasing the newer arrow restores the still-held older one.
    await hold(1,'right');await hold(2,'down');await hold(3,'b');await hold(4,'a');
    for(const a of ['down','a','b'])await pressed(a,true);await pressed('right',false);
    await up(2);await pressed('right',true);await pressed('down',false);
    await up(4);await pressed('b',true);await pressed('a',false);await up(3);await up(1);
    // Safety fallback is exercised with real touchend, not synthetic key input.
    await hold(1,'left');await pressed('left',true);
    await page.evaluate(()=>{window.__dropPointerEnds=true;});await up(1);
    await pressed('left',false);await page.evaluate(()=>{window.__dropPointerEnds=false;});
    await until(()=>{const s=JSON.parse(document.querySelector('#movement-stats').dataset.state);return s.grounded&&Math.abs(s.vx)<.01;});
    const released=await state();
    await page.waitForFunction(time=>JSON.parse(document.querySelector('#movement-stats').dataset.state).simTime>time+150,released.simTime);
    assert(Math.abs((await state()).x-released.x)<.1,'All fingers lifted leaves DK stopped, simulation still running');
    await tap('#touch-start');await until(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).paused);
    await tap('#touch-start');await until(()=>!JSON.parse(document.querySelector('#movement-stats').dataset.state).paused);
    await tap('#touch-start');await tap('#touch-up');await tap('#touch-a');await tap('#touch-a');await scene('WorldMapScene');
    assert.deepEqual(errors,[]);
    console.log('PASS touch: four portrait sizes, four-way drag, single direction with multiple fingers, A+B+direction, release orders, lost-pointer-end fallback, pause/map after level-1 case, rotation, all ten lessons with retries/drop coaching, no runtime errors.');
  } catch(error) {
    console.log('Touch failure:',await page.evaluate(()=>({trace:window.__touchTrace,state:document.querySelector('#movement-stats').dataset.state})));
    await page.screenshot({path:'artifacts/touch-failure.png'});throw error;
  } finally {await context.close();}
}
