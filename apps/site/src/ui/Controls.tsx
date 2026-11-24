import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

/**
 * The lit key of a switch bar glides to the chosen option (F-71), like a light sliding along the track, instead of
 * switching on and off. Returns the bar's ref and the key to render as its first child; it follows the option
 * marked aria-pressed, and re-measures when the bar changes size.
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

/** How many options a switch bar shows in focus (F-90, F-94: three): past this it becomes a loop. */
export const IN_FOCUS = 3;
/** Options in focus on each side of the chosen one. */
const REACH = Math.floor(IN_FOCUS / 2);

type SwitchProps<T> = {
  scope?: string; label: string; options: readonly T[]; value: T; onChange: (v: T) => void; render?: (v: T) => ReactNode;
  /** The label stays for screen readers but is not shown (a bar that explains itself, like Create's steps). */
  hideLabel?: boolean;
  /** Extra class names on the bar's row. */
  className?: string;
};

/** The bar's name, shown above it or only to screen readers. */
const Name = ({ id, label, hide }: { id: string; label: string; hide?: boolean }) => (
  <p className={hide ? 'sr-only' : 'group-name'} id={id}>{label}</p>
);

/**
 * A switch bar (F-37): one glass track of rounded-square options; the chosen one is a lit key. Buttons with
 * aria-pressed, so each is one Tab stop and reads as "pressed". Past five options it is a loop (F-90).
 */
export function Switch<T extends string | null>(props: SwitchProps<T>) {
  return props.options.length > IN_FOCUS ? <Loop {...props} /> : <Plain {...props} />;
}

function Plain<T extends string | null>({ label, options, value, onChange, render, scope = 'try', hideLabel, className = '' }: SwitchProps<T>) {
  const { bar, glide } = useGlide(value);
  return (
    <div className={`try__row ${className}`}>
      <Name id={`${scope}-${label}`} label={label} hide={hideLabel} />
      <div ref={bar} className="seg" role="group" aria-labelledby={`${scope}-${label}`}>
        {glide}
        {options.map(o => (
          <button key={String(o)} type="button" className="seg__opt" aria-pressed={o === value} onClick={() => onChange(o)}>{render ? render(o) : String(o)}</button>
        ))}
      </div>
    </div>
  );
}

/** The faded room at each end of a loop, where the next options show through (px). */
const EDGE = 56;
const COPIES = 3;

/**
 * A switch bar past three options (F-90, F-94): a loop, like a dial seen edge-on. The chosen option sits in the
 * middle under the lit key with one in focus on each side; beyond them the next ones show faintly at both ends, so
 * you see what comes next, and the list wraps round. Dots under it say where you are in the list (F-94). Choosing glides the strip under the key (the key only eases
 * its width); a faded option at an end is one click away, and a swipe, a sideways scroll or the arrow keys step.
 * The width never changes. The strip holds the list three times so it can wrap; after a glide into a copy it settles
 * back onto the middle one unseen. Only the middle copy is in the accessibility tree.
 */
