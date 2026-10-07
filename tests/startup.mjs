import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = 'http://127.0.0.1:4174';
const isBundle = request => /\/assets\/index-[^/]+\.js$/.test(new URL(request.url()).pathname);
const ready = page => page.waitForFunction(() =>
  !document.querySelector('#startup') && !document.querySelector('#app').hidden &&
  document.querySelector('#scene-name').textContent === 'TitleScene');

async function assertInitialConsole(page) {
  await page.waitForFunction(() => {
    const photo = document.querySelector('#startup-photo');
    return photo?.complete && photo.naturalWidth === 981;
  });
  assert(await page.locator('#startup-photo').isVisible(), 'The real console is visible before game code runs');
  assert(await page.locator('#app').isHidden(), 'The legacy markup starts hidden in HTML');
  assert.equal(await page.locator('#app').evaluate(e => e.inert), true);
  assert(await page.locator('.page-header').isHidden());
  assert(await page.locator('.card-top').isHidden());
  assert(await page.locator('.control-card').isHidden());
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}

export async function testStartup(browser) {
  await mkdir(new URL('../artifacts/', import.meta.url), {recursive: true});
  for (const [name, viewport, mobile, path] of [
    ['desktop', {width: 1440, height: 1000}, false, '/'],
    ['mobile-390', {width: 390, height: 844}, true, '/?adventure=1'],
    ['mobile-320', {width: 320, height: 568}, true, '/?utm_source=portfolio'],
  ]) {
    const context = await browser.newContext({viewport, isMobile: mobile, hasTouch: mobile});
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    try {
      const page = await context.newPage(), errors = [], documents = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (request.isNavigationRequest()) documents.push(request.url()); });
      // Observe every render opportunity, not just the eventual ready screen.
      await page.addInitScript(() => {
        window.startupFrames = {count: 0, leaks: []};
        const inspect = () => {
          window.startupFrames.count++;
          for (const selector of ['.page-header', '.card-top', '.control-card', '.page-footer']) {
            const node = document.querySelector(selector), box = node?.getBoundingClientRect();
            if (box?.width && box.height && getComputedStyle(node).visibility !== 'hidden') {
              window.startupFrames.leaks.push(selector);
            }
          }
          requestAnimationFrame(inspect);
        };
        requestAnimationFrame(inspect);
      });
      await page.route('**/*', async route => {
        if (isBundle(route.request())) await gate;
        await route.continue();
      });
      const response = await page.goto(base + path, {waitUntil: 'commit'});
      assert.equal(response.status(), 200);
      assert.equal(response.request().redirectedFrom(), null);
      await assertInitialConsole(page);
      await page.waitForTimeout(600); // Deliberately keep the slow initial render onscreen.
      const initial = await page.locator('#startup-shell').boundingBox();
      await page.screenshot({path: `artifacts/startup-${name}-loading.png`});
      release();
      await ready(page);
      await page.waitForTimeout(250);
      const mounted = await page.locator('#console-shell').boundingBox();
      for (const key of ['x', 'y', 'width', 'height']) {
        assert(Math.abs(initial[key] - mounted[key]) < 1, `No photo jump at handoff: ${name} ${key}`);
      }
      const frames = await page.evaluate(() => window.startupFrames);
      assert(frames.count >= 10, 'Sampled actual frames while the bundle was withheld');
      assert.deepEqual(frames.leaks, [], 'No frame exposes the diagnostic UI');
      assert.equal(await page.locator('#console-shell').getAttribute('data-power'), 'off');
      assert.equal(await page.locator('#audio-toggle').evaluate(e => JSON.parse(e.dataset.audio).state), 'locked');
      assert.equal(await page.locator('#app').evaluate(e => e.inert), false);
      assert.deepEqual(documents, [base + path], 'Only one document, no client or server redirects');
      assert.equal(page.url(), base + path);
      await page.screenshot({path: `artifacts/startup-${name}-ready.png`});
      if (mobile) await page.locator('#power-start').tap();
      else await page.locator('#power-start').click();
      await page.waitForFunction(() => document.querySelector('#console-shell').dataset.power === 'ready');
      if (mobile) await page.locator('#touch-a').tap();
      else await page.keyboard.press('KeyK');
      await page.waitForFunction(() => document.querySelector('#scene-name').textContent === 'WorldMapScene');
      assert.deepEqual(errors, [], name);
    } finally {
      release();
      await context.close();
    }
  }

  // Critical styling and HTML also work without either application bundle.
  const failed = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  try {
    const page = await failed.newPage();
    await page.route('**/*', route => isBundle(route.request()) || route.request().resourceType() === 'stylesheet'
      ? route.abort() : route.continue());
    await page.goto(base + '/?adventure=1');
    await assertInitialConsole(page);
    assert.equal(await page.locator('#startup').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(223, 233, 228)');
    assert(await page.getByRole('link', {name: '¿No carga? Reintentar'}).isVisible());
    await page.screenshot({path: 'artifacts/startup-bundles-blocked.png'});
    await page.unrouteAll();
    await page.getByRole('link', {name: '¿No carga? Reintentar'}).click();
    await ready(page);
    assert.equal(page.url(), base + '/?adventure=1', 'Retry keeps the exact URL');
  } finally { await failed.close(); }

  const noScript = await browser.newContext({javaScriptEnabled: false});
  try {
    const page = await noScript.newPage();
    await page.goto(base + '/');
    assert(await page.locator('#startup-photo').isVisible());
    assert(await page.locator('#startup-status noscript').isVisible());
    assert.equal(await page.locator('#startup-status noscript').textContent(), 'Activa JavaScript para jugar.');
    assert(await page.locator('#app').isHidden());
    await page.screenshot({path: 'artifacts/startup-no-javascript.png'});
  } finally { await noScript.close(); }
  console.log('PASS startup: console first paint, slow/failed bundles, no lab flashes or redirects, stable desktop/mobile handoff.');
}
