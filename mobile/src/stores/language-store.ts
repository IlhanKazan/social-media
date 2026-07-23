import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import i18n from '@/i18n';

export type LanguageMode = 'en' | 'tr';

interface LanguageState {
  mode: LanguageMode;
  setMode: (mode: LanguageMode) => void;
}

function detectDeviceLanguage(): LanguageMode {
  // getLocales() needs the native expo-localization module linked; guard it so a
  // pre-rebuild dev client (JS-only reload) still boots instead of crashing.
  try {
    return Localization.getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en';
  } catch {
    return 'tr';
  }
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      mode: detectDeviceLanguage(),
      setMode: (mode) => {
        void i18n.changeLanguage(mode);
        set({ mode });
      },
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Re-apply the persisted (or device-detected) choice to i18next once the
      // store rehydrates, otherwise the app boots on i18next's own default.
      onRehydrateStorage: () => (state) => {
        if (state) void i18n.changeLanguage(state.mode);
      },
    }
  )
);

void i18n.changeLanguage(useLanguageStore.getState().mode);
