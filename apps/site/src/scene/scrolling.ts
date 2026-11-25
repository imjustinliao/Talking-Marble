import { createStore } from './store';

/**
 * Whether the page is being scrolled right now (raised on each scroll, cleared 220 ms after the last). The demo hides
 * the state's word under the marble while it is up (F-111). The marble in front, the stage's and the demo's keep
 * moving throughout; only the side marbles sliding past hold their frame (F-112).
 */
const scrolling = createStore<{ on: boolean }>({ on: false });
let timer = 0;

/** Called on every scroll event: raises the flag once, and clears it a moment after the last one. */
export function markScrolling() {
  if (!scrolling.get().on) scrolling.set({ on: true });
  clearTimeout(timer);
  timer = window.setTimeout(() => scrolling.set({ on: false }), 220);
}

export const useScrolling = () => scrolling.use().on;
/** Read each frame, outside React. */
export const isScrolling = () => scrolling.get().on;
