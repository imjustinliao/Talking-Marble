// M2 Audio (ORB-02, DES-03): every audio source drives the orb, `level` overrides it, sources are released.
import type { Page } from '@playwright/test';
import { expect, haloOpacity as opacity, recordAudioContexts, sharedContexts, test } from '../packages/react/test/page/fixture';

// A probe state: no resting halo and full level response, so halo opacity = smoothed level * 0.4 exactly.
const PROBE = { state: 'probe', presets: { probe: { halo: 0, levelResponse: 1 } } };

async function open(page: Page, url: string) {
  await recordAudioContexts(page);
  await page.goto(url);
  // A real gesture, so every context may start (autoplay policy).
  await page.mouse.click(5, 5);
}


for (const kind of ['stream', 'element', 'node'] as const) {
  test(`a ${kind === 'stream' ? 'MediaStream' : kind === 'element' ? 'HTMLMediaElement' : 'AudioNode'} raises the orb's level`, async ({ page, testPage }) => {
    await open(page, testPage);
    await page.evaluate(p => window.harness.render(p), PROBE);
    await expect(page.locator('[data-talking-marble]')).toHaveAttribute('data-ready', 'true');
    await page.waitForTimeout(300);
    expect(await opacity(page)).toBeLessThan(0.01);

    await page.evaluate(async ({ kind, probe }) => {
      window.source = await window.harness[kind](0.5);
      window.harness.render({ ...probe, audio: window.source });
    }, { kind, probe: PROBE });
    // A 0.5 sine has rms 0.354 → level 1; smoothing at 10/s reaches it within half a second.
    await expect.poll(() => opacity(page), { timeout: 3000 }).toBeGreaterThan(0.35);
    if (kind !== 'node') expect(await sharedContexts(page)).toEqual(['running']);
    if (kind === 'element') {
      // Still playing (it is routed back to the speakers, not swallowed by the analyser).
      expect(await page.evaluate(() => !(window.source as HTMLAudioElement).paused)).toBe(true);
    }
  });
}

test('a quiet source gives a proportionally lower level', async ({ page, testPage }) => {
  await open(page, testPage);
  await page.evaluate(async probe => {
    window.harness.render({ ...probe, audio: await window.harness.stream(0.06) });
  }, PROBE);
  // rms 0.0424 → level (0.0424 - 0.01) * 7 = 0.227 → opacity 0.091.
  await expect.poll(() => opacity(page), { timeout: 3000 }).toBeGreaterThan(0.07);
  await page.waitForTimeout(500);
  expect(await opacity(page)).toBeLessThan(0.12);
});

test('`level` overrides `audio`', async ({ page, testPage }) => {
  await open(page, testPage);
  await page.evaluate(async probe => {
    window.source = await window.harness.stream(0.5);
    window.harness.render({ ...probe, audio: window.source, level: 0 });
  }, PROBE);
  await page.waitForTimeout(800);
  expect(await opacity(page)).toBeLessThan(0.01);
  await page.evaluate(probe => window.harness.render({ ...probe, audio: window.source, level: 0.5 }), PROBE);
  await expect.poll(() => opacity(page)).toBeCloseTo(0.2, 2);
});

test('states that do not listen ignore audio; listening reacts gently', async ({ page, testPage }) => {
  await open(page, testPage);
  await page.evaluate(async () => {
    window.source = await window.harness.stream(0.5);
    window.harness.render({ state: 'idle', audio: window.source });
  });
  await page.waitForTimeout(800);
  expect(await opacity(page)).toBeCloseTo(0.5, 2);
  // listening: halo 0.55 + level (1 × levelResponse 0.5) × 0.4 = 0.75.
  await page.evaluate(() => window.harness.render({ state: 'listening', audio: window.source }));
  await expect.poll(() => opacity(page), { timeout: 3000 }).toBeGreaterThan(0.72);
});

test('removing the audio or unmounting releases it and never stops the stream', async ({ page, testPage }) => {
  await open(page, testPage);
  await page.evaluate(async probe => {
    window.source = await window.harness.stream(0.5);
    window.harness.render({ ...probe, audio: window.source });
  }, PROBE);
  await expect.poll(() => opacity(page), { timeout: 3000 }).toBeGreaterThan(0.35);
  await page.evaluate(probe => window.harness.render({ ...probe, audio: null }), PROBE);
  await expect.poll(() => opacity(page), { timeout: 3000 }).toBeLessThan(0.01);
  await page.evaluate(() => window.harness.unmount());
  const tracks = await page.evaluate(() => (window.source as MediaStream).getAudioTracks().map(t => t.readyState));
  expect(tracks).toEqual(['live']);
});

test('orbs share one AudioContext', async ({ page, testPage }) => {
  await open(page, testPage);
  await page.evaluate(async probe => {
    const a = await window.harness.stream(0.5);
    window.harness.render({ ...probe, audio: a });
  }, PROBE);
  await expect.poll(() => opacity(page), { timeout: 3000 }).toBeGreaterThan(0.35);
  await page.evaluate(async probe => {
    const b = await window.harness.stream(0.5);
    window.harness.render({ ...probe, audio: b });
  }, PROBE);
  await page.waitForTimeout(300);
  expect(await sharedContexts(page)).toEqual(['running']);
});
