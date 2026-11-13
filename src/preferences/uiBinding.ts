/**
 * Zotero TaskFlow - Preferences UI Binding & Interactive Controls
 */

import { addAbortableListener, createScopedController, linkParentSignal } from '../lifecycle';
import { DEFAULTS, FIELDS, getPref, setPref, setPrefs } from './model';
import type { FieldItem } from './model';
import { setStatusL10n, updateDependencies } from './dependencies';
import { renderCustomTagsManager } from './tagsBinding';

export const HTML = 'http://www.w3.org/1999/xhtml';

const containerControllers = new WeakMap<Element, AbortController>();

function resetContainerSignal(container: Element, doc: Document, parentSignal?: AbortSignal): AbortSignal {
  containerControllers.get(container)?.abort();
  const next = createScopedController(doc.defaultView);
  linkParentSignal(next, parentSignal);
  containerControllers.set(container, next);
  return next.signal;
}

export function getZoteroInstance(
  win: Window | null | undefined,
  doc: Document
): (typeof Zotero) | null {
  return win?.Zotero || doc.defaultView?.Zotero || (typeof Zotero !== 'undefined' ? Zotero : null);
}

export function getEl(doc: Document, id: string): HTMLElement | null {
  return (
    doc.getElementById(id) ||
    doc.getElementById(id.replace('taskflow-', 'todolist-')) ||
    doc.getElementById(id.replace('todolist-', 'taskflow-'))
  );
}

export function reportOperationError(
  zot: (typeof Zotero) | null | undefined,
  doc: Document,
  action: string,
  error: unknown
): void {
  zot?.logError?.('[TaskFlow] ' + action + ': ' + error);
  const host = zot?.TaskFlow || zot?.Todolist;
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  Promise.resolve(host?.recordDiagnostic?.({ action, message, stack })).catch(() => {});
  const status = getEl(doc, 'taskflow-pref-status');
  setStatusL10n(status, 'taskflow-pref-status-op-error', `${action}失败：${message}`, { action, message });
}

type PrefControl = HTMLInputElement | HTMLSelectElement;

export async function saveControl(doc: Document, key: string, control: PrefControl, value: unknown): Promise<void> {
  control.disabled = true;
  updateDependencies(doc);
  try {
    await setPref(key, value);
    const status = getEl(doc, 'taskflow-pref-status');
    setStatusL10n(status, 'taskflow-pref-status-saved', '设置已保存。');
  } catch (error) {
    reportOperationError(doc.defaultView?.Zotero, doc, '保存设置', error);
  } finally {
    control.disabled = false;
    if (control instanceof HTMLInputElement && control.type === 'checkbox') {
      control.checked = Boolean(getPref(key));
    } else {
      control.value = String(getPref(key));
    }
    updateDependencies(doc);
  }
}

export function renderGroup(
  doc: Document,
  containerId: string,
  items: FieldItem[],
  parentSignal?: AbortSignal
): void {
  const container = doc.getElementById(containerId);
  if (!container) return;
  const signal = resetContainerSignal(container, doc, parentSignal);
  container.replaceChildren();

  for (const [key, labelText, type, options] of items) {
    const currentVal = getPref(key);

    if (type === 'check') {
      const row = doc.createElementNS(HTML, 'label');
      row.className = 'todolist-check-row';

      const input = doc.createElementNS(HTML, 'input') as HTMLInputElement;
      input.type = 'checkbox';
      input.id = `pref-${key}`;
      input.className = 'todolist-control';
      input.checked = Boolean(currentVal);
      addAbortableListener(
        input,
        'change',
        () => {
          void saveControl(doc, key, input, input.checked);
        },
        undefined,
        signal
      );

      const span = doc.createElementNS(HTML, 'span');
      span.className = 'todolist-control-label';
      span.textContent = labelText;
      span.setAttribute('data-l10n-id', `taskflow-pref-field-${key}`);

      row.appendChild(input);
      row.appendChild(span);
      container.appendChild(row);
    } else if (type === 'select') {
      const row = doc.createElementNS(HTML, 'div');
      row.className = 'todolist-control-row';

      const label = doc.createElementNS(HTML, 'label') as HTMLLabelElement;
      label.className = 'todolist-control-label';
      label.textContent = labelText;
      label.htmlFor = `pref-${key}`;
      label.setAttribute('data-l10n-id', `taskflow-pref-field-${key}`);

      const select = doc.createElementNS(HTML, 'select') as HTMLSelectElement;
      select.className = 'todolist-control';
      select.id = `pref-${key}`;

      for (const [optVal, optLabel] of options || []) {
        const option = doc.createElementNS(HTML, 'option') as HTMLOptionElement;
        option.value = optVal;
        option.textContent = optLabel;
        option.setAttribute('data-l10n-id', `taskflow-pref-opt-${key}-${optVal}`);
        if (String(currentVal) === String(optVal)) option.selected = true;
        select.appendChild(option);
      }

      addAbortableListener(
        select,
        'change',
        () => {
          const typedVal = typeof DEFAULTS[key] === 'number' ? Number(select.value) : select.value;
          void saveControl(doc, key, select, typedVal);
        },
        undefined,
        signal
      );

      row.appendChild(label);
      row.appendChild(select);
      container.appendChild(row);
    } else if (type === 'text' || type === 'time') {
      const row = doc.createElementNS(HTML, 'div');
      row.className = 'todolist-control-row';

      const label = doc.createElementNS(HTML, 'label') as HTMLLabelElement;
      label.className = 'todolist-control-label';
      label.textContent = labelText;
      label.htmlFor = `pref-${key}`;
      label.setAttribute('data-l10n-id', `taskflow-pref-field-${key}`);

      const input = doc.createElementNS(HTML, 'input') as HTMLInputElement;
      input.type = type;
      input.id = `pref-${key}`;
      input.className = 'todolist-control';
      input.value = String(currentVal ?? '');

      addAbortableListener(
        input,
        'change',
        () => {
          void saveControl(doc, key, input, input.value.trim());
        },
        undefined,
        signal
      );

      row.appendChild(label);
      row.appendChild(input);
      container.appendChild(row);
    }
  }
  updateDependencies(doc);
}

