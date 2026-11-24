import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { SHOTS, STOPS, expectedShot, goToShot, option, settled, skipIntro, trackErrors } from './site-helpers';

const { default: AxeBuilder } = createRequire(new URL('../apps/site/package.json', import.meta.url))('@axe-core/playwright') as typeof import('@axe-core/playwright');

/** The site is dark only (F-77); the scheme stays in test names so their screenshots keep their names. */
type Scheme = 'dark';


/**
 * The largest visible marble's on-screen area (px²) — the stage marble, or a gallery marble during the walk and
 * all six (effective opacity ≥ 0.3) — and how much of it the live shot's words cover (0–1).
 */
function marbleInFrame(page: Page) {
  return page.evaluate(() => {
    const opacity = (el: Element | null) => { let o = 1; for (; el && el !== document.body; el = el.parentElement) o *= +getComputedStyle(el).opacity; return o; };
    const cut = (a: DOMRect, b: { left: number; top: number; right: number; bottom: number }) =>
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    let best: DOMRect | null = null, area = 0;
    for (const el of document.querySelectorAll('[data-testid="main-marble"] [data-talking-marble], .gmarble__orb')) {
      if (opacity(el) < 0.3) continue;
      const r = el.getBoundingClientRect();
      const a = cut(r, { left: 0, top: 0, right: innerWidth, bottom: innerHeight });
      if (a > area) { area = a; best = r; }
    }
    const panel = document.querySelector('.shot[data-on] .shot__panel')?.getBoundingClientRect();
    return { area, covered: panel && best && area ? cut(best, panel) / area : 0 };
  });
}

/** The live shot's words against the viewport edges, any sideways scroll, and any scrolling inside the shot (F-12: none). */
const fits = (page: Page) => page.evaluate(() => {
  const el = document.querySelector('.shot[data-on] .shot__panel')!;
  const b = el.getBoundingClientRect();
  // Anything in the shot that scrolls on its own (code blocks may scroll sideways, as code does)
  const scrolling = [el, ...el.querySelectorAll('*')].filter(e => !e.closest('pre, .strip') && /auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1).length;
  return { left: b.left, top: b.top, right: innerWidth - b.right, bottom: innerHeight - b.bottom, sideways: innerWidth - document.documentElement.scrollWidth, inner: -scrolling };
});

const RUNS: { w: number; h: number; scheme: Scheme; shots?: boolean }[] = [
  { w: 1280, h: 800, scheme: 'dark', shots: true },
  { w: 375, h: 812, scheme: 'dark', shots: true },
  { w: 1024, h: 768, scheme: 'dark' },
  { w: 820, h: 1180, scheme: 'dark' },
  { w: 812, h: 375, scheme: 'dark' },
];

