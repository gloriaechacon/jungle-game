import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

export async function testPanels(browser) {
  await mkdir('artifacts',{recursive:true});
  for (const mobile of [true,false]) {
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:768},isMobile:mobile,hasTouch:mobile});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const press=async selector=>mobile?await page.locator(selector).tap():await page.locator(selector).click();
    const requestRestart=async()=>{if(!await page.locator('#restart-game').isVisible())await press('#console-help');await press('#restart-game');};
    const ready=async()=>{await press('#power-start');await page.waitForFunction(()=>document.querySelector('#console-shell')?.dataset.power==='ready');};
    const scene=name=>page.waitForFunction(n=>document.querySelector('#scene-name').textContent===n,name);
    const audio=()=>page.locator('#audio-toggle').evaluate(e=>JSON.parse(e.dataset.audio));
    const fits=async(selector,close,size)=>{
      const box=await page.locator(selector).boundingBox(),x=await page.locator(close).boundingBox();
      assert(box&&x);
      assert(Math.abs(box.x+box.width/2-size.width/2)<1,`${selector} centered horizontally`);
      assert(Math.abs(box.y+box.height/2-size.height/2)<1,`${selector} centered vertically`);
      assert(box.x>=15&&box.y>=15&&box.x+box.width<=size.width-15&&box.y+box.height<=size.height-15,`${selector} fits ${size.width}x${size.height}`);
      assert(x.width>=44&&x.height>=44,'Close target at least 44px');
      assert(x.y>=box.y&&x.y+x.height<=box.y+box.height,'X visible inside panel');
      assert(await page.locator(selector).evaluate(e=>e.scrollWidth<=e.clientWidth),'No sideways panel overflow');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Toolbar/icons do not overflow the viewport');
      const style=await page.locator(selector).evaluate(e=>{const s=getComputedStyle(e),w=getComputedStyle(document.querySelector('#power-start'));return {ink:s.color,font:s.fontFamily,bg:s.backgroundColor,welcomeInk:w.color,welcomeFont:w.fontFamily,welcomeBg:w.backgroundColor};});
      assert.equal(style.ink,style.welcomeInk,'Same ink as the approved invitation');
      assert.equal(style.font,style.welcomeFont,'Same font as the approved invitation');
      assert.equal(style.bg,style.welcomeBg,'Same soft surface as the approved invitation');
      await page.locator(close).click({trial:true});
    };
    try {
      await page.goto('http://127.0.0.1:4174/?adventure=1&revision=panels-1');await ready();
      // Reach a real stage so Escape must close a panel, not abandon gameplay.
      if(mobile)await press('#touch-a');else{await press('#lab-panel');await page.keyboard.press('KeyK');}
      await scene('WorldMapScene');
      if(mobile)await press('#touch-a');else await page.keyboard.press('KeyK');
      await scene('StageIntroScene');await page.waitForTimeout(350);
      if(mobile)await press('#touch-a');else await page.keyboard.press('KeyK');
      await scene('JungleGreyboxScene');
      await press('#console-help');
      assert.equal(await page.locator('#console-help').getAttribute('aria-expanded'),'true');
      assert.equal(await page.locator('#audio-panel').isVisible(),false);
      const text=await page.locator('#controls-panel').innerText();
      assert.doesNotMatch(text,/Caminá|Corré|Saltá|Podés|Tocá|LAPTOP|Paso \d/,'Concise, neutral Spanish, no diagnostic duplication');
      assert.match(text,mobile?/Toca los botones de la consola/:/Usa las teclas de tu teclado/);
      assert.match(text,mobile?/Toca el botón A/:/Presiona la tecla K/);
      assert.equal(await page.locator('#activate-input').isVisible(),false);
      const labels=await page.locator('.help-summary dt').evaluateAll(es=>es.map(e=>{
        const child=[...e.children].find(c=>getComputedStyle(c).display!=='none');
        return parseFloat(getComputedStyle(child||e).fontSize);
      }));
      assert(labels.every(n=>n>=13),'Key labels remain readable, not legacy 10px spans');
      for(const size of mobile?[{width:390,height:844},{width:375,height:667},{width:320,height:568}]:[{width:1366,height:768},{width:844,height:390}]){
        await page.setViewportSize(size);await fits('#controls-panel','#console-help-close',size);
        await page.locator('#controls-panel').evaluate(e=>e.scrollTop=e.scrollHeight);
        await page.locator('#console-help-close').click({trial:true});
        await page.locator('#controls-panel').evaluate(e=>e.scrollTop=0);
        await page.screenshot({path:`artifacts/ui-help-${size.width}x${size.height}.png`});
      }
      const normal=mobile?{width:390,height:844}:{width:1366,height:768};await page.setViewportSize(normal);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#controls-panel').isVisible(),false);
      await scene('JungleGreyboxScene');
      await press('#console-help');await press('#console-help-close');
      assert.equal(await page.locator('#console-help').getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('#input-status').getAttribute('data-active'),'true','Closing returns game input');
      await press('#console-help');await press('#console-help-close');await press('#audio-toggle');
      assert.equal(await page.locator('#controls-panel').isVisible(),false,'Only one panel at a time');
      assert.equal(await page.locator('#audio-panel').isVisible(),true);
      assert.doesNotMatch(await page.locator('#audio-panel').innerText(),/Guardar y volver/);
      assert.match(await page.locator('#audio-save-note').innerText(),/automáticamente/);
      await page.locator('#audio-music').fill('29');await page.locator('#audio-effects').fill('61');
      await page.locator('#audio-muted').check();
      await page.waitForFunction(()=>{const a=JSON.parse(document.querySelector('#audio-toggle').dataset.audio);return a.music===.29&&a.effects===.61&&a.muted;});
      assert.equal((await audio()).effects,.61);assert.equal((await audio()).muted,true);
      await press('#audio-toggle');assert.equal(await page.locator('#audio-panel').isVisible(),false,'Sound toggle closes without save');
      await press('#audio-toggle');
      assert.equal(await page.locator('#audio-music').inputValue(),'29');
      for(const size of mobile?[{width:390,height:844},{width:375,height:667},{width:320,height:568}]:[{width:1366,height:768},{width:844,height:390}]){
        await page.setViewportSize(size);await fits('#audio-panel','#audio-close',size);
        await page.screenshot({path:`artifacts/ui-sound-${size.width}x${size.height}.png`});
      }
      await page.setViewportSize(normal);await press('#audio-close');await scene('JungleGreyboxScene');
      await press('#audio-toggle');await page.keyboard.press('Escape');await scene('JungleGreyboxScene');
      assert.equal(await page.locator('#audio-panel').isVisible(),false);
      await press('#audio-toggle');await press('#console-help');
      assert.equal(await page.locator('#audio-panel').isVisible(),false,'Switching back to help closes sound');
      await press('#console-help-close');assert.equal(await page.locator('#controls-panel').isVisible(),false,'Help X closes');
      assert.equal(await page.locator('#console-view').count(),0);
      assert.equal(await page.locator('#replay-power').count(),0);
      const campaign=await page.locator('#lab-panel').getAttribute('data-campaign');
      await requestRestart();
      assert.equal(await page.locator('#restart-dialog').isVisible(),true);
      assert.equal(await page.locator('#restart-cancel').evaluate(e=>e===document.activeElement),true,'Safe default is keep playing');
      assert.match(await page.locator('#restart-dialog').innerText(),/Perderás.*bananas/);
      const frozen=await page.locator('#movement-stats').getAttribute('data-state');
      await page.keyboard.press('KeyD');await page.keyboard.press('KeyK');await page.waitForTimeout(250);
      const frozenAfter=await page.locator('#movement-stats').getAttribute('data-state');
      assert.equal(JSON.parse(frozenAfter).simTime,JSON.parse(frozen).simTime,'Modal freezes the level');
      for(const size of mobile?[{width:320,height:568},{width:390,height:844}]:[{width:844,height:390},{width:1366,height:768}]){
        await page.setViewportSize(size);await fits('#restart-dialog','#restart-close',size);
        await page.screenshot({path:`artifacts/ui-restart-${size.width}x${size.height}.png`});
      }
      await press('#restart-cancel');assert.equal(await page.locator('#restart-dialog').isVisible(),false);
      assert.equal(await page.locator('#lab-panel').getAttribute('data-campaign'),campaign,'Cancel preserves campaign');
      await requestRestart();await page.keyboard.press('Escape');await scene('JungleGreyboxScene');
      assert.equal(await page.locator('#restart-dialog').isVisible(),false,'Escape cancels, never exits level');
      await requestRestart();await press('#restart-close');await scene('JungleGreyboxScene');
      await requestRestart();
      await Promise.all([page.waitForEvent('load'),press('#restart-confirm')]);
      await page.waitForFunction(()=>document.querySelector('#console-shell')?.dataset.power==='off');
      await scene('TitleScene');
      const fresh=await page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.campaign));
      assert.equal(fresh.bananas,0);assert.equal(fresh.completed.length,0);assert.equal(fresh.letters,'-----');
      await ready();await press('#audio-toggle');
      assert.equal(await page.locator('#audio-music').inputValue(),'29');assert.equal(await page.locator('#audio-effects').inputValue(),'61');
      assert.equal(await page.locator('#audio-muted').isChecked(),true,'Autosaved values survive reload');
      assert.deepEqual(errors,[]);
      console.log(`PASS panels ${mobile?'touch':'keyboard'}: invitation theme, centered, X/toggle/Escape, auto-save, confirmed full restart and safe cancel`);
    } finally {await context.close();}
  }
  // Storage-disabled browsers still apply settings, and must not promise persistence.
  const context=await browser.newContext(),page=await context.newPage();
  try {
    await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Blocked','SecurityError');};});
    await page.goto('http://127.0.0.1:4174/?adventure=1');
    await page.locator('#audio-toggle').click();await page.locator('#audio-music').fill('12');
    assert.match(await page.locator('#audio-save-note').innerText(),/no permite guardarlos/);
    assert.equal(await page.locator('#audio-music-value').innerText(),'12%');
    console.log('PASS panels: storage-disabled notice, settings still apply');
  } finally {await context.close();}
}
