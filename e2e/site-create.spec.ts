import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { goToShot, option, settled, skipIntro, trackErrors } from './site-helpers';

const { default: AxeBuilder } = createRequire(new URL('../apps/site/package.json', import.meta.url))('@axe-core/playwright') as typeof import('@axe-core/playwright');

const create = (page: Page) => page.locator('#create');
const stage = (page: Page) => page.getByTestId('main-marble');
const step = (page: Page, name: string) => create(page).locator('.steps').getByRole('button', { name, exact: true });
const STEPS = ['Name', 'Colours', 'Motion', 'Try it', 'Code'];
const UNPAINTED = '#ededeb #c9c9c6 #b1b1ae #dcdcd9';

async function open(page: Page) {
  await page.goto('/');
  await skipIntro(page);
  await goToShot(page, 'Create your own');
}

test('create your own: a switch bar of steps, Name chosen first, one step shown at a time; the row never moves (F-62, F-63, F-86)', async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  const row = () => create(page).locator('.steps').evaluate(el => el.getBoundingClientRect().top);
  const at = await row();
  // A switch bar: one step is always chosen, Colours to begin with, and only it shows below.
  await expect(create(page).locator('.steps').getByRole('button')).toHaveText(STEPS);
  await expect(step(page, 'Name')).toHaveAttribute('aria-pressed', 'true');
  await expect(create(page).getByRole('textbox', { name: 'Name your marble' })).toBeVisible();
  for (const name of [...STEPS.slice(1), 'Name']) {
    await step(page, name).dispatchEvent('click');
    await expect(step(page, name)).toHaveAttribute('aria-pressed', 'true');
    await expect(create(page).locator('.steps [aria-pressed="true"]')).toHaveCount(1);
    await expect(create(page).locator('.create__step')).not.toBeEmpty();
    expect(Math.abs((await row()) - at)).toBeLessThanOrEqual(1);
  }
  // Choosing the chosen step again keeps it open.
  await step(page, 'Name').dispatchEvent('click');
  await expect(step(page, 'Name')).toHaveAttribute('aria-pressed', 'true');
  // The lit key glides to the chosen step (F-71): one key, sitting on it.
  await step(page, 'Code').dispatchEvent('click');
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
  await step(page, 'Colours').dispatchEvent('click');
  await create(page).getByRole('button', { name: /^Pigment 1: #/ }).click();
  await page.getByRole('dialog', { name: 'Pigment 1 color' }).getByRole('textbox', { name: 'Hex' }).fill('#00ff88');
  await page.keyboard.press('Enter');
  await expect(stage(page)).toHaveAttribute('data-colors', /^#\w+ #00ff88 /);
  await step(page, 'Code').dispatchEvent('click');
  await expect(create(page).locator('.create__code')).toContainText("'#00ff88'");
  await step(page, 'Colours').dispatchEvent('click');
  await create(page).getByRole('button', { name: 'Reset' }).click();
  await expect(stage(page)).toHaveAttribute('data-colors', UNPAINTED);
});

test('try it: every state and emotion, your own state too, the halo strength into the code (F-63, F-65)', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page);
  const orb = stage(page).locator('[data-talking-marble]');
  await step(page, 'Try it').dispatchEvent('click');
  for (const s of ['idle', 'listening', 'thinking', 'error']) {
    await option(create(page), 'State', s).pick();
    await expect(orb).toHaveAttribute('data-state', s);
  }
  await option(create(page), 'Emotion', 'calm').pick();
  await expect(orb).toHaveAttribute('data-emotion', 'calm');
  await create(page).getByRole('slider', { name: /Halo/ }).fill('0.5');
  await step(page, 'Code').dispatchEvent('click');
  await expect(create(page).locator('.create__code')).toContainText('halo={0.5}');
  // Motion makes a state of your own; it joins Try it; its name goes into the code and the export.
  await step(page, 'Motion').dispatchEvent('click');
  await create(page).getByRole('slider', { name: /^Speed/ }).fill('3');
  await expect(orb).toHaveAttribute('data-state', 'mine');
  await step(page, 'Try it').dispatchEvent('click');
  await expect(option(create(page), 'State', 'mine').opt).toBeAttached();
  // Naming it (F-86) names its state and its label: "Sparkle" → presets={{ sparkle }}, label="Sparkle".
  await step(page, 'Name').dispatchEvent('click');
  await create(page).getByRole('textbox', { name: 'Name your marble' }).fill('Sparkle');
  await expect(stage(page).locator('[data-talking-marble]')).toHaveAttribute('aria-label', /^Sparkle, /);
  await step(page, 'Code').dispatchEvent('click');
  await expect(create(page).locator('.create__code')).toContainText('label="Sparkle"');
  await expect(create(page).locator('.create__code')).toContainText('presets={{ sparkle: { speed: 3');
  await create(page).getByRole('button', { name: /Export preset/ }).click();
  const json = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
  expect(json.sparkle.speed).toBe(3);
  // A built-in's name never replaces the built-in: "Idle" becomes myidle.
  await step(page, 'Name').dispatchEvent('click');
  await create(page).getByRole('textbox', { name: 'Name your marble' }).fill('Idle');
  await step(page, 'Code').dispatchEvent('click');
  await expect(create(page).locator('.create__code')).toContainText('presets={{ myidle: {');
  await step(page, 'Name').dispatchEvent('click');
  await create(page).getByRole('textbox', { name: 'Name your marble' }).fill('Sparkle');
  await goToShot(page, 'Guide');
  await expect(page.locator('#guide').getByLabel('usage', { exact: true })).toContainText('presets={presets}');
});

test('try it: seen in a call and a chatbox (F-99), standing in for your marble, with its name', async ({ page }) => {
  await open(page);
  await step(page, 'Name').dispatchEvent('click');
  await create(page).getByRole('textbox', { name: 'Name your marble' }).fill('Nova');
  await step(page, 'Try it').dispatchEvent('click');
  await option(create(page), 'Seen in', 'Call').pick();
  await expect(page.locator('.demo__call')).toBeVisible();
  await expect(page.locator('.demo__call-name')).toHaveText('Nova');
  await expect.poll(() => stage(page).evaluate(el => getComputedStyle(el).filter)).toBe('opacity(0)');
  // The call sits on the marble's side of the page, clear of the panel.
  const c = (await page.locator('.demo__call').boundingBox())!, panel = (await page.locator('#create .shot__panel').boundingBox())!;
  expect(c.x + c.width).toBeLessThan(panel.x);
  await option(create(page), 'Seen in', 'Chatbox').pick();
  await expect(page.locator('.demo')).toHaveAttribute('data-seen', 'bar');
  // Leaving Try it puts your marble back.
  await step(page, 'Code').dispatchEvent('click');
  await expect(page.locator('.demo__orb')).toHaveCount(0, { timeout: 3000 });
  await expect.poll(() => stage(page).evaluate(el => getComputedStyle(el).filter)).not.toBe('opacity(0)');
});

for (const scheme of ['dark'] as const) {
  test(`create your own is axe clean at every step (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#create');
    await settled(page, 'create');
    for (const name of STEPS) {
      await step(page, name).dispatchEvent('click');
      const r = await new AxeBuilder({ page }).include('#create').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(r.violations.map(v => `${name} ${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
    }
  });
}
