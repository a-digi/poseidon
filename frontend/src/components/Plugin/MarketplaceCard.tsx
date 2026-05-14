import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmationDialog from '../Modal/ConfirmationDialog';
import type { MarketplaceEntry } from '@/api/marketplace';
import { UntrustedRepoError } from '@/api/marketplace';
import { compareSemver } from '@/lib/semver';

export type MarketplaceCardProgressState =
  | 'pending'
  | 'in_progress'
  | 'failed'
  | 'dead_lettered';

export interface MarketplaceCardProgress {
  state: MarketplaceCardProgressState;
  attempts: number;
  lastError?: string;
}

interface MarketplaceCardProps {
  entry: MarketplaceEntry;
  installedVersion?: string;
  installedActive?: boolean;
  onInstall: (confirmUntrusted?: boolean) => Promise<void>;
  onActivate?: () => Promise<void>;
  progress?: MarketplaceCardProgress;
  onDismissProgress?: () => void;
}

const PlaceholderIcon: React.FC = () => (
  <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 6.5a2 2 0 10-4 0v.5H6a1 1 0 00-1 1v3.5h.5a2 2 0 110 4H5V19a1 1 0 001 1h3.5v-.5a2 2 0 114 0V20H17a1 1 0 001-1v-4h.5a2 2 0 110-4H18V8a1 1 0 00-1-1h-3v-.5z" />
    </svg>
);

const InlineSpinner: React.FC = () => (
  <svg
    className="inline-block w-4 h-4 mr-2 -ml-1 animate-spin text-current"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const truncateError = (msg: string, max = 140): string =>
  msg.length > max ? `${msg.slice(0, max - 1)}…` : msg;

const MarketplaceCard: React.FC<MarketplaceCardProps> = ({
  entry,
  installedVersion,
  installedActive,
  onInstall,
  onActivate,
  progress,
  onDismissProgress,
}) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string } | null>(null);

  const isLocal = entry.local === true;
  const isInstalled = installedVersion !== undefined;
  const needsActivation = isInstalled && installedActive === false;
  const isUpdate = isInstalled && !needsActivation && installedVersion !== undefined && compareSemver(installedVersion, entry.version) < 0;
  const isUpToDate = isInstalled && !needsActivation && !isUpdate;

  const handleInstall = async (confirmUntrusted: boolean) => {
    setBusy(true);
    try {
      await onInstall(confirmUntrusted);
      setPendingConfirm(null);
    } catch (err) {
      if (err instanceof UntrustedRepoError) {
        setPendingConfirm({ message: err.message });
        return;
      }
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleActivate = async () => {
    if (!onActivate) return;
    setBusy(true);
    try {
      await onActivate();
    } finally {
      setBusy(false);
    }
  };

  const buttonLabel = isUpToDate
    ? t('marketplace.installed', 'Installed')
    : needsActivation
    ? t('marketplace.activate', 'Activate')
    : isUpdate
    ? t('marketplace.update', 'Update')
    : t('marketplace.installVersion', 'Install v{{version}}', { version: entry.version });

  const buttonClass = isUpToDate
    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
    : needsActivation
    ? 'bg-green-600 hover:bg-green-700 text-white'
    : isUpdate
    ? 'bg-amber-500 hover:bg-amber-600 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  const busyLabel = needsActivation
    ? t('marketplace.activating', 'Activating…')
    : t('marketplace.installing', 'Installing…');

  const isActiveProgress = progress !== undefined && (progress.state === 'pending' || progress.state === 'in_progress');

  const handleClick = () => {
    if (busy || isUpToDate || isActiveProgress) return;
    if (needsActivation) {
      void handleActivate();
    } else {
      void handleInstall(false);
    }
  };

  const borderClass = entry.trusted ? 'border border-slate-200' : 'border-2 border-amber-300';

  const progressLabel = progress
    ? progress.state === 'pending'
      ? t('marketplace.install.pending', 'Pending…')
      : progress.state === 'in_progress'
      ? progress.attempts > 1
        ? t('marketplace.install.retrying', 'Retrying… (attempt {{n}})', { n: progress.attempts })
        : t('marketplace.install.inProgress', 'Installing…')
      : t('marketplace.install.failed', 'Install failed')
    : null;

  const buttonDisabled = isUpToDate || busy || isActiveProgress;
  const showSpinner = isActiveProgress || (progress === undefined && busy);
  const showProgressLabel = isActiveProgress;

  return (
    <div className={`bg-white rounded-lg shadow-sm flex flex-col ${borderClass} hover:shadow-md transition-shadow duration-200 overflow-hidden`}>
      <div className="flex flex-row gap-3 p-4 flex-1">
        <div className="shrink-0 w-16 h-16 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
          {entry.iconUrl ? (
            <img src={entry.iconUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <PlaceholderIcon />
          )}
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-slate-900 truncate flex-1" title={entry.name}>
              {entry.name}
            </h3>
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium tabular-nums shrink-0">
              v{entry.version}
            </span>
            {isLocal ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                {t('marketplace.local.badge')}
              </span>
            ) : (
              !entry.trusted && (
                <span
                  className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-semibold shrink-0"
                  title={t('marketplace.untrustedHint', 'This source is not verified')}
                >
                  ⚠ {t('marketplace.untrusted', 'Untrusted')}
                </span>
              )
            )}
          </div>

          {entry.description && (
            <p className="text-sm text-slate-600 mb-2 line-clamp-2" title={entry.description}>
              {entry.description}
            </p>
          )}

          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {entry.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            {entry.author && <span>{t('byAuthor', { author: entry.author })}</span>}
            {entry.website && (
              <>
                <span className="text-slate-300">·</span>
                <a
                  href={entry.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline hover:text-blue-700"
                >
                  {t('website', 'Website')}
                </a>
              </>
            )}
            <span className="text-slate-300">·</span>
            <span>
              {t('marketplace.from', 'from')} <span className="font-medium text-slate-600">{entry.repoName}</span>
            </span>
          </div>
        </div>
      </div>

      {isLocal ? (
        <button
          type="button"
          disabled
          title={t('marketplace.local.tooltip')}
          className="w-full px-4 py-2.5 text-sm font-semibold bg-slate-200 text-slate-500 cursor-not-allowed disabled:opacity-50 transition-colors inline-flex items-center justify-center"
        >
          {t('marketplace.local.button')}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={buttonDisabled}
          className={`w-full px-4 py-2.5 text-sm font-semibold ${buttonClass} disabled:opacity-50 transition-colors inline-flex items-center justify-center`}
        >
          {showSpinner && <InlineSpinner />}
          {showProgressLabel ? progressLabel : busy ? busyLabel : buttonLabel}
        </button>
      )}

      {progress?.lastError && (progress.state === 'failed' || progress.state === 'dead_lettered') && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-red-700 bg-red-50 border-t border-red-200">
          <span className="flex-1 truncate" title={progress.lastError}>
            {truncateError(progress.lastError)}
          </span>
          {onDismissProgress && (
            <button
              type="button"
              onClick={onDismissProgress}
              aria-label={t('dismiss', 'Dismiss')}
              className="shrink-0 text-red-400 hover:text-red-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      <ConfirmationDialog
        open={pendingConfirm !== null}
        onClose={() => setPendingConfirm(null)}
        onConfirm={() => handleInstall(true)}
        title={t('marketplace.untrustedInstallTitle', 'Untrusted plugin source')}
        message={pendingConfirm?.message ?? ''}
        confirmLabel={t('marketplace.installAnyway', 'Install anyway')}
        cancelLabel={t('cancel', 'Cancel')}
      />
    </div>
  );
};

export default MarketplaceCard;
