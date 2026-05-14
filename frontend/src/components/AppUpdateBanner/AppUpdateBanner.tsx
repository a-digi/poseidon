import { useEffect, useState } from 'react';
import { checkForUpdate, openUpdateDownload, UpdateState } from '../../api/appUpdate';

const DISMISSED_KEY = 'app-update-dismissed';

export function AppUpdateBanner() {
  const [state, setState] = useState<UpdateState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkForUpdate()
      .then((s) => { if (!cancelled) setState(s); })
      .catch(() => null);
    return () => { cancelled = true; };
  }, []);

  if (!state || !state.updateAvailable || state.error) return null;
  if (dismissed || localStorage.getItem(DISMISSED_KEY) === state.latestVersion) return null;

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, state!.latestVersion);
    setDismissed(true);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
      <span className="flex-1">Update available: v{state.latestVersion}</span>
      <button
        onClick={openUpdateDownload}
        className="px-3 py-0.5 rounded bg-amber-400 hover:bg-amber-500 text-amber-950 font-medium"
      >
        Download
      </button>
      {state.releaseNotesUrl && (
        <a
          href={state.releaseNotesUrl}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-amber-700"
        >
          Release notes
        </a>
      )}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss update banner"
        className="ml-1 text-amber-600 hover:text-amber-900 leading-none"
      >
        ×
      </button>
    </div>
  );
}
