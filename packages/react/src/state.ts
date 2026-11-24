import { emotionData, stateData } from './generated/core';
import { resolvePalette, type OrbColors } from './colors';

/** The built-in states: the common voice-agent lifecycle (LiveKit, Deepgram, Stream), plus `searching` for tool calls. */
export type BuiltInState = keyof typeof stateData.states;
/** A built-in state, or the name of one of your presets. */
export type OrbState = BuiltInState | (string & {});
/** A built-in emotion. */
export type BuiltInEmotion = keyof typeof emotionData;
/** A built-in emotion, or the name of one of your presets. */
export type OrbEmotion = BuiltInEmotion | (string & {});

/** The numeric parameters, in packages/core/spec.md › Parameters order. The one list every other place derives from. */
export const NUMERIC = [
  'speed', 'turbulence', 'veins', 'softness', 'detail', 'spin', 'waves', 'ripples', 'whirl', 'chop', 'scan',
  'glow', 'brightness', 'halo', 'breath', 'beat', 'bounce', 'sway', 'wobble', 'shake', 'size', 'reactivity',
] as const;
export type NumericKey = (typeof NUMERIC)[number];

/** Everything a state or emotion can set (packages/core/spec.md › Parameters). */
export type OrbParams = Record<NumericKey, number> & {
  /** Which way rings travel: `out` from the centre or `in` toward it. */
  rippleDirection: 'out' | 'in';
};
/**
 * A preset: plain data, any subset of the parameters, plus optional `colors` (four hex colors, ground first:
 * the only way a preset changes color) and `label` (its name for assistive technology, e.g. "celebrating").
 */
export type OrbPreset = Partial<OrbParams> & {
  colors?: readonly string[] | null;
  label?: string | null;
};
/** A fully resolved preset: every parameter, plus the colors and label it sets (or null). */
export type ResolvedPreset = OrbParams & {
  colors: OrbColors | null;
  label: string | null;
};

/** Each numeric parameter's range (packages/core/spec.md › Parameters). */
export const paramRanges: Record<NumericKey, readonly [number, number]> = {
  speed: [0, 4], turbulence: [0, 1], veins: [0, 1], softness: [0, 1], detail: [0, 1], spin: [-2, 2],
  waves: [0, 1], ripples: [0, 1], whirl: [0, 3], chop: [0, 1], scan: [0, 1], glow: [0, 1], brightness: [0.5, 1.5],
  halo: [0, 1], breath: [0, 1], beat: [0, 1.5], bounce: [0, 1], sway: [0, 1], wobble: [0, 1], shake: [0, 1],
  size: [0.5, 1.2], reactivity: [0, 1],
};

/** The resting values: the reference orb. */
export const baseParams: OrbParams = stateData.base as OrbParams;
/** The built-in states, each only the parameters it changes. */
export const states: Record<BuiltInState, OrbPreset> = stateData.states as Record<BuiltInState, OrbPreset>;
/** The built-in emotions, which layer on a state (`emotion` prop). Each is an ordinary preset. */
export const emotions: Record<BuiltInEmotion, OrbPreset> = emotionData as Record<BuiltInEmotion, OrbPreset>;
/** The built-in emotions one by one. */
export const { muted, happy, calm, excited, curious, surprised, concerned, sad } = emotions;

/** How far an emotion moves a state's values toward its own (packages/core/spec.md › Resolution). */
export const EMOTION_WEIGHT = 0.65;

/** True for a state name the orb knows: a built-in state or one of `presets`. */
export function isKnownState(name: string, presets?: Record<string, OrbPreset>): boolean {
  return Object.hasOwn(states, name) || (presets !== undefined && Object.hasOwn(presets, name));
}
/** True for an emotion name the orb knows: a built-in emotion or one of `presets`. */
export function isKnownEmotion(name: string, presets?: Record<string, OrbPreset>): boolean {
  return Object.hasOwn(emotions, name) || (presets !== undefined && Object.hasOwn(presets, name));
}

