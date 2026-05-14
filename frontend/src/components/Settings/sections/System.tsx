import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface VersionEntry {
  version: string;
  firstSeenAt: string;
}

interface SystemInfo {
  version: string;
  commit: string;
  buildDate: string;
  installedAt: string;
  lastOpenedAt: string;
  launchCount: number;
  dataDir: string;
  os: string;
  arch: string;
  versionHistory: VersionEntry[];
}

function formatTimestamp(iso: string): string {
  if (iso === '') return '—';
  return new Date(iso).toLocaleString();
}

interface InfoRowProps {
  label: string;
  children: React.ReactNode;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, children }) => (
  <div className="flex flex-col gap-0.5 py-3 border-b border-slate-100 last:border-0">
    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</span>
    <div className="text-sm text-slate-700">{children}</div>
  </div>
);


const System: React.FC = () => {
  const { t } = useTranslation();
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const call = window.go?.main?.App?.GetSystemInfo;
    if (!call) {
      setError('GetSystemInfo is not available');
      return;
    }
    call()
      .then((result) => {
        setInfo(result as SystemInfo);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, []);

  if (error !== null) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (info === null) {
    return (
      <div className="flex items-center justify-center gap-2 text-slate-500 py-20">
        <span className="text-sm">{t('settings.system.loading')}</span>
      </div>
    );
  }

  const handleOpenDataDir = () => {
    void window.go?.main?.App?.OpenDataDir?.();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <InfoRow label={t('settings.system.version')}>
          <span className="font-semibold">{info.version}</span>
          <p className="text-xs text-slate-400 mt-0.5">
            {info.commit} &middot; {info.buildDate}
          </p>
        </InfoRow>
        <InfoRow label={t('settings.system.installedAt')}>
          {formatTimestamp(info.installedAt)}
        </InfoRow>
        <InfoRow label={t('settings.system.lastOpenedAt')}>
          {formatTimestamp(info.lastOpenedAt)}
        </InfoRow>
        <InfoRow label={t('settings.system.launchCount')}>
          <span className="tabular-nums">{info.launchCount}</span>
        </InfoRow>
        <InfoRow label={t('settings.system.platform')}>
          {info.os} / {info.arch}
        </InfoRow>
        <InfoRow label={t('settings.system.dataDir')}>
          <div className="flex items-center gap-3 flex-wrap">
            <code className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {info.dataDir}
            </code>
            <button
              type="button"
              onClick={handleOpenDataDir}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors"
            >
              {t('settings.system.openDataDir')}
            </button>
          </div>
        </InfoRow>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
          {t('settings.system.versionHistory')}
        </p>
        {info.versionHistory.length === 0 ? (
          <p className="text-sm text-slate-400 italic px-1">{t('settings.system.noHistory')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                    {t('settings.system.historyVersion')}
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                    {t('settings.system.historyFirstSeen')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {info.versionHistory.map((entry, idx) => (
                  <tr
                    key={entry.version}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">
                      {entry.version}
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs">
                      {formatTimestamp(entry.firstSeenAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default System;
