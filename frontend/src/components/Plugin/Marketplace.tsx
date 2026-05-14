import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../Notification/ToastProvider';
import RepositoryManager from './RepositoryManager';
import MarketplaceCard from './MarketplaceCard';
import type { MarketplaceCardProgress } from './MarketplaceCard';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';
import {
  listRepositories,
  addRepository,
  removeRepository,
  fetchMarketplace,
  refreshRepository,
  type Repository,
  type MarketplaceEntry,
} from '@/api/marketplace';
import { fetchFrontendPlugins, activatePlugin } from '@/api/plugins';
import { getPluginServerUrl } from '@/config/plugins';
import { useMarketplaceInstall } from './useMarketplaceInstall';

interface InstalledInfo {
  version: string;
  active: boolean;
}

type View = 'plugins' | 'repositories';
type StatusFilter = 'all' | 'installed' | 'not-installed' | 'deactivated';

const entryKey = (entry: { repoId: number; id: string }) => `${entry.repoId}:${entry.id}`;

const Marketplace: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [view, setView] = useState<View>('plugins');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [entries, setEntries] = useState<MarketplaceEntry[]>([]);
  const [errors, setErrors] = useState<{ repoId: number; message: string }[]>([]);
  const [installed, setInstalled] = useState<Map<string, InstalledInfo>>(new Map());
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedAuthors, setSelectedAuthors] = useState<Set<string>>(new Set());
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const repos = await listRepositories();
      setRepositories(repos);
      const market = await fetchMarketplace();
      setEntries(market.entries);
      setErrors(market.errors);

      const installedRows = await fetchFrontendPlugins(getPluginServerUrl('/api/plugins'));
      const list = (installedRows.message ?? []) as { id: string; version?: string; active?: boolean }[];
      const map = new Map<string, InstalledInfo>();
      for (const row of list) {
        if (row.id) {
          map.set(row.id, {
            version: row.version ?? '',
            active: row.active !== false,
          });
        }
      }
      setInstalled(map);
    } catch (err) {
      addToast({ message: err instanceof Error ? err.message : String(err), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const { inFlight, trigger, dismiss } = useMarketplaceInstall({
    onCompleted: (entryName) => {
      addToast({ message: t('marketplace.install.success', '{{name}} installed', { name: entryName }), type: 'success' });
      window.dispatchEvent(new CustomEvent('plugins:changed'));
      void refresh();
    },
    onFailed: (entryName, message) => {
      addToast({ message: `${entryName}: ${message}`, type: 'error' });
    },
  });

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (url: string, confirmUntrusted?: boolean) => {
    await addRepository(url, confirmUntrusted);
    addToast({ message: t('marketplace.addSuccess', 'Repository added'), type: 'success' });
    await refresh();
  };

  const handleRemove = async (id: number) => {
    try {
      await removeRepository(id);
      addToast({ message: t('marketplace.removeSuccess', 'Repository removed'), type: 'success' });
      await refresh();
    } catch (err) {
      addToast({ message: err instanceof Error ? err.message : String(err), type: 'error' });
    }
  };

  const handleRefreshRepository = async (id: number): Promise<Repository> => {
    const updated = await refreshRepository(id);
    setRepositories((prev) => prev.map((r) => (r.id === id ? updated : r)));
    addToast({ message: t('marketplace.refreshRepoSuccess', 'Repository refreshed'), type: 'success' });
    return updated;
  };

  const handleInstall = async (entry: MarketplaceEntry, confirmUntrusted?: boolean) => {
    await trigger(entry, confirmUntrusted);
  };

  const handleActivate = async (entry: MarketplaceEntry) => {
    try {
      await activatePlugin(entry.id);
      addToast({
        message: t('marketplace.activateSuccess', 'Plugin activated: {{name}}', { name: entry.name }),
        type: 'success',
      });
      window.dispatchEvent(new CustomEvent('plugins:changed'));
      await refresh();
    } catch (err) {
      addToast({ message: err instanceof Error ? err.message : String(err), type: 'error' });
    }
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.tags.forEach((tag) => set.add(tag)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const allAuthors = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => { if (e.author) set.add(e.author); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (q) {
        const haystack =
          `${entry.name} ${entry.description} ${entry.author}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (selectedTags.size > 0 && !entry.tags.some((tag) => selectedTags.has(tag))) {
        return false;
      }
      if (selectedAuthors.size > 0 && !selectedAuthors.has(entry.author)) {
        return false;
      }
      if (selectedRepos.size > 0 && !selectedRepos.has(entry.repoId)) {
        return false;
      }
      if (statusFilter !== 'all') {
        const info = installed.get(entry.id);
        const isInstalled = info !== undefined;
        const isDeactivated = isInstalled && info!.active === false;
        if (statusFilter === 'installed' && !isInstalled) return false;
        if (statusFilter === 'not-installed' && isInstalled) return false;
        if (statusFilter === 'deactivated' && !isDeactivated) return false;
      }
      return true;
    });
  }, [entries, search, selectedTags, selectedAuthors, selectedRepos, statusFilter, installed]);

  const activeFilterCount =
    selectedTags.size +
    selectedAuthors.size +
    selectedRepos.size +
    (statusFilter !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedTags(new Set());
    setSelectedAuthors(new Set());
    setSelectedRepos(new Set());
    setStatusFilter('all');
  };

  if (view === 'repositories') {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => setView('plugins')}
            className="text-blue-600 text-sm hover:text-blue-800 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('marketplace.backToPlugins', 'Back to Marketplace')}
          </button>
          <h3 className="text-base font-semibold text-slate-800 ml-auto">
            {t('marketplace.repositoriesPageTitle', 'Plugin Repositories')}
          </h3>
        </div>
        <RepositoryManager
          repositories={repositories}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onRefresh={handleRefreshRepository}
        />
      </div>
    );
  }

  const segmentClass = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
      active
        ? 'bg-white text-slate-900 shadow-sm'
        : 'text-slate-600 hover:text-slate-900'
    }`;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-base font-semibold text-slate-800">
          {t('marketplace.availablePlugins', 'Available plugins')}
        </h3>
        <span className="text-xs text-slate-400 tabular-nums">
          {repositories.length} {t('marketplace.reposCount', 'repositories')}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="text-blue-600 text-sm hover:text-blue-800 disabled:opacity-50"
          >
            {t('marketplace.refresh', 'Refresh')}
          </button>
          <button
            type="button"
            onClick={() => setView('repositories')}
            className="text-blue-600 text-sm hover:text-blue-800 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t('marketplace.manageRepositories', 'Manage repositories')}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-3 mb-4 shadow-sm">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('marketplace.searchPlaceholder', 'Search plugins by title, description, or author…')}
            className="w-full pl-10 pr-10 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-blue-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label={t('clear', 'Clear')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="mt-3 w-full flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          <svg
            className={`w-4 h-4 transition-transform ${filtersOpen ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>{t('marketplace.filters', 'Filters')}</span>
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold tabular-nums">
              {activeFilterCount}
            </span>
          )}
          <span className="ml-auto text-xs text-slate-400 tabular-nums">
            {t('marketplace.showing', {
              count: filteredEntries.length,
              total: entries.length,
              defaultValue: 'Showing {{count}} of {{total}} plugins',
            })}
          </span>
        </button>

        {filtersOpen && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-6">
              <MultiSelectDropdown
                label={t('marketplace.filterByTags', 'Tags')}
                items={allTags.map((tag) => ({ value: tag, label: tag }))}
                selected={Array.from(selectedTags)}
                onChange={(values) => setSelectedTags(new Set(values))}
              />
              <MultiSelectDropdown
                label={t('marketplace.filterByAuthors', 'Authors')}
                items={allAuthors.map((author) => ({ value: author, label: author }))}
                selected={Array.from(selectedAuthors)}
                onChange={(values) => setSelectedAuthors(new Set(values))}
              />
              <MultiSelectDropdown
                label={t('marketplace.filterByRepositories', 'Repositories')}
                items={repositories.map((repo) => ({ value: String(repo.id), label: repo.name }))}
                selected={Array.from(selectedRepos).map(String)}
                onChange={(values) => setSelectedRepos(new Set(values.map((v) => Number(v))))}
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {t('marketplace.filterByStatus', 'Status')}
              </div>
              <div className="inline-flex bg-slate-100 rounded-lg p-1 gap-1 flex-wrap">
                <button type="button" onClick={() => setStatusFilter('all')} className={segmentClass(statusFilter === 'all')}>
                  {t('marketplace.statusAll', 'All')}
                </button>
                <button type="button" onClick={() => setStatusFilter('installed')} className={segmentClass(statusFilter === 'installed')}>
                  {t('marketplace.statusInstalled', 'Installed')}
                </button>
                <button type="button" onClick={() => setStatusFilter('not-installed')} className={segmentClass(statusFilter === 'not-installed')}>
                  {t('marketplace.statusNotInstalled', 'Not installed')}
                </button>
                <button type="button" onClick={() => setStatusFilter('deactivated')} className={segmentClass(statusFilter === 'deactivated')}>
                  {t('marketplace.statusDeactivated', 'Deactivated')}
                </button>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-blue-600 text-sm hover:text-blue-800"
                >
                  {t('marketplace.clearFilters', 'Clear filters')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 text-sm">
          <div className="font-semibold text-amber-800 mb-1">
            {t('marketplace.errorsTitle', 'Some repositories could not be reached')}
          </div>
          <ul className="text-amber-700 list-disc pl-5">
            {errors.map((err, i) => (
              <li key={`${err.repoId}-${i}`}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {entries.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">
          {repositories.length === 0
            ? t('marketplace.emptyNoRepos', 'No repositories configured.')
            : t('marketplace.empty', 'No plugins available in the configured repositories.')}{' '}
          <button
            type="button"
            onClick={() => setView('repositories')}
            className="text-blue-600 underline hover:text-blue-800"
          >
            {t('marketplace.manageRepositoriesLink', 'Manage repositories')}
          </button>
        </div>
      )}

      {entries.length > 0 && filteredEntries.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          {t('marketplace.noResults', 'No plugins match the current filters.')}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEntries.map((entry) => {
          const info = installed.get(entry.id);
          const task = inFlight[entryKey(entry)];
          const progress: MarketplaceCardProgress | undefined = task && task.status !== 'completed'
            ? {
                state: task.status,
                attempts: task.attempts,
                lastError: task.lastError || undefined,
              }
            : undefined;
          return (
            <MarketplaceCard
              key={`${entry.repoId}-${entry.id}`}
              entry={entry}
              installedVersion={info?.version}
              installedActive={info?.active}
              onInstall={(confirmUntrusted) => handleInstall(entry, confirmUntrusted)}
              onActivate={() => handleActivate(entry)}
              progress={progress}
              onDismissProgress={() => dismiss(entryKey(entry))}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Marketplace;
