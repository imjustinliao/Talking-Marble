import { useCallback, useEffect, useRef, useState } from 'react';
import { createEnvelope, hasSpeech, primeSpeech, say } from './speech';

export type Voice = 'none' | 'speech' | 'mic' | 'simulated';
export type Phase = 'ready' | 'running' | 'done';
export interface Line { who: 'Marble' | 'You'; text: string; lit: number; simulated?: boolean }

const LINES = {
  ask: "Hi, I'm Talking Marble. What are you building today?",
  simulated: "I'm building a voice assistant for my app.",
  answer: 'Nice. I can be its face: I listen while you talk, think while it works, and speak with its voice. Spin the words beside me to change my mood.',
};

/**
 * The guided conversation: the marble asks (the browser's voice, captions lighting word by word), you answer
 * (your mic, or a simulated voice), it thinks, it answers. Nothing leaves the browser.
 */
export function useConversation() {
  const [state, setState] = useState('idle');
  const [phase, setPhase] = useState<Phase>('ready');
  const [voice, setVoice] = useState<Voice>('none');
  const [line, setLine] = useState<Line | null>(null);
  const [note, setNote] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const envelope = useRef(createEnvelope()).current;
  const abort = useRef<AbortController | null>(null);
  const doneListening = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    doneListening.current?.();
    setStream(null);
    setVoice('none');
    setLine(null);
    setPhase(p => (p === 'running' ? 'done' : p));
  }, []);
  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    stop();
    primeSpeech(); // inside the click: iOS speaks only after a gesture
    const controller = new AbortController();
    abort.current = controller;
    const { signal } = controller;
    const wait = (ms: number) => new Promise<void>(r => {
      const t = setTimeout(r, ms);
      signal.addEventListener('abort', () => { clearTimeout(t); r(); }, { once: true });
    });
    setPhase('running');
    setNote(hasSpeech() ? '' : 'This browser has no speech voice, so the marble talks in captions.');

    // Ask for the mic now (this click) and carry on while the prompt is open. Whatever arrives after an end is stopped.
    const mic: Promise<MediaStream | null> = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null)
      : Promise.resolve(null);
    const release = (s: MediaStream | null) => s?.getTracks().forEach(t => t.stop());
    signal.addEventListener('abort', () => { void mic.then(release); }, { once: true });

    const speak = async (text: string) => {
      setState('speaking');
      setVoice('speech');
      envelope.reset();
      setLine({ who: 'Marble', text, lit: 0 });
      await say(text, {
        signal,
        onWord: (i, letters) => { envelope.pulse(letters); setLine(l => (l ? { ...l, lit: Math.max(l.lit, i + 1) } : l)); },
      });
      if (!signal.aborted) setVoice('none');
    };

    setState('connecting');
    setLine(null);
    await wait(1100);
    if (signal.aborted) return;
    await speak(LINES.ask);
    if (signal.aborted) return;

    const micStream = await mic;
    if (signal.aborted) return;
    setState('listening');
    if (micStream) {
      setStream(micStream);
      setVoice('mic');
      setLine({ who: 'You', text: 'Listening… tell it what you are building, then press Done.', lit: Infinity });
      await Promise.race([wait(9000), new Promise<void>(r => { doneListening.current = r; })]);
      doneListening.current = null;
      release(micStream);
      setStream(null);
    } else {
      setNote(n => n || 'No microphone, so a simulated voice answers for you.');
      setVoice('simulated');
      setLine({ who: 'You', text: LINES.simulated, lit: Infinity, simulated: true });
      await wait(3200);
    }
    if (signal.aborted) return;
    setVoice('none');
    setState('thinking');
    setLine(null);
    await wait(1500);
    if (signal.aborted) return;
    await speak(LINES.answer);
    if (signal.aborted) return;
    setState('idle');
    setPhase('done');
    abort.current = null;
  }, [envelope, stop]);

  const done = useCallback(() => doneListening.current?.(), []);
  return { state, setState, phase, voice, line, note, stream, envelope, start, stop, done };
}
