import type { ReactNode } from 'react';
import { Code } from './Code';

// Checked against each SDK's published types and official docs on 2026-11-23: @openai/agents-realtime 0.22.0,
// @elevenlabs/react 1.24.0, @livekit/components-react 2.9.26 (with livekit-client 2.25.0). The report with every
// claim checked and its sources is in docs/architecture.md › Voice SDK recipes.

const OPENAI = `import { useState } from 'react';
import { RealtimeAgent, RealtimeSession, OpenAIRealtimeWebRTC } from '@openai/agents-realtime';
import { TalkingMarble, type OrbState } from 'talking-marble';

export function Assistant() {
  const [state, setState] = useState<OrbState>('idle');
  const [audio, setAudio] = useState<MediaStream | null>(null);

  async function start(ephemeralKey: string) {
    const transport = new OpenAIRealtimeWebRTC({
      // Catch the agent's remote audio stream as it arrives.
      changePeerConnection: pc => {
        pc.addEventListener('track', e => setAudio(e.streams[0] ?? null));
        return pc;
      },
    });
    const session = new RealtimeSession(new RealtimeAgent({ name: 'Assistant' }), { transport });

    // Raw Realtime server events drive the state.
    session.on('transport_event', event => {
      switch (event.type) {
        case 'input_audio_buffer.speech_started': setState('listening'); break;
        case 'input_audio_buffer.speech_stopped':
        case 'response.created': setState('thinking'); break;
        case 'output_audio_buffer.started': setState('speaking'); break;
        case 'output_audio_buffer.stopped':
        case 'output_audio_buffer.cleared': setState('listening'); break;
      }
    });
    session.on('error', () => setState('error'));

    setState('connecting');
    await session.connect({ apiKey: ephemeralKey }); // a client secret minted by your server
    setState('listening');
  }

  return <TalkingMarble state={state} audio={audio} />;
}`;

const OPENAI_WEBRTC = `// Without the Agents SDK: your own RTCPeerConnection and "oai-events" data channel.
pc.ontrack = e => { audioEl.srcObject = e.streams[0]; setAudio(e.streams[0]); };
dc.onmessage = m => handleEvent(JSON.parse(m.data)); // the same switch on event.type as above`;

const ELEVENLABS = `import { useEffect, useState } from 'react';
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { TalkingMarble, type OrbState } from 'talking-marble';

export function App() {
  return (
    <ConversationProvider agentId="your-agent-id">
      <Assistant />
    </ConversationProvider>
  );
}

function Assistant() {
  const { status, mode, startSession, getInputVolume, getOutputVolume } = useConversation();

  // The SDK exposes volumes (0–1), not a stream: poll them into \`level\`.
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (status !== 'connected') { setLevel(0); return; }
    let id = 0;
    const tick = () => {
      setLevel(mode === 'speaking' ? getOutputVolume() : getInputVolume());
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [status, mode, getInputVolume, getOutputVolume]);

  const state: OrbState =
    status === 'error' ? 'error'
    : status === 'connecting' ? 'connecting'
    : status === 'connected' ? (mode === 'speaking' ? 'speaking' : 'listening')
    : 'idle';

  return (
    <>
      <TalkingMarble state={state} level={level} />
      <button onClick={() => startSession({ connectionType: 'webrtc' })}>Talk</button>
    </>
  );
}`;

const LIVEKIT = `import { useMemo } from 'react';
import { RoomAudioRenderer, SessionProvider, useAgent, useSession, type AgentState } from '@livekit/components-react';
import { TokenSource } from 'livekit-client';
import { TalkingMarble, type OrbState } from 'talking-marble';

const STATE: Record<AgentState, OrbState> = {
  disconnected: 'idle',
  connecting: 'connecting',
  initializing: 'connecting',
  'pre-connect-buffering': 'listening',
  idle: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  speaking: 'speaking',
  failed: 'error',
};

const tokenSource = TokenSource.endpoint('/api/token'); // your token server

export function App() {
  const session = useSession(tokenSource, { agentName: 'my-agent' });
  return (
    <SessionProvider session={session}>
      <Assistant />
      <RoomAudioRenderer />
      <button onClick={() => session.start()}>Talk</button>
    </SessionProvider>
  );
}

function Assistant() {
  const { state, microphoneTrack } = useAgent();

  // The agent's voice track, as a MediaStream for the orb.
  const track = microphoneTrack?.publication.track?.mediaStreamTrack;
  const audio = useMemo(() => (track ? new MediaStream([track]) : null), [track]);

  return <TalkingMarble state={STATE[state]} audio={audio} />;
}`;

