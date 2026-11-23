import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';
import { preview, trackErrors, walk } from './site-helpers';

// @axe-core/playwright is a site dev dependency (root dev tools are Main's), so resolve it from apps/site/.
const { default: AxeBuilder } = createRequire(new URL('../apps/site/package.json', import.meta.url))('@axe-core/playwright') as typeof import('@axe-core/playwright');

const STATES = ['idle', 'connecting', 'listening', 'thinking', 'speaking', 'error'];
const EMOTIONS = ['happy', 'calm', 'muted'];

test('the page: hero, states, in context, footer, in order, with no console errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  expect(await page.locator('main > section').evaluateAll(els => els.map(e => e.id))).toEqual(['top', 'states', 'in-context']);
  await expect(page.getByRole('heading', { level: 1, name: 'Talking Marble' })).toBeVisible();
  await expect(page.locator('.hero__line')).toHaveText('An audio-reactive orb for voice AI apps. React, open source.');
  await expect(page.locator('.hero [data-talking-marble]')).toHaveAttribute('data-ready', 'true');
  const links = page.getByRole('navigation', { name: 'Get started' });
  await expect(links.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs/');
  await expect(links.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/imjustinliao/Talking-Marble');
  for (const name of ['States', 'In context']) await expect(page.getByRole('heading', { level: 2, name })).toBeAttached();
  const footer = page.locator('footer');
  await expect(footer).toContainText('MIT © Justin Liao');
  await expect(footer.getByRole('link', { name: 'npm' })).toHaveAttribute('href', 'https://www.npmjs.com/package/talking-marble');
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

test('states: a live card for every state and emotion; choosing one shows it large', async ({ page }) => {
  await page.goto('/');
  await page.locator('#states').scrollIntoViewIfNeeded();
  const grid = page.getByRole('group', { name: 'Choose a state or emotion' });
  await expect(grid.getByRole('button')).toHaveCount(STATES.length + EMOTIONS.length);
  for (const name of [...STATES, ...EMOTIONS]) {
    const card = grid.getByRole('button', { name, exact: true });
    await expect(card.locator('[data-talking-marble]')).toHaveAttribute('data-state', name);
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(preview(page)).toHaveAttribute('data-state', name);
    await expect(page.locator('.states__name')).toHaveText(`state="${name}"`);
  }
  // The inline pills: a 20 px marble beside its status.
  const pills = page.getByRole('list', { name: 'Inline status' }).getByRole('listitem');
  await expect(pills).toHaveText(['Listening…', 'Thinking…', 'Speaking…']);
  await expect(pills.first().locator('[data-talking-marble]')).toHaveCSS('width', '20px');
});

test('in context: three everyday UIs, each with a live marble', async ({ page }) => {
  await page.goto('/');
  await page.locator('#in-context').scrollIntoViewIfNeeded();
  const figures = page.locator('#in-context figure');
  await expect(figures).toHaveCount(3);
  await expect(figures.locator('figcaption')).toContainText(['Chat input with a voice button.', 'Full-screen call.', 'Inline chat message.']);
  for (const [i, state] of [[0, 'listening'], [1, 'speaking'], [2, 'thinking']] as const) {
    await expect(figures.nth(i).locator('[data-talking-marble]')).toHaveAttribute('data-state', state);
  }
});

test('offscreen marbles are not live (each is a WebGL context)', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  const atTop = await page.locator('canvas').count();
  expect(atTop).toBeLessThanOrEqual(3);
  await page.locator('#in-context').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  expect(await page.locator('.hero [data-talking-marble]').count()).toBe(0);
  expect(await page.locator('canvas').count()).toBeLessThanOrEqual(14);
});

test('themes: dark by default, light from the system, and a toggle', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await expect.poll(bg).toBe('rgb(11, 11, 13)');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect.poll(bg).toBe('rgb(246, 246, 244)');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect.poll(bg).toBe('rgb(11, 11, 13)');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect.poll(bg).toBe('rgb(246, 246, 244)');
});

test('keyboard only: skip link, cards by Tab and Enter, visible focus', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  const card = page.getByRole('button', { name: 'thinking', exact: true });
  await card.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(card).toBeFocused();
  expect(await card.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(preview(page)).toHaveAttribute('data-state', 'thinking');
});

for (const scheme of ['dark', 'light'] as const) {
  for (const path of ['/', '/docs/']) {
    test(`axe finds no accessibility violations on ${path} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(path);
      if (path === '/') await walk(page);
      await page.waitForTimeout(400);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }
}
