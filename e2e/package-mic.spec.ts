// M2: a microphone stream from getUserMedia drives the orb (Chromium's fake capture device beeps).
import { expect, haloOpacity, test } from '../packages/react/test/page/fixture';

test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });

test('the orb follows a getUserMedia microphone stream', async ({ page, testPage }) => {
  await page.goto(testPage);
  await page.mouse.click(5, 5);
  await page.evaluate(async () => {
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    window.source = mic;
    window.harness.render({ state: 'probe', presets: { probe: { halo: 0, levelResponse: 1 } }, audio: mic });
  });
  let peak = 0;
  for (let i = 0; i < 30; i++) {
    peak = Math.max(peak, await haloOpacity(page));
    await page.waitForTimeout(100);
  }
  console.log('peak halo opacity from the fake mic:', peak.toFixed(3));
  expect(peak).toBeGreaterThan(0.05);
  await page.evaluate(() => window.harness.unmount());
  expect(await page.evaluate(() => (window.source as MediaStream).getAudioTracks()[0]!.readyState)).toBe('live');
});
