import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { installBot } from './support/bot.mjs';
import { focusGame, restartStage } from './support/navigation.mjs';

export async function testPhase7(page, inAdventure = false) {
  page.on('console',m=>{if(m.text().startsWith('ROPEY:'))console.log(m.text());});
  await page.setViewportSize({width:1366,height:768});
  if (!inAdventure) await page.goto('http://127.0.0.1:4174/?level=ropey');
  if(!await page.evaluate(()=>typeof window.__captureTerrace==='function'))
    await page.exposeFunction('__captureTerrace',async(name='summit')=>{
      const help=await page.locator('#console-help-close').isVisible();
      if(help)await page.locator('#console-help-close').click();
      await page.locator('canvas').screenshot({path:name==='exit'?'artifacts/ropey-new-entrance.png':name.startsWith('wall-')?`artifacts/ropey-retos-${name}.png`:name.startsWith('bee-')?`artifacts/ropey-${name}.png`:name==='barrel'?'artifacts/terrain-ropey-barrel.png':'artifacts/terrain-ropey-summit.png'});
      if(help)await focusGame(page);
      return true;
    });
  await focusGame(page);
  const state=()=>page.locator('#movement-stats').evaluate(el=>JSON.parse(el.dataset.state));
  const shot=name=>page.screenshot({path:fileURLToPath(new URL(`../artifacts/phase-7-${name}.png`,import.meta.url))});
  await page.waitForFunction(()=>JSON.parse(document.getElementById('movement-stats').dataset.state||'{}').grounded);
  assert.equal((await state()).ropes.length,4);
  assert.equal((await state()).view.landmarks.exit,'night-entrance');
  assert.equal((await state()).view.landmarks.exitX,2300,'Doorway aligned to the finish, not beyond it');
  await shot('start');
  await installBot(page);
  await page.evaluate(async()=>{const b=window.__bot;b.down('KeyD');await b.until(s=>s.x>=137,'practice');await b.stop();b.down('KeyW');await b.until(s=>s.rope==='practice','grab');b.up('KeyW');});
  const attached=await state();assert.equal(attached.rope,'practice');
  assert.match(attached.view.dkFrame,/^dk-climb-[0-3]$/,'Dedicated side-on rope pose');
  await page.keyboard.press('Space');await page.waitForTimeout(100);
  const paused=await state();await page.waitForTimeout(300);
  assert.equal((await state()).simTime,paused.simTime);assert.deepEqual((await state()).ropes,paused.ropes);
  assert.equal((await state()).view.dkFrame,paused.view.dkFrame,'Pause freezes the climbing hands');
  await page.keyboard.press('KeyK');assert.equal((await state()).rope,'practice');
  await shot('rope-paused');if(!inAdventure)await page.keyboard.press('Space');
  await page.evaluate(async()=>{const b=window.__bot;b.down('KeyW');await b.until(s=>s.y<=116,'climb');b.up('KeyW');});
  const climbed=await state();
  assert(climbed.cameraY<=attached.cameraY && 180-climbed.cameraY<=132 && climbed.y+8-32-climbed.cameraY>=0,
    'Landing-first camera keeps DK and floor visible throughout the climb');
  await shot('climb');
  await page.locator('#quick-mute').focus();await page.waitForTimeout(100);
  const blur=await state();await page.waitForTimeout(250);assert.equal((await state()).simTime,blur.simTime);
  await focusGame(page);
  await page.keyboard.down('KeyK');await page.waitForFunction(()=>!JSON.parse(document.getElementById('movement-stats').dataset.state).rope);
  assert((await state()).vy<0,'K releases upward');
  // Full-height release, not a tap: sample every rendered frame until landing.
  await page.evaluate(async()=>{
    const b=window.__bot,start=b.S().simTime;let airborne=false;
    await new Promise((resolve,reject)=>{
      const tick=()=>{
        const s=b.S();
        if(s.simTime-start>2500)return reject(new Error('Release did not land'));
        if(180-s.cameraY>132.01)return reject(new Error('Landing floor hidden'));
        if(s.view.dkFeet-32-s.cameraY < -1 || s.view.dkFeet-s.cameraY>144)return reject(new Error('DK outside frame'));
        airborne ||= !s.grounded;
        if(airborne&&s.grounded)return resolve();
        requestAnimationFrame(tick);
      };tick();
    });
  });
  await shot('rope-landing-visible');
  await page.keyboard.up('KeyK');
  await page.keyboard.down('KeyW');
  await page.waitForFunction(()=>JSON.parse(document.getElementById('movement-stats').dataset.state).rope==='practice');
  await page.keyboard.up('KeyW');
  // Phase 8 review: jumping INTO the swinging rope grabs it without W (as in the
  // original), and hanging at its lowest point never drops DK into the pit.
  await installBot(page);
  const crossing=await page.evaluate(async()=>{
    const b=window.__bot;b.down('KeyK');await new Promise(r=>setTimeout(r,40));b.up('KeyK');
    await b.until(s=>s.grounded&&!s.rope,'off practice');
    b.down('KeyD');await b.until(s=>s.x>=290,'to ledge');await b.stop();
    let prev=b.S().ropes[1].x;
    await b.until(s=>{const x=s.ropes[1].x,ok=x<345&&x<prev;prev=x;return ok;},'rope approaching',8000);
    b.down('KeyD');b.down('KeyK');
    const s=await b.until(s=>s.rope||s.y>200,'grab',4000);
    b.up('KeyD');b.up('KeyK');
    if(s.rope!=='crossing-1')throw new Error('Jump into the moving rope did not grab it '+JSON.stringify({x:s.x,y:s.y}));
    b.down('KeyS');await new Promise(r=>setTimeout(r,800));b.up('KeyS');
    const t0=b.S().simTime,deaths=b.S().gameplay.deaths;
    await b.until(s=>s.simTime-t0>3300,'full swing at the bottom',8000);
    const e=b.S();
    if(e.rope!=='crossing-1'||e.gameplay.deaths!==deaths)throw new Error('Hanging at the bottom lost the rope '+JSON.stringify({rope:e.rope,y:e.y}));
    return e.y;
  });
  assert.equal(crossing,140,'Hanging at the lowest hand-hold of the swinging rope');
  await restartStage(page);
  await page.waitForFunction(()=>{const s=JSON.parse(document.getElementById('movement-stats').dataset.state);return !s.rope&&s.x===40&&s.grounded;});
  await installBot(page);
  const start=(await state()).simTime;
  // Keyboard-only full route. No teleport, internal scene access or test hooks.
  await page.evaluate(async()=>{
    const b=window.__bot, t0=performance.now(), seen=new Set(),wallsChecked=new Set();const prevRope=[];let jumpUntil=0, lastDeaths=0, falling=false, fallChecked=false, beforeFall=0, beforeLetters='', lastLog=0, secondFall=false, secondChecked=false, returnX=650, pitStop=770,climbChecked=false,barrelChecked=false,exitChecked=false;
    async function moveTo(x){
      const right=b.S().x<x,key=right?'KeyD':'KeyA';b.down(key);
      await b.until(s=>right?s.x>=x:s.x<=x,'align terrace '+x,4000);await b.stop();
    }
    async function upTo(feet,x){
      const right=b.S().x<x,key=right?'KeyD':'KeyA';b.down('KeyK');b.down(key);
      await b.until(s=>{
        if(right?s.x>=x:s.x<=x)b.up(key);
        return s.grounded&&Math.abs(s.y+8-feet)<1;
      },'climb terrace '+feet,4000);b.up('KeyK');await b.stop();
    }
    let returnClimbChecked=false;
    for(;;){
      const s=b.S();if(s.finished)break;
      if(performance.now()-lastLog>10000){lastLog=performance.now();console.log('ROPEY: '+JSON.stringify({x:s.x,y:s.y,rope:s.rope,g:s.grounded,d:s.gameplay.deaths,falling}));}
      if(performance.now()-t0>150000)throw new Error('Ropey route timeout '+JSON.stringify(s));
      if(s.gameplay.deaths>8)throw new Error('Too many route retries '+JSON.stringify(s));
      if(!exitChecked&&s.x>2268&&s.x<2290&&s.grounded){
        await b.stop();b.up('KeyW');jumpUntil=0;
        await window.__captureTerrace('exit');exitChecked=true;continue;
      }
      const wall=[888,1300,1660,1940].find(x=>!wallsChecked.has(x)&&s.x>x-40&&s.x<x&&s.grounded&&s.y===172&&!s.gameplay.dying);
      if(wall!==undefined){
        await b.stop();b.up('KeyW');jumpUntil=0;
        b.down('KeyD');await b.until(s=>s.x===wall-6&&s.grounded,'walk stops at solid '+wall,4000);
        const started=b.S().simTime;await b.until(s=>s.simTime>started+250,'hold right at wall '+wall,2000);
        if(b.S().x!==wall-6||b.S().finished)throw new Error('Walking bypassed solid '+wall);
        b.down('KeyK');await b.until(s=>s.x>=wall+12,'jump over face '+wall,4000);b.up('KeyD');
        await b.until(s=>s.grounded&&s.y===148,'land on first 24px step '+wall,4000);b.up('KeyK');await b.stop();
        b.down('KeyS');const dropAt=b.S().simTime;await b.until(s=>s.simTime>dropAt+200,'S on solid '+wall,2000);b.up('KeyS');
        if(b.S().y!==148)throw new Error('S bypassed solid '+wall);
        await window.__captureTerrace('wall-'+wall);
        if(wall===888&&b.S().gameplay.enemies[1].alive){
          // Stomp from the first step, where the enemy's back is in jump reach.
          // Returning from the low floor later should not blindly hit its side.
          await moveTo(908);await upTo(140,944);
          if(b.S().gameplay.enemies[1].alive)throw new Error('Faster wall patrol must remain stompable');
        }
        wallsChecked.add(wall);continue;
      }
      if(!climbChecked&&s.x>=1320&&s.x<1380&&s.grounded){
        await b.stop();b.up('KeyW');b.up('KeyK');jumpUntil=0;
        // The former walk-through base now has two real 24px rises.
        if(b.S().y+8>132){await moveTo(1320);await upTo(132,1352);}
        else await moveTo(1352);
        await upTo(108,1352);await moveTo(1368);await upTo(76,1410);
        await moveTo(1426);await upTo(44,1464);await moveTo(1454);await upTo(12,1412);
        const high=b.S();
        if(high.gameplay.letters[3]!=='U')throw new Error('U from the earlier bee ledge must remain collected');
        if(high.cameraY>=0||high.y!==4||!high.gameplay.bunches.at(-1).collected)throw new Error('High route/camera/reward failed '+JSON.stringify(high));
        await window.__captureTerrace();
        // Capturing closes/reopens help and restores focus. Wait for fresh
        // grounded physics frames before sending the one-shot Down action.
        const resumed=b.S().simTime;
        await b.until(s=>!s.paused&&s.grounded&&s.simTime>resumed+80,'grounded after screenshot');
        b.down('KeyS');await b.until(s=>s.grounded&&s.y===68,'drop exactly one terrace',4000);
        await new Promise(r=>setTimeout(r,300));
        if(b.S().y!==68)throw new Error('Held S skipped the lower terrace');
        b.up('KeyS');climbChecked=true;continue;
      }
      if(!returnClimbChecked&&s.x>=978&&s.x<1100&&s.grounded&&s.y===172&&!s.gameplay.dying){
        await b.stop();b.up('KeyW');jumpUntil=0;
        await moveTo(980);
        const deaths=b.S().gameplay.deaths;
        await upTo(140,944);
        if(b.S().gameplay.deaths!==deaths)throw new Error('Return jump should not need a respawn');
        await window.__captureTerrace('wall-return');
        // The U now invites the player onto the first bee's banana ledge.
        // Wait for the patrol to leave an opening, then climb using normal input.
        // The return jump can land on the near edge before reaching its target.
        // Walk left, then right, so the directional camera really looks ahead.
        await moveTo(936);await moveTo(950);
        await b.until(s=>s.cameraX>880,'look ahead toward the bee reward',4000);
        const waiting=b.S(),u=waiting.gameplay.pickups.find(p=>p.id==='U');
        if(u.collected||u.x-waiting.cameraX<8||u.x-waiting.cameraX>152||u.y-waiting.cameraY<10||u.y-waiting.cameraY>134)
          throw new Error('U must be visible from the wall before committing to the bee ledge '+JSON.stringify({u,cx:waiting.cameraX,cy:waiting.cameraY}));
        await window.__captureTerrace('bee-u-visible');
        await b.until(s=>s.gameplay.enemies.some(e=>e.kind==='bee'&&e.alive&&e.x>=1050&&e.x<1084&&e.direction>0),'bee opens a safe climbing window',14000);
        await upTo(108,978);await moveTo(1020);
        const collected=b.S();
        if(collected.gameplay.letters[3]!=='U'||collected.gameplay.deaths!==deaths||collected.gameplay.dying)
          throw new Error('U must be collectible on the bee ledge without taking damage');
        if(!collected.gameplay.enemies.some(e=>e.kind==='bee'&&e.alive&&e.x<1100))throw new Error('Climb must work with the bee still alive');
        await window.__captureTerrace('bee-u-collected');
        returnClimbChecked=true;continue;
      }
      if(!barrelChecked&&s.x>2114&&s.x<2174&&s.grounded){
        await b.stop();b.up('KeyW');b.up('KeyK');jumpUntil=0;
        await moveTo(2130);if(b.S().y>132)await upTo(140,2130);
        const barrel=b.S().gameplay.barrels[3];
        if(barrel.y!==132||barrel.state!=='ready')throw new Error('Final barrel must rest on shelf140');
        await window.__captureTerrace('barrel');
        await moveTo(2144);b.down('KeyJ');await b.until(s=>s.gameplay.carrying,'pick up supported final barrel');
        b.up('KeyJ');await b.until(s=>!s.gameplay.carrying,'throw final barrel');barrelChecked=true;
        continue;
      }
      if(!fallChecked && !falling && s.gameplay.checkpoint && s.x>708 && s.x<738){falling=true;beforeFall=s.gameplay.deaths;beforeLetters=s.gameplay.letters;}
      if(fallChecked&&!secondChecked&&!falling&&s.gameplay.checkpointIndex===1&&s.x>1768&&s.x<1798){falling=true;secondFall=true;returnX=1560;pitStop=1830;beforeFall=s.gameplay.deaths;beforeLetters=s.gameplay.letters;}
      if(falling){
        b.up('KeyW');b.up('KeyK');jumpUntil=0;
        if(s.gameplay.deaths>beforeFall){
          if(Math.abs(s.x-returnX)>12 || s.gameplay.letters!==beforeLetters)throw new Error('Checkpoint fall did not preserve letters / position');
          if(secondFall)secondChecked=true;
          falling=false;fallChecked=true;
        }else{
          if(s.x<pitStop){b.down('KeyD');b.down('KeyJ');}else{b.up('KeyD');b.up('KeyJ');}
          await new Promise(r=>setTimeout(r,4));continue;
        }
      }
      if(s.gameplay.deaths!==lastDeaths){lastDeaths=s.gameplay.deaths;jumpUntil=0;b.up('KeyK');}
      if(s.rope){
        seen.add(s.rope);
        b.up('KeyD');b.up('KeyJ');b.up('KeyK');jumpUntil=0;
        if(s.y>122)b.down('KeyW');else b.up('KeyW');
        const target=s.rope==='crossing-1'?365:s.rope==='crossing-2'?795:1845;
        if(s.y<=125 && s.x>=target){b.up('KeyW');b.down('KeyD');b.down('KeyJ');b.down('KeyK');jumpUntil=s.simTime+450;}
      }else{
        // Phase 8 review: like a player, wait at the ledge until the swinging rope
        // comes back towards DK, then walk off and jump into it (fewer blind retries).
        const edge=!jumpUntil&&s.grounded?[[320,1],[740,2],[1800,3]].find(([e])=>s.x>e-32&&s.x<e-4):undefined;
        if(edge){
          const rx=s.ropes[edge[1]].x, approaching=rx<(prevRope[edge[1]]??Infinity);prevRope[edge[1]]=rx;
          if(!(approaching&&rx<edge[0]+25)){b.up('KeyD');b.up('KeyJ');b.up('KeyK');await new Promise(r=>setTimeout(r,4));continue;}
          b.up('KeyJ');b.up('KeyW');b.down('KeyD');b.down('KeyK');jumpUntil=s.simTime+450;
          await new Promise(r=>setTimeout(r,4));continue;
        }
        b.down('KeyD');b.down('KeyJ');
        // Four-way controls: travel horizontally in the air. Rope contact grabs
        // automatically; Up is only needed when climbing or grabbing on ground.
        b.up('KeyW');
        if(jumpUntil && s.simTime>=jumpUntil){b.up('KeyK');jumpUntil=0;}
        // Jump actual solid steps/gaps; high shelves remain optional routes.
        const obstacle=[320,400,740,888,924,1160,1300,1332,1660,1800,1940,1972].find(x=>x>s.x+5);
        const enemy=s.gameplay.enemies.some(e=>e.alive&&e.kind!=='bee'&&Math.abs(e.y-s.y)<26&&e.x>s.x&&e.x-s.x<(e.kind==='lizard'?50:30));
        if(!jumpUntil&&s.grounded&&((obstacle!==undefined&&obstacle-s.x<25)||enemy)){b.down('KeyK');jumpUntil=s.simTime+430;}
      }
      await new Promise(r=>setTimeout(r,4));
    }
    for(const key of [...b.held])b.up(key);
    if(!fallChecked)throw new Error('Checkpoint fall was not exercised');
    if(!secondChecked)throw new Error('Second checkpoint return was not exercised');
    if(!climbChecked)throw new Error('High optional climb was not exercised');
    if(!returnClimbChecked)throw new Error('Return from below the first banana tower was not exercised');
    if(!barrelChecked)throw new Error('Supported final barrel pickup was not exercised');
    if(!exitChecked)throw new Error('New exit approach was not exercised');
    // The faster lizard can require a jump that carries DK over face1300;
    // that base is still exercised by the mandatory high-route climb above.
    // The three other approaches remain direct walk-into-wall checks.
    if(![888,1660,1940].every(x=>wallsChecked.has(x)))throw new Error('Walk-only blocking not checked at the direct wall approaches: '+[...wallsChecked]);
    if(!['crossing-1','crossing-2','crossing-3'].every(id=>seen.has(id)))throw new Error('All three moving ropes must be used: '+[...seen]);
  });
  const done=await state();assert(done.finished&&done.gameplay.checkpoint);assert.equal(done.gameplay.letters,'--NU-');
  await shot('finish');if(!inAdventure)await page.keyboard.press('Space');await page.waitForTimeout(200);
  assert.equal((await state()).simTime,done.simTime);
  if (inAdventure) return;
  await page.locator('#restart-lab').click();await page.waitForTimeout(150);
  const fresh=await state();assert(!fresh.finished&&!fresh.rope&&!fresh.gameplay.checkpoint);assert.equal(fresh.gameplay.letters,'-----');
  console.log(`PASS phase 7 browser: rope, climb, camera, jump-in grab without W, full swing hanging at the bottom, pause/focus/release, keyboard route, N/U, checkpoint, exit/restart. ${(done.simTime-start)/1000}s; ${done.gameplay.deaths} retries.`);
}
