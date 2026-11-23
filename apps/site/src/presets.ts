import { calm, happy, muted } from 'talking-marble';

/** The example emotion presets, passed with `presets` (until the package's `emotion` prop lands). */
export const PRESETS = { muted, happy, calm };

export interface StateInfo { name: string; kind: 'state' | 'emotion'; line: string; pill?: string }

/** Every state and emotion the page shows, with one plain line each. */
export const STATES: StateInfo[] = [
  { name: 'idle', kind: 'state', line: 'At rest. The colors flow slowly.' },
  { name: 'connecting', kind: 'state', line: 'Dimmed and breathing while the session opens.' },
  { name: 'listening', kind: 'state', line: 'Brighter. The user’s voice swells it gently.', pill: 'Listening…' },
  { name: 'thinking', kind: 'state', line: 'Faster and deeper while the agent works.', pill: 'Thinking…' },
  { name: 'speaking', kind: 'state', line: 'The agent’s voice drives the motion and light.', pill: 'Speaking…' },
  { name: 'error', kind: 'state', line: 'Slow and dim after something went wrong.' },
  { name: 'happy', kind: 'emotion', line: 'Warmer and a little faster.' },
  { name: 'calm', kind: 'emotion', line: 'Slower and softer.' },
  { name: 'muted', kind: 'emotion', line: 'Quiet. It ignores audio.' },
];
