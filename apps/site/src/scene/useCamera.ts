import { useCallback, useEffect, useRef, useState } from 'react';
import { GALLERY, MARBLE, NARROW, SHOTS, STOPS, TOTAL, WALK_SCREENS, billboard, setGallerySpacing, createSpring, curvePoint, drift, gather, gridPoint, introPose, stageHome, nearestShot, poseAt, presence, stopOf, viewZoom, walkPosition, magnet, MAGNET_REACH, worldTransform, type ShotId } from './camera';
import { isLowPower } from '../perf';
import { markScrolling } from './scrolling';

/** The scene elements the camera moves or fades each frame: the stage marble (and its pool), and the gallery. */
export interface GalleryRefs { main: HTMLElement | null; mainPool: HTMLElement | null; orbs: (HTMLElement | null)[]; pools: (HTMLElement | null)[]; actors: (HTMLElement | null)[]; galleryEl: HTMLElement | null }
export const PAD = Math.round(MARBLE * 0.3);
const POOL = MARBLE * 2;

export const INTRO_MS = 2500;
const media = (q: string) => (typeof matchMedia === 'function' ? matchMedia(q) : null);
const isShot = (id: string): id is ShotId => SHOTS.some(s => s.id === id);

/**
 * Drives the page: the scroll position (in screens) sets the camera's target, a spring glides the camera there,
 * and each shot fades with how present it is. The world transform and the opacities are written directly each
 * frame; React only hears when the nearest shot, or the set of shots on screen, changes.
 */
