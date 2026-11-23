import { forwardRef, memo, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { TalkingMarble, type TalkingMarbleProps } from 'talking-marble';
import { useSimulatedLevel } from '../simulated';
import { CURVE_SIZE, MARBLE, curvePoint } from './camera';

/** A dust texture: a few hundred soft motes at random, drawn once per layer. */
function dustTexture(seed: number, count: number, max: number): string {
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  if (!g) return '';
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) {
    const x = rand() * 1024, y = rand() * 1024, r = 0.4 + rand() * max, a = 0.15 + rand() * 0.55;
    const grad = g.createRadialGradient(x, y, 0, x, y, r * 2.4);
    grad.addColorStop(0, `rgba(255,255,255,${a})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r * 2.4, 0, Math.PI * 2);
    g.fill();
  }
  return `url(${c.toDataURL('image/png')})`;
}

/** Slow dust at three depths; parallax comes for free from the camera moving through them. */
const Dust = memo(function Dust() {
  const layers = useMemo(() => [
    { z: -500, seed: 7, count: 70, max: 1.6, op: 0.5, dur: 90 },
    { z: -2300, seed: 13, count: 160, max: 1.2, op: 0.42, dur: 140 },
    { z: -5200, seed: 29, count: 320, max: 1, op: 0.35, dur: 220 },
  ].map(l => ({ ...l, url: dustTexture(l.seed, l.count, l.max) })), []);
  return (
    <>
      {layers.map(l => (
        <div key={l.z} className="dust" style={{ transform: `translate3d(-1000px, -650px, ${l.z}px) scale(4)`, opacity: l.op }}>
          <div className="dust__drift" style={{ backgroundImage: l.url, animationDuration: `${l.dur}s` }} />
        </div>
      ))}
    </>
  );
});

/** Something standing on the floor at (x, z), always facing the camera. */
export function Actor({ x, z, size, className = '', children, style, actorRef }: { x: number; z: number; size: number; className?: string; children: ReactNode; style?: CSSProperties; actorRef?: (el: HTMLDivElement | null) => void }) {
  return (
    <div
      ref={actorRef}
      className={`actor ${className}`}
      style={{ width: size, height: size, transform: `translate3d(${x - size / 2}px, ${-size}px, ${z}px) var(--bb)`, ...style }}
    >
      {children}
    </div>
  );
}

/** A pool of a marble's own light on the floor. */
function Pool({ x, z, size, strength = 0.32, color, poolRef }: { x: number; z: number; size: number; strength?: number; color?: string; poolRef?: (el: HTMLDivElement | null) => void }) {
  return (
    <div
      ref={poolRef}
      className="pool"
      aria-hidden="true"
      style={{ width: size, height: size, transform: `translate3d(${x - size / 2}px, ${-size / 2}px, ${z}px) rotateX(90deg)`, ['--strength' as string]: `${Math.round(strength * 100)}%`, ...(color ? { ['--marble' as string]: color } : {}) }}
    />
  );
}

export interface Fades { main: HTMLElement | null; mainPool: HTMLElement | null; pools: (HTMLElement | null)[] }

export type LevelSource = { kind: 'none' | 'sim' | 'mic' } | { kind: 'speech'; read: (now: number) => number };

/** The main marble; it alone re-renders while a voice drives its level (up to 30 fps). */
const MainMarble = memo(function MainMarble({ source, ...props }: Omit<TalkingMarbleProps, 'size' | 'level'> & { source: LevelSource }) {
  const sim = useSimulatedLevel(source.kind === 'sim');
  const [speech, setSpeech] = useState(0);
  useEffect(() => {
    if (source.kind !== 'speech') { setSpeech(0); return; }
    let frame = 0, last = 0;
    const tick = (now: number) => {
      if (now - last >= 33) { last = now; setSpeech(source.read(now)); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [source]);
  const level = source.kind === 'mic' ? undefined : source.kind === 'speech' ? speech : source.kind === 'sim' ? sim : 0;
  return (
    <span className="hero-marble__orb" data-testid="main-marble" data-level={level === undefined ? '' : level.toFixed(2)} data-voice={source.kind}>
      <TalkingMarble {...props} level={level} className="reflect" />
    </span>
  );
});

export interface CurveMarble { id: string; label: string; colors: readonly string[]; chosen: boolean }

export interface SceneProps {
  marble: Omit<TalkingMarbleProps, 'size' | 'level'> & { source: LevelSource };
  light: string;
  /** The palette marbles along the curve; live only while the curve is on screen. */
  curve: CurveMarble[];
  curveLive: boolean;
  curveFront: number;
  curveActive: boolean;
  curveLabel: string;
  curveRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  /** Elements the camera loop fades: the main marble and its pool, and the curve's pools. */
  fades: React.MutableRefObject<Fades>;
  onCurvePick: (index: number) => void;
  onCurveKey: (e: React.KeyboardEvent) => void;
}

/** The one continuous scene: black stage, texture, floor, horizon, dust, the marble and its sisters. */
export const Scene = forwardRef<HTMLDivElement, SceneProps>(function Scene(
  { marble, light, curve, curveLive, curveFront, curveActive, curveLabel, curveRefs, fades, onCurvePick, onCurveKey }, world,
) {
  useEffect(() => { document.documentElement.style.setProperty('--marble', light); }, [light]);
  return (
    <div className="viewport">
      {/* Texture: a slow, cloudy light far behind everything; grain sits on top */}
      <div className="nebula" aria-hidden="true" />
      <div className="world" ref={world}>
        <div className="horizon" aria-hidden="true" />
        <div className="floor" aria-hidden="true" />
        <Dust />
        <Pool x={0} z={0} size={MARBLE * 4.2} strength={0.32} poolRef={el => { fades.current.mainPool = el; }} />
        {curve.map((m, k) => {
          const p = curvePoint(k);
          return <Pool key={m.id} x={p.x} z={p.z} size={CURVE_SIZE * 3} strength={0.22} color={m.colors[1]} poolRef={el => { fades.current.pools[k] = el; }} />;
        })}

        <Actor x={0} z={0} size={MARBLE} className="hero-marble" actorRef={el => { fades.current.main = el; }}>
          <div className="spark" aria-hidden="true" />
          <MainMarble {...marble} />
        </Actor>

        <div className="curve" role="group" aria-label={curveLabel} onKeyDown={onCurveKey} inert={!curveActive || undefined} aria-hidden={!curveActive || undefined}>
          {curve.map((m, k) => {
            const p = curvePoint(k);
            // The fade goes on the flat inner element: opacity on a 3D wrapper would flatten the scene.
            return (
              <Actor key={m.id} x={p.x} z={p.z} size={CURVE_SIZE}>
                <button
                  type="button"
                  className="cmarble"
                  tabIndex={k === curveFront ? 0 : -1}
                  aria-label={m.label}
                  aria-pressed={m.chosen}
                  onClick={() => onCurvePick(k)}
                >
                  <span ref={el => { curveRefs.current[k] = el; }} className="cmarble__orb reflect" style={{ opacity: 0 }}>
                    {curveLive && <TalkingMarble palette={m.colors} state="idle" />}
                  </span>
                  <span className="cmarble__name" aria-hidden="true">{m.label}</span>
                </button>
              </Actor>
            );
          })}
        </div>
      </div>
      <div className="vignette" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
    </div>
  );
});
