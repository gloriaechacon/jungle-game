// Frame-rate comparison harness (not part of `npm test`).
// Usage: npm run build && node tests/fps-measure.mjs [--json out.json]
// Simulates display rates in headless Chromium/Edge by replacing
// requestAnimationFrame with a setTimeout clock (1000/hz ms). "raf" keeps the
// browser's own requestAnimationFrame (60 Hz in headless). This is a
// simulation of frame delivery, not a physical 144 Hz monitor: vsync,
// compositor pacing and GPU load are not reproduced.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 4176;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore', windowsHide: true });
const launch = process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : { channel: process.env.BROWSER_CHANNEL || 'msedge' };
const rates = (process.env.RATES || 'raf,24,40,60,144').split(',');
let browser;
const results = [];
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 150));
  }
  browser = await chromium.launch({ ...launch, headless: true });
  for (const rate of rates) results.push(await measure(rate));
  console.table(results);
  const out = process.argv.indexOf('--json');
  if (out > 0) await writeFile(process.argv[out + 1], JSON.stringify({ browser: browser.version(), results }, null, 2));
  console.log('browser', browser.version());
} finally {
  await browser?.close();
  server.kill();
}

async function measure(rate) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  if (rate !== 'raf') {
    await context.addInitScript(ms => {
      window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), ms);
      window.cancelAnimationFrame = id => clearTimeout(id);
    }, 1000 / Number(rate));
  }
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => !!document.getElementById('movement-stats').dataset.state);
  await page.locator('#activate-input').click();
  // Phaser clamps delta for 120 frames after a focus change (engine cooldown);
  // wait it out so every rate is measured in steady state.
  await page.waitForTimeout(rate === 'raf' ? 2500 : Math.max(2500, 120 * 1000 / Number(rate) + 1500));
  await page.evaluate(() => {
    const el = document.getElementById('movement-stats');
    window.__samples = [];
    const loop = () => { if (el.dataset.state) window.__samples.push({ t: performance.now(), ...JSON.parse(el.dataset.state) }); window.__sampler = setTimeout(loop, 2); };
    loop();
  });
  const now = () => page.evaluate(() => performance.now());
  // Keep one sample per rendered frame (telemetry changes once per frame).
  const since = t0 => page.evaluate(t0 => window.__samples.filter((s, i, a) => s.t >= t0 && (i === 0 || JSON.stringify(a[i - 1].gameplay) !== JSON.stringify(s.gameplay) || a[i - 1].x !== s.x)), t0);
  const restart = async () => {
    await page.locator('#restart-lab').click();
    await page.waitForFunction(() => { const s = JSON.parse(document.getElementById('movement-stats').dataset.state); return s.grounded && s.gameplay && s.gameplay.bananas === 0 && Math.abs(s.vx) < 0.01; });
    await page.waitForTimeout(300);
  };
  const out = { rate };
  // 1) Rules clock against real time while idle.
  let t0 = await now(); await page.waitForTimeout(1200);
  let s = await since(t0);
  out.rulesMsPerSec = Math.round((s.at(-1).gameplay.time - s[0].gameplay.time) / ((s.at(-1).t - s[0].t) / 1000));
  // 2) Walking speed (steady state, last 0.8 s of a 1.5 s hold).
  await restart();
  await page.keyboard.down('KeyD'); t0 = await now(); await page.waitForTimeout(1500);
  s = (await since(t0)).filter(x => x.t >= t0 + 700);
  await page.keyboard.up('KeyD');
  out.walkPxPerSec = +((s.at(-1).x - s[0].x) / ((s.at(-1).t - s[0].t) / 1000)).toFixed(1);
  // 3) Full jump: apex and airtime (real and simulated).
  await restart();
  const groundY = JSON.parse(await page.locator('#movement-stats').getAttribute('data-state')).y;
  t0 = await now(); await page.keyboard.down('KeyK'); await page.waitForTimeout(900); await page.keyboard.up('KeyK');
  await page.waitForTimeout(300);
  s = await since(t0);
  const air = s.filter(x => !x.grounded);
  // Apex relative to the standing height measured before the press (frame-quantized samples).
  out.jumpApexPx = +(groundY - Math.min(...s.map(x => x.y))).toFixed(1);
  out.airRealMs = Math.round(air.at(-1).t - air[0].t);
  out.airSimMs = Math.round(air.at(-1).gameplay.time - air[0].gameplay.time);
  // 4) Roll from standstill: tap J.
  await restart();
  t0 = await now(); const x0 = (await since(t0 - 50)).at(-1).x;
  await page.keyboard.down('KeyJ'); await page.waitForTimeout(30); await page.keyboard.up('KeyJ');
  await page.waitForTimeout(1300);
  s = await since(t0);
  const rolling = s.filter(x => x.gameplay.rolling);
  out.rollRealMs = rolling.length ? Math.round(rolling.at(-1).t - rolling[0].t) : null;
  out.rollSimMs = rolling.length ? Math.round(rolling.at(-1).gameplay.time - rolling[0].gameplay.time) : null;
  out.rollDistancePx = +(s.at(-1).x - x0).toFixed(1);
  // 5) Enemy patrol speed: longest monotonic segment of enemy 0.
  t0 = await now(); await page.waitForTimeout(2600);
  s = await since(t0);
  out.enemyPxPerSec = monotonicSpeed(s.map(x => ({ t: x.t, v: x.gameplay.enemies[0].x })));
  out.enemyPxPerSimSec = monotonicSpeed(s.map(x => ({ t: x.gameplay.time, v: x.gameplay.enemies[0].x })));
  // 6) Thrown barrel speed: in-page bot runs to the first barrel, picks it up and throws it.
  await restart();
  Object.assign(out, await barrel(page));
  await context.close();
  return out;
}

