// Focused transition regression: completed campaign and positions are seeded in
// a test-only intercepted module. This is NOT a full three-level playthrough.
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:4176';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4176','--strictPort'],{stdio:'pipe',windowsHide:true});
let browser;
try{
  let ready=false;
  for(let i=0;i<100;i++){
    try{if((await fetch(base)).ok){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,150));
  }
  assert(ready);browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
  for(const touch of [false,true]){
    const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1366,height:768},isMobile:touch,hasTouch:touch});
    try{
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/src/main.ts',async route=>{
        const response=await route.fetch();
        await route.fulfill({response,body:(await response.text())+'\nwindow.__replayTest={game,history:[]};game.events.on("berto:scene-changed",n=>window.__replayTest.history.push(n));\n'});
      });
      const click=id=>touch?page.locator(id).tap():page.locator(id).click();
      const scene=name=>page.waitForFunction(n=>document.querySelector('#scene-name').textContent===n,name);
      const confirm=()=>touch?click('#touch-a'):page.keyboard.press('KeyK');
      const progress=()=>page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.campaign));
      await page.goto(base);await click('#power-start');
      await page.waitForFunction(()=>document.querySelector('#console-shell').dataset.power==='ready');
      await page.waitForTimeout(500);
      await page.evaluate(()=>{
        const g=window.__replayTest.game,c=g.registry.get('campaign');
        for(const stage of ['jungle','ropey','reptile'])c.complete(stage,[{id:'test-banana',collected:true}]);
        c.awardFinalBonus([0,0,0]);g.registry.set('practiceDone',true);
        g.scene.stop('TitleScene');g.scene.start('DemoEndingScene');g.registry.get('controls').focus();
      });
      await scene('DemoEndingScene');await page.locator('#ending-map').waitFor({state:'visible'});
      assert.equal((await progress()).bonusBananas,20);
      await click('#ending-map');await scene('WorldMapScene');
      await page.evaluate(()=>window.__replayTest.history.length=0);
      for(const selected of [0,1,2]){
        await page.evaluate(index=>{
          const g=window.__replayTest.game,c=g.registry.get('campaign');c.selected=index;
          g.registry.set('ropey',index===1);g.registry.set('reptile',index===2);g.registry.remove('practiceStep');
          g.scene.stop('WorldMapScene');g.scene.start('JungleGreyboxScene');g.registry.get('controls').focus();
        },selected);
        await scene('JungleGreyboxScene');
        // Seed at the exit, let real fixed-step rules detect and commit it.
        await page.evaluate(()=>{
          const s=window.__replayTest.game.scene.getScene('JungleGreyboxScene'),e=s.level.exit;
          s.player.body.reset(e.x,(e.minY+e.maxY)/2);
        });
        if(selected<2){
          await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state).finished);
          const overlay=await page.locator('#movement-stats').evaluate(e=>JSON.parse(e.dataset.state).view.overlay);
          assert(overlay.join(' ').includes('VOLVER AL MAPA'),'Replay prompt says map, not ending: '+JSON.stringify(overlay));
        }else{
          await scene('MinecartScene');
          await page.evaluate(async()=>{
            const {CART,railHeight}=await import('/src/minecart.ts');
            const r=window.__replayTest.game.scene.getScene('MinecartScene').run;
            r.phase='riding';r.x=CART.exit-2;r.feet=railHeight(r.x);r.grounded=true;r.vy=0;
          });
          await page.waitForFunction(()=>JSON.parse(document.querySelector('#lab-panel').dataset.minecart).phase==='complete');
          assert((await page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.minecart).guide)).includes('VOLVER AL MAPA'));
        }
        await confirm();await scene('WorldMapScene');
        assert(!await page.locator('#ending-actions').isVisible());
        const saved=await progress();assert(saved.finished);assert.equal(saved.completed.length,3);assert.equal(saved.bonusBananas,20);
        const history=await page.evaluate(()=>window.__replayTest.history);
        assert(!history.includes('DemoEndingScene')&&!history.includes('FinalBonusScene'),'No repeated finale/extra after level '+(selected+1));
      }
      // Guard even a stale direct entry, without resetting this campaign.
      assert.equal(await page.evaluate(()=>new Promise(resolve=>{
        const g=window.__replayTest.game;g.events.once('berto:scene-changed',resolve);
        g.scene.stop('WorldMapScene');g.scene.start('DemoEndingScene');
      })),'WorldMapScene');
      await scene('WorldMapScene');assert(!await page.locator('#ending-actions').isVisible());
      // Actual new-game control/reload restores the normal first-completion flow.
      await click('#console-help');await click('#restart-game');
      await Promise.all([page.waitForEvent('load'),click('#restart-confirm')]);
      await click('#power-start');await page.waitForFunction(()=>document.querySelector('#console-shell').dataset.power==='ready');
      assert.equal((await progress()).bananas,0);assert.deepEqual((await progress()).completed,[]);
      await page.evaluate(()=>{
        const g=window.__replayTest.game,c=g.registry.get('campaign');
        for(const stage of ['jungle','ropey','reptile'])c.complete(stage,[]);
        if(c.completionScene()!=='FinalBonusScene')throw Error('Fresh campaign lost its extra');
        c.expireFinalBonus();g.scene.stop('TitleScene');g.scene.start('DemoEndingScene');g.registry.get('controls').focus();
      });
      await scene('DemoEndingScene');await page.locator('#ending-map').waitFor({state:'visible'});
      assert.deepEqual(errors,[]);
      console.log('PASS once-only ending '+(touch?'touch':'keyboard')+': first finale, keep campaign, all 3 replay exits (including mine) -> map, stale guard, new game restores finale.');
    }finally{await context.close();}
  }
}finally{await browser?.close();server.kill();}
