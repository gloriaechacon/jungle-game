// In-page keyboard bot for browser tests. It dispatches real keydown/keyup events
// to window (the same path as a person's keyboard, through InputController) and
// reacts to the telemetry the game publishes once per rendered frame. Reacting
// inside the page avoids Playwright round-trip latency, so timing-sensitive checks
// (coyote window, jumping over a letter, rolling into an enemy) are reproducible.
// No game internals are touched and no test-only game hooks exist.
export async function installBot(page) {
  await page.evaluate(() => {
    const el = document.getElementById('movement-stats');
    const S = () => JSON.parse(el.dataset.state);
    const held = new Set();
    const send = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
    const down = code => { if (!held.has(code)) { held.add(code); send('keydown', code); } };
    const up = code => { if (held.has(code)) { held.delete(code); send('keyup', code); } };
    const tick = () => new Promise(r => setTimeout(r, 4));
    async function until(pred, label, timeout = 20000) {
      const t0 = performance.now();
      for (;;) {
        const s = S(); if (pred(s)) return s;
        if (performance.now() - t0 > timeout) throw new Error(`bot timeout: ${label} @ ${JSON.stringify({ x: s.x, y: s.y, g: s.grounded, p: s.paused, f: s.finished, e: s.gameplay?.enemies, k: s.gameplay?.kills, d: s.gameplay?.deaths })}`);
        await tick();
      }
    }
    const OBSTACLES = [176, 248, 320, 480, 584, 704, 864, 944, 1016, 1040, 1184, 1376, 1472, 1600, 1808, 1904, 1984, 2016, 2144, 2240];
    const GAPS = [320, 704, 1184, 1600, 2216];
    let jumpUntil = 0;
    const failures=[];
    // Move right until pred(s) holds, jumping obstacles and live enemies ahead.
    async function travel(pred, { run = true, jumpEnemies = true, label = 'travel', timeout = 30000 } = {}) {
      down('KeyD'); if (run) down('KeyJ'); else up('KeyJ');
      const t0 = performance.now();
      const recent=[];let lastSample=-Infinity;
      let deaths=S().gameplay?.deaths;
      for (;;) {
        const s = S();
        if(s.simTime-lastSample>250||s.simTime<lastSample){recent.push({x:Math.round(s.x),y:Math.round(s.y),g:s.grounded,d:s.gameplay?.deaths,h:s.gameplay?.dying});if(recent.length>50)recent.shift();lastSample=s.simTime;}
        if(s.gameplay?.deaths!==deaths){failures.push({label,recent:recent.slice(-10)});deaths=s.gameplay?.deaths;}
        if (pred(s)) return s;
        if (performance.now() - t0 > timeout) { up('KeyD'); up('KeyJ'); up('KeyK'); throw new Error(`bot timeout: ${label} @ x=${s.x} paused=${s.paused} grounded=${s.grounded} vx=${s.vx} active=${document.getElementById("input-status").textContent} held=${[...held]} recent=${JSON.stringify(recent)}`); }
        const now = performance.now();
        if (jumpUntil && now > jumpUntil) { up('KeyK'); jumpUntil = 0; }
        // Walking off the 248 platform lands inside the 320 gap: a walker must jump at its edge (296).
        const openRoute=s.gameplay?.enemies.some(e=>e.kind==='bee');
        const obstacles=openRoute?[320,704,864,1184,1376,1600,1808,1848,2112,2216]:(run ? OBSTACLES : [...OBSTACLES, 296].sort((a, b) => a - b));
        const next = obstacles.find(x => x > s.x + (run ? 5 : 1));
        // Optional upper routes are no longer walls. Take the lower path, do
        // not jump toward an overhead bee just because it shares our x.
        // A hopping lizard can meet a late jump head-on. Read its silhouette
        // sooner than a low walking patrol; the player physics are unchanged.
        const enemy = jumpEnemies && s.gameplay?.enemies.find(e => e.alive && e.kind!=='bee' && Math.abs(e.y-s.y)<26 && e.x > s.x && e.x - s.x < (e.kind==='lizard'?(run?50:42):(run?30:24)));
        // Steps need an early take-off; at walking speed gaps need a late one (near the edge).
        const reach = run ? 28 : next === 296 ? 3 : GAPS.includes(next) ? 8 : 22;
        if (!jumpUntil && s.grounded && ((next !== undefined && next - s.x < reach) || enemy)) { down('KeyK'); jumpUntil = now + 450; }
        await tick();
      }
    }
    async function stop() { up('KeyD'); up('KeyA'); up('KeyJ'); up('KeyK'); jumpUntil = 0; return until(s => s.grounded && Math.abs(s.vx) < 0.01, 'stop'); }
    async function press(code, ms = 60) { down(code); await new Promise(r => setTimeout(r, ms)); up(code); }
    window.__bot = { S, down, up, until, travel, stop, press, held, failures };
  });
}
