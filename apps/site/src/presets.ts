export interface StateInfo { name: string; kind: 'state' | 'emotion'; line: string; pill?: string }

/** Every state and emotion the page shows, with one plain line each. Emotions layer on a state (`emotion` prop). */
export const STATES: StateInfo[] = [
  { name: 'idle', kind: 'state', line: 'At rest. The pigment flows slowly.' },
  { name: 'connecting', kind: 'state', line: 'A slow whirlpool and a steady beat while the session opens.' },
  { name: 'listening', kind: 'state', line: 'Broad, calm veins. The user’s voice swells it.', pill: 'Listening…' },
  { name: 'thinking', kind: 'state', line: 'Fast, fine and turning while the agent works.', pill: 'Thinking…' },
  { name: 'speaking', kind: 'state', line: 'The agent’s voice drives the motion and light.', pill: 'Speaking…' },
  { name: 'error', kind: 'state', line: 'Restless, with a hard beat and a short shake.' },
  { name: 'happy', kind: 'emotion', line: 'Quicker and brighter, with a bounce.' },
  { name: 'calm', kind: 'emotion', line: 'Slow, long swells.' },
  { name: 'muted', kind: 'emotion', line: 'Nearly still. It ignores audio.' },
];

/** The props that show a state or an emotion: an emotion is shown on `speaking`, so its effect on a voice is visible. */
export function orbFor(info: StateInfo): { state: string; emotion?: string } {
  return info.kind === 'emotion' ? { state: 'speaking', emotion: info.name } : { state: info.name };
}
