// UI-only helpers: exercise START/A rather than hidden workbench controls.
export const scene=(page,name)=>page.waitForFunction(n=>document.querySelector('#scene-name').textContent===n,name);
export async function focusGame(page){
  if(await page.locator('#console-help-close').isVisible())await page.locator('#console-help-close').click();
  await page.locator('#lab-panel').focus();
}
export async function returnToMap(page){
  await focusGame(page);
  const cinematic=await page.locator('body').evaluate(e=>e.classList.contains('cinematic-console'));
  if(!cinematic){await page.keyboard.press('Escape');await scene(page,'WorldMapScene');return;}
  const menu=()=>page.locator('#lab-panel').evaluate(e=>JSON.parse(e.dataset.pauseMenu||'{}'));
  if(!(await menu()).open)await page.keyboard.press('Space');
  for(let i=0;i<3&&(await menu()).choice!=='map';i++)await page.keyboard.press('KeyS');
  if(!(await menu()).confirming)await page.keyboard.press('KeyK');
  await page.keyboard.press('KeyK');await scene(page,'WorldMapScene');
}
export async function skipTutorial(page){
  await focusGame(page);await page.keyboard.press('Space');await page.keyboard.press('KeyS');await page.keyboard.press('KeyK');
  await scene(page,'StageIntroScene');await scene(page,'JungleGreyboxScene');
}
export async function restartStage(page){
  if(!await page.locator('body').evaluate(e=>e.classList.contains('cinematic-console'))){await page.locator('#restart-lab').click();return;}
  await returnToMap(page);await page.keyboard.press('KeyK');await scene(page,'StageIntroScene');await scene(page,'JungleGreyboxScene');
  await page.waitForFunction(()=>JSON.parse(document.querySelector('#movement-stats').dataset.state||'{}').grounded);
}
