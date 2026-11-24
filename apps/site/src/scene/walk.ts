import { createStore } from './store';

/**
 * What you are trying on the palettes (F-22): one state, one emotion and the halo, shown by every gallery marble.
 * It stays as you walk from marble to marble and into the pick, so all six can be seen doing the same thing.
 */
export interface Trying { state: string; emotion: string | null; halo: boolean }

const trying = createStore<Trying>({ state: 'speaking', emotion: null, halo: true });

export const setTrying = trying.set;
export const useTrying = trying.use;