for (const { w, h, scheme, shots } of RUNS) {
  test(`the whole path at ${w}×${h} (${scheme}): the marble always in frame, the index on the nearest shot`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: w, height: h });
    const errors = trackErrors(page);
    await page.goto('/');
    await skipIntro(page);
    const wide = w >= 720 && w > h;
    // Every 0.33 screens along the whole path (never exactly halfway between two shots), plus each shot's own stop.
    const steps = [...new Set([...Array.from({ length: 26 }, (_, i) => Math.round(i * 0.33 * 100) / 100), ...Object.values(STOPS)])].sort((a, b) => a - b);
    for (const u of steps) {
      await page.evaluate(v => scrollTo(0, v * innerHeight), u);
      await page.waitForTimeout(900); // the camera glides there
      const want = expectedShot(u);
      const { area, covered } = await marbleInFrame(page);
      // With all six in view, each marble is small there.
      const overview = u > STOPS.all - 1 && u < STOPS.create;
      expect(area, `marble in frame at ${u} screens`).toBeGreaterThan(Math.min(w, h) * Math.min(w, h) * (overview ? 0.005 : 0.03));
      await expect(page.locator('.experience'), `live shot at ${u} screens`).toHaveAttribute('data-shot', want.id);
      if (wide) await expect(page.getByRole('navigation', { name: 'Shots' }).locator('[aria-current="step"]'), `index at ${u}`).toContainText(want.label);
      const stop = SHOTS.find(x => Math.abs(STOPS[x.id]! - u) < 1e-6);
      if (stop) {
        await settled(page, want.id);
        // Settled: the marble is not behind the words, and the words fit the screen without scrolling.
        expect(covered, `marble behind the words at ${want.id}`).toBeLessThan(0.35);
        for (const [edge, gap] of Object.entries(await fits(page))) expect(gap, `${edge} at ${want.id}`).toBeGreaterThanOrEqual(edge === 'inner' ? 0 : -1);
        if (shots) {
          await page.screenshot({ path: `test-results/site/shot-${w}-${scheme}-${want.id}.png` });
          // And with its second layer open, where it has one (F-13), then closed again.
          // All six (F-60): two rows of three, each with its name; the walk's marbles at one height (F-59).
          if (want.id === 'all') {
            const names = await page.locator('.gmarble__name').evaluateAll(els => els.map(e => +getComputedStyle(e).opacity));
            expect(Math.min(...names), 'names shown with all six').toBeGreaterThan(0.6);
            const rows = await page.locator('.gmarble__orb').evaluateAll(els => els.map(e => e.getBoundingClientRect().top));
            expect(Math.max(...rows.slice(0, 3)), 'the first three above').toBeLessThan(Math.min(...rows.slice(3)));
            await page.screenshot({ path: `test-results/site/shot-${w}-${scheme}-all.png` });
          }
          // Nothing jumps (F-18): trying, the demo and changing steps leave the shot's first line where it was.
          const first = page.locator(`#${want.id} .shot__panel > * > :first-child`).first();
          const before = want.id === 'all' ? 0 : (await first.boundingBox())!.y;
          if (want.id === 'palettes') {
            await option(page.locator('#palettes'), 'State', 'thinking').pick();
            await option(page.locator('#palettes'), 'Seen in', 'Call').pick();
            await expect(page.locator('.demo__call')).toBeVisible();
            await page.waitForTimeout(900);
            for (const [edge, gap] of Object.entries(await fits(page))) expect(gap, `${edge} in a call`).toBeGreaterThanOrEqual(edge === 'inner' ? 0 : -1);
            await page.screenshot({ path: `test-results/site/shot-${w}-${scheme}-palettes-call.png` });
            expect(Math.abs((await first.boundingBox())!.y - before), 'the walk moved').toBeLessThanOrEqual(1);
            await option(page.locator('#palettes'), 'Seen in', 'Marble').pick();
          }
          if (want.id === 'create') {
            for (const name of ['Motion', 'Try it', 'Code', 'Colours']) {
              await page.locator('#create .steps').getByRole('button', { name, exact: true }).dispatchEvent('click');
              await page.waitForTimeout(300);
              for (const [edge, gap] of Object.entries(await fits(page))) expect(gap, `${edge} at ${name}`).toBeGreaterThanOrEqual(edge === 'inner' ? 0 : -1);
              await page.screenshot({ path: `test-results/site/shot-${w}-${scheme}-create-${name.replace(' ', '-').toLowerCase()}.png` });
              expect(Math.abs((await first.boundingBox())!.y - before), `create moved at ${name}`).toBeLessThanOrEqual(1);
            }
          }
          expect(errors).toEqual([]);
        }
      }
    }
    expect(errors).toEqual([]);
  });
}

test('the intro plays on load and any key skips it', async ({ page }) => {
  await page.goto('/');
  const exp = page.locator('.experience');
  await expect(exp).toHaveAttribute('data-intro', 'play');
  await expect(page.locator('.spark')).toBeAttached();
  // A key skips it; on a slow, busy run it can already have finished by itself (then there is nothing to skip).
  await skipIntro(page);
  if (!(await exp.getAttribute('data-intro-done')) || (await exp.getAttribute('data-intro')) !== 'play') await expect(exp).toHaveAttribute('data-intro', 'skip');
  await expect(page.locator('.hero__actions')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('heading', { level: 1, name: 'Talking Marble' })).toBeVisible();
});

