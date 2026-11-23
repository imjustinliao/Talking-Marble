/** Liquid glass catches a small light that follows the pointer over it (CSS reads --px / --py). */
if (typeof window !== 'undefined') {
  addEventListener('pointermove', e => {
    const el = (e.target as Element | null)?.closest?.('.glass, .liquid') as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', `${e.clientX - r.left}px`);
    el.style.setProperty('--py', `${e.clientY - r.top}px`);
  }, { passive: true });
}
export {};
