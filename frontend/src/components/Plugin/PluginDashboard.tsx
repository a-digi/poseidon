import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmationDialog from '../Modal/ConfirmationDialog';
import { Switch } from '../Switch';
import type { InstallTask } from './useMarketplaceInstall';

interface UpdateInfo {
  latestVersion: string;
  repoId: number;
  repoName: string;
  trusted: boolean;
  incompatible?: boolean;
}

interface PluginInfo {
  id: string;
  name: string;
  version?: string;
  description?: string;
  author?: string;
  tags?: string[];
  website?: string;
  active?: boolean;
  localDev?: boolean;
  broken?: boolean;
  settings?: { url: string; text: string }[];
}

interface PluginDashboardProps {
  plugins: PluginInfo[];
  variant: 'active' | 'deactivated';
  updates?: Map<string, UpdateInfo>;
  updateInFlight?: Record<string, InstallTask>;
  onUpdate?: (pluginId: string) => void;
  onDelete: (id: string) => void;
  onDeactivate?: (id: string) => void;
  onActivate?: (id: string) => void;
  onDismissUpdate?: (pluginId: string) => void;
}

const PluginDashboard: React.FC<PluginDashboardProps> = ({
  plugins,
  variant,
  updates,
  updateInFlight,
  onUpdate,
  onDelete,
  onDeactivate,
  onActivate,
  onDismissUpdate,
}) => {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState<string | null>(null);
  const isDeactivated = variant === 'deactivated';
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 mt-10 gap-6">
      {plugins.length === 0 && (
        <div className="col-span-full text-gray-500 text-center">
          {t(isDeactivated ? 'plugins.noDeactivated' : 'plugins.noPlugins')}
        </div>
      )}
      {plugins.map((plugin) => {
        const pluginSettings = plugin.settings || [];
        const showConfirm = confirmOpen === plugin.id;

        const updateInfo = updates?.get(plugin.id);
        const updateKey = updateInfo ? `${updateInfo.repoId}:${plugin.id}` : undefined;
        const updateTask = updateKey ? updateInFlight?.[updateKey] : undefined;
        const isUpdating =
          updateTask !== undefined &&
          (updateTask.status === 'pending' || updateTask.status === 'in_progress');
        const updateFailed =
          updateTask !== undefined &&
          (updateTask.status === 'failed' || updateTask.status === 'dead_lettered');

        return (
          <div
            key={plugin.name}
            className={`bg-white rounded-lg shadow-md flex flex-col border hover:shadow-xl transition-shadow duration-200 overflow-hidden ${
              isDeactivated ? 'opacity-70' : ''
            }`}
          >
            <ConfirmationDialog
              open={showConfirm}
              onClose={() => setConfirmOpen(null)}
              onConfirm={() => {
                setConfirmOpen(null);
                onDelete(plugin.id);
              }}
              title={t('delete') + ' ' + plugin.name}
              message={t('plugins.confirmDelete', { name: plugin.name })}
              confirmLabel={t('delete')}
              cancelLabel={t('cancel')}
            >
              <p className="mt-3 text-sm text-red-600">
                {t(
                  'plugins.deleteWarning',
                  'All plugin files and saved data will be permanently removed and cannot be recovered.',
                )}
              </p>
              {!isDeactivated && onDeactivate && (
                <p className="mt-2 text-sm text-gray-600">
                  {t(
                    'plugins.deleteDeactivateSuggestion',
                    'To keep your data, consider deactivating the plugin instead.',
                  )}{' '}
                  <button
                    type="button"
                    className="text-blue-600 underline hover:text-blue-800"
                    onClick={() => {
                      setConfirmOpen(null);
                      onDeactivate(plugin.id);
                    }}
                  >
                    {t('plugins.deactivateInstead', 'Deactivate instead')}
                  </button>
                </p>
              )}
            </ConfirmationDialog>

            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="text-xl font-bold text-slate-900 truncate">{plugin.name}</div>
                {plugin.version && (
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium tabular-nums shrink-0">
                    v{plugin.version}
                  </span>
                )}
                {plugin.localDev && (
                  <span
                    className="inline-flex items-center text-[10px] font-bold tracking-widest uppercase text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full shrink-0"
                    title={t('marketplace.local.tooltip')}
                  >
                    {t('marketplace.local.badge')}
                  </span>
                )}
                {plugin.broken && (
                  <span className="inline-flex items-center text-[10px] font-bold tracking-widest uppercase text-red-800 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full shrink-0">
                    Broken
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 flex flex-col flex-1">
              {plugin.description && (
                <div className="text-gray-600 text-sm">{plugin.description}</div>
              )}
            </div>

            {plugin.tags && plugin.tags.length > 0 && (
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                <div className="flex flex-wrap gap-1">
                  {plugin.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(plugin.author || pluginSettings.length > 0 || plugin.website) && (
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {plugin.author && (
                    <span className="text-gray-500">
                      {t('byAuthor', { author: plugin.author })}
                    </span>
                  )}
                  {pluginSettings.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      className="text-blue-600 underline hover:text-blue-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.text}
                    </a>
                  ))}
                  {plugin.website && (
                    <a
                      href={plugin.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline hover:text-blue-700"
                    >
                      {t('website')}
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
              <Switch
                checked={!isDeactivated}
                disabled={plugin.broken === true}
                onChange={(active) =>
                  active ? onActivate?.(plugin.id) : onDeactivate?.(plugin.id)
                }
                aria-label={isDeactivated ? t('plugins.activate', 'Activate') : t('plugins.deactivate', 'Deactivate')}
              />
              {updateInfo && !plugin.localDev && !plugin.broken && (
                updateInfo.incompatible ? (
                  <button
                    type="button"
                    disabled
                    title={t(
                      'plugins.update.manualReinstallTooltip',
                      'This update changes the plugin\'s data format. To upgrade safely, uninstall {{name}} first, then reinstall v{{version}} from the Marketplace.',
                      { name: plugin.name, version: updateInfo.latestVersion },
                    )}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-slate-200 text-slate-500 cursor-not-allowed"
                  >
                    {t('plugins.update.manualReinstall', 'Update v{{version}} — manual reinstall', { version: updateInfo.latestVersion })}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => !isUpdating && onUpdate?.(plugin.id)}
                    disabled={isUpdating}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                      isUpdating
                        ? 'bg-amber-300 text-amber-900 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    } disabled:opacity-60`}
                  >
                    {isUpdating && (
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    {isUpdating
                      ? t('plugins.update.updating', 'Updating…')
                      : t('plugins.update.button', 'Update to v{{version}}', { version: updateInfo.latestVersion })}
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => setConfirmOpen(plugin.id)}
                aria-label={t('delete')}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            {updateFailed && updateTask?.lastError && (
              <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-red-700 bg-red-50 border-t border-red-200">
                <span className="flex-1 truncate" title={updateTask.lastError}>
                  {updateTask.lastError.length > 120
                    ? updateTask.lastError.slice(0, 119) + '…'
                    : updateTask.lastError}
                </span>
                {onDismissUpdate && (
                  <button
                    type="button"
                    onClick={() => onDismissUpdate(plugin.id)}
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
          </div>
        );
      })}
    </div>
  );
};

export default PluginDashboard;
