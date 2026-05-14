// Zentrale Konfiguration für den Plugin-Server
// Kann per Umgebungsvariable VITE_PLUGIN_SERVER_URL überschrieben werden

export const PLUGIN_SERVER_URL = import.meta.env.VITE_PLUGIN_SERVER_URL || 'http://localhost:2014';

/**
 * Gibt eine vollständige URL zum Plugin-Server zurück.
 * @param path Relativer Pfad, z.B. '/api/plugins/frontend'
 */
export function getPluginServerUrl(path: string): string {
  // Entfernt ggf. doppelten Slash
  return PLUGIN_SERVER_URL.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path);
}