test('the index and Page Up / Page Down move between shots', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2800); // the intro ends by itself
  for (const s of SHOTS.slice(1)) { await page.keyboard.press('PageDown'); await settled(page, s.id); }
  await page.keyboard.press('PageUp');
  await settled(page, 'create');
  for (const s of SHOTS) {
    await goToShot(page, s.label);
    await expect(page.getByRole('navigation', { name: 'Shots' }).getByRole('link', { name: s.label, exact: true })).toHaveAttribute('aria-current', 'step');
  }
  // The brand goes back to the first shot; the top bar holds nothing else (F-30).
  await page.locator('.topbar .brand').click();
  await settled(page, 'top');
  await expect(page.locator('.topbar a, .topbar button')).toHaveCount(1);
});

test('keyboard only: Tab reaches every shot in order and every control, the camera following', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await skipIntro(page);
  // Every control a visitor can Tab to right now (what is collapsed or hidden comes in once opened).
  const tabbable = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.shot a[href], .shot button:not([disabled]), .shot input, .shot textarea, .shot [tabindex="0"]')]
    .filter(el => el.tabIndex >= 0 && el.checkVisibility({ visibilityProperty: true }))
    .map(el => { el.dataset.tabId ||= Math.random().toString(36).slice(2); return el.dataset.tabId; }));
  const seen = new Set<string>();
  const order: string[] = [];
  // The overview (F-60) has nothing to press, so Tab passes over it; Page Down and the index reach it.
  const withControls = SHOTS.filter(s => s.id !== 'all').map(s => s.id);
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      el.dataset.tabId ||= Math.random().toString(36).slice(2);
      return { id: el.dataset.tabId, shot: el.closest('.shot')?.id ?? null };
    });
    if (!f.shot) { if (order.length === withControls.length) break; continue; } // back in the top bar after the last shot
    if (order.at(-1) !== f.shot) { order.push(f.shot); await settled(page, f.shot); }
    if (f.id) seen.add(f.id);
  }
  expect(order).toEqual(withControls);
  // Count at the gallery's first palette, as Tab found it ("Previous palette" is disabled there).
  await page.evaluate(() => scrollTo(0, innerHeight));
  await page.waitForTimeout(600);
  const all = await tabbable();
  const missed = all.filter(id => !seen.has(id));
  expect(await page.evaluate(ids => ids.map(id => document.querySelector(`[data-tab-id="${id}"]`)!.outerHTML.slice(0, 90)), missed)).toEqual([]);
});

test('reduced motion: no intro, no camera moves, the shots cross-fade', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.experience')).not.toHaveAttribute('data-intro');
  const world = () => page.locator('.world').evaluate(el => el.style.transform);
  const opacities = () => page.locator('.shot').evaluateAll(els => els.map(e => (e as HTMLElement).style.opacity));
  // Halfway between two shots, one is fully shown and the camera holds its keyframe, still.
  await page.evaluate(() => scrollTo(0, innerHeight * 5.4)); // between All palettes (5) and Create (6)
  await page.waitForTimeout(300);
  expect(await opacities()).toEqual(['0', '0', '1', '0', '0']);
  const a = await world();
  await page.waitForTimeout(500);
  expect(await world()).toBe(a);
  await page.evaluate(() => scrollTo(0, innerHeight * 5.6));
  await page.waitForTimeout(100);
  expect(await opacities()).toEqual(['0', '0', '0', '1', '0']);
  expect(await world()).not.toBe(a); // a cut to the next keyframe, not a move
  expect(await page.locator('#create').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0.4s');
});

