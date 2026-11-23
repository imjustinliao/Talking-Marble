import { useTheme } from '../theme';
import { MoonIcon, SunIcon } from './icons';

export const GITHUB = 'https://github.com/imjustinliao/Talking-Marble';
export const NPM = 'https://www.npmjs.com/package/talking-marble';
const base = import.meta.env.BASE_URL;

export function TopBar({ page }: { page: 'home' | 'docs' }) {
  const { theme, toggle, resolved } = useTheme();
  const dark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && resolved() === 'dark');
  const home = page === 'home' ? '' : base;
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <a className="brand" href={page === 'home' ? '#top' : base}>
          <span className="brand__dot" aria-hidden="true" />
          Talking Marble
        </a>
        <nav aria-label="Site">
          <a className="hide-sm" href={`${home}#states`}>States</a>
          <a className="hide-sm" href={`${home}#in-context`}>In context</a>
          <a href={`${base}docs/`} aria-current={page === 'docs' ? 'page' : undefined}>Docs</a>
          <a href={GITHUB}>GitHub</a>
        </nav>
        <button type="button" className="icon-btn" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>
    </>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <nav aria-label="Project">
        <a href={GITHUB}>GitHub</a>
        <a href={NPM}>npm</a>
      </nav>
      <p>MIT © Justin Liao</p>
    </footer>
  );
}
