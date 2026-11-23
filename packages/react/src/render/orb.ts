import { hexToLinear, type OrbColors } from '../colors';
import { approach, easedFrom, easeToward, resolveState, SHADER_PARAMS, uniformName, type Eased, type OrbParams, type OrbPreset } from '../state';
import { fallbackShadow, haloShadow } from './css';
import { createRenderer, type Renderer, type UniformValue } from './renderer';

/** One orb's live controller: state easing, the clock, visibility and drawing. Framework-free. */
export interface OrbController {
  /** True while the shader is drawing; false means the fallback picture shows. */
  readonly ready: boolean;
  setState(name: string, presets?: Record<string, OrbPreset>): void;
  setColors(colors: OrbColors): void;
  /** Where raw audio level (0–1) comes from each frame; null for none. */
  setLevelSource(source: (() => number) | null): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

export interface OrbElements {
  /** The square element the orb fills; it is scaled for `breath`. Keep it inside the user-styled element, never the same. */
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Optional halo layer; its opacity follows `halo` and level, its glow the orb's size and colors. */
  halo?: HTMLElement | null;
  /** Optional CSS picture shown while the shader is not drawing; it is shaded to the orb's size and dimmed to the state. */
  fallback?: HTMLElement | null;
}

export interface OrbOptions {
  state: string;
  colors: OrbColors;
  presets?: Record<string, OrbPreset>;
  /** Called whenever the shader starts or stops drawing (first frame, context lost, context restored). */
  onReady?: (ready: boolean) => void;
}

const FRAME = 1 / 30;
const uniformNames = Object.fromEntries(SHADER_PARAMS.map(key => [key, uniformName(key)])) as Record<(typeof SHADER_PARAMS)[number], string>;
const MAX_PIXELS = 512;

export function createOrb({ host, canvas, halo, fallback }: OrbElements, initial: OrbOptions): OrbController {
  let renderer: Renderer | null = createRenderer(canvas);
  let ready = false;
  let colors = initial.colors;
  let target: OrbParams = resolveState(initial.state, initial.presets);
  const current: Eased = easedFrom(target);
  let levelSource: (() => number) | null = null;
  // Reused every frame.
  const uniforms: Record<string, UniformValue> = {};
  let time = 0, swirl = 0, level = 0, breathPhase = 0, size = 0;
  let paused = false, onScreen = true, frameId = 0, last = 0, pending = 0;

  const motion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => motion?.matches ?? false;

  const visible = () => onScreen && !document.hidden;
  // Without the shader the loop still eases the halo and the fallback's dimming.
  const running = () => visible() && !paused;

  function setReady(next: boolean) {
    if (next === ready) return;
    ready = next;
    initial.onReady?.(ready);
  }

  function draw() {
    const still = reduced();
    host.style.transform = current.breath > 0.001 && !still ? `scale(${(1 - current.breath * 0.03 * (0.5 + 0.5 * Math.cos(breathPhase))).toFixed(4)})` : '';
    if (halo) halo.style.opacity = Math.min(1, current.halo + level * 0.4).toFixed(3);
    if (!renderer) {
      if (fallback) fallback.style.filter = `brightness(${current.brightness.toFixed(3)}) saturate(${current.saturation.toFixed(3)})`;
      return;
    }
    uniforms.uTime = time;
    uniforms.uSwirl = swirl;
    uniforms.uLevel = still ? 0 : level;
    uniforms.uTint = current.tint;
    for (const key of SHADER_PARAMS) uniforms[uniformNames[key]] = current[key];
    renderer.draw(uniforms);
    if (size > 0) setReady(true);
  }

  function step(dt: number) {
    easeToward(current, target, dt);
    // Only read the audio when the state listens; reading an analyser costs a little every frame.
    const raw = levelSource && target.levelResponse > 0 ? Math.min(1, Math.max(0, levelSource() || 0)) : 0;
    level = approach(level, raw * target.levelResponse, 1 - Math.exp(-dt * 10));
    if (!reduced()) {
      time += dt * current.flow * (1 + current.energy * 0.45);
      swirl += dt * level * 1.4;
      breathPhase += (dt * 2 * Math.PI) / 1.6;
    }
  }

  function tick(now: number) {
    frameId = 0;
    if (!running()) { last = 0; pending = 0; return; }
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    pending += dt;
    if (pending >= FRAME - 0.002 || dt === 0) {
      step(Math.min(0.1, pending));
      pending = 0;
      draw();
    }
    frameId = requestAnimationFrame(tick);
  }
  const wake = () => { if (!frameId && running()) frameId = requestAnimationFrame(tick); };

  function applyColors() {
    renderer?.setColors(colors.map(hexToLinear));
    if (halo && size > 0) halo.style.boxShadow = haloShadow(colors, size);
  }

  function resize() {
    size = Math.min(host.offsetWidth, host.offsetHeight);
    if (size <= 0) return;
    if (halo) halo.style.boxShadow = haloShadow(colors, size);
    if (fallback) fallback.style.boxShadow = fallbackShadow(size);
    if (renderer) {
      const density = Math.min(window.devicePixelRatio || 1, 3, MAX_PIXELS / size);
      renderer.resize(size * density, size * density);
    }
    draw();
  }

  // Context loss (GPU reset, too many contexts): show the fallback, then rebuild on restore.
  const onLost = (event: Event) => {
    event.preventDefault();
    renderer = null;
    setReady(false);
    draw(); // dims the fallback to the state now, even when paused or off screen
  };
  const onRestored = () => {
    renderer = createRenderer(canvas);
    if (!renderer) return;
    if (fallback) fallback.style.filter = '';
    applyColors();
    resize();
    wake();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const intersection = new IntersectionObserver(entries => { onScreen = entries[entries.length - 1]?.isIntersecting ?? true; wake(); });
  intersection.observe(host);
  const onVisibility = () => wake();
  document.addEventListener('visibilitychange', onVisibility);

  const controller: OrbController = {
    get ready() { return ready; },
    setState(name, presets) { target = resolveState(name, presets); wake(); },
    setColors(next) { colors = next; applyColors(); draw(); },
    setLevelSource(source) { levelSource = source; wake(); },
    setPaused(next) { paused = next; wake(); },
    dispose() {
      cancelAnimationFrame(frameId);
      frameId = 0;
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      renderer?.dispose();
      renderer = null;
    },
  };
  applyColors();
  resize();
  wake();
  return controller;
}
