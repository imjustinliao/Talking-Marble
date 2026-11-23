import { describe, expect, it } from 'vitest';
import { hexToLinear, palettes, resolvePalette } from '../src/colors';
import { calm, easedFrom, easeToward, happy, isKnownState, muted, resolveState, SHADER_PARAMS, states, uniformName } from '../src/state';
import { fragmentSource, stateData } from '../src/generated/core';

describe('core data', () => {
  it('has the six built-in states with the exact lifecycle names', () => {
    expect(Object.keys(states)).toEqual(['idle', 'connecting', 'listening', 'thinking', 'speaking', 'error']);
  });
  it('has six palettes of four valid hex colors', () => {
    expect(Object.keys(palettes)).toEqual(['pearl', 'ember', 'lagoon', 'ink', 'rose', 'aurora']);
    for (const colors of Object.values(palettes)) {
      expect(colors).toHaveLength(4);
      for (const c of colors) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
  it('only uses parameters defined in base', () => {
    const keys = Object.keys(stateData.base);
    for (const preset of Object.values(stateData.states)) for (const k of Object.keys(preset)) expect(keys).toContain(k);
  });
  it('ships the shader with every uniform the renderer sets', () => {
    const fromState = SHADER_PARAMS.map(uniformName);
    expect(fromState).toEqual(['uEnergy', 'uWarp', 'uBrightness', 'uSaturation', 'uTintAmount']);
    for (const u of ['uTime', 'uLevel', 'uSwirl', 'uTint', 'uBase', 'uColor1', 'uColor2', 'uColor3', ...fromState]) {
      expect(fragmentSource).toMatch(new RegExp(`uniform (float|vec3) ${u};`));
    }
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

describe('states', () => {
  it('layers base, built-in state and custom preset', () => {
    expect(resolveState('idle')).toEqual(stateData.base);
    expect(resolveState('speaking').levelResponse).toBe(1);
    expect(resolveState('speaking', { speaking: { halo: 0.1 } })).toMatchObject({ levelResponse: 1, halo: 0.1 });
    expect(resolveState('muted', { muted: { saturation: 0.3 } })).toMatchObject({ saturation: 0.3, flow: 1 });
  });
  it('ignores invalid preset values and clamps to the spec ranges', () => {
    const p = resolveState('x', { x: { flow: undefined, energy: Number.NaN, brightness: 9, halo: -1, tint: 'nope' } });
    expect(p).toMatchObject({ flow: 1, energy: 0, brightness: 1.5, halo: 0, tint: '#ffffff' });
  });
  it('exports the example presets', () => {
    expect(Object.keys(muted)).toContain('saturation');
    expect(happy.levelResponse).toBe(1);
    expect(calm.flow).toBeLessThan(1);
  });
  it('treats unknown names as idle', () => {
    expect(resolveState('dancing')).toEqual(resolveState('idle'));
    expect(isKnownState('dancing')).toBe(false);
    expect(isKnownState('dancing', { dancing: {} })).toBe(true);
    expect(isKnownState('toString')).toBe(false);
  });
  it('eases toward the target at rate 4/s without overshooting', () => {
    const current = easedFrom(resolveState('idle'));
    const target = resolveState('thinking');
    easeToward(current, target, 0.25);
    expect(current.energy).toBeCloseTo(1 - Math.exp(-1), 5);
    for (let i = 0; i < 100; i++) easeToward(current, target, 0.1);
    expect(current.energy).toBeCloseTo(1, 5);
    expect(current.energy).toBeLessThanOrEqual(1);
  });
});
