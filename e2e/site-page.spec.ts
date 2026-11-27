import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';
import { goToShot, skipIntro, trackErrors, walk } from './site-helpers';

// @axe-core/playwright is a site dev dependency (root dev tools are Main's), so resolve it from apps/site/.
const { default: AxeBuilder } = createRequire(new URL('../apps/site/package.json', import.meta.url))('@axe-core/playwright') as typeof import('@axe-core/playwright');

test('the page: intro, palettes, all six, create your own, guide, footer, in order, with no console errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  expect(await page.locator('main > section').evaluateAll(els => els.map(e => e.id))).toEqual(['top', 'palettes', 'all', 'create', 'guide']);
  await expect(page.getByRole('heading', { level: 1, name: 'Talking Marble' })).toBeVisible();
  await expect(page.locator('.hero__line')).toHaveText('An audio-reactive orb for voice AI apps. React, open source.');
  // The intro is complete on its own, and nothing asks you to scroll (F-22, F-25).
  await expect(page.getByText('Scroll to try it')).toHaveCount(0);
  await expect(page.locator('[data-testid="main-marble"] [data-talking-marble]')).toHaveAttribute('data-ready', 'true');
  // The top bar is the logo and the name only (F-30, F-31); Docs and GitHub are buttons in the intro and the Guide.
  await expect(page.locator('.topbar a, .topbar button')).toHaveCount(1);
  await expect(page.locator('.topbar .brand')).toHaveText('Talking Marble');
  await expect(page.locator('.topbar .brand [data-talking-marble]')).toBeAttached();
  for (const shot of ['#top', '#guide']) {
    await expect(page.locator(shot).getByRole('link', { name: 'Docs', exact: true })).toHaveAttribute('href', '/docs/');
    await expect(page.locator(shot).getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute('href', 'https://github.com/imjustinliao/Talking-Marble');
  }
  for (const name of ['Palettes', /^All palettes/, 'Create your own', 'Guide']) await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeAttached();
  // The old sections are gone (F-22).
  await expect(page.locator('#states, #in-context, #playground, #install, #colors')).toHaveCount(0);
  const footer = page.locator('footer');
  await expect(footer).toContainText('MIT © Justin Liao');
  // Follow: X and GitHub, @imjustinliao, with their icons (F-32). No theme switch: dark only (F-77).
  const follow = footer.getByRole('navigation', { name: 'Follow' });
  await expect(follow.getByRole('link', { name: 'X, @imjustinliao' })).toHaveAttribute('href', 'https://x.com/imjustinliao');
  await expect(follow.getByRole('link', { name: 'GitHub, @imjustinliao' })).toHaveAttribute('href', 'https://github.com/imjustinliao');
  await expect(follow.locator('svg')).toHaveCount(2);
  await expect(footer.getByRole('button', { name: /Switch to (light|dark) mode/ })).toHaveCount(0);
  await walk(page);
  expect(errors).toEqual([]);
});

test('the install command copies with one control', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  // Located by its place: its accessible name changes to "Copied" for a moment.
  const pill = page.locator('.hero .install-pill');
  await expect(pill).toHaveAccessibleName(/install command/);
  await expect(pill.locator('button')).toHaveCount(0);
  await pill.click();
  await expect(pill).toHaveAttribute('data-status', 'copied');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('npm i talking-marble');
});

