import { devices, expect, test } from '@playwright/test';
import { goToShot, option, skipIntro, trackErrors } from './site-helpers';

// Real devices' screens, pixel ratios and touch (Chromium engine; the Playwright project is Chromium only).
const DEVICES = ['iPhone 13', 'Pixel 7', 'iPad (gen 7)'] as const;

for (const name of DEVICES) {
  const { defaultBrowserType: _, ...device } = devices[name];
  test.describe(name, () => {
    test.use(device);

    test(`${name}: every shot fits with no sideways scroll; the loops and Create work by touch; no errors`, async ({ page }) => {
      test.setTimeout(90_000);
      const errors = trackErrors(page);
      await page.goto('/');
      await skipIntro(page);
      const width = page.viewportSize()!.width;
      const noSideways = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
      expect(await noSideways(), 'intro').toBe(true);

      // The walk: both loops inside the screen; a tap on a faint option at an end chooses it.
      await goToShot(page, 'Palettes');
      const walk = page.locator('#palettes');
      for (const loop of await walk.locator('.loop').all()) {
        const r = (await loop.boundingBox())!;
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.x + r.width).toBeLessThanOrEqual(width);
      }
      const emotion = walk.getByRole('group', { name: 'Emotion', exact: true });
      const before = await emotion.locator('[aria-pressed="true"]').textContent();
      const box = (await emotion.locator('.loop').boundingBox())!;
      await page.touchscreen.tap(box.x + box.width - 24, box.y + box.height / 2);
      await expect(emotion.locator('[aria-pressed="true"]')).not.toHaveText(before!);
      // The choice reaches the marbles.
      await option(walk, 'State', 'searching').pick();
      await expect(page.locator('.gmarble__orb [data-talking-marble]').first()).toHaveAttribute('data-state', 'searching');
      expect(await noSideways(), 'walk').toBe(true);

      // Create your own: name it by touch and typing.
      await goToShot(page, 'Create your own');
      const field = page.locator('#create').getByRole('textbox', { name: 'Name your marble' });
      await field.tap();
      await field.fill('Nova');
      await expect(page.getByTestId('main-marble').locator('[data-talking-marble][role="img"]')).toHaveAttribute('aria-label', /^Nova, /);
      expect(await noSideways(), 'create').toBe(true);

      await goToShot(page, 'Guide');
      expect(await noSideways(), 'guide').toBe(true);
      expect(errors).toEqual([]);
    });

    test(`${name}: the docs page fits, its glass bar stays on top, no errors`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto('/docs/');
      await expect(page.locator('.docs__title')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.evaluate(() => scrollTo(0, 2000));
      const bar = (await page.locator('.topbar').boundingBox())!;
      expect(Math.abs(bar.y)).toBeLessThan(1);
      expect(errors).toEqual([]);
    });
  });
}
