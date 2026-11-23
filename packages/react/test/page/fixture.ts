// Playwright fixture and helpers for e2e/package-*.spec.ts: one test-page server per worker.
import { test as base, expect, type Page } from '@playwright/test';
import { startTestPage } from './server';

export const test = base.extend<object, { testPage: string }>({
  testPage: [async ({}, use) => {
    const { url, server } = await startTestPage();
    await use(url);
    await server.close();
  }, { scope: 'worker' }],
});
export { expect };

declare global {
  interface Window {
    /** test/page/main.ts */
    harness: {
      render(props: Record<string, unknown>): void;
      unmount(): void;
      stream(gain?: number): Promise<MediaStream>;
      node(gain?: number): Promise<AudioNode>;
      element(gain?: number): Promise<HTMLAudioElement>;
    };
    contexts: (AudioContext & { testOnly?: boolean })[];
    source: unknown;
  }
}

/**
 * Records every AudioContext the page makes, so a test can find the orb's shared one. Call before goto.
 * With `blockAutoplay`, emulates Chrome's default autoplay policy (headless Chromium does not enforce it):
 * the orb's contexts start suspended and resume only after a user gesture.
 */
export function recordAudioContexts(page: Page, { blockAutoplay = false } = {}) {
  return page.addInitScript(block => {
    const Original = window.AudioContext;
    window.contexts = [];
    // Playwright pages report navigator.userActivation as already active, so track real gestures here.
    let gesture = false;
    for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, e => { if (e.isTrusted) gesture = true; }, true);
    window.AudioContext = class extends Original {
      testOnly?: boolean;
      constructor(options?: AudioContextOptions) {
        super(options);
        window.contexts.push(this);
        if (block) void super.suspend();
      }
      override resume() {
        if (block && !this.testOnly && !gesture) return new Promise<void>(() => {});
        return super.resume();
      }
    };
  }, blockAutoplay);
}

/** States of the AudioContexts the orb made (the test page's own are marked testOnly). */
export const sharedContexts = (page: Page) => page.evaluate(() => window.contexts.filter(c => !c.testOnly).map(c => c.state));

/** The first orb's halo opacity: `min(1, halo + level * 0.4)` (packages/core/spec.md › Motion). */
export const haloOpacity = async (page: Page) =>
  Number(await page.locator('[data-halo]').first().evaluate(el => (el as HTMLElement).style.opacity || '0'));
