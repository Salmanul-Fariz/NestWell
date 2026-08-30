import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'nestwell_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      if (saved && ['dark', 'light', 'system'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'dark';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {}
  };

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      let active: 'dark' | 'light' = 'dark';
      if (theme === 'system') {
        active = mediaQuery.matches ? 'dark' : 'light';
      } else {
        active = theme;
      }

      setResolvedTheme(active);

      // Force class application on <html> element
      root.classList.remove('dark', 'light');
      root.classList.add(active);
      root.setAttribute('data-theme', active);
      root.style.colorScheme = active;
    };

    apply();

    const listener = () => {
      if (theme === 'system') {
        apply();
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
