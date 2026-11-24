import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { goToShot, settled, trackErrors } from './site-helpers';

const { default: AxeBuilder } = createRequire(new URL('../apps/site/package.json', import.meta.url))('@axe-core/playwright') as typeof import('@axe-core/playwright');

const guide = (page: Page) => page.locator('#guide');

test('the guide: only what is needed (install, usage), styled as code, then Docs and GitHub (F-24, F-29, F-34)', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = trackErrors(page);
  await page.goto('/#guide');
  await settled(page, 'guide');
  await expect(guide(page).getByLabel('install command', { exact: true })).toHaveText('npm i talking-marble');
  await expect(guide(page).getByLabel('usage', { exact: true })).toHaveText("import { TalkingMarble } from 'talking-marble';\n\n<TalkingMarble\n  state={agentState}\n  audio={agentStream}\n  palette={['#ededeb', '#c9c9c6', '#b1b1ae', '#dcdcd9']}\n/>");
  await expect(guide(page).getByRole('link', { name: 'Docs', exact: true })).toHaveAttribute('href', '/docs/');
  await expect(guide(page).getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute('href', 'https://github.com/imjustinliao/Talking-Marble');
  // The code is styled as code (F-34): one panel, Install and Usage blocks, tinted with the marble's pigments.
  const panel = guide(page).locator('.panel');
  await expect(panel.locator('.block__label')).toHaveText(['Install', 'Usage']);
  await expect(panel.locator('.tok--tag').first()).toHaveText('<TalkingMarble');
  expect(await panel.locator('.tok--str').first().evaluate(el => getComputedStyle(el).color)).not.toBe(await panel.locator('pre').first().evaluate(el => getComputedStyle(el).color));
  // Where it runs today, every device with a browser; nothing "soon" (F-78). No tabs, no recipes (they live in the docs).
  await expect(guide(page).getByRole('list', { name: 'Runs on' }).getByRole('listitem')).toHaveText(['Phones', 'Tablets', 'Laptops', 'Desktop apps']);
  await expect(guide(page).getByRole('group', { name: 'Framework' }).getByRole('button')).toHaveText(['React', 'Web Component']);
  await expect(guide(page).getByText(/soon/i)).toHaveCount(0);
  await expect(guide(page).locator('[role="tablist"], .code')).toHaveCount(0);
  await expect(guide(page).getByText(/LiveKit/)).toHaveCount(0);
  // Each block copies with its own button.
  await guide(page).getByRole('button', { name: 'Copy install command', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('npm i talking-marble');
  // Copy prompt: a prompt for an AI coding agent, with this marble's install, usage and the docs.
  await guide(page).getByRole('button', { name: /^Copy prompt/ }).click();
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  expect(prompt).toContain('npm i talking-marble');
  expect(prompt).toContain("palette={['#ededeb'");
  expect(prompt).toContain('https://talking-marble.vercel.app/docs/');
  // The Web Component (PLAT-01): its own usage and prompt, with this marble's colours.
  await guide(page).getByRole('button', { name: 'Web Component', exact: true }).click();
  await expect(guide(page).getByLabel('usage', { exact: true })).toContainText("import 'talking-marble/element';");
  await expect(guide(page).getByLabel('usage', { exact: true })).toContainText('palette="#ededeb, #c9c9c6, #b1b1ae, #dcdcd9"');
  await guide(page).getByRole('button', { name: /^Copy prompt/ }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('<talking-marble');
  expect(errors).toEqual([]);
});

test('the usage follows your own marble', async ({ page }) => {
  await page.goto('/#create');
  await settled(page, 'create');
  await page.locator('#create .steps').getByRole('button', { name: 'Colours', exact: true }).click();
  await page.locator('#create').getByRole('button', { name: /^Pigment 1: #/ }).click();
  await page.getByRole('dialog', { name: 'Pigment 1 color' }).getByRole('textbox', { name: 'Hex' }).fill('#00ff88');
  await page.keyboard.press('Enter');
  await goToShot(page, 'Guide');
  await expect(guide(page).getByLabel('usage', { exact: true })).toContainText("'#00ff88'");
});

for (const scheme of ['dark'] as const) {
  test(`the guide and its footer are axe clean (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#guide');
    await settled(page, 'guide');
    const r = await new AxeBuilder({ page }).include('#guide').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(r.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}
