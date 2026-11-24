// Renders the orb in fixed layouts for scripts/render-media.mjs. Dev-only (site/media.html), never built.
// Query: mode=orb|tile|card|grid|hero, size (px, orb and tile), bg (tile), scale (tile: orb diameter / tile size), palette;
// grid: set=states|emotions|palettes (the README's pictures); hero: one marble with its state's name under it.
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TalkingMarble, emotions, palettes, states, type PaletteName } from 'talking-marble';
import './styles/base.css';

const q = new URLSearchParams(location.search);
const mode = q.get('mode') ?? 'orb';
const size = Number(q.get('size') ?? 512);
const bg = q.get('bg') ?? '#000000';
const scale = Number(q.get('scale') ?? 0.72);

interface Orb { state: string; level: number; palette: PaletteName; caption?: string }
declare global {
  interface Window {
    media?: { set(next: Partial<Orb>): void };
  }
}

function Media() {
  const [{ state, level, palette, caption }, setOrb] = useState<Orb>({ state: 'idle', level: 0, palette: (q.get('palette') ?? 'pearl') as PaletteName });
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
  if (mode === 'grid') {
    // The README's pictures: every state, every emotion (on speaking, with a voice) or every palette, named under each.
    const set = q.get('set') ?? 'states';
    const items: { name: string; state: string; emotion?: string; palette: PaletteName }[] =
      set === 'emotions' ? Object.keys(emotions).map(e => ({ name: e, state: 'speaking', emotion: e, palette: 'pearl' }))
        : set === 'palettes' ? (Object.keys(palettes) as PaletteName[]).map(p => ({ name: p, state: 'idle', palette: p }))
          : Object.keys(states).map(s => ({ name: s, state: s, palette: 'pearl' }));
    return (
      <div id="frame" className="grid" data-set={set}>
        {items.map(it => (
          <figure key={it.name} className="grid__cell">
            <TalkingMarble size={size} state={it.state} emotion={it.emotion} level={it.emotion ? 0.45 : level} palette={it.palette} decorative />
            <figcaption>{it.name}</figcaption>
          </figure>
        ))}
      </div>
    );
  }
  if (mode === 'hero') {
    // The README's clip: one marble on the stage, its state's name under it.
    return (
      <div id="frame" className="hero">
        <TalkingMarble size={size} state={state} level={level} palette={palette} decorative />
        <p className="hero__caption">{caption ?? state}</p>
      </div>
    );
  }
  if (mode === 'card') {
    // The link-preview card, 1200 × 630, in the site's look (M12, F-16): the hero's words on the left, the marble on the
    // right on a plain black stage, lit only by itself (its halo, the pool of its light on the floor, its reflection).
    return (
      <div id="frame" className="card">
        <span className="card__grain" aria-hidden="true" />
        <div className="card__text">
          <p className="display card__title">Talking Marble</p>
          <p className="card__line">An audio-reactive orb for voice AI apps. React, open source.</p>
          <p className="mono card__install">npm i talking-marble</p>
        </div>
        <div className="card__marble" style={{ ['--marble' as string]: palettes[palette][1] }}>
          <span className="card__pool" aria-hidden="true" />
          <TalkingMarble size={300} state={state} level={level} palette={palette} decorative className="card__orb" />
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
  
  .grid { display: grid; grid-template-columns: repeat(var(--cols), auto); justify-content: center; gap: 36px 28px; padding: 56px 64px 52px; background: #000; color: #f5f5f7; width: max-content; }
  .grid[data-set="states"] { --cols: 7; } .grid[data-set="emotions"] { --cols: 4; } .grid[data-set="palettes"] { --cols: 6; }
  .grid__cell { margin: 0; display: grid; justify-items: center; gap: 14px; }
  .grid__cell figcaption { font: 500 15px/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.02em; color: rgba(245,245,247,.78); }
  .hero { width: 800px; height: 450px; background: #000; display: grid; place-items: center; align-content: center; gap: 30px; }
  .hero__caption { margin: 0; font: 500 18px/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(245,245,247,.7); }
  .card { position: relative; width: 1200px; height: 630px; background: #000; color: #f5f5f7; display: grid; grid-template-columns: 1fr 460px; align-items: center; padding: 0 70px 0 96px; box-sizing: border-box; overflow: hidden; }
  .card__grain { position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)'/%3E%3C/svg%3E"); background-size: 200px; opacity: 0.05; pointer-events: none; }
  .card__text { position: relative; display: grid; gap: 22px; justify-items: start; }
  .card__title { font-weight: 600; font-size: 84px; letter-spacing: -0.035em; line-height: 1.02; }
  .card__line { font-size: 28px; line-height: 1.3; color: rgba(245,245,247,.72); max-width: 22ch; }
  .card__install { margin-top: 10px; font-size: 22px; color: #f5f5f7; border: 1px solid rgba(255,255,255,.28); border-radius: 999px; padding: 12px 26px; }
  .card__marble { position: relative; display: grid; place-items: center; height: 100%; padding-bottom: 40px; box-sizing: border-box; }
  .card__pool { position: absolute; left: 50%; top: calc(50% + 130px); width: 600px; height: 150px; transform: translateX(-50%); border-radius: 50%; background: radial-gradient(closest-side, color-mix(in srgb, var(--marble) 28%, transparent), color-mix(in srgb, var(--marble) 7%, transparent) 55%, transparent); }
  .card__orb { -webkit-box-reflect: below 4px radial-gradient(ellipse 46% 48% at 50% 100%, rgba(255,255,255,.3), transparent 100%); }
`;
document.head.append(style);
createRoot(document.getElementById('root')!).render(<StrictMode><Media /></StrictMode>);
