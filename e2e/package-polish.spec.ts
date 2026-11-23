// M3 polish: halo, CSS fallback, WebGL context loss, reduced motion, paused, accessibility.
import type { Locator, Page } from '@playwright/test';
import { expect, haloOpacity, test } from '../packages/react/test/page/fixture';

const orb = (page: Page) => page.locator('[data-talking-marble]');

/** Luma spread of an element's screenshot: 0 for a blank or flat picture. */
async function spread(page: Page, target: Locator) {
  const png = (await target.screenshot()).toString('base64');
  return page.evaluate(async data => {
    const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    let s = 0, s2 = 0;
    const n = px.length / 4;
    for (let i = 0; i < px.length; i += 4) { const l = 0.2126 * px[i]! + 0.7152 * px[i + 1]! + 0.0722 * px[i + 2]!; s += l; s2 += l * l; }
    return Math.sqrt(s2 / n - (s / n) ** 2);
  }, png);
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  return errors;
}

test('the halo shows by default, follows the state, and halo={false} hides it without moving anything', async ({ page, testPage }) => {
  // Resting (idle) at the viewport's right edge: the halo is paint only and adds no scroll overflow. (A moving
  // marble may paint a little past its box, as any transform does; its layout box never moves.)
  await page.goto(testPage);
  await page.addStyleTag({ content: '#root { padding: 0; }' });
  const width = page.viewportSize()!.width;
  const style = { marginLeft: `${width - 200}px` };
  await page.evaluate(style => window.harness.render({ state: 'idle', style }), style);
  await expect(orb(page)).toHaveAttribute('data-ready', 'true');
  const halo = page.locator('[data-halo]');
  await expect(halo).toBeVisible();
  await expect.poll(() => haloOpacity(page)).toBeCloseTo(0.5, 2);
  expect(await halo.evaluate(el => (el as HTMLElement).style.boxShadow)).toMatch(/rgba\(/);
  const withHalo = await orb(page).boundingBox();
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow()).toBe(0);
  await page.screenshot({ path: 'test-results/package/halo-on.png', clip: { x: width - 320, y: 0, width: 320, height: 300 } });

  await page.evaluate(style => window.harness.render({ state: 'idle', style, halo: false }), style);
  await expect(halo).toBeHidden();
  expect(await orb(page).boundingBox()).toEqual(withHalo);
  expect(await overflow()).toBe(0);
});

test('without WebGL2 the CSS fallback shows the orb in its palette, dimmed to the state', async ({ page, testPage }) => {
  const errors = collectErrors(page);
  await page.addInitScript(() => {
    for (const proto of [HTMLCanvasElement.prototype, OffscreenCanvas.prototype] as { getContext: (...a: unknown[]) => unknown }[]) {
      const original = proto.getContext;
      proto.getContext = function (this: unknown, type: unknown, ...rest: unknown[]) {
        return type === 'webgl2' ? null : original.call(this, type, ...rest);
      };
    }
  });
  await page.goto(testPage);
  await page.evaluate(() => window.harness.render({ state: 'idle', palette: 'ember' }));
  const fallback = page.locator('[data-fallback]');
  await expect(orb(page)).toHaveAttribute('data-ready', 'false');
  await expect(fallback).toBeVisible();
  expect(await fallback.evaluate(el => getComputedStyle(el).backgroundImage)).toMatch(/radial-gradient.*rgb\(255, 96, 40\)/);
  expect(await spread(page, orb(page))).toBeGreaterThan(8);
  await page.screenshot({ path: 'test-results/package/fallback-ember.png', clip: { x: 0, y: 0, width: 280, height: 280 } });

  // The state still reads, through brightness only (one material): error dims the picture and its halo.
  await page.evaluate(() => window.harness.render({ state: 'error', palette: 'ember' }));
  await expect.poll(() => fallback.evaluate(el => (el as HTMLElement).style.filter), { timeout: 5000 }).toBe('brightness(0.85)');
  await expect.poll(() => haloOpacity(page)).toBeLessThan(0.66);
  expect(errors).toEqual([]);
});

