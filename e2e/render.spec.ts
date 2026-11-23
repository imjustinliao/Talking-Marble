import { expect, test, type Locator, type Page } from '@playwright/test';

const STATES = ['idle', 'connecting', 'listening', 'thinking', 'speaking', 'error'];

/** Screenshots the orb and measures it in the page: how much is covered, and how varied the color is. */
async function measure(page: Page, orb: Locator) {
  const png = (await orb.screenshot({ omitBackground: true })).toString('base64');
  return page.evaluate(async data => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const { data: px } = ctx.getImageData(0, 0, c.width, c.height);
    let covered = 0, sum = 0, sumSq = 0, n = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3]! > 200) covered++;
      const l = 0.2126 * px[i]! + 0.7152 * px[i + 1]! + 0.0722 * px[i + 2]!;
      sum += l; sumSq += l * l; n++;
    }
    const mean = sum / n;
    return { coverage: covered / n, spread: Math.sqrt(sumSq / n - mean * mean) };
  }, png);
}

test('the orb draws in all six states, with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  // Opaque page background so screenshots measure the orb, not the page.
  await page.emulateMedia({ colorScheme: 'dark' });
  const orb = page.locator('[data-talking-marble][role="img"]');
  await expect(orb).toHaveAttribute('data-ready', 'true');
  // The site is a scroll-camera experience (docs/design.md › The site): skip the intro as a visitor would (any key),
  // then move to the talk shot (Page Down through colors and pick), where the state controls live, and let the camera settle.
  await page.keyboard.press('Shift');
  for (const shot of ['colors', 'pick', 'talk']) {
    await page.keyboard.press('PageDown');
    await expect(page.locator(`section#${shot}`)).toHaveClass(/is-on/);
  }
  await page.waitForTimeout(2000);

  const frames: string[] = [];
  for (const state of STATES) {
    await page.getByRole('button', { name: state, exact: true }).click();
    await expect(orb).toHaveAttribute('data-state', state);
    await page.waitForTimeout(600);
    const m = await measure(page, orb);
    // A disc covers about π/4 of its square; a blank canvas covers nothing and has no spread.
    expect(m.coverage, `${state} coverage`).toBeGreaterThan(0.6);
    expect(m.spread, `${state} color variation`).toBeGreaterThan(8);
    frames.push((await orb.screenshot()).toString('base64'));
  }
  // It flows: two shots a moment apart differ.
  expect(frames.at(-1)).not.toEqual((await orb.screenshot()).toString('base64'));
  expect(errors).toEqual([]);
});
