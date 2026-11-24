import type { OrbPreset } from 'talking-marble';
import { UNPAINTED, type Colors } from '../palettes';
import { createStore } from './store';
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
  /** What the visitor named it (F-86), e.g. "Nova": its `label`, the name screen readers say. Empty until named. */
  title: string;
  /** The name its own state goes by in `presets`, made from the title (`nova`), else `mine`. */
  name: string;
  /** Its halo's strength (0 to 1.5, 1 the standard), set in Try it (F-65). */
  halo: number;
}

const mine = createStore<Mine>({ colors: null, design: null, title: '', name: 'mine', halo: 1 });

export const setMine = mine.set;
export const useMine = mine.use;

/** Built-in state and emotion names a preset of yours must not take (it would replace the built-in). */
let reserved: readonly string[] = [];
export const reserveNames = (names: readonly string[]) => { reserved = names; };

/**
 * The preset name for a title: lowercase letters and digits, starting with a letter, so it is a plain key in the
 * code ("Nova Blue" → `novablue`); `mine` if none. A built-in's name gets `my` in front ("Idle" → `myidle`).
 */
export function keyOf(title: string): string {
  const slug = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '').replace(/^[0-9]+/, '').slice(0, 24);
  if (!slug) return 'mine';
  return reserved.includes(slug) ? `my${slug}`.slice(0, 24) : slug;
}
/** Names the marble: its title, and the preset name made from it. */
export const nameMine = (title: string) => setMine({ title: title.slice(0, 32), name: keyOf(title) });

/** The marble's colours: its own, or the plain globe's. */
export const mineColors = (m: Mine): Colors => m.colors ?? UNPAINTED;
/** Its own state as a preset (only what differs from the resting look), or null. */
export const minePreset = (m: Mine): Record<string, OrbPreset> | null => (m.design ? { [m.name]: diffFromBase(m.design) } : null);

/**
 * The JSX for this marble: the agent's state and audio, and whatever was made here. `short` names the preset
 * instead of spelling it out (the Guide: the full one is what Export preset copies).
 */
export function mineJsx(m: Mine, short = false): string {
  const props = ['state={agentState}', 'audio={agentStream}'];
  if (m.title.trim()) props.push(`label="${m.title.trim().replace(/"/g, '')}"`);
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
  if (m.title.trim()) attrs.unshift(`label="${m.title.trim().replace(/"/g, '')}"`);
  if (m.halo !== 1) attrs.push(`halo="${Number(m.halo.toFixed(2))}"`);
  const preset = minePreset(m);
  if (preset && !short) attrs.push(`presets='${JSON.stringify(preset)}'`);
  return `<talking-marble\n${attrs.map(a => `  ${a}`).join('\n')}\n></talking-marble>`;
}
