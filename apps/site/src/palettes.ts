import { palettes, type PaletteName } from 'talking-marble';

export type Colors = [string, string, string, string];

/** The built-in palettes: the gallery walked on the home page (their colours are fixed there, F-22). */
export const BUILT_INS = Object.keys(palettes) as PaletteName[];
export const COLOR_LABELS = ['Ground', 'Pigment 1', 'Pigment 2', 'Pigment 3'] as const;
/** Your marble starts unpainted (F-61): a plain neutral globe, not a copy of a built-in palette, until it is coloured. */
export const UNPAINTED: Colors = ['#ededeb', '#c9c9c6', '#b1b1ae', '#dcdcd9'];

// One array per palette, made once: the same colours are the same value, so marbles wearing them never redraw for nothing.
const COLORS = Object.fromEntries(BUILT_INS.map(id => [id, [...palettes[id]] as Colors])) as Record<PaletteName, Colors>;

/** A built-in palette's four colours (ground first). Shared: copy before changing. */
export const colorsOf = (id: PaletteName): Colors => COLORS[id];
export const paletteLabel = (id: PaletteName) => id[0]!.toUpperCase() + id.slice(1);
