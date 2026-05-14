import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { PLUGIN_SERVER_URL } from '@/config/plugins';
import type { LoadedPlugin, LoadedPluginHTML } from '@/api/plugins';
import { PluginSlotRegistry } from './PluginRouteSlot';
import { useMultiThread } from '../MultiThread/MultiThreadContext';

type Props = { plugins: LoadedPlugin[]; children: React.ReactNode };
type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

function dockPositionStyle(pos: Position): React.CSSProperties {
  switch (pos) {
    case 'bottom-left': return { bottom: 32, left: 32 };
    case 'top-right':   return { top: 32, right: 32 };
    case 'top-left':    return { top: 32, left: 32 };
    default:            return { bottom: 32, right: 32 };
  }
}

// Computed once per app session — appended to every plugin iframe URL so
// WKWebView never serves a response cached from a previous session.
const SESSION_TS = String(Date.now());

function buildSrc(pluginId: string): string {
  const params = new URLSearchParams({ pluginId, backendUrl: PLUGIN_SERVER_URL, v: SESSION_TS });
  return `${PLUGIN_SERVER_URL}/plugins/${pluginId}/index.html?${params.toString()}`;
}

type DragState = { pluginId: string; offsetX: number; offsetY: number };
type DockPos   = { top: number; left: number };

