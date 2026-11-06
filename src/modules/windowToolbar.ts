/**
 * Zotero TaskFlow - Window Toolbar Integration
 * Composed from Button Group, Shortcuts Group, and Message Bridge submodules.
 */

import { TaskFlowWindowMenus, injectedElements, pendingWindowLoads } from './windowMenus';
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

export { injectedElements, pendingWindowLoads };

export class TaskFlowWindowToolbar extends TaskFlowWindowMenus {
  addToWindow(window: any): void {
    if (!window || !window.document) return;
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

    const windowElements: any[] = [];
    this.ensureLocalization(doc);

    // 1. Context Menu
    injectItemContextMenu(this, window, doc, windowElements);

    // 2. Tab Icon Style
    injectTabIconStyle(doc, windowElements);

    // 3. Global Keyboard Shortcuts
    setupGlobalShortcuts(this, window, windowElements);

    // 4. Host-level Message Bridge
    setupHostMessageBridge(this, window, windowElements);

    // 5. Inject Toolbar Button with retry
    const toolbarRetryState = { cancelled: false, timers: new Set() };
    windowElements.push({
      remove: () => {
        toolbarRetryState.cancelled = true;
        for (const timer of toolbarRetryState.timers) window.clearTimeout(timer);
        toolbarRetryState.timers.clear();
      }
    });
    this.injectToolbarButton(window, windowElements, 0, toolbarRetryState);

    injectedElements.set(window, windowElements);
  }

  updateAllToolbarBadges(): void {
    updateAllToolbarBadges(this);
  }

  updateToolbarBadge(doc: Document, data: any): void {
    updateToolbarBadge(this, doc, data);
  }

  injectToolbarButton(
    window: any,
    windowElements: any[],
    retryCount = 0,
    retryState = { cancelled: false, timers: new Set() }
  ): void {
    injectToolbarButton(this, window, windowElements, retryCount, retryState);
  }

  repositionToolbarButton(window: any): void {
    repositionToolbarButton(this, window);
  }

  removeFromWindow(window: any): void {
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
