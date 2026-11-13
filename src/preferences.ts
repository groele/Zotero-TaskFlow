// Zotero TaskFlow - Preferences Controller (TypeScript Source)
// Single Source of Truth for preferences.xhtml settings pane

import { addAbortableListener, createScopedController, setAbortableTimeout } from './lifecycle';
import { DEFAULTS, FIELDS, getPref, setPref, setPrefs, PREFIX } from './preferences/model';
import {
  getEl,
  renderGroup,
  bindMaintenanceActions,
  reportOperationError
} from './preferences/uiBinding';
import { renderCustomTagsManager, bindTagPaletteAndCreator } from './preferences/tagsBinding';
import { registerPreferenceObserver, setStatusL10n, updateDependencies } from './preferences/dependencies';

export { DEFAULTS, FIELDS, getPref, setPref, setPrefs, PREFIX };

type PaneElement = Element & { _todolistInited?: boolean; _taskflowInited?: boolean };

let fallbackController: AbortController | null = null;

function getPane(doc: Document | null | undefined): PaneElement | null {
  if (!doc) return null;
  return (doc.getElementById('todolist-preferences-pane') ||
    doc.getElementById('taskflow-preferences-pane')) as PaneElement | null;
}

export const TaskFlow_Preferences = {
  init(win?: Window | null): void {
    const targetWin = win || (typeof window !== 'undefined' ? window : null);
    const doc = targetWin?.document || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    const pane = getPane(doc);
    if (pane) {
      if (pane._todolistInited || pane._taskflowInited) return;
      pane._todolistInited = true;
      pane._taskflowInited = true;
    }

    fallbackController?.abort();
    fallbackController = null;

    if (targetWin) {
      targetWin.__taskflowPrefController?.abort();
      const prefController = createScopedController(targetWin);
      targetWin.__taskflowPrefController = prefController;
      addAbortableListener(
        targetWin,
        'unload',
        () => {
          prefController.abort();
          if (targetWin.__taskflowPrefController === prefController) {
            targetWin.__taskflowPrefController = undefined;
          }
        },
        { once: true }
      );
    }
    const signal = targetWin?.__taskflowPrefController?.signal;

    const statusEl = getEl(doc, 'taskflow-pref-status');
    const runOperation = async (action: string, callback: () => unknown): Promise<unknown> => {
      try {
        return await callback();
      } catch (error) {
        reportOperationError(targetWin?.Zotero || (typeof Zotero !== 'undefined' ? Zotero : null), doc, action, error);
        return undefined;
      }
    };

    try {
      renderGroup(doc, 'todolist-pref-window', FIELDS.window, signal);
      renderGroup(doc, 'todolist-pref-view', FIELDS.view, signal);
      renderGroup(doc, 'todolist-pref-academic', FIELDS.academic, signal);
      renderGroup(doc, 'todolist-pref-literature', FIELDS.literature, signal);
      renderGroup(doc, 'todolist-pref-reader', FIELDS.reader, signal);
      renderGroup(doc, 'todolist-pref-sync', FIELDS.sync, signal);
      renderGroup(doc, 'todolist-pref-tags', FIELDS.tags, signal);
      renderGroup(doc, 'todolist-pref-reminders', FIELDS.reminders, signal);

      void renderCustomTagsManager(doc, targetWin, signal);
      bindTagPaletteAndCreator(doc, targetWin, signal);
      bindMaintenanceActions(doc, targetWin, runOperation, signal);

      updateDependencies(doc);
      registerPreferenceObserver(doc, targetWin, signal);

      setStatusL10n(statusEl, 'taskflow-pref-status-loaded', '设置已加载；修改会自动保存。');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (statusEl) {
        setStatusL10n(statusEl, 'taskflow-pref-status-load-error', `加载设置时发生异常: ${msg}`, {
          message: msg
        });
        statusEl.className = 'todolist-pref-status todolist-pref-error';
      }
    }
  }
};

if (typeof window !== 'undefined') {
  window.TaskFlow_Preferences = TaskFlow_Preferences;
  (window as Window & { Todolist_Preferences?: typeof TaskFlow_Preferences }).Todolist_Preferences =
    TaskFlow_Preferences;

  if (window.document) {
    if (window.document.readyState === 'complete' || window.document.readyState === 'interactive') {
      const localWin = window;
      fallbackController = createScopedController(localWin);
      addAbortableListener(
        localWin,
        'unload',
        () => {
          fallbackController?.abort();
          fallbackController = null;
        },
        { once: true },
        fallbackController.signal
      );
      setAbortableTimeout(
        () => {
          const pane = getPane(localWin.document);
          if (pane && !pane._todolistInited && !pane._taskflowInited) {
            localWin.TaskFlow_Preferences?.init?.(localWin);
          }
        },
        50,
        fallbackController.signal,
        localWin
      );
    }
  }
}