export function bindMaintenanceActions(
  doc: Document,
  win: Window | null | undefined,
  runOperation: (action: string, callback: () => unknown) => Promise<unknown>,
  signal?: AbortSignal
): void {
  const statusEl = getEl(doc, 'taskflow-pref-status');
  const zot = getZoteroInstance(win, doc);
  const host = zot?.TaskFlow || zot?.Todolist;
  const confirmHost = win || doc.defaultView;

  const bindClick = (id: string, handler: () => void): void => {
    addAbortableListener(getEl(doc, id), 'click', handler, undefined, signal);
  };

  bindClick('taskflow-btn-export-json', () => void runOperation('导出 JSON', () => host?.exportData?.('json')));
  bindClick('taskflow-btn-export-csv', () => void runOperation('导出 CSV', () => host?.exportData?.('csv')));
  bindClick('taskflow-btn-export-markdown', () => void runOperation('导出 Markdown', () => host?.exportData?.('markdown')));
  bindClick('taskflow-btn-export-txt', () => void runOperation('导出 TXT', () => host?.exportData?.('txt')));

  bindClick('taskflow-btn-import-file', () => {
    void runOperation('导入数据', async () => {
      const modeSelect = getEl(doc, 'taskflow-import-mode') as HTMLSelectElement | null;
      const rawMode = modeSelect?.value || 'merge';
      const mode = rawMode === 'overwrite' ? 'replace' : rawMode;
      const status = getEl(doc, 'taskflow-import-status');
      if (status) {
        status.textContent = '正在准备导入…';
        status.style.color = 'var(--flow-pref-muted)';
      }
      const res = await host?.importDataFile?.(mode, win);
      if (res?.success) {
        if (status) status.textContent = `✅ 成功导入 ${res.count} 个任务与标签数据！`;
        await renderCustomTagsManager(doc, win, signal);
      } else if (res?.error) {
        if (status) {
          status.textContent = `❌ 导入失败：${res.error}`;
          status.style.color = 'var(--flow-pref-danger)';
        }
      } else if (status) {
        status.textContent = '';
      }
    });
  });

  bindClick('taskflow-btn-print', () => void runOperation('打印任务', () => host?.printTasks?.(win)));
  bindClick('taskflow-btn-copy-summary', () => void runOperation('复制任务摘要', () => host?.copyTasksSummary?.(win)));

  bindClick('taskflow-btn-clear-all', () => {
    void runOperation('清空数据', async () => {
      if (!confirmHost?.confirm?.('⚠️ 警告：确定要清空所有待办任务、历史记录与自定义标签吗？此操作无法撤销！')) {
        setStatusL10n(statusEl, 'taskflow-pref-status-unchanged', '数据未清空。');
        return;
      }
      const cleared = await host?.clearAllData?.(win);
      if (cleared) {
        await renderCustomTagsManager(doc, win, signal);
        setStatusL10n(statusEl, 'taskflow-pref-status-cleared', '所有数据已清空。');
      } else {
        setStatusL10n(statusEl, 'taskflow-pref-status-unchanged', '数据未清空。');
      }
    });
  });

  const resetBtn = getEl(doc, 'taskflow-btn-reset-defaults') as HTMLButtonElement | null;
  if (resetBtn) {
    addAbortableListener(
      resetBtn,
      'click',
      () => {
        void runOperation('恢复默认设置', async () => {
          if (resetBtn.disabled || !confirmHost?.confirm?.('确定要恢复 TaskFlow 默认设置吗？')) return;
          resetBtn.disabled = true;
          try {
            await setPrefs(DEFAULTS);
            for (const [group, fields] of Object.entries(FIELDS)) {
              renderGroup(doc, `todolist-pref-${group}`, fields, signal);
            }
            updateDependencies(doc);
            setStatusL10n(statusEl, 'taskflow-pref-status-reset', '默认设置已恢复。');
          } finally {
            resetBtn.disabled = false;
          }
        });
      },
      undefined,
      signal
    );
  }
}
