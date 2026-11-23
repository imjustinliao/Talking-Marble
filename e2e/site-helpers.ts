import { expect, type Page } from '@playwright/test';

export type ShotId = 'intro' | 'colors' | 'pick' | 'talk' | 'install';
const LABEL: Record<ShotId, string> = { intro: 'Marble', colors: 'Colors', pick: 'Pick', talk: 'Talk', install: 'Install' };

export const mainOrb = (page: Page) => page.locator('[data-testid="main-marble"] [data-talking-marble]');
export const shot = (page: Page, id: ShotId) => page.locator(`section#${id}`);

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

/** Opens the home page and skips the intro (any key skips it). */
export async function home(page: Page) {
  await page.goto('/');
  await expect(mainOrb(page)).toHaveAttribute('data-ready', 'true');
  await page.keyboard.press('Shift');
  await expect(page.locator('.experience')).not.toHaveAttribute('data-intro', 'play');
}

/** Moves the camera to a shot with the scene index, and waits until its controls are live. */
export async function toShot(page: Page, id: ShotId) {
  await page.getByRole('navigation', { name: 'Scenes' }).getByRole('link', { name: new RegExp(LABEL[id]) }).click();
  await expect(shot(page, id)).toHaveClass(/is-on/);
  await expect(shot(page, id)).not.toHaveAttribute('aria-hidden', 'true');
}
