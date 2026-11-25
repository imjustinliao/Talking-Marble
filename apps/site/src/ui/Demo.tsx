import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { TalkingMarble, type OrbPreset } from 'talking-marble';
import { useSimulatedLevel } from '../simulated';
import { Caption } from './Caption';
import { createStore } from '../scene/store';
import { isScrolling } from '../scene/scrolling';
import { CloseIcon, MicOffIcon, PhoneOffIcon, PlusIcon, SpeakerIcon } from './icons';

/** Where the marble is seen (F-99): on its own, above a chatbox, or in a call. */
export type SeenIn = 'none' | 'bar' | 'call';
export const SEEN_IN: { id: SeenIn; label: string }[] = [
  { id: 'none', label: 'Marble' },
  { id: 'bar', label: 'Chatbox' },
  { id: 'call', label: 'Call' },
];

/**
 * Which scene marble a demo stands in for right now. That marble is hidden meanwhile, so it pauses too and the GPU
 * draws one marble in its place, not two (efficiency, F-106).
 */
const standingIn = createStore<{ walk: boolean; stage: boolean }>({ walk: false, stage: false });
export const useStandingIn = standingIn.use;

/** The marble the demo stands in for, and the panel it must keep clear of. */
export interface DemoAnchor { marble: string; panel: string }

const FLIGHT_MS = 760;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
type Box = { x: number; y: number; s: number };

/**
 * The marble seen in an everyday voice interface (F-99). A picture of a UI, laid over the stage: the big marble in
 * the scene steps aside and one marble of the demo's own takes its place, flying between spots (the scene's spot, a
 * chatbox's voice button, the middle above the bar, a call screen) along a short arc. Each spot is an empty element
 * marked `data-home`; the marble re-measures its spot every frame, so it follows it as the layout moves, and a new
 * spot starts a fresh flight from wherever it is drawn now (so it can turn back mid-flight). Nothing else moves the
 * page: the controls stay where they are. The talk-to-it conversation needs a voice model and is a later plan.
 */
