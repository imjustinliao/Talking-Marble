import { describe, expect, it } from 'vitest';
import { fallbackBackground, fallbackShadow, haloShadow } from '../src/render/css';
import { approach, easedFrom, easeToward, resolveState, SNAP } from '../src/state';
import { palettes, rgba } from '../src/colors';

describe('easing snaps to its target (packages/core/spec.md › Motion)', () => {
  it('follows the exponential step while far away', () => {
    expect(approach(0, 1, 0.5)).toBe(0.5);
  });
  it('lands exactly on the target once within SNAP', () => {
    expect(approach(1 - SNAP, 1, 0.5)).toBe(1);
  });
  it('settles a state change to exactly the target values', () => {
    const current = easedFrom(resolveState('idle'));
    const target = resolveState('error');
    for (let i = 0; i < 120; i++) easeToward(current, target, 1 / 30);
    expect(current.saturation).toBe(target.saturation);
    expect(current.brightness).toBe(target.brightness);
  });
});

describe('CSS layers', () => {
  it('paints the fallback in the palette: three pigments over the ground', () => {
    const css = fallbackBackground(palettes.ember);
    for (const c of palettes.ember.slice(1)) expect(css).toContain(c);
    expect(css.endsWith(palettes.ember[0])).toBe(true);
  });
  it('scales the halo and fallback shading with the orb', () => {
    expect(haloShadow(palettes.pearl, 100)).toBe(`0 0 12.0px 3.0px ${rgba('#61d9d0', 0.7)}, 0 0 30.0px 7.0px ${rgba('#ef9fc5', 0.45)}`);
    expect(fallbackShadow(200)).toContain('inset -13.4px -16.6px 33.4px');
  });
  it('writes rgba from hex', () => {
    expect(rgba('#ff6028', 0.5)).toBe('rgba(255,96,40,0.5)');
    expect(rgba('#abc', 1)).toBe('rgba(170,187,204,1)');
  });
});
