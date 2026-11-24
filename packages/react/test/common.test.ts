import { describe, expect, it } from 'vitest';
import { haloStrengthOf, haloStyles, sizeOf, stableKey } from '../src/common';

describe('the halo strength', () => {
  it('is 1 for true and unset, 0 for false, a number clamped to 0–1.5, and 1 for a non-finite number', () => {
    expect(haloStrengthOf(undefined)).toBe(1);
    expect(haloStrengthOf(true)).toBe(1);
    expect(haloStrengthOf(false)).toBe(0);
    expect(haloStrengthOf(0)).toBe(0);
    expect(haloStrengthOf(1.5)).toBe(1.5);
    expect(haloStrengthOf(2)).toBe(1.5);
    expect(haloStrengthOf(-1)).toBe(0);
    expect(haloStrengthOf(Number.NaN)).toBe(1);
    expect(haloStrengthOf(Infinity)).toBe(1);
  });
  it('styles the layers: opacity up to 1, brightness past it, hidden at 0', () => {
    expect(haloStyles(0)).toEqual({ opacity: '0', filter: '', display: 'none' });
    expect(haloStyles(0.5)).toEqual({ opacity: '0.5', filter: '', display: 'block' });
    expect(haloStyles(1)).toEqual({ opacity: '1', filter: '', display: 'block' });
    expect(haloStyles(1.5)).toEqual({ opacity: '1', filter: 'brightness(1.5)', display: 'block' });
  });
});

describe('the size', () => {
  it('is a finite number above 0, else unset (fill the container)', () => {
    expect(sizeOf(120)).toBe(120);
    expect(sizeOf(20.5)).toBe(20.5);
    for (const odd of [0, -5, Number.NaN, Infinity, -Infinity, '120', null, undefined]) expect(sizeOf(odd), String(odd)).toBeUndefined();
  });
});

describe('the presets key', () => {
  it('is the same for equal content, different for a change, and never throws on a cycle', () => {
    expect(stableKey({ mine: { speed: 2 } })).toBe(stableKey({ mine: { speed: 2 } }));
    expect(stableKey({ mine: { speed: 2 } })).not.toBe(stableKey({ mine: { speed: 3 } }));
    expect(stableKey(undefined)).toBe('');
    const cyclic: Record<string, unknown> = { mine: { speed: 2 } };
    cyclic.self = cyclic;
    expect(() => stableKey(cyclic)).not.toThrow();
    expect(stableKey(cyclic)).toBe(stableKey(cyclic));
    const other: Record<string, unknown> = {};
    other.self = other;
    expect(stableKey(other)).not.toBe(stableKey(cyclic));
  });
});
