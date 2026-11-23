import { PRESETS } from '../presets';
import { useSimulatedLevel } from '../simulated';
import { MicIcon, PhoneOffIcon, PlusIcon, SendIcon } from '../ui/icons';
import { LiveMarble } from '../ui/LiveMarble';

/** The marble inside three everyday voice-AI interfaces. These are pictures of UIs: nothing in them is interactive. */
export function InContext() {
  const level = useSimulatedLevel(true);
  return (
    <section id="in-context" className="section" aria-labelledby="context-title">
      <header className="section__head">
        <h2 id="context-title">In context</h2>
        <p>The same component in a chat input, a call screen and a chat message.</p>
      </header>
      <div className="contexts">
        <figure className="card context">
          <div className="mock mock--input" aria-hidden="true">
            <span className="mock__bar">
              <span className="mock__round mock__round--plain"><PlusIcon /></span>
              <span className="mock__placeholder">Ask anything</span>
              <span className="mock__round mock__round--plain"><MicIcon /></span>
              <span className="mock__voice"><LiveMarble size={30} state="listening" presets={PRESETS} level={level * 0.8} /><span>Voice</span></span>
            </span>
          </div>
          <figcaption>Chat input with a voice button. <code>size={'{32}'}</code></figcaption>
        </figure>

        <figure className="card context">
          <div className="mock mock--call" aria-hidden="true">
            <span className="mock__who">Assistant</span>
            <span className="mock__time">0:42</span>
            <LiveMarble size={168} state="speaking" presets={PRESETS} level={level} />
            <span className="mock__status">Speaking…</span>
            <span className="mock__controls">
              <span className="mock__round"><MicIcon /></span>
              <span className="mock__round mock__round--end"><PhoneOffIcon /></span>
            </span>
          </div>
          <figcaption>Full-screen call. <code>size={'{168}'}</code></figcaption>
        </figure>

        <figure className="card context">
          <div className="mock mock--chat" aria-hidden="true">
            <span className="mock__bubble mock__bubble--user">What’s the weather tomorrow?</span>
            <span className="mock__reply">
              <LiveMarble size={24} state="thinking" presets={PRESETS} />
              <span className="mock__bubble">Checking the forecast for you…</span>
            </span>
            <span className="mock__composer"><span>Message</span><span className="mock__round mock__round--send"><SendIcon /></span></span>
          </div>
          <figcaption>Inline chat message. <code>size={'{24}'}</code></figcaption>
        </figure>
      </div>
    </section>
  );
}