for (const scheme of ['dark'] as const) {
  test(`axe at every settled shot (${scheme})`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    for (const s of SHOTS) {
      await goToShot(page, s.label);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations.map(v => `${s.id} ${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
    }
  });
}

for (const scheme of ['dark'] as const) {
  test(`a plain stage with fog: no light rigs, the bottom neutral, never tinted (${scheme})`, async ({ page }) => {
    await page.goto('/');
    await skipIntro(page);
    // A plain stage with fog (F-54): one fog canvas; no mountains, rings, beams, slabs, veils or other light rigs.
    await expect(page.locator('canvas.fog[data-fog]')).toHaveCount(1);
    await expect(page.locator('.atmos, .ridge, .veil, .ink, .beam, .slab, .edge, .edge__source, .progress, .horizon, .floor, .nebula, .vignette')).toHaveCount(0);
    await expect(page.locator('.beam, .slab, .edge, .edge__source, .progress, .horizon, .floor, .nebula, .vignette')).toHaveCount(0);
    const stage = await page.locator('.viewport').evaluate(el => getComputedStyle(el).backgroundImage);
    expect(stage).toBe('none'); // a plain colour, no gradient
    // The bottom of the frame is the plain stage at the first, a middle and the last shot.
    const plain = scheme === 'dark' ? [0, 0, 0] : [246, 246, 244];
    for (const [i, u] of [0, 5, 6].entries()) {
      await page.evaluate(v => scrollTo(0, v * innerHeight), u);
      await page.waitForTimeout(1500);
      // The last shot ends in the footer (F-32): there, the 40 px just above it.
      const end = await page.evaluate(() => document.querySelector('.shot[data-on] .footer')?.getBoundingClientRect().top ?? innerHeight);
      const png = await page.screenshot({ path: `test-results/site/light-${scheme}-${['first', 'middle', 'last'][i]}.png`, clip: { x: 0, y: Math.min(end, page.viewportSize()!.height) - 40, width: page.viewportSize()!.width, height: 40 } });
      const worst = await page.evaluate(async ([data, bg]) => {
        const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d')!; g.drawImage(img, 0, 0);
        const px = g.getImageData(0, 0, c.width, c.height).data;
        // The fog lies low by design (F-54), so the bottom may be grey; what it must never be is tinted: a coloured
        // band would show as channels pulling apart. The median pixel's channel spread stays small.
        const spreads: number[] = [];
        for (let k = 0; k < px.length; k += 16) spreads.push(Math.max(px[k]!, px[k + 1]!, px[k + 2]!) - Math.min(px[k]!, px[k + 1]!, px[k + 2]!));
        spreads.sort((a, b) => a - b);
        void bg;
        return spreads[Math.floor(spreads.length / 2)]!;
      }, [png.toString('base64'), plain] as const);
      expect(worst, `a tinted band at the bottom at ${u} screens`).toBeLessThan(12);
    }
  });
}

for (const [w, h] of [[1280, 800], [375, 812]] as const) {
  test(`the camera's distance changes from shot to shot at ${w}×${h}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/');
    await skipIntro(page);
    // The largest visible marble's on-screen diameter, as a share of the screen's height.
    const size = () => page.evaluate(() => {
      const opacity = (el: Element | null) => { let o = 1; for (; el && el !== document.body; el = el.parentElement) o *= +getComputedStyle(el).opacity; return o; };
      let d = 0;
      for (const el of document.querySelectorAll('[data-testid="main-marble"] [data-talking-marble], .gmarble__orb')) if (opacity(el) >= 0.5) d = Math.max(d, el.getBoundingClientRect().width);
      return d / innerHeight;
    });
    const at: Record<string, number> = {};
    for (const [name, u] of Object.entries({ top: 0, walkStart: STOPS.palettes, walkEnd: STOPS.all - 1, all: STOPS.all, create: STOPS.create, guide: STOPS.guide })) {
      await page.evaluate(v => scrollTo(0, v * innerHeight), u);
      await page.waitForTimeout(1600);
      at[name] = await size();
    }
    // It starts wide and far: the marble small, lots of stage around it (about a fifth of the height on desktop).
    expect(at.top!).toBeLessThan(w > h ? 0.26 : 0.2);
    // Scrolling pushes in, clearly: into the gallery and along it.
    expect(at.walkStart! / at.top!).toBeGreaterThan(1.3);
    expect(at.walkEnd! / at.walkStart!).toBeGreaterThan(1.2);
    // No two neighbouring shots share a framing: every step changes the marble's size by a fifth or more.
    const order = ['top', 'walkStart', 'all', 'create', 'guide'];
    for (let i = 1; i < order.length; i++) {
      const [a, b] = [at[order[i - 1]!]!, at[order[i]!]!];
      expect(Math.max(a, b) / Math.min(a, b), `${order[i - 1]} → ${order[i]}`).toBeGreaterThan(1.2);
    }
    // And the Guide pulls back to wide.
    expect(at.guide!).toBeLessThan(at.create!);
  });
}

