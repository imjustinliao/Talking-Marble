let shared: AudioContext | null = null;
/** The context a gesture listener is armed for, if any. */
let armedFor: AudioContext | null = null;

// Gestures that grant audio activation; on touch devices pointerdown does not, the matching up and click do.
const GESTURES = ['pointerup', 'touchend', 'click', 'keydown'] as const;

/**
 * Resumes the context on user gestures until it is running (autoplay policies block it until then).
 * Listeners stay until a resume succeeds, so a gesture that does not grant activation is not wasted.
 */
function resumeOnGesture(context: AudioContext) {
  if (armedFor === context || typeof window === 'undefined') return;
  disarm();
  armedFor = context;
  for (const type of GESTURES) window.addEventListener(type, onGesture, true);
}
function disarm() {
  if (typeof window !== 'undefined') for (const type of GESTURES) window.removeEventListener(type, onGesture, true);
  armedFor = null;
}
function onGesture() {
  const context = armedFor;
  if (!context || context.state === 'closed') { disarm(); return; }
  if (context.state === 'running') { disarm(); return; }
  context.resume().then(() => { if (context.state === 'running' && armedFor === context) disarm(); }, () => {});
}

/** Waiting states: `suspended`, and Safari's `interrupted` (calls, other audio apps). */
const blocked = (context: AudioContext) => (context.state as string) === 'suspended' || (context.state as string) === 'interrupted';

/** The one AudioContext all orbs share, created on first use; null where Web Audio is missing. */
export function sharedAudioContext(): AudioContext | null {
  if (shared && shared.state !== 'closed') {
    if (blocked(shared)) resumeOnGesture(shared);
    return shared;
  }
  const Context = typeof window === 'undefined' ? undefined : window.AudioContext;
  if (!Context) return null;
  const context = new Context();
  shared = context;
  // If the browser suspends it later (a call, a locked phone), wait for the next gesture again.
  context.addEventListener('statechange', () => { if (blocked(context)) resumeOnGesture(context); });
  if (blocked(context)) {
    // Succeeds when the page already had a gesture; otherwise the next one resumes it.
    context.resume().catch(() => {});
    resumeOnGesture(context);
  }
  return context;
}
