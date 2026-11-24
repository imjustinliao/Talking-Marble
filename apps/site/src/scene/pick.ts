import { useSyncExternalStore } from 'react';
import { colorsOf, type Edits, type PaletteId, type Selection } from '../palettes';

/**
 * The visitor's palette: picked in the gallery, changeable in the playground, worn by the stage marble in every
 * shot and written into the generated code. One store, so all of them always agree.
 */
let selection: Selection = { palette: 'pearl', edits: {} };
const listeners = new Set<() => void>();
const set = (next: Selection) => { selection = next; listeners.forEach(l => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export const setPalette = (palette: PaletteId) => set({ ...selection, palette });
export const setEdits = (fn: (e: Edits) => Edits) => set({ ...selection, edits: fn(selection.edits) });

/** Sets one colour of a palette (the one shown, unless another is named). */
export function setColor(id: PaletteId, i: number, hex: string) {
  setEdits(e => { const next = [...colorsOf(id, e)] as [string, string, string, string]; next[i] = hex; return { ...e, [id]: next }; });
}
export const resetPalette = (id: PaletteId) => setEdits(e => { const next = { ...e }; delete next[id]; return next; });

export function usePick(): Selection {
  return useSyncExternalStore(subscribe, () => selection);
}

/** The current pick, outside React (the camera reads it each frame). */
export const getPick = () => selection;
