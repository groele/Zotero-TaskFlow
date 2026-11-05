import { TaskFlowWindowToolbar, injectedElements, pendingWindowLoads } from './windowToolbar';
import { ADDON_ID, CHROME_ROOT } from '../config';
import { resolveItemReference, serializeLiteratureItem, getLiteratureItem } from '../utils';

declare let Zotero: any;
declare let Services: any;

export { injectedElements, pendingWindowLoads };

export class TaskFlowWindow extends TaskFlowWindowToolbar {



    getSelectedRegularItems(window) {
      const pane =
        window?.ZoteroPane ||
        (Zotero.getActiveZoteroPane ? Zotero.getActiveZoteroPane() : null) ||
        (Zotero.getMainWindow ? Zotero.getMainWindow().ZoteroPane : null);
      let rawSelection = [];
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
      const result = [];
      const seen = new Set();
      for (const item of rawSelection) {
        const lit = getLiteratureItem(item);
        if (lit && !seen.has(lit.id)) {
          seen.add(lit.id);
          result.push(lit);
        }
      }
      return result;
    }


    getCurrentActiveItem(window) {
      const tabs = window?.Zotero_Tabs || (typeof Zotero_Tabs !== 'undefined' ? Zotero_Tabs : null);
      if (tabs && tabs.selectedTab && tabs.selectedTab.type === 'reader') {
        const reader = Zotero.Reader?.getByTabID?.(tabs.selectedTab.id);
        const itemID = reader?.itemID || tabs.selectedTab.data?.itemID;
        if (itemID) {
          const item = Zotero.Items.get(itemID);
          return getLiteratureItem(item);
        }
      }
      const selected = this.getSelectedRegularItems(window);
      return selected[0] || null;
    }


    createTaskFromSelection(window = null, doc = null, itemMenu = null, items = null) {
      const win = window || (Zotero.getMainWindow ? Zotero.getMainWindow() : null);
      let targetItem = null;

      if (Array.isArray(items) && items.length > 0) {
        targetItem = getLiteratureItem(items[0]);
      }

      // 1. Try getSelectedRegularItems
      if (!targetItem) {
        const selected = this.getSelectedRegularItems(win);
        if (selected.length > 0) {
          targetItem = selected[0];
        }
      }

      // 2. Fallback to triggerNode / popupNode from context menu
      if (!targetItem) {
        const documentObj = doc || win?.document;
        const trigger = (itemMenu && itemMenu.triggerNode) || (documentObj && documentObj.popupNode);
        const pane = win?.ZoteroPane || (Zotero.getActiveZoteroPane ? Zotero.getActiveZoteroPane() : null);
        if (trigger && pane && typeof pane.getRowForNode === 'function') {
          try {
            const row = pane.getRowForNode(trigger);
            if (row && row.ref) {
              const rawItem = Zotero.Items.get(row.ref.id || row.ref);
              targetItem = getLiteratureItem(rawItem);
            }
          } catch (_) {}
        }
      }

      // 3. Fallback to getCurrentActiveItem (e.g. reader or active tab)
      if (!targetItem) {
        targetItem = this.getCurrentActiveItem(win);
      }

      if (targetItem) {
        const serialized = serializeLiteratureItem(targetItem);
        this.showNotice('已选取文献', `正在为《${serialized.title.slice(0, 22)}...》创建研读待办`);
        this.openTaskFlow({ mode: 'create_from_item', item: serialized }, win);
      } else {
        this.showNotice('创建待办', '正在打开任务面板...');
        this.openTaskFlow({ mode: 'open_modal_prefill', prefill: { category: '论文研读' } }, win);
      }
    }


    triggerTaskFlowOpen(window = null) {
      if (!this._inTriggerDispatch && typeof this.triggerTodolistOpen === 'function' && this.triggerTodolistOpen !== this.triggerTaskFlowOpen && (this.triggerTodolistOpen as any)._isAlias !== true) {
        this._inTriggerDispatch = true;
        try {
          return this.triggerTodolistOpen(window);
        } finally {
          this._inTriggerDispatch = false;
        }
      }
      const win = window || (Zotero.getMainWindow ? Zotero.getMainWindow() : null);
      return this.openTaskFlow({ mode: 'open' }, win);
    }


