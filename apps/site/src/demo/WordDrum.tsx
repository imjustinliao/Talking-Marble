import { memo, useCallback, useEffect, useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';

const ITEM = 44; // px, also the touch target

/**
 * A drum of words: drag, scroll or use the arrow keys, and the word that settles in the middle is picked.
 * Words tilt away from the middle in 3D (flat with reduced motion). Each word is also a button: click it.
 */
export const WordDrum = memo(function WordDrum({ items, value, onChange, label }: {
  items: readonly { value: string; group: string }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const drag = useRef<{ y: number; top: number; moved: boolean } | null>(null);
  const settle = useRef(0);
  const dragged = useRef(false); // swallow the click that ends a drag
  const auto = useRef<number | null>(null); // a scroll the drum started itself, to follow the value
  const index = Math.max(0, items.findIndex(i => i.value === value));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Tilt each word by its distance from the middle. */
  const paint = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const middle = el.scrollTop / ITEM;
    const flat = reduced();
    buttons.current.forEach((b, i) => {
      if (!b) return;
      const d = Math.max(-3, Math.min(3, i - middle));
      b.style.transform = flat ? '' : `rotateX(${(-d * 22).toFixed(1)}deg) translateZ(${(-Math.abs(d) * 6).toFixed(1)}px)`;
      b.style.opacity = String(Math.max(0.6, 1 - Math.abs(d) * 0.2)); // the mask fades far words; text keeps its contrast
    });
  }, []);

  const scrollToIndex = useCallback((i: number, smooth = true) => {
    ref.current?.scrollTo({ top: i * ITEM, behavior: smooth && !reduced() ? 'smooth' : 'auto' });
  }, []);

  // Follow the value when it changes elsewhere (the conversation moves the marble).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || drag.current) return;
    if (Math.round(el.scrollTop / ITEM) !== index) {
      auto.current = index;
      scrollToIndex(index, el.scrollTop !== 0 || index !== 0);
    }
    paint();
  }, [index, paint, scrollToIndex]);

  /** The word in the middle once scrolling stops is the pick. */
  const pickMiddle = useCallback(() => {
    const el = ref.current;
    if (!el || drag.current) return;
    const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM)));
    // Settling from the drum's own scroll is not a pick (it follows the value); wait for it to arrive.
    // Settle exactly on the word (an interrupted smooth scroll can stop a few pixels off).
    if (Math.abs(el.scrollTop - i * ITEM) > 1) el.scrollTo({ top: i * ITEM });
    if (auto.current !== null) { if (i === auto.current) auto.current = null; return; }
    if (items[i]!.value !== value) onChange(items[i]!.value);
  }, [items, value, onChange]);

  useEffect(() => {
    const el = ref.current!;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
      clearTimeout(settle.current);
      settle.current = window.setTimeout(pickMiddle, 140);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); clearTimeout(settle.current); };
  }, [paint, pickMiddle]);

  // Mouse drag (touch already scrolls natively).
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    auto.current = null; // the visitor takes over
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.current = { y: e.clientY, top: ref.current!.scrollTop, moved: false };
    ref.current!.style.scrollSnapType = 'none';
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 4 && !d.moved) { d.moved = true; ref.current!.setPointerCapture(e.pointerId); }
    if (d.moved) ref.current!.scrollTop = d.top - dy;
  };
  const endDrag = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const el = ref.current!;
    el.style.scrollSnapType = '';
    if (d.moved) {
      dragged.current = true;
      window.setTimeout(() => { dragged.current = false; }, 0);
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM)));
      scrollToIndex(i);
      onChange(items[i]!.value);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : step ? Math.max(0, Math.min(items.length - 1, index + step)) : -1;
    if (to < 0) return;
    e.preventDefault();
    onChange(items[to]!.value);
    buttons.current[to]?.focus({ preventScroll: true });
    scrollToIndex(to);
  };

  return (
    <div className="drum" role="group" aria-label={label} onKeyDown={onKeyDown}>
      <div
        ref={ref}
        className="drum__track"
        onPointerDown={onPointerDown}
        onWheel={() => { auto.current = null; }}
        onTouchStart={() => { auto.current = null; }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {items.map((item, i) => (
          <button
            key={item.value}
            ref={b => { buttons.current[i] = b; }}
            type="button"
            className="drum__word"
            data-group={item.group}
            aria-pressed={i === index}
            tabIndex={i === index ? 0 : -1}
            onClick={() => { if (!dragged.current) { onChange(item.value); scrollToIndex(i); } }}
          >
            {item.value}
          </button>
        ))}
      </div>
      <div className="drum__lens" aria-hidden="true" />
    </div>
  );
});
