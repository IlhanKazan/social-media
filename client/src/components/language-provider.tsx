import { createContext, useContext, useEffect, useState } from "react";
import i18n, { type SupportedLanguage } from "@/i18n";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

type Language = SupportedLanguage;

type LanguageProviderProps = {
  children: React.ReactNode;
  storageKey?: string;
};

type LanguageProviderState = {
  language: Language;
  setLanguage: (language: Language) => void;
};

function detectDefaultLanguage(): Language {
  return navigator.language.toLowerCase().startsWith("tr") ? "tr" : "en";
}

const initialState: LanguageProviderState = {
  language: "tr",
  setLanguage: () => null,
};

const LanguageProviderContext = createContext<LanguageProviderState>(initialState);

export function LanguageProvider({
                                    children,
                                    storageKey = "ui-language",
                                    ...props
                                  }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem(storageKey) as Language | null) || detectDefaultLanguage()
  );

  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);

  const value = {
    language,
    setLanguage: (language: Language) => {
      localStorage.setItem(storageKey, language);
      setLanguageState(language);
      if (useAuthStore.getState().account) {
        void api.patch('/accounts/me/language', { language }).catch(() => {});
      }
    },
  };

  return (
    <LanguageProviderContext.Provider {...props} value={value}>
      {children}
    </LanguageProviderContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageProviderContext);
  if (context === undefined) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
};
