import { useSyncExternalStore } from 'react';
import type { OrbPreset } from 'talking-marble';
import { UNPAINTED, type Colors, type Selection } from '../palettes';
import { diffFromBase, type Design } from '../create/model';

/**
 * The visitor's own marble, made in Create your own (F-22) and used by the Guide's code. It starts as a plain,
 * unpainted globe, not any of the built-in palettes (F-61), with no state of its own.
 */
export interface Mine {
  /** Its four colours, once edited; null is the plain globe. */
  colors: Colors | null;
  /** Its own state's settings, once designed; null means none. */
  design: Design | null;
  /** The name its own state goes by in `presets`. */
  name: string;
  /** Its halo's strength (0 to 1.5, 1 the standard), set in Try it (F-65). */
  halo: number;
}

let mine: Mine = { colors: null, design: null, name: 'mine', halo: 1 };
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export const setMine = (patch: Partial<Mine>) => { mine = { ...mine, ...patch }; listeners.forEach(l => l()); };
export const useMine = () => useSyncExternalStore(subscribe, () => mine);
export const getMine = () => mine;

/** The marble's colours: its own, or the plain globe's. (`_pick` is kept for callers; the pick no longer leads.) */
export const mineColors = (m: Mine, _pick?: Selection): Colors => m.colors ?? UNPAINTED;
/** Its own state as a preset (only what differs from the resting look), or null. */
export const minePreset = (m: Mine): Record<string, OrbPreset> | null => (m.design ? { [m.name]: diffFromBase(m.design) } : null);

/**
 * The JSX for this marble: the agent's state and audio, and whatever was made here. `short` names the preset
 * instead of spelling it out (the Guide: the full one is what Export preset copies).
 */
export function mineJsx(m: Mine, _pick?: Selection, short = false): string {
  const props = ['state={agentState}', 'audio={agentStream}'];
  props.push(`palette={[${mineColors(m).map(c => `'${c}'`).join(', ')}]}`);
  if (m.halo !== 1) props.push(`halo={${Number(m.halo.toFixed(2))}}`);
  const preset = minePreset(m);
  if (preset && short) props.push('presets={presets}');
  else if (preset) {
    const body = JSON.stringify(preset[m.name]).replace(/"([a-zA-Z]+)":/g, '$1: ').replace(/,/g, ', ').replace(/"/g, "'").replace(/^\{/, '{ ').replace(/\}$/, ' }');
    props.push(`presets={{ ${m.name}: ${body} }}`);
  }
  return `<TalkingMarble\n${props.map(p => `  ${p}`).join('\n')}\n/>`;
}

/**
 * The same marble as a Web Component (PLAT-01): attributes in HTML; the agent's state and audio set from script.
 * `short` leaves the preset out of the attribute (the Guide: the full one is what Export preset copies).
 */
export function mineHtml(m: Mine, short = false): string {
  const attrs = [`palette="${mineColors(m).join(', ')}"`];
  if (m.halo !== 1) attrs.push(`halo="${Number(m.halo.toFixed(2))}"`);
  const preset = minePreset(m);
  if (preset && !short) attrs.push(`presets='${JSON.stringify(preset)}'`);
  return `<talking-marble\n${attrs.map(a => `  ${a}`).join('\n')}\n></talking-marble>`;
}
