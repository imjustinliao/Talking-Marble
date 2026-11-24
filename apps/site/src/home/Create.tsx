import { useEffect, useState } from 'react';
import { CopyButton } from '../components/CopyButton';
import { MOTION, NAME, designFrom, exportJson, type Design } from '../create/model';
import { COLOR_LABELS, type Colors } from '../palettes';
import { STATES, orbFor } from '../presets';
import { mineColors, mineJsx, minePreset, setMine, useMine } from '../scene/mine';
import { useShotLive } from '../scene/shot';
import { useStageWish } from '../scene/stage';
import { endTalk, startTalk, useTalk } from '../scene/talk';
import { ColorPicker } from '../ui/ColorPicker';
import { Switch, useGlide } from '../ui/Controls';
import { MicIcon, ResetIcon } from '../ui/icons';

const STEPS = ['Colours', 'Motion', 'Try it', 'Code'] as const;
type Step = (typeof STEPS)[number];
const STATE_NAMES = STATES.filter(s => s.kind === 'state').map(s => s.name);
const EMOTIONS = [null, ...STATES.filter(s => s.kind === 'emotion').map(s => s.name)];
const BUILT_IN = STATES.map(s => s.name);
const PHASE: Record<string, string> = { listening: 'Listening. Speak, then pause.', thinking: 'Thinking…', speaking: 'Speaking. A simulated reply for now.' };

/**
 * Create your own (F-22): the stage marble, large, starts as a plain globe (F-61) and becomes yours. Two levels
 * (F-63): the steps, a switch bar (F-62) with one always chosen, Colours first (F-70); only the chosen step shows
 * below it, so nothing is shown all at once. Colours; Motion (its own state, a few plain dials); Try it (every
 * state and emotion, yours included, the halo's strength, and Talk, as on the walk); Code.
 */
export function Create() {
  const mine = useMine();
  const talk = useTalk();
  const live = useShotLive();
  const [step, setStep] = useState<Step>('Colours');
  const { bar, glide } = useGlide(step);
  const [state, setState] = useState<string>('speaking');
  const [emotion, setEmotion] = useState<string | null>(null);
  const colors = mineColors(mine);
  const design: Design = mine.design ?? designFrom('speaking', null, {});
  const presets = minePreset(mine) ?? undefined;
  // Leaving the shot ends a conversation started here.
  useEffect(() => { if (!live && step === 'Try it') endTalk(); }, [live, step]);

  // Motion shows your own state; Try it shows what you choose (or the conversation, while talking).
  const talking = step === 'Try it' && talk.phase !== 'off';
  const own = state === mine.name;
  const info = STATES.find(s => s.name === state);
  const shown = info ? orbFor(info) : { state: own && mine.design ? state : 'speaking' };
  useStageWish('create', {
    state: step === 'Motion' ? mine.name : talking ? talk.phase : shown.state,
    emotion: step === 'Motion' || talking ? null : emotion ?? shown.emotion ?? null,
    presets: step === 'Motion' ? { [mine.name]: design as unknown as Record<string, number> } : presets,
    palette: [...colors],
    halo: mine.halo,
    voice: talking && talk.phase === 'listening' && talk.stream ? { kind: 'mic', stream: talk.stream } : { kind: 'sim' },
  });

  const setColor = (i: number, hex: string) => { const next = [...colors] as Colors; next[i] = hex; setMine({ colors: next }); };
  const nameOk = NAME.test(mine.name) && !BUILT_IN.includes(mine.name);
  const choose = (s: Step) => { if (step === 'Try it' && s !== 'Try it') endTalk(); setStep(s); };

  return (
    <div className="create">
      <h2 id="create-title" className="shot__title create__title">Create your own</h2>
      <div ref={bar} className="seg steps" role="group" aria-label="Steps">
        {glide}
        {STEPS.map(s => (
          <button key={s} type="button" className="seg__opt" aria-pressed={s === step} aria-controls="create-step" onClick={() => choose(s)}>{s}</button>
        ))}
      </div>

      <div id="create-step" className="create__step" aria-live="polite">
        {step === 'Colours' && (
          <div className="pg-colors">
            {COLOR_LABELS.map((label, i) => <ColorPicker key={label} label={label} value={colors[i]!} onChange={hex => setColor(i, hex)} />)}
            <button type="button" className="btn btn--small" onClick={() => setMine({ colors: null })} disabled={!mine.colors}><ResetIcon />Reset</button>
          </div>
        )}
        {step === 'Motion' && (
          <div className="create__dials">
            {MOTION.map(f => (
              <label key={f.key} className="dial">
                <span>{f.label}</span>
                <input type="range" min={f.min} max={f.max} step={f.step} value={Number(design[f.key])}
                  onChange={e => setMine({ design: { ...design, [f.key]: +e.target.value } })} />
                <output className="mono">{Number(Number(design[f.key]).toFixed(2))}</output>
              </label>
            ))}
            <button type="button" className="btn btn--small" onClick={() => setMine({ design: null })} disabled={!mine.design}><ResetIcon />Reset</button>
          </div>
        )}
        {step === 'Try it' && (
          <div className="try try--create">
            {talking ? (
              <p className="shot__line">{talk.stream ? PHASE[talk.phase] : `${PHASE[talk.phase]} (no microphone, simulated)`}</p>
            ) : (
              <>
                <Switch scope="create" label="State" options={[...STATE_NAMES, ...(mine.design ? [mine.name] : [])]} value={state} onChange={setState} />
                <Switch scope="create" label="Emotion" options={EMOTIONS} value={emotion} onChange={setEmotion} render={v => v ?? 'none'} />
              </>
            )}
            <label className="dial">
              <span>Halo</span>
              <input type="range" min={0} max={1.5} step={0.05} value={mine.halo} onChange={e => setMine({ halo: +e.target.value })} />
              <output className="mono">{mine.halo.toFixed(2)}</output>
            </label>
            {talking
              ? <button type="button" className="btn talk talk--end" onClick={endTalk}>End</button>
              : <button type="button" className="btn talk" onClick={() => void startTalk()}><MicIcon />Talk</button>}
          </div>
        )}
        {step === 'Code' && (
          <div className="create__name">
            {mine.design && (
              <label className="pg-input">Your state’s name
                <input value={mine.name} onChange={e => setMine({ name: e.target.value.toLowerCase() })} aria-invalid={!nameOk} spellCheck={false} />
              </label>
            )}
            <pre className="create__code mono" aria-label="Your marble’s code">{mineJsx(mine)}</pre>
            <div className="create__actions">
              <CopyButton className="btn btn--small" text={mineJsx(mine)} what="code" label="Copy code" />
              {mine.design && nameOk && <CopyButton className="btn btn--small" text={exportJson(mine.name, design)} what="preset" label="Export preset" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
