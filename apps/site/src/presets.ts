export interface StateInfo { name: string; kind: 'state' | 'emotion'; line: string; pill?: string }

/** Every state and emotion the page shows, with one plain line each. Emotions layer on a state (`emotion` prop). */
export const STATES: StateInfo[] = [
  { name: 'idle', kind: 'state', line: 'At rest. The pigment flows slowly.' },
  { name: 'connecting', kind: 'state', line: 'A slow whirlpool and a steady beat while the session opens.' },
  { name: 'listening', kind: 'state', line: 'Broad, calm veins. The user’s voice swells it.', pill: 'Listening…' },
  { name: 'thinking', kind: 'state', line: 'Fast, fine and turning while the agent works.', pill: 'Thinking…' },
  { name: 'searching', kind: 'state', line: 'The pattern streams out of a magnified centre while the agent looks something up.', pill: 'Searching…' },
  { name: 'speaking', kind: 'state', line: 'The agent’s voice drives the motion and light.', pill: 'Speaking…' },
  { name: 'error', kind: 'state', line: 'Restless, with a hard beat and a short shake.' },
  { name: 'happy', kind: 'emotion', line: 'Quicker and brighter, with a bounce.' },
  { name: 'calm', kind: 'emotion', line: 'Slow, long swells.' },
  { name: 'excited', kind: 'emotion', line: 'Fast, bright and bouncing, with a quick beat.' },
  { name: 'curious', kind: 'emotion', line: 'Tilts side to side and turns, as if looking closer.' },
  { name: 'surprised', kind: 'emotion', line: 'A start: it grows, brightens and jolts once.' },
  { name: 'concerned', kind: 'emotion', line: 'Slower, softer and a little dimmer, rocking gently.' },
  { name: 'sad', kind: 'emotion', line: 'Small, dim and slow.' },
  { name: 'muted', kind: 'emotion', line: 'Nearly still. It ignores audio.' },
];

/** The props that show a state or an emotion: an emotion is shown on `speaking`, so its effect on a voice is visible. */
export function orbFor(info: StateInfo): { state: string; emotion?: string } {
  return info.kind === 'emotion' ? { state: 'speaking', emotion: info.name } : { state: info.name };
}
