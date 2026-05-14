import { useEffect, useRef } from 'react';
import { PLUGIN_SERVER_URL } from '@/config/plugins';

const SESSION_TS = String(Date.now());

export interface PluginContext {
  pluginId: string;
  backendUrl: string;
  requestMinimalMode?: () => void;
  releaseMinimalMode?: () => void;
  subscribeMode?: (cb: (mode: 'full' | 'minimal') => void) => () => void;
}

export interface PluginModule {
  mount: (container: HTMLElement, ctx: PluginContext) => void;
  unmount?: (container: HTMLElement) => void;
}

// JS plugin: calls mount() / unmount() on a bare div
export function PluginMount({ mod, pluginId }: { mod: PluginModule; pluginId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modRef = useRef(mod);
  modRef.current = mod;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    modRef.current.mount(el, { pluginId, backendUrl: PLUGIN_SERVER_URL });
    return () => {
      if (modRef.current.unmount) {
        modRef.current.unmount(el);
      } else {
        el.innerHTML = '';
      }
    };
  }, [pluginId]);

  return <div ref={containerRef} className="w-full h-full" />;
}

// HTML plugin: renders index.html in a sandboxed iframe.
// Works with any framework dist output — React, Angular, Vue, plain HTML.
// The iframe receives pluginId and backendUrl as URL search params so the
// HTML can call the plugin backend via fetch without depending on the host.
export function PluginIframe({ pluginId }: { pluginId: string }) {
  const params = new URLSearchParams({ pluginId, backendUrl: PLUGIN_SERVER_URL, v: SESSION_TS });
  const src = `${PLUGIN_SERVER_URL}/plugins/${pluginId}/index.html?${params.toString()}`;
  return (
    <iframe
      src={src}
      title={pluginId}
      className="w-full h-full"
      style={{ border: 'none', display: 'block' }}
    />
  );
}
