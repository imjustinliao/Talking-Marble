import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { BUILT_INS, goToShot, skipIntro, trackErrors } from './site-helpers';

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
  for (const state of ['idle', 'connecting', 'listening', 'thinking', 'searching', 'speaking', 'error']) {
    await word(page, state).click();
    await expect(word(page, state)).toHaveAttribute('aria-pressed', 'true');
    for (const orb of await orbs(page).all()) await expect(orb).toHaveAttribute('data-state', state);
  }
  await word(page, 'happy').click();
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
  await word(page, 'thinking').click();
  await walkShot(page).getByRole('button', { name: 'Next palette' }).click();
  await expect(walkShot(page).locator('.walk__name')).toHaveText('Ember');
  await expect(word(page, 'thinking')).toHaveAttribute('aria-pressed', 'true');
  await expect(orbs(page).nth(1)).toHaveAttribute('data-state', 'thinking');
  await page.waitForTimeout(1500); // the camera walks on
  expect(Math.abs((await top()) - before)).toBeLessThanOrEqual(1);
});

test('talk without a mic: a simulated conversation, seen in a call, a chat bar and a message; End returns', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
  });
  await open(page);
  const top = await walkShot(page).locator('.walk__name').evaluate(el => el.getBoundingClientRect().top);
  await walkShot(page).getByRole('button', { name: 'Talk' }).click();
  const line = walkShot(page).locator('.shot__line');
  await expect(line).toHaveText('Listening to a simulated you (no microphone).');
  const front = orbs(page).first();
  await expect(front).toHaveAttribute('data-state', 'listening');
  // The turn passes to the marble: it thinks, then speaks, then listens again.
  await expect(line).toHaveText('Thinking…', { timeout: 6000 });
  await expect(front).toHaveAttribute('data-state', 'thinking');
  await expect(line).toHaveText('Speaking. A simulated reply for now.', { timeout: 4000 });
  await expect(front).toHaveAttribute('data-state', 'speaking');
  // Seen in an everyday UI, its small marble wearing this palette and doing the same.
  const ui = walkShot(page).locator('.mock');
  await expect(ui).toHaveClass(/mock--call/);
  await expect(ui.locator('[data-talking-marble]')).toHaveAttribute('data-state', 'speaking');
  await word(page, 'Chat bar').click();
  await expect(ui).toHaveClass(/mock--input/);
  await word(page, 'Message').click();
  await expect(ui).toHaveClass(/mock--chat/);
  expect(Math.abs((await walkShot(page).locator('.walk__name').evaluate(el => el.getBoundingClientRect().top)) - top)).toBeLessThanOrEqual(1);
  await walkShot(page).getByRole('button', { name: 'End' }).click();
  await expect(walkShot(page).getByRole('button', { name: 'Talk' })).toBeVisible();
  await expect(front).toHaveAttribute('data-state', 'speaking'); // back to what you were trying
});

test('talk with a mic: your voice drives listening; End releases the mic', async ({ page }) => {
  // A silent stream stands in for a microphone; nothing is recorded or sent.
  await page.addInitScript(() => {
    const w = window as unknown as { __stopped: number };
    w.__stopped = 0;
    navigator.mediaDevices.getUserMedia = async () => {
      const stream = new AudioContext().createMediaStreamDestination().stream;
      for (const t of stream.getTracks()) { const stop = t.stop.bind(t); t.stop = () => { w.__stopped++; stop(); }; }
      return stream;
    };
  });
  await open(page);
  await walkShot(page).getByRole('button', { name: 'Talk' }).click();
  await expect(walkShot(page).locator('.shot__line')).toHaveText('Listening. Speak, then pause. Audio stays in this browser.');
  await expect(orbs(page).first()).toHaveAttribute('data-state', 'listening');
  // Silence is not the end of your turn: it keeps listening until you have spoken and paused.
  await page.waitForTimeout(2500);
  await expect(orbs(page).first()).toHaveAttribute('data-state', 'listening');
  await walkShot(page).getByRole('button', { name: 'End' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __stopped: number }).__stopped)).toBeGreaterThan(0);
});

test('leaving the walk ends a conversation', async ({ page }) => {
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('no', 'NotAllowedError')); });
  await open(page);
  await walkShot(page).getByRole('button', { name: 'Talk' }).click();
  await expect(walkShot(page).getByRole('button', { name: 'End' })).toBeVisible();
  await goToShot(page, 'Guide');
  await goToShot(page, 'Palettes');
  await expect(walkShot(page).getByRole('button', { name: 'Talk' })).toBeVisible();
});

for (const scheme of ['dark'] as const) {
  test(`the walk is axe clean, trying and talking (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(t => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('no', 'NotAllowedError'));
    }, scheme);
    await page.goto('/');
    await goToShot(page, 'Palettes');
    const axe = () => new AxeBuilder({ page }).include('#palettes').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect((await axe()).violations.map(v => v.id)).toEqual([]);
    await walkShot(page).getByRole('button', { name: 'Talk' }).click();
    await expect(walkShot(page).locator('.mock')).toBeVisible();
    expect((await axe()).violations.map(v => v.id)).toEqual([]);
  });
}
