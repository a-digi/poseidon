// Global type declaration for Wails v1 runtime events

export {};

interface WailsVersionEntry {
  version: string;
  firstSeenAt: string;
}

interface WailsSystemInfo {
  version: string;
  commit: string;
  buildDate: string;
  installedAt: string;
  lastOpenedAt: string;
  launchCount: number;
  dataDir: string;
  os: string;
  arch: string;
  goVersion: string;
  versionHistory: WailsVersionEntry[];
}

declare global {
  interface Window {
    runtime?: {
      EventsOn?: (event: string, callback: (payload: unknown) => void) => void;
    };
    go?: {
      main?: {
        App?: {
          GetSystemInfo?: () => Promise<WailsSystemInfo>;
          OpenDataDir?: () => Promise<void>;
        };
      };
    };
  }
}
