import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { levelFromSamples } from '../src/audio/level';

describe('levelFromSamples (packages/core/spec.md › Audio level)', () => {
  it('is 0 for silence and for no samples', () => {
    expect(levelFromSamples(new Float32Array(512))).toBe(0);
    expect(levelFromSamples([])).toBe(0);
  });
  it('ignores the noise floor: rms at or under 0.01 is 0', () => {
    expect(levelFromSamples(new Float32Array(256).fill(0.01))).toBe(0);
    expect(levelFromSamples(new Float32Array(256).fill(-0.005))).toBe(0);
  });
  it('is (rms - 0.01) * 7', () => {
    expect(levelFromSamples(new Float32Array(256).fill(0.1))).toBeCloseTo(0.63, 6);
    // A sine of amplitude a has rms a/√2.
    const sine = Float32Array.from({ length: 4800 }, (_, i) => 0.1 * Math.sin((2 * Math.PI * 440 * i) / 48000));
    expect(levelFromSamples(sine)).toBeCloseTo((0.1 / Math.SQRT2 - 0.01) * 7, 3);
  });
  it('clamps loud audio to 1', () => {
    expect(levelFromSamples(new Float32Array(256).fill(1))).toBe(1);
    expect(levelFromSamples(new Float32Array(256).fill(-0.5))).toBe(1);
  });
});

// Minimal Web Audio fakes: enough to check which nodes are made, connected and disconnected.
class FakeNode {
  connections = new Set<FakeNode>();
  constructor(readonly context: FakeContext) {}
  connect(target: FakeNode) { this.connections.add(target); return target; }
  disconnect(target?: FakeNode) { if (target) this.connections.delete(target); else this.connections.clear(); }
}
class FakeAnalyser extends FakeNode {
  fftSize = 2048;
  value = 0;
  getFloatTimeDomainData(out: Float32Array) { out.fill(this.value); }
}
class FakeContext {
  static instances: FakeContext[] = [];
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  destination = new FakeNode(this);
  analysers: FakeAnalyser[] = [];
  elementSources = 0;
  allowResume = true;
  resume = vi.fn(async () => { if (this.allowResume) this.state = 'running'; });
  constructor() { FakeContext.instances.push(this); }
  addEventListener() {}
  createAnalyser() { const a = new FakeAnalyser(this); this.analysers.push(a); return a; }
  createMediaElementSource() { this.elementSources++; return new FakeNode(this); }
  createMediaStreamSource() { return new FakeNode(this); }
}
class FakeStream {
  stop = vi.fn();
  listeners = new Set<() => void>();
  constructor(public tracks: { stop(): void }[]) {}
  getAudioTracks() { return this.tracks; }
  addEventListener(_: string, fn: () => void) { this.listeners.add(fn); }
  removeEventListener(_: string, fn: () => void) { this.listeners.delete(fn); }
  addTrack(track: { stop(): void }) { this.tracks.push(track); for (const fn of [...this.listeners]) fn(); }
}
class FakeElement {
  srcObject = null;
  crossOrigin: string | null = null;
  currentSrc = '';
  constructor(public src = '') {}
}

let listeners: Record<string, Set<() => void>>;
let connectAudio: typeof import('../src/audio/source').connectAudio;

beforeEach(async () => {
  FakeContext.instances = [];
  listeners = {};
  vi.stubGlobal('AudioNode', FakeNode);
  vi.stubGlobal('MediaStream', FakeStream);
  vi.stubGlobal('HTMLMediaElement', FakeElement);
  vi.stubGlobal('location', { href: 'https://app.test/page', origin: 'https://app.test' });
  vi.stubGlobal('window', {
    AudioContext: FakeContext,
    addEventListener: (type: string, fn: () => void) => { (listeners[type] ??= new Set()).add(fn); },
    removeEventListener: (type: string, fn: () => void) => { listeners[type]?.delete(fn); },
  });
  // A fresh module per test, so the shared context starts unmade.
  vi.resetModules();
  ({ connectAudio } = await import('../src/audio/source'));
});
afterEach(() => vi.unstubAllGlobals());

