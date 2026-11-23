import { useCallback, useEffect, useRef, useState } from 'react';
import { PALETTE_IDS } from '../palettes';
import type { Fades } from '../scene/Scene';
import { SHOTS, STOPS, TOTAL, WALK_SCREENS, billboard, createSpring, viewZoom, introPose, nearestShot, poseAt, presence, walkPosition, worldTransform, type ShotId } from '../scene/camera';

const N = PALETTE_IDS.length;
export const INTRO_MS = 2600;

/** Phones and portrait screens (tablets held upright) share the narrow framing and the bottom sheet. */
const NARROW = '(max-width: 720px), (max-aspect-ratio: 1/1)';
const media = (q: string) => (typeof matchMedia === 'function' ? matchMedia(q) : null);

/**
 * Drives the scene: the scroll position (in screens) sets the camera's target, a spring glides the camera
 * there, and each shot's words and controls fade with how present the shot is. The world transform and
 * the opacities are written directly each frame; React only hears when the active shot or walk step changes.
 */
export function useExperience() {
  const world = useRef<HTMLDivElement>(null);
  const shots = useRef<Partial<Record<ShotId, HTMLElement | null>>>({});
  const curveRefs = useRef<(HTMLElement | null)[]>([]);
  const fades = useRef<Fades>({ main: null, mainPool: null, pools: [] });
  const progress = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ShotId>('intro');
  const [walkStep, setWalkStep] = useState(0);
  /** True while any of the palette curve can be on screen (its marbles are live only then). */
  const [curveWindow, setCurveWindow] = useState(false);
  const [narrow, setNarrow] = useState(() => media(NARROW)?.matches ?? false);
  const [reduced, setReduced] = useState(() => media('(prefers-reduced-motion: reduce)')?.matches ?? false);
  const [intro, setIntro] = useState<'run' | 'done'>(() => (media('(prefers-reduced-motion: reduce)')?.matches ? 'done' : 'run'));
  // For CSS: 'play' while the intro's animations run (and after), 'skip' once skipped, none with reduced motion.
  const [introMode, setIntroMode] = useState<'play' | 'skip' | undefined>(() => (intro === 'run' ? 'play' : undefined));
  const state = useRef({ narrow, reduced, intro, u: 0 });
  state.current.narrow = narrow;
  state.current.reduced = reduced;
  state.current.intro = intro;
  const spring = useRef(createSpring(intro === 'run' ? introPose(narrow) : poseAt(0, N, narrow)));
  const frame = useRef(0);
  /** The camera's live pose (the spring's own object), for the curve field. */
  const pose = useRef(spring.current.pose);

  const screens = () => (typeof window === 'undefined' ? 0 : Math.min(TOTAL, Math.max(0, scrollY / Math.max(1, innerHeight))));

  /** Writes the shots' presence and the curve's fade for scroll position `u`. */
  const paintOverlays = useCallback((u: number) => {
    for (const { id } of SHOTS) {
      const p = state.current.reduced ? (presence(id, u) > 0.5 ? 1 : 0) : presence(id, u);
      const el = shots.current[id];
      if (el) el.style.opacity = p.toFixed(3);
    }
    const best = nearestShot(u); // follows the camera everywhere, between shots too
    const g = walkPosition(u, N);
    const step = state.current.reduced ? Math.round(g) : g;
    const on = (id: ShotId) => (state.current.reduced ? (presence(id, u) > 0.5 ? 1 : 0) : presence(id, u));
    const cp = on('colors'), pp = on('pick');
    // From the end of the walk to the pick, the curve stays on screen and opens up to show every marble.
    const w1 = STOPS.colors + WALK_SCREENS;
    const between = u > w1 && u < STOPS.pick ? (u - w1) / (STOPS.pick - w1) : -1;
    const walkFade = (k: number) => Math.max(0, k >= step ? 1 - (k - step) * 0.55 : 1 - (step - k) * 0.6);
    // From the pick back to the marble, the curve fades out slowly as the camera turns, the marble fades in.
    const leaving = u > STOPS.pick && u < STOPS.talk ? Math.max(0, 1 - (u - STOPS.pick) / 0.75) : -1;
    const fadeAt = (k: number) => (between >= 0 ? walkFade(k) + (1 - walkFade(k)) * between : leaving >= 0 ? leaving : Math.max(pp, cp * walkFade(k)));
    const curveOn = between >= 0 ? 1 : leaving >= 0 ? leaving : Math.max(cp, pp);
    curveRefs.current.forEach((el, k) => { if (el) el.style.opacity = fadeAt(k).toFixed(3); });
    fades.current.pools.forEach((el, k) => { if (el) el.style.opacity = fadeAt(k).toFixed(3); });
    // The main marble steps back while its sisters have the frame.
    const main = (1 - curveOn).toFixed(3);
    if (fades.current.main) fades.current.main.style.opacity = main;
    if (fades.current.mainPool) fades.current.mainPool.style.opacity = main;
    if (progress.current) progress.current.style.transform = `scaleY(${(u / TOTAL).toFixed(4)})`;
    setActive(best);
    setWalkStep(Math.round(g));
    setCurveWindow(u > STOPS.colors - 0.4 && u < STOPS.pick + 0.75);
  }, []);

  /** One frame: spring the camera toward the scroll's target pose. */
  const tick = useCallback(function tickFrame(now: number, last = now) {
    const { narrow: nw, reduced: rd, intro: it } = state.current;
    const u = state.current.u;
    const target = poseAt(u, N, nw, rd);
    const s = spring.current;
    let moving: boolean;
    if (rd) { s.snap(target); moving = false; } else {
      const dt = Math.min(0.25, (now - last) / 1000) || 1 / 60;
      moving = s.step(target, dt, it === 'run' ? 2.6 : 6.5);
    }
    const w = world.current;
    if (w) {
      w.style.transform = worldTransform(s.pose, viewZoom());
      w.style.setProperty('--bb', billboard(s.pose));
    }
    frame.current = moving ? requestAnimationFrame(t => tickFrame(t, now)) : 0;
  }, []);
  const wake = useCallback(() => { if (!frame.current) frame.current = requestAnimationFrame(t => tick(t)); }, [tick]);

  useEffect(() => {
    const onScroll = () => { state.current.u = screens(); paintOverlays(state.current.u); wake(); };
    const onResize = () => { setNarrow(media(NARROW)?.matches ?? false); onScroll(); };
    const rm = media('(prefers-reduced-motion: reduce)');
    const onRm = () => setReduced(rm?.matches ?? false);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize);
    rm?.addEventListener('change', onRm);
    onScroll();
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onResize); rm?.removeEventListener('change', onRm); cancelAnimationFrame(frame.current); frame.current = 0; };
  }, [paintOverlays, wake]);
  useEffect(() => { paintOverlays(state.current.u); wake(); }, [narrow, reduced, paintOverlays, wake]);

  /** Moves to a shot (or a place on the palette walk) by scrolling there; the camera follows. */
  const heading = useRef<ShotId | null>(null); // where a jump is going, so quick key presses add up
  useEffect(() => { if (heading.current === active) heading.current = null; }, [active]);
  useEffect(() => {
    // Scrolling by hand takes over from a keyboard jump.
    const drop = () => { heading.current = null; };
    addEventListener('wheel', drop, { passive: true });
    addEventListener('touchstart', drop, { passive: true });
    return () => { removeEventListener('wheel', drop); removeEventListener('touchstart', drop); };
  }, []);
  const goTo = useCallback((id: ShotId, walkIndex?: number) => {
    heading.current = state.current.reduced ? null : id;
    let u = STOPS[id];
    if (id === 'colors' && walkIndex !== undefined) u += (walkIndex / (N - 1)) * WALK_SCREENS;
    scrollTo({ top: u * innerHeight, behavior: state.current.reduced ? 'auto' : 'smooth' });
  }, []);

  // The intro: skippable by any click, key, wheel or touch; then the camera settles into the wide shot.
  const endIntro = useCallback(() => {
    if (state.current.intro === 'done') return;
    setIntro('done');
    state.current.intro = 'done';
    wake();
  }, [wake]);
  useEffect(() => {
    if (intro !== 'run') return;
    const t = setTimeout(endIntro, INTRO_MS);
    const settle = setTimeout(wake, 500); // the camera starts drawing back as the light becomes a marble
    const skip = () => { spring.current.snap(poseAt(state.current.u, N, state.current.narrow)); setIntroMode('skip'); endIntro(); };
    const opts = { once: true, passive: true } as const;
    addEventListener('pointerdown', skip, opts);
    addEventListener('keydown', skip, opts);
    addEventListener('wheel', skip, opts);
    addEventListener('touchstart', skip, opts);
    return () => {
      clearTimeout(t); clearTimeout(settle);
      removeEventListener('pointerdown', skip); removeEventListener('keydown', skip); removeEventListener('wheel', skip); removeEventListener('touchstart', skip);
    };
  }, [intro, endIntro, wake]);

  // Page Up / Page Down / Home / End jump between shots.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, [role="dialog"]')) return;
      const order = SHOTS.map(s => s.id);
      const i = order.indexOf(heading.current ?? active);
      const to = e.key === 'PageDown' ? i + 1 : e.key === 'PageUp' ? i - 1 : e.key === 'Home' && !t?.closest('[role="group"]') ? 0 : e.key === 'End' && !t?.closest('[role="group"]') ? order.length - 1 : -1;
      if (to < 0 || to >= order.length || to === i) return;
      e.preventDefault();
      goTo(order[to]!);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [active, goTo]);

  // A hash (from the docs page or a shared link) opens at that shot.
  useEffect(() => {
    const fromHash = () => {
      const id = location.hash.slice(1) as ShotId;
      if (SHOTS.some(s => s.id === id)) scrollTo({ top: STOPS[id] * innerHeight });
    };
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (location.hash) fromHash(); else scrollTo(0, 0);
    addEventListener('hashchange', fromHash);
    return () => removeEventListener('hashchange', fromHash);
  }, []);

  return { world, shots, curveRefs, fades, progress, pose, active, walkStep, curveWindow, narrow, reduced, intro, introMode, endIntro, goTo };
}
