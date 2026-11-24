import { useEffect, useRef } from 'react';
import { isLowPower } from '../perf';
import { useShotLive } from '../scene/shot';

/** The stage marble's own canvas: its pixels are the texture. */
const SOURCE = '[data-testid="main-marble"] canvas';

/**
 * Words that wear the marble (F-44): each frame, the middle of the live stage marble is copied and cut to the
 * letters, so the text carries its real pigment and moves with it. The words stay real text underneath (for
 * reading, selecting and screen readers); until the first frame lands they show the marble's colours.
 */
export function MarbleText({ text, className = '' }: { text: string; className?: string }) {
  const wrap = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useShotLive();

  useEffect(() => {
    // Low-power devices keep the pigment colouring underneath, without the live copy (F-54).
    if (!live || isLowPower()) return;
    let frame = 0, last = 0;
    // Measured only when the word's size changes, not every frame (reading layout each frame is costly).
    let box = { W: 1, H: 1, font: '', spacing: '0px', dpr: 1 };
    const measure = () => {
      const span = wrap.current;
      if (!span) return;
      const r = span.getBoundingClientRect(), cs = getComputedStyle(span), dpr = Math.min(2, devicePixelRatio || 1);
      box = { W: Math.max(1, Math.ceil(r.width * dpr)), H: Math.max(1, Math.ceil(r.height * dpr)), dpr,
        font: `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * dpr}px ${cs.fontFamily}`, spacing: `${(parseFloat(cs.letterSpacing) || 0) * dpr}px` };
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - last < 50) return; // 20 fps is plenty for text
      last = now;
      const span = wrap.current, c = canvas.current;
      const src = document.querySelector<HTMLCanvasElement>(SOURCE);
      const g = c?.getContext('2d');
      if (!span || !c || !g || !src || !src.width) return;
      const { W, H } = box;
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, W, H);
      // The middle band of the sphere, where the pigment shows best, stretched to the word's box.
      const s = src.width, cw = s * 0.6, ch = Math.min(s * 0.6, (cw * H) / W);
      try { g.drawImage(src, (s - cw) / 2, (s - ch) / 2, cw, ch, 0, 0, W, H); } catch { return; }
      // Keep it only inside the letters, set in the word's own font.
      g.globalCompositeOperation = 'destination-in';
      g.font = box.font;
      (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = box.spacing;
      g.textBaseline = 'alphabetic';
      const m = g.measureText(text);
      const y = (H - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
      g.fillStyle = '#000';
      g.fillText(text, 0, y);
      if (!span.dataset.ready) span.dataset.ready = '';
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, [live, text]);

  return (
    <span ref={wrap} className={`marble-text ${className}`}>
      <span className="marble-text__words">{text}</span>
      <canvas ref={canvas} className="marble-text__tex" aria-hidden="true" />
    </span>
  );
}
