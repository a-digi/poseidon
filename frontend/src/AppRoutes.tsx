import { Routes, Route } from 'react-router-dom';
import { getInitialRoutes } from './config/RouteBuilder';
import { PluginMount, PluginIframe } from './components/Plugin/PluginMount';
import { PluginRouteSlot } from './components/Plugin';
import type { LoadedPlugin } from './api/plugins';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <h2 className="text-2xl font-bold mb-2">404 – Seite nicht gefunden</h2>
      <p>Die angeforderte Seite existiert nicht.</p>
    </div>
  );
}

export function AppRoutes({ plugins }: { plugins: LoadedPlugin[] }) {
  const routes = getInitialRoutes();
  return (
    <Routes>
      {routes.map(({ path, element }) => (
        <Route key={path} path={path} element={element} />
      ))}
      {plugins.map((plugin) => (
        <Route
          key={plugin.path}
          path={plugin.path + '/*'}
          element={
            plugin.manifest?.minimal?.enabled
              ? <PluginRouteSlot pluginId={plugin.id} />
              : plugin.type === 'js'
                ? <PluginMount mod={plugin.mod} pluginId={plugin.id} />
                : <PluginIframe pluginId={plugin.id} />
          }
        />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
