import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => {
        colorScheme.set(mode);
        set({ mode });
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Re-apply the persisted choice to NativeWind once the store rehydrates,
      // otherwise the app boots on the system scheme regardless of the saved mode.
      onRehydrateStorage: () => (state) => {
        if (state) colorScheme.set(state.mode);
      },
    }
  )
);
