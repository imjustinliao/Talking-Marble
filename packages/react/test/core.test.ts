import { describe, expect, it } from 'vitest';
import { hexToLinear, palettes, resolvePalette } from '../src/colors';
import { calm, easedFrom, easeToward, emotions, happy, isKnownState, muted, NUMERIC, paramRanges, resolveState, sanitize, settled, spring, states } from '../src/state';
import { createMotion, uniformsOf } from '../src/render/motion';
import { emotionData, fragmentSource, stateData } from '../src/generated/core';

describe('core data', () => {
  it('has the six built-in states with the exact lifecycle names', () => {
    expect(Object.keys(states)).toEqual(['idle', 'connecting', 'listening', 'thinking', 'searching', 'speaking', 'error']);
  });
  it('has six palettes of four valid hex colors', () => {
    expect(Object.keys(palettes)).toEqual(['pearl', 'ember', 'lagoon', 'ink', 'rose', 'aurora']);
    for (const colors of Object.values(palettes)) {
      expect(colors).toHaveLength(4);
      for (const c of colors) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
  it('only uses parameters defined in base, and base defines every parameter', () => {
    const keys = Object.keys(stateData.base);
    expect(keys.sort()).toEqual([...NUMERIC, 'rippleDirection'].sort());
    for (const preset of [...Object.values(stateData.states), ...Object.values(emotionData)]) for (const k of Object.keys(preset)) expect(keys).toContain(k);
  });
  it('keeps every built-in value inside its range', () => {
    for (const preset of [stateData.base, ...Object.values(stateData.states), ...Object.values(emotionData)]) {
      for (const [k, v] of Object.entries(preset)) {
        if (typeof v !== 'number') continue;
        const [min, max] = paramRanges[k as keyof typeof paramRanges];
        expect(v, k).toBeGreaterThanOrEqual(min);
        expect(v, k).toBeLessThanOrEqual(max);
      }
    }
  });
  it('never changes colour in a built-in state or emotion (one material, Q-1)', () => {
    for (const preset of [...Object.values(stateData.states), ...Object.values(emotionData)]) {
      expect(Object.keys(preset)).not.toContain('colors');
      for (const k of Object.keys(preset)) expect(['tint', 'tintAmount', 'saturation', 'hue']).not.toContain(k);
    }
  });
  it('ships the shader with every uniform the motion model sets', () => {
    const set = Object.keys(uniformsOf(createMotion(), easedFrom(resolveState('idle')).x, 0, false));
    for (const u of [...set, 'uBase', 'uColor1', 'uColor2', 'uColor3']) {
      expect(fragmentSource).toMatch(new RegExp(`uniform (float|vec3) ${u};`));
    }
    // And sets every uniform the shader declares.
    const declared = [...fragmentSource.matchAll(/uniform (?:float|vec3) (\w+);/g)].map(m => m[1]);
    for (const u of declared) if (!/^uBase$|^uColor\d$/.test(u!)) expect(set).toContain(u);
  });
  it('gives the original uniforms at rest (idle is the original orb)', () => {
    const u = uniformsOf(createMotion(), easedFrom(resolveState('idle')).x, 0, false);
    expect(u).toMatchObject({ uWarp: 2.2, uScale: 1.2, uSoftness: 1, uDetail: 0.5, uGrain: 1, uContrast: 1, uGlow: 0, uBrightness: 1, uWaveAmp: 0, uRippleAmp: 0, uVortex: 0, uChop: 0, uLevel: 0 });
    expect(u.uWarp).toBe(2.2);
    expect(u.uScale).toBe(1.2);
  });
});

describe('colors', () => {
  it('converts sRGB hex to linear light', () => {
    expect(hexToLinear('#ffffff')).toEqual([1, 1, 1]);
    expect(hexToLinear('#000')).toEqual([0, 0, 0]);
    expect(hexToLinear('#808080')[0]).toBeCloseTo(0.2158, 3);
  });
  it('resolves names, custom colors and bad input to four colors', () => {
    expect(resolvePalette('ember')).toEqual(palettes.ember);
    expect(resolvePalette(undefined)).toEqual(palettes.pearl);
    expect(resolvePalette('nope' as never)).toEqual(palettes.pearl);
    expect(resolvePalette(['#111111', '#222222'])).toEqual(['#111111', '#222222', '#111111', '#111111']);
    expect(resolvePalette(['#111111', '#222222', '#333333', '#444444', '#555555'])).toHaveLength(4);
    expect(resolvePalette(['not a color'])).toEqual(palettes.pearl);
    // An invalid color keeps its slot (takes the ground) instead of shifting the rest.
    expect(resolvePalette(['#ffffff', 'nope', '#000000'])).toEqual(['#ffffff', '#ffffff', '#000000', '#ffffff']);
  });
});

describe('states and emotions', () => {
  it('layers base, built-in state and custom preset', () => {
    const idle = resolveState('idle');
    expect({ ...idle }).toMatchObject(stateData.base);
    expect(idle.colors).toBeNull();
    expect(resolveState('speaking').reactivity).toBe(1);
    expect(resolveState('speaking', { speaking: { halo: 0.1 } })).toMatchObject({ reactivity: 1, halo: 0.1 });
    expect(resolveState('wow', { wow: { bounce: 1, label: 'celebrating' } })).toMatchObject({ bounce: 1, speed: 1, label: 'celebrating' });
  });
  it('ignores invalid preset values and clamps to the spec ranges', () => {
    const p = resolveState('x', { x: { speed: undefined, turbulence: Number.NaN, brightness: 9, halo: -1, spin: -5, rippleDirection: 'sideways' as never, colors: ['nope'], label: '  ' } });
    expect(p).toMatchObject({ speed: 1, turbulence: 0.5, brightness: 1.5, halo: 0, spin: -2, rippleDirection: 'out', colors: null, label: null });
  });
  it('lets a preset set its own colors', () => {
    expect(resolveState('x', { x: { colors: ['#000000', '#ff0000'] } }).colors).toEqual(['#000000', '#ff0000', '#000000', '#000000']);
  });
  it('mixes an emotion 65 % of the way over the state, only for values it sets', () => {
    const s = resolveState('speaking'), e = emotions.happy;
    const mixed = resolveState('speaking', undefined, 'happy');
    expect(mixed.speed).toBeCloseTo(s.speed + (e.speed! - s.speed) * 0.65, 9);
    expect(mixed.bounce).toBeCloseTo(s.bounce + (1 - s.bounce) * 0.65, 9);
    expect(mixed.turbulence).toBe(s.turbulence);
    expect(mixed.reactivity).toBe(1);
    expect(resolveState('speaking', undefined, 'muted').reactivity).toBeCloseTo(0.35, 9);
  });
  it('lets the developer override a built-in emotion and define new ones', () => {
    expect(resolveState('idle', { happy: { speed: 4 } }, 'happy').speed).toBeCloseTo(1 + 3 * 0.65, 9);
    expect(resolveState('idle', { giddy: { bounce: 1, colors: ['#ffffff'] } }, 'giddy')).toMatchObject({ bounce: 0.65, colors: ['#ffffff', '#ffffff', '#ffffff', '#ffffff'] });
    expect(resolveState('idle', undefined, 'nope')).toEqual(resolveState('idle'));
  });
  it('exports the emotions, also one by one', () => {
    expect(Object.keys(emotions)).toEqual(['muted', 'happy', 'calm', 'excited', 'curious', 'surprised', 'concerned', 'sad']);
    expect(muted.reactivity).toBe(0);
    expect(happy.bounce).toBe(1);
    expect(calm.speed).toBeLessThan(1);
  });
  it('treats unknown names as idle', () => {
    expect(resolveState('dancing')).toEqual(resolveState('idle'));
    expect(isKnownState('dancing')).toBe(false);
    expect(isKnownState('dancing', { dancing: {} })).toBe(true);
    expect(isKnownState('toString')).toBe(false);
  });
  it('springs toward the target without overshooting, then lands exactly', () => {
    const current = easedFrom(resolveState('idle'));
    const target = resolveState('thinking');
    let peak = 0;
    for (let i = 0; i < 30; i++) { easeToward(current, target, 1 / 30); peak = Math.max(peak, current.x.speed); }
    expect(current.x.speed).toBeGreaterThan(3);
    expect(peak).toBeLessThanOrEqual(target.speed);
    for (let i = 0; i < 120; i++) easeToward(current, target, 1 / 30);
    expect(current.x.speed).toBe(target.speed);
    expect(settled(current, target)).toBe(true);
  });
  it('starts a new spring from where the marble is, with its velocity (no jump)', () => {
    const [x, v] = spring(0, 0, 1, 1 / 30);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(0.2);
    const [x2] = spring(x, v, 0, 1 / 30);
    expect(Math.abs(x2 - x)).toBeLessThan(0.1);
  });
});

describe('edge cases', () => {
  it('passes every numeric parameter through at its ends, clamps past them, and ignores what is not a finite number', () => {
    expect(NUMERIC).toContain('scan');
    for (const key of NUMERIC) {
      const [min, max] = paramRanges[key];
      expect(sanitize({ [key]: min })[key], `${key} min`).toBe(min);
      expect(sanitize({ [key]: max })[key], `${key} max`).toBe(max);
      expect(sanitize({ [key]: min - 1 })[key], `${key} min - 1`).toBe(min);
      expect(sanitize({ [key]: max + 1 })[key], `${key} max + 1`).toBe(max);
      for (const bad of [Infinity, -Infinity, Number.NaN, '2']) {
        expect(sanitize({ [key]: bad }), `${key} ${String(bad)}`).not.toHaveProperty(key);
        expect(resolveState('x', { x: { [key]: bad } })[key], `${key} ${String(bad)} resolves to base`).toBe(resolveState('idle')[key]);
      }
    }
  });
  it('never throws on odd palettes, and falls back to Pearl', () => {
    for (const odd of [null, 'toString', 'constructor', '__proto__', 'hasOwnProperty', 'ff0000', [], ['ff0000'], ['#ff0000ff'], [1, 2], [null], 42, {}]) {
      const colors = resolvePalette(odd as never);
      expect(colors, JSON.stringify(odd)).toEqual(palettes.pearl);
    }
    expect(resolvePalette(['#ABC'])).toEqual(['#ABC', '#ABC', '#ABC', '#ABC']);
    expect(resolvePalette(['  #ff0000 ', 7 as never, ' #00ff00'])).toEqual(['#ff0000', '#ff0000', '#00ff00', '#ff0000']);
  });
  it('cuts a label past 80 characters and ignores one that is not a string', () => {
    expect(sanitize({ label: 'x'.repeat(100) }).label).toBe('x'.repeat(80));
    expect(sanitize({ label: 42 })).not.toHaveProperty('label');
    expect(sanitize({ label: null })).not.toHaveProperty('label');
  });
});
