import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';
import PluginDashboard from './PluginDashboard';
import Marketplace from './Marketplace';
import {
  fetchFrontendPlugins,
  fetchPluginManifest,
  PluginManifest,
  importPluginModule,
  deletePlugin,
  activatePlugin,
  deactivatePlugin,
} from '@/api/plugins.ts';
import { fetchMarketplace, type MarketplaceEntry, UntrustedRepoError } from '@/api/marketplace';
import { getPluginServerUrl } from '@/config/plugins.ts';
import { Response } from '@/backend/Response';
import { useToast } from '../Notification/ToastProvider';
import { useTopBar } from '../TopBar/TopBarContext';
import { useTranslation } from 'react-i18next';
import CreateButton from '../ui/Button/CreateButton';
import InfoAlert from '../ui/Alert/InfoAlert';
import MarketplaceAlert from '../ui/Alert/MarketplaceAlert';
import { useMarketplaceInstall } from './useMarketplaceInstall';
import { compareSemver } from '@/lib/semver';
import ConfirmationDialog from '../Modal/ConfirmationDialog';

type PluginWithSettings = PluginManifest & { settings?: { url: string; text: string }[]; broken?: boolean };

interface UpdateInfo {
  latestVersion: string;
  repoId: number;
  repoName: string;
  trusted: boolean;
  incompatible: boolean;
  entry: MarketplaceEntry;
}

const tabBtnClass = (active: boolean) =>
  `inline-flex items-center gap-2 px-5 py-3 text-sm border-b-2 -mb-px transition-colors ${
    active
      ? 'border-blue-600 text-blue-700 font-semibold'
      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
  }`;

