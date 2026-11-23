import { describe, expect, it } from 'vitest';
import { orbLabel } from '../src/label';

describe('orbLabel', () => {
  it('reads "Assistant, <state>" by default', () => {
    expect(orbLabel(undefined, 'speaking', undefined)).toBe('Assistant, speaking');
    expect(orbLabel('  ', 'idle', null)).toBe('Assistant, idle');
  });
  it('uses the given name', () => {
    expect(orbLabel('Nova', 'listening', undefined)).toBe('Nova, listening');
  });
  it('adds a known emotion', () => {
    expect(orbLabel('Nova', 'speaking', 'happy')).toBe('Nova, speaking, happy');
    expect(orbLabel('Nova', 'speaking', 'nope')).toBe('Nova, speaking');
  });
  it('reads custom states and emotions by their preset label, else their name', () => {
    const presets = { wow: { bounce: 1, label: 'celebrating' }, hmm: { speed: 0.5 }, giddy: { label: 'giddy with joy' } };
    expect(orbLabel(undefined, 'wow', undefined, presets)).toBe('Assistant, celebrating');
    expect(orbLabel(undefined, 'hmm', 'giddy', presets)).toBe('Assistant, hmm, giddy with joy');
  });
  it('reads unknown states as idle, which is what the orb shows', () => {
    expect(orbLabel(undefined, 'dancing', undefined)).toBe('Assistant, idle');
  });
});
