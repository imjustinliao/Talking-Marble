// DES-02 States read at a glance: the six states at 240, 48 and 20 px, on dark and light backgrounds.
// One material: states never change colour, so they must differ in brightness, energy and motion. Every marble
// is measured over time, all at once: brightness, its flicker, vein detail and pattern motion from each marble's
// own canvas (composited over the page), whole-marble movement from its inner layer's transform, halo contrast
// from page screenshots. Every pair of states must differ in at least one feature by a visible margin.
// Saves test-results/package/states-<bg>.png and emotions-<bg>.png, prints a table, annotates every pair.
import type { Page } from '@playwright/test';
import { expect, test } from '../packages/react/test/page/fixture';

const STATES = ['idle', 'connecting', 'listening', 'thinking', 'searching', 'speaking', 'error'];
const SIZES = [240, 48, 20];
const SAMPLE_MS = 3200; // longer than the slowest bounce and breath (about 2.6 s) and three heartbeats
const MOTION_MS = 150; // pattern motion: frames this far apart

// Room around each marble so neighbouring halos stay apart and every halo is on screen.
const SPACING = '#root { padding: 120px; } .grid { gap: 140px 200px; }';

/** A visible margin per feature: an absolute difference, and for `ratio` features also a relative one. */
const MARGINS = {
  luma: { abs: 3 }, // mean sphere brightness, 0–255
  flicker: { abs: 3 }, // brightness swing over time (the heartbeat, and veins drifting in and out), 0–255
  detail: { abs: 0.5, ratio: 0.25 }, // vein detail: mean luma step between neighbouring pixels
  motion: { abs: 0.3, ratio: 0.25 }, // pattern motion: mean channel change per 150 ms
  bounce: { abs: 0.5, ratio: 0.5 }, // whole-marble movement, peak to peak in CSS px
  shake: { abs: 0.5, ratio: 0.5 },
  sway: { abs: 0.5, ratio: 0.5 },
  pulse: { abs: 0.5, ratio: 0.5 },
  squash: { abs: 0.5, ratio: 0.5 },
  diameter: { abs: 1.5, ratio: 0.04 }, // visible size, CSS px
  halo: { abs: 5, ratio: 0.25 }, // halo contrast with the page
} as const;
type Feature = keyof typeof MARGINS;
const FEATURES = Object.keys(MARGINS) as Feature[];

// Pairs that no reasonable measure tells apart at a size, with the reason. Reported to the owner; remove an entry
// once the presets are fixed, so the pair is asserted again.
// Pairs allowed to look alike, with the reason. Empty: thinking vs speaking at 20 px (no movement, no halo) was
// too close until thinking's glow went 0.2 → 0.1 and brightness 1.055 → 1 (0.7.0).
const KNOWN_EXCEPTIONS: Record<string, string> = {};

