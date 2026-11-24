import { describe, expect, it } from 'vitest';
import { fallbackBackground, fallbackShadow, haloShadow } from '../src/render/css';
import { approach, baseParams, easedFrom, easeToward, NUMERIC, paramRanges, resolveState, SNAP, type OrbParams } from '../src/state';
import { backingSize } from '../src/render/shared';
import { createMotion, haloOpacityOf, smallness, stepMotion, transformOf, uniformsOf } from '../src/render/motion';
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
    expect(current.x.chop).toBe(target.chop);
    expect(current.x.brightness).toBe(target.brightness);
  });
});

/** Runs a state for `seconds` at 30 fps from idle; returns the motion and eased values. */
function run(state: string, seconds: number, level = 0, still = false, emotion?: string) {
  const m = createMotion();
  const eased = easedFrom(resolveState('idle'));
  const target = resolveState(state, undefined, emotion);
  for (let i = 0; i < seconds * 30; i++) stepMotion(m, eased, target, level, 1 / 30, still);
  return { m, x: eased.x, target };
}

describe('the motion model (packages/core/spec.md › Motion)', () => {
  it('leaves idle without any whole-marble movement', () => {
    const { m, x } = run('idle', 2);
    expect(transformOf(m, x, 0, false)).toBe('');
    expect(m.time).toBeCloseTo(2, 5);
  });
  it('turns the time by speed and the pattern by spin', () => {
    const { m } = run('thinking', 3);
    expect(m.time).toBeGreaterThan(6);
    expect(m.spin).toBeGreaterThan(1.5);
    expect(run('error', 3).m.spin).toBeLessThan(0);
  });
  it('sends ripples out when speaking and in when listening or connecting', () => {
    expect(run('speaking', 1).m.ripplePhase).toBeGreaterThan(0);
    expect(run('connecting', 1).m.ripplePhase).toBeLessThan(0);
  });
  it('follows the voice only with reactivity: fast attack, slower release', () => {
    expect(run('idle', 1, 1).m.level).toBe(0);
    expect(run('speaking', 0.3, 1).m.level).toBeGreaterThan(0.95);
    expect(run('listening', 1, 1).m.level).toBeCloseTo(0.6, 3);
    expect(run('speaking', 1, 1, false, 'muted').m.level).toBeCloseTo(0.35, 3);
  });
  it('shakes on entering error, then calms (the beat keeps a small tremor)', () => {
    const m = createMotion();
    const eased = easedFrom(resolveState('idle'));
    const target = resolveState('error');
    stepMotion(m, eased, target, 0, 1 / 30, false);
    expect(m.burst).toBeGreaterThan(0.9);
    for (let i = 0; i < 60; i++) stepMotion(m, eased, target, 0, 1 / 30, false);
    expect(m.burst).toBe(0);
  });
  it('moves the whole marble in lively states, never in reduced motion or below 32 px', () => {
    const lively = run('speaking', 1.3, 0.8, false, 'happy');
    expect(transformOf(lively.m, lively.x, 0, false)).toMatch(/translate/);
    expect(transformOf(lively.m, lively.x, 1, false)).toBe('');
    const still = run('connecting', 2, 0, true);
    // Still: only the static size remains.
    expect(transformOf(still.m, still.x, 0, true)).toBe('translate(0.000%, 0.000%) rotate(0.000deg) scale(0.90000, 0.90000)');
    expect(still.m.time).toBe(0);
  });
  it('lets the halo follow the beat and the voice', () => {
    const { m, x } = run('speaking', 1, 1);
    expect(haloOpacityOf(m, x)).toBeCloseTo(1, 3);
    const idle = run('idle', 1);
    expect(haloOpacityOf(idle.m, idle.x)).toBe(0.5);
  });
  it('tunes small sizes: broader veins, less detail, no grain, more contrast', () => {
    expect(smallness(240)).toBe(0);
    expect(smallness(48)).toBe(0);
    expect(smallness(40)).toBe(0.5);
    expect(smallness(20)).toBe(1);
    const { m, x } = run('idle', 0);
    const small = uniformsOf(m, x, 1, false);
    expect(small).toMatchObject({ uGrain: 0, uContrast: 1.12, uDetail: 0.25 });
    expect(small.uScale).toBeCloseTo(0.84, 9);
  });
});

