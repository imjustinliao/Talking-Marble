import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { DEVICES, FRAMEWORKS } from '../platforms';
import { TalkingMarble } from 'talking-marble';
import { preset, props } from 'virtual:docs-data';
import { BUILT_INS, colorsOf, paletteLabel } from '../palettes';
import { STATES } from '../presets';
import { setPalette, usePick } from '../scene/pick';
import { useSimulatedLevel } from '../simulated';
import { Code } from './Code';
import { CopyButton } from './CopyButton';
import { Recipes } from './Recipes';

const QUICK_START = `import { TalkingMarble, type OrbState } from 'talking-marble';

// state: 'idle' | 'connecting' | 'listening' | 'thinking' | 'searching' | 'speaking' | 'error'
// stream: the agent's audio, if you have it
export function Assistant({ state, stream }: { state: OrbState; stream?: MediaStream | null }) {
  return <TalkingMarble state={state} audio={stream} palette="pearl" size={160} />;
}`;

const ELEMENT = `<script type="module">
  import 'talking-marble/element';

  const marble = document.querySelector('talking-marble');
  // From your voice SDK's events:
  marble.state = 'listening';
  marble.audio = agentStream; // a MediaStream, an <audio> element or a Web Audio node
</script>

<talking-marble state="idle" palette="pearl" size="160" label="Nova"></talking-marble>`;

/** The Web Component's attributes and properties (packages/react/src/element.ts). */
const ELEMENT_ATTRS: [string, string, string][] = [
  ['state', 'state', 'A built-in state or one of your presets. Default `idle`.'],
  ['emotion', 'emotion', 'An emotion layered on the state: `happy`, `calm`, `excited`, `curious`, `surprised`, `concerned`, `sad`, `muted` or one of your presets.'],
  ['palette', 'palette', 'A palette name, or four hex colours separated by commas (the property also takes an array).'],
  ['size', 'size', 'Width and height in CSS px. Absent: it fills its container\'s width, square.'],
  ['halo', 'halo', '`true` (default), `false`, or a strength from 0 to 1.5.'],
  ['level', 'level', 'Audio level 0–1; overrides `audio` when set.'],
  ['presets', 'presets', 'Your own states and emotions: JSON in the attribute, an object as the property.'],
  ['label', 'label', 'Who the marble is, for assistive technology: it reads "Assistant, speaking".'],
  ['decorative', 'decorative', 'Hidden from assistive technology, when its state is shown elsewhere.'],
  ['paused', 'paused', 'Stop animating without removing it.'],
  ['—', 'audio', 'Audio to react to: a MediaStream, an audio or video element, or a Web Audio node. Never stops your tracks.'],
];

const PALETTES = `// A built-in palette by name
<TalkingMarble state={state} palette="ember" />

// Or your own four colours: the ground, then three pigments
<TalkingMarble state={state} palette={['#f6f5ee', '#ef9fc5', '#61d9d0', '#f3c76f']} />

// No soft light behind it (it never changes layout either way)
<TalkingMarble state={state} halo={false} />`;

const AUDIO_SOURCES = `// A microphone or a remote WebRTC stream
<TalkingMarble state="listening" audio={mediaStream} />

// An <audio> or <video> element (it keeps playing through the speakers)
<TalkingMarble state="speaking" audio={audioElementRef.current} />

// A Web Audio node you already have
<TalkingMarble state="speaking" audio={gainNode} />

// A level you computed yourself, 0–1 (overrides audio)
<TalkingMarble state="speaking" level={volume} />`;

const CUSTOM_PRESETS = `import { TalkingMarble, type OrbPreset } from 'talking-marble';

// Any subset of the fields; the rest come from the resting values.
const celebrating: OrbPreset = {
  speed: 1.6, glow: 0.3, bounce: 0.6, reactivity: 1, label: 'celebrating',
};

<TalkingMarble state="celebrating" presets={{ celebrating }} />

// An emotion layers on any state: a built-in one (happy, calm, excited, curious, surprised, concerned, sad, muted)
// or your own preset.
<TalkingMarble state={agentState} emotion="happy" />`;

/** Every numeric field at its resting value, four to a line. */
const BASE = (() => {
  const entries = Object.entries(preset.base).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  const lines: string[] = [];
  for (let i = 0; i < entries.length; i += 4) lines.push(`  ${entries.slice(i, i + 4).join(', ')},`);
  return `// The resting values: the original orb (\`idle\`)\nconst base: OrbPreset = {\n${lines.join('\n')}\n};`;
})();

