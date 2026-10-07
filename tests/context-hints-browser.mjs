// Focused presentation regression. Scene/position fixtures are injected only by
// the test; this is not a full three-level playthrough or a public game shortcut.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const port=process.env.HINT_TEST_PORT||'4177',base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',port,'--strictPort'],{stdio:'pipe',windowsHide:true});
let browser;
try{
  await mkdir('artifacts',{recursive:true});
  let ready=false;
  for(let i=0;i<100;i++){
    try{if((await fetch(base)).ok){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,150));
  }
  assert(ready);browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
  for(const size of [{width:1366,height:768},{width:390,height:844},{width:375,height:667},{width:320,height:568}]){
    const touch=size.width<1000;
    const context=await browser.newContext({viewport:size,hasTouch:touch,isMobile:touch,reducedMotion:'reduce'});
    try{
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/src/main.ts',async route=>{
        const response=await route.fetch();
        await route.fulfill({response,body:(await response.text())+'\nwindow.__hintTest={game};\n'});
      });
      const click=id=>touch?page.locator(id).tap():page.locator(id).click();
      const state=()=>page.locator('#movement-stats').evaluate(e=>JSON.parse(e.dataset.state));
      const coach=page.locator('#console-coach'),canvas=page.locator('canvas');
      const pause=()=>page.evaluate(()=>window.__hintTest.game.scene.pause('JungleGreyboxScene'));
      const start=async(stage,x=40,y=172,practice)=>{
        await page.evaluate(({stage,practice})=>{
          const g=window.__hintTest.game;
          for(const s of g.scene.getScenes(false))if(g.scene.isActive(s.scene.key)||g.scene.isPaused(s.scene.key))g.scene.stop(s.scene.key);
          g.registry.set('ropey',stage===1);g.registry.set('reptile',stage===2);
          if(practice===undefined)g.registry.remove('practiceStep');else g.registry.set('practiceStep',practice);
          g.registry.get('campaign').selected=stage;g.registry.get('controls').clear();
          g.events.emit('berto:campaign',{...g.registry.get('campaign').summary(),selected:stage,screen:'level'});
          g.scene.start('JungleGreyboxScene');g.registry.get('controls').focus();
        },{stage,practice});
        await page.waitForFunction(()=>window.__hintTest.game.scene.isActive('JungleGreyboxScene'));
        await page.evaluate(({x,y})=>window.__hintTest.game.scene.getScene('JungleGreyboxScene').player.body.reset(x,y),{x,y});
        await page.waitForFunction(x=>{
          const s=JSON.parse(document.querySelector('#movement-stats').dataset.state);
          return s.grounded&&Math.abs(s.x-x)<10;
        },x);
        await page.waitForTimeout(300);
      };
      const check=async(hint,label,targets)=>{
        await page.waitForFunction(({hint,label})=>{
          const e=document.querySelector('#console-coach');return !e.hidden&&e.dataset.hint===hint&&e.innerText===label;
        },{hint,label},{timeout:10000}).catch(async e=>{
          console.error({hint,label,coach:await coach.evaluate(e=>({hidden:e.hidden,text:e.innerText,data:{...e.dataset}})),state:await state()});
          await page.screenshot({path:'artifacts/context-hint-failure.png'});throw e;
        });
        assert(!await page.locator('.console-guide').isVisible(),'No repeated footer');
        if(hint!=='minecart')assert(!(await state()).guide.visible,'No repeated LCD instruction');
        const c=await coach.boundingBox(),lcd=await canvas.boundingBox();
        assert(c.x>=0&&c.x+c.width<=size.width&&c.y>=0,'Card within viewport');
        // The arrow may extend horizontally to the button, as in the mine.
        assert(await coach.locator('strong').evaluate(e=>e.scrollWidth<=e.clientWidth),'Sentence not clipped');
        if(touch){
          assert(c.y>=lcd.y+lcd.height+7,'Card below LCD');
          const rings=await page.locator('.coach-ring:not([hidden])').evaluateAll(es=>es.map(e=>{
            const r=e.getBoundingClientRect();return {action:e.dataset.action,x:r.x,y:r.y,width:r.width,height:r.height};
          }));
          assert.deepEqual(rings.map(r=>r.action),targets);
          for(const r of rings)assert(c.y+c.height+18<r.y,'Card and arrow clear of highlighted buttons');
          const arrow=await coach.evaluate(e=>{
            const r=e.getBoundingClientRect(),s=getComputedStyle(e,'::after');
            return {display:s.display,x:r.x+parseFloat(s.left)};
          });
          assert.equal(arrow.display,'block');
          const target=rings[0];
          assert(Math.abs(arrow.x-(target.x+target.width/2))<2,'Arrow points at actual button');
        }else{
          assert(c.y+c.height<lcd.y,'Keyboard reminder clear of LCD');
          assert.equal(await page.locator('.coach-ring:not([hidden])').count(),0);
          assert(await coach.locator('kbd').count()>0,'Keyboard uses square keycaps');
        }
        return c;
      };
      await page.goto(base);await click('#power-start');
      await page.waitForFunction(()=>document.querySelector('#console-shell').dataset.power==='ready');
      await page.waitForTimeout(1650);
      await start(2,314);await pause();
      const frame=await canvas.boundingBox();
      const tire=await check('tire',touch?'Mantén A para saltar más alto':'Mantén la tecla K para saltar más alto',['a']);
      await page.screenshot({path:'artifacts/context-tire-'+size.width+'.png'});
      await click('#console-help');await coach.waitFor({state:'hidden'});
      await click('#console-help-close');await coach.waitFor({state:'visible'});
      await page.evaluate(()=>{
        const g=window.__hintTest.game,c=g.registry.get('campaign');
        g.events.emit('berto:campaign',{...c.summary(),selected:2,screen:'minecart'});
        g.events.emit('berto:guide','SALTO: fixture');
      });
      const mine=await check('minecart',touch?'Toca el botón A para saltar':'Presiona la tecla K para saltar',['a']);
      assert(Math.abs(tire.y-mine.y)<1,'Tire and mine share the same vertical anchor');
      await page.evaluate(()=>window.__hintTest.game.events.emit('berto:guide',''));
      assert(!await coach.isVisible());
      const after=await canvas.boundingBox();
      for(const k of ['x','y','width','height'])assert(Math.abs(frame[k]-after[k])<1,'Hints never shift LCD: '+k);
      await start(2,704);await pause();assert(!await coach.isVisible(),'Later tire does not repeat first-tire lesson');

      await start(1);
      await check('vine',touch?'Mantén ↑ para agarrar la liana':'Mantén W para agarrar la liana',['up']);
      await page.keyboard.down('KeyD');
      await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).x>=132);
      await page.keyboard.up('KeyD');
      if(touch){
        const ring=await page.locator('.coach-ring[data-action="up"]').boundingBox();
        const cdp=await context.newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:ring.x+ring.width/2,y:ring.y+ring.height/2,id:1}]});
        await page.waitForFunction(()=>!!JSON.parse(document.querySelector('#movement-stats').dataset.state).rope);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
      }else await page.keyboard.press('KeyW',{delay:150});
      await page.waitForFunction(()=>!!JSON.parse(document.querySelector('#movement-stats').dataset.state).rope);
      await check('vine',touch?'↑ / ↓: trepa · A: suelta y salta':'W / S: trepa · K: suelta y salta',['a','up']);
      await page.screenshot({path:'artifacts/context-vine-'+size.width+'.png'});
      if(touch)await click('#touch-a');else await page.keyboard.press('KeyK');
      await page.waitForFunction(()=>!JSON.parse(document.querySelector('#movement-stats').dataset.state).rope);
      await start(1,270);
      assert(!await coach.isVisible(),'Vine cue ends after the first encounter');

      await start(0,36,116,8);
      await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).practice?.step===8);
      assert(!await coach.isVisible(),'Tutorial still has only its LCD instruction');
      assert((await state()).guide.visible);
      assert.deepEqual(errors,[]);
      console.log('PASS contextual hints '+size.width+'x'+size.height+': first tire, mine anchor, first vine grab/release, no duplicates, fixed framing, tutorial preserved.');
    }finally{await context.close();}
  }
}finally{await browser?.close();server.kill();}
