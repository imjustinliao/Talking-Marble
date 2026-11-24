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
import { useTalk } from './talk';
import { useTrying } from './walk';

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
 * The one marble on the stage, showing what the live shot asks for (its state, the playground's settings).
 * It is the page's one labelled marble; everything else in the scene is decoration.
 */
/**
 * The word under the intro's marble (F-66, F-73): plain type, no box. A new word crossfades in over the old one
 * (each slightly blurred and spaced on its way), so the change is a dissolve, not a switch.
 */
function Caption({ word }: { word?: string }) {
  const [words, setWords] = useState<{ cur?: string; prev?: string; n: number }>({ cur: word, n: 0 });
  useEffect(() => { setWords(w => (w.cur === word ? w : { cur: word, prev: w.cur, n: w.n + 1 })); }, [word]);
  return (
    <span className="stage-caption" aria-hidden="true" data-on={word ? '' : undefined}>
      {words.prev && <span key={`p${words.n}`} className="stage-caption__word stage-caption__word--out">{words.prev}</span>}
      <span key={`c${words.n}`} className="stage-caption__word" data-in={words.n ? '' : undefined}>{words.cur ?? ''}</span>
    </span>
  );
}

const StageMarble = memo(function StageMarble({ active, hidden }: { active: ShotId; hidden: boolean }) {
  const wish = useStage(active);
  const pick = usePick();
  const voice = wish.voice ?? { kind: 'sim' as const };
  const sim = useSimulatedLevel(voice.kind === 'sim' && !hidden);
  const size = wish.size === undefined || wish.size === 'full' ? MARBLE : wish.size;
  return (
    <span className="stage-marble__orb" data-testid="main-marble" data-palette={pick.palette} data-colors={(wish.palette ?? colorsOf(pick.palette, pick.edits)).join(' ')} {...Object.fromEntries(Object.entries(wish.data ?? {}).map(([k, v]) => [`data-${k}`, v]))}>
      <TalkingMarble
        size={size}
        state={wish.state}
        emotion={wish.emotion ?? undefined}
        presets={wish.presets}
        palette={wish.palette ?? colorsOf(pick.palette, pick.edits)}
        halo={wish.halo ?? true}
        audio={voice.kind === 'mic' ? voice.stream : null}
        level={voice.kind === 'mic' ? undefined : voice.kind === 'level' ? voice.level : sim}
        label="Talking Marble"
        paused={hidden}
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
  /** The marble in front on the walk: the one you talk to. */
  front: number;
  /** Which marbles can be seen ('m' and gallery indices): the rest pause. */
  drawing: string;
  /** Clickable only during the gallery's shots. */
  active: boolean;
  onPick: (k: number) => void;
}

/** A marble out of focus is small on screen, so it renders at fewer pixels and is scaled up in the scene (F-54). */
const FAR_SIZE = 140;

/**
 * The gallery's marbles, all showing what you are trying (F-22): the same state, emotion and halo, a simulated voice
 * where the state listens or speaks. While you talk, the marble in front takes the conversation's state, your mic
 * while it listens.
 */
function GalleryOrbs({ gallery, refs }: { gallery: GalleryProps; refs: MutableRefObject<GalleryRefs> }) {
  const trying = useTrying();
  const talk = useTalk();
  const seen = gallery.drawing.split(' ');
  const sim = useSimulatedLevel(seen.some(k => k !== 'm'));
  return (
    <div ref={el => { refs.current.galleryEl = el; }} className="gallery" aria-hidden="true" inert={!gallery.active || undefined}>
      {gallery.marbles.map((m, k) => {
        const p = curvePoint(k);
        const talking = talk.phase !== 'off' && k === gallery.front;
        const state = talking ? talk.phase : trying.state;
        const mic = talking && talk.phase === 'listening' ? talk.stream : null;
        return (
          <Actor key={m.id} x={p.x} z={p.z} size={CURVE_SIZE} actorRef={el => { refs.current.actors[k] = el; }}>
            {/* The fade goes on a flat inner element: opacity on a 3D wrapper would flatten the scene */}
            <button type="button" className="gmarble" tabIndex={-1} aria-pressed={m.chosen} onClick={() => gallery.onPick(k)}>
              <span ref={el => { refs.current.orbs[k] = el; }} className="gmarble__orb" style={{ opacity: 0 }} data-state={state}>
                <TalkingMarble
                  palette={m.colors as string[]} state={state} emotion={talking ? undefined : trying.emotion ?? undefined}
                  audio={mic} level={mic ? undefined : state === 'thinking' ? 0 : sim}
                  size={k === gallery.front && gallery.active ? CURVE_SIZE : FAR_SIZE} decorative paused={!seen.includes(String(k))} halo={trying.halo} className="reflect"
                  style={k === gallery.front && gallery.active ? undefined : { transform: `scale(${CURVE_SIZE / FAR_SIZE})`, transformOrigin: '50% 100%' }}
                />
              </span>
            </button>
            {/* Its palette's name, shown with all six (F-60) */}
            <span className="gmarble__name">{m.label}</span>
          </Actor>
        );
      })}
    </div>
  );
}

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
