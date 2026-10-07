import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export async function testJungle(page) {
  await page.goto('http://127.0.0.1:4174/?greybox=1');
  await page.waitForFunction(() => document.getElementById('scene-name').textContent === 'JungleGreyboxScene');
  const state = () => page.locator('#movement-stats').evaluate(el => JSON.parse(el.dataset.state));
  for (const size of [{width:1280,height:720},{width:1366,height:768},{width:1440,height:900}]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(200);
    const canvas = await page.locator('canvas').boundingBox();
    const shell = await page.locator('#console-shell').boundingBox();
    const expectedScale = size.height >= 900 ? 4 : 3;
    assert.equal(canvas.width,160*expectedScale,'Use largest integer scale that fits laptop');
    assert.equal(canvas.height,144*expectedScale);
    assert(shell.y >= 0 && shell.y+shell.height <= size.height,'Entire gameplay shell must fit');
    for (const selector of ['.dpad','[data-action="a"]','[data-action="b"]']) {
      const box = await page.locator(selector).boundingBox();
      assert(box.y+box.height <= size.height && box.x >= 0 && box.x+box.width <= size.width);
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.setViewportSize({width:1366,height:768});
  await page.locator('#show-body').focus();
  await page.waitForFunction(() => JSON.parse(document.getElementById('movement-stats').dataset.state).paused);
  const before = await page.locator('canvas').screenshot();
  await page.locator('#show-silhouette').uncheck();
  await page.waitForTimeout(80);
  assert.notDeepEqual(await page.locator('canvas').screenshot(),before,'Visual toggle must change drawing');
  await page.locator('#show-silhouette').check();
  await page.locator('#restart-lab').click();
  await page.waitForFunction(() => JSON.parse(document.getElementById('movement-stats').dataset.state).grounded);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => JSON.parse(document.getElementById('movement-stats').dataset.state).paused);
  const paused = await state();
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(150);
  assert.equal((await state()).x,paused.x);
  await page.keyboard.up('KeyD');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => {
    const s = JSON.parse(document.getElementById('movement-stats').dataset.state);
    return !s.paused && s.grounded;
  });
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/phase-3-laptop.png',import.meta.url)),fullPage:true});
  // Real keyboard traversal, no teleport/debug mutation. Retry short jumps at ground contact.
  await page.keyboard.down('KeyD'); await page.keyboard.down('KeyJ');
  const deadline = Date.now()+90000;
  const obstacles = [176,248,320,480,584,704,864,944,1016,1040,1184,1376,1472,1600,1808,1904,1984,2016,2144,2240];
  while (!(await state()).finished && Date.now()<deadline) {
    const current = await state();
    const next = obstacles.find(x => x > current.x + 5);
    if (current.grounded && next !== undefined && next-current.x < 28) {
      await page.keyboard.down('KeyK');
      await page.waitForTimeout(450);
      await page.keyboard.up('KeyK');
    }
    await page.waitForTimeout(40);
  }
  await page.keyboard.up('KeyD'); await page.keyboard.up('KeyJ');
  const end = await state();
  assert(end.finished,`Jungle must be traversable: ${JSON.stringify(end)}`);
  assert(end.cameraX>2000,'Camera reaches final portion');
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/phase-3-exit.png',import.meta.url)),fullPage:true});
  // Self-contained contract: exact approved B-01 file (including its line endings).
  const current = await readFile(new URL('../src/tuning.ts',import.meta.url));
  assert.equal(createHash('sha256').update(current).digest('hex'),'87f02c4b43fdde42e00c80839ab5d9cfc1b91ed92b39dfc7f1912315f0f6c9f9','B-01 unchanged');
  console.log('PASS Jungle: laptop 3x/4x framing, controls visible, silhouette toggle, pause, real-keyboard traversal, exit, unchanged B-01.');
}
