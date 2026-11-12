/**
 * Zotero TaskFlow - Host Runtime Main Bundle
 * Modern TypeScript / ESM Source (Built with esbuild for Gecko 153+)
 */
import { ADDON_ID, CHROME_ROOT } from './config';
import { serializeLiteratureItem } from './utils';
import { LiteratureWorkflow } from './literatureWorkflow';
import { TaskFlowWindow } from './modules/window';

declare let Zotero: any;
declare let Services: any;

export class TaskFlowHost extends TaskFlowWindow {
    registerZoteroIntegration() {
      if (this._integrationRegistered) return;
      this._integrationRegistered = true; this._shuttingDown = false;
      const scheduleLinks = (ids: any = null, extraData: any = {}) => {
        this._pendingLinkIDs ||= new Set(); this._removedLinkRefs ||= [];
        if (!ids) this._refreshAllLinks = true;
        else ids.forEach((id: any) => this._pendingLinkIDs.add(id));
        this._removedLinkRefs.push(...(Object.values(extraData || {}) as any[]).map((entry: any) => entry?.old || entry).filter((entry: any) => entry?.key && entry?.libraryID));
        clearTimeout(this._linkRefreshTimer);
        this._linkRefreshTimer = setTimeout(() => {
          const ids = this._refreshAllLinks ? null : this._pendingLinkIDs;
          const removed = this._removedLinkRefs;
          this._pendingLinkIDs = new Set(); this._removedLinkRefs = []; this._refreshAllLinks = false;
          this._linkRefreshQueue = (this._linkRefreshQueue || Promise.resolve()).then(() => {
            if (!this._shuttingDown) return this.refreshLinkedLiterature(ids, removed);
          }).catch(error => Zotero.logError?.('[TaskFlow] 文献状态更新失败: ' + error));
        }, 100);
      };
      if (Zotero.Notifier?.registerObserver) {
        this._notifierID = Zotero.Notifier.registerObserver({ notify: (event: any, type: any, ids: any, extraData: any) => {
          if (type === 'item' && ['modify', 'delete', 'trash', 'add', 'refresh'].includes(event)) scheduleLinks(ids, extraData);
        } }, ['item'], 'todolist-literature');
        scheduleLinks();
      }
      this._readerHooks = [];
      if (Zotero.Reader?.registerEventListener) {
        const annotationMenu = ({ reader, params, append }: any) => {
          if (!this.getPref('readerSelectionQuickAdd', false) || !params?.ids?.length) return;
          append({ label: '加入研读待办', onCommand: () => {
            // Use saved annotation IDs; completion never modifies the annotation itself.
            const run = async () => { for (const key of params.ids) await this.createTaskFromAnnotation(reader, key, { forceInstant: params.ids.length > 1 }); };
            run().catch(error => this.showNotice('批注加入失败', String(error)));
          } });
        };
        const selectionPopup = ({ reader, doc, params, append }: any) => {
          if (!this.getPref('readerSelectionQuickAdd', false) || !params?.annotation?.text) return;
          const button = doc.createElement('button'); button.type = 'button'; button.textContent = '加入研读待办';
          button.title = '将选中文字与当前页加入待办';
          button.addEventListener('click', async () => {
            if (button.disabled) return; button.disabled = true;
            try { await this.createTaskFromReader(null, reader, params.annotation); }
            finally { button.disabled = false; }
          });
          append(button);
        };
        for (const [type, handler] of [['createAnnotationContextMenu', annotationMenu], ['renderTextSelectionPopup', selectionPopup]]) {
          Zotero.Reader.registerEventListener(type, handler, ADDON_ID); this._readerHooks.push([type, handler]);
        }
      }
      this._hostColorQuery = Zotero.getMainWindow?.()?.matchMedia?.('(prefers-color-scheme: dark)');
      this._hostThemeChanged = () => {
        const theme = this.getHostTheme();
        for (const listener of this._themeListeners || []) {
          try { listener(theme); } catch (_) {}
        }
        for (const client of this._uiClients || []) {
          try {
            client.postMessage({ type: 'TASKFLOW_HOST_THEME', theme }, '*');
            client.postMessage({ type: 'TODOLIST_HOST_THEME', theme }, '*');
          } catch (_) {}
        }
      };
      this._hostColorQuery?.addEventListener?.('change', this._hostThemeChanged);
    }