describe('connectAudio', () => {
  it('makes no AudioContext until a source needs one', () => {
    expect(FakeContext.instances).toHaveLength(0);
    connectAudio(new FakeStream([{ stop: vi.fn() }]) as unknown as MediaStream);
    expect(FakeContext.instances).toHaveLength(1);
  });

  it('shares one context across sources', () => {
    connectAudio(new FakeStream([{ stop: vi.fn() }]) as unknown as MediaStream);
    connectAudio(new FakeElement() as unknown as HTMLMediaElement);
    expect(FakeContext.instances).toHaveLength(1);
  });

  it('reads the level of a stream and never stops its tracks', () => {
    const track = { stop: vi.fn() };
    const stream = new FakeStream([track]);
    const tap = connectAudio(stream as unknown as MediaStream)!;
    const analyser = FakeContext.instances[0]!.analysers[0]!;
    analyser.value = 0.1;
    expect(tap.read()).toBeCloseTo(0.63, 5);
    tap.dispose();
    expect(tap.read()).toBe(0);
    expect(track.stop).not.toHaveBeenCalled();
    expect(stream.stop).not.toHaveBeenCalled();
  });

  it('taps a stream once its first audio track arrives', () => {
    const stream = new FakeStream([]);
    const tap = connectAudio(stream as unknown as MediaStream)!;
    expect(tap.read()).toBe(0);
    expect(FakeContext.instances).toHaveLength(0);
    stream.addTrack({ stop: vi.fn() });
    const analyser = FakeContext.instances[0]!.analysers[0]!;
    analyser.value = 1;
    expect(tap.read()).toBe(1);
    expect(stream.listeners.size).toBe(0);
    tap.dispose();
    expect(tap.read()).toBe(0);
  });

  it('leaves cross-origin media without CORS alone (wrapping would mute it)', () => {
    const element = new FakeElement('https://cdn.other.test/tts.mp3');
    expect(connectAudio(element as unknown as HTMLMediaElement)).toBeNull();
    expect(FakeContext.instances).toHaveLength(0);
    element.crossOrigin = 'anonymous';
    expect(connectAudio(element as unknown as HTMLMediaElement)).not.toBeNull();
    expect(connectAudio(new FakeElement('/clip.mp3') as unknown as HTMLMediaElement)).not.toBeNull();
    expect(connectAudio(new FakeElement('blob:https://app.test/1') as unknown as HTMLMediaElement)).not.toBeNull();
  });

  it('returns null instead of throwing when Web Audio refuses a node', () => {
    const own = new FakeContext();
    const node = new FakeNode(own);
    node.connect = () => { throw new Error('IndexSizeError'); };
    expect(connectAudio(node as unknown as AudioNode)).toBeNull();
  });

  it('wraps a media element once, keeps it audible, and only unhooks the analyser', () => {
    const element = new FakeElement() as unknown as HTMLMediaElement;
    const first = connectAudio(element)!;
    first.dispose();
    const second = connectAudio(element)!;
    const context = FakeContext.instances[0]!;
    expect(context.elementSources).toBe(1);
    context.analysers[1]!.value = 1;
    expect(second.read()).toBe(1);
    second.dispose();
  });

  it('keeps an element routed to the destination after dispose', () => {
    const element = new FakeElement() as unknown as HTMLMediaElement;
    const spy = vi.spyOn(FakeNode.prototype, 'connect');
    const tap = connectAudio(element)!;
    const shared = FakeContext.instances[0]!;
    const source = spy.mock.contexts[0] as FakeNode;
    expect(source.connections.has(shared.destination)).toBe(true);
    tap.dispose();
    expect(source.connections.has(shared.destination)).toBe(true);
    expect(source.connections.size).toBe(1);
    spy.mockRestore();
  });

  it('taps an AudioNode on its own context and leaves the shared one unmade', () => {
    const own = new FakeContext();
    FakeContext.instances = [];
    const node = new FakeNode(own);
    const tap = connectAudio(node as unknown as AudioNode)!;
    expect(FakeContext.instances).toHaveLength(0);
    expect(own.analysers).toHaveLength(1);
    expect(node.connections.has(own.analysers[0]!)).toBe(true);
    tap.dispose();
    expect(node.connections.size).toBe(0);
  });

  it('resumes a suspended context on gestures until it runs', async () => {
    connectAudio(new FakeStream([{ stop: vi.fn() }]) as unknown as MediaStream);
    const context = FakeContext.instances[0]!;
    // The first attempt happens at once (it works when the page already had a gesture); here it is blocked.
    expect(context.resume).toHaveBeenCalledTimes(1);
    context.state = 'suspended';
    context.allowResume = false;
    // Activation gestures, touch included (pointerdown does not count on touch devices).
    for (const type of ['pointerup', 'touchend', 'click', 'keydown']) expect(listeners[type]?.size).toBe(1);
    // A gesture that does not grant activation keeps the listeners armed.
    [...listeners.pointerup!][0]!();
    await Promise.resolve();
    expect(context.resume).toHaveBeenCalledTimes(2);
    expect(listeners.click?.size).toBe(1);
    // One that does resumes it and disarms.
    context.allowResume = true;
    [...listeners.keydown!][0]!();
    await new Promise(r => setTimeout(r, 0));
    expect(context.state).toBe('running');
    for (const type of ['pointerup', 'touchend', 'click', 'keydown']) expect(listeners[type]?.size).toBe(0);
  });
});
