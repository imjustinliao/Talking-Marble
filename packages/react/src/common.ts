import { isKnownEmotion, isKnownState, type OrbPreset } from './state';

/** The halo's strength: true is the standard halo (1), false none (0), a number a strength from 0 to 1.5. */
export function haloStrengthOf(halo: boolean | number | undefined): number {
  if (halo === undefined || halo === true) return 1;
  if (halo === false) return 0;
  return Math.min(1.5, Math.max(0, Number.isFinite(halo) ? halo : 1));
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
