import { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

// Settings (theme + text size) live in a Context so Navbar, Settings page, etc. share one copy.
const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useLocalStorage('mediguard.settings', { theme: 'light', textSize: 'normal' });

  // Apply settings to <html> so the CSS variables in tokens.css switch.
  useEffect(() => {
    const root = document.documentElement;
    const theme = settings.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : settings.theme;
    root.dataset.theme = theme;
    root.dataset.text = settings.textSize;
  }, [settings]);

  const update = (patch) => setSettings((prev) => ({ ...prev, ...patch }));
  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