export function PluginPersistentHost({ plugins, children }: Props) {
  const { tabs, activeTabId } = useMultiThread();

  const usedPluginIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tab of tabs) {
      if (tab.pluginId) ids.add(tab.pluginId);
    }
    return ids;
  }, [tabs]);

  // Iframe is mounted iff at least one open tab references the plugin. Closing
  // the last tab unmounts the iframe — audio stops, all state is destroyed.
  const persistentPlugins = useMemo(
    () => plugins.filter(
      (p): p is LoadedPluginHTML =>
        p.type === 'html' &&
        p.manifest?.minimal?.enabled === true &&
        usedPluginIds.has(p.id),
    ),
    [plugins, usedPluginIds],
  );

  // Tracks which plugins have explicitly called requestMinimalMode().
  const [minimalRequested, setMinimalRequested] = useState<Set<string>>(new Set());

  // Free-drag state: null when idle, set while user is dragging a dock.
  const [dragging, setDragging] = useState<DragState | null>(null);
  // Per-plugin custom top/left overrides when the user has dragged them.
  const [dockPositions, setDockPositions] = useState<Map<string, DockPos>>(new Map());
  // Refs to dock container divs so we can read their rect on drag start.
  const dockDivRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Handle all postMessages from plugin iframes.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = (event.data ?? {}) as {
        type?: string; pluginId?: string; offsetX?: number; offsetY?: number;
      };
      const { type, pluginId } = data;
      if (!type || !pluginId) return;

      if (type === 'plugin:minimal:request') {
        setMinimalRequested(prev => new Set([...prev, pluginId]));
      } else if (type === 'plugin:minimal:release') {
        setMinimalRequested(prev => {
          const next = new Set(prev);
          next.delete(pluginId);
          return next;
        });
        // Clear any custom position when the dock is dismissed.
        setDockPositions(prev => {
          if (!prev.has(pluginId)) return prev;
          const next = new Map(prev);
          next.delete(pluginId);
          return next;
        });
      } else if (type === 'plugin:minimal:dragstart') {
        // Capture current rect so the dock doesn't jump on the first mousemove.
        const dockEl = dockDivRefs.current.get(pluginId);
        if (dockEl) {
          const rect = dockEl.getBoundingClientRect();
          setDockPositions(prev => {
            const next = new Map(prev);
            next.set(pluginId, { top: rect.top, left: rect.left });
            return next;
          });
        }
        setDragging({ pluginId, offsetX: data.offsetX ?? 0, offsetY: data.offsetY ?? 0 });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Document-level mouse tracking while a drag is active.
  useEffect(() => {
    if (!dragging) return;

    const { pluginId, offsetX, offsetY } = dragging;

    const onMove = (e: MouseEvent) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setDockPositions(prev => {
        // Clamp so the dock can't leave the viewport.
        const plugin = persistentPlugins.find(p => p.id === pluginId);
        const size = plugin?.manifest?.minimal?.size ?? { width: 360, height: 100 };
        const top  = Math.max(0, Math.min(vh - size.height, e.clientY - offsetY));
        const left = Math.max(0, Math.min(vw - size.width,  e.clientX - offsetX));
        const next = new Map(prev);
        next.set(pluginId, { top, left });
        return next;
      });
    };

    const onUp = () => setDragging(null);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragging, persistentPlugins]);

  // Slot bounds as state so positioning re-renders when the slot div resizes.
  const [slotBounds, setSlotBounds] = useState<Map<string, DOMRect>>(new Map());
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());
  const resizeObservers = useRef<Map<string, ResizeObserver>>(new Map());

  const register = useCallback((pluginId: string, el: HTMLElement | null) => {
    const existing = resizeObservers.current.get(pluginId);
    if (existing) {
      existing.disconnect();
      resizeObservers.current.delete(pluginId);
    }

    if (!el) {
      setSlotBounds(prev => {
        if (!prev.has(pluginId)) return prev;
        const next = new Map(prev);
        next.delete(pluginId);
        return next;
      });
      return;
    }

    const update = () => {
      setSlotBounds(prev => {
        const next = new Map(prev);
        next.set(pluginId, el.getBoundingClientRect());
        return next;
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    resizeObservers.current.set(pluginId, observer);
    update();

    // Eagerly tell the plugin it is in full mode as soon as the slot mounts,
    // without waiting for setSlotBounds → re-render → useEffect. This prevents
    // the plugin from staying in minimal mode during that async gap, which is
    // especially visible in WKWebView where off-screen iframes can be throttled.
    const iframe = iframeRefs.current.get(pluginId);
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'plugin:mode', mode: 'full' }, '*');
    }
  }, []);

  // Broadcast mode to all persistent iframes whenever slot availability changes.
  // 'minimal' is only used when the plugin explicitly requested dock mode — a
  // hidden, non-docked iframe stays in 'full' so it keeps its full UI in DOM.
  useEffect(() => {
    persistentPlugins.forEach((plugin) => {
      const iframe = iframeRefs.current.get(plugin.id);
      if (!iframe?.contentWindow) return;
      const mode =
        slotBounds.has(plugin.id) || !minimalRequested.has(plugin.id)
          ? 'full'
          : 'minimal';
      iframe.contentWindow.postMessage({ type: 'plugin:mode', mode }, '*');
    });
  }, [slotBounds, persistentPlugins, minimalRequested]);

  // Broadcast tab activation events to every persistent plugin iframe so each
  // plugin can react to its own tab gaining or losing focus. Both events fire
  // on every tab switch — receivers decide whether to act based on the payload.
  const prevActivePluginIdRef = useRef<string | null>(null);
  useEffect(() => {
    const activePluginId =
      tabs.find((t) => t.id === activeTabId)?.pluginId ?? null;
    const prev = prevActivePluginIdRef.current;
    if (activePluginId === prev) return;

    const broadcast = (payload: Record<string, unknown>) => {
      persistentPlugins.forEach((plugin) => {
        const iframe = iframeRefs.current.get(plugin.id);
        iframe?.contentWindow?.postMessage(payload, '*');
      });
    };

    if (prev !== null) {
      broadcast({ type: 'plugin:tab:inactive', inactivePluginId: prev });
    }
    if (activePluginId !== null) {
      broadcast({ type: 'plugin:tab:active', activePluginId });
    }
    prevActivePluginIdRef.current = activePluginId;
  }, [tabs, activeTabId, persistentPlugins]);

  // When the last tab using a plugin is closed, that plugin leaves usedPluginIds
  // and React unmounts its iframe. Notify all REMAINING iframes via a broadcast
  // so any plugin that cares can react. The closed plugin's iframe is already
  // gone, so it doesn't receive the message.
  const prevUsedPluginIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const id of prevUsedPluginIdsRef.current) {
      if (!usedPluginIds.has(id)) {
        persistentPlugins.forEach((plugin) => {
          const iframe = iframeRefs.current.get(plugin.id);
          iframe?.contentWindow?.postMessage(
            { type: 'plugin:tab:closed', closedPluginId: id },
            '*',
          );
        });
      }
    }
    prevUsedPluginIdsRef.current = new Set(usedPluginIds);
  }, [usedPluginIds, persistentPlugins]);

  useEffect(() => {
    return () => { resizeObservers.current.forEach(obs => obs.disconnect()); };
  }, []);

  const portal = ReactDOM.createPortal(
    <>
      {persistentPlugins.map((plugin) => {
        const bounds    = slotBounds.get(plugin.id);
        const customPos = dockPositions.get(plugin.id);
        const isDragging = dragging?.pluginId === plugin.id;

        let containerStyle: React.CSSProperties;

        if (bounds) {
          // Full mode: slot is mounted — position the iframe over it exactly.
          containerStyle = {
            position: 'fixed',
            top: bounds.top,
            left: bounds.left,
            width: bounds.width,
            height: bounds.height,
            zIndex: 100,
            pointerEvents: 'auto',
          };
        } else if (minimalRequested.has(plugin.id)) {
          // Minimal dock — use free position if set, else fall back to manifest preset.
          const pos  = (plugin.manifest?.minimal?.defaultPosition ?? 'bottom-right') as Position;
          const size = plugin.manifest?.minimal?.size ?? { width: 360, height: 100 };
          const posStyle = customPos
            ? { top: customPos.top, left: customPos.left }
            : dockPositionStyle(pos);
          containerStyle = {
            position: 'fixed',
            ...posStyle,
            width: size.width,
            height: size.height,
            zIndex: 1000,
            // Disable pointer events on the container during drag so mousemove
            // events reach the parent document instead of the iframe.
            pointerEvents: isDragging ? 'none' : 'auto',
          };
        } else {
          // Keep the iframe in the viewport at 1×1 with opacity 0. WKWebView
          // throttles iframes that are display:none, visibility:hidden, OR far
          // off-screen — any of those pauses audio. A 1×1 transparent frame in
          // the corner stays "rendered" so JS and <audio> keep running.
          containerStyle = {
            position: 'fixed',
            top: 0,
            left: 0,
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: 'none',
          };
        }

        return (
          <div
            key={plugin.id}
            ref={(el) => {
              if (el) dockDivRefs.current.set(plugin.id, el);
              else dockDivRefs.current.delete(plugin.id);
            }}
            style={containerStyle}
          >
            <iframe
              ref={(el) => {
                if (el) iframeRefs.current.set(plugin.id, el);
                else iframeRefs.current.delete(plugin.id);
              }}
              onLoad={() => {
                const iframe = iframeRefs.current.get(plugin.id);
                if (!iframe?.contentWindow) return;
                iframe.contentWindow.postMessage({ type: 'plugin:mode', mode: 'full' }, '*');
              }}
              src={buildSrc(plugin.id)}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={plugin.id}
            />
          </div>
        );
      })}
    </>,
    document.body,
  );

  return (
    <PluginSlotRegistry.Provider value={{ register }}>
      {children}
      {portal}
    </PluginSlotRegistry.Provider>
  );
}
