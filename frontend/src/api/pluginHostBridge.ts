type Mode = 'full' | 'minimal';

declare global {
  interface Window {
    __pluginCtx?: Record<string, PluginCtx> & { __activeId?: string };
  }
}

type PluginCtx = {
  requestMinimalMode(): void;
  releaseMinimalMode(): void;
  subscribeMode(cb: (mode: Mode) => void): () => void;
};

function isInsideIframe(): boolean {
  return window !== window.parent;
}

function getIframePluginId(): string {
  return new URLSearchParams(window.location.search).get('pluginId') ?? '';
}

function getJsPluginCtx(): PluginCtx | undefined {
  const activeId = window.__pluginCtx?.__activeId;
  if (!activeId) return undefined;
  return window.__pluginCtx?.[activeId];
}

export function requestMinimalMode(): void {
  if (isInsideIframe()) {
    const pluginId = getIframePluginId();
    window.parent.postMessage({ type: 'plugin:minimal:request', pluginId }, '*');
  } else {
    getJsPluginCtx()?.requestMinimalMode();
  }
}

export function releaseMinimalMode(): void {
  if (isInsideIframe()) {
    const pluginId = getIframePluginId();
    window.parent.postMessage({ type: 'plugin:minimal:release', pluginId }, '*');
  } else {
    getJsPluginCtx()?.releaseMinimalMode();
  }
}

export function subscribeMode(cb: (mode: Mode) => void): () => void {
  if (isInsideIframe()) {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'plugin:mode') {
        cb(event.data.mode as Mode);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  } else {
    return getJsPluginCtx()?.subscribeMode(cb) ?? (() => undefined);
  }
}
