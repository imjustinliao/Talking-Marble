import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { connectAudio, type AudioTap, type OrbAudioSource } from './audio/source';
import { resolvePalette, type OrbPalette } from './colors';
import { fallbackBackground } from './render/css';
import { orbLabel } from './label';
import { createOrb, type OrbController } from './render/orb';
import { isKnownEmotion, isKnownState, resolveState, type OrbEmotion, type OrbPreset, type OrbState } from './state';

export type { OrbAudioSource };

export interface TalkingMarbleProps {
  /** A built-in state or one of your presets. Default `idle`. Unknown names show `idle`. */
  state?: OrbState;
  /** An emotion layered on the state: `muted`, `happy`, `calm` or one of your presets. Optional. */
  emotion?: OrbEmotion | null;
  /**
   * Audio to react to, in states that listen (`listening`, `speaking`, or any preset with `reactivity`).
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
  /** Your own states and emotions, merged over the built-ins by name. */
  presets?: Record<string, OrbPreset>;
  /** Who the orb is, for assistive technology: it reads "Assistant, speaking". Default "Assistant". */
  label?: string;
  /** Hide the orb from assistive technology (`aria-hidden`), when its state is shown elsewhere. */
  decorative?: boolean;
  /** The soft light behind the orb. Default true. It never changes layout. */
  halo?: boolean;
  /** Stop animating without unmounting. */
  paused?: boolean;
  /** Replaces the whole accessible name (`label` and the state). */
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
  state = 'idle', emotion, audio, level, palette, size, presets, label, decorative = false, halo = true, paused = false,
  'aria-label': ariaLabel, className, style,
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
  // A preset's own colors win over the palette (the only way a preset changes color).
  const shown = resolveState(state, presets, emotion).colors ?? colors;

  useEffect(() => {
    const orb = createOrb(
      { host: innerRef.current!, canvas: canvasRef.current!, halo: haloRef.current, fallback: fallbackRef.current },
      { state, emotion, colors, presets, onReady: setReady },
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
    if (emotion && !isKnownEmotion(emotion, presets) && !warned.has(`emotion:${emotion}`) && isDev()) {
      warned.add(`emotion:${emotion}`);
      console.warn(`[talking-marble] Unknown emotion "${emotion}", ignored. Add it to \`presets\` to define it.`);
    }
    orbRef.current?.setState(state, presets, emotion);
  }, [state, presets, emotion]);

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
    width: size ?? '100%', maxWidth: '100%',
    ...style, height: 'auto',
  };
  const a11y = decorative
    ? { 'aria-hidden': true }
    : { role: 'img', 'aria-label': ariaLabel ?? orbLabel(label, state, emotion, presets) };
  return (
    <span
      className={className}
      style={box}
      data-talking-marble=""
      data-state={state}
      {...(emotion ? { 'data-emotion': emotion } : {})}
      data-ready={String(ready)}
      {...a11y}
    >
      {/* The whole-marble movement (bounce, sway, jelly, shake, size) goes on this inner layer, so the outer
          element's layout and the user's style never move. */}
      <span ref={innerRef} style={{ position: 'absolute', inset: 0, display: 'block' }}>
        <span
          ref={haloRef}
          data-halo=""
          style={{ position: 'absolute', inset: '1%', borderRadius: '50%', pointerEvents: 'none', display: halo ? 'block' : 'none' }}
        />
        <span
          ref={fallbackRef}
          data-fallback=""
          style={{
            position: 'absolute', inset: '0.75%', borderRadius: '50%', display: 'block',
            background: fallbackBackground(shown), visibility: ready ? 'hidden' : 'visible',
          }}
        />
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', opacity: ready ? 1 : 0 }} />
      </span>
    </span>
  );
}
