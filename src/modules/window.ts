import { ADDON_ID, CHROME_ROOT } from '../config';
import { TaskFlowLiterature } from './literature';
import { resolveItemReference, serializeLiteratureItem, getLiteratureItem } from '../utils';

declare let Zotero: any;
declare let Services: any;

export const injectedElements = new Map<any, any>();
export const pendingWindowLoads = new Map<any, any>();
export let windowListener: any = null;

export class TaskFlowWindow extends TaskFlowLiterature {

    switchWindowMode(mode, window = null) {
      try {
        if (Zotero.Prefs) {
          Zotero.Prefs.set('extensions.taskflow.windowMode', mode, true);
        }
      } catch (_) {}

      const mainWin = (window && window.Zotero_Tabs)
        ? window
        : (Zotero.getMainWindow ? Zotero.getMainWindow() : Services.wm.getMostRecentWindow('navigator:browser'));

      if (mode === 'subwindow' || mode === 'window') {
        // Close internal TaskFlow tab if open in main window to make mode switch clean
        if (mainWin?.Zotero_Tabs?._tabs) {
          try {
            const existingTab = mainWin.Zotero_Tabs._tabs.find((t) => t && t.type === 'todolist');
            if (existingTab) {
              mainWin.Zotero_Tabs.close(existingTab.id);
            }
          } catch (_) {}
        }
        this.openStandaloneWindow({}, mainWin, mode);
      } else if (mode === 'tab') {
        // Close standalone windows if open
        try {
          const windows = Services.wm.getEnumerator(null);
          while (windows.hasMoreElements()) {
            const w = windows.getNext();
            if (w && (w.name === 'Todolist_SubWindow' || w.name === 'Todolist_Window')) {
              try { w.close(); } catch (_) {}
            }
          }
        } catch (_) {}
        this.openTaskFlow({ targetMode: 'tab' }, mainWin);
      }
    }


    setElementVisibility(elem, visible) {
      if (!elem) return;
      elem.hidden = !visible;
      if (visible) {
        if (typeof elem.removeAttribute === 'function') elem.removeAttribute('hidden');
        if (elem.style?.removeProperty) elem.style.removeProperty('display');
      } else {
        if (typeof elem.setAttribute === 'function') elem.setAttribute('hidden', 'true');
        if (elem.style?.setProperty) elem.style.setProperty('display', 'none', 'important');
      }
    }


    refreshContextMenuVisibility() {
      try {
        const showCreate = Boolean(this.getPref('itemContextMenuCreate', false));
        const showBatch = Boolean(this.getPref('itemContextMenuBatch', false));
        if (typeof Services !== 'undefined' && Services.wm?.getEnumerator) {
          const windows = Services.wm.getEnumerator('navigator:browser');
          while (windows.hasMoreElements()) {
            const win = windows.getNext();
            const doc = win?.document;
            if (!doc) continue;
            const createItem = doc.getElementById('todolist-itemmenu-create');
            const batchItem = doc.getElementById('todolist-itemmenu-batch');
            const separator = doc.getElementById('todolist-itemmenu-separator');
            this.setElementVisibility(createItem, showCreate);
            this.setElementVisibility(batchItem, showBatch);
            this.setElementVisibility(separator, showCreate || showBatch);
          }
        }
      } catch (_) {}
    }


