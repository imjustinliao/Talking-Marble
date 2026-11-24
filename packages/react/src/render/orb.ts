import type { OrbColors } from '../colors';
import { easedFrom, resolveState, settled, type Eased, type OrbPreset, type ResolvedPreset } from '../state';
import { fallbackShadow, haloShadow } from './css';
import { createMotion, haloOpacityOf, smallness, stepMotion, transformOf, uniformsOf, type Motion } from './motion';
import type { UniformValue } from './renderer';
import { observeFrame, renderScale } from './adaptive';
import { backingSize, renderInto, rendererReady, watchRenderer } from './shared';

/** One orb's live controller: springs, the clocks, visibility and drawing. Framework-free. */
export interface OrbController {
  /** True while the shader is drawing; false means the fallback picture shows. */
  readonly ready: boolean;
  setState(state: string, presets?: Record<string, OrbPreset>, emotion?: string | null): void;
  setColors(colors: OrbColors): void;
  /** Where raw audio level (0–1) comes from each frame; null for none. */
  setLevelSource(source: (() => number) | null): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

export interface OrbElements {
  /** The square element the orb fills; it carries the whole-marble movement. Keep it inside the user-styled element, never the same. */
  host: HTMLElement;
  /** The orb's own canvas; the shared renderer hands each frame to it (`bitmaprenderer`, or `2d` as a fallback). */
  canvas: HTMLCanvasElement;
  /** Optional halo layer; its opacity follows `halo`, the beat and level, its glow the orb's size and colors. */
  halo?: HTMLElement | null;
  /** Optional CSS picture shown while the shader is not drawing; it is shaded to the orb's size and dimmed to the state. */
  fallback?: HTMLElement | null;
}

export interface OrbOptions {
  state: string;
  emotion?: string | null;
  colors: OrbColors;
  presets?: Record<string, OrbPreset>;
  /** Called whenever the shader starts or stops drawing (first frame, context lost, context restored). */
  onReady?: (ready: boolean) => void;
}

const FRAME = 1000 / 30;

// One frame loop for every orb on the page, at most 30 frames a second.
// `frame` returns false when the orb has nothing left to animate (a settled still frame); the loop stops when
// every orb says so, and any change wakes it again.
// Each drawn frame's interval and draw-pass time feed the adaptive resolution (render/adaptive.ts): under
// sustained load every orb's backing size steps down (to half at most), and back up with headroom.
interface Live { frame(now: number): boolean; running(): boolean; side(): number }
const live = new Set<Live>();
let loopId = 0, lastFrame = 0, ascending = true;
// Reused every frame, so the loop allocates nothing.
const due: Live[] = [];
const bySideUp = (a: Live, b: Live) => a.side() - b.side();
const bySideDown = (a: Live, b: Live) => b.side() - a.side();
function loop(now: number) {
  // Scheduled first, so an exception in one orb never stops the others.
  loopId = requestAnimationFrame(loop);
  due.length = 0;
  for (const orb of live) if (orb.running()) due.push(orb);
  if (due.length && now - lastFrame < FRAME - 2) { due.length = 0; return; }
  const interval = now - lastFrame;
  lastFrame = now;
  // Grouped by size, in alternating order, so consecutive draws (and frames) share the shared surface's
  // size and it is resized once per distinct size at most.
  ascending = !ascending;
  due.sort(ascending ? bySideUp : bySideDown);
  let active = false;
  const start = performance.now();
  for (const orb of due) {
    try {
      if (orb.frame(now)) active = true;
    } catch (error) {
      active = true;
      console.error('[talking-marble]', error);
    }
  }
  // A new scale keeps the loop for one more frame, in which each orb re-sizes its canvas and redraws.
  if (due.length && !document.hidden && observeFrame(now, interval, performance.now() - start)) active = true;
  due.length = 0;
  if (!active) { cancelAnimationFrame(loopId); loopId = 0; }
}
function wakeLoop() { if (!loopId && typeof requestAnimationFrame === 'function') loopId = requestAnimationFrame(loop); }

export function createOrb({ host, canvas, halo, fallback }: OrbElements, initial: OrbOptions): OrbController {
  let ready = false;
  let colors = initial.colors;
  let target: ResolvedPreset = resolveState(initial.state, initial.presets, initial.emotion);
  const eased: Eased = easedFrom(target);
  const motion: Motion = createMotion();
  const uniforms: Record<string, UniformValue> = {};
  let levelSource: (() => number) | null = null;
  let css = 0, side = 0, last = 0, dirty = true, scaleSeen = renderScale();
  let paused = false, onScreen = true, disposed = false, wasSettled = false;
  // The last style strings written, so an unchanged frame writes no style.
  let shownTransform = '', shownOpacity = '', shownVisibility = '', shownFilter = '';

  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  // Kept from the change event, so a frame reads no media query.
  let reducedMotion = media?.matches ?? false;
  const reduced = () => reducedMotion;
  const visible = () => onScreen && !document.hidden;

  const drawColors = () => target.colors ?? colors;

  function setReady(next: boolean) {
    if (next === ready) return;
    ready = next;
    initial.onReady?.(ready);
  }

  /** Draws the current values: canvas (or the fallback's dimming), halo and the whole marble's transform. */
  function draw() {
    if (disposed) return;
    const still = reduced();
    const k = smallness(css);
    const x = eased.x;
    const transform = transformOf(motion, x, k, still);
    if (transform !== shownTransform) host.style.transform = shownTransform = transform;
    if (halo) {
      const opacity = haloOpacityOf(motion, x).toFixed(3);
      const visibility = k >= 1 ? 'hidden' : '';
      if (opacity !== shownOpacity) halo.style.opacity = shownOpacity = opacity;
      if (visibility !== shownVisibility) halo.style.visibility = shownVisibility = visibility;
    }
    const drew = side > 0 && renderInto(canvas, side, drawColors(), uniformsOf(motion, x, k, still, uniforms));
    const filter = drew ? '' : `brightness(${x.brightness.toFixed(3)})`;
    if (fallback && filter !== shownFilter) fallback.style.filter = shownFilter = filter;
    setReady(drew);
    dirty = false;
  }

  const running = () => !disposed && visible() && !paused;

  const orb: Live = {
    running,
    side: () => side,
    frame(now) {
      // The adaptive resolution changed: a new backing size (the canvas clears, so the frame redraws).
      if (scaleSeen !== renderScale()) fit();
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      const still = reduced();
      const raw = levelSource && target.reactivity > 0 ? levelSource() : 0;
      const before = motion.level;
      stepMotion(motion, eased, target, raw, dt, still);
      const isSettled = still && motion.level === before && settled(eased, target);
      // A still orb that has settled (and drawn that exact frame) draws nothing new: skip the GPU and, unless
      // it listens to audio, stop asking for frames until something changes.
      if (isSettled && wasSettled && !dirty) {
        const listening = levelSource !== null && target.reactivity > 0;
        if (!listening) last = 0;
        return listening;
      }
      wasSettled = isSettled;
      draw();
      return true;
    },
  };
  const wake = () => { if (running()) { live.add(orb); wakeLoop(); } };

  function applyColors() {
    if (halo && css > 0) halo.style.boxShadow = haloShadow(drawColors(), css, smallness(css));
    dirty = true;
  }

  /** Sets the backing size for the CSS size, pixel ratio and adaptive scale; the CSS size never changes. */
  function fit() {
    scaleSeen = renderScale();
    if (!(css > 0)) return;
    side = backingSize(css, window.devicePixelRatio);
    if (canvas.width !== side || canvas.height !== side) { canvas.width = side; canvas.height = side; dirty = true; }
  }

  /** Sizes the canvas to the host's CSS size (from the resize observer; by default the last one, for a new pixel ratio). */
  function resize(width = css, height = css) {
    css = Math.min(width, height);
    // Hidden (0 × 0): nothing to draw until it is shown again, when the observer brings its size.
    if (!(css > 0)) { css = side = 0; return; }
    fit();
    if (fallback) fallback.style.boxShadow = fallbackShadow(css);
    applyColors();
    draw();
  }

  const stopWatching = watchRenderer(isReady => {
    if (isReady) { dirty = true; draw(); wake(); } else { setReady(false); draw(); }
  });

  // The observer reports the size it measured, so no frame forces a layout to read it (and its first report,
  // before the first paint, sizes the canvas).
  const resizeObserver = new ResizeObserver(entries => {
    const box = entries[entries.length - 1]?.contentRect;
    if (box) resize(box.width, box.height);
  });
  resizeObserver.observe(host);
  const intersection = new IntersectionObserver(entries => {
    onScreen = entries[entries.length - 1]?.isIntersecting ?? true;
    last = 0;
    wake();
  });
  intersection.observe(host);
  const onVisibility = () => { last = 0; wake(); };
  document.addEventListener('visibilitychange', onVisibility);
  const onMotion = () => { reducedMotion = media?.matches ?? false; dirty = true; wake(); };
  media?.addEventListener?.('change', onMotion);
  // A new device pixel ratio (zoom, another display) needs a new backing size.
  let dprQuery: MediaQueryList | null = null;
  const onDpr = () => { watchDpr(); resize(); };
  function watchDpr() {
    dprQuery?.removeEventListener?.('change', onDpr);
    dprQuery = typeof matchMedia === 'function' ? matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`) : null;
    dprQuery?.addEventListener?.('change', onDpr);
  }
  watchDpr();

  const controller: OrbController = {
    get ready() { return ready; },
    setState(state, presets, emotion) {
      target = resolveState(state, presets, emotion);
      wasSettled = false;
      applyColors();
      wake();
    },
    setColors(next) { colors = next; applyColors(); draw(); },
    setLevelSource(source) { levelSource = source; wake(); },
    setPaused(next) { paused = next; last = 0; wake(); },
    dispose() {
      disposed = true;
      live.delete(orb);
      stopWatching();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      media?.removeEventListener?.('change', onMotion);
      dprQuery?.removeEventListener?.('change', onDpr);
    },
  };
  void rendererReady();
  wake();
  return controller;
}
