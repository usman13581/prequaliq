import React from 'react';
import { useTranslation } from 'react-i18next';
import type { SupportedLocale } from '../i18n';

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const current = (i18n.language || 'en').split('-')[0] as SupportedLocale;

  const setLang = (lang: SupportedLocale) => {
    if (current !== lang) i18n.changeLanguage(lang);
  };

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className="flex rounded-xl border-2 border-gray-200 bg-gray-100 p-1 shadow-inner"
    >
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
          current === 'en'
            ? 'bg-white text-primary-700 shadow-md'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        aria-pressed={current === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('sv')}
        className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
          current === 'sv'
            ? 'bg-white text-primary-700 shadow-md'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        aria-pressed={current === 'sv'}
      >
        SV
      </button>
    </div>
  );
};