test('every marble on the page draws from one shared WebGL context', async ({ page }) => {
  // The package renders all marbles with one context and pauses offscreen ones, so the site mounts them all (M9).
  await page.addInitScript(() => {
    const w = window as unknown as { __gl: number };
    w.__gl = 0;
    for (const C of [HTMLCanvasElement, OffscreenCanvas] as const) {
      const get = C.prototype.getContext as (this: unknown, type: string, ...rest: unknown[]) => unknown;
      C.prototype.getContext = function (this: unknown, type: string, ...rest: unknown[]) {
        // The fog behind the scene (F-54) has its own context; this counts the marbles'.
        const fog = this instanceof HTMLCanvasElement && this.hasAttribute('data-fog');
        if ((type === 'webgl2' || type === 'webgl') && !fog) w.__gl++;
        return get.call(this, type, ...rest);
      } as typeof C.prototype.getContext;
    }
  });
  await page.goto('/');
  await walk(page);
  const marbles = page.locator('[data-talking-marble]');
  // The six on the walk, the stage marble and the logo; plus, on the walk, the demo's marble standing in for the front
  // one (F-102), which hands back when you leave. Every marble there is draws, through the one context.
  await expect.poll(() => marbles.evaluateAll(els => els.length >= 8 && els.length <= 9 && els.every(e => e.getAttribute('data-ready') === 'true'))).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { __gl: number }).__gl)).toBe(1);
});

test('dark only, for everyone: no theme switch, and an old light choice is ignored (F-77)', async ({ page }) => {
  const dark = () => page.evaluate(() => { const [r, g, b] = (getComputedStyle(document.body).backgroundColor.match(/\d+/g) ?? ['255', '255', '255']).map(Number); return `${r! + g! + b! < 60}`; });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => { try { localStorage.setItem('talking-marble-theme', 'light'); } catch { /* none */ } });
  for (const path of ['/', '/docs/']) {
    await page.goto(path);
    await expect.poll(dark).toBe('true');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    await expect(page.getByRole('button', { name: /Switch to (light|dark) mode/ })).toHaveCount(0);
  }
});

test('keyboard only: skip link; a switch bar is one Tab stop on its choice, the arrow keys choose (F-90); visible focus', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  const bar = page.locator('#palettes').getByRole('group', { name: 'State', exact: true });
  const chosen = bar.locator('[aria-pressed="true"]');
  await chosen.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(chosen).toBeFocused();
  expect(await chosen.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  // speaking → searching → thinking
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  const word = bar.getByRole('button', { name: 'thinking', exact: true });
  await expect(word).toHaveAttribute('aria-pressed', 'true');
  await expect(word).toBeFocused();
  await expect(page.locator('.gmarble__orb [data-talking-marble]').first()).toHaveAttribute('data-state', 'thinking');
});

for (const scheme of ['dark'] as const) {
  for (const path of ['/', '/docs/']) {
    test(`axe finds no accessibility violations on ${path} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      if (path === '/') await walk(page);
      await page.waitForTimeout(400);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }
}

test('the launch film (F-114): Watch the film opens it over the page; it plays, pauses, and Esc closes it', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await skipIntro(page);
  const open = page.getByRole('button', { name: 'Watch the film' });
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Talking Marble launch film' });
  await expect(dialog).toBeVisible();
  const video = dialog.locator('video');
  // Two sources: GitHub through jsDelivr, then the site's own copy; the poster loads at once.
  await expect(video.locator('source')).toHaveCount(2);
  expect(await video.getAttribute('poster')).toContain('launch-poster.jpg');
  // Play and pause from its one key (headless browsers may refuse to start audio, so the key is driven directly).
  await video.evaluate(v => { (v as HTMLVideoElement).muted = true; });
  // It starts playing as it opens where the browser allows sound; otherwise its key starts it.
  if (await video.evaluate(v => (v as HTMLVideoElement).paused)) await dialog.getByRole('button', { name: 'Play' }).click();
  await expect.poll(() => video.evaluate(v => !(v as HTMLVideoElement).paused), { timeout: 5000 }).toBe(true);
  await dialog.getByRole('button', { name: 'Pause' }).click();
  await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
  // The scrubber moves the film, and the time says where it is (F-115).
  await dialog.getByRole('slider', { name: 'Seek' }).fill('20');
  await expect.poll(() => video.evaluate(v => Math.round((v as HTMLVideoElement).currentTime))).toBe(20);
  await expect(dialog.locator('.film__time')).toHaveText(/^0:20 \/ 0:3\d$/);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
  expect(errors).toEqual([]);
});
