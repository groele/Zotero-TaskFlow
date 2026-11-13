/**
 * Zotero TaskFlow - Window Toolbar Integration
 * Composed from Button Group, Shortcuts Group, and Message Bridge submodules.
 */

import { TaskFlowWindowMenus, injectedElements, pendingWindowLoads, windowControllers } from './windowMenus';
import { addAbortableListener, createScopedController, linkParentSignal } from '../lifecycle';
import type { TaskFlowData, ToolbarRetryState } from '../types/models';
import {
  injectToolbarButton,
  repositionToolbarButton,
  updateToolbarBadge,
  updateAllToolbarBadges
} from './toolbar/buttonGroup';
import {
  injectTabIconStyle,
  setupGlobalShortcuts,
  injectItemContextMenu
} from './toolbar/shortcutsGroup';
import { setupHostMessageBridge } from './toolbar/messageBridgeGroup';

export { injectedElements, pendingWindowLoads, windowControllers };

export class TaskFlowWindowToolbar extends TaskFlowWindowMenus {
  addToWindow(window: Window): void {
    if (!window || !window.document || this._shuttingDown) return;
    const doc = window.document;

    const isMain = this.isMainWindow(window);
    const isReader = !isMain && this.isReaderWindow(window);

    // Filter out non-main / non-reader windows
    if (!isMain && !isReader) {
      try {
        doc.getElementById('todolist-toolbar-button')?.remove();
        doc.getElementById('todolist-tools-menu')?.remove();
        doc.getElementById('todolist-tools-preferences')?.remove();
        doc.getElementById('todolist-tab-style')?.remove();
      } catch (_) {}
      return;
    }

    if (!isMain) {
      try {
        doc.getElementById('todolist-toolbar-button')?.remove();
      } catch (_) {}
    }

    // Clean up stale or previous menu items
    const staleMenuIds = [
      'todolist-tools-menu',
      'todolist-tools-preferences',
      'todolist-itemmenu-separator',
      'todolist-itemmenu-create',
      'todolist-itemmenu-batch',
      'todolist-collectionmenu-create',
      'todolist-collectionmenu-plan',
      'todolist-reader-context-create'
    ];
    for (const id of staleMenuIds) {
      try {
        doc.getElementById(id)?.remove();
      } catch (_) {}
    }

    if (injectedElements.has(window)) return;

    const windowElements: Array<{ remove?: () => void }> = [];
    const windowController = createScopedController(window);
    linkParentSignal(windowController, this.getHostSignal());
    const { signal } = windowController;
    windowControllers.set(window, windowController);

    addAbortableListener(window, 'unload', () => this.removeFromWindow(window), { once: true }, signal);
    this.ensureLocalization(doc);

    // 1. Context Menu
    injectItemContextMenu(this, window, doc, windowElements, signal);

    // 2. Tab Icon Style
    injectTabIconStyle(doc, windowElements);

    // 3. Global Keyboard Shortcuts
    setupGlobalShortcuts(this, window, windowElements, signal);

    // 4. Host-level Message Bridge
    setupHostMessageBridge(this, window, windowElements, signal);

    // 5. Inject Toolbar Button with retry
    const toolbarRetryState: ToolbarRetryState = { cancelled: false, timers: new Set() };
    windowElements.push({
      remove: () => {
        toolbarRetryState.cancelled = true;
        for (const timer of toolbarRetryState.timers) window.clearTimeout(timer);
        toolbarRetryState.timers.clear();
        windowController.abort();
      }
    });
    this.injectToolbarButton(window, windowElements, 0, toolbarRetryState, signal);

    injectedElements.set(window, windowElements);
  }

  updateAllToolbarBadges(): void {
    updateAllToolbarBadges(this);
  }

  updateToolbarBadge(doc: Document, data?: TaskFlowData | null): void {
    updateToolbarBadge(this, doc, data);
  }

  injectToolbarButton(
    window: Window,
    windowElements: Array<{ remove?: () => void }>,
    retryCount: number = 0,
    retryState: ToolbarRetryState = { cancelled: false, timers: new Set() },
    signal?: AbortSignal
  ): void {
    const resolvedSignal = signal || windowControllers.get(window)?.signal;
    injectToolbarButton(this, window, windowElements, retryCount, retryState, resolvedSignal);
  }

  repositionToolbarButton(window: Window): void {
    repositionToolbarButton(this, window);
  }

  removeFromWindow(window: Window): void {
    if (!window || !window.document) return;
    const doc = window.document;

    const controller = windowControllers.get(window);
    if (controller) {
      controller.abort();
      windowControllers.delete(window);
    }

    const elements = injectedElements.get(window);
    if (elements) {
      for (const el of elements) {
        try {
          if (typeof el.remove === 'function') {
            el.remove();
          } else {
            const node = el as unknown as Node;
            if (node.parentNode) node.parentNode.removeChild(node);
          }
        } catch (_) {}
      }
      injectedElements.delete(window);
    }

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
      'taskflow-toolbar-style'
    ];
    for (const id of allTodolistIds) {
      try {
        doc.getElementById(id)?.remove();
      } catch (_) {}
    }
  }
}