    registerMenus(doc?: any, win?: any) {
      if (Zotero.MenuManager && typeof Zotero.MenuManager.registerMenu === 'function') {
        try {
          if (this._menuManagerId && Zotero.MenuManager.unregisterMenu) {
            try { Zotero.MenuManager.unregisterMenu(this._menuManagerId); } catch (_) {}
            this._menuManagerId = null;
          }
          this._menuManagerId = Zotero.MenuManager.registerMenu({
            menuID: 'todolist-itemmenu-create',
            pluginID: ADDON_ID,
            target: 'main/library/item',
            menus: [
              {
                menuType: 'menuitem',
                label: '添加为待办',
                onShowing: (_event, context) => {
                  const show = Boolean(this.getPref('itemContextMenuCreate', false));
                  if (context && typeof context.setVisible === 'function') {
                    context.setVisible(show);
                  }
                  if (context?.menuElem) {
                    this.setElementVisibility(context.menuElem, show);
                  }
                  if (_event?.target && typeof _event.target.setAttribute === 'function') {
                    this.setElementVisibility(_event.target, show);
                  }
                },
                onCommand: (event, context) => {
                  try {
                    const win = event?.target?.ownerDocument?.defaultView || Zotero.getMainWindow?.();
                    return this.createTaskFromSelection(win, win?.document, null, context?.items);
                  } catch (err) {
                    Zotero.logError?.('[TaskFlow] Failed to create task: ' + err);
                  }
                },
              },
              {
                menuType: 'menuitem',
                label: '批量加入研读待办',
                onShowing: (_event, context) => {
                  const show = Boolean(this.getPref('itemContextMenuBatch', false));
                  if (context && typeof context.setVisible === 'function') {
                    context.setVisible(show);
                  }
                  if (context?.menuElem) {
                    this.setElementVisibility(context.menuElem, show);
                  }
                  if (_event?.target && typeof _event.target.setAttribute === 'function') {
                    this.setElementVisibility(_event.target, show);
                  }
                },
                onCommand: (event, context) => {
                  const win = event?.target?.ownerDocument?.defaultView || Zotero.getMainWindow?.();
                  return this.addSelectedLiteratureTasks(win, context?.items)
                    .catch(error => this.showNotice('批量加入失败', String(error)));
                }
              },
            ],
          });
        } catch (err) {
          Zotero.logError?.('[TaskFlow] MenuManager.registerMenu failed: ' + err);
        }
      }
    }


    registerThemeListener(listener) {
      this._themeListeners ||= new Set(); this._themeListeners.add(listener);
      listener(this.getHostTheme());
      return () => this._themeListeners.delete(listener);
    }


    initWindowListener() {
      this._windowListener = {
        onOpenWindow: (xulWindow) => {
          let domWindow;
          try {
            domWindow = xulWindow
              .QueryInterface(Ci.nsIInterfaceRequestor)
              .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
          } catch (_) {
            return;
          }
          const onLoad = () => {
            domWindow.removeEventListener('load', onLoad, false);
            pendingWindowLoads.delete(domWindow);
            if (!domWindow.closed) (Zotero.TaskFlow || Zotero.Todolist)?.addToWindow(domWindow);
          };
          pendingWindowLoads.set(domWindow, onLoad);
          domWindow.addEventListener('load', onLoad, { once: true });
          if (domWindow.document?.readyState === 'complete') onLoad();
        },
        onCloseWindow: (xulWindow) => {
          try {
            const domWindow = xulWindow
              .QueryInterface(Ci.nsIInterfaceRequestor)
              .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
            const onLoad = pendingWindowLoads.get(domWindow);
            if (onLoad) domWindow.removeEventListener('load', onLoad, false);
            pendingWindowLoads.delete(domWindow);
            (Zotero.TaskFlow || Zotero.Todolist)?.removeFromWindow(domWindow);
          } catch (_) {}
        },
        onWindowTitleChange: () => {},
      };
      Services.wm.addListener(this._windowListener);
    }


    createXULElement(doc, tagName) {
      if (typeof doc.createXULElement === 'function') {
        return doc.createXULElement(tagName);
      }
      const xulNs = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
      if (typeof doc.createElementNS === 'function') {
        return doc.createElementNS(xulNs, tagName);
      }
      return doc.createElement(tagName);
    }


    isMainWindow(win) {
      if (!win || !win.document) return false;
      if (win.ZoteroPane) return true;
      const doc = win.document;
      if (doc.getElementById('zotero-pane') || doc.getElementById('zotero-items-tree') || doc.getElementById('zotero-items-toolbar')) {
        return true;
      }
      const href = String(win.location?.href || '');
      return href.includes('zoteroPane') || href.includes('standalone/standalone');
    }


    isReaderWindow(win) {
      if (!win || !win.document) return false;
      const doc = win.document;
      if (doc.getElementById('reader-toolbar') || doc.querySelector?.('.reader')) return true;
      const href = String(win.location?.href || '');
      return href.includes('reader');
    }


