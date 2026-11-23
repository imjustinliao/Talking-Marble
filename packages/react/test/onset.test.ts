import { describe, expect, it } from 'vitest';
import { createOnsetDetector } from '../src/audio/onset';

const FRAME = 1 / 30;
/** Feeds a level sequence and returns the frames (indices) that hit. */
function hits(levels: number[], options = {}) {
  const detect = createOnsetDetector(options);
  return levels.flatMap((level, i) => (detect(level, FRAME) > 0 ? [i] : []));
}

describe('createOnsetDetector', () => {
  it('stays quiet for silence and for a steady level', () => {
    expect(hits(Array(60).fill(0))).toEqual([]);
    // A steady level hits once when it first appears, then never again.
    expect(hits(Array(60).fill(0.6))).toEqual([0]);
  });
  it('fires on each sharp rise, like syllables', () => {
    const syllable = [0.7, 0.7, 0.6, 0.4, 0.2, 0.1, 0.05, 0, 0, 0, 0, 0];
    expect(hits([...syllable, ...syllable, ...syllable])).toEqual([0, 12, 24]);
  });
  it('ignores slow swells', () => {
    expect(hits(Array.from({ length: 90 }, (_, i) => i / 90))).toEqual([]);
  });
  it('waits out the refractory time', () => {
    const flicker = [0.6, 0, 0.6, 0, 0.6, 0, 0.6, 0];
    expect(hits(flicker, { refractory: 0.15 })).toEqual([0, 6]);
  });
  it('fires on a step through the 10/s level smoothing', () => {
    // The orb's smoothed level after the raw level jumps from 0 to 1.
    const smoothed = Array.from({ length: 30 }, (_, i) => 1 - Math.exp(-10 * FRAME * (i + 1)));
    expect(hits([0, 0, ...smoothed]).length).toBe(1);
  });
  it('reports how far the level rose', () => {
    const detect = createOnsetDetector();
    expect(detect(0.5, FRAME)).toBeCloseTo(0.5);
  });
});
