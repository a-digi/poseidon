import React, { useEffect, useState } from 'react';
import { checkForUpdate, openUpdateDownload, UpdateState } from '../../../api/appUpdate';

function timeAgo(iso: string): string {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return new Date(iso).toLocaleString();
}

function toErrorState(err: unknown): UpdateState {
  return {
    currentVersion: '',
    latestVersion: '',
    updateAvailable: false,
    error: err instanceof Error ? err.message : String(err),
    checkedAt: new Date().toISOString(),
  };
}

const SpinnerIcon: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const DownloadIcon: React.FC = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const AlertIcon: React.FC = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

type Status = 'checking' | 'up-to-date' | 'available' | 'error' | 'dev-build';

interface StatusConfig {
  cardClass: string;
  iconClass: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const SystemUpdate: React.FC = () => {
  const [state, setState] = useState<UpdateState | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    checkForUpdate()
      .then((result) => { if (!cancelled) setState(result); })
      .catch((err) => { if (!cancelled) setState(toErrorState(err)); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, []);

  const handleCheck = () => {
    setChecking(true);
    Promise.all([checkForUpdate(), new Promise<void>((resolve) => setTimeout(resolve, 5000))])
      .then(([result]) => setState(result))
      .catch((err) => setState(toErrorState(err)))
      .finally(() => setChecking(false));
  };

  const status: Status =
    checking && state === null ? 'checking'
    : state?.error === 'development build' ? 'dev-build'
    : state?.error ? 'error'
    : state?.updateAvailable ? 'available'
    : 'up-to-date';

  const configs: Record<Status, StatusConfig> = {
    checking: {
      cardClass: 'border-slate-200 bg-slate-50',
      iconClass: 'bg-slate-100 text-slate-400',
      title: 'Checking for updates…',
      subtitle: 'Please wait',
      icon: <SpinnerIcon />,
    },
    'up-to-date': {
      cardClass: 'border-green-200 bg-green-50',
      iconClass: 'bg-green-100 text-green-600',
      title: "You're up to date",
      subtitle: `Version ${state?.currentVersion ?? '—'} is the latest`,
      icon: <CheckIcon />,
    },
    available: {
      cardClass: 'border-amber-200 bg-amber-50',
      iconClass: 'bg-amber-100 text-amber-600',
      title: 'Update available',
      subtitle: `Version ${state?.latestVersion} is ready to download`,
      icon: <DownloadIcon />,
    },
    error: {
      cardClass: 'border-red-200 bg-red-50',
      iconClass: 'bg-red-100 text-red-500',
      title: 'Update check failed',
      subtitle: state?.error ?? 'Unknown error',
      icon: <AlertIcon />,
    },
    'dev-build': {
      cardClass: 'border-slate-200 bg-slate-50',
      iconClass: 'bg-slate-100 text-slate-500',
      title: 'Development build',
      subtitle: 'Update checks are disabled in development builds. Build a release binary to enable update checks.',
      icon: <AlertIcon />,
    },
  };

  const config = configs[status];

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className={`rounded-2xl border-2 px-6 py-8 flex flex-col items-center gap-4 text-center ${config.cardClass}`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${config.iconClass}`}>
          {config.icon}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{config.title}</h3>
          <p className="text-sm text-slate-500 mt-1 break-words max-w-md">{config.subtitle}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-1">
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {checking && <SpinnerIcon className="w-4 h-4" />}
            {checking ? 'Checking…' : 'Check for updates'}
          </button>
          {state?.updateAvailable && state.asset != null && (
            <button
              type="button"
              onClick={() => { void openUpdateDownload(); }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              Download update
            </button>
          )}
        </div>
      </div>

      {state?.error && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Error details</p>
          <code className="block text-xs font-mono text-slate-700 break-all whitespace-pre-wrap">{state.error}</code>
        </div>
      )}

      {state && status !== 'dev-build' && (
        <div className="rounded-xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Current version</span>
            <span className="text-sm font-mono text-slate-700">{state.currentVersion || '—'}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Latest version</span>
            <span className="text-sm font-mono text-slate-700">{state.latestVersion || '—'}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-white">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Last checked</span>
            <span className="text-sm text-slate-500">{timeAgo(state.checkedAt)}</span>
          </div>
        </div>
      )}

      {state?.releaseNotesUrl && (
        <a
          href={state.releaseNotesUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 underline self-start"
        >
          View release notes →
        </a>
      )}
    </div>
  );
};

export default SystemUpdate;
