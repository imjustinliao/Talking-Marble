import { StrictMode, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { resolveState } from 'talking-marble';
import { useConversation } from '../demo/useConversation';
import { PRESETS } from '../gallery/items';
import { PALETTE_IDS, colorsOf, orbProps, paletteLabel, type Edits, type PaletteId } from '../palettes';
import { Scene, type CurveMarble, type LevelSource } from '../scene/Scene';
import { TOTAL, type ShotId } from '../scene/camera';
import { ShotIndex, TopBar } from '../ui/Chrome';
import { ColorsShot, HeroShot, InstallShot, PickShot, Shot, TalkShot } from './Shots';
import { INTRO_MS, useExperience } from './useExperience';
import '../ui/pointerLight';
import '../styles/base.css';
import '../styles/home.css';

// The first shot's marble drifts through the lifecycle, slowly.
const CYCLE = ['idle', 'listening', 'thinking', 'speaking', 'idle', 'connecting'] as const;
const N = PALETTE_IDS.length;

function useHeroCycle(on: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setI(n => (n + 1) % CYCLE.length), 4200);
    return () => clearInterval(t);
  }, [on]);
  return CYCLE[i]!;
}

function Experience() {
  const x = useExperience();
  const { active, walkStep, intro, introMode, goTo } = x;
  const talk = useConversation();
  const [edits, setEditsState] = useState<Edits>({});
  const setEdits = useCallback((fn: (e: Edits) => Edits) => setEditsState(fn), []);
  const [chosen, setChosen] = useState<PaletteId>('pearl');

  // The intro: the light becomes a marble, flowing in from connecting to idle.
  const [introState, setIntroState] = useState('connecting');
  useEffect(() => { if (intro === 'run') { const t = setTimeout(() => setIntroState('idle'), INTRO_MS * 0.55); return () => clearTimeout(t); } }, [intro]);

  // Leaving the talk shot ends the conversation.
  const prevActive = useRef(active);
  useEffect(() => {
    if (prevActive.current === 'talk' && active !== 'talk') talk.stop();
    prevActive.current = active;
  }, [active, talk]);

  const heroState = useHeroCycle(active === 'intro' && intro === 'done');
  const state = intro === 'run' ? introState : active === 'intro' ? heroState : active === 'talk' ? talk.state : 'idle';
  const listens = resolveState(state, PRESETS).levelResponse > 0;
  const read = talk.envelope.read;
  const source = useMemo<LevelSource>(() => (
    active === 'talk' && talk.voice === 'mic' ? { kind: 'mic' }
      : active === 'talk' && talk.voice === 'speech' ? { kind: 'speech', read }
        : listens ? { kind: 'sim' } : { kind: 'none' }
  ), [active, talk.voice, listens, read]);

  const { props: picked } = orbProps({ palette: chosen, edits });
  const colors = picked.palette;
  const marble = {
    state, presets: PRESETS, ...picked, source,
    audio: active === 'talk' && talk.voice === 'mic' ? talk.stream : null,
    'aria-label': `Talking Marble, ${state}`,
  };

  // The palette curve: walk it to recolour (Colors), or see it whole to choose (Pick).
  const picking = active === 'pick';
  // Live from the start of the walk to the end of the pick, so the curve never blinks out mid-move.
  const curveLive = x.curveWindow;
  const curve = useMemo<CurveMarble[]>(() => PALETTE_IDS.map(id => ({
    id, colors: colorsOf(id, edits), chosen: id === chosen,
    label: picking ? paletteLabel(id) : `Recolor ${paletteLabel(id)}`,
  })), [edits, chosen, picking]);
  const stepTo = useCallback((k: number) => goTo('colors', Math.max(0, Math.min(N - 1, k))), [goTo]);
  const target = useRef<number | null>(null);
  useEffect(() => { if (target.current === walkStep) target.current = null; }, [walkStep]);
  const onCurveKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    const from = picking ? PALETTE_IDS.indexOf(chosen) : (target.current ?? walkStep);
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? N - 1 : step ? Math.max(0, Math.min(N - 1, from + step)) : -1;
    if (to < 0) return;
    e.preventDefault();
    if (picking) setChosen(PALETTE_IDS[to]!); else { target.current = to; stepTo(to); }
    document.querySelectorAll<HTMLButtonElement>('.cmarble')[to]?.focus({ preventScroll: true });
  };
  const onCurvePick = (k: number) => { if (picking) setChosen(PALETTE_IDS[k]!); else stepTo(k); };

  const register = useCallback((id: ShotId, el: HTMLElement | null) => { x.shots.current[id] = el; }, [x.shots]);
  const shown = intro === 'run' ? 'intro' : active;

  return (
    <div className="experience" data-shot={active} data-intro={introMode}>
      <TopBar page="home" onHome={() => goTo('intro')} />
      <main id="main" tabIndex={-1}>
        <Scene
          ref={x.world}
          marble={marble}
          light={colors[1]}
          curve={curve}
          curveLive={curveLive}
          curveFront={picking ? PALETTE_IDS.indexOf(chosen) : walkStep}
          curveActive={active === 'colors' || picking}
          curveLabel={picking ? 'Pick a palette' : 'Palettes'}
          curveRefs={x.curveRefs}
          fades={x.fades}
          onCurvePick={onCurvePick}
          onCurveKey={onCurveKey}
        />
        <Shot id="intro" active={shown} register={register}><HeroShot onTalk={() => { goTo('talk'); void talk.start(); }} /></Shot>
        <Shot id="colors" active={shown} register={register}><ColorsShot step={walkStep} edits={edits} setEdits={setEdits} onStep={stepTo} /></Shot>
        <Shot id="pick" active={shown} register={register}><PickShot chosen={chosen} edits={edits} onTry={() => goTo('talk')} /></Shot>
        <Shot id="talk" active={shown} register={register}><TalkShot talk={talk} onPick={talk.setState} /></Shot>
        <Shot id="install" active={shown} register={register}><InstallShot chosen={chosen} edits={edits} /></Shot>
        <div className="track" aria-hidden="true" style={{ height: `${(TOTAL + 1) * 100}vh` }} />
      </main>
      <ShotIndex active={active} onGo={id => goTo(id)} progress={x.progress} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Experience /></StrictMode>);
