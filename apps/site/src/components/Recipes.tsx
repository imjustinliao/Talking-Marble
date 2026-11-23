import { Code } from './Code';

// Checked against each SDK's docs and source on 2026-11-23: @openai/agents-realtime 0.22,
// @elevenlabs/react 1.23, @livekit/components-react 2.9. See docs/milestones/site.md for sources.

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
import { useVoiceAssistant, type AgentState } from '@livekit/components-react';
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

// Inside your <LiveKitRoom> (or RoomContext provider).
export function Assistant() {
  const { state, audioTrack } = useVoiceAssistant();

  // The agent's audio track, as a MediaStream for the orb.
  const track = audioTrack?.publication.track?.mediaStreamTrack;
  const audio = useMemo(() => (track ? new MediaStream([track]) : null), [track]);

  return <TalkingMarble state={STATE[state]} audio={audio} />;
}`;

export function Recipes() {
  return (
    <>
      <p>
        Each recipe maps the SDK&apos;s agent state to the orb&apos;s six states and hands it the agent&apos;s audio.
        APIs move quickly: check your SDK version&apos;s docs if a name differs.
      </p>

      <h3 id="recipe-openai">OpenAI Realtime</h3>
      <p>
        With the Agents SDK (<code>@openai/agents-realtime</code>) over WebRTC, the agent&apos;s voice arrives as a remote{' '}
        <code>MediaStream</code>. The state comes from the raw Realtime server events, re-emitted as{' '}
        <code>transport_event</code>: the SDK&apos;s own <code>audio_start</code> does not fire over WebRTC.
      </p>
      <Code title="OpenAI Realtime (Agents SDK)" lang="tsx" code={OPENAI} />
      <Code title="OpenAI Realtime (plain WebRTC)" lang="ts" code={OPENAI_WEBRTC} />
      <p className="callout">
        <code>output_audio_buffer.started</code> and <code>.stopped</code> are WebRTC-only events that mark when the agent&apos;s
        audio starts and finishes playing. If your setup does not send them, switch to <code>speaking</code> on{' '}
        <code>response.created</code> and back to <code>listening</code> on <code>response.done</code>.
      </p>

      <h3 id="recipe-elevenlabs">ElevenLabs Agents</h3>
      <p>
        <code>@elevenlabs/react</code> reports <code>status</code> (disconnected, connecting, connected, error) and{' '}
        <code>mode</code> (speaking or listening). It does not expose the agent&apos;s audio as a stream, so pass its volume as{' '}
        <code>level</code>. There is no thinking signal, so the orb goes from listening to speaking.
      </p>
      <Code title="ElevenLabs Agents" lang="tsx" code={ELEVENLABS} />

      <h3 id="recipe-livekit">LiveKit Agents</h3>
      <p>
        <code>useVoiceAssistant()</code> from <code>@livekit/components-react</code> returns the agent&apos;s state, whose names
        mostly match the orb&apos;s, and its audio track. The newer <code>useAgent()</code> hook has the same states and calls the
        track <code>microphoneTrack</code>.
      </p>
      <Code title="LiveKit Agents" lang="tsx" code={LIVEKIT} />
    </>
  );
}
