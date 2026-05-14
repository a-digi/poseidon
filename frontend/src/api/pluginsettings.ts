// API für Plugin-Einstellungsseiten
// Plugins können hiermit einen Link zu ihrer Einstellungsseite registrieren

export type PluginSettingsLink = {
  plugin: string;
  url: string;
  text: string;
};

// Interne Sammlung der Settings-Links (global, damit auch außerhalb dieses Moduls nutzbar)
declare global {
  interface Window {
    __pluginSettingsLinks?: PluginSettingsLink[];
  }
}

function getSettingsLinks(): PluginSettingsLink[] {
  if (typeof window === 'undefined') return [];
  if (!window.__pluginSettingsLinks) window.__pluginSettingsLinks = [];
  return window.__pluginSettingsLinks;
}

export function createPluginSettingsLink(link: PluginSettingsLink) {
  const links = getSettingsLinks();
  // Verhindere doppelte Einträge für das gleiche Plugin + URL
  if (!links.some((l) => l.plugin === link.plugin && l.url === link.url)) {
    links.push(link);
  }
}

export function getAllPluginSettingsLinks(): PluginSettingsLink[] {
  return getSettingsLinks();
}

if (typeof window !== 'undefined') {
  (window as any).createPluginSettingsLink = createPluginSettingsLink;
}