test('a lost WebGL context shows the fallback, and the orb comes back on restore', async ({ page, testPage }) => {
  const errors = collectErrors(page);
  await page.goto(testPage);
  await page.evaluate(() => window.harness.render({ state: 'speaking' }));
  await expect(orb(page)).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('[data-fallback]')).toBeHidden();

  await page.evaluate(() => {
    // Every marble draws through one shared context, on a hidden canvas.
    const gl = (window.harness as unknown as { sharedCanvas(): HTMLCanvasElement }).sharedCanvas().getContext('webgl2')!;
    (window as unknown as { lose: WEBGL_lose_context }).lose = gl.getExtension('WEBGL_lose_context')!;
    (window as unknown as { lose: WEBGL_lose_context }).lose.loseContext();
  });
  await expect(orb(page)).toHaveAttribute('data-ready', 'false');
  await expect(page.locator('[data-fallback]')).toBeVisible();

  await page.evaluate(() => (window as unknown as { lose: WEBGL_lose_context }).lose.restoreContext());
  await expect(orb(page)).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('[data-fallback]')).toBeHidden();
  await page.waitForTimeout(200);
  expect(await spread(page, page.locator('canvas'))).toBeGreaterThan(8);
  // It animates again.
  const a = await page.locator('canvas').screenshot();
  await page.waitForTimeout(300);
  expect(a.equals(await page.locator('canvas').screenshot())).toBe(false);
  expect(errors).toEqual([]);
});

test('reduced motion: the orb is still, states still show, and the halo follows the level', async ({ page, testPage }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(testPage);
  await page.evaluate(() => window.harness.render({ state: 'connecting' }));
  await expect(orb(page)).toHaveAttribute('data-ready', 'true');
  await page.waitForTimeout(300);
  const inner = page.locator('[data-talking-marble] > span').first();
  const canvas = page.locator('canvas');
  const a = await canvas.screenshot();
  await page.waitForTimeout(500);
  expect((await canvas.screenshot()).equals(a)).toBe(true);
  // No breath, beat or bob: only connecting's smaller size, held still.
  expect(await inner.evaluate(el => (el as HTMLElement).style.transform)).toBe('translate(0%, 0%) rotate(0deg) scale(0.9, 0.9)');

  // States still change the picture (brightness and size spring), then hold still.
  await page.evaluate(() => window.harness.render({ state: 'error' }));
  // The springs land exactly after about 1.5 s; wait well past it.
  await page.waitForTimeout(3000);
  const b = await canvas.screenshot();
  expect(b.equals(a)).toBe(false);
  await page.waitForTimeout(400);
  expect((await canvas.screenshot()).equals(b)).toBe(true);

  // Audio moves the halo, not the flow.
  await page.evaluate(() => window.harness.render({ state: 'probe', presets: { probe: { halo: 0, reactivity: 1 } }, level: 0.5 }));
  await expect.poll(() => haloOpacity(page)).toBeCloseTo(0.2, 2);
  await page.waitForTimeout(3000); // the springs finish from error
  const c = await canvas.screenshot();
  await page.waitForTimeout(400);
  expect((await canvas.screenshot()).equals(c)).toBe(true);
});

test('paused holds the frame; unpausing resumes', async ({ page, testPage }) => {
  await page.goto(testPage);
  await page.evaluate(() => window.harness.render({ state: 'thinking', paused: true }));
  await expect(orb(page)).toHaveAttribute('data-ready', 'true');
  const canvas = page.locator('canvas');
  const a = await canvas.screenshot();
  await page.waitForTimeout(400);
  expect((await canvas.screenshot()).equals(a)).toBe(true);
  await page.evaluate(() => window.harness.render({ state: 'thinking', paused: false }));
  await page.waitForTimeout(400);
  expect((await canvas.screenshot()).equals(a)).toBe(false);
});

test('an image named for its state by default; label, aria-label and decorative', async ({ page, testPage }) => {
  await page.goto(testPage);
  const render = (props: Record<string, unknown>) => page.evaluate(p => window.harness.render({ 'aria-label': undefined, ...p }), props);
  await render({ state: 'listening' });
  await expect(page.getByRole('img', { name: 'Assistant, listening' })).toBeVisible();
  await render({ state: 'speaking', label: 'Nova', emotion: 'happy' });
  await expect(page.getByRole('img', { name: 'Nova, speaking, happy' })).toBeVisible();
  await render({ state: 'wow', presets: { wow: { bounce: 1, label: 'celebrating' } } });
  await expect(page.getByRole('img', { name: 'Assistant, celebrating' })).toBeVisible();
  await render({ state: 'speaking', 'aria-label': 'Voice assistant' });
  await expect(page.getByRole('img', { name: 'Voice assistant' })).toBeVisible();
  await render({ state: 'speaking', decorative: true });
  await expect(orb(page)).toHaveAttribute('aria-hidden', 'true');
  await expect(orb(page)).not.toHaveAttribute('role', /./);
});
