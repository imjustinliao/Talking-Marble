import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Code } from '../components/Code';
import { CopyButton } from '../components/CopyButton';
import type { useConversation } from '../demo/useConversation';
import { WordDrum } from '../demo/WordDrum';
import { words } from '../demo/speech';
import { COLOR_LABELS, PALETTE_IDS, colorsOf, isEdited, paletteLabel, orbProps, type Edits, type PaletteId } from '../palettes';
import type { ShotId } from '../scene/camera';
import { GITHUB, NPM } from '../ui/Chrome';
import { ColorPicker } from '../ui/ColorPicker';
import { ArrowIcon, CodeIcon, LeftIcon, PlayIcon, ResetIcon, RightIcon } from '../ui/icons';

export const DRUM = [
  ...['idle', 'connecting', 'listening', 'thinking', 'speaking', 'error'].map(value => ({ value, group: 'state' })),
  ...['happy', 'calm', 'muted'].map(value => ({ value, group: 'emotion' })),
] as const;
const INSTALL = 'npm i talking-marble';

/** A shot's words and controls: fixed over the scene, present only while the shot is on screen. */
export function Shot({ id, active, children, register }: { id: ShotId; active: ShotId; children: ReactNode; register: (id: ShotId, el: HTMLElement | null) => void }) {
  const on = active === id;
  return (
    <section
      id={id}
      ref={el => register(id, el)}
      className={`shot shot--${id} ${on ? 'is-on' : ''}`}
      aria-labelledby={`${id}-title`}
      inert={!on || undefined}
      aria-hidden={!on || undefined}
      style={{ opacity: 0 }}
    >
      {children}
    </section>
  );
}

/** Shot 1: the name, one line, and the two ways in: talk to it, or install it. */
export function HeroShot({ onTalk }: { onTalk: () => void }) {
  const [usage, setUsage] = useState(false);
  const name = 'Talking Marble';
  return (
    <div className="hero">
      <h1 id="intro-title" className="display hero__title" aria-label={name}>
        {[...name].map((c, i) => <span key={i} className="hero__letter" style={{ ['--i' as string]: i }} aria-hidden="true">{c === ' ' ? ' ' : c}</span>)}
      </h1>
      <p className="hero__line">A marble that listens and talks, for your voice&nbsp;AI.</p>
      <div className="hero__actions">
        <button type="button" className="btn btn--light" onClick={onTalk}><PlayIcon />Talk to it</button>
        <div className="install-pill liquid">
          <code>{INSTALL}</code>
          <CopyButton text={INSTALL} what="install command" />
          <button type="button" className="icon-btn" aria-expanded={usage} aria-controls="hero-usage" aria-label="Usage" title="Usage" onClick={() => setUsage(u => !u)}>
            <CodeIcon />
          </button>
        </div>
      </div>
      <div id="hero-usage" className="hero__usage" hidden={!usage}>
        <Code title="Usage" lang="tsx" code={`import { TalkingMarble } from 'talking-marble';\n\n<TalkingMarble state={agentState} audio={agentStream} />`} />
      </div>
    </div>
  );
}

/** Shot 2: walking the palettes; the one in front can be recoloured, and reset. */
export function ColorsShot({ step, edits, setEdits, onStep }: { step: number; edits: Edits; setEdits: (fn: (e: Edits) => Edits) => void; onStep: (to: number) => void }) {
  const id = PALETTE_IDS[step]!;
  const colors = colorsOf(id, edits);
  const edited = isEdited(id, edits);
  const setColor = (i: number, value: string) => setEdits(e => {
    const next = [...colorsOf(id, e)] as typeof colors;
    next[i] = value;
    return { ...e, [id]: next };
  });
  const reset = () => setEdits(e => { const next = { ...e }; delete next[id]; return next; });
  return (
    <div className="panel glass colors">
      <h2 id="colors-title" className="panel__title">Colors</h2>
      <div className="colors__head">
        <p className="display colors__name" aria-live="polite">{paletteLabel(id)}</p>
        <div className="colors__nav">
          <button type="button" className="icon-btn icon-btn--ring liquid" aria-label="Previous palette" onClick={() => onStep(step - 1)} disabled={step === 0}><LeftIcon /></button>
          <button type="button" className="icon-btn icon-btn--ring liquid" aria-label="Next palette" onClick={() => onStep(step + 1)} disabled={step === PALETTE_IDS.length - 1}><RightIcon /></button>
        </div>
      </div>
      <p className="panel__line">{id === 'yours' ? 'Start from anything. Four colors make a marble.' : 'A ground and three pigments. Change any of them.'}</p>
      <div className="colors__swatches">
        {COLOR_LABELS.map((label, i) => <ColorPicker key={label} label={label} value={colors[i]!} onChange={hex => setColor(i, hex)} />)}
      </div>
      <div className="panel__actions">
        <button type="button" className="btn btn--ghost liquid" onClick={reset} disabled={!edited}><ResetIcon />Reset</button>
      </div>
    </div>
  );
}

