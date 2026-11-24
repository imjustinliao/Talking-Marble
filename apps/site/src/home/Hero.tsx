import { useEffect, useState } from 'react';
import { CopyButton } from '../components/CopyButton';
import { LinkButtons } from '../ui/Chrome';
import { MarbleText } from '../ui/MarbleText';
import { useShotLive } from '../scene/shot';
import { useStageWish } from '../scene/stage';

const INSTALL = 'npm i talking-marble';
/** The opening loop: a voice agent's happy path, a lookup included. `error` is shown where states are chosen, not here. */
export const HERO_CYCLE = ['idle', 'connecting', 'listening', 'thinking', 'searching', 'speaking'] as const;
const STEP_MS = 4200;
const CAPTION: Record<(typeof HERO_CYCLE)[number], string> = { idle: 'Idle', connecting: 'Connecting', listening: 'Listening', thinking: 'Thinking', searching: 'Searching', speaking: 'Speaking' };

/**
 * The intro, complete on its own (F-22): the name, one plain line, the install command, and Docs and GitHub as
 * buttons (F-26). Everything below is the experience; nothing asks you to scroll (F-25). The marble is the stage's.
 */
export function Hero() {
  const live = useShotLive();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setI(n => (n + 1) % HERO_CYCLE.length), STEP_MS);
    return () => clearInterval(t);
  }, [live]);
  useStageWish('top', { state: HERO_CYCLE[i]!, caption: CAPTION[HERO_CYCLE[i]!], voice: { kind: 'sim' } });
  return (
    <div className="hero">
      <h1 id="top-title" className="hero__title">Talking <MarbleText text="Marble" className="hero__marble" /></h1>
      <p className="hero__line">An audio-reactive orb for voice AI apps. React, open source.</p>
      <div className="hero__actions">
        <CopyButton className="install-pill" text={INSTALL} what="install command" label={<code>{INSTALL}</code>} />
      </div>
      <LinkButtons />
    </div>
  );
}
