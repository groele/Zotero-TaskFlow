import { ADDON_ID } from '../config';
import { TaskFlowLiterature } from './literature';
import { addAbortableListener, createScopedController, linkParentSignal } from '../lifecycle';
import type { ZoteroItemLike } from '../types/models';

export const injectedElements = new Map<Window, Array<{ remove?: () => void }>>();
export const pendingWindowLoads = new Map<Window, AbortController>();
export const windowControllers = new Map<Window, AbortController>();

export class TaskFlowWindowMenus extends TaskFlowLiterature {
  _themeListeners: Set<(theme: 'light' | 'dark') => void> = new Set();
  _windowListener: Record<string, unknown> | null = null;

  switchWindowMode(mode: string, window: Window | null = null): void {
    try {
      if (Zotero.Prefs) {
        Zotero.Prefs.set('extensions.taskflow.windowMode', mode, true);
      }
    } catch (_) {}

    const mainWin =
      window && window.Zotero_Tabs
        ? window
        : Zotero.getMainWindow?.() || Services.wm?.getMostRecentWindow?.('navigator:browser') || null;

    if (mode === 'subwindow' || mode === 'window') {
      if (mainWin?.Zotero_Tabs?._tabs) {
        try {
          const existingTab = mainWin.Zotero_Tabs._tabs.find((t) => t && t.type === 'todolist');
          if (existingTab) {
            mainWin.Zotero_Tabs.close?.(existingTab.id);
          }
        } catch (_) {}
      }
      this.openStandaloneWindow({}, mainWin, mode);
    } else if (mode === 'tab') {
      try {
        const windows = Services.wm?.getEnumerator?.(null);
        while (windows?.hasMoreElements()) {
          const w = windows.getNext() as Window & { name?: string };
          if (w && (w.name === 'Todolist_SubWindow' || w.name === 'Todolist_Window')) {
            try {
              w.close();
            } catch (_) {}
          }
        }
      } catch (_) {}
      this.openTaskFlow({ targetMode: 'tab' }, mainWin);
    }
  }

  setElementVisibility(elem: Element | null, visible: boolean): void {
    if (!elem) return;
    const styled = elem as HTMLElement & { hidden: boolean };
    styled.hidden = !visible;
    if (visible) {
      if (typeof elem.removeAttribute === 'function') elem.removeAttribute('hidden');
      if (styled.style?.removeProperty) styled.style.removeProperty('display');
    } else {
      if (typeof elem.setAttribute === 'function') elem.setAttribute('hidden', 'true');
      if (styled.style?.setProperty) styled.style.setProperty('display', 'none', 'important');
    }
  }

