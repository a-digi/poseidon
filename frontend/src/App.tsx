import React, { useEffect, useMemo, useState } from 'react';
import { Layout } from './components/Layout';
import { useLocation } from 'react-router-dom';
import { useMenu } from './components/Menu';
import { MessageTypeProvider } from './components/Notification/MessageTypeContext';
import { SidebarProvider } from './components/Layout/Sidebar/SidebarContext';
import { getPluginServerUrl } from './config/plugins';
import { fetchFrontendPlugins, PluginInfo, LoadedPlugin, fetchPluginManifest } from './api/plugins';
import { addPluginMenuItem, PluginMenuItem } from './api/pluginmenu';
import { PluginPersistentHost } from './components/Plugin';
import { Response } from '@/backend/Response';
import { useTopBar } from './components/TopBar/TopBarContext';
import { LoadedPluginsContext } from './components/Plugin/LoadedPluginsContext';
import { MultiThreadProvider, TabsHost, useMultiThread } from './components/MultiThread';
import { SettingsProvider } from './components/Settings';
import './components/Settings/sections/registerDefaults';
import { AppRoutes } from './AppRoutes';
import type { PluginModule } from './components/Plugin/PluginMount';

interface TabsSyncWithPluginsProps {
  pluginIds: Set<string>;
}

function TabsSyncWithPlugins({ pluginIds }: TabsSyncWithPluginsProps) {
  const { tabs, closeTab } = useMultiThread();
  useEffect(() => {
    tabs.forEach((t) => {
      if (t.pluginId && !pluginIds.has(t.pluginId)) closeTab(t.id);
    });
  }, [tabs, pluginIds, closeTab]);
  return null;
}

function App() {
  const [loadedPlugins, setLoadedPlugins] = useState<LoadedPlugin[]>([]);
  const { reloadMenu } = useMenu();
  const location = useLocation();
  const { setTitle } = useTopBar();

  const loadedIdsRef = React.useRef<Set<string>>(new Set());
  const failedIdsRef = React.useRef<Set<string>>(new Set());
  const [scanKey, setScanKey] = React.useState(0);

  useEffect(() => {
    const refresh = () => {
      loadedIdsRef.current.clear();
      failedIdsRef.current.clear();
      setLoadedPlugins([]);
      reloadMenu();
      setScanKey((k) => k + 1);
    };
    window.addEventListener('plugins:changed', refresh);
    return () => window.removeEventListener('plugins:changed', refresh);
  }, [reloadMenu]);

  useEffect(() => {
    let isMounted = true;

    fetchFrontendPlugins(getPluginServerUrl('/api/plugins'))
      .then(async (response: Response) => {
        const plugins: PluginInfo[] = response.message as PluginInfo[];
        if (!Array.isArray(plugins) || plugins.length === 0) return;

        const newPlugins: LoadedPlugin[] = [];

        await Promise.all(
          plugins
            .filter((p) => p.id && p.id.trim() !== '')
            .map(async (plugin) => {
              if (loadedIdsRef.current.has(plugin.id)) return;
              if (failedIdsRef.current.has(plugin.id)) return;

              let manifest;
              try {
                manifest = await fetchPluginManifest(`/plugins/${plugin.id}`);
              } catch {
                failedIdsRef.current.add(plugin.id);
                return;
              }
              if (!manifest) {
                failedIdsRef.current.add(plugin.id);
                return;
              }

              if (manifest.filename === 'index.html') {
                if (!manifest.menu?.to) {
                  console.warn('[Plugin] Skipped HTML plugin (no menu.to in manifest):', plugin.id);
                  failedIdsRef.current.add(plugin.id);
                  return;
                }
                const path = manifest.menu.to;
                if (newPlugins.some((p) => p.path === path)) return;
                newPlugins.push({ type: 'html', id: plugin.id, path, manifest });
                loadedIdsRef.current.add(plugin.id);
                addPluginMenuItem(manifest.menu as PluginMenuItem);
                return;
              }

              if (manifest.filename !== 'index.js') {
                failedIdsRef.current.add(plugin.id);
                return;
              }

              let mod: Record<string, unknown>;
              try {
                mod = await import(/* @vite-ignore */ getPluginServerUrl(`/plugins/${plugin.id}/index.js`));
              } catch (err) {
                console.error('[Plugin] Failed to load module:', plugin.id, err);
                failedIdsRef.current.add(plugin.id);
                return;
              }

              if (typeof mod.mount !== 'function') {
                console.warn('[Plugin] Skipped (no mount function):', plugin.id);
                failedIdsRef.current.add(plugin.id);
                return;
              }

              const pluginMod: PluginModule = {
                mount: mod.mount as PluginModule['mount'],
                unmount: typeof mod.unmount === 'function'
                  ? (mod.unmount as PluginModule['unmount'])
                  : undefined,
              };

              const menu = (mod.pluginMenu ?? mod.pluginRoute) as PluginMenuItem | undefined;
              const path: string | undefined = menu?.to ?? (menu as any)?.path;
              if (!path) {
                console.warn('[Plugin] Skipped (no path in pluginMenu):', plugin.id);
                failedIdsRef.current.add(plugin.id);
                return;
              }

              if (newPlugins.some((p) => p.path === path)) return;

              newPlugins.push({ type: 'js', id: plugin.id, path, mod: pluginMod, manifest });
              loadedIdsRef.current.add(plugin.id);

              if (menu) addPluginMenuItem(menu as PluginMenuItem);
            })
        );

        if (isMounted) {
          setLoadedPlugins((prev) => {
            const existing = new Set(prev.map((p) => p.path));
            return [...prev, ...newPlugins.filter((p) => !existing.has(p.path))];
          });
        }
      })
      .catch((err) => console.error('[Plugin] Load error:', err));

    return () => { isMounted = false; };
  }, [scanKey]);

  useEffect(() => {
    setTitle('');
  }, [location.pathname, setTitle]);

  const activePlugins = useMemo(
    () => loadedPlugins.filter((p) => p.manifest?.active !== false),
    [loadedPlugins]
  );
  const activePluginIdSet = useMemo(
    () => new Set(activePlugins.map((p) => p.id)),
    [activePlugins]
  );

  return (
    <MessageTypeProvider>
      <SidebarProvider>
        <LoadedPluginsContext.Provider value={activePlugins}>
          <MultiThreadProvider>
            <SettingsProvider>
              <TabsSyncWithPlugins pluginIds={activePluginIdSet} />
              <PluginPersistentHost plugins={activePlugins}>
                <Layout>
                  <TabsHost fallback={<AppRoutes plugins={activePlugins} />} />
                </Layout>
              </PluginPersistentHost>
            </SettingsProvider>
          </MultiThreadProvider>
        </LoadedPluginsContext.Provider>
      </SidebarProvider>
    </MessageTypeProvider>
  );
}

export default App;
