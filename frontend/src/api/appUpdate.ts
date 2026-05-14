import { CheckForUpdate, GetLastUpdateCheck, OpenUpdateDownload } from '../../wailsjs/go/main/App';

export interface PlatformAsset {
  url: string;
  size: number;
  sha256: string;
}

export interface UpdateState {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  asset?: PlatformAsset;
  releaseNotesUrl?: string;
  checkedAt: string;
  error?: string;
}

export async function checkForUpdate(): Promise<UpdateState> {
  return CheckForUpdate() as Promise<unknown> as Promise<UpdateState>;
}

export async function getLastUpdateCheck(): Promise<UpdateState> {
  return GetLastUpdateCheck() as Promise<unknown> as Promise<UpdateState>;
}

export async function openUpdateDownload(): Promise<void> {
  return OpenUpdateDownload();
}
