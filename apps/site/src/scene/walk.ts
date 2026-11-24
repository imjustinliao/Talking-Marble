import type { SeenIn } from '../ui/Demo';
import { createStore } from './store';

/**
 * What you are trying on the palettes (F-22): one state, one emotion, the halo and where it is seen (F-99), shown by
 * every gallery marble (the demo by the one in front).
 * It stays as you walk from marble to marble and into the pick, so all six can be seen doing the same thing.
 */
export interface Trying { state: string; emotion: string | null; halo: boolean; seen: SeenIn }

const trying = createStore<Trying>({ state: 'speaking', emotion: null, halo: true, seen: 'none' });

export const setTrying = trying.set;
export const useTrying = trying.use;
