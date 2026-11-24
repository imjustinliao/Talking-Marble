import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { LeftIcon, RightIcon } from './icons';

/**
 * The lit key of a switch bar glides to the chosen option (F-71), like a light sliding along the track, instead of
 * switching on and off. Returns the bar's ref and the key to render as its first child; it follows the option
 * marked aria-pressed, and re-measures when the bar changes size (wrapping onto two rows included).
 */
export function useGlide(value: unknown) {
  const bar = useRef<HTMLDivElement>(null);
  const key = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = bar.current, k = key.current;
    if (!el || !k) return;
    const place = () => {
      const on = el.querySelector<HTMLElement>('[aria-pressed="true"]');
      k.style.opacity = on ? '1' : '0';
      if (!on) return;
      k.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
      k.style.width = `${on.offsetWidth}px`;
      k.style.height = `${on.offsetHeight}px`;
    };
    place();
    // Glide only after the first placement, so the key does not slide in from the corner.
    const raf = requestAnimationFrame(() => el.setAttribute('data-glide', ''));
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    ro?.observe(el);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); };
  }, [value]);
  return { bar, glide: <span ref={key} className="seg__glide" aria-hidden="true" /> };
}


/** How many options a switch bar shows at once (F-90): more than this wrap into an uneven second row. */
export const PER_PAGE = 5;

/**
 * A switch bar (F-37): one glass track of rounded-square options; the chosen one is a lit key. Buttons with
 * aria-pressed, so each is one Tab stop and reads as "pressed". Past five options (F-90) it shows five at a time on
 * one row, with an arrow at its end that turns to the rest (and back); it opens on the page holding the choice.
 */
export function Switch<T extends string | null>({ label, options, value, onChange, render, scope = 'try' }: {
  scope?: string; label: string; options: readonly T[]; value: T; onChange: (v: T) => void; render?: (v: T) => ReactNode;
}) {
  const pages = Math.max(1, Math.ceil(options.length / PER_PAGE));
  const pageOf = (v: T) => Math.max(0, Math.floor(options.indexOf(v) / PER_PAGE));
  const [page, setPage] = useState(() => pageOf(value));
  const [seen, setSeen] = useState(value);
  // A choice made elsewhere (another bar, the walk) shows its page.
  if (seen !== value) { setSeen(value); if (options.includes(value)) setPage(pageOf(value)); }
  const shown = page < pages ? page : 0;
  const { bar, glide } = useGlide(`${String(value)}|${shown}`);
  const last = shown === pages - 1;
  const what = label.toLowerCase();
  return (
    <div className="try__row">
      <p className="group-name" id={`${scope}-${label}`}>{label}</p>
      <div ref={bar} className="seg" data-paged={pages > 1 ? '' : undefined} role="group" aria-labelledby={`${scope}-${label}`}>
        {glide}
        <span key={shown} className="seg__page">
          {options.slice(shown * PER_PAGE, shown * PER_PAGE + PER_PAGE).map(o => (
            <button key={String(o)} type="button" className="seg__opt" aria-pressed={o === value} onClick={() => onChange(o)}>{render ? render(o) : String(o)}</button>
          ))}
        </span>
        {pages > 1 && (
          <button type="button" className="seg__more" onClick={() => setPage(last ? 0 : shown + 1)}
            aria-label={last ? `Back to the first ${what} options` : `More ${what} options`}>
            {last ? <LeftIcon /> : <RightIcon />}
          </button>
        )}
      </div>
    </div>
  );
}

/** A toggle (F-37): a glass track, lit white with a black knob when on. */
export function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="try__row">
      <p className="group-name" aria-hidden="true">{label}</p>
      <button type="button" role="switch" aria-checked={on} aria-label={label} className="toggle" onClick={() => onChange(!on)}><span className="toggle__knob" /></button>
    </div>
  );
}

