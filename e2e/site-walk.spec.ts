import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { BUILT_INS, goToShot, option, skipIntro, trackErrors } from './site-helpers';

const { default: AxeBuilder } = createRequire(new URL('../apps/site/package.json', import.meta.url))('@axe-core/playwright') as typeof import('@axe-core/playwright');

const walkShot = (page: Page) => page.locator('#palettes');
const word = (page: Page, name: string) => walkShot(page).getByRole('button', { name, exact: true });
/** Every gallery marble (the walk's six). */
const orbs = (page: Page) => page.locator('.gmarble__orb [data-talking-marble]');

async function open(page: Page) {
  await page.goto('/');
  await skipIntro(page);
  await goToShot(page, 'Palettes');
}

test('the walk: six built-in palettes with fixed colours, no Yours, no Edit (F-22)', async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  const name = walkShot(page).locator('.walk__name');
  await expect(orbs(page)).toHaveCount(6);
  for (const [i, label] of BUILT_INS.entries()) {
    await expect(name).toHaveText(label);
    await expect(walkShot(page).locator('.stepper__count')).toHaveText(`${i + 1} / 6`);
    if (i < BUILT_INS.length - 1) await walkShot(page).getByRole('button', { name: 'Next palette' }).click();
  }
  await expect(walkShot(page).getByRole('button', { name: 'Next palette' })).toBeDisabled();
  await expect(walkShot(page).getByRole('button', { name: /Edit|Yours/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('trying: switch bars for state and emotion, a toggle for halo, reach every marble and stay as you walk; nothing moves (F-18, F-37)', async ({ page }) => {
  await open(page);
  const top = () => walkShot(page).locator('.walk__name').evaluate(el => el.getBoundingClientRect().top);
  const before = await top();
  // A loop (F-90): one row; only the real options are in the accessibility tree.
  for (const [label, count] of [['State', 7], ['Emotion', 9]] as const) {
    const bar = walkShot(page).getByRole('group', { name: label, exact: true });
    await expect(bar.getByRole('button')).toHaveCount(count);
    const tops = await bar.locator('.seg__opt').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size, `${label} on one row`).toBe(1);
  }
  for (const state of ['idle', 'connecting', 'listening', 'thinking', 'searching', 'speaking', 'error']) {
    await option(walkShot(page), 'State', state).pick();
    await expect(word(page, state)).toHaveAttribute('aria-pressed', 'true');
    for (const orb of await orbs(page).all()) await expect(orb).toHaveAttribute('data-state', state);
  }
  await option(walkShot(page), 'Emotion', 'sad').pick();
  for (const orb of await orbs(page).all()) await expect(orb).toHaveAttribute('data-emotion', 'sad');
  await option(walkShot(page), 'Emotion', 'happy').pick();
  for (const orb of await orbs(page).all()) await expect(orb).toHaveAttribute('data-emotion', 'happy');
  await word(page, 'none').click();
  await expect(orbs(page).first()).not.toHaveAttribute('data-emotion');
  // Halo is a toggle (F-37).
  const halo = walkShot(page).getByRole('switch', { name: 'Halo' });
  await expect(halo).toHaveAttribute('aria-checked', 'true');
  await halo.click();
  await expect(halo).toHaveAttribute('aria-checked', 'false');
  for (const orb of await orbs(page).all()) await expect(orb.locator('[data-halo]')).toBeHidden();
  await halo.click();
  await expect(orbs(page).first().locator('[data-halo]')).toBeVisible();
  // Walking on keeps what you tried.
  await option(walkShot(page), 'State', 'thinking').pick();
  await walkShot(page).getByRole('button', { name: 'Next palette' }).click();
  await expect(walkShot(page).locator('.walk__name')).toHaveText('Ember');
  await expect(word(page, 'thinking')).toHaveAttribute('aria-pressed', 'true');
  await expect(orbs(page).nth(1)).toHaveAttribute('data-state', 'thinking');
  await page.waitForTimeout(1500); // the camera walks on
  expect(Math.abs((await top()) - before)).toBeLessThanOrEqual(1);
});

/** Where the demo's marble is drawn, and where a spot of the demo is (its centre and size, px). */
const orbBox = (page: Page) => page.locator('.demo__orb [data-talking-marble]').boundingBox();
const spotBox = (page: Page, home: string) => page.locator(`.demo [data-home="${home}"]`).boundingBox();
const near = (a: { x: number; y: number; width: number } | null, b: { x: number; y: number; width: number } | null) =>
  !!a && !!b && Math.abs(a.x + a.width / 2 - (b.x + b.width / 2)) < 3 && Math.abs(a.width - b.width) < 3;

test('seen in (F-99, F-102): Marble, in a chatbox (open and closed into its button) and in a call; the controls never move; the scene marble steps aside and comes back', async ({ page }) => {
  const errors = trackErrors(page);
  await open(page);
  const seen = (name: string) => option(walkShot(page), 'Seen in', name).pick();
  const firstLine = () => walkShot(page).locator('.walk__name').evaluate(el => el.getBoundingClientRect().top);
  const controls = () => walkShot(page).locator('.try').evaluate(el => { const r = el.getBoundingClientRect(); return [r.top, r.height]; });
  const at = [await firstLine(), ...(await controls())];
  const front = page.locator('.gmarble[data-front]');
  // Marble (F-102): the demo's marble stands in for the scene's, a little smaller and held still, its state's word under it.
  await expect.poll(async () => near(await orbBox(page), await spotBox(page, 'marble')), { timeout: 3000 }).toBe(true);
  await expect.poll(() => front.evaluate(el => getComputedStyle(el).filter)).toBe('opacity(0)');
  const sceneSize = (await front.locator('[data-talking-marble]').boundingBox())!.width;
  expect((await orbBox(page))!.width).toBeLessThan(sceneSize * 0.9);
  await expect(page.locator('.demo__caption--scene .stage-caption__word').last()).toHaveText('speaking');
  await option(walkShot(page), 'State', 'searching').pick();
  await expect(page.locator('.demo__caption--scene .stage-caption__word').last()).toHaveText('searching');
  // The chatbox: the marble in the middle above it, a close key in its pigment; closing flies it into the bar's button.
  await seen('Chatbox');
  await expect(page.locator('.demo')).toHaveAttribute('data-seen', 'bar');
  await expect.poll(() => front.evaluate(el => getComputedStyle(el).filter)).toBe('opacity(0)');
  await expect.poll(async () => near(await orbBox(page), await spotBox(page, 'above')), { timeout: 3000 }).toBe(true);
  await page.locator('.demo').getByRole('button', { name: 'Close the voice chat' }).click();
  await expect.poll(async () => near(await orbBox(page), await spotBox(page, 'slot')), { timeout: 3000 }).toBe(true);
  await page.locator('.demo').getByRole('button', { name: 'Open the voice chat' }).click();
  await expect.poll(async () => near(await orbBox(page), await spotBox(page, 'above')), { timeout: 3000 }).toBe(true);
  // The call: its name (the palette's), a running clock, the marble in the middle, the state under it.
  await seen('Call');
  const call = page.locator('.demo__call');
  await expect(call).toBeVisible();
  await expect(call.locator('.demo__call-name')).toHaveText('Pearl');
  await expect(call.locator('.demo__call-clock')).toHaveText(/^00:0[1-9]$/, { timeout: 3000 });
  await expect.poll(async () => near(await orbBox(page), await spotBox(page, 'call')), { timeout: 3000 }).toBe(true);
  // Inside the screen, clear of the panel.
  const c = (await call.boundingBox())!, panel = (await walkShot(page).locator('.shot__panel').boundingBox())!, vp = page.viewportSize()!;
  expect(c.x).toBeGreaterThan(panel.x + panel.width);
  expect(c.x + c.width).toBeLessThanOrEqual(vp.width);
  expect(c.y).toBeGreaterThanOrEqual(0);
  expect(c.y + c.height).toBeLessThanOrEqual(vp.height);
  // Back to Marble: it flies to its resting spot. Leaving the walk hands back to the scene's marble.
  await seen('Marble');
  await expect.poll(async () => near(await orbBox(page), await spotBox(page, 'marble')), { timeout: 3000 }).toBe(true);
  // Held still (F-102): nothing drifts with the scene.
  const a = await orbBox(page); await page.waitForTimeout(1200); const b = await orbBox(page);
  expect(Math.abs(a!.x - b!.x) + Math.abs(a!.y - b!.y)).toBeLessThan(0.5);
  // Nothing in the panel moved at any point.
  expect([await firstLine(), ...(await controls())].map(Math.round)).toEqual(at.map(Math.round));
  await goToShot(page, 'Create your own');
  await expect(page.locator('.demo__orb')).toHaveCount(0, { timeout: 4000 });
  await expect.poll(() => front.evaluate(el => getComputedStyle(el).filter)).toBe('none');
  expect(errors).toEqual([]);
});

for (const scheme of ['dark'] as const) {
  test(`the walk is axe clean, on its own, in the chatbox and in a call (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await goToShot(page, 'Palettes');
    const axe = () => new AxeBuilder({ page }).include('#palettes').include('.demo').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect((await axe()).violations.map(v => v.id)).toEqual([]);
    for (const name of ['Chatbox', 'Call']) {
      await option(walkShot(page), 'Seen in', name).pick();
      await page.waitForTimeout(500);
      expect((await axe()).violations.map(v => `${name} ${v.id}`)).toEqual([]);
    }
  });
}

test('the switch bar loop (F-90, F-94): three in focus, the next faint at both ends, a fixed width, the key still while the strip glides, wrapping round', async ({ page }) => {
  await open(page);
  const bar = walkShot(page).getByRole('group', { name: 'Emotion', exact: true });
  const view = bar.locator('.loop');
  /** Every frame for `ms` after `act` runs in the page: the view's width, the key's centre, width and light, and the strip's place. */
  const watch = (act: string, ms = 800) => view.evaluate((el, [act, ms]) => new Promise<{ vw: number; kc: number; kw: number; ko: number; sx: number; cw: number }[]>(done => {
    const key = el.querySelector('.loop__key')!, strip = el.querySelector('.loop__strip')!;
    const frames: { vw: number; kc: number; kw: number; ko: number; sx: number; cw: number }[] = [];
    // One copy of the list, start to start (the strip holds three).
    const copyWidth = () => { const c = strip.children, n = c.length / 3; return c[n]!.getBoundingClientRect().left - c[0]!.getBoundingClientRect().left; };
    const t0 = performance.now();
    new Function('el', act)(el);
    const tick = () => {
      const k = key.getBoundingClientRect();
      frames.push({ vw: el.getBoundingClientRect().width, kc: k.left + k.width / 2, kw: k.width, ko: +getComputedStyle(key).opacity, sx: strip.getBoundingClientRect().left, cw: copyWidth() });
      if (performance.now() - t0 < +ms) requestAnimationFrame(tick); else done(frames);
    };
    requestAnimationFrame(tick);
  }), [act, ms] as const);
  const check = (frames: Awaited<ReturnType<typeof watch>>, what: string) => {
    // Nothing changes size or jumps: the view keeps its width, the key keeps its centre and stays lit.
    expect(Math.max(...frames.map(f => f.vw)) - Math.min(...frames.map(f => f.vw)), `${what}: view width`).toBeLessThan(0.5);
    expect(Math.max(...frames.map(f => f.kc)) - Math.min(...frames.map(f => f.kc)), `${what}: key centre`).toBeLessThan(0.5);
    expect(Math.min(...frames.map(f => f.ko)), `${what}: key lit`).toBeGreaterThan(0.95);
    // The strip glides one way, over many frames. Settling back onto the middle copy after a wrap moves it by one
    // whole copy in a single frame: the same picture, so it is taken out first.
    const copy = frames[0]!.cw;
    const xs = frames.map(f => f.sx);
    for (let i = 1; i < xs.length; i++) {
      const d = xs[i]! - xs[i - 1]!;
      if (Math.abs(Math.abs(d) - copy) < 2) for (let j = i; j < xs.length; j++) xs[j]! -= Math.sign(d) * copy;
    }
    const left = xs.at(-1)! < xs[0]!;
    for (let i = 1; i < xs.length; i++) expect(left ? xs[i]! <= xs[i - 1]! + 0.5 : xs[i]! >= xs[i - 1]! - 0.5, `${what}: one way`).toBe(true);
    expect(new Set(xs.map(x => Math.round(x))).size, `${what}: glides`).toBeGreaterThan(5);
  };
  // In focus: the chosen one and two each side; further ones are faint.
  const faint = () => view.locator('.seg__opt').evaluateAll(els => els.filter(e => e.getBoundingClientRect().width && +getComputedStyle(e).opacity < 0.5).length);
  expect(await faint()).toBeGreaterThan(0);
  // Clicking a faint option at the right end brings it to the middle.
  const target = await view.evaluate(el => { const v = el.getBoundingClientRect(); return document.elementFromPoint(v.right - 30, v.top + v.height / 2)!.textContent; });
  check(await watch("const v = el.getBoundingClientRect(); document.elementFromPoint(v.right - 30, v.top + v.height / 2).click();"), 'right end');
  await expect(bar.locator('[aria-pressed="true"]')).toHaveText(target!);
  // The dots under the bar: one per option, the chosen one lit; a dot chooses its option.
  const dots = bar.locator('xpath=..').locator('.loop__dot');
  await expect(dots).toHaveCount(9);
  const order = ['none', 'happy', 'calm', 'excited', 'curious', 'surprised', 'concerned', 'sad', 'muted'];
  await expect(dots.nth(order.indexOf(target!.trim()))).toHaveAttribute('data-on', '');
  await dots.nth(1).click();
  await expect(bar.locator('[aria-pressed="true"]')).toHaveText('happy');
  // Wrapping: from the first option, one step left is the last, one step away (not a sweep across the list).
  await option(walkShot(page), 'Emotion', 'none').pick();
  await page.waitForTimeout(900);
  const one = await view.evaluate(el => (el.querySelector('[data-on]') as HTMLElement).offsetWidth);
  await bar.getByRole('button', { name: 'none', exact: true }).focus();
  const frames = await watch("el.querySelector('[aria-pressed=\"true\"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));");
  check(frames, 'wrap left');
  await expect(bar.locator('[aria-pressed="true"]')).toHaveText('muted');
  const moved = Math.abs(frames.at(-1)!.sx - frames[0]!.sx) % frames[0]!.cw;
  expect(Math.min(moved, frames[0]!.cw - moved), 'one step').toBeLessThan(one * 2 + 20);
  // The arrow keys move focus with the choice.
  await expect(bar.getByRole('button', { name: 'muted', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(bar.locator('[aria-pressed="true"]')).toHaveText('none');
  // A swipe steps through the loop.
  const box = (await view.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 20, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(bar.locator('[aria-pressed="true"]')).toHaveText('happy');
  // Fits a phone.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  for (const g of await walkShot(page).locator('.loop').all()) {
    const r = (await g.boundingBox())!;
    expect(r.x, 'inside the screen').toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(375);
  }
});
