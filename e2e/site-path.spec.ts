import { expect, test, type Page } from '@playwright/test';
import { home, trackErrors } from './site-helpers';

// The whole camera path, in 0.4-screen steps: a marble is always in frame, the index follows the camera.
const LABELS = ['Marble', 'Colors', 'Pick', 'Talk', 'Install'];
const WALK = [1, 3.4]; // the walk along the palette curve, in screens
const STOPS = [0, WALK[0]!, 4.4, 5.4, 6.4];

/** The shot nearest scroll position u (screens), computed here independently of the site's code. */
function expectedShot(u: number) {
  if (u >= WALK[0]! && u <= WALK[1]!) return 'Colors';
  const dist = STOPS.map((s, i) => (i === 1 ? Math.min(Math.abs(u - WALK[0]!), Math.abs(u - WALK[1]!)) : Math.abs(u - s)));
  return LABELS[dist.indexOf(Math.min(...dist))]!;
}

/** The largest on-screen area (px²) of a marble that is actually visible (effective opacity ≥ 0.3). */
function visibleMarble(page: Page) {
  return page.evaluate(() => {
    const opacity = (el: Element | null) => { let o = 1; for (; el && el !== document.body; el = el.parentElement) o *= +getComputedStyle(el).opacity; return o; };
    let best = 0;
    for (const el of document.querySelectorAll('[data-testid="main-marble"], .cmarble__orb')) {
      if (opacity(el) < 0.3) continue;
      const r = el.getBoundingClientRect();
      const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0), h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
      if (w > 0 && h > 0) best = Math.max(best, w * h);
    }
    return best;
  });
}

for (const [w, h] of [[1024, 768], [375, 812], [820, 1180], [812, 375], [1440, 900]] as const) {
  test(`walking the whole page at ${w}×${h}: a marble always in frame, the index on the nearest shot`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: w, height: h });
    const errors = trackErrors(page);
    await home(page);
    for (let u = 0; u <= 6.4 + 1e-9; u = Math.round((u + 0.4) * 10) / 10) {
      await page.evaluate(v => scrollTo(0, v * innerHeight), u);
      await page.waitForTimeout(1300); // the camera glides there
      expect(await visibleMarble(page), `marble in frame at ${u} screens`).toBeGreaterThan(40 * 40);
      // The live shot's words and controls fit on screen, nothing cut off at an edge, no sideways scroll.
      const off = await page.evaluate(() => {
        const sec = document.querySelector('.shot.is-on');
        const box = sec?.firstElementChild?.getBoundingClientRect();
        if (!box) return null;
        return { l: box.left, t: box.top, r: innerWidth - box.right, b: innerHeight - box.bottom, sw: document.documentElement.scrollWidth - innerWidth };
      });
      if (off) for (const [edge, gap] of Object.entries(off)) expect(gap, `${edge} edge at ${u} screens`).toBeGreaterThanOrEqual(edge === 'sw' ? 0 : -1);
      if (w > 720 && w > h) { // the index is hidden on phones and portrait screens
        await expect(page.getByRole('navigation', { name: 'Scenes' }).locator('[aria-current="step"]'), `index at ${u} screens`).toContainText(expectedShot(u));
      }
    }
    expect(errors).toEqual([]);
  });
}

test('Page Down works right after load, with focus on the page body', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3200); // the intro ends by itself
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.keyboard.press('PageDown');
  await expect(page.locator('section#colors')).toHaveClass(/is-on/);
});
