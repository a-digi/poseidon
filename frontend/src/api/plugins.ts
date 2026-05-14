// api/plugins.ts
// API-Client für dynamische Plugins und deren Routen

import { PLUGIN_SERVER_URL } from '@/config/plugins.ts';
import { Response } from '@/backend/Response';
import type { PluginModule } from '@/components/Plugin/PluginMount';

export type { PluginModule };

// JS plugin: host imports index.js and calls mount/unmount
export type LoadedPluginJS = { type: 'js'; id: string; path: string; mod: PluginModule; manifest?: PluginManifest };
// HTML plugin: host renders index.html in an iframe (React, Angular, plain HTML — anything)
export type LoadedPluginHTML = { type: 'html'; id: string; path: string; manifest?: PluginManifest };
export type LoadedPlugin = LoadedPluginJS | LoadedPluginHTML;

export type PluginMinimalSize = { width: number; height: number };
export type PluginMinimalMode = {
  enabled: boolean;
  size?: PluginMinimalSize;
  defaultPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
};

export type PluginMultiThreadMode = { enabled: boolean };

export type PluginMenuInfo = {
  label: string;
  to: string;
  icon?: string;
  parentTo?: string;
  settings?: { url: string; text: string }[];
};

export type PluginManifest = {
  id: string;
  name: string;
  version?: string;
  description: string;
  author: string;
  tags: string[];
  website: string;
  filename: string;    // 'index.js' | 'index.html'
  menu?: PluginMenuInfo; // required for HTML plugins; JS plugins export pluginMenu instead
  minimal?: PluginMinimalMode;
  multiThread?: PluginMultiThreadMode;
  active?: boolean;
  localDev?: boolean;
};

export type PluginInfo = {
  id: string;
  name: string;
  type: string;
  manifest?: PluginManifest;
};

export async function fetchFrontendPlugins(apiUrl: string): Promise<Response> {
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`API-Fehler: ${res.status}`);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Kein JSON von API');
  }
  return res.json();
}

export async function importPluginModule(importPath: string): Promise<Record<string, unknown>> {
  return import(/* @vite-ignore */ importPath);
}

export async function fetchPluginManifest(pluginBaseUrl: string): Promise<PluginManifest | null> {
  // Entferne führenden Slash, falls vorhanden
  const cleanBaseUrl = pluginBaseUrl.startsWith('/') ? pluginBaseUrl.slice(1) : pluginBaseUrl;
  try {
    const res = await fetch(`${PLUGIN_SERVER_URL}/${cleanBaseUrl}/manifest.json`);
    if (!res.ok) return null;
    const manifest = await res.json();
    // Minimal-Validierung
    if (!manifest.name || !manifest.description || !manifest.author || !manifest.filename)
      return null;
    return manifest;
  } catch {
    return null;
  }
}

/**
 * Löscht ein Plugin anhand der ID über das Backend-API.
 * @param id Plugin-ID
 */
export async function deletePlugin(id: string): Promise<Response> {
  const url =
    PLUGIN_SERVER_URL.replace(/\/$/, '') + `/api/plugins/delete?id=${encodeURIComponent(id)}`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`Fehler beim Löschen: ${res.status}`);
  return res.json();
}

export async function activatePlugin(id: string): Promise<Response> {
  const url =
    PLUGIN_SERVER_URL.replace(/\/$/, '') + `/api/plugins/activate?id=${encodeURIComponent(id)}`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`Fehler beim Aktivieren: ${res.status}`);
  return res.json();
}

export async function deactivatePlugin(id: string): Promise<Response> {
  const url =
    PLUGIN_SERVER_URL.replace(/\/$/, '') + `/api/plugins/deactivate?id=${encodeURIComponent(id)}`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`Fehler beim Deaktivieren: ${res.status}`);
  return res.json();
}

export { getAllPluginSettingsLinks } from './pluginsettings';