describe('CSS layers', () => {
  it('paints the fallback in the palette: three pigments over the ground', () => {
    const css = fallbackBackground(palettes.ember);
    for (const c of palettes.ember.slice(1)) expect(css).toContain(c);
    expect(css.endsWith(palettes.ember[0])).toBe(true);
  });
  it('scales the halo and fallback shading with the orb', () => {
    expect(haloShadow(palettes.pearl, 100)).toBe(`0 0 11.0px 2.5px ${rgba('#61d9d0', 0.52)}, 0 0 26.0px 5.0px ${rgba('#ef9fc5', 0.32)}`);
    // Tighter at small sizes.
    expect(haloShadow(palettes.pearl, 100, 0.5)).toBe(`0 0 7.7px 1.8px ${rgba('#61d9d0', 0.52)}, 0 0 18.2px 3.5px ${rgba('#ef9fc5', 0.32)}`);
    expect(fallbackShadow(200)).toContain('inset -13.4px -16.6px 33.4px');
  });
  it('writes rgba from hex', () => {
    expect(rgba('#ff6028', 0.5)).toBe('rgba(255,96,40,0.5)');
    expect(rgba('#abc', 1)).toBe('rgba(170,187,204,1)');
  });
});

describe('motion edge cases', () => {
  it('advances the scan by dt × (0.8 + 0.4 × speed), and freezes it in reduced motion', () => {
    const target = resolveState('thinking');
    const m = createMotion();
    const eased = easedFrom(target);
    stepMotion(m, eased, target, 0, 0.1, false);
    expect(m.scanPhase).toBeCloseTo(0.1 * (0.8 + 0.4 * target.speed), 9);
    const still = createMotion();
    stepMotion(still, easedFrom(target), target, 0, 0.1, true);
    expect(still.scanPhase).toBe(0);
    const x = { ...eased.x, scan: 0.7 };
    expect(uniformsOf(m, x, 0, false).uScan).toBe(0.7);
  });
  it('stays finite with every parameter at its min and at its max', () => {
    for (const end of [0, 1] as const) {
      for (const rippleDirection of ['in', 'out'] as const) {
        const target = { ...baseParams, rippleDirection } as OrbParams;
        for (const key of NUMERIC) target[key] = paramRanges[key][end];
        const m = createMotion();
        const eased = easedFrom(target);
        for (let i = 0; i < 90; i++) stepMotion(m, eased, target, 1, 1 / 30, false);
        for (const k of [0, 0.5, 1]) {
          for (const still of [false, true]) {
            for (const [name, value] of Object.entries(uniformsOf(m, eased.x, k, still))) {
              expect(Number.isFinite(value), `${name} (${end ? 'max' : 'min'}, k ${k})`).toBe(true);
            }
            const transform = transformOf(m, eased.x, k, still);
            expect(transform).not.toMatch(/NaN|Infinity/);
          }
        }
        expect(Number.isFinite(haloOpacityOf(m, eased.x))).toBe(true);
      }
    }
  });
  it('reads a level of NaN, -1 and 5 as 0, 0 and 1', () => {
    for (const [raw, expected] of [[Number.NaN, 0], [-1, 0], [5, 1], [Infinity, 1], [-Infinity, 0]] as const) {
      const target = resolveState('speaking');
      const m = createMotion();
      const eased = easedFrom(target);
      for (let i = 0; i < 60; i++) stepMotion(m, eased, target, raw, 1 / 30, false);
      expect(m.level, String(raw)).toBe(expected);
    }
  });
});

describe('backing size (packages/core/spec.md › Rendering)', () => {
  it('is the CSS size × device pixel ratio, at most 2× and 4096 px, and at least 1 px', () => {
    expect(backingSize(200, 1)).toBe(200);
    expect(backingSize(200, 2)).toBe(400);
    expect(backingSize(200, 3)).toBe(400);
    expect(backingSize(200, 1.5)).toBe(300);
    expect(backingSize(4096, 1)).toBe(4096);
    expect(backingSize(4096, 2)).toBe(4096);
    expect(backingSize(200, 0)).toBe(200);
    expect(backingSize(200, Number.NaN)).toBe(200);
    expect(backingSize(200, 0.5)).toBe(200);
    expect(backingSize(0.2, 1)).toBe(1);
    expect(backingSize(0.2, Number.NaN)).toBeGreaterThanOrEqual(1);
  });
});
