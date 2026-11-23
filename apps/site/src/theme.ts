import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'talking-marble-theme';

/** The page is dark for everyone until the visitor switches to light; that choice is remembered in this browser. */
function stored(): Theme {
  try { return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(stored);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') root.dataset.theme = 'light'; else delete root.dataset.theme;
    try { if (theme === 'light') localStorage.setItem(KEY, 'light'); else localStorage.removeItem(KEY); } catch { /* storage unavailable: lasts this visit */ }
  }, [theme]);
  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  return { theme, toggle };
}