function Loop<T extends string | null>({ label, options, value, onChange, render, scope = 'try', hideLabel, className = '' }: SwitchProps<T>) {
  const n = options.length;
  const view = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const key = useRef<HTMLSpanElement>(null);
  const items = useRef(new Map<number, HTMLButtonElement>());
  // Which rendered item is centred, as a place along the strip (copy × n + index).
  const at = useRef(n + Math.max(0, options.indexOf(value)));
  const [, redraw] = useState(0);
  // A choice made elsewhere (another bar, the walk): go the short way round to it.
  const want = options.indexOf(value);
  if (want >= 0 && ((at.current % n) + n) % n !== want) {
    let d = want - (((at.current % n) + n) % n);
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    at.current += d;
  }
  const choose = (place: number) => {
    at.current = Math.min(COPIES * n - 1, Math.max(0, place));
    const next = options[((place % n) + n) % n]!;
    if (next === value) redraw(x => x + 1); else onChange(next);
  };

  useLayoutEffect(() => {
    const v = view.current, s = strip.current, k = key.current;
    if (!v || !s || !k) return;
    const centre = () => {
      const el = items.current.get(at.current);
      if (!el) return;
      const mid = v.clientWidth / 2;
      s.style.transform = `translateX(${mid - (el.offsetLeft + el.offsetWidth / 2)}px)`;
      k.style.width = `${el.offsetWidth}px`;
      k.style.height = `${el.offsetHeight}px`;
      k.style.transform = `translateX(${mid - el.offsetWidth / 2}px)`;
      k.style.opacity = want >= 0 ? '1' : '0';
      for (const [place, item] of items.current) item.toggleAttribute('data-far', Math.abs(place - at.current) > REACH);
    };
    // As wide as the widest five in focus can need, either side of the middle, plus the faded ends: fixed.
    const fit = () => {
      const w = Array.from({ length: n }, (_, i) => items.current.get(n + i)?.offsetWidth ?? 0);
      const gap = parseFloat(getComputedStyle(s).columnGap) || 0;
      let half = 0;
      for (let i = 0; i < n; i++) {
        for (const dir of [-1, 1]) {
          let side = w[i]! / 2;
          for (let k2 = 1; k2 <= REACH; k2++) side += gap + w[(((i + dir * k2) % n) + n) % n]!;
          half = Math.max(half, side);
        }
      }
      v.style.width = `${Math.ceil(2 * (half + EDGE))}px`;
      centre();
    };
    fit();
    const raf = requestAnimationFrame(() => v.setAttribute('data-ease', ''));
    // After a glide into the first or last copy, settle onto the same option in the middle copy without moving.
    const settle = (e: TransitionEvent) => {
      if (e.target !== s || e.propertyName !== 'transform') return;
      const middle = n + (((at.current % n) + n) % n);
      if (middle === at.current) return;
      at.current = middle;
      v.removeAttribute('data-ease');
      centre();
      void s.offsetWidth;
      v.setAttribute('data-ease', '');
    };
    s.addEventListener('transitionend', settle);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    ro?.observe(s);
    return () => { cancelAnimationFrame(raf); s.removeEventListener('transitionend', settle); ro?.disconnect(); };
  });

  // Swipe and sideways scroll step through the loop.
  const press = useRef<{ x: number; id: number } | null>(null);
  const swiped = useRef(false);
  const wheel = useRef(0);
  const step = (by: number) => choose(at.current + by);
  const onKey = (e: KeyboardEvent) => {
    const by = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!by) return;
    e.preventDefault();
    step(by);
    const i = (((at.current % n) + n) % n);
    requestAnimationFrame(() => items.current.get(n + i)?.focus({ preventScroll: true }));
  };

  return (
    <div className={`try__row ${className}`}>
      <Name id={`${scope}-${label}`} label={label} hide={hideLabel} />
      <div className="loop-wrap">
      <div className="seg seg--loop" role="group" aria-labelledby={`${scope}-${label}`}>
        <div
          ref={view} className="loop"
          onPointerDown={e => { press.current = { x: e.clientX, id: e.pointerId }; }}
          onPointerUp={e => {
            const p = press.current; press.current = null;
            if (!p || p.id !== e.pointerId) return;
            const dx = e.clientX - p.x;
            swiped.current = Math.abs(dx) > 28;
            if (swiped.current) step(-Math.sign(dx) * Math.max(1, Math.round(Math.abs(dx) / 70)));
          }}
          onWheel={e => {
            if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
            wheel.current += e.deltaX;
            if (Math.abs(wheel.current) > 60) { step(Math.sign(wheel.current)); wheel.current = 0; }
          }}
        >
          <span ref={key} className="seg__glide loop__key" aria-hidden="true" />
          <div ref={strip} className="loop__strip">
            {Array.from({ length: COPIES * n }, (_, place) => {
              const o = options[place % n]!;
              const real = place >= n && place < 2 * n;
              return (
                <button
                  key={place} ref={el => { if (el) items.current.set(place, el); else items.current.delete(place); }}
                  type="button" className="seg__opt" tabIndex={real && o === value ? 0 : -1}
                  aria-pressed={real ? o === value : undefined} aria-hidden={real ? undefined : true}
                  data-on={place === at.current ? '' : undefined}
                  onClick={() => { if (swiped.current) { swiped.current = false; return; } choose(place); }} onKeyDown={real ? onKey : undefined}
                >{render ? render(o) : String(o)}</button>
              );
            })}
          </div>
        </div>
      </div>
        {/* Where you are in the list (F-94, F-97): a track with one dot per option and a lit thumb that slides to yours. A dot chooses its option. */}
        <div className="loop__dots" aria-hidden="true" style={{ ['--at' as string]: Math.max(0, want) }}>
          <span className="loop__thumb" />
          {options.map((o, i) => (
            <button key={i} type="button" tabIndex={-1} className="loop__dot" data-on={o === value ? '' : undefined}
              onClick={() => { let d = i - (((at.current % n) + n) % n); if (d > n / 2) d -= n; if (d < -n / 2) d += n; step(d); }} />
          ))}
        </div>
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