    triggerTodolistOpen(window = null) {
      return this.triggerTaskFlowOpen(window);
    }


    openTaskFlow(options = {}, targetWindow = null) {
      if (!this._inOpenDispatch && typeof this.openTodolist === 'function' && this.openTodolist !== this.openTaskFlow && (this.openTodolist as any)._isAlias !== true) {
        this._inOpenDispatch = true;
        try {
          return this.openTodolist(options, targetWindow);
        } finally {
          this._inOpenDispatch = false;
        }
      }
      try {
        const mainWin = (targetWindow && targetWindow.Zotero_Tabs)
          ? targetWindow
          : (Zotero.getMainWindow ? Zotero.getMainWindow() : Services.wm.getMostRecentWindow('navigator:browser'));

        let preferredWindowMode = 'tab';
        try {
          if (Zotero.Prefs) {
            preferredWindowMode = Zotero.Prefs.get('extensions.taskflow.windowMode', true) || 'tab';
          }
        } catch (_) {}

        const effectiveMode = (options as any).targetMode || preferredWindowMode;
        if (effectiveMode === 'window') {
          this.openStandaloneWindow(options, mainWin, 'window');
          return;
        } else if (effectiveMode === 'subwindow') {
          this.openStandaloneWindow(options, mainWin, 'subwindow');
          return;
        }

        const tabs = mainWin?.Zotero_Tabs || (Zotero.getMainWindow && Zotero.getMainWindow().Zotero_Tabs);
        if (tabs && typeof tabs.add === 'function') {
          // Check if TaskFlow tab is already open
          if (Array.isArray(tabs._tabs)) {
            const existingTab = tabs._tabs.find((t) => t && t.type === 'todolist');
            if (existingTab) {
              tabs.select(existingTab.id);
              if (mainWin && mainWin.focus) mainWin.focus();

              const iframe = mainWin.document.getElementById('todolist-tab-iframe') ||
                (existingTab.container && existingTab.container.querySelector('iframe'));
              if (iframe) {
                iframe._todolistPending = options;
                try {
                  if (iframe.contentWindow?.ZoteroBridge?.handleHostNavigation) {
                    iframe.contentWindow.ZoteroBridge.handleHostNavigation(options);
                  }
                } catch (_) {}
                try {
                  if (iframe.contentWindow?.postMessage) {
                    iframe.contentWindow.postMessage({ type: 'TODOLIST_NAVIGATE', options }, '*');
                  }
                } catch (_) {}
              }
              return;
            }
          }

          // Open as internal Tab
          const tabResult = tabs.add({
            type: 'todolist',
            title: 'Zotero TaskFlow待办事项',
            select: true,
            data: options,
            onClose: () => {
              Zotero.log?.('[TaskFlow] Tab closed');
            }
          });

          const container = (tabResult && tabResult.container) ||
            (tabs.getTabContainer && tabs.getTabContainer(tabResult.id || tabResult)) ||
            (tabs.getTab && tabs.getTab(tabResult?.id)?.container);

          if (container) {
            const doc = container.ownerDocument || mainWin.document;
            const iframe = doc.createElement('iframe');
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

            iframe.addEventListener('load', () => {
              try {
                if (iframe.contentWindow) {
                  iframe.contentWindow.Zotero = Zotero;
                  iframe.contentWindow._todolistPending = options;
                  if (iframe.contentWindow.ZoteroBridge?.handleHostNavigation) {
                    iframe.contentWindow.ZoteroBridge.handleHostNavigation(options);
                  }
                }
              } catch (_) {}
            });

            container.appendChild(iframe);
          }

          if (mainWin && mainWin.focus) mainWin.focus();
          return;
        }
      } catch (e) {
        Zotero.logError?.('[TaskFlow] openTaskFlow error: ' + e);
      }

      this.openStandaloneWindow(options, targetWindow, 'window');
    }


