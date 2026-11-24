import { Marble } from '../scene/shot';
import { MicIcon, PhoneOffIcon, PlusIcon, SendIcon } from './icons';

export type MockKind = 'call' | 'bar' | 'message';
export const MOCKS: { id: MockKind; label: string }[] = [
  { id: 'call', label: 'Call' },
  { id: 'bar', label: 'Chat bar' },
  { id: 'message', label: 'Message' },
];

const STATUS: Record<string, string> = { listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking…' };

/**
 * The marble inside an everyday voice-AI interface, live (F-22: shown while you talk). Pictures of UIs: nothing in
 * them is interactive. Its small marble wears the palette it is given and does what the big one does.
 */
export function Mock({ kind, state, level, audio, palette }: {
  kind: MockKind; state: string; level?: number; audio?: MediaStream | null; palette: readonly string[];
}) {
  const orb = (size: number) => <Marble size={size} state={state} level={audio ? undefined : level} audio={audio ?? null} palette={palette as string[]} decorative />;
  if (kind === 'bar') {
    return (
      <div className="mock mock--input" aria-hidden="true">
        <span className="mock__bar">
          <span className="mock__round mock__round--plain"><PlusIcon /></span>
          <span className="mock__placeholder">Ask anything</span>
          <span className="mock__round mock__round--plain"><MicIcon /></span>
          <span className="mock__voice">{orb(30)}<span>{STATUS[state]?.replace('…', '') ?? 'Voice'}</span></span>
        </span>
      </div>
    );
  }
  if (kind === 'message') {
    return (
      <div className="mock mock--chat" aria-hidden="true">
        <span className="mock__bubble mock__bubble--user">What’s the weather tomorrow?</span>
        <span className="mock__reply">
          {orb(24)}
          <span className="mock__bubble">{state === 'speaking' ? 'Sunny, with a light wind.' : STATUS[state] ?? '…'}</span>
        </span>
        <span className="mock__composer"><span>Message</span><span className="mock__round mock__round--send"><SendIcon /></span></span>
      </div>
    );
  }
  return (
    <div className="mock mock--call" aria-hidden="true">
      <span className="mock__who">Assistant</span>
      {orb(132)}
      <span className="mock__status">{STATUS[state] ?? ''}</span>
      <span className="mock__controls">
        <span className="mock__round"><MicIcon /></span>
        <span className="mock__round mock__round--end"><PhoneOffIcon /></span>
      </span>
    </div>
  );
}
