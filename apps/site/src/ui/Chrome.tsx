import { SHOTS, type ShotId } from '../scene/camera';

export const GITHUB = 'https://github.com/imjustinliao/Talking-Marble';
export const NPM = 'https://www.npmjs.com/package/talking-marble';
const base = import.meta.env.BASE_URL;

export function TopBar({ page, onHome }: { page: 'home' | 'docs'; onHome?: () => void }) {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className={`topbar ${page === 'docs' ? 'topbar--solid' : ''}`}>
        <a
          className="brand"
          href={page === 'home' ? '#wide' : base}
          aria-label="Talking Marble home"
          onClick={e => { if (onHome) { e.preventDefault(); onHome(); } }}
        >
          <span className="brand__dot" aria-hidden="true" />
          <span className="brand__name">Talking Marble</span>
        </a>
        <nav aria-label="Site">
          <a href={`${base}docs/`} aria-current={page === 'docs' ? 'page' : undefined}>Docs</a>
          <a href={GITHUB}>GitHub</a>
        </nav>
      </header>
    </>
  );
}

/** The minimal index of shots, and a thin progress line at the edge. */
export function ShotIndex({ active, onGo, progress }: { active: ShotId; onGo: (id: ShotId) => void; progress: React.RefObject<HTMLDivElement | null> }) {
  return (
    <>
      <nav className="index" aria-label="Scenes">
        {SHOTS.map((s, i) => (
          <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? 'step' : undefined} onClick={e => { e.preventDefault(); onGo(s.id); }}>
            <span className="index__label">{s.label}</span>
            <span className="index__num mono">{String(i + 1).padStart(2, '0')}</span>
          </a>
        ))}
      </nav>
      <div className="progress" aria-hidden="true"><div ref={progress} className="progress__fill" /></div>
    </>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <a href={GITHUB}>GitHub</a>
      <a href={NPM}>npm</a>
      <span>MIT © Justin Liao</span>
    </footer>
  );
}