    openTodolist(options = {}, targetWindow = null) {
      return this.openTaskFlow(options, targetWindow);
    }


    openStandaloneWindow(options = {}, targetWindow = null, windowType = 'window') {
      try {
        const ww = Services.ww;
        let features = '';
        let windowName = '';
        const url = `${CHROME_ROOT}index.html?mode=${encodeURIComponent(windowType)}`;
        if (windowType === 'subwindow') {
          // Compact companion subwindow: ideal for side-by-side reading with PDF reader
          const alwaysRaised = this.getPref('subwindowAlwaysOnTop', false) ? ',alwaysRaised=yes' : '';
          features = `chrome,dialog=no,all,resizable=yes,minimizable=yes,width=460,height=760,top=80,left=80${alwaysRaised}`;
          windowName = 'Todolist_SubWindow';
        } else {
          // Full standalone desktop window
          features = 'chrome,dialog=no,all,resizable=yes,minimizable=yes,width=1120,height=760,centerscreen';
          windowName = 'Todolist_Window';
        }

        // Close the other standalone window type if open (switching between subwindow and window)
        const otherWindowName = windowType === 'subwindow' ? 'Todolist_Window' : 'Todolist_SubWindow';
        try {
          const windows = Services.wm.getEnumerator(null);
          while (windows.hasMoreElements()) {
            const w = windows.getNext();
            if (w && w.name === otherWindowName) {
              try { w.close(); } catch (_) {}
            }
          }
        } catch (_) {}

        const mainWin = (targetWindow && targetWindow.Zotero_Tabs)
          ? targetWindow
          : (Zotero.getMainWindow ? Zotero.getMainWindow() : Services.wm.getMostRecentWindow('navigator:browser'));

        const win = ww.openWindow(
          mainWin,
          url,
          windowName,
          features,
          { Zotero, options: { ...options, currentWindowType: windowType } }
        );
        if (win && win.focus) win.focus();

        if (options && (options as any).mode && (options as any).mode !== 'open') {
          if (!this._standaloneTimers) this._standaloneTimers = new Set();
          let winClosed = false;
          if (win && typeof win.addEventListener === 'function') {
            win.addEventListener('unload', () => {
              winClosed = true;
            }, { once: true });
          }
          const scheduleDeliver = (attempt) => {
            if (this._shuttingDown || winClosed || !win || win.closed) return;
            const timerId = mainWin.setTimeout(() => {
              this._standaloneTimers?.delete(timerId);
              tryDeliver(attempt);
            }, attempt === 0 ? 300 : 200);
            this._standaloneTimers.add(timerId);
          };
          const tryDeliver = (attempts = 0) => {
            if (this._shuttingDown || winClosed || !win || win.closed) return;
            try {
              if (win.ZoteroBridge?.handleHostNavigation) {
                win.ZoteroBridge.handleHostNavigation(options);
                return;
              }
              win.postMessage?.({ type: 'TODOLIST_NAVIGATE', options }, '*');
            } catch (_) {}
            if (attempts < 10) {
              scheduleDeliver(attempts + 1);
            }
          };
          scheduleDeliver(0);
        }
      } catch (err) {
        Zotero.logError?.('[TaskFlow] openStandaloneWindow error: ' + err);
      }
    }


    openPreferencesPane(window) {
      try {
        const win = window || Zotero.getMainWindow?.();
        if (Zotero.Utilities?.Internal?.openPreferences) {
          Zotero.Utilities.Internal.openPreferences('todolist-preferences-pane');
        } else if (win?.openPreferences) {
          win.openPreferences('todolist-preferences-pane');
        } else {
          win?.openDialog?.('chrome://zotero/content/preferences/preferences.xhtml', 'Preferences', 'chrome,titlebar,toolbar,centerscreen,dialog=yes');
        }
      } catch (e) {
        Zotero.logError?.('[TaskFlow] Could not open preferences: ' + e);
      }
    }
}
