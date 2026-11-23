import { Code } from './Code';
import { Recipes } from './Recipes';

const QUICK_START = `import { TalkingMarble, type OrbState } from 'talking-marble';

// state: 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error'
// stream: the agent's audio, if you have it
export function Assistant({ state, stream }: { state: OrbState; stream?: MediaStream | null }) {
  return <TalkingMarble state={state} audio={stream} size={160} />;
}`;

const AUDIO_SOURCES = `// A microphone or a remote WebRTC stream
<TalkingMarble state="listening" audio={mediaStream} />

// An <audio> or <video> element (it keeps playing through the speakers)
<TalkingMarble state="speaking" audio={audioElementRef.current} />

// A Web Audio node you already have
<TalkingMarble state="speaking" audio={gainNode} />

// A level you computed yourself, 0–1 (overrides audio)
<TalkingMarble state="speaking" level={volume} />`;

const CUSTOM_PRESETS = `import { TalkingMarble, muted, type OrbPreset } from 'talking-marble';

// Any subset of the parameters; the rest come from the resting state.
const celebrating: OrbPreset = {
  flow: 1.5, energy: 0.8, brightness: 1.15,
  tint: '#ffd166', tintAmount: 0.15, halo: 0.9, levelResponse: 1,
};

<TalkingMarble state={agentState} presets={{ muted, celebrating }} />`;

const PROPS: [string, string, string, string][] = [
  ['state', "'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error' | string", "'idle'", 'A built-in state or the name of one of your presets. Unknown names show idle (one warning in development).'],
  ['audio', 'MediaStream | HTMLMediaElement | AudioNode', '—', 'Audio to react to, in states that listen. One shared AudioContext; if the browser blocks it, it resumes on the next click or key press.'],
  ['level', 'number (0–1)', '—', 'An audio level you computed. Overrides audio when given.'],
  ['palette', "PaletteName | string[]", "'pearl'", 'pearl, ember, lagoon, ink, rose, aurora, or four hex colors: ground, then three pigments.'],
  ['size', 'number', 'fills its container', 'Width and height in CSS pixels. Without it the orb is as wide as its container, and square.'],
  ['presets', 'Record<string, OrbPreset>', '—', 'Your own states, merged over the built-ins by name.'],
  ['halo', 'boolean', 'true', 'The soft light behind the orb.'],
  ['paused', 'boolean', 'false', 'Stop animating without unmounting.'],
  ['aria-label', 'string', '—', 'Makes the orb an image with this label. Without it, the orb is decorative (aria-hidden).'],
  ['className, style', 'string, CSSProperties', '—', 'Applied to the outer element.'],
];

const PARAMS: [string, string, string][] = [
  ['flow', '0–2', 'Speed of the pigment flow.'],
  ['energy', '0–1', 'Activity: faster, deeper, a little brighter.'],
  ['warp', '1–3.5', 'How much the pigment folds.'],
  ['brightness', '0.5–1.5', 'Overall light.'],
  ['saturation', '0–1.5', 'Color strength.'],
  ['tint, tintAmount', 'hex, 0–1', 'A color wash and how strong it is.'],
  ['breath', '0–1', 'A slow scale pulse (as connecting).'],
  ['halo', '0–1', 'Halo strength.'],
  ['levelResponse', '0–1', 'How much audio moves the orb. 0 ignores audio.'],
];

const SECTIONS = [
  ['install', 'Install'],
  ['quick-start', 'Quick start'],
  ['props', 'Props'],
  ['audio-sources', 'Audio sources'],
  ['states', 'States and presets'],
  ['customize', 'Customize'],
  ['recipes', 'Recipes'],
] as const;

