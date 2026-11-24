import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { trackErrors } from './site-helpers';

const { default: AxeBuilder } = createRequire(new URL('../apps/site/package.json', import.meta.url))('@axe-core/playwright') as typeof import('@axe-core/playwright');

const core = (file: string) => readFileSync(new URL(`../packages/core/${file}`, import.meta.url), 'utf8');
/** Every preset field, its range and its default, straight from packages/core (spec.md › Parameters and states.json). */
const BASE = (JSON.parse(core('presets/states.json')) as { base: Record<string, unknown> }).base;
const SPEC_RANGES = Object.fromEntries([...core('spec.md').matchAll(/^\| `(\w+)` \| ([^|]+) \|/gm)].map(m => [m[1]!, m[2]!.trim().replace(/`/g, '')]));
/** Every prop of `TalkingMarbleProps`, straight from the source. */
const PROPS = [.../export interface TalkingMarbleProps \{([\s\S]*?)\n\}/.exec(readFileSync(new URL('../packages/react/src/TalkingMarble.tsx', import.meta.url), 'utf8'))![1]!
  .matchAll(/^\s+'?([\w-]+)'?\?:/gm)].map(m => m[1]!);

const SECTIONS = [
  ['install', 'Install'], ['quick-start', 'Quick start'], ['web-component', 'Web Component'], ['palettes', 'Palettes'], ['props', 'Props'], ['states', 'States and emotions'],
  ['presets', 'Preset format'], ['audio', 'Audio'], ['accessibility', 'Accessibility'], ['performance', 'Performance'], ['recipes', 'Recipes'],
];

test('the docs page: real HTML, an index, every section, no console errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/docs/');
  await expect(page).toHaveTitle(/Docs/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://talking-marble.vercel.app/docs/');
  await expect(page.getByRole('heading', { level: 1, name: 'Docs' })).toBeVisible();
  const index = page.getByRole('navigation', { name: 'On this page' });
  await expect(index.getByRole('link')).toHaveText(SECTIONS.map(([, name]) => name!));
  for (const [id, name] of SECTIONS) await expect(page.locator(`h2#${id}`)).toHaveText(name!);
  for (const name of ['OpenAI Realtime', 'ElevenLabs Agents', 'LiveKit Agents']) await expect(page.getByRole('heading', { level: 3, name })).toBeVisible();
  await index.getByRole('link', { name: 'Recipes' }).click();
  await expect(page).toHaveURL(/#recipes$/);
  // The top bar is the logo and name, back to the home page (F-31); no theme switch, dark only (F-77).
  await expect(page.locator('.topbar .brand')).toHaveAttribute('href', '/');
  await expect(page.locator('footer').getByRole('button', { name: /Switch to (light|dark) mode/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a link to a section opens the docs at that section (the Install shot links to #recipes)', async ({ page }) => {
  await page.goto('/docs/#recipes');
  await expect(page.locator('h2#recipes')).toBeInViewport();
  await page.goto('about:blank');
  await page.goto('/docs/#presets');
  await expect(page.locator('h2#presets')).toBeInViewport();
});

test('the preset format lists every field in packages/core, with its range and default (SITE-06)', async ({ page }) => {
  await page.goto('/docs/');
  const table = page.getByRole('region', { name: 'Preset fields' });
  const rows = await table.locator('tbody tr').evaluateAll(trs => trs.map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent!.trim())));
  const byName = new Map(rows.map(r => [r[0]!, r]));
  const fields = [...Object.keys(BASE), 'colors', 'label'];
  expect(rows.map(r => r[0])).toEqual(fields);
  for (const [name, value] of Object.entries(BASE)) {
    const [, range, def] = byName.get(name)!;
    expect(range, `${name} range`).toBe(SPEC_RANGES[name]);
    expect(def, `${name} default`).toBe(JSON.stringify(value));
  }
  // The resting values block carries every numeric field too.
  const base = page.getByRole('region', { name: 'Resting values' });
  for (const [name, value] of Object.entries(BASE)) await expect(base).toContainText(`${name}: ${JSON.stringify(value)}`);
});

test('the props table lists every prop of TalkingMarbleProps, with a description', async ({ page }) => {
  await page.goto('/docs/');
  const rows = await page.getByRole('region', { name: 'Props' }).locator('tbody tr').evaluateAll(trs => trs.map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent!.trim())));
  expect(PROPS.length).toBeGreaterThan(10);
  expect(rows.map(r => r[0])).toEqual(PROPS);
  for (const [name, type, , what] of rows) {
    expect(type, `${name} type`).not.toBe('');
    expect(what, `${name} description`).not.toBe('');
  }
  // The aliases are spelled out, and the defaults come from the component.
  const row = (name: string) => rows.find(r => r[0] === name)!;
  expect(row('state')[1]).toBe("'idle' | 'connecting' | 'listening' | 'thinking' | 'searching' | 'speaking' | 'error' | string");
  expect(row('state')[2]).toBe("'idle'");
  expect(row('palette')[1]).toContain("'pearl' | 'ember'");
  expect(row('halo')[2]).toBe('true');
  expect(row('audio')[1]).toBe('MediaStream | HTMLMediaElement | AudioNode');
});

for (const s of ['dark'] as const) {
  test(`docs: axe clean, one column with the index on the side (top on phones), screenshots (${s})`, async ({ page }) => {
    test.setTimeout(60_000);
    for (const [w, h] of [[1280, 800], [375, 812]] as const) {
      await page.setViewportSize({ width: w, height: h });
      // As the page's other axe test: no transitions (the body's 0.25 s theme fade), so colours are final.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/docs/');
      await page.waitForTimeout(400);
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`)).toEqual([]);
      // No sideways scroll; the index beside the text on desktop, above it on phones.
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
      const index = (await page.getByRole('navigation', { name: 'On this page' }).boundingBox())!;
      const body = (await page.locator('.docs__body').boundingBox())!;
      if (w > 860) expect(index.x + index.width).toBeLessThan(body.x);
      else expect(index.y + index.height).toBeLessThanOrEqual(body.y);
      await page.screenshot({ path: `test-results/site/docs-${w}-${s}.png` });
      await page.screenshot({ path: `test-results/site/docs-${w}-${s}-full.png`, fullPage: true });
    }
  });
}
