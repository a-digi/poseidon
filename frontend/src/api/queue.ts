// api/queue.ts
// API-Client für die Warteschlangenübersicht

import { PLUGIN_SERVER_URL } from '@/config/plugins.ts';
import type { Response } from '@/backend/Response';

export interface QueueOverviewConsumer {
  id: string;
  label: string;
  workers: number;
  registeredAt: string;
}

export interface QueueOverviewCounts {
  pending: number;
  in_progress: number;
  completed: number;
  failed: number;
  dead_lettered: number;
}

export interface QueueOverview {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  consumers: QueueOverviewConsumer[];
  counts: QueueOverviewCounts;
}

interface QueueOverviewPayload {
  queues?: QueueOverview[];
}

const API = PLUGIN_SERVER_URL.replace(/\/$/, '');

async function parseEnvelope<T>(res: globalThis.Response): Promise<T> {
  const body: Response = await res.json();
  if (!res.ok || body?.status === 'error') {
    throw new Error(body?.message ?? `Request failed: ${res.status}`);
  }
  return body.message as T;
}

export async function fetchQueueOverview(): Promise<QueueOverview[]> {
  const res = await fetch(`${API}/api/queue/overview`);
  const payload = await parseEnvelope<QueueOverviewPayload>(res);
  return payload.queues ?? [];
}

export interface DeadLetterEntry {
  taskId: string;
  attempts: number;
  lastError: string;
  payload: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeadLetterPage {
  items: DeadLetterEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchDeadLetters(
  queueName: string,
  page: number,
  pageSize: number,
): Promise<DeadLetterPage> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const res = await fetch(`${API}/api/queue/${encodeURIComponent(queueName)}/dead-letters?${params}`);
  return parseEnvelope<DeadLetterPage>(res);
}