export function Docs() {
  return (
    <div className="docs">
      <nav className="docs__index" aria-label="On this page">
        <p className="caps docs__index-title">On this page</p>
        {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>
      <article className="docs__body">
        <header className="docs__header">
          <h1 className="display docs__title">Docs</h1>
          <p className="docs__lead">Everything the component does, and how to wire it to your voice SDK.</p>
        </header>
        <div className="prose">
          <h2 id="install">Install</h2>
          <p>React 18 or newer. No other dependencies: the orb is one WebGL2 canvas and Web Audio.</p>
          <Code title="Terminal" lang="sh" code="npm i talking-marble" />

          <h2 id="quick-start">Quick start</h2>
          <p>Pass your agent&apos;s state and, if you have it, its audio. The orb eases between states and swells with the voice.</p>
          <Code title="Assistant.tsx" lang="tsx" code={QUICK_START} />

          <h2 id="props">Props</h2>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Props table">
            <table>
              <thead><tr><th scope="col">Prop</th><th scope="col">Type</th><th scope="col">Default</th><th scope="col">What it does</th></tr></thead>
              <tbody>
                {PROPS.map(([name, type, def, what]) => (
                  <tr key={name}><td><code>{name}</code></td><td><code>{type}</code></td><td>{def}</td><td>{what}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Also exported: <code>palettes</code>, <code>states</code>, <code>resolveState</code>, <code>resolvePalette</code>,
            the example presets <code>muted</code>, <code>happy</code> and <code>calm</code>, and the types <code>OrbState</code>,{' '}
            <code>BuiltInState</code>, <code>OrbPreset</code>, <code>OrbParams</code>, <code>OrbPalette</code>, <code>OrbColors</code>,{' '}
            <code>PaletteName</code>, <code>OrbAudioSource</code> and <code>TalkingMarbleProps</code>.
          </p>

          <h2 id="audio-sources">Audio sources</h2>
          <p>
            The orb hears from a <code>MediaStream</code> (a microphone, or an agent&apos;s remote WebRTC stream), an{' '}
            <code>HTMLMediaElement</code>, a Web Audio <code>AudioNode</code>, or a <code>level</code> number you pass in.
            The level is smoothed so the orb swells with speech instead of flickering.
          </p>
          <Code title="Audio sources" lang="tsx" code={AUDIO_SOURCES} />
          <ul>
            <li>Only states that listen react: <code>listening</code> gently, <code>speaking</code> fully. Other states ignore audio.</li>
            <li>A media element can be attached to one orb at a time.</li>
            <li>Audio is analyzed in the browser. Nothing is recorded or sent anywhere.</li>
          </ul>

          <h2 id="states">States and custom presets</h2>
          <p>
            The six built-in states follow the common voice-agent lifecycle, so you can pass your SDK&apos;s state straight in:{' '}
            <code>idle</code>, <code>connecting</code>, <code>listening</code>, <code>thinking</code>, <code>speaking</code>,{' '}
            <code>error</code>. Every change between states eases; nothing jumps.
          </p>
          <p>
            A state is a preset: plain data over a few parameters, the same in every port. Add your own with{' '}
            <code>presets</code>; the package ships <code>muted</code>, <code>happy</code> and <code>calm</code> as examples.
            Values out of range are clamped; invalid ones are ignored. The playground&apos;s Preset JSON shows every parameter of the current state.
          </p>
          <Code title="Custom presets" lang="tsx" code={CUSTOM_PRESETS} />
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Preset parameters">
            <table>
              <thead><tr><th scope="col">Parameter</th><th scope="col">Range</th><th scope="col">What it changes</th></tr></thead>
              <tbody>
                {PARAMS.map(([name, range, what]) => (
                  <tr key={name}><td><code>{name}</code></td><td>{range}</td><td>{what}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 id="customize">Customize</h2>
          <ul>
            <li><strong>Colors</strong>: <code>palette</code> takes a palette name or four hex colors, ground first: <code>{"palette={['#0a1117', '#5adfab', '#a275ff', '#ffbe77']}"}</code>.</li>
            <li><strong>Size</strong>: <code>{'size={96}'}</code> for a fixed square, or leave it out and size the container.</li>
            <li><strong>Light</strong>: <code>{'halo={false}'}</code> turns off the soft light behind the orb.</li>
            <li><strong>Your own states</strong>: any name in <code>presets</code> becomes a state you can pass to <code>state</code>.</li>
            <li><strong>Placement</strong>: <code>className</code> and <code>style</code> go on the outer element.</li>
            <li><strong>Motion</strong>: with the system&apos;s reduced-motion setting the orb holds still and shows its state through color and light; <code>paused</code> stops it on demand.</li>
            <li><strong>Accessibility</strong>: decorative by default; give it <code>aria-label</code> when it carries meaning.</li>
          </ul>

          <h2 id="recipes">Recipes</h2>
          <Recipes />
        </div>
      </article>
    </div>
  );
}
