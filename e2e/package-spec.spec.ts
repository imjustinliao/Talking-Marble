// M7 The orb to spec: one shared renderer for many marbles, sharp at every size, emotions, motion that never
// moves the layout. Screenshots go to test-results/package/.
import type { Page } from '@playwright/test';
import { expect, fullResolution, test } from '../packages/react/test/page/fixture';

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  return errors;
}

/**
 * Per marble in two page screenshots: how much of its square is covered (it draws) and whether it changed
 * (it animates). Measured in the page from the marbles' boxes; their own canvases are not readable.
 */
async function drawsAndAnimates(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(async ([a, b]) => {
    const load = async (d: string) => {
      const img = new Image(); img.src = `data:image/png;base64,${d}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
      return { px: ctx.getImageData(0, 0, c.width, c.height).data, w: c.width };
    };
    const [A, B] = [await load(a!), await load(b!)];
    const bg = [A.px[0]!, A.px[1]!, A.px[2]!];
    return [...document.querySelectorAll('[data-talking-marble]')].map(el => {
      const r = el.getBoundingClientRect();
      let lit = 0, changed = 0, n = 0;
      for (let y = Math.ceil(r.top + r.height * 0.2); y < r.bottom - r.height * 0.2; y++) {
        for (let x = Math.ceil(r.left + r.width * 0.2); x < r.right - r.width * 0.2; x++) {
          const i = (y * A.w + x) * 4;
          if (Math.abs(A.px[i]! - bg[0]!) + Math.abs(A.px[i + 1]! - bg[1]!) + Math.abs(A.px[i + 2]! - bg[2]!) > 30) lit++;
          if (Math.abs(A.px[i]! - B.px[i]!) + Math.abs(A.px[i + 1]! - B.px[i + 1]!) + Math.abs(A.px[i + 2]! - B.px[i + 2]!) > 3) changed++;
          n++;
        }
      }
      return { lit: lit / n, changed: changed / n };
    });
  }, [a.toString('base64'), b.toString('base64')]);
}

test('30 marbles on one page all draw and animate through one WebGL context', async ({ page, testPage }) => {
  const errors = collectErrors(page);
  // Count the WebGL contexts the page creates.
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
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto(`${testPage}?view=many&count=30`);
  const orbs = page.locator('[data-talking-marble]');
  await expect(orbs).toHaveCount(30);
  for (const orb of await orbs.all()) await expect(orb).toHaveAttribute('data-ready', 'true');
  await page.waitForTimeout(1000);
  const a = await page.screenshot({ path: 'test-results/package/many-30.png' });
  await page.waitForTimeout(400);
  const b = await page.screenshot();
  const each = await drawsAndAnimates(page, a, b);
  expect(each).toHaveLength(30);
  each.forEach((m, i) => {
    expect(m.lit, `marble ${i + 1} draws`).toBeGreaterThan(0.9);
    expect(m.changed, `marble ${i + 1} animates`).toBeGreaterThan(0.05);
  });
  expect(await page.evaluate(() => (window as unknown as { glContexts: number }).glContexts)).toBe(1);
  // Headless Chromium draws WebGL with SwiftShader and composites in software, so any WebGL canvas (even a
  // bare one) logs this driver performance notice; it is the test environment, not the marble.
  const notices = errors.filter(e => !/GPU stall due to ReadPixels/.test(e));
  expect(notices.filter(e => /webgl|context/i.test(e)), 'no context-limit warnings').toEqual([]);
  expect(notices).toEqual([]);
});

test('backs each marble at CSS size × device pixel ratio (a large one at 1.5×, never under 320 px): sharp from 20 px to a full-screen hero', async ({ browser, testPage }) => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await fullResolution(page);
  await page.goto(`${testPage}?view=sizes&sizes=20,32,48,240`);
  for (const size of [20, 32, 48, 240]) {
    const orb = page.getByRole('img', { name: `size ${size}, idle` });
    await expect(orb).toHaveAttribute('data-ready', 'true');
    const side = Math.round(Math.min(size * 2, Math.max(size * 1.5, 320)));
    expect(await orb.locator('canvas').evaluate(c => [(c as HTMLCanvasElement).width, (c as HTMLCanvasElement).height])).toEqual([side, side]);
  }
  // Below 32 px the halo is gone; at 48 px and up it shows.
  expect(await page.getByRole('img', { name: 'size 20, idle' }).locator('[data-halo]').evaluate(el => (el as HTMLElement).style.visibility)).toBe('hidden');
  expect(await page.getByRole('img', { name: 'size 48, idle' }).locator('[data-halo]').evaluate(el => (el as HTMLElement).style.visibility)).toBe('');

  // A full-screen hero: the viewport's shorter side, at 1.5× (no 512 px cap).
  await page.goto(`${testPage}?view=sizes&full=1`);
  const hero = page.getByRole('img', { name: 'full, idle' });
  await expect(hero).toHaveAttribute('data-ready', 'true');
  const css = await hero.evaluate(el => (el as HTMLElement).offsetWidth);
  expect(css).toBeGreaterThan(800);
  expect(await hero.locator('canvas').evaluate(c => (c as HTMLCanvasElement).width)).toBe(Math.round(css * 1.5));
  await context.close();
});

test('under sustained load the drawing resolution steps down; the layout and CSS size never change', async ({ browser, testPage }) => {
  const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 900, height: 700 } });
  const page = await context.newPage();
  const errors = collectErrors(page);
  await page.goto(`${testPage}?view=sizes&sizes=400`);
  const orb = page.getByRole('img', { name: 'size 400, idle' });
  await expect(orb).toHaveAttribute('data-ready', 'true');
  const canvas = orb.locator('canvas');
  const box = await orb.boundingBox();
  expect(await canvas.evaluate(c => (c as HTMLCanvasElement).width)).toBe(400);
  // Every frame busy for 70 ms: the loop falls to ~14 fps, well under its 30.
  await page.evaluate(() => {
    const burn = () => { const t = performance.now(); while (performance.now() - t < 70); requestAnimationFrame(burn); };
    requestAnimationFrame(burn);
  });
  // One step at a time (1 → 0.8 → 0.65 → 0.5): 320, 260 or 200 device px.
  await expect.poll(() => canvas.evaluate(c => (c as HTMLCanvasElement).width), { timeout: 20000 }).toBeLessThan(400);
  const [w, h] = await canvas.evaluate(c => [(c as HTMLCanvasElement).width, (c as HTMLCanvasElement).height]);
  expect([320, 260, 200]).toContain(w);
  expect(h).toBe(w);
  expect(await orb.boundingBox()).toEqual(box);
  expect(await canvas.evaluate(c => (c as HTMLElement).offsetWidth)).toBe(400);
  await expect(orb).toHaveAttribute('data-ready', 'true');
  expect(errors.filter(e => !/GPU stall due to ReadPixels/.test(e))).toEqual([]);
  await context.close();
});

for (const bg of ['dark', 'light'] as const) {
  test(`small sizes keep reading as the marble (20, 32, 48, 240 px on ${bg})`, async ({ browser, testPage }) => {
    const context = await browser.newContext({ deviceScaleFactor: 2 });
    const page = await context.newPage();
    for (const state of ['idle', 'speaking']) {
      await page.goto(`${testPage}?view=sizes&sizes=20,32,48,240&bg=${bg}&state=${state}`);
      for (const orb of await page.locator('[data-talking-marble]').all()) await expect(orb).toHaveAttribute('data-ready', 'true');
      await page.waitForTimeout(300);
      await page.locator('.row').screenshot({ path: `test-results/package/sizes-${state}-${bg}.png` });
    }
    // Below 32 px nothing moves the whole marble (it would jog a line of text).
    const small = page.getByRole('img', { name: 'size 20, speaking' }).locator('> span').first();
    const transforms = new Set<string>();
    for (let i = 0; i < 6; i++) { transforms.add(await small.evaluate(el => (el as HTMLElement).style.transform)); await page.waitForTimeout(80); }
    expect([...transforms]).toEqual(['']);
    await context.close();
  });
}

test('emotions layer on a state: happy bounces, muted ignores audio, custom emotions work', async ({ page, testPage }) => {
  await page.goto(testPage);
  const inner = page.locator('[data-talking-marble] > span').first();
  const transforms = async () => {
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) { seen.add(await inner.evaluate(el => (el as HTMLElement).style.transform)); await page.waitForTimeout(70); }
    return seen;
  };
  await page.evaluate(() => window.harness.render({ state: 'idle' }));
  await expect(page.locator('[data-talking-marble]')).toHaveAttribute('data-ready', 'true');
  expect([...(await transforms())]).toEqual(['']);
  await page.evaluate(() => window.harness.render({ state: 'idle', emotion: 'happy' }));
  await expect(page.locator('[data-talking-marble]')).toHaveAttribute('data-emotion', 'happy');
  await page.waitForTimeout(1200);
  expect((await transforms()).size).toBeGreaterThan(4);

  // muted on speaking: reactivity 1 → 0.35, so a full voice gives a smaller halo swell.
  await page.evaluate(() => window.harness.render({ state: 'probe', emotion: 'muted', presets: { probe: { halo: 0, reactivity: 1 } }, level: 1 }));
  await page.waitForTimeout(1500);
  const muted = Number(await page.locator('[data-halo]').evaluate(el => (el as HTMLElement).style.opacity));
  // halo 0 → 0.15 × 0.65 ≈ 0.098, plus level 0.35 × 0.4 = 0.14.
  expect(muted).toBeGreaterThan(0.2);
  expect(muted).toBeLessThan(0.28);

  await page.evaluate(() => window.harness.render({ state: 'idle', emotion: 'giddy', presets: { giddy: { bounce: 1, sway: 1 } } }));
  await page.waitForTimeout(1200);
  expect((await transforms()).size).toBeGreaterThan(4);
});

test('whole-marble movement never moves the layout or touches the user style', async ({ page, testPage }) => {
  await page.goto(testPage);
  const style = { margin: '40px', outline: '1px solid red' };
  await page.evaluate(style => window.harness.render({ state: 'speaking', emotion: 'happy', level: 0.8, style }), style);
  const orb = page.locator('[data-talking-marble]');
  await expect(orb).toHaveAttribute('data-ready', 'true');
  const box = await orb.boundingBox();
  const styleAttr = await orb.getAttribute('style');
  const after = page.locator('#root');
  const rootBox = await after.boundingBox();
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(60);
    expect(await orb.boundingBox()).toEqual(box);
    expect(await orb.getAttribute('style')).toBe(styleAttr);
    expect(await after.boundingBox()).toEqual(rootBox);
  }
  expect(styleAttr).toContain('outline: 1px solid red');
  expect(await orb.locator('> span').first().evaluate(el => (el as HTMLElement).style.transform)).not.toBe('');
});

test('error shakes on entry and beats; springs carry a state change without a jump', async ({ page, testPage }) => {
  await page.goto(testPage);
  await page.evaluate(() => window.harness.render({ state: 'idle' }));
  await expect(page.locator('[data-talking-marble]')).toHaveAttribute('data-ready', 'true');
  const inner = page.locator('[data-talking-marble] > span').first();
  await page.evaluate(() => window.harness.render({ state: 'error' }));
  const xs: number[] = [];
  for (let i = 0; i < 12; i++) {
    xs.push(await inner.evaluate(el => Number(/translate\(([-\d.]+)%/.exec((el as HTMLElement).style.transform)?.[1] ?? 0)));
    await page.waitForTimeout(35);
  }
  // A shake: the marble jitters side to side right after entering error.
  expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.5);
});
