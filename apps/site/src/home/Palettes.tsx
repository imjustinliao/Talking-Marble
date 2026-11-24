import { Switch, Toggle } from '../ui/Controls';
import { BUILT_INS, colorsOf, paletteLabel } from '../palettes';
import { EMOTION_PICKS, STATE_PICKS } from '../presets';
import { useShotLive } from '../scene/shot';
import { useStageWish } from '../scene/stage';
import { setTrying, useTrying } from '../scene/walk';
import { Demo, SEEN_IN, type SeenIn } from '../ui/Demo';
import { LeftIcon, RightIcon } from '../ui/icons';

const SEEN_IDS = SEEN_IN.map(s => s.id);
const seenLabel = (v: SeenIn) => SEEN_IN.find(s => s.id === v)!.label;

/**
 * The walk along the six built-in palettes (F-22). Their colours are fixed here; what you try (state, emotion,
 * halo, where it is seen) every marble shows, and stays as you walk. Seen in (F-99) shows the marble in front in an
 * everyday interface; its state's word sits under it, as under the intro's marble. One fixed block under the name:
 * nothing moves when you change something (F-18).
 */
export function PalettesShot({ step, onStep }: { step: number; onStep: (by: number) => void }) {
  useStageWish('palettes', { state: 'idle', voice: { kind: 'level', level: 0 } });
  const trying = useTrying();
  const live = useShotLive();
  const id = BUILT_INS[step]!;

  return (
    <div className="walk">
      <h2 id="palettes-title" className="sr-only">Palettes</h2>
      <p className="walk__name" aria-live="polite">{paletteLabel(id)}</p>
      <div className="try">
        <Switch label="State" options={STATE_PICKS} value={trying.state} onChange={state => setTrying({ state })} />
        <Switch label="Emotion" options={EMOTION_PICKS} value={trying.emotion} onChange={emotion => setTrying({ emotion })} render={v => v ?? 'none'} />
        <Switch label="Seen in" options={SEEN_IDS} value={trying.seen} onChange={seen => setTrying({ seen })} render={seenLabel} />
        <Toggle label="Halo" on={trying.halo} onChange={halo => setTrying({ halo })} />
      </div>
      <Demo
        seen={trying.seen} anchor={{ marble: 'walk', panel: '#palettes .shot__panel' }} live={live}
        state={trying.state} emotion={trying.emotion} halo={trying.halo} palette={colorsOf(id)} name={paletteLabel(id)}
      />
      {/* At the bottom (F-41): the way from one palette to the next. */}
      <div className="dock">
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
