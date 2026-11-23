// DES-02 measurements: the six states at 48 and 240 px, on dark and light backgrounds.
// Saves test-results/package/states-<bg>.png and prints each state's numbers and every pair's differences.
// Measure-only for now: the states' look is being redesigned in Main (feedback F-1), so this records how far
// apart the states are without failing; turn the pair check back into an assertion once the redesign lands.
import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../packages/react/test/page/fixture';

const STATES = ['idle', 'connecting', 'listening', 'thinking', 'speaking', 'error'];

/**
 * Measures one orb from page screenshots (DPR 1): the sphere's mean lightness and chroma, the halo ring's
 * contrast with the page, and motion (mean absolute change inside the sphere across five 150 ms steps).
 */
async function measure(page: Page, orb: Locator) {
  const box = (await orb.boundingBox())!;
  const pad = Math.ceil(box.width * 0.3);
  const clip = { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad };
  const shots: string[] = [];
  for (let i = 0; i < 6; i++) {
    if (i) await page.waitForTimeout(150);
    shots.push((await page.screenshot({ clip })).toString('base64'));
  }
  return page.evaluate(async ({ shots, r, pad }) => {
    const load = async (d: string) => {
      const img = new Image(); img.src = `data:image/png;base64,${d}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
      return { px: ctx.getImageData(0, 0, c.width, c.height).data, w: c.width };
    };
    const frames = await Promise.all(shots.map(load));
    const { px, w } = frames[0]!;
    const bg = [px[0]!, px[1]!, px[2]!];
    const c = r + pad;
    let luma = 0, chroma = 0, n = 0, halo = 0, h = 0;
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / r;
      const i = (y * w + x) * 4;
      const [R, G, B] = [px[i]!, px[i + 1]!, px[i + 2]!];
      if (d < 0.9) { luma += 0.2126 * R + 0.7152 * G + 0.0722 * B; chroma += Math.max(R, G, B) - Math.min(R, G, B); n++; }
      else if (d > 1.03 && d < 1.3) { halo += Math.hypot(R - bg[0]!, G - bg[1]!, B - bg[2]!); h++; }
    }
    let motion = 0, m = 0;
    for (let f = 1; f < frames.length; f++) {
      const a = frames[f - 1]!.px, b = frames[f]!.px;
      for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
        if (Math.hypot(x + 0.5 - c, y + 0.5 - c) / r >= 0.9) continue;
        const i = (y * w + x) * 4;
        motion += Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!);
        m += 3;
      }
    }
    return { luma: luma / n, chroma: chroma / n, halo: halo / h, motion: motion / m };
  }, { shots, r: box.width / 2, pad });
}

for (const bg of ['dark', 'light'] as const) {
  test(`states at 48 and 240 px on ${bg}`, async ({ page, testPage }, info) => {
    await page.setViewportSize({ width: 1900, height: 760 });
    await page.goto(`${testPage}?view=states&bg=${bg}`);
    // Room around each orb so its halo is inside the measured clip.
    await page.addStyleTag({ content: '#root { padding: 90px; }' });
    const orbs = page.locator('[data-talking-marble]');
    await expect(orbs).toHaveCount(12);
    for (const orb of await orbs.all()) await expect(orb).toHaveAttribute('data-ready', 'true');
    await page.waitForTimeout(500);
    await page.locator('.grid').screenshot({ path: `test-results/package/states-${bg}.png` });

    const rows: Record<string, unknown>[] = [];
    for (const size of [240, 48]) {
      const measured = [];
      for (const state of STATES) {
        const m = await measure(page, page.getByRole('img', { name: `${state} ${size}` }));
        measured.push({ state, ...m });
        rows.push({ bg, size, state, luma: m.luma.toFixed(1), chroma: m.chroma.toFixed(1), halo: m.halo.toFixed(1), motion: m.motion.toFixed(2) });
      }
      // Every pair differs visibly in lightness, colorfulness, halo or motion.
      for (let i = 0; i < measured.length; i++) {
        for (let j = i + 1; j < measured.length; j++) {
          const a = measured[i]!, b = measured[j]!;
          const diff = {
            luma: Math.abs(a.luma - b.luma), chroma: Math.abs(a.chroma - b.chroma), halo: Math.abs(a.halo - b.halo),
            motion: Math.abs(a.motion - b.motion) / Math.max(a.motion, b.motion, 0.01),
          };
          const told = diff.luma > 3 || diff.chroma > 3 || diff.halo > 3 || diff.motion > 0.25;
          const text = `${bg} ${size}px ${a.state}/${b.state}: Δluma ${diff.luma.toFixed(1)}, Δchroma ${diff.chroma.toFixed(1)}, Δhalo ${diff.halo.toFixed(1)}, motion ${(diff.motion * 100).toFixed(0)}%`;
          info.annotations.push({ type: told ? 'pair' : 'pair too close', description: text });
        }
      }
    }
    console.table(rows);
    for (const a of info.annotations) if (a.type === 'pair too close') console.log('too close:', a.description);
  });
}
