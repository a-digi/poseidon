import { createContext, useContext } from 'react';
import type { LoadedPlugin } from '@/api/plugins';

const LoadedPluginsContext = createContext<LoadedPlugin[]>([]);

export function useLoadedPlugins(): LoadedPlugin[] {
  return useContext(LoadedPluginsContext);
}

export { LoadedPluginsContext };
