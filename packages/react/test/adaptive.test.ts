import { describe, expect, it } from 'vitest';
import { ADAPT, createPace, initialAdaptive, nextScale, recordFrame, SCALES, type Adaptive, type Pace } from '../src/render/adaptive';
import { backingSize } from '../src/render/shared';

/** A pace of `count` drawn frames at `interval` ms each (and `work` ms of draw pass). */
function paced(count: number, interval: number | ((i: number) => number), work = 2): Pace {
  const pace = createPace();
  for (let i = 0; i < count; i++) recordFrame(pace, typeof interval === 'number' ? interval : interval(i), work);
  return pace;
}
const at = (scale: number, changedAt = 0, extra: Partial<Adaptive> = {}): Adaptive => ({ ...initialAdaptive(changedAt), scale, ...extra });

describe('adaptive resolution (packages/core/spec.md › Rendering)', () => {
  it('stays at full resolution while the loop keeps its 30 fps', () => {
    const state = at(1);
    expect(nextScale(state, paced(300, 33.3), 20000)).toBe(state);
    // 40 ms is the 30 fps loop on a 75 or 100 Hz display: not load.
    expect(nextScale(state, paced(300, 40), 20000)).toBe(state);
  });

  it('steps down one notch under sustained slow frames: median over 45 ms', () => {
    const next = nextScale(at(1), paced(45, 50), 5000);
    expect(next).toMatchObject({ scale: 0.8, changedAt: 5000, rose: false });
    expect(nextScale(at(0.8), paced(45, 50), 5000).scale).toBe(0.65);
    expect(nextScale(at(0.65), paced(45, 50), 5000).scale).toBe(0.5);
  });

  it('steps down when over 20 % of frames are long (over 60 ms), even with a fine median', () => {
    expect(nextScale(at(1), paced(45, i => (i % 4 === 0 ? 70 : 33)), 5000).scale).toBe(0.8);
    // 1 in 5 (20 %) is not over the line.
    expect(nextScale(at(1), paced(45, i => (i % 5 === 0 ? 70 : 33)), 5000).scale).toBe(1);
  });

  it('steps down when the draw pass itself is slow', () => {
    expect(nextScale(at(1), paced(45, 34, 28), 5000).scale).toBe(0.8);
  });

  it('does not step down on a single spike or too few frames', () => {
    expect(nextScale(at(1), paced(45, i => (i === 20 ? 240 : 33)), 5000).scale).toBe(1);
    expect(nextScale(at(1), paced(44, 80), 5000).scale).toBe(1);
    // A slow start that has recovered: only the last 45 frames count.
    expect(nextScale(at(1), paced(120, i => (i < 75 ? 80 : 33)), 5000).scale).toBe(1);
  });

  it('ignores pauses: gaps over 250 ms (a hidden tab, a stopped loop) and nonsense', () => {
    const pace = paced(45, 33);
    for (const gap of [300, 5000, 0, -5, Number.NaN, Infinity]) recordFrame(pace, gap, 1);
    expect(pace.intervals).toHaveLength(45);
    expect(nextScale(at(1), pace, 5000).scale).toBe(1);
  });

  it('never goes under half or over full resolution', () => {
    const half = at(0.5);
    expect(nextScale(half, paced(300, 120), 60000)).toBe(half);
    const full = at(1);
    expect(nextScale(full, paced(300, 20), 60000)).toBe(full);
    expect(Math.min(...SCALES)).toBe(0.5);
    expect(Math.max(...SCALES)).toBe(1);
  });

  it('never changes twice within 2 s', () => {
    const state = at(0.8, 10000);
    expect(nextScale(state, paced(45, 90), 10000 + ADAPT.minGap - 1)).toBe(state);
    expect(nextScale(state, paced(45, 90), 10000 + ADAPT.minGap).scale).toBe(0.65);
  });

  it('steps up only after 8 s of clear headroom', () => {
    // 7.9 s of fast frames is not enough.
    expect(nextScale(at(0.65), paced(237, 33.3), 20000).scale).toBe(0.65);
    expect(nextScale(at(0.65), paced(241, 33.3), 20000)).toMatchObject({ scale: 0.8, rose: true, changedAt: 20000 });
    expect(nextScale(at(0.8), paced(241, 33.3), 20000).scale).toBe(1);
  });

  it('does not step up between the thresholds, with long frames, or with a busy draw pass (hysteresis)', () => {
    // Median 43 ms: not slow enough to step down, not fast enough to step up.
    const between = at(0.8);
    expect(nextScale(between, paced(300, 43), 20000)).toBe(between);
    // 4 long frames in 8 s (over 1 %).
    expect(nextScale(at(0.8), paced(300, i => (i % 60 === 0 ? 70 : 33)), 20000).scale).toBe(0.8);
    expect(nextScale(at(0.8), paced(300, 33, 15), 20000).scale).toBe(0.8);
  });

  it('a step up undone within 10 s doubles the headroom needed next time, so it never oscillates', () => {
    let state = nextScale(at(0.8, 0), paced(241, 33.3), 9000);
    expect(state).toMatchObject({ scale: 1, rose: true });
    // Full resolution is too much again: down within 10 s.
    state = nextScale(state, paced(45, 50), 12000);
    expect(state).toMatchObject({ scale: 0.8, upSpan: 2 * ADAPT.upSpan });
    // 8 s of headroom no longer brings it back; 16 s does.
    expect(nextScale(state, paced(241, 33.3), 22000).scale).toBe(0.8);
    expect(nextScale(state, paced(300, 33.3), 22000).scale).toBe(0.8);
    expect(nextScale(state, paced(481, 33.3), 30000).scale).toBe(1);
    // An ordinary step down (not right after a step up) keeps the window; it is capped at 64 s.
    expect(nextScale(at(1, 0, { upSpan: ADAPT.upSpan }), paced(45, 50), 30000).upSpan).toBe(ADAPT.upSpan);
    expect(nextScale(at(1, 0, { rose: true, upSpan: ADAPT.maxUpSpan }), paced(45, 50), 5000).upSpan).toBe(ADAPT.maxUpSpan);
  });

  it('keeps a bounded history', () => {
    const pace = paced(ADAPT.history + 500, 33);
    expect(pace.intervals).toHaveLength(ADAPT.history);
    expect(pace.work).toHaveLength(ADAPT.history);
  });
});

describe('backing size at a lowered resolution', () => {
  it('multiplies the device size, floor included, and keeps the CSS size', () => {
    expect(backingSize(400, 2, 1)).toBe(600);
    expect(backingSize(400, 2, 0.8)).toBe(480);
    expect(backingSize(400, 2, 0.5)).toBe(300);
    // The 320 px floor scales too.
    expect(backingSize(200, 2, 0.5)).toBe(160);
  });
  it('leaves small marbles alone (96 device px or less) and never takes a larger one under 96 px', () => {
    expect(backingSize(48, 2, 0.5)).toBe(96);
    expect(backingSize(20, 2, 0.5)).toBe(40);
    expect(backingSize(120, 1, 0.5)).toBe(96);
    expect(backingSize(0.2, 1, 0.5)).toBe(1);
  });
  it('clamps the scale to 0.5–1', () => {
    expect(backingSize(400, 1, 0.1)).toBe(200);
    expect(backingSize(400, 1, 3)).toBe(400);
    expect(backingSize(400, 1, Number.NaN)).toBe(400);
  });
});