  refreshContextMenuVisibility(): void {
    try {
      const showCreate = Boolean(this.getPref('itemContextMenuCreate', false));
      const showBatch = Boolean(this.getPref('itemContextMenuBatch', false));
      if (typeof Services !== 'undefined' && Services.wm?.getEnumerator) {
        const windows = Services.wm.getEnumerator('navigator:browser');
        while (windows.hasMoreElements()) {
          const win = windows.getNext() as Window;
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

  registerMenus(_doc?: Document, _win?: Window): void {
    if (Zotero.MenuManager && typeof Zotero.MenuManager.registerMenu === 'function') {
      try {
        if (this._menuManagerId && Zotero.MenuManager.unregisterMenu) {
          try {
            Zotero.MenuManager.unregisterMenu(this._menuManagerId);
          } catch (_) {}
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
              onShowing: (_event: Event, context?: { setVisible?: (v: boolean) => void; menuElem?: Element | null }) => {
                const show = Boolean(this.getPref('itemContextMenuCreate', false));
                if (context && typeof context.setVisible === 'function') {
                  context.setVisible(show);
                }
                if (context?.menuElem) {
                  this.setElementVisibility(context.menuElem, show);
                }
                const target = _event?.target as Element | null;
                if (target && typeof target.setAttribute === 'function') {
                  this.setElementVisibility(target, show);
                }
              },
              onCommand: (event: Event, context?: { items?: ZoteroItemLike[] }) => {
                try {
                  const targetEl = event?.target as Element | null;
                  const win = targetEl?.ownerDocument?.defaultView || Zotero.getMainWindow?.() || null;
                  return this.createTaskFromSelection(win, win?.document, null, context?.items);
                } catch (err) {
                  Zotero.logError?.('[TaskFlow] Failed to create task: ' + err);
                }
              }
            },
            {
              menuType: 'menuitem',
              label: '批量加入研读待办',
              onShowing: (_event: Event, context?: { setVisible?: (v: boolean) => void; menuElem?: Element | null }) => {
                const show = Boolean(this.getPref('itemContextMenuBatch', false));
                if (context && typeof context.setVisible === 'function') {
                  context.setVisible(show);
                }
                if (context?.menuElem) {
                  this.setElementVisibility(context.menuElem, show);
                }
                const target = _event?.target as Element | null;
                if (target && typeof target.setAttribute === 'function') {
                  this.setElementVisibility(target, show);
                }
              },
              onCommand: (event: Event, context?: { items?: ZoteroItemLike[] }) => {
                const targetEl = event?.target as Element | null;
                const win = targetEl?.ownerDocument?.defaultView || Zotero.getMainWindow?.() || null;
                return this.addSelectedLiteratureTasks(win, context?.items).catch((error: unknown) =>
                  this.showNotice('批量加入失败', String(error))
                );
              }
            }
          ]
        });
      } catch (err) {
        Zotero.logError?.('[TaskFlow] MenuManager.registerMenu failed: ' + err);
      }
    }
  }

  registerThemeListener(
    listener: (theme: 'light' | 'dark') => void,
    options?: { signal?: AbortSignal }
  ): () => void {
    const signal = options?.signal;
    if (signal?.aborted) return () => {};
    this._themeListeners ||= new Set();
    this._themeListeners.add(listener);
    listener(this.getHostTheme());
    const dispose = (): void => {
      this._themeListeners.delete(listener);
    };
    if (signal) {
      signal.addEventListener('abort', dispose, { once: true });
    }
    return dispose;
  }

  initWindowListener(): void {
    this._windowListener = {
      onOpenWindow: (xulWindow: { QueryInterface: (iid: unknown) => { getInterface: (iid: unknown) => Window } }) => {
        let domWindow: Window;
        try {
          domWindow = xulWindow
            .QueryInterface(Ci.nsIInterfaceRequestor)
            .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
        } catch (_) {
          return;
        }
        if (this._shuttingDown) return;
        const controller = createScopedController(domWindow);
        linkParentSignal(controller, this.getHostSignal());
        const onLoad = (): void => {
          pendingWindowLoads.delete(domWindow);
          controller.abort();
          if (!this._shuttingDown && !domWindow.closed) {
            (Zotero.TaskFlow || Zotero.Todolist)?.addToWindow?.(domWindow);
          }
        };
        pendingWindowLoads.set(domWindow, controller);
        addAbortableListener(domWindow, 'load', onLoad, { once: true }, controller.signal);
        if (domWindow.document?.readyState === 'complete') onLoad();
      },
      onCloseWindow: (xulWindow: { QueryInterface: (iid: unknown) => { getInterface: (iid: unknown) => Window } }) => {
        try {
          const domWindow = xulWindow
            .QueryInterface(Ci.nsIInterfaceRequestor)
            .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
          const controller = pendingWindowLoads.get(domWindow);
          if (controller) {
            controller.abort();
            pendingWindowLoads.delete(domWindow);
          }
          (Zotero.TaskFlow || Zotero.Todolist)?.removeFromWindow?.(domWindow);
        } catch (_) {}
      },
      onWindowTitleChange: () => {}
    };
    Services.wm?.addListener(this._windowListener);
  }

  createXULElement(doc: Document, tagName: string): Element {
    const docAny = doc as Document & { createXULElement?: (tag: string) => Element };
    if (typeof docAny.createXULElement === 'function') {
      return docAny.createXULElement(tagName);
    }
    const xulNs = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
    if (typeof doc.createElementNS === 'function') {
      return doc.createElementNS(xulNs, tagName);
    }
    return doc.createElement(tagName);
  }

  isMainWindow(win: Window | null | undefined): boolean {
    if (!win || !win.document) return false;
    if (win.ZoteroPane) return true;
    const doc = win.document;
    if (doc.getElementById('zotero-pane') || doc.getElementById('zotero-items-tree') || doc.getElementById('zotero-items-toolbar')) {
      return true;
    }
    const href = String(win.location?.href || '');
    return href.includes('zoteroPane') || href.includes('standalone/standalone');
  }

  isReaderWindow(win: Window | null | undefined): boolean {
    if (!win || !win.document) return false;
    const doc = win.document;
    if (doc.getElementById('reader-toolbar') || doc.querySelector?.('.reader')) return true;
    const href = String(win.location?.href || '');
    return href.includes('reader');
  }
}
