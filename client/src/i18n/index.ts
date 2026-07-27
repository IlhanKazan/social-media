import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import tr from './locales/tr.json';

export const SUPPORTED_LANGUAGES = ['en', 'tr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

void i18next.use(initReactI18next).init({
  resources: { en: { translation: en }, tr: { translation: tr } },
  // Turkish is the app's original, always-complete language; fall back to it
  // instead of a raw key if a translation is ever missing in English.
  fallbackLng: 'tr',
  interpolation: { escapeValue: false },
});

export default i18next;
