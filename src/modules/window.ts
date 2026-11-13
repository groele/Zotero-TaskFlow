import { TaskFlowWindowToolbar, injectedElements, pendingWindowLoads, windowControllers } from './windowToolbar';
import { CHROME_ROOT } from '../config';
import { serializeLiteratureItem, getLiteratureItem } from '../utils';
import { addAbortableListener, createScopedController, linkParentSignal, setAbortableTimeout } from '../lifecycle';
import type { ZoteroItemLike } from '../types/models';

export { injectedElements, pendingWindowLoads, windowControllers };

export class TaskFlowWindow extends TaskFlowWindowToolbar {
  getSelectedRegularItems(window: Window | null = null): ZoteroItemLike[] {
    const pane =
      window?.ZoteroPane ||
      Zotero.getActiveZoteroPane?.() ||
      Zotero.getMainWindow?.()?.ZoteroPane ||
      null;
    let rawSelection: unknown[] = [];
    if (pane && typeof pane.getSelectedItems === 'function') {
      try {
        rawSelection = pane.getSelectedItems() || [];
      } catch (_) {}
    }
    if ((!rawSelection || rawSelection.length === 0) && pane?.itemsView?.getSelectedItems) {
      try {
        rawSelection = pane.itemsView.getSelectedItems() || [];
      } catch (_) {}
    }
    const result: ZoteroItemLike[] = [];
    const seen = new Set<number | string>();
    for (const item of rawSelection) {
      const lit = getLiteratureItem(item as ZoteroItemLike);
      if (lit && !lit.deleted && !seen.has(lit.id)) {
        seen.add(lit.id);
        result.push(lit);
      }
    }
    return result;
  }

  getCurrentActiveItem(window: Window | null = null): ZoteroItemLike | null {
    const tabs = window?.Zotero_Tabs || (typeof Zotero_Tabs !== 'undefined' ? Zotero_Tabs : null);
    if (tabs && tabs.selectedTab && tabs.selectedTab.type === 'reader') {
      const reader = Zotero.Reader?.getByTabID?.(tabs.selectedTab.id);
      const itemID = reader?.itemID || tabs.selectedTab.data?.itemID;
      if (itemID) {
        const item = Zotero.Items?.get?.(itemID);
        return getLiteratureItem(item);
      }
    }
    const selected = this.getSelectedRegularItems(window);
    return selected[0] || null;
  }

  createTaskFromSelection(
    window: Window | null = null,
    doc: Document | null = null,
    itemMenu: Element | null = null,
    items: unknown[] | null = null
  ): void {
    const win = window || Zotero.getMainWindow?.() || null;
    let targetItem: ZoteroItemLike | null = null;

    if (Array.isArray(items) && items.length > 0) {
      targetItem = getLiteratureItem(items[0] as ZoteroItemLike);
    }

    if (!targetItem) {
      const selected = this.getSelectedRegularItems(win);
      if (selected.length > 0) {
        targetItem = selected[0];
      }
    }

    if (!targetItem) {
      const documentObj = (doc || win?.document) as (Document & { popupNode?: unknown }) | undefined;
      const trigger = (itemMenu as (Element & { triggerNode?: unknown }) | null)?.triggerNode || documentObj?.popupNode;
      const pane = win?.ZoteroPane || Zotero.getActiveZoteroPane?.() || null;
      if (trigger && pane && typeof pane.getRowForNode === 'function') {
        try {
          const row = pane.getRowForNode(trigger);
          if (row && row.ref) {
            const refId = typeof row.ref === 'object' ? row.ref.id : row.ref;
            const rawItem = Zotero.Items?.get?.(refId);
            targetItem = getLiteratureItem(rawItem);
          }
        } catch (_) {}
      }
    }

    if (!targetItem) {
      targetItem = this.getCurrentActiveItem(win);
    }

    const serialized = targetItem && !targetItem.deleted ? serializeLiteratureItem(targetItem) : null;
    if (serialized) {
      this.showNotice('已选取文献', `正在为《${serialized.title.slice(0, 22)}...》创建研读待办`);
      this.openTaskFlow({ mode: 'create_from_item', item: serialized }, win);
    } else {
      this.showNotice('创建待办', '正在打开任务面板...');
      this.openTaskFlow({ mode: 'open_modal_prefill', prefill: { category: '论文研读' } }, win);
    }
  }

  triggerTaskFlowOpen(window: Window | null = null): void {
    const win = window || Zotero.getMainWindow?.() || null;
    this.openTaskFlow({ mode: 'open' }, win);
  }