export function useCamera() {
  const world = useRef<HTMLDivElement>(null);
  const shots = useRef<Partial<Record<ShotId, HTMLElement | null>>>({});
  const gallery = useRef<GalleryRefs>({ main: null, mainPool: null, orbs: [], pools: [], actors: [], galleryEl: null });
  const [active, setActive] = useState<ShotId>('top');
  const [walkStep, setWalkStep] = useState(0);
  /** Which marbles can be seen right now ('m' for the stage marble, digits for the gallery): only those draw. */
  const [drawing, setDrawing] = useState('m');
  const marblePos = useRef({ x: 0, z: 0 });
  const [onScreen, setOnScreen] = useState('top');
  const [narrow, setNarrow] = useState(() => media(NARROW)?.matches ?? false);
  setGallerySpacing(narrow);
  const [reduced, setReduced] = useState(() => media('(prefers-reduced-motion: reduce)')?.matches ?? false);
  const [intro, setIntro] = useState<'run' | 'done'>(() => (reduced ? 'done' : 'run'));
  // For CSS: 'play' while the intro runs (and after), 'skip' once skipped, none with reduced motion.
  const [introMode, setIntroMode] = useState<'play' | 'skip' | undefined>(() => (intro === 'run' ? 'play' : undefined));
  const state = useRef({ narrow, reduced, intro, u: 0 });
  state.current.narrow = narrow;
  state.current.reduced = reduced;
  state.current.intro = intro;
  const spring = useRef<ReturnType<typeof createSpring> | null>(null);
  const frameId = useRef(0);
  const holdUntil = useRef(0);
  const driftAmount = useRef(1);

  const screens = () => Math.min(TOTAL, Math.max(0, scrollY / Math.max(1, innerHeight)));

  /** Writes each shot's presence; the nearest shot takes the pointer. */
  const paint = useCallback((u: number) => {
    const best = nearestShot(u);
    const visible: ShotId[] = [];
    for (const { id } of SHOTS) {
      // A stop that isn't a whole pixel leaves a fade a hair short of 1: count that as fully shown.
      const raw = state.current.reduced ? (id === best ? 1 : 0) : presence(id, u);
      const p = raw > 0.99 ? 1 : raw;
      if (p > 0) visible.push(id);
      const el = shots.current[id];
      if (!el) continue;
      el.style.opacity = p.toFixed(3);
      el.toggleAttribute('data-on', id === best);
    }

    // The gallery: the marbles appear along the walk around the one in front, all six show as they gather into two
    // rows, then they leave as the camera zooms in to Create, where the plain globe takes their place (F-60, F-61).
    // The stage marble steps back while its sisters have the frame.
    const rd = state.current.reduced;
    const on = (id: ShotId) => (rd ? (id === best ? 1 : 0) : presence(id, u));
    const g = walkPosition(u);
    const step = rd ? Math.round(g) : g;
    const w1 = STOPS.palettes + WALK_SCREENS;
    const between = u > w1 && u < STOPS.all ? (rd ? 1 : (u - w1) / (STOPS.all - w1)) : -1;
    const leaving = u > STOPS.all && u < STOPS.create ? (rd ? (best === 'all' ? 1 : 0) : Math.max(0, 1 - (u - STOPS.all) / 0.6)) : -1;
    // The ones still to come recede to the right; the ones walked past fade quickly (they pass behind the words).
    const walkFade = (k: number) => Math.max(0, k >= step ? 1 - (k - step) * 0.55 : 1 - (step - k) * 1.25);
    const fadeAt = (k: number) => (between >= 0 ? walkFade(k) + (1 - walkFade(k)) * between
      : leaving >= 0 ? leaving : u >= STOPS.create ? 0 : Math.max(on('all'), on('palettes') * walkFade(k)));
    const { orbs, pools, main, mainPool, galleryEl } = gallery.current;
    const gathered = rd ? (best === 'all' ? 1 : 0) : gather(u);
    orbs.forEach((el, k) => { if (el) el.style.opacity = fadeAt(k).toFixed(3); });
    // Pools of light belong to the line on the floor; they fade as the marbles rise into rows.
    pools.forEach((el, k) => { if (el) el.style.opacity = (fadeAt(k) * (1 - gathered)).toFixed(3); });
    // The names show with all six (F-60).
    galleryEl?.style.setProperty('--names', (rd ? (best === 'all' ? 1 : 0) : Math.max(0, on('all') * 1.4 - 0.4)).toFixed(3));
    // The plain globe comes in during the second half of the zoom into Create (hidden until then, so it can move).
    const into = u > STOPS.all && u < STOPS.create ? (rd ? (best === 'create' ? 1 : 0) : Math.max(0, (u - STOPS.all - 0.45) / 0.45)) : -1;
    const mainOn = u >= STOPS.create ? 1 : into >= 0 ? Math.min(1, into) : u >= STOPS.palettes ? 0 : 1 - on('palettes');
    if (main) main.style.opacity = mainOn.toFixed(3);
    if (mainPool) mainPool.style.opacity = mainOn.toFixed(3);
    setActive(best);
    setOnScreen(visible.join(' '));
    setWalkStep(Math.round(g));
    const seen = orbs.map((_, k) => (fadeAt(k) > 0.02 ? String(k) : '')).filter(Boolean);
    setDrawing([...(mainOn > 0 ? ['m'] : []), ...seen].join(' '));
  }, []);

  /** One frame: spring the camera toward the scroll's target pose, with a slow handheld drift on top. */
  const tick = useCallback(function tickFrame(now: number, last = now) {
    const { narrow: nw, reduced: rd, intro: it, u } = state.current;
    const target = poseAt(u, nw, rd);
    const s = (spring.current ??= createSpring(it === 'run' ? introPose(nw) : target));
    let moving = false;
    if (rd) s.snap(target);
    else moving = s.step(target, Math.min(0.25, (now - last) / 1000) || 1 / 60, it === 'run' ? 2.6 : 6.5);
    // The drift settles for a moment after a click or key press, so nothing moves under the pointer.
    const hold = now < holdUntil.current ? 0 : 1;
    const dt = ((now - last) / 1000) || 1 / 60;
    driftAmount.current += (hold - driftAmount.current) * Math.min(1, dt * (hold ? 0.8 : 8));
    if (driftAmount.current < 0.002) driftAmount.current = 0;
    // No handheld drift on low-power devices (F-54): the camera holds still once it arrives.
    const drifting = !rd && !isLowPower();
    const shown = drifting ? drift(s.pose, now / 1000, nw, driftAmount.current) : s.pose;
    const w = world.current;
    if (w) {
      w.style.transform = worldTransform(shown, viewZoom());
      w.style.setProperty('--bb', billboard(shown));
    }
    // The stage marble: the plain globe at home for the intro, then in the middle of the gallery for Create (F-61).
    // Home at the intro; in the middle of the gallery for Create and the Guide (it moves only while hidden).
    const want = u <= STOPS.all ? { x: 0, z: 0 } : stageHome();
    // The gallery: a straight line on the walk, gathering into two rows of three for all six (F-59, F-60).
    const gat = rd ? (nearestShot(u) === 'all' ? 1 : 0) : gather(u);
    gallery.current.actors.forEach((el, k) => {
      if (!el) return;
      const a = curvePoint(k), b = gridPoint(k);
      const x = a.x + (b.x - a.x) * gat, y = a.y + (b.y - a.y) * gat;
      el.style.transform = `translate3d(${(x - MARBLE / 2 - PAD).toFixed(1)}px, ${(y - MARBLE - 3 - PAD).toFixed(1)}px, 0px) var(--bb)`;
    });
    const m = marblePos.current;
    const hidden = gallery.current.main?.style.opacity === '0';
    const k = rd || hidden ? 1 : 1 - Math.exp(-dt * 6.5);
    m.x += (want.x - m.x) * k;
    m.z += (want.z - m.z) * k;
    const { main, mainPool } = gallery.current;
    if (main) main.style.transform = `translate3d(${(m.x - MARBLE / 2 - PAD).toFixed(1)}px, ${-MARBLE - 3 - PAD}px, ${m.z.toFixed(1)}px) var(--bb)`;
    if (mainPool) mainPool.style.transform = `translate3d(${(m.x - POOL / 2).toFixed(1)}px, ${-POOL / 2 + 20}px, ${m.z.toFixed(1)}px) rotateX(90deg)`;
    const settling = moving || Math.abs(want.x - m.x) > 0.5 || Math.abs(want.z - m.z) > 0.5;
    // The drift keeps the camera alive while the page is visible; with reduced motion it draws once per change.
    // Full rate while the camera moves; at rest, only the drift continues, at about 30 frames a second, and on
    // low-power devices nothing runs until the next scroll or resize wakes it (F-54).
    if (rd || document.hidden || (!settling && !drifting)) { frameId.current = 0; return; }
    if (settling) { frameId.current = requestAnimationFrame(t => tickFrame(t, now)); return; }
    frameId.current = requestAnimationFrame(t1 => { frameId.current = requestAnimationFrame(t2 => tickFrame(t2, now)); void t1; });
  }, []);
  const wake = useCallback(() => { if (!frameId.current) frameId.current = requestAnimationFrame(t => tick(t)); }, [tick]);

  useEffect(() => {
    // The whole path is magnetic (F-52, F-67, F-80): when scrolling stops close to a place (a shot, or a marble on
    // the walk), it glides the rest of the way, slowly, easing in and out. Stopped far from every place (in the
    // middle of a long move between shots) it stays put, so a small scroll never turns into a big sudden move. Any
    // wheel, touch, key or click stops a glide at once. Past the guide (the footer) it rests where it is.
    let settle = 0, touching = false, glide = 0;
    const stopGlide = () => { cancelAnimationFrame(glide); glide = 0; };
    const onTouch = (e: TouchEvent) => { touching = e.type === 'touchstart'; stopGlide(); if (!touching) { clearTimeout(settle); settle = window.setTimeout(snap, 260); } };
    const onInput = () => stopGlide();
    addEventListener('touchstart', onTouch, { passive: true });
    addEventListener('touchend', onTouch, { passive: true });
    addEventListener('wheel', onInput, { passive: true });
    addEventListener('keydown', onInput);
    addEventListener('pointerdown', onInput, { passive: true });
    const snap = () => {
      if (touching || glide) return; // a finger still on the screen, or already gliding
      const u = screens();
      if (u >= STOPS.guide - 0.001) return;
      // On the walk every stop settles on the nearest marble (F-105), so scrolling never leaves you between two or past one.
      const onWalk = u > STOPS.palettes - 0.3 && u < STOPS.palettes + WALK_SCREENS + 0.3;
      const to = magnet(u, onWalk ? Infinity : MAGNET_REACH);
      if (to === null || Math.abs(to - u) < 0.004) return;
      if (state.current.reduced) { scrollTo({ top: to * innerHeight, behavior: 'auto' }); return; }
      const from = scrollY, dist = to * innerHeight - from;
      const ms = 520 + Math.min(1, Math.abs(to - u) / 0.3) * 480;
      const t0 = performance.now();
      const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      let set = from;
      const step = (now: number) => {
        // Anything else that moved the page (the index, a key, a link, a script) wins: the glide lets go.
        if (Math.abs(scrollY - set) > 2) { glide = 0; return; }
        const t = Math.min(1, (now - t0) / ms);
        set = Math.round(from + dist * ease(t));
        scrollTo({ top: set, behavior: 'instant' });
        glide = t < 1 ? requestAnimationFrame(step) : 0;
      };
      glide = requestAnimationFrame(step);
    };
    const onScroll = () => {
      markScrolling();
      state.current.u = screens(); paint(state.current.u); wake();
      clearTimeout(settle);
      if (!glide) settle = window.setTimeout(snap, 200);
    };
    const onResize = () => { setNarrow(media(NARROW)?.matches ?? false); onScroll(); };
    const rm = media('(prefers-reduced-motion: reduce)');
    const onRm = () => setReduced(rm?.matches ?? false);
    const onVisible = () => { if (!document.hidden) wake(); };
    const holdStill = () => { holdUntil.current = performance.now() + 4000; };
    addEventListener('pointerdown', holdStill, { capture: true, passive: true });
    addEventListener('keydown', holdStill, { capture: true });
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisible);
    rm?.addEventListener('change', onRm);
    onScroll();
    return () => {
      removeEventListener('pointerdown', holdStill, { capture: true }); removeEventListener('keydown', holdStill, { capture: true });
      removeEventListener('scroll', onScroll); removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisible); rm?.removeEventListener('change', onRm);
      cancelAnimationFrame(frameId.current); frameId.current = 0; clearTimeout(settle);
      removeEventListener('touchstart', onTouch); removeEventListener('touchend', onTouch);
      removeEventListener('wheel', onInput); removeEventListener('keydown', onInput); removeEventListener('pointerdown', onInput); stopGlide();
    };
  }, [paint, wake]);
  useEffect(() => { paint(state.current.u); wake(); }, [narrow, reduced, paint, wake]);

  /** Moves to a shot by scrolling there; the camera follows. */
  const heading = useRef<ShotId | null>(null); // where a jump is going, so quick key presses add up
  useEffect(() => { if (heading.current === active) heading.current = null; }, [active]);
  const goTo = useCallback((id: ShotId, walkIndex?: number) => {
    heading.current = state.current.reduced ? null : id;
    let u = stopOf(id);
    if (id === 'palettes' && walkIndex !== undefined) u += (Math.max(0, Math.min(GALLERY - 1, walkIndex)) / (GALLERY - 1)) * WALK_SCREENS;
    scrollTo({ top: u * innerHeight, behavior: state.current.reduced ? 'auto' : 'smooth' });
  }, []);
  useEffect(() => {
    const drop = () => { heading.current = null; }; // scrolling by hand takes over from a jump
    addEventListener('wheel', drop, { passive: true });
    addEventListener('touchstart', drop, { passive: true });
    return () => { removeEventListener('wheel', drop); removeEventListener('touchstart', drop); };
  }, []);

  // The intro: skippable by any click, key, wheel or touch; then the camera settles into the first shot.
  const endIntro = useCallback(() => {
    if (state.current.intro === 'done') return;
    setIntro('done');
    state.current.intro = 'done';
    wake();
  }, [wake]);
  useEffect(() => {
    if (intro !== 'run') return;
    const t = setTimeout(endIntro, INTRO_MS);
    const skip = () => { spring.current?.snap(poseAt(state.current.u, state.current.narrow, false)); setIntroMode('skip'); endIntro(); };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    events.forEach(e => addEventListener(e, skip, { once: true, passive: true }));
    return () => { clearTimeout(t); events.forEach(e => removeEventListener(e, skip)); };
  }, [intro, endIntro]);

  // Page Up / Page Down jump between shots (not while typing or inside a picker).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'PageDown' && e.key !== 'PageUp') return;
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select, [role="dialog"]')) return;
      const order = SHOTS.map(x => x.id);
      const i = order.indexOf(heading.current ?? nearestShot(state.current.u));
      const to = i + (e.key === 'PageDown' ? 1 : -1);
      e.preventDefault();
      if (to >= 0 && to < order.length) goTo(order[to]!);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [goTo]);

  // Keyboard order runs through the shots like a page: focus moving into a shot brings the camera there.
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const id = (e.target as HTMLElement | null)?.closest?.('.shot')?.id;
      if (id && isShot(id) && id !== (heading.current ?? nearestShot(state.current.u))) goTo(id);
    };
    document.addEventListener('focusin', onFocus);
    return () => document.removeEventListener('focusin', onFocus);
  }, [goTo]);

  // In-page links to a shot (the nav, the brand, the index) move the camera; a hash on load opens at that shot.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]');
      const id = a?.getAttribute('href')!.slice(1) ?? '';
      if (!isShot(id) || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      history.replaceState(null, '', id === 'top' ? location.pathname : `#${id}`);
      goTo(id);
    };
    const fromHash = () => { const id = location.hash.slice(1); if (isShot(id)) scrollTo({ top: stopOf(id) * innerHeight }); };
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (location.hash) fromHash(); else scrollTo(0, 0);
    document.addEventListener('click', onClick);
    addEventListener('hashchange', fromHash);
    return () => { document.removeEventListener('click', onClick); removeEventListener('hashchange', fromHash); };
  }, [goTo]);

  return { world, shots, gallery, active, onScreen, walkStep, drawing, narrow, reduced, intro, introMode, goTo };
}
