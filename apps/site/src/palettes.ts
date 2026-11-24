import { palettes, type PaletteName } from 'talking-marble';

/** A built-in palette, or the visitor's own. */
export type PaletteId = PaletteName | 'yours';
export type Colors = [string, string, string, string];
export type Edits = Partial<Record<PaletteId, Colors>>;

/** The built-in palettes: the gallery walked on the home page (their colours are fixed there, F-22). */
export const BUILT_INS = Object.keys(palettes) as PaletteName[];
/** Every palette a picker offers: the built-ins, then the visitor's own. */
export const PALETTE_IDS = [...BUILT_INS, 'yours'] as PaletteId[];
export const COLOR_LABELS = ['Ground', 'Pigment 1', 'Pigment 2', 'Pigment 3'] as const;
/** "Yours" starts unpainted (F-20): a plain neutral marble, not a copy of a built-in palette, until it is coloured. */
export const UNPAINTED: Colors = ['#ededeb', '#c9c9c6', '#b1b1ae', '#dcdcd9'];
const defaults = (id: PaletteId): Colors => [...(id === 'yours' ? UNPAINTED : palettes[id])] as Colors;

export const colorsOf = (id: PaletteId, edits: Edits): Colors => edits[id] ?? defaults(id);
export const isEdited = (id: PaletteId, edits: Edits) => edits[id] !== undefined && edits[id]!.join() !== defaults(id).join();
export const paletteLabel = (id: PaletteId) => (id === 'yours' ? 'Yours' : id[0]!.toUpperCase() + id.slice(1));

/** What the visitor chose: a palette (built-in or their own) and any edits. */
export interface Selection { palette: PaletteId; edits: Edits }

/**
 * The one place a selection becomes TalkingMarble props and the JSX to copy. When the package gains per-state
 * colours or an `emotion` prop (CUST-01), add them here and both the live marble and the install code follow.
 */
export function orbProps({ palette, edits }: Selection): { props: { palette: Colors }; jsx: string } {
  const named = palette !== 'yours' && !isEdited(palette, edits);
  const colors = colorsOf(palette, edits);
  const paletteJsx = named ? `palette="${palette}"` : `palette={[${colors.map(c => `'${c}'`).join(', ')}]}`;
  return {
    props: { palette: colors },
    jsx: `<TalkingMarble\n  state={agentState}\n  audio={agentStream}\n  ${paletteJsx}\n/>`,
  };
}
