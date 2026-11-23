// Test page for the package's Playwright specs (e2e/package-*.spec.ts). Not shipped.
import { createElement as h, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { emotions, TalkingMarble, states, type TalkingMarbleProps } from '../../src/index';
import { palettes, type PaletteName } from '../../src/colors';
import { createMotion, uniformsOf } from '../../src/render/motion';
import { renderInto, sharedCanvas } from '../../src/render/shared';
import { easedFrom, resolveState } from '../../src/state';

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'orb';
document.body.dataset.bg = params.get('bg') ?? 'dark';
const root = createRoot(document.getElementById('root')!);

/** Test sources, each in its own AudioContext (never the orb's shared one). */
const OriginalContext = window.AudioContext;
function tone(gain: number) {
  const context = new OriginalContext();
  Object.assign(context, { testOnly: true });
  const osc = context.createOscillator();
  const amp = context.createGain();
  osc.frequency.value = 220;
  amp.gain.value = gain;
  osc.connect(amp);
  osc.start();
  return { context, amp };
}
/** Waits for a resume, but not forever: under a gesture-required autoplay policy it stays pending. */
const settle = (p: Promise<void>) => Promise.race([p, new Promise(r => setTimeout(r, 100))]);
const harness = {
  render(props: TalkingMarbleProps & { id?: string }) {
    root.render(h(TalkingMarble, { size: 200, 'aria-label': 'orb', ...props }));
  },
  unmount() { root.render(null); },
  /** A MediaStream of a sine at `gain` (0.5 → level 1 after the spec's math). */
  async stream(gain = 0.5) {
    const { context, amp } = tone(gain);
    const out = context.createMediaStreamDestination();
    amp.connect(out);
    await settle(context.resume());
    return out.stream;
  },
  /** An AudioNode on the test's own context. */
  async node(gain = 0.5) {
    const { context, amp } = tone(gain);
    await settle(context.resume());
    return amp;
  },
  /** An <audio> element playing a generated looping tone. */
  async element(gain = 0.5) {
    const rate = 8000, seconds = 1, n = rate * seconds;
    const buffer = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buffer);
    const text = (at: number, s: string) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
    text(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); text(8, 'WAVEfmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); text(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin((2 * Math.PI * 200 * i) / rate) * gain * 32767), true);
    const audio = new Audio(URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' })));
    audio.loop = true;
    document.body.append(audio);
    await audio.play();
    return audio;
  },
  palettes,
  /** The shared WebGL canvas (for context-loss tests). */
  sharedCanvas,
};
Object.assign(window, { harness });

function cell(label: string, child: ReactNode) {
  return h('div', { className: 'cell', key: label }, child, h('span', null, label));
}

const sizesParam = (fallback: number[]) => (params.get('sizes')?.split(',').map(Number) ?? fallback);

if (view === 'states') {
  // Every built-in state (and with `emotions=1` every emotion on idle) at each size (DES-02). The states that
  // react to audio hear a steady voice (level `voice`, default 0.6), as they would in use.
  const palette = (params.get('palette') ?? 'pearl') as PaletteName;
  const level = Number(params.get('voice') ?? 0.6);
  const combos: [string, string | undefined][] = params.get('emotions')
    ? Object.keys(emotions).map(e => ['idle', e])
    : Object.keys(states).map(s => [s, undefined]);
  const sizes = sizesParam([240, 48, 20]);
  const name = (s: string, e: string | undefined) => (e ? `${s}+${e}` : s);
  const orb = (s: string, e: string | undefined, size: number) =>
    cell(`${name(s, e)} ${size}`, h(TalkingMarble, { state: s, emotion: e, palette, size, level, 'aria-label': `${name(s, e)} ${size}` }));
  document.documentElement.style.setProperty('--cols', String(combos.length));
  root.render(h('div', { className: 'grid' }, ...sizes.flatMap(size => combos.map(([s, e]) => orb(s, e, size)))));
} else if (view === 'many') {
  // Many marbles on one page (chat messages, a state grid): all through one WebGL context.
  const count = Number(params.get('count') ?? 30);
  const names = Object.keys(states);
  root.render(h('div', { className: 'many' }, ...Array.from({ length: count }, (_, i) =>
    h(TalkingMarble, { key: i, state: names[i % names.length], size: 64, label: `Orb ${i + 1}` }))));
} else if (view === 'sizes') {
  // One marble per size; `full` fills the viewport's shorter side.
  const sizes = sizesParam([20, 32, 48, 240]);
  const full = params.get('full') === '1';
  root.render(h('div', { className: 'row' }, full
    ? h('div', { style: { width: 'min(100vw, 100vh)' } }, h(TalkingMarble, { label: 'full', style: { display: 'block' } }))
    : sizes.map(size => cell(`${size}`, h(TalkingMarble, { size, label: `size ${size}`, state: params.get('state') ?? 'idle' })))));
} else if (view === 'fidelity') {
  // One still frame of the original look at rest (DES-01), drawn through the shared renderer exactly as a
  // marble is, compared with the reference images in e2e/fixtures/fidelity/ (pixel-identical to the original orb).
  const palette = (params.get('palette') ?? 'pearl') as PaletteName;
  const time = Number(params.get('t') ?? 2.5);
  const size = Number(params.get('size') ?? 240);
  const ours = document.createElement('canvas');
  ours.id = 'ours';
  ours.width = ours.height = size;
  ours.style.width = ours.style.height = `${size}px`;
  document.getElementById('root')!.replaceWith(ours);
  const motion = createMotion();
  motion.time = time;
  const uniforms = uniformsOf(motion, easedFrom(resolveState('idle')).x, 0, false);
  renderInto(ours, size, palettes[palette], uniforms);
  document.body.dataset.done = 'true';
}