    async init() {
      if (this._initialized) return;
      this._initialized = true;
      this.initWindowListener();

      // Enumerate existing windows
      if (typeof Services !== 'undefined' && Services.wm) {
        const windows = Services.wm.getEnumerator('navigator:browser');
        while (windows.hasMoreElements()) {
          const domWindow = windows.getNext();
          if (domWindow.document.readyState === 'complete') {
            this.addToWindow(domWindow);
          } else {
            domWindow.addEventListener('load', () => this.addToWindow(domWindow), { once: true });
          }
        }
      }

      // Register ItemPane Section (Literature details inspector panel)
      this.registerItemPaneSection();

      // Register Menus and Toolbar items in active windows
      if (typeof Services !== 'undefined' && Services.wm) {
        const win = Services.wm.getMostRecentWindow('navigator:browser');
        if (win && win.document) {
          this.registerMenus();
        }
      }

      this.registerZoteroIntegration();

      // Cache warmup: Read data asynchronously
      Promise.resolve(this.loadData()).catch(e => {
        Zotero.logError?.('[TaskFlow] Initial load cache warmup error: ' + e);
      });
    }

    async shutdown() {
      this._shuttingDown = true;

      try { await this.settleActiveTimers?.(); } catch (_) {}
      try { await this._saveQueue; } catch (_) {}

      // Close open standalone companion windows
      if (typeof Services !== 'undefined' && Services.wm) {
        const standaloneWindows = [];
        const enumerator = Services.wm.getEnumerator(null);
        while (enumerator.hasMoreElements()) {
          const win = enumerator.getNext();
          if (win && !win.closed && (win.name === 'Todolist_SubWindow' || win.name === 'Todolist_Window')) {
            standaloneWindows.push(win);
          }
        }
        for (const win of standaloneWindows) {
          try { win.close(); } catch (_) {}
        }
      }

      for (const timer of this._standaloneDeliveryTimers || []) {
        try { clearTimeout(timer); } catch (_) {}
      }
      this._standaloneDeliveryTimers?.clear?.();

      for (const timer of this._standaloneTimers || []) {
        try { clearTimeout(timer); } catch (_) {}
      }
      this._standaloneTimers?.clear?.();

      if (this._linkRefreshTimer) {
        clearTimeout(this._linkRefreshTimer);
        this._linkRefreshTimer = null;
      }

      if (this._paneUndoTimer) {
        clearTimeout(this._paneUndoTimer);
        this._paneUndoTimer = null;
      }
      this._paneDeleted = [];

      if (this._notifierID && Zotero.Notifier?.unregisterObserver) {
        try { Zotero.Notifier.unregisterObserver(this._notifierID); } catch (_) {}
        this._notifierID = null;
      }

      for (const [type, handler] of this._readerHooks || []) {
        try { Zotero.Reader?.unregisterEventListener?.(type, handler); } catch (_) {}
      }
      this._readerHooks = [];

      if (this._hostColorQuery?.removeEventListener && this._hostThemeChanged) {
        try { this._hostColorQuery.removeEventListener('change', this._hostThemeChanged); } catch (_) {}
      } else if (this._hostColorQuery?.removeListener && this._hostThemeChanged) {
        try { this._hostColorQuery.removeListener(this._hostThemeChanged); } catch (_) {}
      }
      this._hostColorQuery = null;
      this._hostThemeChanged = null;

      // Remove window listeners
      if (this._windowListener && Services.wm?.removeListener) {
        Services.wm.removeListener(this._windowListener);
        this._windowListener = null;
      }

      // Cleanup windows
      if (typeof Services !== 'undefined' && Services.wm) {
        const windows = Services.wm.getEnumerator('navigator:browser');
        while (windows.hasMoreElements()) {
          const domWindow = windows.getNext();
          this.removeFromWindow(domWindow);
        }
      }

      // Unregister ItemPane section
      if (this.itemPaneSectionID && Zotero.ItemPaneManager?.unregisterSection) {
        try {
          Zotero.ItemPaneManager.unregisterSection(this.itemPaneSectionID);
          this.itemPaneSectionID = null;
        } catch (_) {}
      }

      this._initialized = false;
      this._integrationRegistered = false;
    }
}

export const instance = new TaskFlowHost();

if (typeof Zotero !== 'undefined') {
  Zotero.TaskFlow = instance;
  Zotero.Todolist = instance;
  Zotero.TaskFlow.init();
}

if (typeof (globalThis as any).TaskFlow === 'undefined') {
  (globalThis as any).TaskFlow = instance;
}

export default instance;
