// M2: an AudioContext blocked by the autoplay policy resumes on the next user gesture.
import { expect, haloOpacity, recordAudioContexts, sharedContexts, test } from '../packages/react/test/page/fixture';

test('the shared AudioContext waits, then resumes on the next gesture', async ({ page, testPage }) => {
  await recordAudioContexts(page, { blockAutoplay: true });
  await page.goto(testPage);
  await page.evaluate(async () => {
    window.harness.render({ state: 'probe', presets: { probe: { halo: 0, reactivity: 1 } }, audio: await window.harness.stream(0.5) });
  });
  await page.waitForTimeout(300);
  expect(await sharedContexts(page)).toEqual(['suspended']);
  expect(await haloOpacity(page)).toBeLessThan(0.01);
  await page.keyboard.press('a');
  await expect.poll(() => sharedContexts(page)).toEqual(['running']);
});
