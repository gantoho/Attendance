import { create } from 'zustand';

type ThemeMode = 'light' | 'dark';

interface UIState {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const THEME_KEY = 'attendance_theme';

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (mode) => {
    set({ theme: mode });
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {}
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: next });
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  },
}));