const Plugin: React.FC = () => {
  const [activePlugins, setActivePlugins] = useState<PluginWithSettings[]>([]);
  const [deactivatedPlugins, setDeactivatedPlugins] = useState<PluginWithSettings[]>([]);
  const [topTab, setTopTab] = useState<'installed' | 'marketplace'>('installed');
  const [tab, setTab] = useState<'active' | 'deactivated'>('active');
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [forceReinstall, setForceReinstall] = useState(false);
  const [updates, setUpdates] = useState<Map<string, UpdateInfo>>(new Map());
  const [pendingUpdateConfirm, setPendingUpdateConfirm] = useState<UpdateInfo | null>(null);
  const { addToast } = useToast();
  const { setTitle } = useTopBar();
  const { t } = useTranslation();

  const loadAndSetPlugins = async () => {
    try {
      const response: Response = await fetchFrontendPlugins(getPluginServerUrl('/api/plugins'));
      const rows = (response.message || []) as PluginManifest[];
      const activeRows = rows.filter((p) => p.active !== false);
      const deactivatedRows = rows.filter((p) => p.active === false);

      const enrichedActive = await Promise.all(
        activeRows.map(async (plugin) => {
          const manifest = await fetchPluginManifest(`/plugins/${plugin.id}`);
          if (!manifest) return { ...plugin, broken: true } as PluginWithSettings;
          let settings: { url: string; text: string }[] | undefined = undefined;
          if (manifest.filename === 'index.html') {
            settings = manifest.menu?.settings;
          } else {
            try {
              const importPath = getPluginServerUrl(`/plugins/${plugin.id}/index.js`);
              const mod: any = await importPluginModule(importPath);
              if (mod && mod.pluginMenu && Array.isArray(mod.pluginMenu.settings)) {
                settings = mod.pluginMenu.settings;
              }
            } catch (e) {
              console.error('Pluginmodul konnte nicht geladen werden:', plugin.name, e);
            }
          }
          return { ...manifest, settings };
        })
      );

      let marketEntries: MarketplaceEntry[] = [];
      try {
        const market = await fetchMarketplace();
        marketEntries = market.entries;
      } catch {
        addToast({ message: t('plugins.updateCheckFailed', "Couldn't check for plugin updates"), type: 'error' });
      }
      const installedVersionMap = new Map<string, string>();
      for (const row of rows) {
        if (row.id && row.version) installedVersionMap.set(row.id, row.version);
      }
      const newUpdates = new Map<string, UpdateInfo>();
      for (const entry of marketEntries) {
        if (entry.local) continue;
        const installedVersion = installedVersionMap.get(entry.id);
        if (!installedVersion) continue;
        if (compareSemver(installedVersion, entry.version) >= 0) continue;
        const existing = newUpdates.get(entry.id);
        if (existing) {
          const cmp = compareSemver(existing.latestVersion, entry.version);
          if (cmp > 0) continue;
          if (cmp === 0 && existing.trusted) continue;
        }
        const incompatible = entry.minPreviousVersion
          ? compareSemver(installedVersion, entry.minPreviousVersion) < 0
          : false;
        newUpdates.set(entry.id, {
          latestVersion: entry.version,
          repoId: entry.repoId,
          repoName: entry.repoName,
          trusted: entry.trusted,
          incompatible,
          entry,
        });
      }
      setUpdates(newUpdates);

      setActivePlugins(enrichedActive as PluginWithSettings[]);
      setDeactivatedPlugins(deactivatedRows as PluginWithSettings[]);
    } catch (err) {
      addToast({ message: 'Fehler beim Laden der Plugins.', type: 'error' });
    }
  };

  const loadAndSetPluginsRef = React.useRef(loadAndSetPlugins);
  loadAndSetPluginsRef.current = loadAndSetPlugins;

  const { inFlight: updateInFlight, trigger: triggerUpdate, dismiss: dismissUpdate } = useMarketplaceInstall({
    onCompleted: (name) => {
      addToast({ message: t('plugins.update.success', '{{name}} updated', { name }), type: 'success' });
      window.dispatchEvent(new CustomEvent('plugins:changed'));
      void loadAndSetPluginsRef.current();
    },
    onFailed: (name, message) => {
      addToast({ message: `${name}: ${message}`, type: 'error' });
    },
  });

  useEffect(() => {
    setTitle(t('plugins.title'));
    void loadAndSetPlugins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, setTitle]);

  useEffect(() => {
    const handler = () => { void loadAndSetPluginsRef.current(); };
    window.addEventListener('plugins:changed', handler);
    return () => window.removeEventListener('plugins:changed', handler);
  }, []);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    setUploading(true);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) {
      addToast({ message: t('plugins.upload.selectZip'), type: 'error' });
      setUploading(false);
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const installUrl = getPluginServerUrl('/api/plugins/install') + (forceReinstall ? '?force=true' : '');
      const res = await fetch(installUrl, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        addToast({ message: data.message || t('plugins.upload.error'), type: 'error' });
        setUploading(false);
        return;
      }
      addToast({ message: t('plugins.upload.success'), type: 'success' });
      window.dispatchEvent(new CustomEvent('plugins:changed'));
      await loadAndSetPlugins();
      setShowUpload(false);
    } catch (err) {
      addToast({ message: t('plugins.upload.error'), type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePlugin(id);
      addToast({ message: t('plugins.delete.success'), type: 'success' });
      window.dispatchEvent(new CustomEvent('plugins:changed'));
      await loadAndSetPlugins();
    } catch (e: any) {
      addToast({ message: e.message || t('plugins.delete.error'), type: 'error' });
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivatePlugin(id);
      addToast({ message: t('plugins.deactivate.success', 'Plugin deactivated'), type: 'success' });
      window.dispatchEvent(new CustomEvent('plugins:changed'));
      await loadAndSetPlugins();
    } catch (e: any) {
      addToast({
        message: e.message || t('plugins.deactivate.error', 'Failed to deactivate plugin'),
        type: 'error',
      });
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await activatePlugin(id);
      addToast({ message: t('plugins.activate.success', 'Plugin activated'), type: 'success' });
      window.dispatchEvent(new CustomEvent('plugins:changed'));
      await loadAndSetPlugins();
    } catch (e: any) {
      addToast({
        message: e.message || t('plugins.activate.error', 'Failed to activate plugin'),
        type: 'error',
      });
    }
  };

  const handleUpdate = useCallback((pluginId: string) => {
    const info = updates.get(pluginId);
    if (info) setPendingUpdateConfirm(info);
  }, [updates]);

  const confirmUpdate = useCallback(async (info: UpdateInfo, confirmUntrusted: boolean) => {
    setPendingUpdateConfirm(null);
    try {
      await triggerUpdate(info.entry, confirmUntrusted);
    } catch (err) {
      if (err instanceof UntrustedRepoError) {
        setPendingUpdateConfirm(info);
      } else {
        addToast({ message: err instanceof Error ? err.message : String(err), type: 'error' });
      }
    }
  }, [triggerUpdate, addToast]);

  const selectedList = tab === 'active' ? activePlugins : deactivatedPlugins;

  return (
    <div className="p-2 w-full min-h-screen">
      <nav className="border-b border-slate-200 px-2 flex gap-1 mt-25 mb-4">
        <button
          type="button"
          onClick={() => setTopTab('installed')}
          className={tabBtnClass(topTab === 'installed')}
        >
          {t('plugins.tab.installed', 'Installed')}
          {activePlugins.length + deactivatedPlugins.length > 0 && (
            <span className="text-xs text-slate-400 tabular-nums">
              {activePlugins.length + deactivatedPlugins.length}
            </span>
          )}
          {updates.size > 0 && (
            <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold tabular-nums">
              {updates.size}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTopTab('marketplace')}
          className={tabBtnClass(topTab === 'marketplace')}
        >
          {t('plugins.tab.marketplace', 'Marketplace')}
        </button>
      </nav>
      {topTab === 'marketplace' ? (
        <MarketplaceAlert
          title={t('plugins.marketplaceIntroTitle', 'Plugin Marketplace')}
          message={t('plugins.marketplaceIntro')}
          className="mb-4"
        />
      ) : (
        <InfoAlert message={t('plugins.intro')} className="mb-4" />
      )}
      {topTab === 'installed' && (
        <>
          {showUpload && (
            <div className="bg-white border rounded p-4 shadow mb-4">
              <h3 className="text-lg font-semibold mb-2">{t('plugins.uploadTitle')}</h3>
              <input
                type="file"
                accept=".zip"
                onChange={handleUpload}
                disabled={uploading}
                className="mb-3"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none mb-2">
                <input
                  type="checkbox"
                  checked={forceReinstall}
                  onChange={(e) => setForceReinstall(e.target.checked)}
                  disabled={uploading}
                  className="w-4 h-4 accent-blue-600"
                />
                {t('plugins.forceReinstall', 'Force reinstall — delete existing version first')}
              </label>
              {uploading && <div className="text-blue-500">{t('plugins.uploading')}</div>}
            </div>
          )}
          <div className="mt-4 mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex bg-slate-100 rounded-lg p-1 gap-1">
              <button
                type="button"
                onClick={() => setTab('active')}
                className={`inline-flex items-center gap-2 px-4 py-1.5 text-sm rounded-md transition-colors ${
                  tab === 'active'
                    ? 'bg-white text-slate-900 shadow-sm font-medium'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('plugins.tab.active', 'Active')}
                {activePlugins.length > 0 && (
                  <span className="text-xs text-slate-400 tabular-nums">{activePlugins.length}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setTab('deactivated')}
                className={`inline-flex items-center gap-2 px-4 py-1.5 text-sm rounded-md transition-colors ${
                  tab === 'deactivated'
                    ? 'bg-white text-slate-900 shadow-sm font-medium'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('plugins.tab.deactivated', 'Deactivated')}
                {deactivatedPlugins.length > 0 && (
                  <span className="text-xs text-slate-400 tabular-nums">{deactivatedPlugins.length}</span>
                )}
              </button>
            </div>
            <CreateButton onClick={() => setShowUpload((v) => !v)} label={t('plugins.uploadButton')} />
          </div>
          <PluginDashboard
            plugins={selectedList}
            variant={tab}
            updates={updates}
            updateInFlight={updateInFlight}
            onUpdate={handleUpdate}
            onDismissUpdate={(pluginId) => {
              const info = updates.get(pluginId);
              if (info) dismissUpdate(`${info.repoId}:${pluginId}`);
            }}
            onDelete={handleDelete}
            onDeactivate={handleDeactivate}
            onActivate={handleActivate}
          />
        </>
      )}
      {topTab === 'marketplace' && <Marketplace />}
      <ConfirmationDialog
        open={pendingUpdateConfirm !== null}
        onClose={() => setPendingUpdateConfirm(null)}
        onConfirm={() => pendingUpdateConfirm && void confirmUpdate(pendingUpdateConfirm, pendingUpdateConfirm.trusted ? false : true)}
        title={t('plugins.update.confirmTitle', 'Update {{name}}', { name: pendingUpdateConfirm?.entry.name ?? '' })}
        message={t('plugins.update.confirmMessage', 'This replaces the installed version. Plugin data may be reset. Continue?')}
        confirmLabel={t('plugins.update.confirm', 'Update')}
        cancelLabel={t('cancel', 'Cancel')}
      />
    </div>
  );
};

export default Plugin;

export { PluginPersistentHost } from './PluginPersistentHost';
export { PluginRouteSlot, PluginSlotRegistry } from './PluginRouteSlot';
