import { expect, test } from '@playwright/test';
import { home, mainOrb, shot, toShot } from './site-helpers';

test.describe.configure({ timeout: 60_000 });
const noSpeech = () => { delete (window as { speechSynthesis?: unknown }).speechSynthesis; };

test('the word drum switches state or emotion by click, keyboard and wheel', async ({ page }) => {
  await home(page);
  await toShot(page, 'talk');
  const drum = page.getByRole('group', { name: 'Pick a state or emotion' });
  await drum.getByRole('button', { name: 'thinking', exact: true }).click();
  await expect(mainOrb(page)).toHaveAttribute('data-state', 'thinking');
  await drum.getByRole('button', { name: 'thinking', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(mainOrb(page)).toHaveAttribute('data-state', 'speaking');
  await expect(drum.getByRole('button', { name: 'speaking', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await expect(mainOrb(page)).toHaveAttribute('data-state', 'muted');
  await page.keyboard.press('Home');
  await expect(mainOrb(page)).toHaveAttribute('data-state', 'idle');
  await expect(drum.locator('button[tabindex="0"]')).toHaveCount(1);
  await expect.poll(() => page.locator('.shot--talk .drum__track').evaluate(el => el.scrollTop)).toBe(0);
  await page.locator('.shot--talk .drum__track').hover();
  await page.mouse.wheel(0, 44 * 2);
  await expect(mainOrb(page)).toHaveAttribute('data-state', 'listening', { timeout: 3000 });
});

test('a conversation without speech synthesis or a mic: captions and a simulated voice', async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
  });
  await home(page);
  await toShot(page, 'talk');
  const states: string[] = [];
  await page.exposeFunction('noteState', (s: string) => { if (states.at(-1) !== s) states.push(s); });
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="main-marble"] [data-talking-marble]')!;
    new MutationObserver(() => (window as unknown as { noteState(s: string): void }).noteState(el.getAttribute('data-state')!)).observe(el, { attributes: true, attributeFilter: ['data-state'] });
  });
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('.talk__note')).toContainText('no speech voice');
  await expect(mainOrb(page)).toHaveAttribute('data-state', 'speaking', { timeout: 5000 });
  await expect.poll(() => page.locator('.caption__word.is-lit').count()).toBeGreaterThan(2);
  await expect.poll(async () => Number(await page.getByTestId('main-marble').getAttribute('data-level')), { timeout: 5000 }).toBeGreaterThan(0.1);
  await expect(mainOrb(page)).toHaveAttribute('data-state', 'listening', { timeout: 10_000 });
  await expect(page.getByTestId('main-marble')).toHaveAttribute('data-voice', 'sim');
  await expect(page.locator('.caption__who')).toContainText('You · simulated');
  await expect(page.getByRole('button', { name: 'Again' })).toBeVisible({ timeout: 30_000 });
  expect(states).toEqual(['connecting', 'speaking', 'listening', 'thinking', 'speaking', 'idle']);
  // Keyboard focus comes back to the button when it ends by itself.
  await expect(page.getByRole('button', { name: 'Again' })).toBeFocused();
});

test('End and Esc stop the conversation; leaving the shot ends it too', async ({ page }) => {
  await page.addInitScript(noSpeech);
  await home(page);
  await toShot(page, 'talk');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(mainOrb(page)).toHaveAttribute('data-state', 'speaking', { timeout: 5000 });
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.getByRole('button', { name: 'Again' })).toBeFocused();
  await page.getByRole('button', { name: 'Again' }).click();
  await expect(page.getByRole('button', { name: 'End' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Again' })).toBeVisible();
  await page.getByRole('button', { name: 'Again' }).click();
  await expect(page.getByRole('button', { name: 'End' })).toBeVisible();
  await page.keyboard.press('PageDown');
  await expect(shot(page, 'install')).toHaveClass(/is-on/);
  await toShot(page, 'talk');
  await expect(page.getByRole('button', { name: 'Again' })).toBeVisible();
});

test('"Talk to it" in the first shot moves to the talk shot and starts', async ({ page }) => {
  await page.addInitScript(noSpeech);
  await home(page);
  await page.getByRole('button', { name: 'Talk to it' }).click();
  await expect(shot(page, 'talk')).toHaveClass(/is-on/, { timeout: 5000 });
  await expect(page.getByRole('button', { name: 'End' })).toBeVisible();
});

test('with a mic, the stream goes to the marble while you answer, and is released', async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    const w = window as unknown as { micTracks: MediaStreamTrack[] };
    w.micTracks = [];
    // A silent generated stream stands in for the microphone.
    navigator.mediaDevices.getUserMedia = async () => {
      const dest = new AudioContext().createMediaStreamDestination();
      w.micTracks.push(...dest.stream.getTracks());
      return dest.stream;
    };
  });
  await home(page);
  await toShot(page, 'talk');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('main-marble')).toHaveAttribute('data-voice', 'mic', { timeout: 10_000 });
  await expect(mainOrb(page)).toHaveAttribute('data-state', 'listening');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(mainOrb(page)).toHaveAttribute('data-state', 'thinking');
  expect(await page.evaluate(() => (window as unknown as { micTracks: MediaStreamTrack[] }).micTracks.map(t => t.readyState))).toEqual(['ended']);
});

test('a mic granted after End is stopped at once', async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
    const w = window as unknown as { micTracks: MediaStreamTrack[]; grant?: () => void };
    w.micTracks = [];
    navigator.mediaDevices.getUserMedia = () => new Promise(resolve => {
      w.grant = () => { const dest = new AudioContext().createMediaStreamDestination(); w.micTracks.push(...dest.stream.getTracks()); resolve(dest.stream); };
    });
  });
  await home(page);
  await toShot(page, 'talk');
  await page.getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'End' }).click();
  await page.evaluate(() => (window as unknown as { grant(): void }).grant());
  await expect.poll(() => page.evaluate(() => (window as unknown as { micTracks: MediaStreamTrack[] }).micTracks.map(t => t.readyState))).toEqual(['ended']);
});
