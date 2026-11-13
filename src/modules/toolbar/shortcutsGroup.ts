/**
 * Zotero TaskFlow - Shortcuts & Menus Tool Group
 * Manages item context menus, tab styles, and global keyboard shortcuts.
 */

import { CHROME_ROOT } from '../../config';
import { addAbortableListener } from '../../lifecycle';
import type { TaskFlowHostLike } from '../../types/models';

export function injectTabIconStyle(doc: Document, windowElements: Array<{ remove?: () => void }>): void {
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
}

export function setupGlobalShortcuts(
  host: TaskFlowHostLike,
  window: Window,
  _windowElements: Array<{ remove?: () => void }>,
  signal?: AbortSignal
): void {
  const handleGlobalKeyDown = (event: Event): void => {
    const e = event as KeyboardEvent;
    if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 't' || e.key === 'T')) {
      e.preventDefault?.();
      e.stopPropagation?.();
      host.triggerTaskFlowOpen(window);
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 't' || e.key === 'T')) {
      e.preventDefault?.();
      e.stopPropagation?.();
      void host.createTaskFromReader(window);
    }
  };
  addAbortableListener(window, 'keydown', handleGlobalKeyDown, { capture: true }, signal);
}

export function injectItemContextMenu(
  host: TaskFlowHostLike,
  window: Window,
  doc: Document,
  windowElements: Array<{ remove?: () => void }>,
  signal?: AbortSignal
): void {
  if (host._menuManagerId) return;

  const itemMenu = doc.getElementById('zotero-itemmenu');
  if (!itemMenu) return;

  const separator = host.createXULElement(doc, 'menuseparator');
  separator.id = 'todolist-itemmenu-separator';
  itemMenu.appendChild(separator);
  windowElements.push(separator);

  const createFromItem = host.createXULElement(doc, 'menuitem');
  createFromItem.id = 'todolist-itemmenu-create';
  createFromItem.setAttribute('label', '添加为待办');

  addAbortableListener(
    createFromItem,
    'command',
    () => {
      try {
        host.createTaskFromSelection(window, doc, itemMenu);
      } catch (err) {
        Zotero.logError?.('[TaskFlow] Failed to create task from item context menu: ' + err);
      }
    },
    undefined,
    signal
  );

  itemMenu.appendChild(createFromItem);
  windowElements.push(createFromItem);

  const batchFromItems = host.createXULElement(doc, 'menuitem');
  batchFromItems.id = 'todolist-itemmenu-batch';
  batchFromItems.setAttribute('label', '批量加入研读待办');
  addAbortableListener(
    batchFromItems,
    'command',
    () => {
      host.addSelectedLiteratureTasks(window).catch((error: unknown) => host.showNotice('批量加入失败', String(error)));
    },
    undefined,
    signal
  );
  itemMenu.appendChild(batchFromItems);
  windowElements.push(batchFromItems);

  const updateItemMenuVisibility = (): void => {
    const showCreate = Boolean(host.getPref('itemContextMenuCreate', false));
    const showBatch = Boolean(host.getPref('itemContextMenuBatch', false));
    host.setElementVisibility(createFromItem, showCreate);
    host.setElementVisibility(batchFromItems, showBatch);
    host.setElementVisibility(separator, showCreate || showBatch);
  };

  addAbortableListener(itemMenu, 'popupshowing', updateItemMenuVisibility, undefined, signal);
  updateItemMenuVisibility();
}
