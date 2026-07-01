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
      className="flex rounded-xl border border-border bg-surface p-0.5 shadow-sm"
    >
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`relative rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 ${
          current === 'en'
            ? 'bg-primary-800 text-white shadow-sm'
            : 'text-muted hover:text-primary hover:bg-white/60'
        }`}
        aria-pressed={current === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('sv')}
        className={`relative rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 ${
          current === 'sv'
            ? 'bg-primary-800 text-white shadow-sm'
            : 'text-muted hover:text-primary hover:bg-white/60'
        }`}
        aria-pressed={current === 'sv'}
      >
        SV
      </button>
    </div>
  );
};