test('the walk keeps every marble at one height; all six gather; the plain globe takes the stage in Create', async ({ page }) => {
  await page.goto('/');
  await skipIntro(page);
  // On the walk, the marbles in view share one line: none sits higher or lower (F-59).
  await page.evaluate(() => scrollTo(0, innerHeight * 2));
  await page.waitForTimeout(1500);
  const line = await page.locator('.gmarble__orb').evaluateAll(els => els.filter(e => +getComputedStyle(e).opacity > 0.3).map(e => { const r = e.getBoundingClientRect(); return r.top + r.height; }));
  expect(line.length).toBeGreaterThan(1);
  expect(Math.max(...line) - Math.min(...line)).toBeLessThan(60);
  // In Create the stage marble is the plain globe, not a palette (F-61).
  await page.evaluate(v => scrollTo(0, innerHeight * v), STOPS.create);
  await settled(page, 'create');
  await expect(page.getByTestId('main-marble')).toHaveAttribute('data-colors', '#ededeb #c9c9c6 #b1b1ae #dcdcd9');
  expect(+(await page.locator('.stage-marble').evaluate(el => getComputedStyle(el).opacity))).toBe(1);
  expect(await page.locator('.gmarble__orb').evaluateAll(els => Math.max(...els.map(e => +getComputedStyle(e).opacity)))).toBeLessThan(0.05);
});

test('the path is magnetic near a place, gliding there; far from every place it stays put (F-67, F-80)', async ({ page }) => {
  await page.goto('/');
  await skipIntro(page);
  const at = () => page.evaluate(() => Math.round((scrollY / innerHeight) * 100) / 100);
  const rest = async (from: number) => {
    await page.evaluate(v => scrollTo(0, v * innerHeight), from);
    await page.waitForTimeout(1600); // settle, then a glide of at most a second
    return at();
  };
  expect(await rest(4.8)).toBe(STOPS.all);
  expect(await rest(5.2)).toBe(STOPS.all);
  expect(await rest(5.8)).toBe(STOPS.create);
  expect(await rest(6.8)).toBe(STOPS.guide);
  expect(await rest(0.15)).toBe(STOPS.top);
  // On the walk (F-105) every stop settles on the nearest marble (one every 0.6 screens), however far between two.
  expect(await rest(1.25)).toBe(1);
  expect(await rest(1.35)).toBe(1.6);
  expect(await rest(2.45)).toBe(2.2);
  expect(await rest(3.75)).toBe(4);
  // In the middle of a long move between shots it does not jump.
  expect(await rest(5.5)).toBe(5.5);
  // The glide is gradual, not a jump: part way through, it is between where it stopped and where it is going.
  await page.evaluate(() => scrollTo(0, 5.75 * innerHeight));
  await page.waitForTimeout(450);
  const mid = await at();
  expect(mid).toBeGreaterThan(5.75);
  expect(mid).toBeLessThan(6);
});

test('the intro names the state its marble is in, as the demo changes (F-66)', async ({ page }) => {
  await page.goto('/');
  await skipIntro(page);
  const caption = page.getByTestId('main-marble').locator('.stage-caption');
  await expect(caption).toHaveAttribute('aria-hidden', 'true');
  const word = () => caption.locator('.stage-caption__word:not(.stage-caption__word--out)').textContent();
  const state = () => page.getByTestId('main-marble').locator('[data-talking-marble]').getAttribute('data-state');
  const first = await word();
  expect(first?.toLowerCase()).toBe(await state());
  await expect.poll(word, { timeout: 6000 }).not.toBe(first);
  expect((await word())?.toLowerCase()).toBe(await state());
  // Only on the intro.
  await goToShot(page, 'Palettes');
  await expect(caption).not.toHaveAttribute('data-on');
});
