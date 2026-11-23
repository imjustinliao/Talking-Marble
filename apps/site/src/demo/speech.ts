/**
 * The marble's voice for the demo: the browser's own speechSynthesis. Each spoken word (its `boundary`
 * event) lights the next caption word and gives the level a syllable-like pulse. Where the browser has no
 * speech synthesis, never starts speaking, or sends no word boundaries (some voices), words advance on a
 * timer instead, so captions and the marble's motion still run. Nothing is sent anywhere.
 */

export interface SayOptions {
  /** A word started: its index in `words(text)`, and how long it is (letters). */
  onWord(index: number, letters: number): void;
  signal: AbortSignal;
}

export const words = (text: string) => text.split(/\s+/).filter(Boolean);
const WORDS_PER_SECOND = 2.6;

export const hasSpeech = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

// Chrome fills the voice list asynchronously: ask early, and keep the list current.
let voices: SpeechSynthesisVoice[] = [];
if (hasSpeech()) {
  voices = speechSynthesis.getVoices();
  speechSynthesis.addEventListener?.('voiceschanged', () => { voices = speechSynthesis.getVoices(); });
}

/** iOS Safari only speaks after a user gesture: call this inside the click that starts the demo. */
export function primeSpeech() {
  if (!hasSpeech()) return;
  try { speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch { /* nothing to prime */ }
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!voices.length) voices = speechSynthesis.getVoices();
  return voices.find(v => v.lang.startsWith('en') && v.localService) ?? voices.find(v => v.lang.startsWith('en')) ?? null;
}

/** Speaks `text` (or reads it on a timer) and resolves when done or aborted. */
export function say(text: string, { onWord, signal }: SayOptions): Promise<void> {
  const list = words(text);
  const starts: number[] = [];
  let at = 0;
  for (const w of list) { at = text.indexOf(w, at); starts.push(at); at += w.length; }

  return new Promise(resolve => {
    let next = 0, timer = 0, guard = 0, done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(timer); clearTimeout(guard);
      // Light whatever is left, so a caption never stops half-lit.
      while (next < list.length) { onWord(next, list[next]!.length); next++; }
      if (hasSpeech()) speechSynthesis.cancel();
      resolve();
    };
    const advanceTo = (index: number) => {
      while (next <= index && next < list.length) { onWord(next, list[next]!.length); next++; }
    };
    /** No speech, or speech without word events: words on a timer, ending after the last one. */
    const onTimer = () => {
      if (timer) return;
      timer = window.setInterval(() => {
        if (next >= list.length) {
          clearInterval(timer);
          // A voice may still be speaking (it just sent no word events): let it finish; the guard caps it.
          window.setTimeout(() => { if (!hasSpeech() || !speechSynthesis.speaking) finish(); }, 450);
          return;
        }
        advanceTo(next);
      }, 1000 / WORDS_PER_SECOND);
    };
    signal.addEventListener('abort', finish, { once: true });

    if (!hasSpeech()) { onTimer(); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.rate = 1;
    let sawBoundary = false;
    u.onboundary = e => {
      if (e.name && e.name !== 'word') return;
      sawBoundary = true;
      let index = starts.findIndex(s => s > e.charIndex) - 1;
      if (index < 0) index = e.charIndex >= (starts.at(-1) ?? 0) ? list.length - 1 : 0;
      advanceTo(index);
    };
    u.onstart = () => {
      // Some voices never send word boundaries: fall back to the timer if none came soon.
      window.setTimeout(() => { if (!sawBoundary && !done) onTimer(); }, 700);
    };
    u.onend = () => finish();
    u.onerror = () => onTimer();
    speechSynthesis.speak(u);
    // Never started (no voices, blocked, headless): use the timer.
    window.setTimeout(() => { if (!done && next === 0 && !sawBoundary && !speechSynthesis.speaking) onTimer(); }, 1200);
    // Never hang: a generous ceiling for the whole line.
    guard = window.setTimeout(finish, 4000 + (list.length / WORDS_PER_SECOND) * 1800);
  });
}

/**
 * A syllable-like level from word pulses: each word kicks the level up (longer words a little more) and
 * it decays between them, with a flutter at about syllable rate. Read it once per frame.
 */
export function createEnvelope() {
  let env = 0, phase = 0, last = 0, rate = 7;
  return {
    pulse(letters: number) {
      env = Math.min(1, Math.max(env, 0.5 + Math.min(letters, 10) * 0.045));
      rate = 5 + Math.min(letters, 8) * 0.6; // more letters, more syllables in the same time
    },
    read(now: number): number {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      env *= Math.exp(-dt * 4.2);
      phase += dt * rate * Math.PI * 2;
      return Math.max(0, Math.min(1, env * (0.72 + 0.28 * Math.sin(phase))));
    },
    reset() { env = 0; },
  };
}
