/**
 * Zotero TaskFlow - Host Runtime Main Bundle
 * Modern TypeScript / ESM Source (Built with esbuild for Gecko 153+)
 */
import { ADDON_ID } from './config';
import { addAbortableListener, createScopedController, linkParentSignal, setAbortableTimeout } from './lifecycle';
import { TaskFlowWindow, pendingWindowLoads, windowControllers } from './modules/window';

interface ReaderMenuArg {
  reader: { itemID: number | string };
  params?: { ids?: string[]; annotation?: { text?: string; position?: { pageIndex?: number } } };
  doc: Document;
  append: (item: unknown) => void;
}

export class TaskFlowHost extends TaskFlowWindow {
  _initialized: boolean = false;
  _integrationRegistered: boolean = false;
  _pendingLinkIDs: Set<unknown> = new Set();
  _removedLinkRefs: Array<{ key: string; libraryID: number }> = [];
  _refreshAllLinks: boolean = false;
  _linkRefreshQueue: Promise<unknown> = Promise.resolve();
  _readerHooks: Array<[string, (arg: ReaderMenuArg) => void]> = [];
  _hostColorQuery: MediaQueryList | null = null;
  _hostThemeChanged: (() => void) | null = null;

  registerZoteroIntegration(): void {
    if (this._integrationRegistered) return;
    this._integrationRegistered = true;
    this._shuttingDown = false;
    if (!this._hostController || this._hostController.signal.aborted) {
      this._hostController = createScopedController();
    }
    const hostSignal = this._hostController.signal;

    const scheduleLinks = (ids: unknown[] | null = null, extraData: Record<string, unknown> = {}): void => {
      if (this._shuttingDown || hostSignal.aborted) return;
      this._pendingLinkIDs ||= new Set();
      this._removedLinkRefs ||= [];
      if (!ids) this._refreshAllLinks = true;
      else ids.forEach((id) => this._pendingLinkIDs.add(id));
      const extraRefs = Object.values(extraData || {})
        .map((entry) => {
          const record = entry as { old?: { key?: string; libraryID?: number }; key?: string; libraryID?: number } | null;
          return record?.old || record;
        })
        .filter((entry): entry is { key: string; libraryID: number } => Boolean(entry?.key && entry?.libraryID));
      this._removedLinkRefs.push(...extraRefs);
      if (this._linkRefreshTimer) {
        clearTimeout(this._linkRefreshTimer);
        this._linkRefreshTimer = null;
      }
      this._linkRefreshTimer = setAbortableTimeout(
        () => {
          this._linkRefreshTimer = null;
          const pendingIds = this._refreshAllLinks ? null : this._pendingLinkIDs;
          const removed = this._removedLinkRefs;
          this._pendingLinkIDs = new Set();
          this._removedLinkRefs = [];
          this._refreshAllLinks = false;
          this._linkRefreshQueue = (this._linkRefreshQueue || Promise.resolve())
            .then(() => {
              if (!this._shuttingDown && !hostSignal.aborted) {
                return this.refreshLinkedLiterature(pendingIds, removed);
              }
              return 0;
            })
            .catch((error: unknown) => Zotero.logError?.('[TaskFlow] 文献状态更新失败: ' + error));
        },
        100,
        hostSignal
      );
    };

    if (Zotero.Notifier?.registerObserver) {
      this._notifierID = Zotero.Notifier.registerObserver(
        {
          notify: (event: string, type: string, ids: unknown[], extraData: Record<string, unknown>) => {
            if (type === 'item' && ['modify', 'delete', 'trash', 'add', 'refresh'].includes(event)) {
              scheduleLinks(ids, extraData);
            }
          }
        },
        ['item'],
        'todolist-literature'
      ) as string | number | null;
      scheduleLinks();
    }

    this._readerHooks = [];
    if (Zotero.Reader?.registerEventListener) {
      const annotationMenu = ({ reader, params, append }: ReaderMenuArg): void => {
        if (!this.getPref('readerSelectionQuickAdd', false) || !params?.ids?.length) return;
        const ids = params.ids;
        append({
          label: '加入研读待办',
          onCommand: () => {
            const run = async (): Promise<void> => {
              for (const key of ids) {
                await this.createTaskFromAnnotation(reader, key, { forceInstant: ids.length > 1 });
              }
            };
            run().catch((error: unknown) => this.showNotice('批注加入失败', String(error)));
          }
        });
      };
      const selectionPopup = ({ reader, doc, params, append }: ReaderMenuArg): void => {
        if (!this.getPref('readerSelectionQuickAdd', false) || !params?.annotation?.text) return;
        const button = doc.createElement('button');
        button.type = 'button';
        button.textContent = '加入研读待办';
        button.title = '将选中文字与当前页加入待办';
        addAbortableListener(
          button,
          'click',
          async () => {
            if (button.disabled) return;
            button.disabled = true;
            try {
              await this.createTaskFromReader(null, reader, params.annotation);
            } finally {
              button.disabled = false;
            }
          },
          undefined,
          hostSignal
        );
        append(button);
      };
      const hooks: Array<[string, (arg: ReaderMenuArg) => void]> = [
        ['createAnnotationContextMenu', annotationMenu],
        ['renderTextSelectionPopup', selectionPopup]
      ];
      for (const [type, handler] of hooks) {
        Zotero.Reader.registerEventListener(type, handler, ADDON_ID);
        this._readerHooks.push([type, handler]);
      }
    }

    this._hostColorQuery = Zotero.getMainWindow?.()?.matchMedia?.('(prefers-color-scheme: dark)') || null;
    this._hostThemeChanged = (): void => {
      if (this._shuttingDown || hostSignal.aborted) return;
      const theme = this.getHostTheme();
      for (const listener of this._themeListeners || []) {
        try {
          listener(theme);
        } catch (_) {}
      }
      for (const client of this._uiClients || []) {
        try {
          client.postMessage({ type: 'TASKFLOW_HOST_THEME', theme }, '*');
          client.postMessage({ type: 'TODOLIST_HOST_THEME', theme }, '*');
        } catch (_) {}
      }
    };
    if (this._hostColorQuery && this._hostThemeChanged) {
      addAbortableListener(this._hostColorQuery, 'change', this._hostThemeChanged, undefined, hostSignal);
    }
  }

