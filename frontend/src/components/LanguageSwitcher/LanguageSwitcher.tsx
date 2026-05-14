import React, { useState, useRef } from 'react';
import { useLanguage } from './LanguageContext';
import { useTranslation } from 'react-i18next';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', label: t('languageSwitcher.english', 'English'), flag: '🇬🇧' },
    { code: 'de', label: t('languageSwitcher.german', 'Deutsch'), flag: '🇩🇪' },
    { code: 'it', label: t('languageSwitcher.italian', 'Italiano'), flag: '🇮🇹' },
  ];

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const current = languages.find((l) => l.code === language) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="w-8 h-8 flex items-center justify-center text-xl bg-white rounded-md border border-blue-300 shadow hover:bg-blue-100 transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('languageSwitcher.ariaLabel', 'Change language')}
      >
        <span>{current.flag}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 bg-white rounded shadow-lg border border-blue-200 z-50 flex flex-col min-w-[120px]">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={`flex items-center gap-2 px-2 w-full h-8 text-xl hover:bg-blue-100 rounded transition-colors ${lang.code === language ? 'bg-blue-50' : ''}`}
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              aria-label={lang.label}
            >
              <span>{lang.flag}</span>
              <span className="text-sm font-medium text-blue-700">{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
