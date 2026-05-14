import { PLUGIN_SERVER_URL } from '@/config/plugins';

const SESSION_TS = String(Date.now());

interface PluginIframeForTabProps {
  pluginId: string;
  title?: string;
}

export function PluginIframeForTab({ pluginId, title }: PluginIframeForTabProps) {
  const params = new URLSearchParams({ pluginId, backendUrl: PLUGIN_SERVER_URL, v: SESSION_TS });
  const src = `${PLUGIN_SERVER_URL}/plugins/${pluginId}/index.html?${params.toString()}`;
  return (
    <iframe
      src={src}
      title={title ?? pluginId}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  );
}
