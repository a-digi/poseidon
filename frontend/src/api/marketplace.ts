// api/marketplace.ts
// API-Client für Plugin-Repositories und Marketplace

import { PLUGIN_SERVER_URL } from '@/config/plugins.ts';
import type { Response } from '@/backend/Response';

export interface Repository {
  id: number;
  name: string;
  description: string;
  url: string;
  addedAt: number;
  trusted: boolean;
}

export interface MarketplaceEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
  website?: string;
  iconUrl?: string;
  download: string;
  repoId: number;
  repoName: string;
  trusted: boolean;
  local?: boolean;
  minPreviousVersion?: string;
}

export interface MarketplaceResponse {
  entries: MarketplaceEntry[];
  errors: { repoId: number; message: string }[];
}

export class UntrustedRepoError extends Error {
  readonly code = 'untrusted';
  constructor(message: string) {
    super(message);
    this.name = 'UntrustedRepoError';
  }
}

export type MarketplaceJobState =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'dead_lettered';

export interface MarketplaceJobStatus {
  taskId: string;
  status: MarketplaceJobState;
  attempts: number;
  lastError: string;
}

const API = PLUGIN_SERVER_URL.replace(/\/$/, '');

async function parseEnvelope<T>(res: globalThis.Response): Promise<T> {
  const body: Response & { code?: string } = await res.json();
  if (res.status === 409 && body?.code === 'untrusted') {
    throw new UntrustedRepoError(body.message ?? 'Untrusted repository');
  }
  if (!res.ok || body?.status === 'error') {
    throw new Error(body?.message ?? `Request failed: ${res.status}`);
  }
  return body.message as T;
}

export async function listRepositories(): Promise<Repository[]> {
  const res = await fetch(`${API}/api/plugins/repositories`);
  return parseEnvelope<Repository[]>(res);
}

export async function addRepository(
  url: string,
  confirmUntrusted?: boolean,
): Promise<Repository> {
  const res = await fetch(`${API}/api/plugins/repositories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, confirmUntrusted }),
  });
  return parseEnvelope<Repository>(res);
}

export async function removeRepository(id: number): Promise<void> {
  const res = await fetch(
    `${API}/api/plugins/repositories?id=${encodeURIComponent(String(id))}`,
    { method: 'DELETE' },
  );
  await parseEnvelope<unknown>(res);
}

export async function fetchMarketplace(): Promise<MarketplaceResponse> {
  const res = await fetch(`${API}/api/plugins/marketplace`, { cache: 'no-store' });
  return parseEnvelope<MarketplaceResponse>(res);
}

export async function refreshRepository(id: number): Promise<Repository> {
  const res = await fetch(`${API}/api/plugins/repositories/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ id }),
  });
  return parseEnvelope<Repository>(res);
}

export async function installFromMarketplace(
  repoId: number,
  pluginId: string,
  confirmUntrusted?: boolean,
): Promise<{ taskId: string }> {
  const res = await fetch(`${API}/api/plugins/marketplace/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoId, pluginId, confirmUntrusted }),
  });
  const { taskId } = await parseEnvelope<{
    taskId: string;
    status: MarketplaceJobState;
  }>(res);
  return { taskId };
}

export async function getMarketplaceJobStatus(
  taskId: string,
): Promise<MarketplaceJobStatus> {
  const res = await fetch(
    `${API}/api/plugins/marketplace/install/status?taskId=${encodeURIComponent(taskId)}`,
  );
  return parseEnvelope<MarketplaceJobStatus>(res);
}
