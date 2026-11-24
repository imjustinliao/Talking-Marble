import { useState } from 'react';
import { CopyButton } from '../components/CopyButton';
import { MOTION, designFrom, exportJson, type Design } from '../create/model';
import { COLOR_LABELS, type Colors } from '../palettes';
import { EMOTION_PICKS, STATE_PICKS, STATES, orbFor } from '../presets';
import { mineColors, mineJsx, minePreset, nameMine, reserveNames, setMine, useMine } from '../scene/mine';
import { useShotLive } from '../scene/shot';
import { useStageWish } from '../scene/stage';
import { ColorPicker } from '../ui/ColorPicker';
import { CodeBlock } from '../ui/CodeBlock';
import { Switch } from '../ui/Controls';
import { Demo, SEEN_IN, type SeenIn } from '../ui/Demo';
import { ResetIcon } from '../ui/icons';

const STEPS = ['Name', 'Colours', 'Motion', 'Try it', 'Code'] as const;
type Step = (typeof STEPS)[number];
reserveNames(STATES.map(s => s.name));
const SEEN_IDS = SEEN_IN.map(s => s.id);
const seenLabel = (v: SeenIn) => SEEN_IN.find(s => s.id === v)!.label;

/**
 * Create your own (F-22): the stage marble, large, starts as a plain globe (F-61) and becomes yours. Two levels
 * (F-63): the steps, a switch bar (F-62) with one always chosen, Name first (F-86); only the chosen step shows
 * below it, so nothing is shown all at once. Name (its `label` and preset name); Colours; Motion (its own state, a few plain dials); Try it (every
 * state and emotion, yours included, where it is seen (F-99) and the halo's strength, as on the walk); Code.
 */
export function Create() {
  const mine = useMine();
  const live = useShotLive();
  const [step, setStep] = useState<Step>('Name');
  const [state, setState] = useState<string>('speaking');
  const [emotion, setEmotion] = useState<string | null>(null);
  const [seen, setSeen] = useState<SeenIn>('none');
  const colors = mineColors(mine);
  const design: Design = mine.design ?? designFrom('speaking', null, {});
  const presets = minePreset(mine) ?? undefined;
  // Motion shows your own state; Try it shows what you choose.
  const own = state === mine.name;
  const info = STATES.find(s => s.name === state);
  const shown = info ? orbFor(info) : { state: own && mine.design ? state : 'speaking' };
  useStageWish('create', {
    state: step === 'Motion' ? mine.name : shown.state,
    emotion: step === 'Motion' ? null : emotion ?? shown.emotion ?? null,
    presets: step === 'Motion' ? { [mine.name]: design as unknown as Record<string, number> } : presets,
    palette: [...colors],
    halo: mine.halo,
    label: mine.title.trim() || undefined,
    voice: { kind: 'sim' },
  });

  const setColor = (i: number, hex: string) => { const next = [...colors] as Colors; next[i] = hex; setMine({ colors: next }); };
  const choose = (s: Step) => setStep(s);

  return (
    <div className="create">
      <Demo
        seen={seen} anchor={{ marble: 'stage', panel: '#create .shot__panel' }} live={live && step === 'Try it'}
        state={shown.state} emotion={emotion ?? shown.emotion ?? null} presets={presets} halo={mine.halo} palette={colors}
        name={mine.title.trim() || 'Assistant'}
      />
      <h2 id="create-title" className="shot__title create__title">Create your own</h2>
      <Switch scope="create" label="Steps" hideLabel className="steps" options={STEPS} value={step} onChange={choose} />

      <div id="create-step" className="create__step" aria-live="polite">
        {step === 'Name' && (
          <div className="create__name">
            <label className="pg-input">Name your marble
              <input value={mine.title} onChange={e => nameMine(e.target.value)} placeholder="Nova" maxLength={32} spellCheck={false} autoComplete="off" />
            </label>
            <p className="shot__line">
              {mine.title.trim() ? `Screen readers will call it ${mine.title.trim()} and say what it is doing.` : 'Give it a name. Screen readers say it along with what the marble is doing.'}
            </p>
          </div>
        )}
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
            <Switch scope="create" label="State" options={[...STATE_PICKS, ...(mine.design ? [mine.name] : [])]} value={state} onChange={setState} />
            <Switch scope="create" label="Emotion" options={EMOTION_PICKS} value={emotion} onChange={setEmotion} render={v => v ?? 'none'} />
            <Switch scope="create" label="Seen in" options={SEEN_IDS} value={seen} onChange={setSeen} render={seenLabel} />
            <label className="dial">
              <span>Halo</span>
              <input type="range" min={0} max={1.5} step={0.05} value={mine.halo} onChange={e => setMine({ halo: +e.target.value })} />
              <output className="mono">{mine.halo.toFixed(2)}</output>
            </label>
          </div>
        )}
        {step === 'Code' && (
          <div className="panel create__code">
            <CodeBlock label="Your marble" code={mineJsx(mine)} what="your marble's code" />
            {mine.design && (
              <div className="create__actions">
                <CopyButton className="btn btn--small" text={exportJson(mine.name, design)} what="preset" label="Export preset" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