const SECTIONS = [
  ['install', 'Install'],
  ['quick-start', 'Quick start'],
  ['web-component', 'Web Component'],
  ['palettes', 'Palettes'],
  ['props', 'Props'],
  ['states', 'States and emotions'],
  ['presets', 'Preset format'],
  ['audio', 'Audio'],
  ['accessibility', 'Accessibility'],
  ['performance', 'Performance'],
  ['recipes', 'Recipes'],
] as const;

/** Text from the package's JSDoc: `code` in backticks becomes code. */
function inline(text: string): ReactNode {
  return text.split(/`([^`]+)`/).map((part, i) => (i % 2 ? <code key={i}>{part}</code> : <Fragment key={i}>{part}</Fragment>));
}
/** A default that is a value (`'idle'`, `true`, `0.5`) reads as code; a description ("fills its container") as text. */
const isValue = (value: string) => /^(['"].*['"]|-?[\d.]+|true|false|null)$/.test(value);
const defaultCell = (value: string) => (!value ? '—' : isValue(value) ? <code>{value}</code> : value);

function Table({ label, head, rows }: { label: string; head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={label}>
      <table>
        <thead><tr>{head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map((cells, i) => <tr key={i}>{cells.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const INSTALL = 'npm i talking-marble';
const base = import.meta.env.BASE_URL;

/** The section in view, for the index: the last heading above the upper third of the screen. */
function useActiveSection(): string {
  const [active, setActive] = useState<string>(SECTIONS[0][0]);
  useEffect(() => {
    const headings = SECTIONS.map(([id]) => document.getElementById(id)).filter((h): h is HTMLElement => !!h);
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = innerHeight / 3;
      let current = headings[0]?.id ?? '';
      for (const h of headings) if (h.getBoundingClientRect().top <= line) current = h.id;
      // At the very bottom, the last section is the one being read.
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) current = headings.at(-1)?.id ?? current;
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); };
  }, []);
  return active;
}

/** The header's marble, speaking with a simulated voice. Its own component, so only it re-renders with the voice. */
function HeaderMarble({ colors }: { colors: readonly string[] }) {
  const [small] = useState(() => matchMedia('(max-width: 520px)').matches);
  const level = useSimulatedLevel(!matchMedia('(prefers-reduced-motion: reduce)').matches);
  return <TalkingMarble size={small ? 84 : 124} state="speaking" level={level} palette={colors} decorative />;
}

/** The six built-in palettes as small live marbles: choosing one re-tints the page and the header's marble. */
function PaletteChooser() {
  const { palette } = usePick();
  return (
    <ul className="swatches" aria-label="Built-in palettes">
      {BUILT_INS.map(id => (
        <li key={id}>
          <button type="button" className="swatch" aria-pressed={palette === id} onClick={() => setPalette(id)}>
            <TalkingMarble size={52} state="idle" palette={colorsOf(id)} halo={false} decorative />
            <span className="swatch__name">{paletteLabel(id)}</span>
            <code className="swatch__code">&apos;{id}&apos;</code>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Docs() {
  // The page renders after load, so the browser's own jump to a link's #section missed it: make it now.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);
  const active = useActiveSection();
  const pick = usePick();
  const colors = colorsOf(pick.palette);
  // The marble lends the page its colours (F-28): the sky's light, the index mark, code tints, the panels' edges.
  useEffect(() => {
    const root = document.documentElement.style;
    colors.forEach((c, i) => root.setProperty(`--m${i}`, c));
  }, [colors]);
  return (
    <div className="docs">
      <nav className="docs__index" aria-label="On this page">
        <p className="docs__index-title">On this page</p>
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined}>{label}</a>
        ))}
      </nav>
      <article className="docs__body">
        <header className="docs__header">
          <div className="docs__marble" aria-hidden="true">
            <HeaderMarble colors={colors} />
          </div>
          <div className="docs__heading">
            <h1 className="display docs__title">Docs</h1>
            <p className="docs__lead">Everything the marble does, and how to wire it to your voice SDK.</p>
          </div>
        </header>
        <div className="prose">
          <h2 id="install">Install</h2>
          <p>
            One package, two ways in: the React component (React 18 or newer), and <code>&lt;talking-marble&gt;</code>, a Web
            Component for any web framework or plain HTML (<a href="#web-component">below</a>). No other dependencies: the marble is one
            WebGL2 canvas and Web Audio. It runs wherever a modern browser does: {DEVICES.join(', ').toLowerCase()}.
          </p>
          <div className="install">
            <ul className="platforms" aria-label="Works with">
              {FRAMEWORKS.map(f => <li key={f} className="is-ready">{f}</li>)}
            </ul>
            <div className="install__cmd">
              <code>{INSTALL}</code>
              <CopyButton text={INSTALL} what="install command" />
            </div>
          </div>

          <h2 id="quick-start">Quick start</h2>
          <p>Pass your agent&apos;s state and, if you have it, its audio. The orb eases between states and swells with the voice.</p>
          <Code title="Assistant.tsx" lang="tsx" code={QUICK_START} />

          <h2 id="web-component">Web Component</h2>
          <p>
            Not using React? Import <code>talking-marble/element</code> once and use <code>&lt;talking-marble&gt;</code> anywhere: plain
            HTML, Vue, Svelte, Angular, Astro, Solid. It is the same marble, with the same states, emotions, palettes and presets.
            React is not needed for it.
          </p>
          <Code title="index.html" lang="html" code={ELEMENT} />
          <Table
            label="Web Component attributes" head={['Attribute', 'Property', 'What it does']}
            rows={ELEMENT_ATTRS.map(([a, prop, what]) => [<code key="a">{a}</code>, <code key="p">{prop}</code>, inline(what)])}
          />
          <p>
            Without a bundler, load it from a CDN once the package is on npm:{' '}
            <code>{'<script type="module" src="https://cdn.jsdelivr.net/npm/talking-marble/dist/element.js"></script>'}</code>. To
            register it under another name, import <code>defineTalkingMarble</code> and call it with your tag.
          </p>

          <h2 id="palettes">Palettes</h2>
          <p>
            A palette is four colours: a ground and three pigments that swirl through it. Six are built in; try one here and
            the page follows it. Or pass your own four, or make one on the home page with{' '}
            <a href={`${base}#create`}>Create your own</a>, which writes the code for you.
          </p>
          <PaletteChooser />
          <Code title="Palettes and halo" lang="tsx" code={PALETTES} />
          <p>
            Colours are CSS hex (<code>#rgb</code> or <code>#rrggbb</code>); fewer than four are filled out with the ground. The
            halo, the soft light behind the marble, is on by default and takes its colour from the palette.
          </p>

          <h2 id="props">Props</h2>
          <p>Every prop is optional.</p>
          <Table
            label="Props" head={['Prop', 'Type', 'Default', 'What it does']}
            rows={props.map(p => [<code key="n">{p.name}</code>, <code key="t">{p.type}</code>, defaultCell(p.default), inline(p.description)])}
          />
          <p>
            Also exported: <code>palettes</code>, <code>states</code>, <code>emotions</code> (and each built-in emotion by its name), <code>resolveState</code>, <code>resolvePalette</code>, and the types <code>OrbState</code>,{' '}
            <code>BuiltInState</code>, <code>OrbEmotion</code>, <code>BuiltInEmotion</code>, <code>OrbPreset</code>, <code>OrbParams</code>,{' '}
            <code>ResolvedPreset</code>, <code>OrbPalette</code>, <code>OrbColors</code>, <code>PaletteName</code>, <code>OrbAudioSource</code>{' '}
            and <code>TalkingMarbleProps</code>.
          </p>

          <h2 id="states">States and emotions</h2>
          <p>
            Six states follow the common voice-agent lifecycle, so you can pass your SDK&apos;s state straight in; the seventh,{' '}
            <code>searching</code>, is for while the agent looks something up or calls a tool. The material
            never changes between states: only energy, motion and brightness do, and the voice drives them. Every change eases from
            where the orb is; nothing jumps.
          </p>
          <Table
            label="States and emotions" head={['Name', 'Kind', 'How it looks']}
            rows={STATES.map(s => [<code key="n">{s.name}</code>, s.kind, s.line])}
          />
          <p>
            An emotion layers on a state with <code>emotion</code>. Each number it sets moves the state&apos;s value 65% of the way
            toward its own, so <code>happy</code> on <code>speaking</code> is a quicker, brighter speaking.
          </p>

          <h2 id="presets">Preset format</h2>
          <p>
            States and emotions are presets: plain data, the same in every port. Add your own with <code>presets</code>, then pass
            its name as <code>state</code> or <code>emotion</code>. A preset is any subset of these fields; the rest come from the
            resting values. Values out of range are clamped; invalid ones are ignored.
          </p>
          <Code title="Custom presets" lang="tsx" code={CUSTOM_PRESETS} />
          <Table
            label="Preset fields" head={['Field', 'Range', 'Default', 'What it changes']}
            rows={preset.fields.map(f => [<code key="n">{f.name}</code>, f.range, defaultCell(f.default), f.description])}
          />
          <p>
            How a state resolves: the resting values, then the built-in state, then your preset of the same name (so a preset named{' '}
            <code>thinking</code> adjusts the built-in one). Unknown names show <code>idle</code>. Create your own on the home page
            exports exactly this object.
          </p>
          <Code title="Resting values" lang="ts" code={BASE} />

          <h2 id="audio">Audio</h2>
          <p>
            The orb hears from a <code>MediaStream</code> (a microphone, or an agent&apos;s remote WebRTC stream), an{' '}
            <code>HTMLMediaElement</code>, a Web Audio <code>AudioNode</code>, or a <code>level</code> number you pass in.
          </p>
          <Code title="Audio sources" lang="tsx" code={AUDIO_SOURCES} />
          <ul>
            <li>Only states that listen react: <code>listening</code> gently, <code>speaking</code> fully, and any preset with <code>reactivity</code> above 0.</li>
            <li>The level is smoothed, rising quickly and falling slowly, so the orb swells with speech instead of flickering.</li>
            <li>All orbs share one <code>AudioContext</code>. If the browser blocks it until the visitor interacts, it starts on the next click, tap or key press.</li>
            <li>A stream that has no audio track yet (common with WebRTC) is picked up when its track arrives. The orb never stops your tracks.</li>
            <li>A media element keeps playing through the speakers, and feeds one orb at a time. Cross-origin media needs CORS, or the orb ignores it.</li>
            <li>Audio is analyzed in the browser. Nothing is recorded or sent anywhere.</li>
          </ul>

          <h2 id="accessibility">Accessibility</h2>
          <ul>
            <li><strong>A name for each state</strong>: the orb is an image named &ldquo;Assistant, listening&rdquo;, updated as the state (and emotion) changes. Set <code>label</code> for who it is (&ldquo;Ava, speaking&rdquo;); your presets use their own <code>label</code>, else their name.</li>
            <li><strong>Your own name</strong>: <code>aria-label</code> replaces the whole name.</li>
            <li><strong>Decorative</strong>: when text beside it already says the state, set <code>decorative</code> and assistive technology skips it.</li>
            <li><strong>Reduced motion</strong>: with the system&apos;s setting, the orb holds a still frame. States still show through brightness and size, and the halo still follows the voice.</li>
            <li><strong>No flashing</strong>: brightness changes stay well under three flashes a second.</li>
            <li><strong>Not by colour alone</strong>: states differ in motion and light, not colour. Show important states, such as an error, in text as well.</li>
          </ul>

          <h2 id="performance">Performance</h2>
          <ul>
            <li><strong>One renderer</strong>: every orb on a page draws through one shared WebGL2 context (browsers allow about 16), each into its own element. Thirty orbs cost one context.</li>
            <li><strong>Only when seen</strong>: orbs draw at most 30 frames a second, only while on screen and while the tab is visible. <code>paused</code> stops one on demand.</li>
            <li><strong>Sharp at any size</strong>: the canvas renders at the element&apos;s CSS size times the device pixel ratio, up to 2× for small orbs and 1.5× for large ones (never under 320 px: their soft pigment looks the same, with far fewer pixels to draw), within 4096 × 4096 pixels per orb.</li>
            <li><strong>Smooth on slower devices</strong>: if frames start arriving late, the renderer lowers its drawing resolution in steps, down to half, and sharpens again once there is headroom. The orb&apos;s size on the page never changes.</li>
            <li><strong>Small sizes</strong>: below 48 px the orb broadens its veins, drops grain and fine detail, and keeps still in place, so a 20 px orb beside a line of text still reads as itself.</li>
            <li><strong>Server rendering</strong>: it renders on the server as a CSS picture of the orb in its own colours, which it also shows until WebGL2 is ready, when WebGL2 is missing, and while a lost GPU context restores.</li>
            <li><strong>Layout</strong>: the orb never changes its box. A moving orb can swell and bounce past it, so near a screen edge give it about 20% room, or put <code>overflow-x: clip</code> on its container.</li>
          </ul>

          <h2 id="recipes">Recipes</h2>
          <Recipes />
        </div>
      </article>
    </div>
  );
}
