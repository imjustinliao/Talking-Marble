import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';
import { home, mainOrb, shot, toShot, trackErrors, type ShotId } from './site-helpers';

// @axe-core/playwright is a site dev dependency (docs/parallel-plan.md: root dev tools are Main's), so resolve it from apps/site/.
const { default: AxeBuilder } = createRequire(new URL('../apps/site/package.json', import.meta.url))('@axe-core/playwright') as typeof import('@axe-core/playwright');
const SHOTS: ShotId[] = ['intro', 'colors', 'pick', 'talk', 'install'];
/** Sets a palette colour with the site's own picker: open the swatch, type the hex, Enter. */
async function setColor(page: import('@playwright/test').Page, label: string, hex: string) {
  await shot(page, 'colors').getByRole('button', { name: new RegExp(`^${label}:`) }).click();
  const box = page.getByRole('dialog', { name: `${label} color` }).getByRole('textbox', { name: 'Hex' });
  await box.fill(hex);
  await box.press('Enter');
  await expect(page.getByRole('dialog', { name: `${label} color` })).toHaveCount(0);
}
const worldTransform = (page: import('@playwright/test').Page) => page.locator('.world').evaluate(el => (el as HTMLElement).style.transform);

test('the intro plays on load, then the wide shot: one live shot at a time, no console errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.locator('.experience')).toHaveAttribute('data-intro', 'play');
  await expect(page.getByRole('heading', { level: 1, name: 'Talking Marble' })).toBeVisible();
  expect(await page.locator('main > section').evaluateAll(els => els.map(e => e.id))).toEqual(SHOTS);
  // Words and controls belong to their shot: only the wide shot is reachable now.
  await expect(shot(page, 'intro')).toHaveClass(/is-on/);
  for (const id of SHOTS.slice(1)) await expect(shot(page, id)).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0);
  await page.waitForTimeout(3000); // the intro ends by itself
  await expect(mainOrb(page)).toHaveAttribute('data-state', /idle|listening|thinking|speaking|connecting/);
  for (const id of SHOTS) await toShot(page, id);
  await expect(shot(page, 'install')).toContainText('MIT © Justin Liao');
  await expect(page.getByRole('link', { name: 'Docs' }).last()).toHaveAttribute('href', '/docs/');
  expect(errors).toEqual([]);
});

test('any key skips the intro', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.experience')).toHaveAttribute('data-intro', 'play');
  await page.keyboard.press('Shift');
  await expect(page.locator('.experience')).toHaveAttribute('data-intro', 'skip');
  await expect(page.getByRole('button', { name: 'Talk to it' })).toBeVisible();
});

