// Edge cases for the React component: hidden containers, many mounts, odd sizes, rapid changes, pixel ratios.
import type { Page } from '@playwright/test';
import { expect, fullResolution, test } from '../packages/react/test/page/fixture';

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  // Headless Chromium's software WebGL logs this driver notice for any WebGL canvas: the environment, not the marble.
  return () => errors.filter(e => !/GPU stall due to ReadPixels/.test(e));
}

const orb = (page: Page) => page.locator('[data-talking-marble]');
const canvasSide = (page: Page) => orb(page).locator('canvas').evaluate(c => [(c as HTMLCanvasElement).width, (c as HTMLCanvasElement).height]);

test('mounted in a hidden container, it draws once shown, and again after hiding and showing', async ({ page, testPage }) => {
  const errors = collectErrors(page);
  await page.goto(testPage);
  await page.evaluate(() => { document.getElementById('root')!.style.display = 'none'; window.harness.render({ state: 'speaking' }); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.getElementById('root')!.style.display = ''; });
  await expect(orb(page)).toHaveAttribute('data-ready', 'true');
  expect(await canvasSide(page)).toEqual([200, 200]);
  await page.evaluate(() => { document.getElementById('root')!.style.display = 'none'; });
  await page.waitForTimeout(200);
  await page.evaluate(() => { document.getElementById('root')!.style.display = ''; });
  await expect(orb(page)).toHaveAttribute('data-ready', 'true');
  expect(await canvasSide(page)).toEqual([200, 200]);
  expect(errors()).toEqual([]);
});

test('40 mounts and unmounts, then 30 marbles twice, share one WebGL context', async ({ page, testPage }) => {
  const errors = collectErrors(page);
  await page.addInitScript(() => {
    const w = window as unknown as { glContexts: number };
    w.glContexts = 0;
    for (const proto of [HTMLCanvasElement.prototype, OffscreenCanvas.prototype] as { getContext: (...a: unknown[]) => unknown }[]) {
      const original = proto.getContext;
      proto.getContext = function (this: unknown, type: unknown, ...rest: unknown[]) {
        const ctx = original.call(this, type, ...rest);
        if ((type === 'webgl2' || type === 'webgl') && ctx) w.glContexts++;
        return ctx;
      };
    }
  });
  await page.goto(testPage);
  await page.evaluate(async () => {
    const frame = () => new Promise(r => requestAnimationFrame(r));
    for (let i = 0; i < 40; i++) {
      window.harness.render({ state: i % 2 ? 'speaking' : 'thinking' });
      await frame();
      window.harness.unmount();
      await frame();
    }
  });
  for (let round = 0; round < 2; round++) {
    await page.evaluate(() => window.harness.many(30));
    await expect(orb(page)).toHaveCount(30);
    for (const one of await orb(page).all()) await expect(one).toHaveAttribute('data-ready', 'true');
    await page.evaluate(() => window.harness.unmount());
    await expect(orb(page)).toHaveCount(0);
  }
  expect(await page.evaluate(() => (window as unknown as { glContexts: number }).glContexts)).toBeLessThanOrEqual(1);
  expect(errors()).toEqual([]);
});

test('odd sizes render without errors; 0, negative and NaN fill the container', async ({ page, testPage }) => {
  const errors = collectErrors(page);
  await page.goto(testPage);
  const container = await page.locator('#root').evaluate(el => el.clientWidth - 48);
  for (const [size, width] of [[0, container], [-5, container], [1, 1], [20.5, 20.5], [Number.NaN, container], [Infinity, container]] as const) {
    await page.evaluate(size => window.harness.render({ size }), size);
    await expect(orb(page), `size ${size}`).toHaveAttribute('data-ready', 'true');
    expect((await orb(page).boundingBox())!.width, `size ${size}`).toBeCloseTo(width, 0);
  }
  expect(errors()).toEqual([]);
});

test('20 state and emotion changes in 200 ms settle without errors', async ({ page, testPage }) => {
  const errors = collectErrors(page);
  await page.goto(testPage);
  await page.evaluate(async () => {
    const statesList = ['idle', 'connecting', 'listening', 'thinking', 'searching', 'speaking', 'error'];
    const emotionsList = [null, 'happy', 'calm', 'excited', 'curious', 'surprised', 'concerned', 'sad', 'muted'];
    for (let i = 0; i < 20; i++) {
      window.harness.render({ state: statesList[i % statesList.length], emotion: emotionsList[i % emotionsList.length], level: (i % 5) / 4 });
      await new Promise(r => setTimeout(r, 10));
    }
  });
  await expect(orb(page)).toHaveAttribute('data-ready', 'true');
  await page.waitForTimeout(300);
  expect(errors()).toEqual([]);
});

for (const [scale, backing] of [[1, 120], [3, 240]] as const) {
  test(`backs the canvas at ${scale}× device pixels as ${backing} px (capped at 2×)`, async ({ browser, testPage }) => {
    const context = await browser.newContext({ deviceScaleFactor: scale });
    const page = await context.newPage();
    await fullResolution(page);
    await page.goto(testPage);
    await page.evaluate(() => window.harness.render({ size: 120 }));
    await expect(orb(page)).toHaveAttribute('data-ready', 'true');
    expect(await canvasSide(page)).toEqual([backing, backing]);
    await context.close();
  });
}

test('className reaches the outer element', async ({ page, testPage }) => {
  await page.goto(testPage);
  await page.evaluate(() => window.harness.render({ className: 'mine other' }));
  await expect(orb(page)).toHaveClass('mine other');
  await expect(orb(page)).toHaveAttribute('data-ready', 'true');
});
