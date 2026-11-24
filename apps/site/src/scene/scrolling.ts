import { createStore } from './store';

/**
 * Whether the page is being scrolled right now (F-108). While it is, every marble in the scene holds its current frame
 * (the camera still moves them smoothly), so the GPU spends each scroll frame on the move alone, not on shading
 * several marbles too. They carry on 220 ms after the last scroll; their pigment moves slowly, so the pause is not seen.
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
/** The same, outside React (read each frame). */
export const isScrolling = () => scrolling.get().on;
