import { sharedAudioContext } from './context';
import { levelFromSamples } from './level';

/** Where the orb can hear from: a microphone or remote stream, an audio or video element, or a Web Audio node. */
export type OrbAudioSource = MediaStream | HTMLMediaElement | AudioNode;

/** A live tap on an audio source. */
export interface AudioTap {
  /** The raw level (0–1) of the latest audio, unsmoothed. */
  read(): number;
  /** Disconnects the analyser. Never stops the source's tracks or playback. */
  dispose(): void;
}

// A media element can be wrapped in a source node only once per lifetime, so keep it.
const elementSources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

function isNode(source: OrbAudioSource): source is AudioNode {
  return typeof AudioNode !== 'undefined' && source instanceof AudioNode;
}
function isElement(source: OrbAudioSource): source is HTMLMediaElement {
  return typeof HTMLMediaElement !== 'undefined' && source instanceof HTMLMediaElement;
}
function isStream(source: OrbAudioSource): source is MediaStream {
  return typeof MediaStream !== 'undefined' && source instanceof MediaStream;
}

/**
 * True when Web Audio may read the element's samples. Cross-origin media without CORS comes out of the
 * graph silent, and once wrapped the element plays only through the graph: wrapping it would mute it.
 * Unknown (no source yet), blob:, data: and stream sources count as readable.
 */
export function isReadable(element: HTMLMediaElement): boolean {
  if (element.srcObject || element.crossOrigin !== null) return true;
  const src = element.currentSrc || element.src;
  if (!src) return true;
  try {
    const url = new URL(src, location.href);
    return url.protocol === 'blob:' || url.protocol === 'data:' || url.origin === location.origin;
  } catch {
    return false;
  }
}

/** The input node for a source, and how to undo what was made for it. */
function inputFor(source: OrbAudioSource): { node: AudioNode; release(): void } | null {
  if (isNode(source)) return { node: source, release() {} };
  if (isElement(source)) {
    let node = elementSources.get(source);
    if (!node || node.context.state === 'closed') {
      if (!isReadable(source)) return null;
      const context = sharedAudioContext();
      if (!context) return null;
      node = context.createMediaElementSource(source);
      // Keep the element audible: once wrapped, its sound only reaches the speakers through the graph.
      node.connect(context.destination);
      elementSources.set(source, node);
    } else {
      sharedAudioContext(); // re-arms the gesture resume if the context is waiting
    }
    return { node, release() {} };
  }
  if (isStream(source)) {
    const context = sharedAudioContext();
    if (!context) return null;
    const node = context.createMediaStreamSource(source);
    return { node, release: () => node.disconnect() };
  }
  return null;
}

/** An analyser on the source; null when Web Audio is unavailable or refuses the source. */
function tap(source: OrbAudioSource): AudioTap | null {
  let input: ReturnType<typeof inputFor> = null;
  try {
    input = inputFor(source);
    if (!input) return null;
    const { node, release } = input;
    const analyser = node.context.createAnalyser();
    analyser.fftSize = 2048;
    node.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let disposed = false;
    return {
      read() {
        if (disposed) return 0;
        analyser.getFloatTimeDomainData(samples);
        return levelFromSamples(samples);
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        try { node.disconnect(analyser); } catch { /* already disconnected */ }
        release();
      },
    };
  } catch {
    // For example an element wrapped by another AudioContext, or a node without outputs.
    input?.release();
    return null;
  }
}

/** The audio track Web Audio taps from a stream: the one with the lexicographically smallest id. */
function tappedTrack(stream: MediaStream): MediaStreamTrack | undefined {
  let first: MediaStreamTrack | undefined;
  for (const track of stream.getAudioTracks()) if (!first || track.id < first.id) first = track;
  return first;
}

/** How many reads apart a stream's tracks are checked again (about every half second at 30 frames a second). */
const TRACK_CHECK = 15;

/**
 * Taps an audio source for its level. Null when Web Audio is unavailable or the source cannot be read
 * (a cross-origin element without CORS). A stream without audio tracks yet is tapped when one arrives; a
 * stream whose track is added by script (no `addtrack` event) or replaced is tapped again within a few reads.
 */
export function connectAudio(source: OrbAudioSource): AudioTap | null {
  if (!isStream(source)) return tap(source);
  let inner: AudioTap | null = null;
  let tapped: MediaStreamTrack | undefined;
  let disposed = false;
  let reads = 0;
  // Re-taps when the track Web Audio would read has changed; listens for `addtrack` while nothing is tapped.
  const sync = () => {
    if (disposed) return;
    const track = tappedTrack(source);
    if (track !== tapped || (track && !inner)) {
      inner?.dispose();
      inner = track ? tap(source) : null;
      tapped = inner ? track : undefined;
    }
    if (inner) source.removeEventListener('addtrack', sync);
    else source.addEventListener('addtrack', sync);
  };
  const hadTrack = source.getAudioTracks().length > 0;
  sync();
  // A stream that has audio but cannot be tapped (no Web Audio) is refused, like any other source.
  if (hadTrack && !inner) { disposed = true; source.removeEventListener('addtrack', sync); return null; }
  return {
    read() {
      if (++reads % TRACK_CHECK === 0) sync();
      return inner?.read() ?? 0;
    },
    dispose() {
      disposed = true;
      source.removeEventListener('addtrack', sync);
      inner?.dispose();
      inner = null;
    },
  };
}