export function Demo({ seen, anchor, live, state, emotion, halo, palette, presets, name }: {
  seen: SeenIn; anchor: DemoAnchor; live: boolean; state: string; emotion?: string | null; halo: boolean | number;
  palette: readonly string[]; presets?: Record<string, OrbPreset>; name: string;
}) {
  // In the chatbox the marble starts in the middle above it (like an open voice chat); its button closes it into the bar.
  const [open, setOpen] = useState(true);
  useEffect(() => { if (seen === 'bar') setOpen(true); }, [seen]);
  // Marble is the scene's own marble (its caption held still under it). A stand-in there swapped marbles every time
  // the walk's front marble changed while scrolling, which stuttered (F-109).
  const shown = live && seen !== 'none';
  // Not shown (another step, the shot left): home to the scene's spot, then hand back.
  const home = !shown ? 'scene' : seen === 'call' ? 'call' : seen === 'bar' ? (open ? 'above' : 'slot') : 'marble';
  // The demo's marble stays drawn until it has flown back to the scene's spot, then hands back to the scene.
  const [present, setPresent] = useState(false);
  useEffect(() => { if (shown) setPresent(true); }, [shown]);

  const layer = useRef<HTMLDivElement>(null);
  const orb = useRef<HTMLDivElement>(null);
  const flight = useRef<{ from: Box; start: number } | null>(null);
  const drawn = useRef<Box | null>(null);
  const homeRef = useRef(home);
  const seenRef = useRef(seen);
  seenRef.current = shown ? seen : 'none';
  const [base, setBase] = useState(240);

  // A new spot: fly from where the marble is drawn now.
  useEffect(() => {
    if (homeRef.current !== home && drawn.current) flight.current = reducedMotion() ? null : { from: drawn.current, start: performance.now() };
    homeRef.current = home;
  }, [home]);

  // The scene's own marble steps aside (hidden and paused) while the demo's is out.
  useEffect(() => {
    const root = document.documentElement, which = anchor.marble === 'stage' ? 'stage' : 'walk';
    if (!present) return;
    root.setAttribute('data-demo', which);
    standingIn.set({ [which]: true });
    return () => { root.removeAttribute('data-demo'); standingIn.set({ [which]: false }); };
  }, [present, anchor.marble]);

  const on = live || present;
  useLayoutEffect(() => {
    if (!on) return;
    const el = layer.current!, node = orb.current;
    let frame = 0;
    // Where the chrome is laid out: measured once, then held still (F-102). The scene's marble drifts a little at rest;
    // the interfaces must not. Measured again only after a resize, or when the marble's spot really moves (> 60 px).
    let held: { cx: number; cy: number; size: number } | null = null;
    const onResize = () => { held = null; };
    addEventListener('resize', onResize);
    const scene = () => document.querySelector<HTMLElement>(anchor.marble === 'stage'
      ? '[data-testid="main-marble"] [data-talking-marble]'
      : '.gmarble[data-front] [data-talking-marble]');
    // Measured only when something can have changed: a flight, a new spot, or every half second (a held layout, a
    // marble that rests): the page is not read every frame (F-106).
    let lastMeasure = 0, lastHome = '';
    let moving = false, stillSince = 0, lastCx: number | null = null, sampledAt = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      // While the page scrolls, while the camera glides, or when the marble has come to rest somewhere other than where
      // the layout was measured, the state's word hides (F-111); once the marble is still, the layout is measured afresh
      // and the word fades back in, centred under it. The marble is sampled ten times a second, not every frame.
      if (now - sampledAt >= 100) {
        sampledAt = now;
        const r = scene()?.getBoundingClientRect();
        if (r && r.width) {
          const cx = r.left + r.width / 2;
          if (lastCx === null || Math.abs(cx - lastCx) > 1.5) stillSince = now;
          // Only Marble re-centres on a small rest; the chatbox and call stay exactly where they are (F-102).
          else if (held && seenRef.current === 'none' && Math.abs(cx - held.cx) > 3) { stillSince = now; held = null; }
          lastCx = cx;
        }
      }
      const nowMoving = isScrolling() || now - stillSince < 250;
      if (nowMoving !== moving) { moving = nowMoving; el.toggleAttribute('data-moving', moving); }
      // Marble re-measures when the marble moves; the chatbox and call keep their place (only a resize, or the marble
      // really moving, over 60 px, moves them: F-102).
      if (moving && seenRef.current === 'none') held = null;
      if (!flight.current && held && homeRef.current === lastHome && now - lastMeasure < 500 && !(!shown && homeRef.current === 'scene')) return;
      lastMeasure = now; lastHome = homeRef.current;
      // Lay the chrome out around the scene's spot, inside the room the panel leaves.
      const spot = scene()?.getBoundingClientRect();
      const panel = document.querySelector(anchor.panel)?.getBoundingClientRect();
      if (!(moving && seenRef.current === 'none') && spot && panel && (!held || Math.abs(spot.left + spot.width / 2 - held.cx) > 60 || Math.abs(spot.top + spot.height / 2 - held.cy) > 60 || Math.abs(spot.width - held.size) > 60)) {
        held = { cx: spot.left + spot.width / 2, cy: spot.top + spot.height / 2, size: spot.width };
        const narrow = innerWidth < 720;
        // The room beside the panel on the marble's side (the walk's marble is right of its panel, Create's left), or above
        // the panel on a phone.
        const right = spot.left + spot.width / 2 > panel.left + panel.width / 2;
        const room = narrow
          ? { l: 12, r: innerWidth - 12, t: 64, b: Math.max(200, panel.top - 8) }
          : right
            ? { l: panel.right + 40, r: innerWidth - 84, t: 76, b: innerHeight - 120 }
            : { l: 40, r: panel.left - 48, t: 76, b: innerHeight - 40 };
        const v = (k: string, n: number) => el.style.setProperty(k, `${Math.round(n)}px`);
        v('--cx', held.cx); v('--cy', held.cy); v('--size', held.size);
        v('--room-l', room.l); v('--room-r', room.r); v('--room-t', room.t); v('--room-b', room.b);
        el.style.setProperty('--fit', String(Math.min(0.9, (room.b - room.t) / 600, (room.r - room.l) / 320)));
        // Drawn at the largest size it is shown at (Marble's four fifths), never larger: fewer pixels to shade.
        const want = Math.round(spot.width * 0.8);
        if (Math.abs(want - base) / base > 0.15) setBase(want);
      }
      if (!node) return;
      const target = homeRef.current === 'scene' ? scene() : el.querySelector<HTMLElement>(`[data-home="${homeRef.current}"]`);
      const box = target?.getBoundingClientRect();
      if (!box || !box.width) return;
      const s0 = Math.min(box.width, box.height);
      let x = box.left + box.width / 2 - s0 / 2, y = box.top + box.height / 2 - s0 / 2, s = s0;
      const f = flight.current;
      if (f) {
        const raw = Math.min(1, (now - f.start) / FLIGHT_MS), t = ease(raw), u = 1 - t;
        const dx = x - f.from.x, dy = y - f.from.y;
        const cx = f.from.x + dx * 0.95;
        const cy = f.from.y + Math.min(0, dy) - Math.min(90, Math.abs(dy) * 0.3 + 30);
        x = u * u * f.from.x + 2 * u * t * cx + t * t * x;
        y = u * u * f.from.y + 2 * u * t * cy + t * t * y;
        s = f.from.s + (s - f.from.s) * t;
        if (raw >= 1) flight.current = null;
      }
      drawn.current = { x, y, s };
      node.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s / base})`;
      // Back on the scene's spot with nowhere else to go: hand back to the scene's marble.
      if (!shown && !flight.current && homeRef.current === 'scene') setPresent(false);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); removeEventListener('resize', onResize); };
  }, [on, present, shown, base, anchor.marble, anchor.panel]);

  // The call's clock, from when it starts.
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (seen !== 'call' || !live) return;
    setSecs(0);
    const t = setInterval(() => setSecs(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [seen, live]);
  const clock = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

  if (!on || typeof document === 'undefined') return null;
  const tint = { '--d1': palette[1], '--d2': palette[2], '--d3': palette[3] } as CSSProperties;
  return createPortal(
    <div ref={layer} className="demo" data-seen={shown ? seen : 'none'} data-live={live || undefined} data-open={open || undefined} style={tint}>
      {/* Marble (F-102): where the marble rests on its own, held still, its state under it. */}
      <span className="demo__home demo__home--marble" data-home="marble" />
      {/* The call (F-99): a phone's voice-call screen, its glass buttons pictures only. */}
      <div className="demo__call" aria-hidden="true">
        <div className="demo__call-top">
          <span className="demo__call-name">{name}</span>
          <span className="demo__call-clock">{clock}</span>
        </div>
        <span className="demo__home demo__home--call" data-home="call" />
        <Caption word={state} className="demo__caption demo__caption--call" />
        <div className="demo__call-keys">
          <span className="demo__key demo__glass"><SpeakerIcon /></span>
          <span className="demo__key demo__glass"><MicOffIcon /></span>
          <span className="demo__key demo__glass demo__glass--end"><PhoneOffIcon /></span>
        </div>
      </div>
      {/* The chatbox (F-99): the marble opens from the bar's voice button to the middle above it, and closes back. */}
      <div className="demo__chat">
        <span className="demo__home demo__home--above" data-home="above" />
        <Caption word={state} className="demo__caption demo__caption--above" />
        <div className="demo__bar">
          <span className="demo__bar-plus" aria-hidden="true"><PlusIcon /></span>
          <span className="demo__bar-text" aria-hidden="true">Ask anything</span>
          <span className="demo__glass demo__glass--small" aria-hidden="true"><MicOffIcon /></span>
          {open ? (
            <button type="button" className="demo__glass demo__glass--accent" aria-label="Close the voice chat" onClick={() => setOpen(false)}><CloseIcon /></button>
          ) : (
            <button type="button" className="demo__slot" aria-label="Open the voice chat" onClick={() => setOpen(true)}>
              <span className="demo__home" data-home="slot" />
            </button>
          )}
        </div>
      </div>
      <Caption word={state} className="demo__caption demo__caption--scene" />
      {present && (
        <div ref={orb} className="demo__orb" aria-hidden="true">
          <DemoMarble size={base} state={state} emotion={emotion} presets={presets} palette={palette} halo={halo} />
        </div>
      )}
    </div>,
    document.body,
  );
}

/** The demo's marble, with its simulated voice. Its own component, so only it re-renders with the voice (F-106). */
const DemoMarble = memo(function DemoMarble({ size, state, emotion, presets, palette, halo }: {
  size: number; state: string; emotion?: string | null; presets?: Record<string, OrbPreset>; palette: readonly string[]; halo: boolean | number;
}) {
  const level = useSimulatedLevel(state === 'listening' || state === 'speaking' || state === 'searching');
  return <TalkingMarble size={size} state={state} emotion={emotion ?? undefined} presets={presets} level={level} palette={palette as string[]} halo={halo} decorative />;
});
