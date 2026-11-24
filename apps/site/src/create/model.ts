import { resolveState, type OrbPreset } from 'talking-marble';

/**
 * The preset fields, as in packages/core/spec.md › Parameters (the package does not export its ranges).
 * Grouped plainly for the dials.
 */
export type NumField = { key: string; label: string; min: number; max: number; step: number };
export const GROUPS: { name: string; fields: NumField[] }[] = [
  { name: 'Flow', fields: [
    { key: 'speed', label: 'Speed', min: 0, max: 4, step: 0.05 },
    { key: 'turbulence', label: 'Turbulence', min: 0, max: 1, step: 0.01 },
    { key: 'spin', label: 'Spin', min: -2, max: 2, step: 0.05 },
    { key: 'whirl', label: 'Whirl', min: 0, max: 3, step: 0.05 },
    { key: 'scan', label: 'Scan', min: 0, max: 1, step: 0.01 },
  ] },
  { name: 'Shape', fields: [
    { key: 'veins', label: 'Veins', min: 0, max: 1, step: 0.01 },
    { key: 'softness', label: 'Softness', min: 0, max: 1, step: 0.01 },
    { key: 'detail', label: 'Detail', min: 0, max: 1, step: 0.01 },
    { key: 'waves', label: 'Waves', min: 0, max: 1, step: 0.01 },
    { key: 'ripples', label: 'Ripples', min: 0, max: 1, step: 0.01 },
    { key: 'chop', label: 'Chop', min: 0, max: 1, step: 0.01 },
  ] },
  { name: 'Motion', fields: [
    { key: 'breath', label: 'Breath', min: 0, max: 1, step: 0.01 },
    { key: 'beat', label: 'Beat', min: 0, max: 1.5, step: 0.01 },
    { key: 'bounce', label: 'Bounce', min: 0, max: 1, step: 0.01 },
    { key: 'sway', label: 'Sway', min: 0, max: 1, step: 0.01 },
    { key: 'wobble', label: 'Wobble', min: 0, max: 1, step: 0.01 },
    { key: 'shake', label: 'Shake', min: 0, max: 1, step: 0.01 },
    { key: 'size', label: 'Size', min: 0.5, max: 1.2, step: 0.01 },
  ] },
  { name: 'Light', fields: [
    { key: 'glow', label: 'Glow', min: 0, max: 1, step: 0.01 },
    { key: 'brightness', label: 'Brightness', min: 0.5, max: 1.5, step: 0.01 },
    { key: 'halo', label: 'Halo', min: 0, max: 1, step: 0.01 },
  ] },
  { name: 'Voice', fields: [
    { key: 'reactivity', label: 'Reactivity', min: 0, max: 1, step: 0.01 },
  ] },
];
export const FIELDS = GROUPS.flatMap(g => g.fields);

/** The resting values every preset starts from (`idle` is the base). */
export const BASE = resolveState('idle') as unknown as Record<string, number | string>;

/** A designed preset as plain data. */
export type Design = Record<string, number | string>;

/** Every field of a state (or emotion layered on idle), to start the dials from. */
export function designFrom(state: string, emotion: string | null, presets: Record<string, OrbPreset>): Design {
  const r = resolveState(state, presets, emotion) as unknown as Record<string, unknown>;
  const out: Design = {};
  for (const f of FIELDS) out[f.key] = Number(r[f.key]);
  out.rippleDirection = r.rippleDirection === 'in' ? 'in' : 'out';
  return out;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Only the fields that differ from the base: what a developer would paste into `presets`. */
export function diffFromBase(design: Design): OrbPreset {
  const out: Record<string, number | string> = {};
  for (const f of FIELDS) {
    const v = round(Number(design[f.key]));
    if (v !== round(Number(BASE[f.key]))) out[f.key] = v;
  }
  if (design.rippleDirection === 'in') out.rippleDirection = 'in';
  return out as OrbPreset;
}

/** Export: `{ "<name>": { …fields that differ } }`. */
export const exportJson = (name: string, design: Design) => JSON.stringify({ [name]: diffFromBase(design) }, null, 2);

/** The few dials Create your own shows (F-22: plain names, one group per step), out of every field above. */
export const MOTION = ['speed', 'turbulence', 'veins', 'breath', 'glow', 'reactivity'].map(k => FIELDS.find(f => f.key === k)!);
