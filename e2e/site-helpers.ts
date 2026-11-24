import type { Locator, Page } from '@playwright/test';

/**
 * An option of a switch bar inside `scope`; `label` is the bar's group name ("State", "Emotion"). In a loop (F-90)
 * an option can sit outside the view, so `pick` chooses it the way a script would, with a click event.
 */
export function option(scope: Locator, label: string, name: string) {
  const opt = scope.getByRole('group', { name: label, exact: true }).getByRole('button', { name, exact: true });
  return { opt, pick: () => opt.evaluate(b => (b as HTMLElement).click()) };
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

/** Where each shot sits along the scroll, in screens (the walk spans 1 to 4, F-105), worked out independently of the site. */
export const WALK = [1, 4] as const;
export const STOPS: Record<string, number> = { top: 0, palettes: 1, all: 5, create: 6, guide: 7 };
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
  const link = page.getByRole('navigation', { name: 'Shots' }).getByRole('link', { name: label, exact: true });
  // Phones and tablets have no shot index: they scroll there, as a visitor does.
  if (await link.isVisible()) await link.click();
  else await page.evaluate(stop => scrollTo(0, stop * innerHeight), STOPS[id]!);
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
  // Up to 5 s: on a slow device (a phone at 3×) the page takes longer to start listening.
  for (let i = 0; i < 100; i++) {
    await page.keyboard.press('Shift');
    // Skipped, or (on a slow run) already over on its own: either way the page is ready.
    if (await page.locator('.experience[data-intro="skip"], .experience[data-intro-done]').count()) return;
    await page.waitForTimeout(50);
  }
  throw new Error('the intro did not skip');
}
