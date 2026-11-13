/**
 * Zotero TaskFlow - Preferences Dependency Rules, Prefs Observer & L10n Status Helper
 */

import { addAbortableListener } from '../lifecycle';
import { FIELDS, PREFIX, getPref } from './model';

export const DEPENDENCY_RULES: Record<string, string[]> = {
  enableItemPane: ['itemPaneShowProgressBar', 'itemPaneShowSubtasks'],
  autoSyncChildNote: [
    'childNoteTitle',
    'childNoteIncludeSubtasks',
    'childNoteIncludeQuotes',
    'childNoteAutoUpdateOnSubtask'
  ],
  autoTagOnCreate: ['tagForPending'],
  autoTagOnComplete: ['tagForCompleted'],
  dailySummary: ['summaryTime']
};

export function setStatusL10n(
  statusEl: Element | null | undefined,
  l10nId: string | null,
  fallbackText: string,
  l10nArgs?: Record<string, unknown>
): void {
  if (!statusEl) return;
  if (l10nId) {
    statusEl.setAttribute('data-l10n-id', l10nId);
    if (l10nArgs) {
      statusEl.setAttribute('data-l10n-args', JSON.stringify(l10nArgs));
    } else {
      statusEl.removeAttribute('data-l10n-args');
    }
  } else {
    statusEl.removeAttribute('data-l10n-id');
    statusEl.removeAttribute('data-l10n-args');
  }
  statusEl.textContent = fallbackText;
}

export function updateDependencies(doc: Document): void {
  if (!doc) return;
  for (const [parentKey, children] of Object.entries(DEPENDENCY_RULES)) {
    const parentCtrl = doc.getElementById(`pref-${parentKey}`) as HTMLInputElement | null;
    const enabled = parentCtrl ? Boolean(parentCtrl.checked) : Boolean(getPref(parentKey));
    for (const childKey of children) {
      const childCtrl = doc.getElementById(`pref-${childKey}`) as (HTMLInputElement | HTMLSelectElement) | null;
      if (!childCtrl) continue;
      childCtrl.disabled = !enabled;
      const row = childCtrl.closest('.todolist-check-row, .todolist-control-row');
      if (row) {
        row.classList.toggle('is-disabled', !enabled);
        row.setAttribute('aria-disabled', String(!enabled));
      }
    }
  }
}

export function syncControlsFromPrefs(doc: Document): void {
  if (!doc) return;
  for (const fields of Object.values(FIELDS)) {
    for (const [key, , type] of fields) {
      const ctrl = doc.getElementById(`pref-${key}`) as (HTMLInputElement | HTMLSelectElement) | null;
      if (!ctrl) continue;
      const val = getPref(key);
      if (type === 'check' && 'checked' in ctrl) ctrl.checked = Boolean(val);
      else ctrl.value = String(val ?? '');
    }
  }
  updateDependencies(doc);
}

export function registerPreferenceObserver(
  doc: Document,
  win?: Window | null,
  signal?: AbortSignal
): void {
  const hostWin = win || doc.defaultView;
  const zot = hostWin?.Zotero || (typeof Zotero !== 'undefined' ? Zotero : null);
  if (typeof zot?.Prefs?.registerObserver !== 'function') return;
  if (hostWin?.__taskflowPrefObserverToken != null || signal?.aborted) return;

  try {
    const token = zot.Prefs.registerObserver(
      PREFIX,
      () => {
        syncControlsFromPrefs(doc);
      },
      true
    );
    if (hostWin && token !== undefined) {
      hostWin.__taskflowPrefObserverToken = token;
      const cleanup = (): void => {
        try {
          zot.Prefs?.unregisterObserver?.(token);
        } catch (_) {}
        if (hostWin.__taskflowPrefObserverToken === token) {
          hostWin.__taskflowPrefObserverToken = undefined;
        }
      };
      if (signal) {
        signal.addEventListener('abort', cleanup, { once: true });
      }
      addAbortableListener(hostWin, 'unload', cleanup, { once: true }, signal);
    }
  } catch (_) {}
}
