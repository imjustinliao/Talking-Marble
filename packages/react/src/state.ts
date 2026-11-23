import { exampleData, stateData } from './generated/core';
import { hexToLinear, type Linear } from './colors';

/** The six built-in states, the common voice-agent lifecycle (LiveKit, Deepgram, Stream). */
export type BuiltInState = keyof typeof stateData.states;
/** A built-in state, or the name of one of your presets. */
export type OrbState = BuiltInState | (string & {});

/** Everything a state can set (packages/core/spec.md › Parameters). */
export interface OrbParams {
  flow: number;
  energy: number;
  warp: number;
  brightness: number;
  saturation: number;
  tint: string;
  tintAmount: number;
  breath: number;
  halo: number;
  levelResponse: number;
}
/** A preset: any subset of the parameters, on top of the resting values. */
export type OrbPreset = Partial<OrbParams>;

export const baseParams: OrbParams = stateData.base;
/** The built-in states, each only the parameters it changes. */
export const states: Record<BuiltInState, OrbPreset> = stateData.states;
/** Example presets (not built-in states): pass them in `presets`, e.g. `presets={{ muted }}`. */
export const { muted, happy, calm }: Record<'muted' | 'happy' | 'calm', OrbPreset> = exampleData;

export const NUMERIC = ['flow', 'energy', 'warp', 'brightness', 'saturation', 'tintAmount', 'breath', 'halo', 'levelResponse'] as const;
export type NumericKey = (typeof NUMERIC)[number];

/**
 * Parameters the controller consumes itself (clock, view scale, halo, level); every other numeric
 * parameter goes straight to the shader as `u` + its name (`warp` → `uWarp`), and `tint` as `uTint`.
 * A new shader parameter is one entry in NUMERIC, base and paramRanges, plus its uniform in the shader.
 */
export const CONTROLLER_PARAMS: ReadonlySet<NumericKey> = new Set(['flow', 'breath', 'halo', 'levelResponse']);
export const SHADER_PARAMS = NUMERIC.filter(key => !CONTROLLER_PARAMS.has(key));
export const uniformName = (key: string) => `u${key[0]!.toUpperCase()}${key.slice(1)}`;

/** True for a name the orb knows: a built-in state or one of `presets`. */
export function isKnownState(name: string, presets?: Record<string, OrbPreset>): boolean {
  return Object.hasOwn(states, name) || (presets !== undefined && Object.hasOwn(presets, name));
}

/** Each numeric parameter's allowed range (packages/core/spec.md › Parameters). */
export const paramRanges: Record<NumericKey, readonly [number, number]> = {
  flow: [0, 2], energy: [0, 1], warp: [1, 3.5], brightness: [0.5, 1.5], saturation: [0, 1.5],
  tintAmount: [0, 1], breath: [0, 1], halo: [0, 1], levelResponse: [0, 1],
};
const TINT = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** A preset's values, keeping only valid ones: numbers finite and clamped to range, tint a hex color. */
function sanitize(preset: OrbPreset | undefined): OrbPreset {
  const clean: OrbPreset = {};
  if (!preset) return clean;
  for (const key of NUMERIC) {
    const value = preset[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      const [min, max] = paramRanges[key];
      clean[key] = Math.min(max, Math.max(min, value));
    }
  }
  if (typeof preset.tint === 'string' && TINT.test(preset.tint.trim())) clean.tint = preset.tint.trim();
  return clean;
}

/** Base, then the built-in state, then a custom preset of the same name. Unknown names are idle. */
export function resolveState(name: string, presets?: Record<string, OrbPreset>): OrbParams {
  const builtIn = Object.hasOwn(states, name) ? states[name as BuiltInState] : undefined;
  const custom = presets && Object.hasOwn(presets, name) ? presets[name] : undefined;
  return { ...baseParams, ...(builtIn ?? (custom ? {} : states.idle)), ...sanitize(custom) };
}

/** The values the renderer draws with: numbers eased per frame, tint in linear light. */
export type Eased = Record<NumericKey, number> & { tint: Linear };

export function easedFrom(params: OrbParams): Eased {
  const eased = { tint: hexToLinear(params.tint) } as Eased;
  for (const key of NUMERIC) eased[key] = params[key];
  return eased;
}

/** Below this distance an eased value lands on its target, so a settled orb is exactly still (packages/core/spec.md › Motion). */
export const SNAP = 1e-4;

/** One exponential easing step from `value` toward `target` with factor `k`, snapping when close. */
export function approach(value: number, target: number, k: number): number {
  const next = value + (target - value) * k;
  return Math.abs(target - next) < SNAP ? target : next;
}

/** Moves `current` toward `target` by one frame of `dt` seconds (rate 4/s, packages/core/spec.md › Motion). */
export function easeToward(current: Eased, target: OrbParams, dt: number): void {
  const k = 1 - Math.exp(-dt * 4);
  for (const key of NUMERIC) current[key] = approach(current[key], target[key], k);
  const tint = hexToLinear(target.tint);
  for (let i = 0; i < 3; i++) current.tint[i] = approach(current.tint[i]!, tint[i]!, k);
}
