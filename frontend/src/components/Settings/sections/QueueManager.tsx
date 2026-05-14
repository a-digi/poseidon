import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchQueueOverview,
  fetchDeadLetters,
  type QueueOverview,
  type QueueOverviewConsumer,
  type DeadLetterEntry,
  type DeadLetterPage,
} from '@/api/queue';

const POLL_INTERVAL_MS = 5000;

const Spinner: React.FC = () => (
  <svg className="w-5 h-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

function formatRelative(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = then - Date.now();
  const absSec = Math.abs(diffMs) / 1000;
  if (absSec < 60) return 'just now';
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const units: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
  ];
  for (const { unit, seconds } of units) {
    if (absSec >= seconds) {
      return rtf.format(Math.round(diffMs / 1000 / seconds), unit);
    }
  }
  return 'just now';
}

interface CountCellProps {
  label: string;
  count: number;
  colorClass: string;
}

const CountCell: React.FC<CountCellProps> = ({ label, count, colorClass }) => (
  <div className={`flex flex-col items-center justify-center rounded-lg py-3 px-2 gap-0.5 ${colorClass}`}>
    <span className="text-2xl font-bold tabular-nums leading-none">{count}</span>
    <span className="text-[10px] font-semibold uppercase tracking-wide text-center leading-tight opacity-80">
      {label}
    </span>
  </div>
);

interface ConsumerRowProps {
  consumer: QueueOverviewConsumer;
  locale: string;
}

const ConsumerRow: React.FC<ConsumerRowProps> = ({ consumer, locale }) => {
  const { t } = useTranslation();
  return (
    <li className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        <code className="font-mono text-sm text-slate-700 truncate">{consumer.label}</code>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full tabular-nums">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t('settings.queueManager.workers', { count: consumer.workers })}
        </span>
        <span className="text-xs text-slate-400">{formatRelative(consumer.registeredAt, locale)}</span>
      </div>
    </li>
  );
};

interface DeadLetterTableProps {
  queueName: string;
  total: number;
}

