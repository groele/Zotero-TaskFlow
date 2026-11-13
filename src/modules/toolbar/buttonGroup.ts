/**
 * Zotero TaskFlow - Toolbar Button Group Module
 * Handles toolbar button injection, positioning, dynamic badge count, and styles.
 */

import { CHROME_ROOT } from '../../config';
import { addAbortableListener, setAbortableTimeout } from '../../lifecycle';
import type { TaskFlowData, TaskFlowHostLike, TaskRecord, ToolbarRetryState } from '../../types/models';

export const isTodolistButton = (button: Element): boolean =>
  button.id === 'todolist-toolbar-button' ||
  (button.getAttribute('label') === 'TaskFlow' &&
    String(button.getAttribute('image') || '').includes('/icons/taskflow.svg'));

export function updateToolbarBadge(host: TaskFlowHostLike, doc: Document, data: TaskFlowData | null | undefined): void {
  const button = doc?.getElementById('todolist-toolbar-button');
  if (!button) return;
  const today = host.localDateString(new Date());
  const tasks = (data?.tasks || []).filter((task): task is TaskRecord => Boolean(task));
  const overdue = tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < today).length;
  const count = tasks.filter((task) => {
    if (task.completed || task.status === 'done' || (task.dueDate && task.dueDate < today)) return false;
    return !task.status || task.status === 'todo' || task.status === 'in-progress';
  }).length;
  const showBadge = Boolean(host.getPref('toolbarShowBadge', true));
  if (showBadge && count) button.setAttribute('data-taskflow-count', count > 99 ? '99+' : String(count));
  else button.removeAttribute('data-taskflow-count');
  const l10n = (doc as Document & { l10n?: { setAttributes?: (el: Element, id: string, args: Record<string, number>) => void } }).l10n;
  if (l10n?.setAttributes) {
    l10n.setAttributes(button, 'taskflow-toolbar-status', { count, overdue });
  } else {
    const text = `TaskFlow: ${count} to do or in progress (excluding overdue), ${overdue} overdue (Ctrl+Alt+T)`;
    button.setAttribute('tooltiptext', text);
    button.setAttribute('aria-label', text);
  }
}

export function updateAllToolbarBadges(host: TaskFlowHostLike): void {
  try {
    if (typeof Services !== 'undefined' && Services.wm?.getEnumerator) {
      const windows = Services.wm.getEnumerator('navigator:browser');
      while (windows.hasMoreElements()) {
        const win = windows.getNext() as Window;
        if (win?.document && !win.closed) {
          updateToolbarBadge(host, win.document, host._cachedData);
        }
      }
    }
  } catch (_) {}
}

