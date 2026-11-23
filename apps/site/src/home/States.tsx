import { useState } from 'react';
import { resolveState } from 'talking-marble';
import { PRESETS, STATES } from '../presets';
import { useSimulatedLevel } from '../simulated';
import { LiveMarble } from '../ui/LiveMarble';

/** A marble that moves with a simulated voice when its state listens. */
function Voiced({ state, size, label }: { state: string; size: number; label?: string }) {
  const listens = resolveState(state, PRESETS).levelResponse > 0;
  const level = useSimulatedLevel(listens);
  return <LiveMarble size={size} state={state} presets={PRESETS} level={listens ? level : 0} aria-label={label} />;
}

/** Every state and emotion, live: one large preview, a grid of cards to choose from, and the small inline pills. */
export function States() {
  const [selected, setSelected] = useState('speaking');
  const info = STATES.find(s => s.name === selected)!;
  return (
    <section id="states" className="section" aria-labelledby="states-title">
      <header className="section__head">
        <h2 id="states-title">States</h2>
        <p>Six states for the voice agent lifecycle, and emotions as presets. Pass your SDK’s state straight in.</p>
      </header>

      <div className="states">
        <figure className="card states__preview">
          <Voiced state={selected} size={220} label={`Talking Marble, ${selected}`} />
          <figcaption>
            <code className="states__name">state="{selected}"</code>
            <span>{info.line}</span>
          </figcaption>
        </figure>

        <div className="states__grid" role="group" aria-label="Choose a state or emotion">
          {STATES.map(s => (
            <button
              key={s.name}
              type="button"
              className="card state-card"
              aria-describedby={`state-${s.name}`}
              aria-pressed={selected === s.name}
              onClick={() => setSelected(s.name)}
            >
              <Voiced state={s.name} size={72} />
              <span className="state-card__name">{s.name}</span>
              <span className="state-card__kind" aria-hidden="true">{s.kind}</span>
            </button>
          ))}
          {/* Descriptions for the cards (aria-describedby), outside them so each card's name is just the state */}
          {STATES.map(s => <span key={s.name} id={`state-${s.name}`} hidden>{s.line}</span>)}
        </div>
      </div>

      <ul className="pills" aria-label="Inline status">
        {STATES.filter(s => s.pill).map(s => (
          <li key={s.name} className="pill">
            <Voiced state={s.name} size={20} />
            <span>{s.pill}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
