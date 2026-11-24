import { useEffect, useState } from 'react';
import { Switch, Toggle } from '../ui/Controls';
import { BUILT_INS, colorsOf, paletteLabel } from '../palettes';
import { EMOTION_PICKS, STATE_PICKS } from '../presets';
import { useShotLive } from '../scene/shot';
import { useStageWish } from '../scene/stage';
import { endTalk, startTalk, useTalk } from '../scene/talk';
import { setTrying, useTrying } from '../scene/walk';
import { useSimulatedLevel } from '../simulated';
import { MOCKS, Mock, type MockKind } from '../ui/Mocks';
import { LeftIcon, MicIcon, RightIcon } from '../ui/icons';

const STATE_NAMES = STATE_PICKS;
const EMOTIONS = EMOTION_PICKS;

const PHASE_LINE: Record<string, string> = {
  listening: 'Listening. Speak, then pause. Audio stays in this browser.',
  thinking: 'Thinking…',
  speaking: 'Speaking. A simulated reply for now.',
};
/** Without a mic the whole conversation is simulated, and the line says so. */
const SIM_LINE: Record<string, string> = { ...PHASE_LINE, listening: 'Listening to a simulated you (no microphone).' };

/**
 * The walk along the six built-in palettes (F-22). Their colours are fixed here; what you try (state, emotion,
 * halo) every marble shows, and stays as you walk. Talk turns the marble in front into a conversation, seen in an
 * everyday UI. One fixed block under the name: nothing moves when you change something (F-18).
 */
export function PalettesShot({ step, onStep }: { step: number; onStep: (by: number) => void }) {
  useStageWish('palettes', { state: 'idle', voice: { kind: 'level', level: 0 } });
  const trying = useTrying();
  const talk = useTalk();
  const live = useShotLive();
  const [ui, setUi] = useState<MockKind>('call');
  const id = BUILT_INS[step]!;
  // The reply's voice, and (without a mic) the simulated you.
  const level = useSimulatedLevel(live && (talk.phase === 'speaking' || (talk.phase === 'listening' && !talk.stream)));
  // Leaving the walk ends the conversation and releases the mic.
  useEffect(() => { if (!live) endTalk(); }, [live]);
  useEffect(() => () => endTalk(), []);

  return (
    <div className="walk">
      <h2 id="palettes-title" className="sr-only">Palettes</h2>
      <p className="walk__name" aria-live="polite">{paletteLabel(id)}</p>
      {talk.phase === 'off' ? (
        <div className="try">
          <Switch label="State" options={STATE_NAMES} value={trying.state} onChange={state => setTrying({ state })} />
          <Switch label="Emotion" options={EMOTIONS} value={trying.emotion} onChange={emotion => setTrying({ emotion })} render={v => v ?? 'none'} />
          <Toggle label="Halo" on={trying.halo} onChange={halo => setTrying({ halo })} />
        </div>
      ) : (
        <div className="try try--talking">
          <p className="shot__line" aria-live="polite">{(talk.stream ? PHASE_LINE : SIM_LINE)[talk.phase]}</p>
          <Switch label="Seen in" options={MOCKS.map(m => m.id)} value={ui} onChange={setUi} render={v => MOCKS.find(m => m.id === v)!.label} />
          <Mock kind={ui} state={talk.phase} level={talk.phase === 'thinking' ? 0 : level} audio={talk.phase === 'listening' ? talk.stream : null} palette={colorsOf(id, {})} />
        </div>
      )}
      {/* By the marble, at the bottom (F-41): Talk (End while talking) above the way from one palette to the next. */}
      <div className="dock">
        {talk.phase === 'off'
          ? <button type="button" className="btn talk" onClick={() => void startTalk()}><MicIcon />Talk</button>
          : <button type="button" className="btn talk talk--end" onClick={endTalk}>End</button>}
        <div className="stepper">
          <button type="button" className="stepper__arrow" aria-label="Previous palette" onClick={() => onStep(-1)} disabled={step === 0}><LeftIcon /></button>
          <span className="stepper__count" aria-hidden="true">{step + 1} / {BUILT_INS.length}</span>
          <button type="button" className="stepper__arrow" aria-label="Next palette" onClick={() => onStep(1)} disabled={step === BUILT_INS.length - 1}><RightIcon /></button>
        </div>
      </div>
    </div>
  );
}

/**
 * All six at once (F-60): after the walk, the camera pulls back as the marbles gather into two rows of three, each
 * with its palette's name under it (in the scene). Nothing to press here: scrolling on zooms in to Create your own.
 */
export function AllShot() {
  useStageWish('all', { state: 'idle', voice: { kind: 'level', level: 0 } });
  return <h2 id="all-title" className="sr-only">All palettes: {BUILT_INS.map(paletteLabel).join(', ')}</h2>;
}
