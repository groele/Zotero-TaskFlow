// Zotero TaskFlow - Preferences Controller (TypeScript Source)
// Single Source of Truth for preferences.xhtml settings pane

import { DEFAULTS, FIELDS, getPref, setPref, setPrefs, PREFIX } from './preferences/model';
import {
  getEl,
  renderGroup,
  renderCustomTagsManager,
  bindTagPaletteAndCreator,
  bindMaintenanceActions,
  reportOperationError
} from './preferences/uiBinding';

export { DEFAULTS, FIELDS, getPref, setPref, setPrefs, PREFIX };

declare let window: any;

/* Zotero TaskFlow settings pane script for Zotero 10+ */
window.TaskFlow_Preferences = (() => {
  return {
    init(win: any) {
      const doc = win?.document || window.document;
      const pane = getEl(doc, 'taskflow-preferences-pane');
      if (pane) {
        if (pane._todolistInited) return;
        pane._todolistInited = true;
      }
      const statusEl = getEl(doc, 'taskflow-pref-status');
      const runOperation = async (action: string, callback: () => any) => {
        try {
          return await callback();
        } catch (error) {
          reportOperationError(win?.Zotero || window.Zotero, doc, action, error);
        }
      };

      try {
        renderGroup(doc, 'todolist-pref-window', FIELDS.window);
        renderGroup(doc, 'todolist-pref-view', FIELDS.view);
        renderGroup(doc, 'todolist-pref-academic', FIELDS.academic);
        renderGroup(doc, 'todolist-pref-literature', FIELDS.literature);
        renderGroup(doc, 'todolist-pref-reader', FIELDS.reader);
        renderGroup(doc, 'todolist-pref-sync', FIELDS.sync);
        renderGroup(doc, 'todolist-pref-tags', FIELDS.tags);
        renderGroup(doc, 'todolist-pref-reminders', FIELDS.reminders);

        // Render Custom Tags Manager
        renderCustomTagsManager(doc, win);

        // Bind Palette & Add Tag Actions
        bindTagPaletteAndCreator(doc, win);

        // Bind Maintenance Actions (export, import, print, copy, clear, reset)
        bindMaintenanceActions(doc, win, runOperation);

        if (statusEl) {
          statusEl.textContent = '设置已加载；修改会自动保存。';
        }
      } catch (err: any) {
        if (statusEl) {
          statusEl.textContent = '加载设置时发生异常: ' + err.message;
          statusEl.className = 'todolist-pref-status todolist-pref-error';
        }
      }
    }
  };
})();

window.Todolist_Preferences = window.TaskFlow_Preferences;

// Auto-init fallback if onload already fired in modern Gecko / Zotero 10+
if (typeof window !== 'undefined' && window.document) {
  if (window.document.readyState === 'complete' || window.document.readyState === 'interactive') {
    setTimeout(() => {
      const pane =
        window.document.getElementById('todolist-preferences-pane') ||
        window.document.getElementById('taskflow-preferences-pane');
      if (pane && !pane._todolistInited && !pane._taskflowInited) {
        pane._todolistInited = true;
        pane._taskflowInited = true;
        window.TaskFlow_Preferences?.init?.(window);
      }
    }, 50);
  }
}
