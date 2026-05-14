import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { BuiltInTabKind, MultiThreadContextValue, Tab } from './types';

const BUILT_IN_TITLES: Record<BuiltInTabKind, string> = {
  dashboard: 'Dashboard',
  plugins: 'Plugins',
  settings: 'Settings',
};

const TAB_TITLE_PATTERN = /^Tab (\d+)$/;

function nextTabNumber(tabs: Tab[]): number {
  const used = new Set<number>();
  for (const tab of tabs) {
    const match = TAB_TITLE_PATTERN.exec(tab.title);
    if (match) used.add(parseInt(match[1], 10));
  }
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

const MultiThreadContext = createContext<MultiThreadContextValue | null>(null);

export function MultiThreadProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const createTab = useCallback(() => {
    const newTab: Tab = {
      id: crypto.randomUUID(),
      title: `Tab ${nextTabNumber(tabsRef.current)}`,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const switchTo = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    const prev = tabsRef.current;
    const index = prev.findIndex((t) => t.id === tabId);
    if (index === -1) return;
    const next = prev.filter((t) => t.id !== tabId);
    setTabs(next);
    if (activeTabIdRef.current === tabId) {
      if (next.length === 0) {
        setActiveTabId(null);
      } else {
        const successor = prev[index + 1] ?? prev[index - 1];
        setActiveTabId(successor.id);
      }
    }
  }, []);

  const renameTab = useCallback((tabId: string, title: string) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, title: title.trim() || t.title } : t)));
  }, []);

  const openPluginInTab = useCallback((pluginId: string) => {
    const currentTabs = tabsRef.current;
    const currentActiveId = activeTabIdRef.current;

    // Rule 1: tab with this plugin already exists → switch to it
    const existing = currentTabs.find((t) => t.pluginId === pluginId);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    // Rule 2: active tab is empty → load plugin there
    if (currentActiveId !== null) {
      const activeTab = currentTabs.find((t) => t.id === currentActiveId);
      if (activeTab && activeTab.pluginId === undefined && activeTab.kind === undefined) {
        setTabs((prev) =>
          prev.map((t) => (t.id === currentActiveId ? { ...t, pluginId } : t)),
        );
        return;
      }
    }

    // Rule 3: create a new tab with the plugin
    const newTab: Tab = {
      id: crypto.randomUUID(),
      title: `Tab ${nextTabNumber(currentTabs)}`,
      pluginId,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const openBuiltInTab = useCallback((kind: BuiltInTabKind) => {
    const currentTabs = tabsRef.current;
    const currentActiveId = activeTabIdRef.current;

    const existing = currentTabs.find((t) => t.kind === kind);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    const title = BUILT_IN_TITLES[kind];

    if (currentActiveId !== null) {
      const activeTab = currentTabs.find((t) => t.id === currentActiveId);
      if (activeTab && activeTab.pluginId === undefined && activeTab.kind === undefined) {
        setTabs((prev) =>
          prev.map((t) => (t.id === currentActiveId ? { ...t, kind, title } : t)),
        );
        return;
      }
    }

    const newTab: Tab = {
      id: crypto.randomUUID(),
      title,
      kind,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setTabs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const value: MultiThreadContextValue = {
    tabs,
    activeTabId,
    createTab,
    closeTab,
    switchTo,
    renameTab,
    openPluginInTab,
    openBuiltInTab,
    reorderTabs,
  };

  return <MultiThreadContext.Provider value={value}>{children}</MultiThreadContext.Provider>;
}

export function useMultiThread(): MultiThreadContextValue {
  const ctx = useContext(MultiThreadContext);
  if (ctx === null) throw new Error('useMultiThread must be used within MultiThreadProvider');
  return ctx;
}
