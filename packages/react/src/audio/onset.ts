/**
 * Onset ("hit") detection on the smoothed level, for effects that start on each syllable (e.g. a ripple ring).
 * A hit is when the level runs ahead of its envelope by `rise`; the next hit needs the level to fall back
 * near the envelope (under rise / 2) first, and at least `refractory` seconds.
 * Framework-free and stateful: one detector per orb, fed once per frame.
 */
export interface OnsetOptions {
  /** How far (0–1) the level must rise above its envelope. Default 0.12. */
  rise?: number;
  /** Seconds after a hit during which no new hit fires. Default 0.15. */
  refractory?: number;
  /** Rate (1/s) of the envelope the level is compared with; faster than this the level counts as a hit. Default 12. */
  envelopeRate?: number;
}

/** Returns a per-frame function: `(level, dt) => strength`, 0 for no hit, else how far it rose (0–1). */
export function createOnsetDetector({ rise = 0.12, refractory = 0.15, envelopeRate = 12 }: OnsetOptions = {}) {
  let envelope = 0;
  let quiet = 0;
  let armed = true;
  return (level: number, dt: number): number => {
    const above = level - envelope;
    envelope += (level - envelope) * (1 - Math.exp(-dt * envelopeRate));
    quiet = Math.max(0, quiet - dt);
    if (above < rise / 2) armed = true;
    if (!armed || quiet > 0 || above < rise) return 0;
    armed = false;
    quiet = refractory;
    return Math.min(1, above);
  };
}
