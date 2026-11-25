import { forwardRef, memo, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { TalkingMarble } from 'talking-marble';
import { useSimulatedLevel } from '../simulated';
import { CURVE_SIZE, MARBLE, curvePoint, type ShotId } from './camera';
import type { GalleryRefs } from './useCamera';
import { useStage } from './stage';
import { usePick } from './pick';
import { colorsOf } from '../palettes';
import { createFog } from './fog';
import { isLowPower } from '../perf';
import { useTrying } from './walk';
import { Caption } from '../ui/Caption';
import { useStandingIn } from '../ui/Demo';
import { useScrolling } from './scrolling';

/**
 * The fog (F-54): a plain black stage with mist that moves like real air when the pointer passes through it
 * (fog.ts). Without WebGL2 the plain stage shows on its own.
 */
const Fog = memo(function Fog() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const fog = useRef<ReturnType<typeof createFog>>(null);
  useEffect(() => {
    const f = createFog(canvas.current!, { still: matchMedia('(prefers-reduced-motion: reduce)').matches, low: isLowPower() });
    fog.current = f;
    if (!f || !matchMedia('(hover: hover)').matches) return () => f?.destroy();
    const onMove = (e: PointerEvent) => f.move(e.clientX, e.clientY);
    addEventListener('pointermove', onMove, { passive: true });
    return () => { removeEventListener('pointermove', onMove); f.destroy(); };
  }, []);
  return <canvas ref={canvas} className="fog" aria-hidden="true" data-fog="" />;
});

/**
 * The one marble on the stage, showing what the live shot asks for. It is the page's one labelled marble;
 * everything else in the scene is decoration.
 */
