// Adaptive resolution (packages/core/spec.md › Rendering): under sustained load the shared loop lowers every
// marble's drawing resolution in steps down to half, and restores it when there is headroom. Layout and CSS size
// never change, only the canvases' backing size. Framework-free; the decision is the pure `nextScale`.

/** The drawing-resolution steps, full first. */
export const SCALES: readonly number[] = [1, 0.8, 0.65, 0.5];

/** Thresholds, in ms of the loop's drawn-frame intervals (its target is 33.3 ms, 30 frames a second). */
export const ADAPT = {
  /** Falling behind: judged over the last 45 drawn frames (about 1.5 s). */
  downFrames: 45,
  /** …when their median interval is over 45 ms, */
  slow: 45,
  /** …or over 20 % of them are long (over 60 ms), */
  long: 60,
  longShare: 0.2,
  /** …or the draw pass itself takes over 25 ms (median). */
  slowWork: 25,
  /**
   * Headroom: over the last 8 s of drawn frames, median interval under 42 ms (the 30 fps loop lands on 40 ms
   * at 75 and 100 Hz and 36.4 ms at 165 Hz, so 36 would never pass there), at most 1 % long frames, and a
   * draw pass under 12 ms (median).
   */
  upSpan: 8000,
  fast: 42,
  upLongShare: 0.01,
  fastWork: 12,
  /** Never two changes within 2 s. */
  minGap: 2000,
  /** A step up undone within 10 s doubles the headroom needed next time (up to 64 s), so it never oscillates. */
  bounce: 10000,
  maxUpSpan: 64000,
  /** Gaps over 250 ms are pauses (a hidden tab, a stopped loop), not load. */
  ignore: 250,
  /** Samples kept: enough for the longest headroom window (64 s) at 30 frames a second. */
  history: 2000,
} as const;

/** Recent drawn frames, oldest first: the interval since the previous drawn frame and the draw pass's CPU time (ms). */
export interface Pace { intervals: number[]; work: number[] }
/** The current scale, when it last changed, whether that change was a step up, and the headroom window needed. */
export interface Adaptive { scale: number; changedAt: number; rose: boolean; upSpan: number }

export const createPace = (): Pace => ({ intervals: [], work: [] });
export const initialAdaptive = (now = -Infinity): Adaptive => ({ scale: 1, changedAt: now, rose: false, upSpan: ADAPT.upSpan });

/** Adds one drawn frame; ignores pauses and nonsense, and keeps the last `ADAPT.history`. */
export function recordFrame(pace: Pace, interval: number, work: number): void {
  if (!(interval > 0) || interval > ADAPT.ignore) return;
  pace.intervals.push(interval);
  pace.work.push(work > 0 ? work : 0);
  if (pace.intervals.length > ADAPT.history) { pace.intervals.shift(); pace.work.shift(); }
}

const scratch: number[] = [];
function median(values: readonly number[], from: number): number {
  scratch.length = 0;
  for (let i = from; i < values.length; i++) scratch.push(values[i]!);
  scratch.sort((a, b) => a - b);
  return scratch[scratch.length >> 1] ?? 0;
}
function share(values: readonly number[], from: number, over: number): number {
  let n = 0;
  for (let i = from; i < values.length; i++) if (values[i]! > over) n++;
  return n / Math.max(1, values.length - from);
}
const step = (scale: number, by: number) => {
  const i = SCALES.indexOf(scale);
  return SCALES[Math.min(SCALES.length - 1, Math.max(0, (i < 0 ? 0 : i) + by))]!;
};

/**
 * The next resolution state from the recent drawn frames (`pace`, measured since the last change). Returns
 * `state` itself when nothing changes. One step down (1 → 0.8 → 0.65 → 0.5) when the loop is clearly behind
 * over its last 45 frames; one step up after `upSpan` ms of clear headroom; never twice within 2 s; a step up
 * that is undone within 10 s doubles the headroom needed next time.
 */
export function nextScale(state: Adaptive, pace: Pace, now: number): Adaptive {
  if (now - state.changedAt < ADAPT.minGap) return state;
  const { intervals, work } = pace;
  const n = intervals.length;
  const min = SCALES[SCALES.length - 1]!;
  if (state.scale > min && n >= ADAPT.downFrames) {
    const from = n - ADAPT.downFrames;
    if (median(intervals, from) > ADAPT.slow || share(intervals, from, ADAPT.long) > ADAPT.longShare || median(work, from) > ADAPT.slowWork) {
      const bounced = state.rose && now - state.changedAt < ADAPT.bounce;
      return { scale: step(state.scale, 1), changedAt: now, rose: false, upSpan: bounced ? Math.min(state.upSpan * 2, ADAPT.maxUpSpan) : state.upSpan };
    }
  }
  if (state.scale < 1) {
    // The newest frames covering `upSpan` ms; not enough history yet means no step up.
    let span = 0, from = n;
    while (from > 0 && span < state.upSpan) span += intervals[--from]!;
    if (span < state.upSpan) return state;
    if (median(intervals, from) < ADAPT.fast && share(intervals, from, ADAPT.long) <= ADAPT.upLongShare && median(work, from) < ADAPT.fastWork) {
      return { scale: step(state.scale, -1), changedAt: now, rose: true, upSpan: state.upSpan };
    }
  }
  return state;
}

// The page's one state, fed by the shared loop (render/orb.ts).
let current = initialAdaptive();
let started = false;
const pace = createPace();
let sinceCheck = 0;

/** The drawing resolution now, in [0.5, 1]: `backingSize` multiplies by it. */
export function renderScale(): number { return current.scale; }

/**
 * Set `window.__talkingMarbleAdaptive = false` (before or after the marbles load) to pin full resolution, e.g. in
 * tests that check exact canvas sizes on a slow software GPU. Read on every check, so it takes effect within ~0.5 s.
 */
const pinned = () => (globalThis as { __talkingMarbleAdaptive?: unknown }).__talkingMarbleAdaptive === false;

/**
 * The shared loop reports each drawn frame: its interval since the previous drawn frame and the draw pass's CPU
 * time (ms). Checks every 15 frames (about 0.5 s). Returns true when the scale changed, so marbles re-size.
 */
export function observeFrame(now: number, interval: number, work: number): boolean {
  if (pinned()) {
    if (current.scale === 1) return false;
    current = initialAdaptive(now); pace.intervals.length = pace.work.length = 0;
    return true;
  }
  // The first frame starts the clock: nothing changes in the first 2 s (page load, shader compile).
  if (!started) { started = true; current = initialAdaptive(now); }
  recordFrame(pace, interval, work);
  if (++sinceCheck < 15) return false;
  sinceCheck = 0;
  const next = nextScale(current, pace, now);
  if (next === current) return false;
  current = next;
  // Each scale is judged on its own frames.
  pace.intervals.length = pace.work.length = 0;
  return true;
}
