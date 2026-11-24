// One WebGL2 context for every marble on the page. Browsers allow only about 16 contexts per page, so each
// marble is drawn in turn on one hidden canvas and handed to its own element's canvas:
// - Preferred: an OffscreenCanvas sized to the marble, whose frame is transferred as an ImageBitmap into the
//   element's `bitmaprenderer` canvas. Zero-copy on the GPU (no readback).
// - Fallback (no OffscreenCanvas WebGL2): a hidden <canvas>, copied with drawImage into the element's 2D canvas
//   in the same task, while the drawing buffer is still valid.
// Framework-free; nothing runs until the first marble asks for it.
import { hexToLinear, type Linear, type OrbColors } from '../colors';
import { renderScale, SCALES } from './adaptive';
import { createRenderer, type Renderer, type Uniforms } from './renderer';

/** Per marble: at most 4096² device pixels (a full-screen hero on a 4K display), and the GPU's limits. */
export const PIXEL_BUDGET = 4096 * 4096;

type Listener = (ready: boolean) => void;
type Surface = HTMLCanvasElement | OffscreenCanvas;

let surface: Surface | null = null;
let transfer = false;
let renderer: Renderer | null = null;
let unavailable = false;
const listeners = new Set<Listener>();
/** The colors the context holds now (their key), so a marble in the same colors re-sends nothing. */
let colorsKey = '';

/** Each palette's linear colors and key, worked out once per colors array (a marble keeps its array until they change). */
const linearCache = new WeakMap<OrbColors, { key: string; linear: Linear[] }>();
function linearOf(colors: OrbColors) {
  let found = linearCache.get(colors);
  if (!found) linearCache.set(colors, (found = { key: colors.join(), linear: colors.map(hexToLinear) }));
  return found;
}

function notify() { for (const fn of listeners) fn(renderer !== null); }

function create(): void {
  if (surface || unavailable || typeof document === 'undefined') return;
  if (typeof OffscreenCanvas === 'function' && typeof ImageBitmapRenderingContext === 'function') {
    const offscreen = new OffscreenCanvas(1, 1);
    renderer = createRenderer(offscreen);
    if (renderer) { surface = offscreen; transfer = true; }
  }
  if (!renderer) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    renderer = createRenderer(canvas);
    if (renderer) { surface = canvas; transfer = false; }
  }
  if (!renderer || !surface) { unavailable = true; surface = null; return; }
  const target = surface;
  target.addEventListener('webglcontextlost', event => {
    // Keep the right to restore it, and show every marble's fallback meanwhile.
    event.preventDefault();
    renderer = null;
    colorsKey = '';
    notify();
  });
  target.addEventListener('webglcontextrestored', () => {
    renderer = createRenderer(target);
    notify();
  });
}

/** Subscribes to the shared renderer's availability (lost and restored contexts). Returns the unsubscribe. */
export function watchRenderer(fn: Listener): () => void {
  create();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) renderer?.resize(1, 1);
  };
}

/** True while the shared context can draw. */
export function rendererReady(): boolean {
  create();
  return renderer !== null;
}

/**
 * The backing size in device pixels for a marble `cssSize` CSS pixels wide (spec › Rendering): CSS size × device
 * pixel ratio, at most 2×; a large marble at most 1.5× but never under 320 px (F-106). Past 2× the eye gains nothing
 * a marble's soft pigment can show (F-54), and a big one looks the same at 1.5× while the GPU shades 44 % fewer pixels.
 * Then × `scale`, the adaptive drawing resolution (0.5–1, render/adaptive.ts: lowered under sustained load), floor
 * included; a backing of 96 px or less (a 48 px marble at 2×) costs next to nothing and is never lowered, nor a
 * larger one below 96 px.
 */
export function backingSize(cssSize: number, devicePixelRatio: number, scale = renderScale()): number {
  const dpr = Math.min(Math.max(devicePixelRatio || 1, 1), 2);
  const maxSide = Math.min(renderer?.maxSide ?? 4096, Math.floor(Math.sqrt(PIXEL_BUDGET)));
  const full = Math.min(cssSize * dpr, Math.max(cssSize * LARGE_DPR, LARGE_FLOOR));
  const k = Math.min(Math.max(scale || 1, SCALES[SCALES.length - 1]!), 1);
  const side = Math.max(full * k, Math.min(full, SCALE_FLOOR));
  return Math.max(1, Math.min(Math.round(side), maxSide));
}
/** The backing side (device px) at or under which the adaptive scale leaves a marble alone. */
export const SCALE_FLOOR = 96;
/** A large marble's pixel ratio, and the size under which a marble keeps its full ratio (device px; F-106). */
export const LARGE_DPR = 1.5;
export const LARGE_FLOOR = 320;

/**
 * Draws one frame into `target` (the marble's own canvas, already sized `side` × `side`; its context is
 * `bitmaprenderer` when frames are transferred, else `2d`). False when no context can draw.
 */
export function renderInto(target: HTMLCanvasElement, side: number, colors: OrbColors, uniforms: Uniforms): boolean {
  create();
  if (!renderer || !surface || renderer.lost()) return false;
  const { key, linear } = linearOf(colors);
  if (key !== colorsKey) { renderer.setColors(linear); colorsKey = key; }
  if (transfer) {
    const ctx = target.getContext('bitmaprenderer');
    if (!ctx) return false;
    // Sized to this marble exactly (the loop draws marbles grouped by size: one resize per distinct size).
    if (surface.width !== side || surface.height !== side) renderer.resize(side, side);
    renderer.draw(uniforms, side, side);
    ctx.transferFromImageBitmap((surface as OffscreenCanvas).transferToImageBitmap());
    return true;
  }
  const ctx = target.getContext('2d');
  if (!ctx) return false;
  // The hidden canvas grows to the largest marble drawn; it is released when the last marble leaves.
  if (surface.width < side || surface.height < side) renderer.resize(Math.max(side, surface.width), Math.max(side, surface.height));
  renderer.draw(uniforms, side, side);
  ctx.clearRect(0, 0, side, side);
  // GL draws from the bottom-left: the frame is the canvas's bottom `side` rows.
  ctx.drawImage(surface, 0, surface.height - side, side, side, 0, 0, side, side);
  return true;
}

/** For tests: the hidden surface holding the shared context. */
export function sharedCanvas(): Surface | null {
  create();
  return surface;
}