    addToWindow(window) {
      if (!window || !window.document) return;
      const doc = window.document;

      const isMain = this.isMainWindow(window);
      const isReader = !isMain && this.isReaderWindow(window);

      // If this window is neither the main Zotero library window nor a reader window
      // (e.g. 插件市场, 偏好设置, 独立对话框等), immediately clean up any mistakenly
      // injected TaskFlow toolbar buttons, menu items or styles and do NOT inject into it!
      if (!isMain && !isReader) {
        try {
          doc.getElementById('todolist-toolbar-button')?.remove();
          doc.getElementById('todolist-tools-menu')?.remove();
          doc.getElementById('todolist-tools-preferences')?.remove();
          doc.getElementById('todolist-tab-style')?.remove();
        } catch (_) {}
        return;
      }

      // Standalone reader windows should never have the library toolbar button
      if (!isMain) {
        try {
          doc.getElementById('todolist-toolbar-button')?.remove();
        } catch (_) {}
      }

      // Always clean up any stale or previous menu items first (guarantees Tools menu and extra items are purged)
      const staleMenuIds = [
        'todolist-tools-menu',
        'todolist-tools-preferences',
        'todolist-itemmenu-separator',
        'todolist-itemmenu-create',
        'todolist-itemmenu-batch',
        'todolist-collectionmenu-create',
        'todolist-collectionmenu-plan',
        'todolist-reader-context-create',
      ];
      for (const id of staleMenuIds) {
        try {
          doc.getElementById(id)?.remove();
        } catch (_) {}
      }

      if (injectedElements.has(window)) return;

      const windowElements = [];
      this.ensureLocalization(doc);

      // 2. Add to Item Context Menu (文献右键菜单 - 仅保留“添加为待办”)
      // If MenuManager already registered natively (Zotero 8+), do not manually inject into #zotero-itemmenu
      if (!this._menuManagerId) {
        const itemMenu = doc.getElementById('zotero-itemmenu');
        if (itemMenu) {
          const separator = this.createXULElement(doc, 'menuseparator');
          separator.id = 'todolist-itemmenu-separator';
          itemMenu.appendChild(separator);
          windowElements.push(separator);

          const createFromItem = this.createXULElement(doc, 'menuitem');
          createFromItem.id = 'todolist-itemmenu-create';
          createFromItem.setAttribute('label', '添加为待办');

          // ONLY use 'command' event! Never attach 'click' or 'mousedown', which conflicts with Gecko popup manager!
          createFromItem.addEventListener('command', (e) => {
            try {
              this.createTaskFromSelection(window, doc, itemMenu);
            } catch (err) {
              Zotero.logError?.('[TaskFlow] Failed to create task from item context menu: ' + err);
            }
          });

          itemMenu.appendChild(createFromItem);
          windowElements.push(createFromItem);
          const batchFromItems = this.createXULElement(doc, 'menuitem');
          batchFromItems.id = 'todolist-itemmenu-batch';
          batchFromItems.setAttribute('label', '批量加入研读待办');
          batchFromItems.addEventListener('command', () => {
            this.addSelectedLiteratureTasks(window).catch(error => this.showNotice('批量加入失败', String(error)));
          });
          itemMenu.appendChild(batchFromItems);
          windowElements.push(batchFromItems);

          const updateItemMenuVisibility = () => {
            const showCreate = Boolean(this.getPref('itemContextMenuCreate', false));
            const showBatch = Boolean(this.getPref('itemContextMenuBatch', false));
            this.setElementVisibility(createFromItem, showCreate);
            this.setElementVisibility(batchFromItems, showBatch);
            this.setElementVisibility(separator, showCreate || showBatch);
          };
          itemMenu.addEventListener('popupshowing', updateItemMenuVisibility);
          windowElements.push({
            remove: () => itemMenu.removeEventListener('popupshowing', updateItemMenuVisibility),
          });
          updateItemMenuVisibility();
        }
      }

      // 3. Inject Tab Icon Style
      try {
        if (!doc.getElementById('todolist-tab-style')) {
          const style = doc.createElement('style');
          style.id = 'todolist-tab-style';
          style.textContent = `
            tab[type="todolist"] .tab-icon,
            .tab[type="todolist"] .tab-icon {
              list-style-image: url("${CHROME_ROOT}icons/taskflow.svg") !important;
              width: 16px !important;
              height: 16px !important;
            }
          `;
          (doc.head || doc.documentElement).appendChild(style);
          windowElements.push(style);
        }
      } catch (_) {}

      // 5. Global Keyboard Shortcuts:
      // Ctrl+Alt+T / Cmd+Alt+T: Open TaskFlow Workspace
      // Ctrl+Shift+T / Cmd+Shift+T: Convert Reader Selection / Page to Task
      const handleGlobalKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 't' || e.key === 'T')) {
          e.preventDefault?.();
          e.stopPropagation?.();
          this.triggerTaskFlowOpen(window);
        } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 't' || e.key === 'T')) {
          e.preventDefault?.();
          e.stopPropagation?.();
          this.createTaskFromReader(window);
        }
      };
      window.addEventListener('keydown', handleGlobalKeyDown, true);
      windowElements.push({
        remove: () => window.removeEventListener('keydown', handleGlobalKeyDown, true),
      });

      // 6. Host-level listener for TaskFlow iframe and window postMessages
      const handleHostMessage = async (event) => {
        try {
          const data = event.data;
          if (!data || typeof data !== 'object') return;
          if (typeof data.type !== 'string' || (!data.type.startsWith('TASKFLOW_') && !data.type.startsWith('TODOLIST_'))) return;
      const prefix = data.type.startsWith('TASKFLOW_') ? 'TASKFLOW_' : 'TODOLIST_';

          const sourceWin = event.source;
          const iframe = window.document.getElementById('todolist-tab-iframe');
          if (sourceWin && sourceWin !== iframe?.contentWindow) {
            let sourceURL;
            try { sourceURL = String(sourceWin.location?.href || ''); } catch (_) { return; }
            if (!/^chrome:\/\/(?:taskflow|todolist)\/content\/(?:index|sidepanel)\.html(?:[?#]|$)/.test(sourceURL)) return;
          }
          if (!sourceWin && !iframe?.contentWindow) return;

          if ((data.type === 'TASKFLOW_DIAGNOSTIC' || data.type === 'TODOLIST_DIAGNOSTIC') && data.record) {
            this.recordDiagnostic(data.record);
            return;
          }

          if (iframe && (event.source === iframe.contentWindow || !sourceWin)) {
            iframe._todolistReady = true;
          }

          const replyResult = (msgObj) => {
            try {
              if (sourceWin && typeof sourceWin.postMessage === 'function') {
                sourceWin.postMessage(msgObj, '*');
              } else if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage(msgObj, '*');
              }
            } catch (_) {}
          };

          // A. Handshake Ready
          if ((data.type === 'TASKFLOW_READY' || data.type === 'TODOLIST_READY')) {
            this._uiClients ||= new Set();
            if (sourceWin) this._uiClients.add(sourceWin);
            if (iframe) iframe._todolistReady = true;
            this.loadData().then((storedData) => {
              const pendingNav = iframe?._todolistPending || null;
              if (iframe) iframe._todolistPending = null;
              replyResult({
                type: 'TODOLIST_INIT_DATA',
                data: storedData,
                hostTheme: this.getHostTheme(),
                pending: pendingNav
              });
            }).catch(error => {
              this.recordDiagnostic({ action: '初始化 Zotero 数据', message: String(error), stack: error?.stack });
              replyResult({ type: 'TODOLIST_INIT_ERROR', error: String(error?.message || error) });
            });
            return;
          }

          // B. Storage Save Request
          if ((data.type === 'TASKFLOW_STORAGE_SET' || data.type === 'TODOLIST_STORAGE_SET') && data.payload) {
            this.saveData(data.payload).then((saved) => {
              if (data.requestId) {
                replyResult({
                  type: 'TODOLIST_STORAGE_SET_RESULT',
                  requestId: data.requestId,
                  data: saved,
                  success: true
                });
              }
            }).catch(error => replyResult({ type: 'TODOLIST_STORAGE_SET_RESULT',
              requestId: data.requestId, success: false, error: String(error) }));
            return;
          }

          if ((data.type === 'TASKFLOW_NOTIFY' || data.type === 'TODOLIST_NOTIFY')) {
            const success = (await this.showNotice(data.title || '任务提醒', data.body || '')) !== false;
            replyResult({ type: 'TODOLIST_NOTIFY_RESULT', requestId: data.requestId, success });
            return;
          }

          // C. Locate and select item in Zotero library pane
          if ((data.type === 'TASKFLOW_LOCATE_ITEM' || data.type === 'TODOLIST_LOCATE_ITEM') && data.key) {
            await this.locateLiteratureItem(data.key, data.libraryID, window);
            return;
          }

          // D. Open PDF Reader in Zotero (with optional page navigation)
          if ((data.type === 'TASKFLOW_OPEN_PDF' || data.type === 'TODOLIST_OPEN_PDF') && data.key) {
            await this.openTaskPdf({ zoteroPdfUri: data.key, zoteroLibraryID: data.libraryID,
              zoteroPage: data.page, zoteroAnnotationKey: data.annotationKey });
            return;
          }

          // E. Open Zotero Preferences pane
          if ((data.type === 'TASKFLOW_OPEN_PREFERENCES' || data.type === 'TODOLIST_OPEN_PREFERENCES')) {
            await this.openPreferencesPane(window);
            return;
          }

          // F. Request active item from library or reader
          if ((data.type === 'TASKFLOW_GET_ACTIVE_ITEM' || data.type === 'TODOLIST_GET_ACTIVE_ITEM')) {
            const activeItem = this.getCurrentActiveItem(window);
            replyResult({
              type: 'TODOLIST_GET_ACTIVE_ITEM_RESULT',
              requestId: data.requestId,
              item: activeItem ? serializeLiteratureItem(activeItem) : null
            });
            return;
          }

          if ((data.type === 'TASKFLOW_ADD_DROPPED_ITEMS' || data.type === 'TODOLIST_ADD_DROPPED_ITEMS')) {
            try {
              const result = await this.addDroppedLiteratureTasks(data.itemIDs);
              replyResult({ type: 'TODOLIST_ADD_DROPPED_ITEMS_RESULT', requestId: data.requestId, success: true, result });
            } catch (error) {
              replyResult({ type: 'TODOLIST_ADD_DROPPED_ITEMS_RESULT', requestId: data.requestId,
                success: false, error: String(error?.message || error) });
            }
            return;
          }

          // G. Sync tasks to Zotero child note
          if ((data.type === 'TASKFLOW_SYNC_NOTE' || data.type === 'TODOLIST_SYNC_NOTE') && data.key) {
            const item = resolveItemReference(data.key, data.libraryID);
            if (item) {
              const note = await this.syncTasksToChildNote(item);
              if (data.requestId) {
                replyResult({
                  type: 'TODOLIST_SYNC_NOTE_RESULT',
                  requestId: data.requestId,
                  success: Boolean(note),
                  noteId: note?.id
                });
              }
            }
            return;
          }

          // H. Get Zotero Collections
          if ((data.type === 'TASKFLOW_GET_COLLECTIONS' || data.type === 'TODOLIST_GET_COLLECTIONS')) {
            const collections = this.getZoteroCollections(data.libraryID);
            if (data.requestId) {
              replyResult({
                type: 'TODOLIST_GET_COLLECTIONS_RESULT',
                requestId: data.requestId,
                collections
              });
            }
            return;
          }

          // I. Create Collection Plan
          if ((data.type === 'TASKFLOW_CREATE_COLLECTION_PLAN' || data.type === 'TODOLIST_CREATE_COLLECTION_PLAN') && data.collectionID) {
            const col = Zotero.Collections?.get?.(data.collectionID);
            if (col) {
              await this.createCollectionReadingPlan(col, window);
            }
            return;
          }

          // J. Switch Window Mode (tab / window / subwindow)
          if ((data.type === 'TASKFLOW_SWITCH_WINDOW_MODE' || data.type === 'TODOLIST_SWITCH_WINDOW_MODE') && data.mode) {
            await this.switchWindowMode(data.mode, window);
            return;
          }

          // K. Export Data
          if ((data.type === 'TASKFLOW_EXPORT_DATA' || data.type === 'TODOLIST_EXPORT_DATA')) {
            await this.exportData(data.format || 'json');
            return;
          }

          // L. Import Data
          if ((data.type === 'TASKFLOW_IMPORT_DATA' || data.type === 'TODOLIST_IMPORT_DATA')) {
            await this.importDataFile(data.mode || 'merge', window);
            return;
          }

          // M. Clear All Data
          if ((data.type === 'TASKFLOW_CLEAR_DATA' || data.type === 'TODOLIST_CLEAR_DATA')) {
            await this.clearAllData(window);
            return;
          }

          // N. Copy Tasks Summary
          if ((data.type === 'TASKFLOW_COPY_SUMMARY' || data.type === 'TODOLIST_COPY_SUMMARY')) {
            await this.copyTasksSummary(window);
            return;
          }

          // O. Print Tasks
          if ((data.type === 'TASKFLOW_PRINT' || data.type === 'TODOLIST_PRINT')) {
            await this.printTasks(window);
            return;
          }

        } catch (e) {
          Zotero.logError?.('[TaskFlow] Host message processing error: ' + e);
          this.recordDiagnostic({ action: 'Zotero 主窗口 ' + event.data?.type, message: String(e?.message || e), stack: e?.stack });
          try { event.source?.postMessage({ requestId: event.data?.requestId, success: false, error: String(e?.message || e) }, '*'); } catch (_) {}
        }
      };

      window.addEventListener('message', handleHostMessage);
      windowElements.push({
        remove: () => window.removeEventListener('message', handleHostMessage),
      });

      // 7. Inject Toolbar Button with retry
      const toolbarRetryState = { cancelled: false, timers: new Set() };
      windowElements.push({
        remove: () => {
          toolbarRetryState.cancelled = true;
          for (const timer of toolbarRetryState.timers) window.clearTimeout(timer);
          toolbarRetryState.timers.clear();
        },
      });
      this.injectToolbarButton(window, windowElements, 0, toolbarRetryState);

      injectedElements.set(window, windowElements);
    }


    updateAllToolbarBadges() {
      try {
        if (typeof Services !== 'undefined' && Services.wm?.getEnumerator) {
          const windows = Services.wm.getEnumerator('navigator:browser');
          while (windows.hasMoreElements()) {
            const win = windows.getNext();
            if (win?.document && !win.closed) {
              this.updateToolbarBadge(win.document, this._cachedData);
            }
          }
        }
      } catch (_) {}
    }


    updateToolbarBadge(doc, data) {
      const button = doc?.getElementById('todolist-toolbar-button');
      if (!button) return;
      const today = this.localDateString(new Date());
      const tasks = (data?.tasks || []).filter(task => task);
      const overdue = tasks.filter(task => !task.completed && task.dueDate && task.dueDate < today).length;
      const count = tasks.filter(task => {
        if (task.completed || task.status === 'done' || (task.dueDate && task.dueDate < today)) return false;
        return !task.status || task.status === 'todo' || task.status === 'in-progress';
      }).length;
      const showBadge = Boolean(this.getPref('toolbarShowBadge', true));
      if (showBadge && count) button.setAttribute('data-taskflow-count', count > 99 ? '99+' : String(count));
      else button.removeAttribute('data-taskflow-count');
      if (doc.l10n?.setAttributes) {
        doc.l10n.setAttributes(button, 'taskflow-toolbar-status', { count, overdue });
      } else {
        const text = `TaskFlow: ${count} to do or in progress (excluding overdue), ${overdue} overdue (Ctrl+Alt+T)`;
        button.setAttribute('tooltiptext', text);
        button.setAttribute('aria-label', text);
      }
    }

    injectToolbarButton(window, windowElements, retryCount = 0, retryState = { cancelled: false, timers: new Set() }) {
      if (retryState.cancelled) return;
      if (!window || !window.document) return;
      const doc = window.document;

      // Strictly restrict toolbar button injection to the main Zotero library window!
      // NEVER inject into secondary windows or extension panels (e.g. 插件市场, 偏好设置, 对话框)
      if (!this.isMainWindow(window)) {
        try {
          doc.getElementById('todolist-toolbar-button')?.remove();
        } catch (_) {}
        return;
      }

      const toolbar =
        doc.getElementById('zotero-items-toolbar') ||
        doc.getElementById('zotero-item-toolbar') ||
        doc.getElementById('zotero-tb') ||
        doc.getElementById('zotero-toolbar') ||
        (doc.getElementById('zotero-pane')?.querySelector('toolbar') || null);

      if (!toolbar) {
        if (retryCount < 10) {
          const timer = window.setTimeout(() => {
            retryState.timers.delete(timer);
            if (!retryState.cancelled) this.injectToolbarButton(window, windowElements, retryCount + 1, retryState);
          }, 300);
          retryState.timers.add(timer);
        }
        return;
      }

      const isTodolistButton = (button) =>
        button.id === 'todolist-toolbar-button' ||
        ((button.getAttribute('label') === 'TaskFlow' || button.getAttribute('label') === 'Todolist') &&
          String(button.getAttribute('image') || '').includes('/icons/taskflow.svg') || String(button.getAttribute('image') || '').includes('/icons/todolist.svg'));

      // Clean up any stale or misplaced duplicate buttons
      const existingButtons = Array.from(doc.querySelectorAll('toolbarbutton')).filter(isTodolistButton);
      let btn: any = existingButtons[0] || null;
      if (existingButtons.length > 1) {
        for (let i = 1; i < existingButtons.length; i++) { (existingButtons[i] as any)
          try { (existingButtons[i] as any).remove(); } catch (_) {}
        }
      }

      if (!btn) {
        btn = this.createXULElement(doc, 'toolbarbutton');

        btn.id = 'todolist-toolbar-button';
        btn.setAttribute('label', 'TaskFlow');
        btn.setAttribute('tooltiptext', '打开 TaskFlow 学术任务工作台 (Ctrl+Alt+T)');
        btn.setAttribute('image', `${CHROME_ROOT}icons/taskflow.svg`);
        btn.setAttribute('class', 'zotero-tb-button toolbarbutton-1 chromeclass-toolbar-additional');
        btn.setAttribute(
          'style',
          'cursor: pointer; margin: 0 3px; display: inline-flex; align-items: center; justify-content: center;'
        );

        const trigger = (e) => {
          if (e) {
            e.preventDefault?.();
            e.stopPropagation?.();
          }
          this.triggerTaskFlowOpen(window);
        };

        btn.addEventListener('command', trigger);
        btn.addEventListener('mouseenter', () => this.updateToolbarBadge(doc, this._cachedData));
      }
      btn.setAttribute('image', `${CHROME_ROOT}icons/taskflow.svg`);
      if (!doc.getElementById('taskflow-toolbar-style')) {
        const style = doc.createElementNS('http://www.w3.org/1999/xhtml', 'style');
        style.id = 'taskflow-toolbar-style';
        style.textContent = `
          #todolist-toolbar-button { position:relative; }
          #todolist-toolbar-button[data-taskflow-count]::after {
            content:attr(data-taskflow-count); position:absolute; top:0; inset-inline-end:-2px;
            min-width:13px; height:13px; padding:0 3px; box-sizing:border-box; border-radius:7px;
            font:600 9px/13px system-ui,sans-serif; text-align:center;
            color:light-dark(#254e7b,#c7def8); background:light-dark(#dceaf9,#294560);
            border:1px solid var(--material-background,Canvas); pointer-events:none;
          }
        `;
        (doc.head || doc.documentElement).appendChild(style);
        windowElements.push(style);
      }

      // Find the proper anchor: the LAST action button in the toolbar before the search box spacer
      const toolbarChildren: any[] = Array.from(toolbar.children || []);
      const flexibleSpacerIndex = toolbarChildren.findIndex((child) => {
        const tag = String(child.localName || child.tagName || '').toLowerCase();
        return tag === 'toolbarspring' ||
          (tag === 'spacer' && Number(child.getAttribute('flex') || 0) > 0) ||
          child.id === 'zotero-tb-search' ||
          child.id === 'zotero-tb-search-textbox' ||
          child.classList?.contains('zotero-search-box') ||
          child.classList?.contains('search-box');
      });

      const leadingActionItems = flexibleSpacerIndex >= 0
        ? toolbarChildren.slice(0, flexibleSpacerIndex)
        : toolbarChildren;

      const toolbarButtons = leadingActionItems.filter((child) =>
        String(child.localName || child.tagName || '').toLowerCase() === 'toolbarbutton' &&
        !isTodolistButton(child) &&
        !child.hidden &&
        child.getAttribute('hidden') !== 'true' &&
        child.getAttribute('collapsed') !== 'true'
      );

      // Find the last visible button in the action group (places TaskFlow at the end of the plugin row)
      const anchor: any = (toolbarButtons.reverse() as any[]).find((child: any) => {
        try {
          const style = window.getComputedStyle(child);
          return style.display !== 'none' && style.visibility !== 'collapse';
        } catch (_error) {
          return true;
        }
      }) || null;

      if (anchor && anchor.parentNode === toolbar) {
        if (anchor.nextSibling !== btn) {
          anchor.parentNode.insertBefore(btn, anchor.nextSibling);
        }
      } else {
        const searchBox =
          doc.getElementById('zotero-tb-search-textbox') ||
          doc.getElementById('zotero-tb-search') ||
          toolbar.querySelector('input') ||
          toolbar.querySelector('.zotero-search-box') ||
          (flexibleSpacerIndex >= 0 ? toolbarChildren[flexibleSpacerIndex] : null);
        if (searchBox && searchBox.parentNode === toolbar) {
          toolbar.insertBefore(btn, searchBox);
        } else {
          toolbar.appendChild(btn);
        }
      }

      if (!windowElements.includes(btn)) {
        windowElements.push(btn);
      }
      this.updateToolbarBadge(doc, this._cachedData);
      if (!this._cachedData) {
        this.loadData().then(data => {
          if (!retryState.cancelled && !window.closed && doc.getElementById(btn.id) === btn) {
            this.updateToolbarBadge(doc, this._cachedData || data);
          }
        }).catch(error => Zotero.logError?.('[TaskFlow] Toolbar task count failed: ' + error));
      }

      // Re-position safeguard after other extensions finish initializing
      if (retryCount === 0) {
        const delays = [400, 1200, 2500];
        delays.forEach((d) => {
          const timer = window.setTimeout(() => {
            retryState.timers.delete(timer);
            if (!retryState.cancelled) {
              this.repositionToolbarButton(window);
            }
          }, d);
          retryState.timers.add(timer);
        });
      }
    }


    repositionToolbarButton(window) {
      if (!window || !window.document) return;
      if (!this.isMainWindow(window)) {
        try {
          window.document.getElementById('todolist-toolbar-button')?.remove();
        } catch (_) {}
        return;
      }
      const doc = window.document;
      const btn = doc.getElementById('todolist-toolbar-button');
      if (!btn) return;

      const toolbar =
        btn.parentNode ||
        doc.getElementById('zotero-items-toolbar') ||
        doc.getElementById('zotero-item-toolbar') ||
        doc.getElementById('zotero-tb') ||
        doc.getElementById('zotero-toolbar') ||
        (doc.getElementById('zotero-pane')?.querySelector('toolbar') || null);
      if (!toolbar) return;

      const isTodolistButton = (b) => b.id === 'todolist-toolbar-button';
      const toolbarChildren: any[] = Array.from(toolbar.children || []);
      const flexibleSpacerIndex = toolbarChildren.findIndex((child) => {
        const tag = String(child.localName || child.tagName || '').toLowerCase();
        return tag === 'toolbarspring' ||
          (tag === 'spacer' && Number(child.getAttribute('flex') || 0) > 0) ||
          child.id === 'zotero-tb-search' ||
          child.id === 'zotero-tb-search-textbox' ||
          child.classList?.contains('zotero-search-box');
      });

      const leadingActionItems = flexibleSpacerIndex >= 0
        ? toolbarChildren.slice(0, flexibleSpacerIndex)
        : toolbarChildren;

      const toolbarButtons = leadingActionItems.filter((child) =>
        String(child.localName || child.tagName || '').toLowerCase() === 'toolbarbutton' &&
        !isTodolistButton(child) &&
        !child.hidden &&
        child.getAttribute('hidden') !== 'true' &&
        child.getAttribute('collapsed') !== 'true'
      );

      const anchor: any = (toolbarButtons.reverse() as any[]).find((child: any) => {
        try {
          const style = window.getComputedStyle(child);
          return style.display !== 'none' && style.visibility !== 'collapse';
        } catch (_error) {
          return true;
        }
      });

      if (anchor && anchor.parentNode === toolbar) {
        if (anchor.nextSibling !== btn) {
          anchor.parentNode.insertBefore(btn, anchor.nextSibling);
        }
      }
    }


    removeFromWindow(window) {
      if (!window || !window.document) return;
      const doc = window.document;

      const elements = injectedElements.get(window);
      if (elements) {
        for (const el of elements) {
          try {
            if (typeof el.remove === 'function') {
              el.remove();
            } else if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          } catch (_) {}
        }
        injectedElements.delete(window);
      }

      // Explicit cleanup of all TaskFlow DOM elements by ID
      const allTodolistIds = [
        'todolist-tools-menu',
        'todolist-tools-preferences',
        'todolist-itemmenu-separator',
        'todolist-itemmenu-create',
        'todolist-itemmenu-batch',
        'todolist-collectionmenu-create',
        'todolist-collectionmenu-plan',
        'todolist-reader-context-create',
        'todolist-toolbar-button',
        'todolist-tab-style',
        'taskflow-toolbar-style',
      ];
      for (const id of allTodolistIds) {
        try {
          doc.getElementById(id)?.remove();
        } catch (_) {}
      }
    }


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
