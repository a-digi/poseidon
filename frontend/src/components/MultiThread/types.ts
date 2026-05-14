export type BuiltInTabKind = 'dashboard' | 'plugins' | 'settings';

export type Tab = {
  id: string;
  title: string;
  pluginId?: string;
  kind?: BuiltInTabKind;
};

export type MultiThreadContextValue = {
  tabs: Tab[];
  activeTabId: string | null;
  createTab: () => void;
  closeTab: (tabId: string) => void;
  switchTo: (tabId: string) => void;
  renameTab: (tabId: string, title: string) => void;
  openPluginInTab: (pluginId: string) => void;
  openBuiltInTab: (kind: BuiltInTabKind) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
};