/** Samples every marble on the page for SAMPLE_MS: canvases about every 33 ms, transforms every animation frame. */
function sampleAll(page: Page) {
  return page.evaluate(async ({ duration, motionStep }) => {
    const bg = getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.map(Number);
    const scratch = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const orbs = [...document.querySelectorAll<HTMLElement>('[data-talking-marble]')].map(el => {
      const canvas = el.querySelector('canvas')!;
      const w = canvas.width, c = w / 2;
      // Pixels inside 0.9 of the radius, and neighbour pairs (right, below) both inside.
      const inside = new Uint8Array(w * w);
      const mask: number[] = [];
      for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
        if (Math.hypot(x + 0.5 - c, y + 0.5 - c) / c < 0.9) { inside[y * w + x] = 1; mask.push(y * w + x); }
      }
      const pairs: number[] = [];
      for (const p of mask) { if (inside[p + 1] && (p + 1) % w) pairs.push(p, p + 1); if (inside[p + w]) pairs.push(p, p + w); }
      return {
        label: el.getAttribute('aria-label')!, size: el.getBoundingClientRect().width, canvas, w, mask, pairs,
        inner: el.firstElementChild as HTMLElement,
        prev: null as Float32Array | null,
        luma: [] as number[], chroma: [] as number[], detail: [] as number[], motion: [] as number[],
        tx: [] as number[], ty: [] as number[], rot: [] as number[], scale: [] as number[], squash: [] as number[],
      };
    });
    type Orb = (typeof orbs)[number];

    /** The sphere's on-screen colours (canvas over the page background), RGB per mask pixel. */
    function readSphere(o: Orb) {
      scratch.canvas.width = scratch.canvas.height = o.w;
      scratch.clearRect(0, 0, o.w, o.w);
      scratch.drawImage(o.canvas, 0, 0);
      const px = scratch.getImageData(0, 0, o.w, o.w).data;
      const out = new Float32Array(o.w * o.w * 3);
      for (const p of o.mask) {
        const i = p * 4, a = px[i + 3]! / 255;
        for (let ch = 0; ch < 3; ch++) out[p * 3 + ch] = px[i + ch]! * a + bg[ch]! * (1 - a);
      }
      return out;
    }
    const lumaAt = (s: Float32Array, p: number) => 0.2126 * s[p * 3]! + 0.7152 * s[p * 3 + 1]! + 0.0722 * s[p * 3 + 2]!;
    function readCanvases(withMotion: boolean) {
      for (const o of orbs) {
        const s = readSphere(o);
        let luma = 0, chroma = 0;
        for (const p of o.mask) {
          const [R, G, B] = [s[p * 3]!, s[p * 3 + 1]!, s[p * 3 + 2]!];
          luma += lumaAt(s, p);
          chroma += Math.max(R, G, B) - Math.min(R, G, B);
        }
        o.luma.push(luma / o.mask.length);
        o.chroma.push(chroma / o.mask.length);
        if (!withMotion) continue;
        let detail = 0;
        for (let k = 0; k < o.pairs.length; k += 2) detail += Math.abs(lumaAt(s, o.pairs[k]!) - lumaAt(s, o.pairs[k + 1]!));
        o.detail.push(detail / (o.pairs.length / 2));
        if (o.prev) {
          let change = 0;
          for (const p of o.mask) for (let ch = 0; ch < 3; ch++) change += Math.abs(s[p * 3 + ch]! - o.prev[p * 3 + ch]!);
          o.motion.push(change / (o.mask.length * 3));
        }
        o.prev = s;
      }
    }
    function readTransforms() {
      for (const o of orbs) {
        const t = getComputedStyle(o.inner).transform;
        const m = t === 'none' ? new DOMMatrix() : new DOMMatrix(t);
        const sx = Math.hypot(m.a, m.b), sy = (m.a * m.d - m.b * m.c) / sx;
        o.tx.push(m.e); o.ty.push(m.f);
        o.rot.push(Math.atan2(m.b, m.a));
        o.scale.push((sx + sy) / 2);
        o.squash.push((sx - sy) / 2);
      }
    }
    const start = performance.now();
    let nextMotion = start, odd = false;
    await new Promise<void>(done => {
      const tick = (now: number) => {
        readTransforms();
        // Brightness about every 33 ms (the marble draws at 30 fps), so the short heartbeat is not missed.
        if (now >= nextMotion) { readCanvases(true); nextMotion += motionStep; } else if ((odd = !odd)) readCanvases(false);
        if (now - start < duration) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });

    const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
    const p2p = (v: number[]) => Math.max(...v) - Math.min(...v);
    return orbs.map(o => ({
      label: o.label, size: o.size, frames: o.motion.length, lumaSamples: o.luma.length,
      luma: mean(o.luma), flicker: p2p(o.luma), chroma: mean(o.chroma), detail: mean(o.detail), motion: mean(o.motion),
      bounce: p2p(o.ty), shake: p2p(o.tx), sway: (p2p(o.rot) * o.size) / 2,
      pulse: p2p(o.scale) * o.size, squash: p2p(o.squash) * o.size, diameter: mean(o.scale) * o.size,
    }));
  }, { duration: SAMPLE_MS, motionStep: MOTION_MS });
}

/**
 * Halo contrast per marble, averaged over page screenshots: mean RGB distance from the page background in the
 * upper half (clear of the label) of a ring from 1.03 radii (at least 1.5 px out, past the sphere's edge) to 1.3.
 */
async function haloContrast(page: Page, shots = 4) {
  const images: string[] = [];
  for (let i = 0; i < shots; i++) {
    if (i) await page.waitForTimeout(200);
    images.push((await page.screenshot()).toString('base64'));
  }
  return page.evaluate(async images => {
    const bg = getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.map(Number);
    const boxes = [...document.querySelectorAll('[data-talking-marble]')].map(el => el.getBoundingClientRect());
    const sums = boxes.map(() => 0);
    for (const data of images) {
      const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
      boxes.forEach((b, k) => {
        const r = b.width / 2, cx = b.left + r, cy = b.top + r, from = Math.max(1.03 * r, r + 1.5), to = 1.3 * r;
        const x0 = Math.floor(cx - to), y0 = Math.floor(cy - to), w = Math.ceil(2 * to) + 1;
        const px = ctx.getImageData(x0, y0, w, w).data;
        let sum = 0, n = 0;
        for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
          const dx = x0 + x + 0.5 - cx, dy = y0 + y + 0.5 - cy, d = Math.hypot(dx, dy);
          if (dy > 0 || d <= from || d >= to) continue;
          const i = (y * w + x) * 4;
          sum += Math.hypot(px[i]! - bg[0]!, px[i + 1]! - bg[1]!, px[i + 2]! - bg[2]!);
          n++;
        }
        sums[k]! += sum / n / images.length;
      });
    }
    return sums;
  }, images);
}