/** One SDK recipe: what the docs say about it, the one line the Install shot shows, and its code. */
export interface Recipe {
  id: 'livekit' | 'elevenlabs' | 'openai';
  name: string;
  /** Its heading in the docs. */
  title: string;
  /** The packages to install with it. */
  install: string;
  /** One plain line for the Install shot. */
  line: string;
  code: string;
}

export const RECIPES: Recipe[] = [
  {
    id: 'livekit', name: 'LiveKit', title: 'LiveKit Agents', install: 'npm i talking-marble @livekit/components-react livekit-client',
    line: 'useAgent() gives the agent’s state and its voice track.',
    code: LIVEKIT,
  },
  {
    id: 'elevenlabs', name: 'ElevenLabs', title: 'ElevenLabs Agents', install: 'npm i talking-marble @elevenlabs/react',
    line: 'Status and mode give the state; the SDK’s volume becomes the level.',
    code: ELEVENLABS,
  },
  {
    id: 'openai', name: 'OpenAI Realtime', title: 'OpenAI Realtime', install: 'npm i talking-marble @openai/agents-realtime',
    line: 'Realtime events give the state; the remote WebRTC stream is the audio.',
    code: OPENAI,
  },
];

/** A recipe's code with its install line on top. */
export const withInstall = (r: Recipe) => `// ${r.install}\n\n${r.code}`;

const NOTES: Record<Recipe['id'], ReactNode> = {
  livekit: (
    <p>
      LiveKit&apos;s current React setup: <code>useSession</code> with a token source, <code>SessionProvider</code>, and{' '}
      <code>useAgent()</code>, which returns the agent&apos;s state (the names mostly match the orb&apos;s) and its voice as{' '}
      <code>microphoneTrack</code>. With the older <code>&lt;LiveKitRoom&gt;</code>, <code>useVoiceAssistant()</code> gives the same
      states and calls the track <code>audioTrack</code>.
    </p>
  ),
  elevenlabs: (
    <p>
      <code>@elevenlabs/react</code> reports <code>status</code> (disconnected, connecting, connected, error) and{' '}
      <code>mode</code> (speaking or listening). It does not expose the agent&apos;s audio as a stream, so pass its volume as{' '}
      <code>level</code>. There is no thinking signal, so the orb goes from listening to speaking.
    </p>
  ),
  openai: (
    <>
      <p>
        With the Agents SDK (<code>@openai/agents-realtime</code>) over WebRTC, the agent&apos;s voice arrives as a remote{' '}
        <code>MediaStream</code>. The state comes from the raw Realtime server events, re-emitted as{' '}
        <code>transport_event</code>: the SDK&apos;s own <code>audio_start</code> does not fire over WebRTC.
      </p>
    </>
  ),
};

const AFTER: Partial<Record<Recipe['id'], ReactNode>> = {
  openai: (
    <>
      <Code title="OpenAI Realtime (plain WebRTC)" lang="ts" code={OPENAI_WEBRTC} />
      <p className="callout">
        <code>output_audio_buffer.started</code> and <code>.stopped</code> are WebRTC-only events that mark when the agent&apos;s
        audio starts and finishes playing. If your setup does not send them, switch to <code>speaking</code> on{' '}
        <code>response.created</code> and back to <code>listening</code> on <code>response.done</code>.
      </p>
    </>
  ),
};

/** Every recipe, with its notes: the docs page's Recipes section. */
export function Recipes() {
  return (
    <>
      <p>
        Each recipe maps the SDK&apos;s agent state to the orb&apos;s states and hands it the agent&apos;s audio.
        APIs move quickly: check your SDK version&apos;s docs if a name differs.
      </p>
      {RECIPES.map(r => (
        <div key={r.id}>
          <h3 id={`recipe-${r.id}`}>{r.title}</h3>
          {NOTES[r.id]}
          <Code title={r.title} lang="tsx" code={withInstall(r)} />
          {AFTER[r.id]}
        </div>
      ))}
    </>
  );
}
