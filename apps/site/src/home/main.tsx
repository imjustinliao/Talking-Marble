import { StrictMode, useCallback, useMemo, useRef, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { BUILT_INS, colorsOf, paletteLabel } from '../palettes';
import { SHOTS, TOTAL, setGallerySize, type ShotId } from '../scene/camera';
import { mineColors, useMine } from '../scene/mine';
import { usePick } from '../scene/pick';
import { Scene, type GalleryMarble } from '../scene/Scene';
import { Shot } from '../scene/shot';
import { useCamera } from '../scene/useCamera';
import { Footer, ShotIndex, TopBar } from '../ui/Chrome';
import { deviceTier, watchFrames } from '../perf';
import { Create } from './Create';
import { Guide } from './Guide';
import { Hero } from './Hero';
import { AllShot, PalettesShot } from './Palettes';
import '../styles/base.css';
import '../styles/home.css';

setGallerySize(BUILT_INS.length);
deviceTier();
watchFrames();
const N = BUILT_INS.length;

/**
 * One scene, a scroll camera, five shots (F-22): the intro; the walk along the palettes, trying states, emotions,
 * halo and talking; all six at once; Create your own; the Guide.
 */
function Home() {
  const cam = useCamera();
  const { active, walkStep, goTo } = cam;
  const { palette } = usePick();
  const mine = useMine();
  const register = useCallback((id: ShotId, el: HTMLElement | null) => { cam.shots.current[id] = el; }, [cam.shots]);
  const live = (id: ShotId) => cam.onScreen.split(' ').includes(id);

  // The gallery: walk it (Palettes); all six gather for the overview (All palettes).
  const marbles = useMemo<GalleryMarble[]>(() => BUILT_INS.map(id => ({
    id, colors: colorsOf(id), chosen: id === palette, label: paletteLabel(id),
  })), [palette]);
  // Where a step is walking to, so quick presses add up before the camera arrives.
  const target = useRef<number | null>(null);
  if (target.current === walkStep) target.current = null;
  const stepTo = useCallback((k: number) => { const to = Math.max(0, Math.min(N - 1, k)); target.current = to; goTo('palettes', to); }, [goTo]);
  const stepBy = (by: number) => stepTo((target.current ?? walkStep) + by);
  // A click on a gallery marble walks to it.
  const gallery = {
    marbles, front: walkStep, drawing: cam.drawing, active: active === 'palettes',
    onPick: stepTo,
  };

  // The marble in focus lends the UI its colours (F-28): the walk's front marble, the intro's, or your own.
  const focus = active === 'palettes' ? colorsOf(BUILT_INS[walkStep]!)
    : active === 'top' || active === 'all' ? colorsOf(palette) : mineColors(mine);
  const tint = { '--m0': focus[0], '--m1': focus[1], '--m2': focus[2], '--m3': focus[3] } as CSSProperties;

  return (
    <div className="experience" style={tint} data-shot={active} data-intro={cam.introMode} data-intro-done={cam.intro === 'done' || undefined} data-narrow={cam.narrow || undefined}>
      <TopBar page="home" />
      <main id="main" tabIndex={-1}>
        <Scene ref={cam.world} active={active} refs={cam.gallery} gallery={gallery} narrow={cam.narrow} />
        <Shot id="top" live={live('top')} register={register}><Hero /></Shot>
        <Shot id="palettes" live={live('palettes')} register={register}><PalettesShot step={target.current ?? walkStep} onStep={stepBy} /></Shot>
        <Shot id="all" live={live('all')} register={register}><AllShot /></Shot>
        <Shot id="create" live={live('create')} register={register}><Create /></Shot>
        <Shot id="guide" live={live('guide')} register={register}><Guide /><Footer /></Shot>
        <div className="track" aria-hidden="true" style={{ height: `${(TOTAL + 1) * 100}vh` }} />
      </main>
      <ShotIndex shots={SHOTS} active={active} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Home /></StrictMode>);
