import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmationDialog from '../Modal/ConfirmationDialog';
import type { Repository } from '@/api/marketplace';
import { UntrustedRepoError } from '@/api/marketplace';

interface RepositoryManagerProps {
  repositories: Repository[];
  onAdd: (url: string, confirmUntrusted?: boolean) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  onRefresh: (id: number) => Promise<Repository>;
}

const RepositoryManager: React.FC<RepositoryManagerProps> = ({ repositories, onAdd, onRemove, onRefresh }) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAddConfirm, setPendingAddConfirm] = useState<{ message: string } | null>(null);
  const [pendingRemoveConfirm, setPendingRemoveConfirm] = useState<Repository | null>(null);

  const handleAdd = async (confirmUntrusted: boolean) => {
    setError(null);
    setSubmitting(true);
    try {
      await onAdd(url.trim(), confirmUntrusted);
      setUrl('');
      setPendingAddConfirm(null);
    } catch (err) {
      if (err instanceof UntrustedRepoError) {
        setPendingAddConfirm({ message: err.message });
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async (id: number) => {
    setRefreshingId(id);
    try {
      await onRefresh(id);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleRemoveConfirmed = async () => {
    if (!pendingRemoveConfirm) return;
    const id = pendingRemoveConfirm.id;
    setPendingRemoveConfirm(null);
    await onRemove(id);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
      <h3 className="text-base font-semibold text-slate-800 mb-3">
        {t('marketplace.repositories', 'Repositories')}
      </h3>

      {repositories.length > 0 && (
        <ul className="divide-y divide-slate-100 mb-4">
          {repositories.map((repo) => (
            <li key={repo.id} className="flex items-start gap-3 py-3 text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-900">{repo.name}</span>
                  {repo.trusted ? (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-semibold">
                      {t('marketplace.trusted', 'Verified')}
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-semibold">
                      {t('marketplace.untrusted', 'Untrusted')}
                    </span>
                  )}
                </div>
                {repo.description && (
                  <div className="text-slate-600 text-xs mt-0.5">{repo.description}</div>
                )}
                <div className="text-slate-400 text-xs mt-0.5 truncate">{repo.url}</div>
              </div>
              <button
                type="button"
                onClick={() => void handleRefresh(repo.id)}
                disabled={refreshingId === repo.id}
                title="Re-fetch catalog and update name/description"
                aria-label="Refresh repository"
                className="text-gray-400 hover:text-blue-600 transition-colors shrink-0 disabled:opacity-50"
              >
                <svg
                  className={`w-4 h-4 ${refreshingId === repo.id ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              {repo.trusted ? (
                <span
                  className="text-xs text-slate-400 shrink-0 mt-1"
                  title={t('marketplace.defaultRepoHint', 'Default repository — cannot be removed')}
                >
                  🔒
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setPendingRemoveConfirm(repo)}
                  className="text-gray-400 hover:text-red-500 transition-colors shrink-0 mt-0.5"
                  aria-label={t('delete')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) handleAdd(false);
        }}
        className="flex flex-wrap gap-2 items-end"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-slate-500 mb-1">{t('marketplace.url', 'URL')}</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/plugins/"
            required
            className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !url.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 text-sm rounded disabled:opacity-50"
        >
          {t('marketplace.add', 'Add')}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

      <ConfirmationDialog
        open={pendingAddConfirm !== null}
        onClose={() => setPendingAddConfirm(null)}
        onConfirm={() => handleAdd(true)}
        title={t('marketplace.untrustedTitle', 'Untrusted repository')}
        message={pendingAddConfirm?.message ?? ''}
        confirmLabel={t('marketplace.addAnyway', 'Add anyway')}
        cancelLabel={t('cancel', 'Cancel')}
      />

      <ConfirmationDialog
        open={pendingRemoveConfirm !== null}
        onClose={() => setPendingRemoveConfirm(null)}
        onConfirm={handleRemoveConfirmed}
        title={t('marketplace.removeRepoTitle', 'Remove repository')}
        message={t('marketplace.removeRepoMessage', {
          name: pendingRemoveConfirm?.name ?? '',
          defaultValue: 'Remove repository "{{name}}"?',
        })}
        confirmLabel={t('marketplace.removeRepoConfirm', 'Remove')}
        cancelLabel={t('cancel', 'Cancel')}
      >
        <p className="mt-3 text-sm text-slate-600">
          {t(
            'marketplace.removeRepoNote',
            'Only the repository link is removed. Plugins already installed from this repository stay installed and continue to work.',
          )}
        </p>
      </ConfirmationDialog>
    </div>
  );
};

export default RepositoryManager;