async function openGrid(page: Page, url: string, count: number) {
  await page.setViewportSize({ width: 2800, height: 1100 });
  await page.goto(url);
  await page.addStyleTag({ content: SPACING });
  const orbs = page.locator('[data-talking-marble]');
  await expect(orbs).toHaveCount(count);
  for (const orb of await orbs.all()) await expect(orb).toHaveAttribute('data-ready', 'true');
  // Everything, halos included, is inside the viewport (screenshots never clip).
  const root = (await page.locator('#root').boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(root.x + root.width).toBeLessThanOrEqual(viewport.width);
  expect(root.y + root.height).toBeLessThanOrEqual(viewport.height);
  // Past the error state's entry shake (it fades within 0.6 s).
  await page.waitForTimeout(1000);
}

/** The features in which a and b differ by a visible margin, each with how far past its margin (1 = on it). */
function differences(a: Record<Feature, number>, b: Record<Feature, number>) {
  return FEATURES.map(f => {
    const m: { abs: number; ratio?: number } = MARGINS[f];
    const d = Math.abs(a[f] - b[f]), rel = d / Math.max(Math.abs(a[f]), Math.abs(b[f]), 1e-9);
    const score = Math.min(d / m.abs, m.ratio ? rel / m.ratio : Infinity);
    return { f, d, rel, score };
  });
}

for (const bg of ['dark', 'light'] as const) {
  test(`six states told apart at 240, 48 and 20 px on ${bg}`, async ({ page, testPage }, info) => {
    test.setTimeout(60_000);
    await openGrid(page, `${testPage}?view=states&sizes=${SIZES.join()}&bg=${bg}`, STATES.length * SIZES.length);
    await page.locator('#root').screenshot({ path: `test-results/package/states-${bg}.png` });

    const sampled = await sampleAll(page);
    const halos = await haloContrast(page);
    const byLabel = new Map(sampled.map((s, k) => [s.label, { ...s, halo: halos[k]! }]));

    const rows: Record<string, string | number>[] = [];
    const tooClose: string[] = [];
    const closest: { pair: string; score: number; text: string }[] = [];
    for (const size of SIZES) {
      const measured = STATES.map(state => ({ state, ...byLabel.get(`${state} ${size}`)! }));
      for (const m of measured) {
        expect(m.frames, `${m.label}: pattern frames`).toBeGreaterThanOrEqual(15);
        expect(m.lumaSamples, `${m.label}: brightness samples`).toBeGreaterThanOrEqual(50);
        rows.push({
          bg, size, state: m.state, luma: m.luma.toFixed(1), flicker: m.flicker.toFixed(1), chroma: m.chroma.toFixed(1),
          detail: m.detail.toFixed(2), motion: m.motion.toFixed(2), bounce: m.bounce.toFixed(2), shake: m.shake.toFixed(2),
          sway: m.sway.toFixed(2), pulse: m.pulse.toFixed(2), squash: m.squash.toFixed(2),
          diameter: m.diameter.toFixed(1), halo: m.halo.toFixed(1),
        });
      }
      for (let i = 0; i < measured.length; i++) {
        for (let j = i + 1; j < measured.length; j++) {
          const a = measured[i]!, b = measured[j]!;
          const pair = `${size}px ${a.state}/${b.state}`;
          const diffs = differences(a, b).sort((x, y) => y.score - x.score);
          const told = diffs.filter(d => d.score >= 1);
          const fmt = (d: (typeof diffs)[number]) => `${d.f} Δ${d.d.toFixed(2)} (${(d.rel * 100).toFixed(0)}%)`;
          const text = `${bg} ${pair}: ${told.length ? `told apart by ${told.map(fmt).join(', ')}` : `too close; best ${diffs.slice(0, 3).map(fmt).join(', ')}`}`;
          const exception = KNOWN_EXCEPTIONS[pair];
          info.annotations.push({ type: exception ? 'known exception' : told.length ? 'pair' : 'pair too close', description: exception ? `${text} (${exception})` : text });
          if (exception) { console.log(`known exception: ${text}`); continue; }
          closest.push({ pair: `${bg} ${pair}`, score: diffs[0]!.score, text: diffs.slice(0, 2).map(fmt).join(', ') });
          if (!told.length) tooClose.push(text);
        }
      }
    }
    console.table(rows);
    closest.sort((x, y) => x.score - y.score);
    console.log(`closest pairs (best feature's multiple of its margin):\n${closest.slice(0, 6).map(c => `  ${c.pair}: ×${c.score.toFixed(2)} ${c.text}`).join('\n')}`);
    expect(tooClose, 'every pair of states differs visibly in at least one feature').toEqual([]);
  });

  test(`emotions grid on ${bg}`, async ({ page, testPage }) => {
    await openGrid(page, `${testPage}?view=states&emotions=1&sizes=${SIZES.join()}&bg=${bg}`, 8 * SIZES.length);
    await page.locator('#root').screenshot({ path: `test-results/package/emotions-${bg}.png` });
  });
}
