import { useCallback, useEffect, useRef, useState } from 'react';
import {
  installFromMarketplace,
  getMarketplaceJobStatus,
  UntrustedRepoError,
  type MarketplaceEntry,
  type MarketplaceJobState,
} from '@/api/marketplace';

export interface InstallTask {
  taskId: string;
  status: MarketplaceJobState;
  attempts: number;
  lastError: string;
  entryName: string;
}

export interface UseMarketplaceInstallOptions {
  onCompleted: (entryName: string) => void;
  onFailed: (entryName: string, message: string) => void;
}

export interface UseMarketplaceInstallResult {
  inFlight: Record<string, InstallTask>;
  trigger: (
    entry: Pick<MarketplaceEntry, 'repoId' | 'id' | 'name' | 'trusted'>,
    confirmUntrusted?: boolean,
  ) => Promise<void>;
  dismiss: (key: string) => void;
}

const POLL_INTERVAL_MS = 1500;
const POLL_CAP_MS = 5 * 60 * 1000;
const ERROR_TRUNCATE = 140;

const truncate = (msg: string, max = ERROR_TRUNCATE): string =>
  msg.length > max ? `${msg.slice(0, max - 1)}…` : msg;

export function useMarketplaceInstall(
  opts: UseMarketplaceInstallOptions,
): UseMarketplaceInstallResult {
  const [inFlight, setInFlight] = useState<Record<string, InstallTask>>({});

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<Record<string, number>>({});
  const inFlightRef = useRef<Record<string, InstallTask>>({});
  const optsRef = useRef(opts);

  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  useEffect(() => {
    inFlightRef.current = inFlight;
  }, [inFlight]);

  const stopPollLoop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const removeInFlight = useCallback((key: string) => {
    delete startedAtRef.current[key];
    setInFlight((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const dismiss = useCallback((key: string) => {
    removeInFlight(key);
  }, [removeInFlight]);

  const pollOnce = useCallback(async () => {
    const current = inFlightRef.current;
    const keys = Object.keys(current);
    if (keys.length === 0) {
      stopPollLoop();
      return;
    }

    for (const key of keys) {
      const task = current[key];
      if (!task) continue;

      const startedAt = startedAtRef.current[key] ?? 0;
      if (startedAt > 0 && Date.now() - startedAt > POLL_CAP_MS) {
        optsRef.current.onFailed(
          task.entryName,
          'Install is taking longer than expected. The job is still queued — refresh later.',
        );
        setInFlight((prev) => {
          const existing = prev[key];
          if (!existing) return prev;
          return {
            ...prev,
            [key]: {
              ...existing,
              status: 'dead_lettered' as MarketplaceJobState,
              lastError: truncate('Install is taking longer than expected. The job is still queued — refresh later.'),
            },
          };
        });
        continue;
      }

      try {
        const status = await getMarketplaceJobStatus(task.taskId);

        if (status.status === 'completed') {
          optsRef.current.onCompleted(task.entryName);
          removeInFlight(key);
          continue;
        }

        if (status.status === 'failed' || status.status === 'dead_lettered') {
          const errMsg = status.lastError
            ? truncate(status.lastError)
            : 'Install failed';
          optsRef.current.onFailed(task.entryName, errMsg);
          setInFlight((prev) => {
            const existing = prev[key];
            if (!existing) return prev;
            return {
              ...prev,
              [key]: {
                ...existing,
                status: status.status,
                attempts: status.attempts,
                lastError: errMsg,
              },
            };
          });
          continue;
        }

        setInFlight((prev) => {
          const existing = prev[key];
          if (!existing) return prev;
          if (
            existing.status === status.status &&
            existing.attempts === status.attempts &&
            existing.lastError === status.lastError
          ) {
            return prev;
          }
          return {
            ...prev,
            [key]: {
              ...existing,
              status: status.status,
              attempts: status.attempts,
              lastError: status.lastError,
            },
          };
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[marketplace] poll tick failed for task', task.taskId, err);
      }
    }

    const hasActiveTask = Object.values(inFlightRef.current).some(
      (t) => t.status === 'pending' || t.status === 'in_progress',
    );
    if (!hasActiveTask) {
      stopPollLoop();
    }
  }, [removeInFlight, stopPollLoop]);

  const startPollLoop = useCallback(() => {
    if (intervalRef.current !== null) return;
    intervalRef.current = setInterval(() => {
      void pollOnce();
    }, POLL_INTERVAL_MS);
  }, [pollOnce]);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      startedAtRef.current = {};
    };
  }, []);

  const trigger = useCallback(
    async (
      entry: Pick<MarketplaceEntry, 'repoId' | 'id' | 'name' | 'trusted'>,
      confirmUntrusted = false,
    ) => {
      let taskId: string;
      try {
        const result = await installFromMarketplace(entry.repoId, entry.id, confirmUntrusted);
        taskId = result.taskId;
      } catch (err) {
        if (err instanceof UntrustedRepoError) {
          throw err;
        }
        throw err;
      }

      const key = `${entry.repoId}:${entry.id}`;
      startedAtRef.current[key] = Date.now();
      setInFlight((prev) => ({
        ...prev,
        [key]: {
          taskId,
          status: 'pending',
          attempts: 0,
          lastError: '',
          entryName: entry.name,
        },
      }));
      startPollLoop();
    },
    [startPollLoop],
  );

  return { inFlight, trigger, dismiss };
}