function slope(points) {
  const n = points.length; if (n < 2) return null;
  const mt = points.reduce((a, p) => a + p.t, 0) / n, mv = points.reduce((a, p) => a + p.v, 0) / n;
  let num = 0, den = 0; for (const p of points) { num += (p.t - mt) * (p.v - mv); den += (p.t - mt) ** 2; }
  return num / den;
}
function monotonicSpeed(points) {
  let best = [];
  let cur = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const d = Math.sign(points[i].v - points[i - 1].v);
    const prev = cur.length > 1 ? Math.sign(cur.at(-1).v - cur.at(-2).v) : d;
    if (d === 0 || d === prev) cur.push(points[i]); else { if (cur.length > best.length) best = cur; cur = [points[i - 1], points[i]]; }
  }
  if (cur.length > best.length) best = cur;
  return +Math.abs(slope(best) * 1000).toFixed(1);
}

async function barrel(page) {
  const ok = await page.evaluate(() => new Promise(resolve => {
    const el = document.getElementById('movement-stats');
    const state = () => JSON.parse(el.dataset.state);
    const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
    const obstacles = [176, 248, 320, 480, 584, 704];
    let jumpingUntil = 0;
    key('keydown', 'KeyD'); key('keydown', 'KeyJ');
    const started = performance.now();
    const tick = setInterval(() => {
      const s = state(), t = performance.now();
      if (t - started > 30000) { clearInterval(tick); key('keyup', 'KeyD'); key('keyup', 'KeyJ'); resolve(false); return; }
      if (jumpingUntil && t > jumpingUntil) { key('keyup', 'KeyK'); jumpingUntil = 0; }
      if (s.x >= 736 && s.grounded && Math.abs(s.y - 116) < 2) { clearInterval(tick); key('keyup', 'KeyD'); key('keyup', 'KeyJ'); resolve(true); return; }
      const next = obstacles.find(x => x > s.x + 5);
      if (!jumpingUntil && s.grounded && next !== undefined && next - s.x < 28) { key('keydown', 'KeyK'); jumpingUntil = t + 450; }
    }, 4);
  }));
  if (!ok) return { barrelPxPerSec: null, barrelPxPerSimSec: null };
  await page.waitForFunction(() => Math.abs(JSON.parse(document.getElementById('movement-stats').dataset.state).vx) < 0.01, null, { timeout: 5000 });
  let s = JSON.parse(await page.locator('#movement-stats').getAttribute('data-state'));
  if (s.x > 762) { await page.keyboard.down('KeyA'); await page.waitForFunction(() => JSON.parse(document.getElementById('movement-stats').dataset.state).x <= 758); await page.keyboard.up('KeyA'); }
  await page.keyboard.down('KeyD'); await page.keyboard.up('KeyD');
  await page.waitForFunction(() => Math.abs(JSON.parse(document.getElementById('movement-stats').dataset.state).vx) < 0.01, null, { timeout: 5000 });
  await page.keyboard.down('KeyJ'); await page.waitForTimeout(80);
  const t0 = await page.evaluate(() => performance.now());
  await page.keyboard.up('KeyJ');
  await page.waitForTimeout(700);
  const samples = await page.evaluate(t0 => window.__samples.filter((s, i, a) => s.t >= t0 && (i === 0 || JSON.stringify(a[i - 1].gameplay) !== JSON.stringify(s.gameplay))), t0);
  const thrown = samples.filter(x => x.gameplay.barrels[0].state === 'thrown');
  if (thrown.length < 3) return { barrelPxPerSec: null, barrelPxPerSimSec: null };
  const pts = thrown.map(s => ({ t: s.t, sim: s.gameplay.time, v: s.gameplay.barrels[0].x }));
  return { barrelPxPerSec: +(slope(pts) * 1000).toFixed(1), barrelPxPerSimSec: +(slope(pts.map(p => ({ t: p.sim, v: p.v }))) * 1000).toFixed(1) };
}