  async init(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;
    this._shuttingDown = false;
    this._hostController = createScopedController();

    this.initWindowListener();

    // Enumerate existing windows
    if (typeof Services !== 'undefined' && Services.wm) {
      const windows = Services.wm.getEnumerator('navigator:browser');
      while (windows.hasMoreElements()) {
        const domWindow = windows.getNext() as Window;
        if (domWindow.document.readyState === 'complete') {
          this.addToWindow(domWindow);
        } else {
          const loadController = createScopedController(domWindow);
          linkParentSignal(loadController, this._hostController.signal);
          pendingWindowLoads.set(domWindow, loadController);
          addAbortableListener(
            domWindow,
            'load',
            () => {
              pendingWindowLoads.delete(domWindow);
              loadController.abort();
              if (!this._shuttingDown && !domWindow.closed) {
                this.addToWindow(domWindow);
              }
            },
            { once: true },
            loadController.signal
          );
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
    Promise.resolve(this.loadData()).catch((e: unknown) => {
      Zotero.logError?.('[TaskFlow] Initial load cache warmup error: ' + e);
    });
  }

  async shutdown(): Promise<void> {
    this._shuttingDown = true;

    try {
      await this.settleActiveTimers?.();
    } catch (_) {}
    try {
      await this._saveQueue;
    } catch (_) {}

    // Abort declarative host AbortController (cancels link refresh timer, reader click hooks, window loads, etc.)
    if (this._hostController) {
      this._hostController.abort();
      this._hostController = null;
    }

    for (const [domWindow, controller] of pendingWindowLoads.entries()) {
      try {
        controller.abort();
      } catch (_) {}
      pendingWindowLoads.delete(domWindow);
    }

    for (const [win, controller] of windowControllers.entries()) {
      try {
        controller.abort();
      } catch (_) {}
      windowControllers.delete(win);
    }

    // Close open standalone companion windows
    if (typeof Services !== 'undefined' && Services.wm) {
      const standaloneWindows: Window[] = [];
      const enumerator = Services.wm.getEnumerator(null);
      while (enumerator.hasMoreElements()) {
        const win = enumerator.getNext() as Window & { name?: string };
        if (win && !win.closed && (win.name === 'Todolist_SubWindow' || win.name === 'Todolist_Window')) {
          standaloneWindows.push(win);
        }
      }
      for (const win of standaloneWindows) {
        try {
          win.close();
        } catch (_) {}
      }
    }

    for (const timer of this._standaloneDeliveryTimers || []) {
      try {
        clearTimeout(timer);
      } catch (_) {}
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
    if (this._hostColorQuery && this._hostThemeChanged) {
      try { this._hostColorQuery.removeEventListener?.('change', this._hostThemeChanged); } catch (_) {}
      try {
        (this._hostColorQuery as MediaQueryList & { removeListener?: (fn: () => void) => void }).removeListener?.(
          this._hostThemeChanged
        );
      } catch (_) {}
    }
    this._hostColorQuery = null;
    this._hostThemeChanged = null;
    if (this._menuManagerId && Zotero.MenuManager?.unregisterMenu) {
      try { Zotero.MenuManager.unregisterMenu(this._menuManagerId); } catch (_) {}
      this._menuManagerId = null;
    }
    if (this._windowListener && Services.wm?.removeListener) {
      Services.wm.removeListener(this._windowListener);
      this._windowListener = null;
    }
    if (typeof Services !== 'undefined' && Services.wm) {
      const windows = Services.wm.getEnumerator('navigator:browser');
      while (windows.hasMoreElements()) {
        this.removeFromWindow(windows.getNext() as Window);
      }
    }
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

const g = globalThis as Record<string, unknown>;
if (typeof g.TaskFlow === 'undefined') {
  g.TaskFlow = instance;
}

export default instance;
