// Test page for the package's Playwright specs (e2e/package-*.spec.ts). Not shipped.
import { createElement as h, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { TalkingMarble, states, type TalkingMarbleProps } from '../../src/index';
import { createRenderer } from '../../src/render/renderer';
import { hexToLinear, palettes, type PaletteName } from '../../src/colors';

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
};
Object.assign(window, { harness });

function cell(label: string, child: ReactNode) {
  return h('div', { className: 'cell', key: label }, child, h('span', null, label));
}

if (view === 'states') {
  // Every built-in state at 48 and 240 px (DES-02). The states that react to audio hear a steady
  // voice (level `voice`, default 0.6), as they would in use; the others ignore it.
  const palette = (params.get('palette') ?? 'pearl') as PaletteName;
  const level = Number(params.get('voice') ?? 0.6);
  const names = Object.keys(states);
  const orb = (s: string, size: number) =>
    cell(`${s} ${size}`, h(TalkingMarble, { state: s, palette, size, level, 'aria-label': `${s} ${size}` }));
  root.render(h('div', { className: 'grid' }, ...names.map(s => orb(s, 240)), ...names.map(s => orb(s, 48))));
} else if (view === 'fidelity') {
  // One still frame of the original look at rest (DES-01), compared with the reference images in
  // e2e/fixtures/fidelity/, which were verified pixel-identical to the original orb on 2026-11-23.
  const palette = (params.get('palette') ?? 'pearl') as PaletteName;
  const time = Number(params.get('t') ?? 2.5);
  const size = Number(params.get('size') ?? 240);
  const ours = document.createElement('canvas');
  ours.id = 'ours';
  ours.width = ours.height = size;
  ours.style.width = ours.style.height = `${size}px`;
  document.getElementById('root')!.replaceWith(ours);
  const r = createRenderer(ours)!;
  r.resize(size, size);
  r.setColors(palettes[palette].map(hexToLinear));
  r.draw({ uTime: time, uSwirl: 0, uLevel: 0, uEnergy: 0, uWarp: 2.2, uBrightness: 1, uSaturation: 1, uTint: [1, 1, 1], uTintAmount: 0 });
  document.body.dataset.done = 'true';
}
