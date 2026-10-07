import assert from 'node:assert/strict';
import { GAME_TITLE } from '../src/branding.ts';

export async function testEntry(page, browser) {
  const base = 'http://127.0.0.1:4174';
  const routes = [
    ['/', true, 'TitleScene'],
    ['/?utm_source=portfolio', true, 'TitleScene'],
    ['/?adventure=1', true, 'TitleScene'],
    ['/?adventure=1&workbench=1', false, 'WorldMapScene'],
    ['/?workbench=1', false, 'JungleGreyboxScene'],
    ['/?level=jungle', false, 'JungleGreyboxScene'],
    ['/?level=ropey', false, 'JungleGreyboxScene'],
    ['/?level=reptile', false, 'JungleGreyboxScene'],
    ['/?greybox=1', false, 'JungleGreyboxScene'],
    ['/?phase5=1', false, 'JungleGreyboxScene'],
    ['/?lab=1', false, 'MovementLabScene'],
    ['/?diagnostic=1', false, 'DiagnosticScene'],
  ];
  for (const [path, cinematic, scene] of routes) {
    const response = await page.goto(base + path);
    assert.equal(response.status(), 200, path);
    assert((await response.text()).includes('<title>' + GAME_TITLE + '</title>'), 'Initial HTML has the edition name');
    assert.equal(response.request().redirectedFrom(), null, 'No HTTP redirect: ' + path);
    await page.waitForFunction(name => document.querySelector('#scene-name').textContent === name, scene);
    assert.equal(await page.title(), GAME_TITLE, 'Brand name stays after scene boot: ' + path);
    assert.equal(page.url(), base + path, 'No client redirect or URL replacement: ' + path);
    assert.equal(await page.locator('body').evaluate(e => e.classList.contains('cinematic-console')), cinematic, path);
    if (cinematic) {
      assert.equal(await page.locator('#console-shell').getAttribute('data-power'), 'off');
      assert(await page.locator('#power-start').isVisible());
      await page.waitForFunction(() => {
        const photo = document.querySelector('.console-photo');
        return photo?.complete && photo.naturalWidth === 981;
      });
      assert.equal(await page.locator('#audio-toggle').evaluate(e => JSON.parse(e.dataset.audio).state), 'locked');
      if (path === '/') {
        const favicon = page.locator('link[rel="icon"]');
        assert.equal(await favicon.getAttribute('type'), 'image/png');
        assert.equal(await favicon.getAttribute('sizes'), '32x32');
        assert.equal(await favicon.getAttribute('href'), '/assets/going-bananas-icon.png');
        const iconResponse = await page.request.get(base + '/assets/going-bananas-icon.png');
        assert.equal(iconResponse.status(), 200);
        assert.match(iconResponse.headers()['content-type'], /image\/png/);
        const png = await iconResponse.body();
        assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
        assert.equal(png.readUInt32BE(16), 32);
        assert.equal(png.readUInt32BE(20), 32);
        assert.equal(png[25], 6, 'RGBA favicon supports a transparent background');
        await page.screenshot({path: 'artifacts/entry-desktop.png'});
        await page.locator('#power-start').click();
        await page.waitForFunction(() => document.querySelector('#console-shell')?.dataset.power === 'ready');
        await page.waitForTimeout(500);
        assert.equal(await page.locator('canvas').getAttribute('aria-label'), GAME_TITLE + ', pantalla de juego 160 por 144');
        await page.screenshot({path: 'artifacts/title-desktop.png'});
      }
    } else {
      assert.equal(await page.locator('.console-photo').count(), 0, path);
      if (path.includes('level=ropey') || path.includes('level=reptile')) {
        assert.equal(await page.locator('.level-link').first().getAttribute('href'), '/?level=jungle');
      }
    }
  }
  for (const width of [390, 320]) {
    const context = await browser.newContext({viewport: {width, height: 844}, isMobile: true, hasTouch: true});
    try {
      const mobile = await context.newPage(), errors = [];
      mobile.on('pageerror', e => errors.push(e.message));
      await mobile.goto(base + '/');
      await mobile.locator('#power-start').tap();
      await mobile.waitForFunction(() => document.querySelector('#console-shell')?.dataset.power === 'ready');
      await mobile.waitForFunction(() => document.querySelector('#scene-name').textContent === 'TitleScene');
      assert.equal(mobile.url(), base + '/');
      assert.equal(await mobile.title(), GAME_TITLE);
      assert(await mobile.locator('#touch-a').isVisible());
      assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await mobile.waitForTimeout(500); // Let the existing boot overlay fade out before the screenshot.
      await mobile.screenshot({path: `artifacts/entry-mobile-${width}.png`});
      await mobile.locator('#touch-a').tap();
      await mobile.waitForFunction(() => document.querySelector('#scene-name').textContent === 'WorldMapScene');
      await mobile.reload();
      await mobile.waitForFunction(() => document.querySelector('#console-shell')?.dataset.power === 'off');
      assert.equal(mobile.url(), base + '/', 'Reload also stays at the normal URL');
      assert.deepEqual(errors, [], 'No mobile runtime errors');
    } finally {
      await context.close();
    }
  }
  console.log('PASS entry: direct console at /, no redirects, old links/labs intact, mobile power-on/map/reload.');
}