/** Shot 3: the whole curve at once; pick the marble to take into the demo. */
export function PickShot({ chosen, edits, onTry }: { chosen: PaletteId; edits: Edits; onTry: () => void }) {
  return (
    <div className="pick">
      <h2 id="pick-title" className="display pick__title">Pick one</h2>
      <p className="pick__line"><span className="pick__dot" style={{ background: colorsOf(chosen, edits)[1] }} aria-hidden="true" />{paletteLabel(chosen)}{isEdited(chosen, edits) && chosen !== 'yours' ? ' (edited)' : ''}</p>
      <button type="button" className="btn btn--light" onClick={onTry}><PlayIcon />Try it</button>
    </div>
  );
}

export function TalkShot({ talk, onPick }: { talk: ReturnType<typeof useConversation>; onPick: (v: string) => void }) {
  const { phase, line, note, voice } = talk;
  const startRef = useRef<HTMLButtonElement>(null);
  const prev = useRef(phase);
  // When the conversation ends (by itself, End or Esc), keyboard focus returns to the start button.
  useEffect(() => {
    const a = document.activeElement;
    if (prev.current === 'running' && phase !== 'running' && (!a || a === document.body || a.closest('.shot--talk'))) startRef.current?.focus({ preventScroll: true });
    prev.current = phase;
  }, [phase]);
  useEffect(() => {
    if (phase !== 'running') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') talk.stop(); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [phase, talk]);
  const lineWords = line ? words(line.text) : [];
  return (
    <div className="talk">
      <h2 id="talk-title" className="display talk__title">Talk to it</h2>
      <div className="talk__body">
        <div className="talk__words">
          <p className="sr-only" aria-live="polite">{line ? `${line.who}: ${line.text}` : ''}</p>
          {phase === 'running' ? (
            <div className="caption" aria-hidden="true" data-who={line?.who ?? ''}>
              <span className="caption__who label">{line ? `${line.who}${line.simulated ? ' · simulated' : ''}` : '…'}</span>
              <p className="caption__text">
                {lineWords.map((w, i) => <span key={i} className={`caption__word ${i < (line?.lit ?? 0) ? 'is-lit' : ''}`}>{w} </span>)}
              </p>
            </div>
          ) : (
            <p className="talk__line">It asks, you answer, it thinks, it answers. Spin the words to change its mood.</p>
          )}
          <div className="talk__actions">
            {phase === 'running' ? (
              <>
                {voice === 'mic' && <button type="button" className="btn btn--light" onClick={talk.done}>Done</button>}
                <button type="button" className="btn btn--ghost liquid" onClick={talk.stop}>End</button>
              </>
            ) : (
              <button ref={startRef} type="button" className="btn btn--light" onClick={() => void talk.start()}><PlayIcon />{phase === 'done' ? 'Again' : 'Start'}</button>
            )}
          </div>
          <p className="talk__note" role="status">{note}</p>
          <p className="fine">Uses your mic only while you talk. Nothing leaves your browser.</p>
        </div>
        <WordDrum items={DRUM} value={talk.state} onChange={onPick} label="Pick a state or emotion" />
      </div>
    </div>
  );
}

/** Shot 5: install, with the marble you picked. */
export function InstallShot({ chosen, edits }: { chosen: PaletteId; edits: Edits }) {
  const code = `npm i talking-marble\n\nimport { TalkingMarble } from 'talking-marble';\n\n${orbProps({ palette: chosen, edits }).jsx}`;
  return (
    <div className="install">
      <h2 id="install-title" className="display install__title">Get started</h2>
      <Code title="Your marble" lang="tsx" code={code} />
      <nav className="install__links" aria-label="More">
        <a className="btn btn--light" href={`${import.meta.env.BASE_URL}docs/`}>Docs<ArrowIcon /></a>
        <a className="btn btn--ghost liquid" href={GITHUB}>GitHub</a>
        <a className="btn btn--ghost liquid" href={NPM}>npm</a>
      </nav>
      <p className="install__footer fine">MIT © Justin Liao</p>
    </div>
  );
}