  triggerTodolistOpen(window: Window | null = null): void {
    this.triggerTaskFlowOpen(window);
  }

  openTaskFlow(options: Record<string, unknown> = {}, targetWindow: Window | null = null): void {
    if (typeof this.openTodolist === 'function' && this.openTodolist !== TaskFlowWindow.prototype.openTodolist) {
      this.openTodolist(options, targetWindow);
      return;
    }
    try {
      const mainWin =
        targetWindow && targetWindow.Zotero_Tabs
          ? targetWindow
          : Zotero.getMainWindow?.() || Services.wm?.getMostRecentWindow?.('navigator:browser') || null;

      let preferredWindowMode = 'tab';
      try {
        if (Zotero.Prefs) {
          preferredWindowMode = String(Zotero.Prefs.get('extensions.taskflow.windowMode', true) || 'tab');
        }
      } catch (_) {}

      const effectiveMode = typeof options.targetMode === 'string' ? options.targetMode : preferredWindowMode;
      if (effectiveMode === 'window') {
        this.openStandaloneWindow(options, mainWin, 'window');
        return;
      } else if (effectiveMode === 'subwindow') {
        this.openStandaloneWindow(options, mainWin, 'subwindow');
        return;
      }

      const tabs = mainWin?.Zotero_Tabs || Zotero.getMainWindow?.()?.Zotero_Tabs;
      if (tabs && typeof tabs.add === 'function') {
        if (Array.isArray(tabs._tabs)) {
          const existingTab = tabs._tabs.find((t) => Boolean(t && t.type === 'todolist'));
          if (existingTab) {
            tabs.select?.(existingTab.id);
            if (mainWin && mainWin.focus) mainWin.focus();

            const iframe = (mainWin?.document.getElementById('todolist-tab-iframe') ||
              existingTab.container?.querySelector('iframe') ||
              null) as (HTMLIFrameElement & { _todolistPending?: unknown }) | null;
            if (iframe) {
              iframe._todolistPending = options;
              try {
                const cw = iframe.contentWindow as (Window & { ZoteroBridge?: { handleHostNavigation?: (opts: unknown) => void } }) | null;
                cw?.ZoteroBridge?.handleHostNavigation?.(options);
              } catch (_) {}
              try {
                iframe.contentWindow?.postMessage({ type: 'TODOLIST_NAVIGATE', options }, '*');
              } catch (_) {}
            }
            return;
          }
        }

        const tabController = createScopedController(mainWin);
        linkParentSignal(tabController, this.getHostSignal());
        linkParentSignal(tabController, mainWin ? windowControllers.get(mainWin)?.signal : undefined);

        const tabResult = tabs.add({
          type: 'todolist',
          title: 'Zotero TaskFlow待办事项',
          select: true,
          data: options,
          onClose: () => {
            tabController.abort();
            Zotero.log?.('[TaskFlow] Tab closed');
          }
        });

        const tabId = typeof tabResult === 'string' ? tabResult : tabResult?.id;
        const container =
          (typeof tabResult === 'object' && tabResult?.container) ||
          (tabId ? tabs.getTabContainer?.(tabId) : null) ||
          (tabId ? tabs.getTab?.(tabId)?.container : null);

        if (container) {
          const doc = container.ownerDocument || mainWin?.document;
          if (doc) {
            const iframe = doc.createElement('iframe') as HTMLIFrameElement & {
              _todolistReady?: boolean;
              _todolistPending?: unknown;
            };
            iframe.id = 'todolist-tab-iframe';
            iframe.setAttribute('src', `${CHROME_ROOT}index.html`);
            iframe.setAttribute('style', 'width: 100%; height: 100%; border: none; flex: 1; display: block;');
            iframe.setAttribute('flex', '1');
            iframe._todolistReady = false;
            iframe._todolistPending = options;

            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.overflow = 'hidden';

            addAbortableListener(
              iframe,
              'load',
              () => {
                try {
                  const cw = iframe.contentWindow as (Window & {
                    Zotero?: unknown;
                    _todolistPending?: unknown;
                    ZoteroBridge?: { handleHostNavigation?: (opts: unknown) => void };
                  }) | null;
                  if (cw) {
                    cw.Zotero = Zotero;
                    cw._todolistPending = options;
                    cw.ZoteroBridge?.handleHostNavigation?.(options);
                  }
                } catch (_) {}
              },
              undefined,
              tabController.signal
            );

            container.appendChild(iframe);
          }
        }

        if (mainWin && mainWin.focus) mainWin.focus();
        return;
      }
    } catch (e) {
      Zotero.logError?.('[TaskFlow] openTaskFlow error: ' + e);
    }

    this.openStandaloneWindow(options, targetWindow, 'window');
  }

