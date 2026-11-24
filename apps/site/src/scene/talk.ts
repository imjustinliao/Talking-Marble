import { createStore } from './store';

/**
 * Talking to the marble (F-22). Until a real voice model is connected (a backend milestone of its own), the reply is
 * simulated: your mic drives *listening*; when you pause, the marble *thinks*, then *speaks* a voice-like level; then
 * it listens again. Without a mic (denied or missing) the whole turn is simulated, with a one-line note.
 *
 * The real model replaces `reply()` below: it would stream the agent's audio and its state instead.
 */
export type Phase = 'off' | 'listening' | 'thinking' | 'speaking';
export interface Talk {
  phase: Phase;
  /** The mic, while talking with one. */
  stream: MediaStream | null;
  /** A plain note to show (no mic), or ''. */
  note: string;
}

const SPEECH = 0.035; // RMS above this counts as you speaking
const PAUSE_MS = 900; // this long below it after speaking ends your turn
const THINK_MS = 1100;
const REPLY_MS = 3600;
const SIM_TURN_MS = 3000; // without a mic: how long "you" speak

const store = createStore<Talk>({ phase: 'off', stream: null, note: '' });
const set = store.set;
/** Each Talk is a new session; ending (or starting again) makes an older one's pending mic request stale. */
let session = 0;
let starting = false;

let ctx: AudioContext | null = null;
let timer = 0;
let poll = 0;
let rms = 0;

function after(ms: number, fn: () => void) { clearTimeout(timer); timer = window.setTimeout(fn, ms); }

/** The agent's turn: think, then speak, then hand the turn back. */
function reply() {
  set({ phase: 'thinking' });
  after(THINK_MS, () => {
    set({ phase: 'speaking' });
    after(REPLY_MS, listen);
  });
}

/** Your turn: with a mic, until you speak and then pause; without one, a simulated turn. */
function listen() {
  set({ phase: 'listening' });
  if (!store.get().stream) after(SIM_TURN_MS, reply);
}

/** Watches the mic for the end of your turn (speech, then a pause). */
function watch(stream: MediaStream) {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  let spoke = false, quietSince = 0;
  poll = window.setInterval(() => {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    rms = Math.sqrt(sum / buf.length);
    if (store.get().phase !== 'listening') { spoke = false; return; }
    const now = performance.now();
    if (rms > SPEECH) { spoke = true; quietSince = now; }
    else if (spoke && now - quietSince > PAUSE_MS) { spoke = false; reply(); }
  }, 50);
}

/** Talk: asks for the mic (on click only), then starts with your turn. */
export async function startTalk() {
  if (store.get().phase !== 'off' || starting) return;
  const id = ++session;
  starting = true;
  let stream: MediaStream | null = null;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { stream = null; }
  starting = false;
  // Ended (or left) while the browser asked for the mic: release it and stay off.
  if (id !== session) { stream?.getTracks().forEach(t => t.stop()); return; }
  set({ stream, note: stream ? '' : 'No microphone, so this is a simulated conversation.' });
  if (stream) watch(stream);
  listen();
}

/** End: stops the conversation and releases the mic. */
export function endTalk() {
  session++;
  starting = false;
  clearTimeout(timer);
  clearInterval(poll);
  store.get().stream?.getTracks().forEach(t => t.stop());
  void ctx?.close();
  ctx = null;
  rms = 0;
  set({ phase: 'off', stream: null, note: '' });
}

export const useTalk = store.use;