test('scrolling moves the camera between shots; the index and progress line follow', async ({ page }) => {
  await home(page);
  const before = await worldTransform(page);
  await page.mouse.wheel(0, 900);
  await expect(shot(page, 'colors')).toHaveClass(/is-on/, { timeout: 5000 });
  await expect.poll(() => worldTransform(page)).not.toBe(before);
  const scenes = page.getByRole('navigation', { name: 'Scenes' });
  await expect(scenes.getByRole('link', { name: /Colors/ })).toHaveAttribute('aria-current', 'step');
  await expect.poll(() => page.locator('.progress__fill').evaluate(el => (el as HTMLElement).style.transform)).toMatch(/scaleY\(0\.1/);
  // The camera settles: the transform stops changing.
  await page.waitForTimeout(3000);
  const a = await worldTransform(page);
  await page.waitForTimeout(300);
  expect(await worldTransform(page)).toBe(a);
});

test('keyboard: Page Down / Page Up jump between shots', async ({ page }) => {
  await home(page);
  await page.keyboard.press('PageDown');
  await expect(shot(page, 'colors')).toHaveClass(/is-on/);
  await page.keyboard.press('PageDown');
  await expect(shot(page, 'pick')).toHaveClass(/is-on/);
  await page.keyboard.press('PageUp');
  await expect(shot(page, 'colors')).toHaveClass(/is-on/);
  // The index works from the keyboard too.
  await page.getByRole('navigation', { name: 'Scenes' }).getByRole('link', { name: /Install/ }).focus();
  await page.keyboard.press('Enter');
  await expect(shot(page, 'install')).toHaveClass(/is-on/);
});

test('wide shot: copy the install command, open the usage snippet', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await home(page);
  await page.getByRole('button', { name: /install command/ }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('npm i talking-marble');
  const usage = page.getByRole('button', { name: 'Usage', exact: true });
  await expect(page.locator('#hero-usage')).toBeHidden();
  await usage.click();
  await expect(usage).toHaveAttribute('aria-expanded', 'true');
  // It shows at once (not after the intro's delay).
  await expect(page.locator('#hero-usage')).toBeVisible({ timeout: 600 });
  await expect(page.locator('#hero-usage')).toContainText('<TalkingMarble state={agentState} audio={agentStream} />');
});

test('colors: walk the palettes, recolor one, reset it; make your own', async ({ page }) => {
  await home(page);
  await toShot(page, 'colors');
  const panel = shot(page, 'colors');
  await expect(panel.locator('.colors__name')).toHaveText('Pearl');
  await expect(panel.getByRole('button', { name: 'Reset' })).toBeDisabled();
  await panel.getByRole('button', { name: 'Next palette' }).click();
  await expect(panel.locator('.colors__name')).toHaveText('Ember');
  await setColor(page, 'Pigment 1', '#00ff88');
  await expect(panel.getByRole('button', { name: /^Pigment 1:/ })).toHaveAccessibleName('Pigment 1: #00ff88');
  await expect(panel.getByRole('button', { name: 'Reset' })).toBeEnabled();
  await panel.getByRole('button', { name: 'Reset' }).click();
  await expect(panel.getByRole('button', { name: /^Pigment 1:/ })).toHaveAccessibleName('Pigment 1: #ff6028');
  // The palette marbles are live while the curve is on screen; the one in front is focusable.
  await expect(page.locator('.cmarble [data-talking-marble]')).toHaveCount(7);
  await page.locator('.cmarble[tabindex="0"]').focus();
  await page.keyboard.press('End');
  await expect(panel.locator('.colors__name')).toHaveText('Yours');
  await setColor(page, 'Ground', '#101820');
  // The picker by keyboard: arrows move in its field, Esc closes it and returns focus.
  await panel.getByRole('button', { name: /^Pigment 2:/ }).click();
  const field = page.getByRole('slider', { name: 'Saturation and brightness' });
  await expect(field).toBeFocused();
  const before = await panel.getByRole('button', { name: /^Pigment 2:/ }).getAttribute('aria-label');
  await page.keyboard.press('ArrowDown');
  await expect(panel.getByRole('button', { name: /^Pigment 2:/ })).not.toHaveAccessibleName(before!);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Pigment 2 color' })).toHaveCount(0);
  await expect(panel.getByRole('button', { name: /^Pigment 2:/ })).toBeFocused();
});

test('pick one, then the demo and the install code use it', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await home(page);
  await toShot(page, 'colors');
  await shot(page, 'colors').getByRole('button', { name: 'Next palette' }).click();
  await expect(shot(page, 'colors').locator('.colors__name')).toHaveText('Ember');
  await setColor(page, 'Ground', '#222222');
  await toShot(page, 'pick');
  const curve = page.getByRole('group', { name: 'Pick a palette' });
  await curve.getByRole('button', { name: 'Ink' }).click();
  await expect(curve.getByRole('button', { name: 'Ink' })).toHaveAttribute('aria-pressed', 'true');
  await expect(shot(page, 'pick')).toContainText('Ink');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--marble').trim())).toBe('#6b68df');
  // Keyboard: arrows move the pick along the curve.
  await curve.getByRole('button', { name: 'Ink' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(curve.getByRole('button', { name: 'Lagoon' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(curve.getByRole('button', { name: 'Ember' })).toHaveAttribute('aria-pressed', 'true');
  await expect(shot(page, 'pick')).toContainText('Ember (edited)');
  await shot(page, 'pick').getByRole('button', { name: 'Try it' }).click();
  await expect(shot(page, 'talk')).toHaveClass(/is-on/, { timeout: 5000 });
  await toShot(page, 'install');
  await shot(page, 'install').getByRole('button', { name: 'Copy Your marble' }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("palette={['#222222', '#ff6028', '#931c30', '#ffc43d']}");
});

test('reduced motion: no intro, no camera moves; shots change in place', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.experience')).not.toHaveAttribute('data-intro');
  await expect(page.getByRole('button', { name: 'Talk to it' })).toBeVisible();
  await page.keyboard.press('PageDown');
  await expect(shot(page, 'colors')).toHaveClass(/is-on/);
  const a = await worldTransform(page);
  await page.waitForTimeout(120);
  expect(await worldTransform(page)).toBe(a); // already there: no glide
});

for (const [name, setup] of [
  ['the first shot', async () => {}],
  ['the colors shot', async (p: import('@playwright/test').Page) => toShot(p, 'colors')],
  ['the pick shot', async (p: import('@playwright/test').Page) => toShot(p, 'pick')],
  ['the talk shot', async (p: import('@playwright/test').Page) => toShot(p, 'talk')],
  ['the install shot', async (p: import('@playwright/test').Page) => toShot(p, 'install')],
] as const) {
  test(`axe finds no accessibility violations in ${name}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await setup(page);
    await page.waitForTimeout(1000); // the shot's fade (reduced motion keeps a short one)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

test('axe finds no accessibility violations on /docs/', async ({ page }) => {
  await page.goto('/docs/');
  await page.waitForTimeout(1200); // the text fades in first
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
});