/** A preset's valid values only: numbers finite and clamped to range, colors and label well formed. */
export function sanitize(preset: unknown): OrbPreset {
  const clean: OrbPreset = {};
  if (!preset || typeof preset !== 'object') return clean;
  const p = preset as Record<string, unknown>;
  for (const key of NUMERIC) {
    const value = p[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      const [min, max] = paramRanges[key];
      clean[key] = Math.min(max, Math.max(min, value));
    }
  }
  if (p.rippleDirection === 'in' || p.rippleDirection === 'out') clean.rippleDirection = p.rippleDirection;
  if (Array.isArray(p.colors) && p.colors.length > 0) {
    const colors = resolvePalette(p.colors as string[]);
    // resolvePalette falls back to Pearl when the ground is invalid: then the preset sets no colors.
    if (typeof p.colors[0] === 'string' && colors[0] === (p.colors[0] as string).trim()) clean.colors = colors;
  }
  if (typeof p.label === 'string' && p.label.trim()) clean.label = p.label.trim().slice(0, 80);
  return clean;
}

const own = (presets: Record<string, OrbPreset> | undefined, name: string) =>
  presets && Object.hasOwn(presets, name) ? presets[name] : undefined;

/**
 * The parameters to draw: base → the state → the developer's preset of the same name; then the emotion
 * (built-in, then the developer's of the same name) moves each value it sets 65 % of the way toward its own.
 * Unknown states are idle; unknown emotions are ignored.
 */
export function resolveState(name: string, presets?: Record<string, OrbPreset>, emotion?: string | null): ResolvedPreset {
  const builtIn = Object.hasOwn(states, name) ? states[name as BuiltInState] : undefined;
  const custom = own(presets, name);
  const state = { ...(builtIn ?? (custom ? {} : states.idle)), ...sanitize(custom) };
  const out = { ...baseParams, colors: null, label: null, ...state } as ResolvedPreset;
  if (emotion) {
    const e = { ...(Object.hasOwn(emotions, emotion) ? emotions[emotion as BuiltInEmotion] : {}), ...sanitize(own(presets, emotion)) };
    for (const key of NUMERIC) {
      const target = e[key];
      if (target !== undefined) out[key] += (target - out[key]) * EMOTION_WEIGHT;
    }
    if (e.rippleDirection) out.rippleDirection = e.rippleDirection;
    if (e.colors) out.colors = e.colors as OrbColors;
  }
  return out;
}

/** The live, springing values the renderer draws with. */
export interface Eased {
  x: Record<NumericKey, number>;
  v: Record<NumericKey, number>;
}

export function easedFrom(params: OrbParams): Eased {
  const x = {} as Record<NumericKey, number>, v = {} as Record<NumericKey, number>;
  for (const key of NUMERIC) { x[key] = params[key]; v[key] = 0; }
  return { x, v };
}

/** Spring response in seconds (packages/core/spec.md › Motion). */
export const RESPONSE = 0.7;
/** Within these of the target and at rest, a spring lands exactly, so a settled orb draws the identical frame. */
export const SNAP = 1e-4;
const SNAP_SPEED = 1e-3;

/** One step of a critically damped spring (no overshoot), from `x` with velocity `v` toward `target`. */
export function spring(x: number, v: number, target: number, dt: number, response = RESPONSE): [number, number] {
  const w = (2 * Math.PI) / response;
  // Sub-steps keep the explicit step stable for long frames (dt up to 0.1 s).
  const n = Math.max(1, Math.ceil(dt / 0.02));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    v += (-w * w * (x - target) - 2 * w * v) * h;
    x += v * h;
  }
  if (Math.abs(x - target) < SNAP && Math.abs(v) < SNAP_SPEED) return [target, 0];
  return [x, v];
}

/** Springs every parameter of `current` toward `target` by `dt` seconds. */
export function easeToward(current: Eased, target: OrbParams, dt: number): void {
  for (const key of NUMERIC) [current.x[key], current.v[key]] = spring(current.x[key], current.v[key], target[key], dt);
}

/** True when every parameter sits exactly on its target. */
export function settled(current: Eased, target: OrbParams): boolean {
  for (const key of NUMERIC) if (current.x[key] !== target[key] || current.v[key] !== 0) return false;
  return true;
}

/** One exponential step from `value` toward `target` with factor `k`, snapping when close (the level). */
export function approach(value: number, target: number, k: number): number {
  const next = value + (target - value) * k;
  return Math.abs(target - next) < SNAP ? target : next;
}
