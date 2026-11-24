// @vitest-environment node
// The Web Component's attribute parsing, and that importing it on a server (no DOM) is safe.
import { describe, expect, it } from 'vitest';
import { defineTalkingMarble, haloFromAttribute, numberFromAttribute, paletteFromAttribute, presetsFromAttribute } from '../src/element';

describe('<talking-marble> attributes', () => {
  it('reads a palette name or hex colours', () => {
    expect(paletteFromAttribute('ember')).toBe('ember');
    expect(paletteFromAttribute('#000, #111 #222,#333')).toEqual(['#000', '#111', '#222', '#333']);
    expect(paletteFromAttribute('  ')).toBeUndefined();
    expect(paletteFromAttribute(null)).toBeUndefined();
  });
  it('reads the halo as on, off or a strength', () => {
    expect(haloFromAttribute(null)).toBe(true);
    expect(haloFromAttribute('')).toBe(true);
    expect(haloFromAttribute('false')).toBe(false);
    expect(haloFromAttribute('off')).toBe(false);
    expect(haloFromAttribute('0.4')).toBe(0.4);
    expect(haloFromAttribute('bright')).toBe(true);
  });
  it('reads numbers and presets JSON, ignoring what is not', () => {
    expect(numberFromAttribute('120')).toBe(120);
    expect(numberFromAttribute('big')).toBeUndefined();
    expect(numberFromAttribute('')).toBeUndefined();
    expect(presetsFromAttribute('{"mine":{"speed":2}}')).toEqual({ mine: { speed: 2 } });
    expect(presetsFromAttribute('{oops')).toBeUndefined();
    expect(presetsFromAttribute('[1]')).toBeUndefined();
  });
  it('imports and defines nothing on a server', () => {
    expect(typeof (globalThis as { customElements?: unknown }).customElements).toBe('undefined');
    expect(() => defineTalkingMarble()).not.toThrow();
  });
});
