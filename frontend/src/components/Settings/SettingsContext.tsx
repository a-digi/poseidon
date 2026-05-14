import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SettingsSection } from './types';

interface SettingsContextType {
  sections: SettingsSection[];
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

let registry: SettingsSection[] = [];
const subscribers = new Set<() => void>();

function sortSections(list: SettingsSection[]): SettingsSection[] {
  return [...list].sort((a, b) => {
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return a.label.localeCompare(b.label);
  });
}

export function registerSettingsSection(section: SettingsSection): void {
  const existingIndex = registry.findIndex((s) => s.id === section.id);
  const next = existingIndex === -1
    ? [...registry, section]
    : registry.map((s, i) => (i === existingIndex ? section : s));
  registry = sortSections(next);
  subscribers.forEach((notify) => notify());
}

export const useSettings = (): SettingsContextType => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [sections, setSections] = useState<SettingsSection[]>(() => [...registry]);

  useEffect(() => {
    const notify = () => setSections([...registry]);
    subscribers.add(notify);
    notify();
    return () => {
      subscribers.delete(notify);
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ sections }}>
      {children}
    </SettingsContext.Provider>
  );
};
