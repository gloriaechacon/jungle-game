// Route timing + optional video (not part of `npm test`).
// Usage: npm run build && node tests/route-timing.mjs [--video artifacts/phase-5-run.webm]
// A keyboard bot crosses Jungle without stopping (running, then walking) and reports
// the active simulation time. This is a lower bound for a practised player, NOT a
// human playtest: people explore, hesitate and retry.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { installBot } from './support/bot.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4178', '--strictPort'], { cwd: root, stdio: 'ignore', windowsHide: true });
const launch = process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : { channel: process.env.BROWSER_CHANNEL || 'msedge' };
const videoArg = process.argv.indexOf('--video');
let browser;
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:4178')).ok) break; } catch {} await new Promise(r => setTimeout(r, 150)); }
  browser = await chromium.launch({ ...launch, headless: true });
  for (const run of (process.env.MODES || "run,walk").split(",").map(m => m === "run")) {
    const video = run && videoArg > 0;
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, ...(video ? { recordVideo: { dir: root + 'artifacts/.video', size: { width: 1366, height: 768 } } } : {}) });
    const page = await context.newPage();
    page.on('pageerror', e => console.error('pageerror', e.message));
    await page.goto('http://127.0.0.1:4178/?level=jungle');
    await page.waitForFunction(() => !!document.getElementById('movement-stats').dataset.state);
    await page.locator('#activate-input').click();
    await page.waitForFunction(() => JSON.parse(document.getElementById('movement-stats').dataset.state).grounded);
    await installBot(page);
    const t0 = Date.now();
    let failure = null;
    page.evaluate(run => window.__bot.travel(s => s.finished, { run, label: 'route', timeout: 240000 }), run).catch(e => { failure = e; });
    let end;
    for (;;) {
      await new Promise(r => setTimeout(r, 400));
      end = await page.evaluate(() => JSON.parse(document.getElementById('movement-stats').dataset.state));
      if (process.env.DEBUG) console.log(end.x.toFixed(1), end.simTime, end.view?.dkFrame);
      if (failure) throw failure;
      if (end.finished) break;
    }
    await page.evaluate(() => window.__bot.stop().catch(() => null));
    console.log(JSON.stringify({ mode: run ? 'run (D+J held)' : 'walk (D held)', simSeconds: +(end.simTime / 1000).toFixed(1), realSeconds: +((Date.now() - t0) / 1000).toFixed(1), deaths: end.gameplay.deaths, bananas: end.gameplay.bananas, letters: end.gameplay.letters, kills: end.gameplay.kills }));
    if (video) {
      await page.waitForTimeout(1500);
      const v = page.video();
      await context.close();
      await rename(await v.path(), root + process.argv[videoArg + 1]);
      await rm(root + 'artifacts/.video', { recursive: true, force: true });
    } else await context.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
