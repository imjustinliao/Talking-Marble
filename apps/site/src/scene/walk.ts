import { useSyncExternalStore } from 'react';

/**
 * What you are trying on the palettes (F-22): one state, one emotion and the halo, shown by every gallery marble.
 * It stays as you walk from marble to marble and into the pick, so all six can be seen doing the same thing.
 */
export interface Trying { state: string; emotion: string | null; halo: boolean }

let trying: Trying = { state: 'speaking', emotion: null, halo: true };
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export const setTrying = (patch: Partial<Trying>) => { trying = { ...trying, ...patch }; listeners.forEach(l => l()); };
export const useTrying = () => useSyncExternalStore(subscribe, () => trying);
export const getTrying = () => trying;