const DeadLetterTable: React.FC<DeadLetterTableProps> = ({ queueName, total }) => {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<DeadLetterPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchDeadLetters(queueName, page, 25)
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [queueName, page]);

  const totalPages = Math.ceil(total / 25);

  const formatPayload = (raw: string): string => {
    if (!raw) return raw;
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  };

  const firstLine = (text: string): string => text.split('\n')[0] ?? text;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
        <Spinner />
        <span>{t('settings.queueManager.deadLetters.loading')}</span>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        <span>{t('settings.queueManager.deadLetters.error')}</span>
        <button
          type="button"
          onClick={() => { setPage(1); setLoading(true); }}
          className="ml-auto text-xs font-semibold text-red-700 underline hover:no-underline"
        >
          {t('settings.queueManager.deadLetters.retry')}
        </button>
      </div>
    );
  }

  if (data === null || data.items.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic px-1 py-2">
        {t('settings.queueManager.deadLetters.empty')}
      </p>
    );
  }

  const columns = [
    t('settings.queueManager.deadLetters.column.taskId'),
    t('settings.queueManager.deadLetters.column.attempts'),
    t('settings.queueManager.deadLetters.column.error'),
    t('settings.queueManager.deadLetters.column.failedAt'),
    t('settings.queueManager.deadLetters.column.payload'),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
              <th className="w-6" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.items.map((entry: DeadLetterEntry, idx: number) => {
              const isExpanded = expandedKey === entry.taskId;
              const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
              return (
                <React.Fragment key={entry.taskId}>
                  <tr
                    className={`${rowBg} hover:bg-slate-50 transition-colors cursor-pointer`}
                    onClick={() => setExpandedKey(isExpanded ? null : entry.taskId)}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {entry.taskId.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">
                      {entry.attempts}
                    </td>
                    <td className="px-3 py-2 text-slate-600 max-w-xs truncate">
                      {firstLine(entry.lastError)}
                    </td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap text-xs">
                      {formatRelative(entry.updatedAt, i18n.language)}
                    </td>
                    <td className="px-3 py-2 text-slate-400 text-xs max-w-[120px] truncate font-mono">
                      {entry.payload ? firstLine(entry.payload) : '—'}
                    </td>
                    <td className="px-2 py-2">
                      <Chevron open={isExpanded} />
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className={rowBg}>
                      <td colSpan={6} className="px-4 py-3 bg-slate-100/60 border-t border-slate-200">
                        <div className="flex flex-col gap-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
                              {t('settings.queueManager.deadLetters.column.error')}
                            </p>
                            <pre className="text-xs text-red-700 bg-red-50 border border-red-100 rounded p-2 whitespace-pre-wrap break-all">
                              {entry.lastError}
                            </pre>
                          </div>
                          {entry.payload && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
                                {t('settings.queueManager.deadLetters.column.payload')}
                              </p>
                              <pre className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded p-2 whitespace-pre-wrap break-all">
                                {formatPayload(entry.payload)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {t('settings.queueManager.deadLetters.pagination.pageOf', {
              current: page,
              total: totalPages,
            })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('settings.queueManager.deadLetters.pagination.prev')}
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('settings.queueManager.deadLetters.pagination.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface QueueDetailsProps {
  queue: QueueOverview;
  locale: string;
}

const QueueDetails: React.FC<QueueDetailsProps> = ({ queue, locale }) => {
  const { t } = useTranslation();
  const [showDeadLetters, setShowDeadLetters] = useState(false);
  const deadLettered = queue.counts.dead_lettered;

  return (
    <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-5">
      <div className="grid grid-cols-5 gap-2">
        <CountCell
          label={t('settings.queueManager.counts.pending')}
          count={queue.counts.pending}
          colorClass="bg-slate-100 text-slate-700"
        />
        <CountCell
          label={t('settings.queueManager.counts.inProgress')}
          count={queue.counts.in_progress}
          colorClass="bg-blue-50 text-blue-700"
        />
        <CountCell
          label={t('settings.queueManager.counts.completed')}
          count={queue.counts.completed}
          colorClass="bg-emerald-50 text-emerald-700"
        />
        <CountCell
          label={t('settings.queueManager.counts.failed')}
          count={queue.counts.failed}
          colorClass="bg-red-50 text-red-700"
        />
        {deadLettered > 0 ? (
          <button
            type="button"
            onClick={() => setShowDeadLetters((prev) => !prev)}
            className="rounded-lg py-3 px-2 gap-0.5 bg-rose-50 text-rose-800 flex flex-col items-center justify-center cursor-pointer hover:bg-rose-100 transition-colors"
          >
            <span className="text-2xl font-bold tabular-nums leading-none">{deadLettered}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-center leading-tight opacity-80">
              {t('settings.queueManager.counts.deadLettered')}
            </span>
          </button>
        ) : (
          <CountCell
            label={t('settings.queueManager.counts.deadLettered')}
            count={deadLettered}
            colorClass="bg-rose-50 text-rose-800"
          />
        )}
      </div>

      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
          {t('settings.queueManager.consumers')}
        </p>
        {queue.consumers.length === 0 ? (
          <p className="text-sm text-slate-400 italic px-1">
            {t('settings.queueManager.noConsumers')}
          </p>
        ) : (
          <ul className="rounded-lg border border-slate-100 overflow-hidden divide-y divide-slate-100 bg-white">
            {queue.consumers.map((consumer) => (
              <ConsumerRow key={consumer.id} consumer={consumer} locale={locale} />
            ))}
          </ul>
        )}
      </div>

      {deadLettered > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              {t('settings.queueManager.deadLetters.title')}
            </p>
            <button
              type="button"
              onClick={() => setShowDeadLetters((prev) => !prev)}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline hover:no-underline transition-colors"
            >
              {showDeadLetters
                ? t('settings.queueManager.deadLetters.hide')
                : t('settings.queueManager.deadLetters.view')}
            </button>
          </div>
          {showDeadLetters && (
            <DeadLetterTable queueName={queue.name} total={deadLettered} />
          )}
        </div>
      )}

      <p className="text-xs text-slate-400">
        {formatRelative(queue.createdAt, locale)}
      </p>
    </div>
  );
};

interface QueueRowProps {
  queue: QueueOverview;
  expanded: boolean;
  onToggle: () => void;
  locale: string;
}

const QueueRow: React.FC<QueueRowProps> = ({ queue, expanded, onToggle, locale }) => {
  const { t } = useTranslation();
  const accentBorder = queue.isActive ? 'border-l-emerald-400' : 'border-l-slate-300';
  const panelId = `queue-panel-${queue.id}`;
  const deadLettered = queue.counts.dead_lettered;
  const failed = queue.counts.failed;
  const inProgress = queue.counts.in_progress;

  return (
    <div className={`rounded-xl border border-slate-200 border-l-4 ${accentBorder} bg-white shadow-sm overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            queue.isActive ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <code className="font-mono text-sm font-semibold text-slate-800">
            {queue.name}
          </code>
          {queue.description && (
            <span className="text-xs text-slate-400 truncate">— {queue.description}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {deadLettered > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full tabular-nums">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              {deadLettered} {t('settings.queueManager.counts.deadLettered')}
            </span>
          )}
          {deadLettered === 0 && failed > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full tabular-nums">
              {failed} {t('settings.queueManager.counts.failed')}
            </span>
          )}
          {deadLettered === 0 && failed === 0 && inProgress > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {inProgress} {t('settings.queueManager.counts.inProgress')}
            </span>
          )}
          <Chevron open={expanded} />
        </div>
      </button>
      {expanded && (
        <div id={panelId}>
          <QueueDetails queue={queue} locale={locale} />
        </div>
      )}
    </div>
  );
};

const QueueManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [queues, setQueues] = useState<QueueOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tick = async (initial: boolean) => {
      try {
        const data = await fetchQueueOverview();
        if (cancelled) return;
        setQueues(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled && initial) setLoading(false);
      }
    };

    void tick(true);
    intervalRef.current = window.setInterval(() => void tick(false), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-slate-500 py-20">
        <Spinner />
        <span className="text-sm">{t('settings.queueManager.loading')}</span>
      </div>
    );
  }

  if (error && queues.length === 0) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (queues.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm py-20">
        {t('settings.queueManager.empty')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {queues.map((queue) => (
        <QueueRow
          key={queue.id}
          queue={queue}
          expanded={expandedId === queue.id}
          onToggle={() => setExpandedId((prev) => (prev === queue.id ? null : queue.id))}
          locale={i18n.language}
        />
      ))}
    </div>
  );
};

export default QueueManager;
