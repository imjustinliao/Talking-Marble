import { useEffect, useState } from 'react';

export type ThemeChoice = 'system' | 'dark' | 'light';
const KEY = 'talking-marble-theme';

function stored(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Dark by default; light when the system asks for it; a toggle overrides either (remembered in this browser). */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(stored);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme; else root.dataset.theme = theme;
    try { if (theme === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, theme); } catch { /* storage unavailable */ }
  }, [theme]);
  /** The theme the page shows right now (resolving "system"). */
  const resolved = (): 'dark' | 'light' => theme !== 'system' ? theme : matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  const toggle = () => setTheme(resolved() === 'dark' ? 'light' : 'dark');
  return { theme, toggle, resolved };
}