  openTodolist(options: Record<string, unknown> = {}, targetWindow: Window | null = null): void {
    this.openTaskFlow(options, targetWindow);
  }

  openStandaloneWindow(
    options: Record<string, unknown> = {},
    targetWindow: Window | null = null,
    windowType: string = 'window'
  ): void {
    try {
      const ww = Services.ww;
      if (!ww) return;
      let features = '';
      let windowName = '';
      const url = `${CHROME_ROOT}index.html?mode=${encodeURIComponent(windowType)}`;
      if (windowType === 'subwindow') {
        const alwaysRaised = this.getPref('subwindowAlwaysOnTop', false) ? ',alwaysRaised=yes' : '';
        features = `chrome,dialog=no,all,resizable=yes,minimizable=yes,width=460,height=760,top=80,left=80${alwaysRaised}`;
        windowName = 'Todolist_SubWindow';
      } else {
        features = 'chrome,dialog=no,all,resizable=yes,minimizable=yes,width=1120,height=760,centerscreen';
        windowName = 'Todolist_Window';
      }

      const otherWindowName = windowType === 'subwindow' ? 'Todolist_Window' : 'Todolist_SubWindow';
      try {
        const windows = Services.wm?.getEnumerator?.(null);
        while (windows?.hasMoreElements()) {
          const w = windows.getNext() as Window & { name?: string };
          if (w && w.name === otherWindowName) {
            try {
              w.close();
            } catch (_) {}
          }
        }
      } catch (_) {}

      const mainWin =
        targetWindow && targetWindow.Zotero_Tabs
          ? targetWindow
          : Zotero.getMainWindow?.() || Services.wm?.getMostRecentWindow?.('navigator:browser') || null;

      const win = ww.openWindow(
        mainWin,
        url,
        windowName,
        features,
        { Zotero, options: { ...options, currentWindowType: windowType } }
      ) as (Window & {
        ZoteroBridge?: { handleHostNavigation?: (opts: unknown) => void };
        focus?: () => void;
      }) | null;
      if (win && win.focus) win.focus();

      if (options && options.mode && options.mode !== 'open') {
        if (!this._standaloneTimers) this._standaloneTimers = new Set();
        const deliveryController = createScopedController(mainWin);
        linkParentSignal(deliveryController, this.getHostSignal());
        if (win) {
          addAbortableListener(
            win,
            'unload',
            () => deliveryController.abort(),
            { once: true },
            deliveryController.signal
          );
        }
        const tryDeliver = (attempts: number = 0): void => {
          if (this._shuttingDown || deliveryController.signal.aborted || !win || win.closed) return;
          try {
            if (win.ZoteroBridge?.handleHostNavigation) {
              win.ZoteroBridge.handleHostNavigation(options);
              deliveryController.abort();
              return;
            }
            win.postMessage?.({ type: 'TODOLIST_NAVIGATE', options }, '*');
          } catch (_) {}
          if (attempts < 10) {
            scheduleDeliver(attempts + 1);
          }
        };
        const scheduleDeliver = (attempt: number): void => {
          if (this._shuttingDown || deliveryController.signal.aborted || !win || win.closed) return;
          setAbortableTimeout(
            () => tryDeliver(attempt),
            attempt === 0 ? 300 : 200,
            deliveryController.signal,
            mainWin,
            this._standaloneTimers
          );
        };
        scheduleDeliver(0);
      }
    } catch (err) {
      Zotero.logError?.('[TaskFlow] openStandaloneWindow error: ' + err);
    }
  }

  openPreferencesPane(window: Window | null = null): void {
    try {
      const win = (window || Zotero.getMainWindow?.()) as (Window & { openDialog?: (...args: unknown[]) => void }) | null;
      if (Zotero.Utilities?.Internal?.openPreferences) {
        Zotero.Utilities.Internal.openPreferences('todolist-preferences-pane');
      } else if (win?.openPreferences) {
        win.openPreferences('todolist-preferences-pane');
      } else {
        win?.openDialog?.(
          'chrome://zotero/content/preferences/preferences.xhtml',
          'Preferences',
          'chrome,titlebar,toolbar,centerscreen,dialog=yes'
        );
      }
    } catch (e) {
      Zotero.logError?.('[TaskFlow] Could not open preferences: ' + e);
    }
  }
}
