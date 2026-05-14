import type { CSSProperties, ReactNode } from 'react';
import { useMultiThread } from './MultiThreadContext';
import { PluginIframeForTab } from './PluginIframeForTab';
import { EmptyTabPicker } from './EmptyTabPicker';
import { useLoadedPlugins } from '../Plugin/LoadedPluginsContext';
import { PluginRouteSlot } from '../Plugin/PluginRouteSlot';
import Dashboard from '../Dashboard';
import Plugin from '../Plugin';
import Settings from '../Settings';

interface TabsHostProps {
  fallback: ReactNode;
}

export function TabsHost({ fallback }: TabsHostProps) {
  const { tabs, activeTabId } = useMultiThread();
  const loadedPlugins = useLoadedPlugins();

  if (tabs.length === 0) return <>{fallback}</>;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        const frameStyle: CSSProperties = {
          position: 'absolute',
          inset: 0,
          visibility: active ? 'visible' : 'hidden',
          pointerEvents: active ? 'auto' : 'none',
        };

        let content: ReactNode;
        if (tab.kind === 'dashboard') {
          content = <Dashboard />;
        } else if (tab.kind === 'plugins') {
          content = <Plugin />;
        } else if (tab.kind === 'settings') {
          content = <Settings />;
        } else if (!tab.pluginId) {
          content = <EmptyTabPicker />;
        } else {
          const plugin = loadedPlugins.find((p) => p.id === tab.pluginId);
          const isMinimal = plugin?.manifest?.minimal?.enabled === true;

          if (isMinimal) {
            // PluginPersistentHost owns the single iframe for this plugin.
            // Render the slot only when this tab is active so the persistent host
            // can position its iframe here (full mode). When inactive, no slot →
            // persistent host falls back to dock or hidden.
            content = active ? <PluginRouteSlot pluginId={tab.pluginId} /> : null;
          } else {
            content = <PluginIframeForTab pluginId={tab.pluginId} title={tab.title} />;
          }
        }

        return (
          <div key={tab.id} style={frameStyle}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
