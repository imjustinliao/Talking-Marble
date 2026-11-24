import { useSyncExternalStore } from 'react';

/**
 * A tiny shared store: one value, patched from anywhere, read in React with `use()` (and outside React with
 * `get()`). The site's few pieces of shared state (the palette, what you are trying, your marble, the conversation)
 * each are one of these.
 */
export function createStore<T extends object>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
  return {
    get: () => value,
    set(patch: Partial<T>) { value = { ...value, ...patch }; listeners.forEach(l => l()); },
    use: () => useSyncExternalStore(subscribe, () => value, () => value),
  };
}
