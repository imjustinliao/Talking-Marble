import { expect, test } from '@playwright/test';
import { home, toShot } from './site-helpers';

// A real (fake-device) microphone, allowed. Its own file: launch options need their own worker.
test.use({
  permissions: ['microphone'],
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
});
test.describe.configure({ timeout: 60_000 });

test("the browser's microphone feeds the marble while you answer", async ({ page }) => {
  await page.addInitScript(() => { delete (window as { speechSynthesis?: unknown }).speechSynthesis; });
  await home(page);
  await toShot(page, 'talk');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('main-marble')).toHaveAttribute('data-voice', 'mic', { timeout: 15_000 });
  await expect(page.locator('.caption__who')).toContainText('You');
  await page.getByRole('button', { name: 'End' }).click();
  await expect(page.getByTestId('main-marble')).not.toHaveAttribute('data-voice', 'mic');
});
