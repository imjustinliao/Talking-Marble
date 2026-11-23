import { expect, test } from '@playwright/test';
import { trackErrors } from './site-helpers';

test('the docs page: real HTML, an index, every section, no console errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/docs/');
  await expect(page).toHaveTitle(/Docs/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://imjustinliao.github.io/Talking-Marble/docs/');
  await expect(page.getByRole('heading', { level: 1, name: 'Docs' })).toBeVisible();
  const index = page.getByRole('navigation', { name: 'On this page' });
  for (const [id, name] of [['install', 'Install'], ['quick-start', 'Quick start'], ['props', 'Props'], ['audio-sources', 'Audio sources'], ['states', 'States and custom presets'], ['customize', 'Customize'], ['recipes', 'Recipes']]) {
    await expect(page.locator(`h2#${id}`)).toHaveText(name);
  }
  for (const name of ['OpenAI Realtime', 'ElevenLabs Agents', 'LiveKit Agents']) await expect(page.getByRole('heading', { level: 3, name })).toBeVisible();
  await index.getByRole('link', { name: 'Recipes' }).click();
  await expect(page).toHaveURL(/#recipes$/);
  await expect(page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Docs' })).toHaveAttribute('aria-current', 'page');
  expect(errors).toEqual([]);
});