const StageMarble = memo(function StageMarble({ active, hidden }: { active: ShotId; hidden: boolean }) {
  const wish = useStage(active);
  const pick = usePick();
  const standIn = useStandingIn();
  const voice = wish.voice ?? { kind: 'sim' as const };
  const sim = useSimulatedLevel(voice.kind === 'sim' && !hidden);
  const size = wish.size === undefined || wish.size === 'full' ? MARBLE : wish.size;
  // Drawn at about the size it shows on screen, not its world size (F-106): the camera often shows it at half size or
  // less, and every pixel drawn is shaded. Measured when the shot changes and every 1.5 s, in 40 px steps (so the
  // canvas is not resized for small moves), then scaled up to fill its place in the world.
  const box = useRef<HTMLSpanElement>(null);
  const [drawn, setDrawn] = useState(size);
  useEffect(() => {
    const measure = () => {
      const w = box.current?.getBoundingClientRect().width ?? 0;
      if (!w) return;
      const want = Math.min(size, Math.max(120, Math.ceil((w * 1.05) / 40) * 40));
      setDrawn(d => (Math.abs(want - d) >= 40 ? want : d));
    };
    const first = setTimeout(measure, 1100);
    const every = setInterval(measure, 1500);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [active, size]);
  const at = Math.min(drawn, size);
  return (
    <span ref={box} className="stage-marble__orb" data-testid="main-marble" style={{ width: size, height: size }} data-palette={pick.palette} data-colors={(wish.palette ?? colorsOf(pick.palette)).join(' ')} {...Object.fromEntries(Object.entries(wish.data ?? {}).map(([k, v]) => [`data-${k}`, v]))}>
      <TalkingMarble
        size={at}
        style={at === size ? undefined : { transform: `scale(${size / at})`, transformOrigin: '0 0' }}
        state={wish.state}
        emotion={wish.emotion ?? undefined}
        presets={wish.presets}
        palette={wish.palette ?? colorsOf(pick.palette)}
        halo={wish.halo ?? true}
        level={voice.kind === 'level' ? voice.level : sim}
        label={wish.label || 'Talking Marble'}
        paused={hidden || standIn.stage}
        className="reflect"
      />
      {/* The intro's demo says which state it is in (F-66); the marble's own label announces it to screen readers. */}
      <Caption word={wish.caption} />
    </span>
  );
});

/** One palette marble in the gallery. */
export interface GalleryMarble { id: string; label: string; colors: readonly string[]; chosen: boolean }
export interface GalleryProps {
  marbles: GalleryMarble[];
  /** The marble in front on the walk: the one the demo stands in for. */
  front: number;
  /** Which marbles can be seen ('m' and gallery indices): the rest pause. */
  drawing: string;
  /** Clickable only during the gallery's shots. */
  active: boolean;
  onPick: (k: number) => void;
}

/**
 * Every gallery marble draws at one size and is scaled up in the scene (F-54, F-109): the front one is never resized
 * when you walk on (a resize clears its canvas, which flashed, e.g. Aurora arriving at all six), and none is drawn
 * larger than it shows. The walk's marbles also show a little smaller (F-102).
 */
const GALLERY_DRAW = 220;
const GALLERY_SHOW = 0.84;

/**
 * The gallery's marbles, all showing what you are trying (F-22): the same state, emotion and halo, a simulated voice
 * where the state listens or speaks. The one in front is marked, so the demo (F-99) can stand in for it.
 */
function GalleryOrbs({ gallery, refs }: { gallery: GalleryProps; refs: MutableRefObject<GalleryRefs> }) {
  const trying = useTrying();
  const standIn = useStandingIn();
  const scrolling = useScrolling();
  const seen = gallery.drawing.split(' ');
  const sim = useSimulatedLevel(seen.some(k => k !== 'm'));
  return (
    <div ref={el => { refs.current.galleryEl = el; }} className="gallery" aria-hidden="true" inert={!gallery.active || undefined}>
      {gallery.marbles.map((m, k) => {
        const p = curvePoint(k);
        const state = trying.state;
        // While the demo's chatbox or call is up the gallery steps aside: none of it draws (F-106, F-109).
        const shown = seen.includes(String(k)) && !standIn.walk;
        return (
          <GalleryOrb
            key={m.id} k={k} refs={refs} x={p.x} z={p.z} marble={m} onPick={gallery.onPick}
            state={state} emotion={trying.emotion} halo={trying.halo} front={k === gallery.front} shown={shown}
            // The marble in front keeps moving through a scroll (F-112); the side ones sliding past hold their frame, so a
            // scroll costs one marble's motion, not six.
            hold={scrolling && k !== gallery.front}
            // Only marbles in view take the voice: the rest keep a constant level and so never re-render with it.
            level={!shown || state === 'thinking' ? 0 : sim}
          />
        );
      })}
    </div>
  );
}

/** One gallery marble. Memoised: it re-renders only when what it shows changes (the voice, while in view). */
const GalleryOrb = memo(function GalleryOrb({ k, refs, x, z, marble: m, onPick, state, emotion, halo, level, front, shown, hold }: {
  k: number; refs: MutableRefObject<GalleryRefs>; x: number; z: number; marble: GalleryMarble; onPick: (k: number) => void;
  state: string; emotion: string | null; halo: boolean; level: number; front: boolean; shown: boolean; hold: boolean;
}) {
  return (
    <Actor x={x} z={z} size={CURVE_SIZE} actorRef={el => { refs.current.actors[k] = el; }}>
      {/* The fade goes on a flat inner element: opacity on a 3D wrapper would flatten the scene */}
      <button type="button" className="gmarble" tabIndex={-1} aria-pressed={m.chosen} data-front={front || undefined} onClick={() => onPick(k)}>
        <span ref={el => { refs.current.orbs[k] = el; }} className="gmarble__orb" style={{ opacity: 0 }} data-state={state}>
          <TalkingMarble
            palette={m.colors as string[]} state={state} emotion={emotion ?? undefined}
            level={level}
            size={GALLERY_DRAW} decorative paused={!shown || hold} halo={halo} className="reflect"
            style={{ transform: `scale(${(CURVE_SIZE * GALLERY_SHOW) / GALLERY_DRAW})`, transformOrigin: '50% 100%' }}
          />
        </span>
        {/* Its palette's name, shown with all six (F-60) */}
      </button>
      <span className="gmarble__name">{m.label}</span>
    </Actor>
  );
});

/** Something standing on the floor at (x, z), always facing the camera; padded so its glow stays inside its box. */
function Actor({ x, z, size, className = '', children, actorRef }: { x?: number; z?: number; size: number; className?: string; children: ReactNode; actorRef?: (el: HTMLDivElement | null) => void }) {
  const pad = Math.round(size * 0.3);
  return (
    <div
      ref={actorRef}
      className={`actor ${className}`}
      style={{ width: size + 2 * pad, height: size + 2 * pad, padding: pad, ...(x === undefined ? {} : { transform: `translate3d(${x - size / 2 - pad}px, ${-size - 3 - pad}px, ${z}px) var(--bb)` }) }}
    >
      {children}
    </div>
  );
}

/** A pool of a marble's own light on the floor (each a little lower than the last: coplanar planes sort wrongly). */
/** `hidden`: starts unseen until the camera's first frame decides (F-47: no scattered colour on load). */
function Pool({ x, z, size, gap = 20, color, hidden, poolRef }: { x?: number; z?: number; size: number; gap?: number; color?: string; hidden?: boolean; poolRef?: (el: HTMLDivElement | null) => void }) {
  return (
    <div
      ref={poolRef}
      className="pool"
      aria-hidden="true"
      style={{ width: size, height: size, ...(x === undefined ? {} : { transform: `translate3d(${x - size / 2}px, ${-size / 2 + gap}px, ${z}px) rotateX(90deg)` }), ...(color ? { ['--marble' as string]: color } : {}), ...(hidden ? { opacity: 0 } : {}) }}
    />
  );
}

/**
 * The one continuous scene behind every shot: a black stage with fog that moves like air (F-54), the stage marble
 * and the palette gallery.
 * The camera moves the stage marble (from the picked marble's place to the stage) and fades the gallery.
 */
export const Scene = memo(forwardRef<HTMLDivElement, { active: ShotId; refs: MutableRefObject<GalleryRefs>; gallery: GalleryProps; narrow: boolean }>(function Scene({ active, refs, gallery }, world) {
  return (
    <div className="viewport">
      <Fog />
      <div className="world" ref={world}>
        <Pool size={MARBLE * 2} poolRef={el => { refs.current.mainPool = el; }} />
        {gallery.marbles.map((m, k) => {
          const p = curvePoint(k);
          return <Pool key={m.id} x={p.x} z={p.z} size={CURVE_SIZE * 2} gap={23 + k} color={m.colors[1]} hidden poolRef={el => { refs.current.pools[k] = el; }} />;
        })}
        <Actor size={MARBLE} className="stage-marble" actorRef={el => { refs.current.main = el; }}>
          <div className="spark" aria-hidden="true" />
          {/* Its own flat layer: keeps the reflection from tangling with the 3D sorting of the floor planes */}
          <div className="actor__flat"><StageMarble active={active} hidden={!gallery.drawing.split(' ').includes('m')} /></div>
        </Actor>
        {/* Clickable during the gallery's shots; keyboard and screen readers use the shots' own controls */}
        <GalleryOrbs gallery={gallery} refs={refs} />
      </div>
    </div>
  );
}));
