import type { OrbColors } from './colors';
import { fallbackBackground } from './render/css';
import { isKnownEmotion, isKnownState, resolveState, type OrbPreset } from './state';

/** The halo's strength: true is the standard halo (1), false none (0), a number a strength from 0 to 1.5. */
export function haloStrengthOf(halo: boolean | number | undefined): number {
  if (halo === undefined || halo === true) return 1;
  if (halo === false) return 0;
  return Math.min(1.5, Math.max(0, Number.isFinite(halo) ? halo : 1));
}

/** The halo layers' styles for a strength (0–1.5): the wrapper's opacity and brightness, and the halo's display. */
export function haloStyles(strength: number): { opacity: string; filter: string; display: 'block' | 'none' } {
  return {
    opacity: String(Math.min(1, strength)),
    filter: strength > 1 ? `brightness(${strength})` : '',
    display: strength > 0 ? 'block' : 'none',
  };
}

/** The fallback picture: a preset's own colors win over the palette (the only way a preset changes color). */
export function fallbackFor(state: string, presets: Record<string, OrbPreset> | undefined, emotion: string | null | undefined, colors: OrbColors): string {
  return fallbackBackground(resolveState(state, presets, emotion).colors ?? colors);
}

/** A `size` in CSS px, or undefined (fill the container) when it is not a finite number above 0. */
export function sizeOf(size: unknown): number | undefined {
  return typeof size === 'number' && Number.isFinite(size) && size > 0 ? size : undefined;
}

const ids = new WeakMap<object, string>();
let nextId = 0;
/**
 * A key that changes when the value's content changes: its JSON, so an equal object written inline each render
 * keeps its key. A value JSON cannot write (a cycle) is keyed by identity instead. Never throws.
 */
export function stableKey(value: unknown): string {
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    if (!value || typeof value !== 'object') return '';
    let id = ids.get(value);
    if (id === undefined) ids.set(value, (id = `#${++nextId}`));
    return id;
  }
}

/** Development builds only: bundlers replace process.env.NODE_ENV; where nothing defines it, stay quiet. */
function isDev(): boolean {
  try {
    return process!.env!.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}

const warned = new Set<string>();
/** One console warning per unknown state or emotion name, in development (packages/core/spec.md › Resolution). */
export function warnUnknown(state: string, emotion: string | null | undefined, presets: Record<string, OrbPreset> | undefined): void {
  if (!isDev()) return;
  if (!isKnownState(state, presets) && !warned.has(state)) {
    warned.add(state);
    console.warn(`[talking-marble] Unknown state "${state}", showing "idle". Add it to \`presets\` to define it.`);
  }
  if (emotion && !isKnownEmotion(emotion, presets) && !warned.has(`emotion:${emotion}`)) {
    warned.add(`emotion:${emotion}`);
    console.warn(`[talking-marble] Unknown emotion "${emotion}", ignored. Add it to \`presets\` to define it.`);
  }
}
