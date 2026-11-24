import type { Locator, Page } from '@playwright/test';

/**
 * An option of a switch bar inside `scope` (F-90: five at a time). Turns the bar's pages with its arrow until the
 * option shows, then returns it; `label` is the bar's group name ("State", "Emotion").
 */
export async function option(scope: Locator, label: string, name: string): Promise<Locator> {
  const bar = scope.getByRole('group', { name: label, exact: true });
  const opt = bar.getByRole('button', { name, exact: true });
  for (let i = 0; i < 4 && !(await opt.isVisible()); i++) await bar.locator('.seg__more').click();
  return opt;
}

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

/** The camera page's shots, by their index label (F-22). */
export const SHOTS = [
  { id: 'top', label: 'Talking Marble' },
  { id: 'palettes', label: 'Palettes' },
  { id: 'all', label: 'All palettes' },
  { id: 'create', label: 'Create your own' },
  { id: 'guide', label: 'Guide' },
] as const;

/** Where each shot sits along the scroll, in screens (the walk spans 1 to 3), worked out independently of the site. */
export const WALK = [1, 3] as const;
export const STOPS: Record<string, number> = { top: 0, palettes: 1, all: 4, create: 5, guide: 6 };
export const BUILT_INS = ['Pearl', 'Ember', 'Lagoon', 'Ink', 'Rose', 'Aurora'];

/** The shot nearest scroll position u (screens): anywhere on the walk is Palettes. */
export function expectedShot(u: number) {
  if (u >= WALK[0] && u <= WALK[1]) return SHOTS[1];
  const dist = SHOTS.map(s => (s.id === 'palettes' ? Math.min(Math.abs(u - WALK[0]), Math.abs(u - WALK[1])) : Math.abs(u - STOPS[s.id]!)));
  return SHOTS[dist.indexOf(Math.min(...dist))]!;
}

/** Goes to a shot as a visitor would (its link in the index), and waits for the camera to settle there. */
export async function goToShot(page: Page, label: (typeof SHOTS)[number]['label']) {
  const { id } = SHOTS.find(s => s.label === label)!;
  await page.getByRole('navigation', { name: 'Shots' }).getByRole('link', { name: label, exact: true }).click();
  await settled(page, id);
}

/** Waits until a shot is the live one and fully shown. */
export async function settled(page: Page, id: string) {
  await page.waitForFunction(([s, stop]) => {
    const el = document.getElementById(s);
    return !!el && el.hasAttribute('data-on') && el.style.opacity === '1' && Math.abs(scrollY / innerHeight - stop) < 0.01;
  }, [id, STOPS[id]!] as const, { timeout: 15_000 }).catch(e => { throw new Error(`shot "${id}" never settled: ${e.message}`); });
  await page.waitForTimeout(450); // the shot's cross-fade (0.4 s with reduced motion)
}

/** Skips the intro the way a visitor can (any key), once the page is listening for it. */
export async function skipIntro(page: Page) {
  await page.locator('.experience[data-intro="play"]').waitFor();
  await page.waitForFunction(() => document.readyState === 'complete');
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Shift');
    if (await page.locator('.experience[data-intro="skip"]').count()) return;
    await page.waitForTimeout(50);
  }
  throw new Error('the intro did not skip');
}
