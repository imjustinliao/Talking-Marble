// PLAT-01 step 1: <talking-marble>, the Web Component, on a page with no React.
import type { Page } from '@playwright/test';
import { expect, test } from '../packages/react/test/page/fixture';

/** The browser's own accessibility tree (what screen readers get): role and name of each image. ElementInternals
 *  semantics are there, though Playwright's role finder, which reads only attributes, does not see them. */
async function images(page: Page): Promise<string[]> {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree') as { nodes: { ignored: boolean; role?: { value: string }; name?: { value: string } }[] };
  return nodes.filter(n => !n.ignored && n.role?.value === 'image').map(n => n.name?.value ?? '');
}

test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } });

test('the Web Component draws with plain attributes, no React on the page', async ({ page, testPage }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${testPage}element.html`);
  const a = page.locator('#a'), b = page.locator('#b'), c = page.locator('#c');
  expect(await page.evaluate(() => 'React' in window || !!document.querySelector('[data-reactroot]'))).toBe(false);
  await expect(a).toHaveAttribute('data-ready', 'true');
  await expect(a).toHaveAttribute('data-state', 'speaking');
  // Its size: 160 px from the attribute; without one it fills its container's width, square.
  expect(await a.evaluate(el => [el.getBoundingClientRect().width, el.getBoundingClientRect().height].map(Math.round))).toEqual([160, 160]);
  expect(await c.evaluate(el => [el.getBoundingClientRect().width, el.getBoundingClientRect().height].map(Math.round))).toEqual([200, 200]);
  // Accessible: "Nova, speaking" as an image; the decorative one is hidden.
  await expect.poll(() => images(page)).toEqual(['Nova, speaking', 'Assistant, mine']);
  // The halo: shown by default, none with halo="false".
  const haloShown = (id: string) => page.evaluate(i => getComputedStyle(document.getElementById(i)!.shadowRoot!.querySelector('.halo')!).display, id);
  expect(await haloShown('a')).toBe('block');
  expect(await haloShown('b')).toBe('none');
  // Changing attributes changes the marble; the name follows.
  await a.evaluate(el => { el.setAttribute('state', 'thinking'); el.setAttribute('emotion', 'happy'); });
  await expect(a).toHaveAttribute('data-state', 'thinking');
  await expect.poll(() => images(page)).toContain('Nova, thinking, happy');
  // Properties too: a palette array, a halo strength, presets as an object.
  await b.evaluate(el => { (el as HTMLElement & { palette: string[] }).palette = ['#ff0000', '#00ff00', '#0000ff', '#ffffff']; el.setAttribute('halo', '0.5'); });
  expect(await haloShown('b')).toBe('block');
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('b')!.shadowRoot!.querySelector('.halo-strength')!).opacity)).toBe('0.5');
  await expect(c).toHaveAttribute('data-ready', 'true');
  // The canvas really draws: not blank.
  const lit = await a.evaluate(el => {
    const canvas = el.shadowRoot!.querySelector('canvas')!;
    const copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
    const g = copy.getContext('2d')!; g.drawImage(canvas, 0, 0);
    const px = g.getImageData(0, 0, copy.width, copy.height).data;
    let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i]! > 0) n++;
    return n / (px.length / 4);
  });
  expect(lit).toBeGreaterThan(0.5);
  // Removed and added back, it draws again; removed, it lets go.
  await a.evaluate(el => { const parent = el.parentElement!; el.remove(); parent.append(el); });
  await expect(a).toHaveAttribute('data-ready', 'true');
  expect(errors).toEqual([]);
});

test('the Web Component hears audio through its property', async ({ page, testPage }) => {
  await page.goto(`${testPage}element.html`);
  await page.locator('#a').evaluate(el => {
    el.setAttribute('state', 'probe');
    (el as HTMLElement & { presets: object; audio: MediaStream }).presets = { probe: { halo: 0, reactivity: 1 } };
    (el as HTMLElement & { audio: MediaStream }).audio = (window as unknown as { tone(): MediaStream }).tone();
  });
  let peak = 0;
  for (let i = 0; i < 25; i++) {
    peak = Math.max(peak, await page.evaluate(() => +getComputedStyle(document.getElementById('a')!.shadowRoot!.querySelector('.halo')!).opacity));
    await page.waitForTimeout(100);
  }
  expect(peak).toBeGreaterThan(0.05);
});
