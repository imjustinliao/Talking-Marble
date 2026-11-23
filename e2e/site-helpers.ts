import type { Page } from '@playwright/test';

export const preview = (page: Page) => page.locator('[data-talking-marble][role="img"]');

/** Collects console errors and warnings (Chromium's own GPU driver notes are not the page's). */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', m => {
    if (m.text().includes('GL Driver Message')) return;
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', e => errors.push(e.message));
  return errors;
}

/** Scrolls through the whole page so every section reveals (and its marbles mount), then back to the top. */
export async function walk(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 400) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(80); }
}