export function injectToolbarButton(
  host: TaskFlowHostLike,
  window: Window,
  windowElements: Array<{ remove?: () => void }>,
  retryCount: number = 0,
  retryState: ToolbarRetryState = { cancelled: false, timers: new Set() },
  signal?: AbortSignal
): void {
  if (retryState.cancelled || signal?.aborted) return;
  if (!window || !window.document) return;
  const doc = window.document;

  if (!host.isMainWindow(window)) {
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
      setAbortableTimeout(
        () => {
          if (!retryState.cancelled && !signal?.aborted) {
            injectToolbarButton(host, window, windowElements, retryCount + 1, retryState, signal);
          }
        },
        300,
        signal,
        window,
        retryState.timers
      );
    }
    return;
  }

  const existingButtons = Array.from(toolbar.querySelectorAll('toolbarbutton')).filter(isTodolistButton);
  let btn: Element | null = existingButtons[0] || null;
  if (existingButtons.length > 1) {
    for (let i = 1; i < existingButtons.length; i++) {
      try {
        existingButtons[i].remove();
      } catch (_) {}
    }
  }

  if (!btn) {
    btn = host.createXULElement(doc, 'toolbarbutton');
    btn.id = 'todolist-toolbar-button';
    btn.setAttribute('label', 'TaskFlow');
    btn.setAttribute('tooltiptext', '打开 TaskFlow 学术任务工作台 (Ctrl+Alt+T)');
    btn.setAttribute('image', `${CHROME_ROOT}icons/taskflow.svg`);
    btn.setAttribute('class', 'zotero-tb-button toolbarbutton-1 chromeclass-toolbar-additional');
    btn.setAttribute(
      'style',
      'cursor: pointer; margin: 0 3px; display: inline-flex; align-items: center; justify-content: center;'
    );

    const trigger = (e: Event): void => {
      e.preventDefault?.();
      e.stopPropagation?.();
      host.triggerTaskFlowOpen(window);
    };

    addAbortableListener(btn, 'command', trigger, undefined, signal);
    addAbortableListener(btn, 'mouseenter', () => updateToolbarBadge(host, doc, host._cachedData), undefined, signal);
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
      #todolist-toolbar-button .toolbarbutton-icon,
      #todolist-toolbar-button image {
        width: 18px !important;
        height: 18px !important;
        max-width: 18px !important;
        max-height: 18px !important;
      }
    `;
    (doc.head || doc.documentElement).appendChild(style);
    windowElements.push(style);
  }

  const toolbarChildren: Element[] = Array.from(toolbar.children || []);
  const flexibleSpacerIndex = toolbarChildren.findIndex((child) => {
    const tag = String(child.localName || child.tagName || '').toLowerCase();
    return (
      tag === 'toolbarspring' ||
      (tag === 'spacer' && Number(child.getAttribute('flex') || 0) > 0) ||
      child.id === 'zotero-tb-search' ||
      child.id === 'zotero-tb-search-textbox' ||
      child.classList?.contains('zotero-search-box') ||
      child.classList?.contains('search-box')
    );
  });

  const leadingActionItems =
    flexibleSpacerIndex >= 0 ? toolbarChildren.slice(0, flexibleSpacerIndex) : toolbarChildren;

  const toolbarButtons = leadingActionItems.filter((child) => {
    const hiddenProp = (child as Element & { hidden?: boolean }).hidden;
    return (
      String(child.localName || child.tagName || '').toLowerCase() === 'toolbarbutton' &&
      !isTodolistButton(child) &&
      !hiddenProp &&
      child.getAttribute('hidden') !== 'true' &&
      child.getAttribute('collapsed') !== 'true'
    );
  });

  const anchor: Element | null =
    toolbarButtons.reverse().find((child) => {
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
  updateToolbarBadge(host, doc, host._cachedData);
  const currentBtn = btn;
  if (!host._cachedData) {
    host
      .loadData()
      .then((data: TaskFlowData) => {
        if (!retryState.cancelled && !signal?.aborted && !window.closed && doc.getElementById(currentBtn.id) === currentBtn) {
          updateToolbarBadge(host, doc, host._cachedData || data);
        }
      })
      .catch((error: unknown) => Zotero.logError?.('[TaskFlow] Toolbar task count failed: ' + error));
  }

  if (retryCount === 0) {
    const delays = [400, 1200, 2500];
    delays.forEach((d) => {
      setAbortableTimeout(
        () => {
          if (!retryState.cancelled && !signal?.aborted) {
            repositionToolbarButton(host, window);
          }
        },
        d,
        signal,
        window,
        retryState.timers
      );
    });
  }
}

export function repositionToolbarButton(host: TaskFlowHostLike, window: Window): void {
  if (!window || !window.document) return;
  if (!host.isMainWindow(window)) {
    try {
      window.document.getElementById('todolist-toolbar-button')?.remove();
    } catch (_) {}
    return;
  }
  const doc = window.document;
  const btn = doc.getElementById('todolist-toolbar-button');
  if (!btn) return;

  const toolbar =
    (btn.parentNode as Element | null) ||
    doc.getElementById('zotero-items-toolbar') ||
    doc.getElementById('zotero-item-toolbar') ||
    doc.getElementById('zotero-tb') ||
    doc.getElementById('zotero-toolbar') ||
    (doc.getElementById('zotero-pane')?.querySelector('toolbar') || null);
  if (!toolbar) return;

  const isBtn = (b: Element): boolean => b.id === 'todolist-toolbar-button';
  const toolbarChildren: Element[] = Array.from(toolbar.children || []);
  const flexibleSpacerIndex = toolbarChildren.findIndex((child) => {
    const tag = String(child.localName || child.tagName || '').toLowerCase();
    return (
      tag === 'toolbarspring' ||
      (tag === 'spacer' && Number(child.getAttribute('flex') || 0) > 0) ||
      child.id === 'zotero-tb-search' ||
      child.id === 'zotero-tb-search-textbox' ||
      child.classList?.contains('zotero-search-box')
    );
  });

  const leadingActionItems =
    flexibleSpacerIndex >= 0 ? toolbarChildren.slice(0, flexibleSpacerIndex) : toolbarChildren;

  const toolbarButtons = leadingActionItems.filter((child) => {
    const hiddenProp = (child as Element & { hidden?: boolean }).hidden;
    return (
      String(child.localName || child.tagName || '').toLowerCase() === 'toolbarbutton' &&
      !isBtn(child) &&
      !hiddenProp &&
      child.getAttribute('hidden') !== 'true' &&
      child.getAttribute('collapsed') !== 'true'
    );
  });

  const anchor: Element | undefined = toolbarButtons.reverse().find((child) => {
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
