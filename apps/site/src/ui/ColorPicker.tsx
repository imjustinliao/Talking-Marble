import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

type HSV = { h: number; s: number; v: number };
const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const HEX = /^#?([0-9a-f]{6})$/i;

function hexToHsv(hex: string): HSV {
  const m = HEX.exec(hex.trim());
  const n = m ? parseInt(m[1]!, 16) : 0;
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}
function hsvToHex({ h, s, v }: HSV): string {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return `#${[f(5), f(3), f(1)].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * A colour picker in the site's own glass: a saturation/brightness field, a hue slider and a hex field.
 * The trigger is a round swatch. Keyboard: arrows move in the field (Shift for big steps), Esc closes.
 */
export function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [hex, setHex] = useState(value);
  const [above, setAbove] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const id = useId();

  // Follow the value when it changes from outside (Reset, another palette).
  useEffect(() => {
    if (value.toLowerCase() !== hsvToHex(hsv).toLowerCase()) setHsv(hexToHsv(value));
    setHex(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (next: HSV) => { setHsv(next); const h = hsvToHex(next); setHex(h); onChange(h); };

  // Open upward when there is no room below (the dials sheet on phones).
  useLayoutEffect(() => {
    if (!open || !root.current) return;
    setAbove(innerHeight - root.current.getBoundingClientRect().bottom < 300);
    field.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const away = (e: globalThis.PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    addEventListener('pointerdown', away);
    return () => removeEventListener('pointerdown', away);
  }, [open]);

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = field.current!.getBoundingClientRect();
    commit({ ...hsv, s: clamp((e.clientX - r.left) / r.width), v: clamp(1 - (e.clientY - r.top) / r.height) });
  };
  const onFieldKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = e.shiftKey ? 0.1 : 0.02;
    const moves: Record<string, Partial<HSV>> = {
      ArrowLeft: { s: clamp(hsv.s - d) }, ArrowRight: { s: clamp(hsv.s + d) },
      ArrowUp: { v: clamp(hsv.v + d) }, ArrowDown: { v: clamp(hsv.v - d) },
    };
    if (!moves[e.key]) return;
    e.preventDefault();
    commit({ ...hsv, ...moves[e.key] });
  };
  const onPopKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  };

  return (
    <div className="cpick" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="cpick__swatch"
        style={{ ['--c' as string]: value }}
        aria-label={`${label}: ${value}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${id}-pop` : undefined}
        onClick={() => setOpen(o => !o)}
      >
        <span />
      </button>
      <span className="cpick__label" aria-hidden="true">{label}</span>
      {open && (
        <div id={`${id}-pop`} className={`cpick__pop glass ${above ? 'is-above' : ''}`} role="dialog" aria-label={`${label} color`} onKeyDown={onPopKey}>
          <div
            ref={field}
            className="cpick__field"
            role="slider"
            tabIndex={0}
            aria-label="Saturation and brightness"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(hsv.s * 100)}
            aria-valuetext={`saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
            style={{ ['--hue' as string]: `hsl(${hsv.h} 100% 50%)` }}
            onPointerDown={e => { field.current!.setPointerCapture(e.pointerId); fromPointer(e); }}
            onPointerMove={e => { if (e.buttons) fromPointer(e); }}
            onKeyDown={onFieldKey}
          >
            <span className="cpick__thumb" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }} />
          </div>
          <input
            className="cpick__hue"
            type="range"
            min={0}
            max={359}
            value={Math.round(hsv.h)}
            aria-label="Hue"
            onChange={e => commit({ ...hsv, h: +e.target.value })}
          />
          <label className="cpick__hex">
            <span className="cpick__dot" style={{ background: hex }} aria-hidden="true" />
            <span className="sr-only">Hex</span>
            <input
              className="mono"
              value={hex}
              spellCheck={false}
              maxLength={7}
              aria-label="Hex"
              onChange={e => {
                const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                setHex(v);
                if (HEX.test(v)) { setHsv(hexToHsv(v)); onChange(v.toLowerCase()); }
              }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setOpen(false); trigger.current?.focus(); } }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
