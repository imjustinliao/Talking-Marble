import { isKnownEmotion, isKnownState, sanitize, type OrbPreset } from './state';

/** Default name of who the orb is. */
export const DEFAULT_LABEL = 'Assistant';

/** A state's or emotion's spoken name: its preset's `label`, else its name. */
function spoken(name: string, presets?: Record<string, OrbPreset>): string {
  const own = presets && Object.hasOwn(presets, name) ? sanitize(presets[name]).label : undefined;
  return own ?? name;
}

/**
 * The orb's accessible name: "Assistant, speaking" (and ", happy" with an emotion). Custom states and emotions
 * use their preset's `label`, else their name; unknown states read as idle, unknown emotions are left out.
 */
export function orbLabel(label: string | undefined, state: string, emotion: string | null | undefined, presets?: Record<string, OrbPreset>): string {
  const who = label?.trim() || DEFAULT_LABEL;
  const parts = [who, isKnownState(state, presets) ? spoken(state, presets) : 'idle'];
  if (emotion && isKnownEmotion(emotion, presets)) parts.push(spoken(emotion, presets));
  return parts.join(', ');
}
