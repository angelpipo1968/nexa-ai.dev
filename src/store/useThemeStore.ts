import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
    theme: 'dark' | 'light';
    effectiveTheme: 'dark' | 'light';
    toggleTheme: () => void;
    setTheme: (theme: 'dark' | 'light') => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: 'dark',
            get effectiveTheme() {
                return get().theme;
            },
            toggleTheme: () =>
                set((state) => ({
                    theme: state.theme === 'dark' ? 'light' : 'dark',
                })),
            setTheme: (theme) => set({ theme }),
        }),
        { name: 'nexa-theme' }
    )
);
