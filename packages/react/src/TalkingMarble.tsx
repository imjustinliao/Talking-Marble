import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { connectAudio, type AudioTap, type OrbAudioSource } from './audio/source';
import { resolvePalette, type OrbPalette } from './colors';
import { fallbackBackground } from './render/css';
import { createOrb, type OrbController } from './render/orb';
import { isKnownState, type OrbPreset, type OrbState } from './state';

export type { OrbAudioSource };

export interface TalkingMarbleProps {
  /** A built-in state or one of your presets. Default `idle`. Unknown names show `idle`. */
  state?: OrbState;
  /**
   * Audio to react to, in states that listen (`listening`, `speaking`, or any preset with `levelResponse`).
   * A media element keeps playing through the speakers; one element can feed only one orb at a time.
   * The orb never stops your stream's tracks.
   */
  audio?: OrbAudioSource | null;
  /** Audio level 0–1; overrides `audio` when given. */
  level?: number;
  /** A palette name, or four colors (ground, then three pigments). Default `pearl`. */
  palette?: OrbPalette;
  /** Width and height in CSS pixels. Default: fills its container's width (square). */
  size?: number;
  /** Your own states, merged over the built-ins by name. */
  presets?: Record<string, OrbPreset>;
  /** The soft light behind the orb. Default true. It never changes layout. */
  halo?: boolean;
  /** Stop animating without unmounting. */
  paused?: boolean;
  /** Makes the orb an image with this label; otherwise it is decorative. */
  'aria-label'?: string;
  className?: string;
  style?: CSSProperties;
}

const warned = new Set<string>();
/** Development builds only: bundlers replace process.env.NODE_ENV; where nothing defines it, stay quiet. */
function isDev(): boolean {
  try {
    return process!.env!.NODE_ENV !== 'production';
  } catch {
    return false;
  }
}

/** An audio-reactive orb for voice AI apps. */
export function TalkingMarble({
  state = 'idle', audio, level, palette, size, presets, halo = true, paused = false, 'aria-label': label, className, style,
}: TalkingMarbleProps) {
  const innerRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const haloRef = useRef<HTMLSpanElement>(null);
  const fallbackRef = useRef<HTMLSpanElement>(null);
  const orbRef = useRef<OrbController | null>(null);
  const tapRef = useRef<AudioTap | null>(null);
  const levelRef = useRef(level);
  levelRef.current = level;
  const [ready, setReady] = useState(false);

  const colors = resolvePalette(palette);
  const colorKey = colors.join();

  useEffect(() => {
    const orb = createOrb(
      { host: innerRef.current!, canvas: canvasRef.current!, halo: haloRef.current, fallback: fallbackRef.current },
      { state, colors, presets, onReady: setReady },
    );
    // A given `level` wins over `audio`.
    orb.setLevelSource(() => levelRef.current ?? tapRef.current?.read() ?? 0);
    orbRef.current = orb;
    setReady(orb.ready);
    return () => { orb.dispose(); orbRef.current = null; };
    // Created once; the effects below keep it in sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isKnownState(state, presets) && !warned.has(state) && isDev()) {
      warned.add(state);
      console.warn(`[talking-marble] Unknown state "${state}", showing "idle". Add it to \`presets\` to define it.`);
    }
    orbRef.current?.setState(state, presets);
  }, [state, presets]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { orbRef.current?.setColors(colors); }, [colorKey]);
  useEffect(() => { orbRef.current?.setPaused(paused); }, [paused]);

  useEffect(() => {
    if (!audio) return;
    const tap = connectAudio(audio);
    tapRef.current = tap;
    return () => { tap?.dispose(); if (tapRef.current === tap) tapRef.current = null; };
  }, [audio]);

  // Width sets the size; aspect-ratio keeps it square even when max-width shrinks it.
  const box: CSSProperties = {
    position: 'relative', display: 'inline-block', verticalAlign: 'middle', aspectRatio: '1',
    width: size ?? '100%', maxWidth: '100%', ...style, height: 'auto',
  };
  return (
    <span
      className={className}
      style={box}
      data-talking-marble=""
      data-state={state}
      data-ready={String(ready)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <span
        ref={haloRef}
        data-halo=""
        style={{ position: 'absolute', inset: '1%', borderRadius: '50%', pointerEvents: 'none', display: halo ? 'block' : 'none' }}
      />
      {/* The orb scales this inner layer for `breath`, so the outer element's own style stays the user's. */}
      <span ref={innerRef} style={{ position: 'absolute', inset: 0, display: 'block' }}>
        <span
          ref={fallbackRef}
          data-fallback=""
          style={{
            position: 'absolute', inset: '0.75%', borderRadius: '50%', display: 'block',
            background: fallbackBackground(colors), visibility: ready ? 'hidden' : 'visible',
          }}
        />
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', opacity: ready ? 1 : 0 }} />
      </span>
    </span>
  );
}
