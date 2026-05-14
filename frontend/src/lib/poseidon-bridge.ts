import { getPluginServerUrl } from '@/config/plugins.ts';

// Typed extension of window for plugin APIs
interface PoseidonNamespace {
  callPluginBackend?: (plugin: string, action: string, data?: unknown) => Promise<unknown>;
  getBackendUrl?: () => string;
}
interface TaacNamespace {
  poseidon?: PoseidonNamespace;
}
declare global {
  interface Window {
    taac?: TaacNamespace;
  }
}

window.taac = window.taac ?? {};
window.taac.poseidon = window.taac.poseidon ?? {};

// Calls the plugin's Go backend via the execute endpoint.
// Plugins can also call the backend directly via fetch using ctx.backendUrl passed to mount().
window.taac.poseidon.callPluginBackend = async (
  plugin: string,
  action: string,
  data?: unknown
): Promise<unknown> => {
  try {
    const res = await fetch(getPluginServerUrl('/api/plugins/execute'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pluginName: plugin,
        params: { action, ...(typeof data === 'object' && data !== null ? data : {}) },
      }),
    });
    if (!res.ok) return { error: `HTTP ${res.status}: ${res.statusText}` };
    return res.json();
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

// Returns the backend base URL synchronously.
// Prefer using ctx.backendUrl passed to mount() instead.
window.taac.poseidon.getBackendUrl = (): string => getPluginServerUrl('');
