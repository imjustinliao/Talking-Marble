// Renders the orb in fixed layouts for scripts/render-media.mjs. Dev-only (site/media.html), never built.
// Query: mode=orb|tile|card, size (px, orb and tile), bg (tile), scale (tile: orb diameter / tile size), palette.
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TalkingMarble, type PaletteName } from 'talking-marble';
import './styles/base.css';

const q = new URLSearchParams(location.search);
const mode = q.get('mode') ?? 'orb';
const size = Number(q.get('size') ?? 512);
const bg = q.get('bg') ?? '#000000';
const scale = Number(q.get('scale') ?? 0.72);

interface Orb { state: string; level: number; palette: PaletteName }
declare global {
  interface Window {
    media?: { set(next: Partial<Orb>): void };
  }
}

function Media() {
  const [{ state, level, palette }, setOrb] = useState<Orb>({ state: 'idle', level: 0, palette: (q.get('palette') ?? 'pearl') as PaletteName });
  useEffect(() => {
    window.media = { set: next => setOrb(o => ({ ...o, ...next })) };
  }, []);
  const orb = (px: number) => <TalkingMarble state={state} level={level} palette={palette} size={px} decorative />;

  if (mode === 'tile') {
    return (
      <div id="frame" style={{ width: size, height: size, background: bg, display: 'grid', placeItems: 'center' }}>
        {orb(Math.round(size * scale))}
      </div>
    );
  }
  if (mode === 'card') {
    // The link-preview card, 1200 × 630, in the site's language: the marble on its floor, black stage, light type.
    return (
      <div id="frame" className="card">
        <div className="card__marble">
          <span className="card__glow" aria-hidden="true" />
          <TalkingMarble size={400} state={state} level={level} palette={palette} decorative />
        </div>
        <div className="card__text">
          <p className="caps card__kicker">Talking Marble</p>
          <p className="display card__title">A marble that listens and talks, for your voice&nbsp;AI.</p>
          <p className="mono card__install">npm i talking-marble</p>
        </div>
      </div>
    );
  }
  return <div id="frame" style={{ width: size, height: size }}>{orb(size)}</div>;
}

const style = document.createElement('style');
style.textContent = `
  /* Transparent renders (icons, gallery stills): nothing behind the marble, not even the stage's black */
  html, body { margin: 0; background: ${mode === 'orb' ? 'transparent' : bg} !important; }
  
  .card { width: 1200px; height: 630px; background: #000; color: #f5f5f7; display: grid; grid-template-columns: 540px 1fr; align-items: center; padding: 70px 80px 0 40px; box-sizing: border-box; overflow: hidden; }
  .card__marble { position: relative; display: grid; place-items: center; }
  .card__glow { position: absolute; width: 560px; height: 160px; bottom: -40px; background: radial-gradient(closest-side, rgba(239,159,197,.28), transparent); }
  .card__text { display: grid; gap: 26px; padding-bottom: 70px; }
  .card__kicker { color: rgba(215,215,215,.8); font-size: 15px; letter-spacing: .3em; }
  .card__title { font-size: 56px; line-height: 1.08; }
  .card__install { justify-self: start; font-size: 22px; color: #f5f5f7; border: 1px solid rgba(255,255,255,.28); border-radius: 999px; padding: 12px 24px; }
`;
document.head.append(style);
createRoot(document.getElementById('root')!).render(<StrictMode><Media /></StrictMode>);
