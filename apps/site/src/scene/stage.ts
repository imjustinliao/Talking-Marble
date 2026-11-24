import { useEffect, useSyncExternalStore } from 'react';
import type { OrbPreset } from 'talking-marble';
import type { ShotId } from './camera';

/**
 * What the one marble on the stage shows. Each shot says what it wants (Create your own its colours, its state);
 * the marble shows the live shot's wishes. Its palette is the visitor's pick
 * (`pick.ts`), the same in every shot, so every move starts on the marble in its current colours (F-8).
 */
export interface StageWish {
  state: string;
  emotion?: string | null;
  presets?: Record<string, OrbPreset>;
  size?: number | 'full';
  /** Who the marble is, for screen readers (Create: the name you gave it). */
  label?: string;
  /** The halo: on, off, or a strength (0 to 1.5, 1 the standard). */
  halo?: boolean | number;
  /** Its colours, when the shot shows a marble of its own (Create your own); otherwise the pick's. */
  palette?: string[];
  /** Where its level comes from: a simulated voice, a fixed level, or a microphone stream. */
  voice?: { kind: 'sim' } | { kind: 'level'; level: number } | { kind: 'mic'; stream: MediaStream | null };
  /** A short word shown under the marble (the intro's demo: the state it is in now, F-66). */
  caption?: string;
  /** Extra attributes on the marble's wrapper (the playground's readable settings). */
  data?: Record<string, string>;
}

const DEFAULT: StageWish = { state: 'speaking', voice: { kind: 'sim' } };
let wishes: Partial<Record<ShotId, StageWish>> = {};
let version = 0;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach(l => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

/** A shot's wish for the marble while it is live (cleared when the shot unmounts). */
export function useStageWish(id: ShotId, wish: StageWish) {
  const key = JSON.stringify({ ...wish, voice: wish.voice?.kind === 'mic' ? 'mic' : wish.voice });
  const stream = wish.voice?.kind === 'mic' ? wish.voice.stream : null;
  useEffect(() => {
    wishes = { ...wishes, [id]: wish };
    emit();
  }, [id, key, stream]); // the wish by value: a new object each render is the same wish
  useEffect(() => () => { const { [id]: _, ...rest } = wishes; wishes = rest; emit(); }, [id]);
}

/** What the marble shows for a shot, outside React (the ink floor reads it each frame). */
export const getStage = (id: ShotId): StageWish => ({ ...DEFAULT, ...wishes[id] });

/** What the marble shows for the live shot. */
export function useStage(active: ShotId): StageWish {
  useSyncExternalStore(subscribe, () => version);
  return { ...DEFAULT, ...wishes[active] };
}
