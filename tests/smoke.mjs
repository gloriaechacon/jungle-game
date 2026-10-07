import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { testMovement } from './movement.mjs';
import { testJungle } from './jungle.mjs';
import { testGameplay } from './gameplay.mjs';
import { testPhase5, testPhase5Framing } from './phase5.mjs';
import { testPhase6 } from './phase6.mjs';
import { testPhase7 } from './phase7.mjs';
import { testPhase8 } from './phase8.mjs';
import { testPhase9, testMapReturn } from './phase9.mjs';
import { testPhase10 } from './phase10.mjs';
import { testPhase11 } from './phase11.mjs';
import { testAudio } from './audio.mjs';
import { testAudioMobile } from './audio-mobile.mjs';
import { testDemo } from './demo.mjs';
import { testTouch } from './touch.mjs';
import { testPanels } from './panels.mjs';
import { testReadability } from './readability.mjs';
import { testTerrain } from './terrain.mjs';
import { testJungleFinale } from './jungle-finale.mjs';
import { testJungleDiscovery } from './jungle-discovery.mjs';
import { testMapCoach } from './map-coach.mjs';
import { testNavigation } from './navigation.mjs';
import { testJungleGap } from './jungle-gap.mjs';
import { testEntry } from './entry.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { cwd: root, stdio: 'pipe', windowsHide: true });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:4174')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  assert(ready, 'Preview server failed to start');
  // Default: installed Microsoft Edge. BROWSER_CHANNEL=chrome uses Chrome; BROWSER_PATH=<exe> a specific build.
  const launch = process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : { channel: process.env.BROWSER_CHANNEL || 'msedge' };
  browser = await chromium.launch({ ...launch, headless: true });
  console.log(`Browser: ${process.env.BROWSER_PATH ? 'chromium @ ' + process.env.BROWSER_PATH : (process.env.BROWSER_CHANNEL || 'msedge')} ${browser.version()}`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error('Runtime:', error.stack); });
  const only = process.argv.find(a => /^--(?:phase(?:[456789]|10|11)|entry|audio|audio-mobile|demo|bonus-loss|bonus-timeout|touch|panels|readability|terrain|jungle-finale|jungle-gap|jungle-discovery|map-coach|navigation)-only$/.test(a));
  if (!only) {
  await page.goto('http://127.0.0.1:4174/?diagnostic=1');
  await page.waitForFunction(() => document.getElementById('scene-name').textContent === 'DiagnosticScene');
  assert.equal(await page.locator('#scene-path').textContent(), 'BootScene → DiagnosticScene');
  assert.deepEqual(await page.locator('canvas').evaluate(c => [c.width, c.height]), [160, 144]);
  await page.locator('#activate-input').click();
  const isPressed = action => page.locator(`[data-action="${action}"]`).getAttribute('data-pressed');
  const canvasBefore = await page.locator('canvas').screenshot();
  for (const key of ['KeyD', 'KeyJ', 'KeyK']) await page.keyboard.down(key);
  for (const action of ['right', 'b', 'a']) assert.equal(await isPressed(action), 'true');
  assert.notDeepEqual(await page.locator('canvas').screenshot(), canvasBefore, 'Canvas must also reflect inputs');
  for (const key of ['KeyD', 'KeyJ', 'KeyK']) await page.keyboard.up(key);
  for (const action of ['right', 'b', 'a']) assert.equal(await isPressed(action), 'false');
  await page.keyboard.down('KeyD');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.up('KeyD');
  assert.equal(await isPressed('right'), 'true', 'Alternate binding should keep action held');
  await page.keyboard.up('ArrowRight');
  assert.equal(await isPressed('right'), 'false');
  for (const [key, action] of [['KeyW','up'],['KeyS','down'],['KeyA','left'],['Space','start']]) {
    await page.keyboard.down(key); assert.equal(await isPressed(action), 'true');
    await page.keyboard.up(key); assert.equal(await isPressed(action), 'false');
  }
  // Native select takes focus: all held keys must clear and typing there must not drive the game.
  await page.keyboard.down('KeyJ');
  await page.locator('#scale-select').focus();
  assert.equal(await isPressed('b'), 'false');
  await page.keyboard.down('KeyK'); assert.equal(await isPressed('a'), 'false');
  await page.keyboard.up('KeyJ'); await page.keyboard.up('KeyK');
  await page.locator('#activate-input').click();
  await page.keyboard.down('KeyJ');
  // Exercise the actual window-blur handler independently of input-scope blur.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  assert.equal(await isPressed('b'), 'false');
  await page.keyboard.up('KeyJ');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.locator('#activate-input').click();
  await page.keyboard.down('Control'); await page.keyboard.down('KeyK');
  assert.equal(await isPressed('a'), 'false', 'Browser shortcuts must not trigger game actions');
  await page.keyboard.up('KeyK'); await page.keyboard.up('Control');

  await page.setViewportSize({ width: 1800, height: 1500 });
  for (let scale = 1; scale <= 5; scale++) {
    await page.selectOption('#scale-select', String(scale));
    await page.waitForFunction(s => document.getElementById('lab-panel').dataset.scale === String(s), scale);
    const size = await page.locator('canvas').boundingBox();
    assert.equal(size.width, 160*scale); assert.equal(size.height, 144*scale);
  }
  for (const size of [{width:320,height:780},{width:768,height:900},{width:1280,height:720}]) {
    await page.setViewportSize(size);
    await page.selectOption('#scale-select', 'auto');
    await page.waitForTimeout(150);
    const box = await page.locator('canvas').boundingBox();
    assert.equal(box.width/160, box.height/144);
    assert(Number.isInteger(box.width/160));
    assert(box.x >= 0 && box.x + box.width <= size.width, 'Canvas must fit width');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow');
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.waitForTimeout(150);
  await page.locator('#activate-input').click();
  await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('../artifacts/phase-a.png', import.meta.url)), fullPage: true });
  for (const dpr of [1.25, 2]) {
    const c = await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:dpr});
    const p = await c.newPage();
    await p.goto('http://127.0.0.1:4174/?diagnostic=1');
    await p.waitForFunction(() => document.getElementById('scene-name').textContent === 'DiagnosticScene');
    assert.deepEqual(await p.locator('canvas').evaluate(c => [c.width,c.height]), [160,144]);
    assert.equal(await p.locator('canvas').evaluate(c => getComputedStyle(c).imageRendering), 'pixelated');
    await c.close();
  }
  await testMovement(page);
  await testJungle(page);
  }
  if (!only || only === '--phase4-only') await testGameplay(page);
  if (!only || only === '--phase5-only') { await testPhase5Framing(page); await testPhase5(page); }
  if (!only || only === '--phase6-only') await testPhase6(page);
  if (!only || only === '--readability-only') await testReadability(page);
  if (!only || only === '--terrain-only') await testTerrain(page);
  if (!only || only === '--jungle-finale-only') await testJungleFinale(page);
  if (!only || only === '--jungle-gap-only') await testJungleGap(page);
  if (!only || only === '--jungle-discovery-only') await testJungleDiscovery(page);
  if (!only || only === '--phase7-only') await testPhase7(page);
  if (!only || only === '--phase8-only') await testPhase8(page);
  if (!only || only === '--phase9-only') { await testMapReturn(page); await testPhase10(page); await testPhase9(page); }
  if (only === '--phase10-only') await testPhase10(page);
  if (!only || only === '--entry-only') await testEntry(page, browser);
  if (!only || only === '--phase11-only') await testPhase11(page);
  if (!only || only === '--map-coach-only') await testMapCoach(page);
  if (!only || only === '--audio-only') await testAudio(page);
  if (!only || only === '--audio-mobile-only') await testAudioMobile(browser);
  if (!only || only === '--demo-only') await testDemo(page);
  if (only === '--bonus-loss-only') await testDemo(page,false);
  if (only === '--bonus-timeout-only') await testDemo(page,'timeout');
  if (!only || only === '--touch-only') await testTouch(browser);
  if (!only || only === '--panels-only') await testPanels(browser);
  if (!only || only === '--navigation-only') await testNavigation(browser);
  assert.deepEqual(errors, [], 'No runtime errors');
  console.log('PASS: selected browser checks completed with zero runtime errors.');
} finally {
  await browser?.close();
  server.kill();
}
