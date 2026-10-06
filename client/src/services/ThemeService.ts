// Light or dark theme. Pico follows data-theme on <html>, and without it, the system preference.
// A choice is remembered per browser; choosing whatever the system uses goes back to following it.

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'acquire.theme';

const systemTheme = (): Theme =>
  globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const storedTheme = (): Theme | null => {
  try {
    const value = globalThis.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    // localStorage may be unavailable; follow the system
    return null;
  }
};

// The theme in effect: the remembered choice, otherwise the system's
export const currentTheme = (): Theme => storedTheme() ?? systemTheme();

export const applyTheme = () => {
  const theme = storedTheme();
  if (theme) {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }
};

export const toggleTheme = (): Theme => {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
  try {
    if (next === systemTheme()) {
      globalThis.localStorage.removeItem(STORAGE_KEY);
    } else {
      globalThis.localStorage.setItem(STORAGE_KEY, next);
    }
  } catch {
    // Can't remember it, but still switch for now
    document.documentElement.dataset.theme = next;
    return next;
  }
  applyTheme();
  return next;
};

// Calls back when the system preference changes, which matters while following it
export const onSystemThemeChange = (callback: () => void) => {
  const query = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
  query?.addEventListener('change', callback);
  return () => query?.removeEventListener('change', callback);
};
