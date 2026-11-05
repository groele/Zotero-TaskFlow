import { ADDON_ID, CHROME_ROOT } from '../config';
import { TaskFlowLiterature } from './literature';
import { resolveItemReference, serializeLiteratureItem, getLiteratureItem } from '../utils';

declare let Zotero: any;
declare let Services: any;
declare let Ci: any;

export const injectedElements = new Map<any, any>();
export const pendingWindowLoads = new Map<any, any>();

export class TaskFlowWindowMenus extends TaskFlowLiterature {

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
}
