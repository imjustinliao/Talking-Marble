import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { goToShot, settled, skipIntro, trackErrors } from './site-helpers';

const { default: AxeBuilder } = createRequire(new URL('../apps/site/package.json', import.meta.url))('@axe-core/playwright') as typeof import('@axe-core/playwright');

const create = (page: Page) => page.locator('#create');
const stage = (page: Page) => page.getByTestId('main-marble');
const step = (page: Page, name: string) => create(page).locator('.steps').getByRole('button', { name, exact: true });
const STEPS = ['Colours', 'Motion', 'Try it', 'Code'];
const UNPAINTED = '#ededeb #c9c9c6 #b1b1ae #dcdcd9';

async function open(page: Page) {
  await page.goto('/');
  await skipIntro(page);
  await goToShot(page, 'Create your own');
}

test('create your own: a switch bar of steps, Colours chosen first, one step shown at a time; the row never moves (F-62, F-63, F-70)', async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  const row = () => create(page).locator('.steps').evaluate(el => el.getBoundingClientRect().top);
  const at = await row();
  // A switch bar: one step is always chosen, Colours to begin with, and only it shows below.
  await expect(create(page).locator('.steps .seg__opt')).toHaveText(STEPS);
  await expect(step(page, 'Colours')).toHaveAttribute('aria-pressed', 'true');
  await expect(create(page).getByRole('button', { name: /^Pigment 1: #/ })).toBeVisible();
  for (const name of [...STEPS.slice(1), 'Colours']) {
    await step(page, name).click();
    await expect(step(page, name)).toHaveAttribute('aria-pressed', 'true');
    await expect(create(page).locator('.steps [aria-pressed="true"]')).toHaveCount(1);
    await expect(create(page).locator('.create__step')).not.toBeEmpty();
    expect(Math.abs((await row()) - at)).toBeLessThanOrEqual(1);
  }
  // Choosing the chosen step again keeps it open.
  await step(page, 'Colours').click();
  await expect(step(page, 'Colours')).toHaveAttribute('aria-pressed', 'true');
  // The lit key glides to the chosen step (F-71): one key, sitting on it.
  await step(page, 'Code').click();
  await expect.poll(() => page.evaluate(() => {
    const k = document.querySelector('#create .steps .seg__glide')!.getBoundingClientRect(), b = document.querySelector('#create .steps [aria-pressed="true"]')!.getBoundingClientRect();
    return Math.abs(k.left - b.left) < 1 && Math.abs(k.width - b.width) < 1;
  })).toBe(true);
  await expect(page.locator('.strip, [role="tablist"], [role="dialog"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('it starts as a plain globe, not a palette; a colour reaches the marble and the code; Reset makes it plain again (F-61)', async ({ page }) => {
  await open(page);
  await expect(stage(page)).toHaveAttribute('data-colors', UNPAINTED);
  await step(page, 'Colours').click();
  await create(page).getByRole('button', { name: /^Pigment 1: #/ }).click();
  await page.getByRole('dialog', { name: 'Pigment 1 color' }).getByRole('textbox', { name: 'Hex' }).fill('#00ff88');
  await page.keyboard.press('Enter');
  await expect(stage(page)).toHaveAttribute('data-colors', /^#\w+ #00ff88 /);
  await step(page, 'Code').click();
  await expect(create(page).locator('.create__code')).toContainText("'#00ff88'");
  await step(page, 'Colours').click();
  await create(page).getByRole('button', { name: 'Reset' }).click();
  await expect(stage(page)).toHaveAttribute('data-colors', UNPAINTED);
});

test('try it: every state and emotion, your own state too, the halo strength into the code (F-63, F-65)', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page);
  const orb = stage(page).locator('[data-talking-marble]');
  await step(page, 'Try it').click();
  for (const s of ['idle', 'listening', 'thinking', 'error']) {
    await create(page).getByRole('button', { name: s, exact: true }).click();
    await expect(orb).toHaveAttribute('data-state', s);
  }
  await create(page).getByRole('button', { name: 'calm', exact: true }).click();
  await expect(orb).toHaveAttribute('data-emotion', 'calm');
  await create(page).getByRole('slider', { name: /Halo/ }).fill('0.5');
  await step(page, 'Code').click();
  await expect(create(page).locator('.create__code')).toContainText('halo={0.5}');
  // Motion makes a state of your own; it joins Try it; its name goes into the code and the export.
  await step(page, 'Motion').click();
  await create(page).getByRole('slider', { name: /^Speed/ }).fill('3');
  await expect(orb).toHaveAttribute('data-state', 'mine');
  await step(page, 'Try it').click();
  await expect(create(page).getByRole('button', { name: 'mine', exact: true })).toBeVisible();
  await step(page, 'Code').click();
  const name = create(page).getByRole('textbox', { name: /name/ });
  await name.fill('sparkle');
  await expect(create(page).locator('.create__code')).toContainText('presets={{ sparkle: { speed: 3');
  await create(page).getByRole('button', { name: /Export preset/ }).click();
  const json = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
  expect(json.sparkle.speed).toBe(3);
  await name.fill('idle');
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(create(page).getByRole('button', { name: /Export preset/ })).toHaveCount(0);
  await name.fill('sparkle');
  await goToShot(page, 'Guide');
  await expect(page.locator('#guide').getByLabel('usage', { exact: true })).toContainText('presets={presets}');
});

test('try it: Talk without a mic is a simulated conversation on your marble; End returns', async ({ page }) => {
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('no', 'NotAllowedError')); });
  await open(page);
  await step(page, 'Try it').click();
  await create(page).getByRole('button', { name: 'Talk' }).click();
  const orb = stage(page).locator('[data-talking-marble]');
  await expect(orb).toHaveAttribute('data-state', 'listening');
  await expect(orb).toHaveAttribute('data-state', 'thinking', { timeout: 6000 });
  await create(page).getByRole('button', { name: 'End' }).click();
  await expect(create(page).getByRole('button', { name: 'Talk' })).toBeVisible();
});

for (const scheme of ['dark'] as const) {
  test(`create your own is axe clean at every step (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#create');
    await settled(page, 'create');
    for (const name of STEPS) {
      await step(page, name).click();
      const r = await new AxeBuilder({ page }).include('#create').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(r.violations.map(v => `${name} ${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
    }
  });
}
