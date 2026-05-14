import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTopBar } from '../TopBar/TopBarContext';
import { useSettings } from './SettingsContext';

function SettingsIcon({ icon }: { icon?: React.ReactNode | string }) {
  if (!icon) return null;
  if (typeof icon === 'string') {
    if (icon.trim().startsWith('<svg')) {
      return <span className="w-5 h-5 flex items-center" dangerouslySetInnerHTML={{ __html: icon }} />;
    }
    return <img src={icon} className="w-5 h-5" alt="" />;
  }
  return <>{icon}</>;
}

const Settings: React.FC = () => {
  const { sections } = useSettings();
  const { setTitle } = useTopBar();
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setTitle(t('settings.title'));
  }, [t, setTitle]);

  useEffect(() => {
    if (sections.length === 0) {
      setActiveId(null);
      return;
    }
    if (activeId === null || !sections.some((s) => s.id === activeId)) {
      setActiveId(sections[0].id);
    }
  }, [sections, activeId]);

  const ActiveComponent = sections.find((s) => s.id === activeId)?.component ?? null;

  return (
    <div className="p-2 w-full min-h-screen">
      <div className="border-b border-slate-200 px-2 mt-25 mb-4">
        <h2 className="text-lg font-semibold text-slate-900 py-3">{t('settings.title')}</h2>
      </div>
      {sections.length === 0 ? (
        <div className="flex items-center justify-center text-slate-500 py-20">
          {t('settings.empty')}
        </div>
      ) : (
        <div className="flex gap-4">
          <aside className="w-[220px] shrink-0 border-r border-slate-200 pr-2">
            <ul className="flex flex-col gap-1">
              {sections.map((section) => {
                const isActive = section.id === activeId;
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(section.id)}
                      className={`group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 hover:bg-blue-100 hover:text-blue-700 font-medium text-gray-900 ${isActive ? 'bg-blue-200 font-bold' : ''}`}
                    >
                      <SettingsIcon icon={section.icon} />
                      <span className="text-base group-hover:font-bold">
                        {t(section.label)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
          <section className="flex-1 min-w-0">
            {ActiveComponent ? <ActiveComponent /> : null}
          </section>
        </div>
      )}
    </div>
  );
};

export default Settings;
