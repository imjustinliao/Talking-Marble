// @vitest-environment node
// Server rendering: the component renders in Node with no DOM globals, as the still fallback picture.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TalkingMarble } from '../src/index';

describe('server rendering', () => {
  it('runs without window or document', () => {
    expect(typeof (globalThis as { window?: unknown }).window).toBe('undefined');
    expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined');
  });
  it('renders the fallback picture, labelled, not ready', () => {
    const html = renderToString(createElement(TalkingMarble, { state: 'speaking', palette: 'ember', size: 120, label: 'Nova', audio: null }));
    expect(html).toContain('data-talking-marble');
    expect(html).toContain('data-ready="false"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Nova, speaking"');
    expect(html).toMatch(/data-fallback[^>]*radial-gradient/);
    expect(html).toContain('#ff6028');
    expect(html).toMatch(/<canvas[^>]*opacity:0/);
  });
  it('renders decorative orbs hidden from assistive technology', () => {
    const html = renderToString(createElement(TalkingMarble, { decorative: true, emotion: 'calm' }));
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="img"');
  });
});
