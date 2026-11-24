import { TalkingMarble } from 'talking-marble';
import { colorsOf } from '../palettes';
import { usePick } from '../scene/pick';
import { BookIcon, GitHubIcon, XIcon } from './icons';

export const GITHUB = 'https://github.com/imjustinliao/Talking-Marble';
const HANDLE = 'imjustinliao';
const base = import.meta.env.BASE_URL;

/**
 * The top bar: the logo (a small live marble in the visitor's colours) and the name, centred. Nothing else: the
 * shot index is the navigation, Docs and GitHub are buttons in the page (F-30, F-31).
 */
export function TopBar({ page }: { page: 'home' | 'docs' }) {
  const { palette } = usePick();
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <a className="brand" href={page === 'home' ? '#top' : base}>
          <span className="brand__logo" aria-hidden="true">
            <TalkingMarble size={30} state="idle" palette={colorsOf(palette)} halo={false} decorative />
          </span>
          Talking Marble
        </a>
      </header>
    </>
  );
}

/** Docs and GitHub, as buttons with their icons (in the intro and the Guide). */
export function LinkButtons() {
  return (
    <div className="links">
      <a className="btn btn--link" href={`${base}docs/`}><BookIcon />Docs</a>
      <a className="btn btn--link" href={GITHUB}><GitHubIcon />GitHub</a>
    </div>
  );
}

/**
 * The footer (F-32, F-33): one calm line across the width. The licence on one side; on the other, where to follow
 * (the handle once, the X and GitHub icons). One text size, icons a touch larger. Dark only: no theme switch (F-77).
 */
export function Footer() {
  return (
    <footer className="footer">
      <p className="footer__legal">MIT © Justin Liao</p>
      <div className="footer__end">
        <nav aria-label="Follow" className="follow">
          <span className="follow__label">Follow @{HANDLE}</span>
          <a className="icon-btn" href={`https://x.com/${HANDLE}`} aria-label={`X, @${HANDLE}`} title="X"><XIcon /></a>
          <a className="icon-btn" href={`https://github.com/${HANDLE}`} aria-label={`GitHub, @${HANDLE}`} title="GitHub"><GitHubIcon /></a>
        </nav>
      </div>
    </footer>
  );
}

/** The slim index at the edge: one link per shot, the current one marked; its name shows as plain text on hover. */
export function ShotIndex({ shots, active }: { shots: { id: string; label: string }[]; active: string }) {
  return (
    <nav className="index" aria-label="Shots">
      {shots.map((s, i) => (
        <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? 'step' : undefined}>
          <span className="index__label">{s.label}</span>
          <span className="index__num mono" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
        </a>
      ))}
    </nav>
  );
}
