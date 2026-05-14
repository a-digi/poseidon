import React, { useState } from 'react';
import { useMultiThread } from './MultiThreadContext';
import { Tab as TabItem } from './Tab';
import { useLoadedPlugins } from '../Plugin/LoadedPluginsContext';
import type { Tab } from './types';
import type { LoadedPlugin } from '@/api/plugins';

const TAB_TITLE_PATTERN = /^Tab (\d+)$/;

function getDisplayTitle(tab: Tab, plugins: LoadedPlugin[]): string {
  if (!tab.pluginId) return tab.title;
  const match = TAB_TITLE_PATTERN.exec(tab.title);
  if (!match) return tab.title;
  const plugin = plugins.find((p) => p.id === tab.pluginId);
  const name = plugin?.manifest?.name ?? tab.pluginId;
  return `${name} ${match[1]}`;
}

export function BottomBar() {
  const { tabs, activeTabId, createTab, switchTo, closeTab, renameTab, reorderTabs } = useMultiThread();
  const loadedPlugins = useLoadedPlugins();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  // dropIndex is in [0, tabs.length] — the slot where the dragged tab will land.
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedId(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverTab = (e: React.DragEvent, tabIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const after = e.clientX > rect.left + rect.width / 2;
    setDropIndex(after ? tabIndex + 1 : tabIndex);
  };

  const handleDragOverEnd = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIndex(tabs.length);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedId === null || dropIndex === null) {
      setDraggedId(null);
      setDropIndex(null);
      return;
    }
    const fromIndex = tabs.findIndex((t) => t.id === draggedId);
    if (fromIndex !== -1) {
      const adjustedTo = fromIndex < dropIndex ? dropIndex - 1 : dropIndex;
      if (adjustedTo !== fromIndex) reorderTabs(fromIndex, adjustedTo);
    }
    setDraggedId(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropIndex(null);
  };

  return (
    <div className="w-full h-10 flex items-center border-t bg-white shadow-sm shrink-0">
      <div className="flex flex-1 items-center h-full overflow-x-auto">
        {tabs.map((tab, i) => (
          <TabItem
            key={tab.id}
            tab={tab}
            displayTitle={getDisplayTitle(tab, loadedPlugins)}
            isActive={tab.id === activeTabId}
            isDragging={tab.id === draggedId}
            showDropIndicator={dropIndex === i}
            onSwitch={switchTo}
            onClose={closeTab}
            onRename={renameTab}
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={(e) => handleDragOverTab(e, i)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />
        ))}
        <div
          className={`flex-1 h-full ${dropIndex === tabs.length && draggedId !== null ? 'border-l-2 border-l-blue-500' : ''}`}
          onDragOver={handleDragOverEnd}
          onDrop={handleDrop}
        />
      </div>
      <div className="shrink-0 border-l border-gray-200">
        <button
          type="button"
          onClick={createTab}
          className="px-3 h-10 flex items-center text-gray-500 hover:bg-gray-100 text-lg leading-none"
          aria-label="New tab"
        >
          +
        </button>
      </div>
    </div>
  );
}
