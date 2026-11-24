import type { PaletteName } from 'talking-marble';
import { createStore } from './store';

/**
 * The palette the site wears outside the walk and Create (the logo, the intro, the docs' accent): pearl unless a
 * palette is chosen on the docs page. One store, so every marble that wears it agrees.
 */
const pick = createStore<{ palette: PaletteName }>({ palette: 'pearl' });

export const setPalette = (palette: PaletteName) => pick.set({ palette });
export const usePick = pick.use;
