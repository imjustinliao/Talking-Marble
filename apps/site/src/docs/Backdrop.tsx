import { useEffect, useRef } from 'react';

/**
 * The docs' sky, from the home page's stage (F-39, F-42): a black ground, slow veils of cloud fog,
 * a faint cool brightness far behind, the marble's own light under the header, and a soft light that follows the
 * pointer (F-40). Fixed behind the page, decorative, no JavaScript beyond the pointer.
 */
export function Backdrop() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(hover: none)').matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--gx', `${e.clientX}px`);
        el.style.setProperty('--gy', `${e.clientY}px`);
        el.style.setProperty('--glow', '1');
      });
    };
    const leave = () => el.style.setProperty('--glow', '0');
    addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, []);
  return (
    <div ref={ref} className="sky" aria-hidden="true">
      <div className="sky__far" />
      <div className="sky__veil sky__veil--a" />
      <div className="sky__veil sky__veil--b" />
      <div className="sky__pool" />
      <div className="sky__light" />
    </div>
  );
}
