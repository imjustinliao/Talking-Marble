import { CopyButton } from '../components/CopyButton';
import { PRESETS } from '../presets';
import { useSimulatedLevel } from '../simulated';
import { GITHUB } from '../ui/Chrome';
import { ArrowIcon } from '../ui/icons';
import { LiveMarble } from '../ui/LiveMarble';

const INSTALL = 'npm i talking-marble';

/** The marble, one plain line, the install command and two links. */
export function Hero() {
  const level = useSimulatedLevel(true);
  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <LiveMarble size={280} className="hero__marble" state="speaking" presets={PRESETS} level={level} />
      <h1 id="hero-title" className="hero__title">Talking Marble</h1>
      <p className="hero__line">An audio-reactive orb for voice AI apps. React, open source.</p>
      <div className="hero__actions">
        <CopyButton className="install-pill" text={INSTALL} what="install command" label={<code>{INSTALL}</code>} />
      </div>
      <nav className="hero__links" aria-label="Get started">
        <a className="btn btn--primary" href={`${import.meta.env.BASE_URL}docs/`}>Docs<ArrowIcon /></a>
        <a className="btn" href={GITHUB}>GitHub</a>
      </nav>
    </section>
  );
}
