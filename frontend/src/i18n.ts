import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import sv from './locales/sv.json';

const STORAGE_KEY = 'prequaliq_lang';

export const defaultNS = 'translation';
export const resources = {
  en: { [defaultNS]: en },
  sv: { [defaultNS]: sv }
} as const;

export type SupportedLocale = 'en' | 'sv';

const savedLang = (localStorage.getItem(STORAGE_KEY) as SupportedLocale) || 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: savedLang,
  fallbackLng: 'en',
  defaultNS,
  interpolation: { escapeValue: false }
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
});

export default i18n;
