import { useEffect, useState } from 'react';

/** A speech-like level (0–1) at time `t` seconds: syllables inside phrases, with pauses between. */
export function voiceLevel(t: number): number {
  const syllable = Math.max(0, Math.sin(t * 7.3) * 0.6 + Math.sin(t * 3.1) * 0.4);
  const phrase = Math.sin(t * 0.9) > -0.3 ? 1 : 0;
  return Math.min(1, syllable * phrase * (0.7 + 0.3 * Math.sin(t * 13.7)));
}

/** A simulated voice level, updated at up to 30 fps while `active`; 0 otherwise. */
export function useSimulatedLevel(active: boolean): number {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!active) { setLevel(0); return; }
    let id = 0, last = 0;
    const tick = (now: number) => {
      if (now - last >= 33) { last = now; setLevel(voiceLevel(now / 1000)); }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [active]);
  return level;
}
