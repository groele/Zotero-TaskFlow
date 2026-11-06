/**
 * Zotero TaskFlow - Preferences UI Binding & Interactive Controls
 */

import { DEFAULTS, FIELDS, FieldItem, getPref, setPref, setPrefs } from './model';

declare let Zotero: any;

export const HTML = 'http://www.w3.org/1999/xhtml';

export function getEl(doc: Document, id: string): any {
  return (
    doc.getElementById(id) ||
    doc.getElementById(id.replace('taskflow-', 'todolist-')) ||
    doc.getElementById(id.replace('todolist-', 'taskflow-'))
  );
}

export function reportOperationError(zot: any, doc: Document, action: string, error: any): void {
  zot?.logError?.('[TaskFlow] ' + action + ': ' + error);
  const host = zot?.TaskFlow || zot?.Todolist;
  Promise.resolve(host?.recordDiagnostic?.({ action, message: String(error?.message || error), stack: error?.stack })).catch(() => {});
  const status = getEl(doc, 'taskflow-pref-status');
  if (status) status.textContent = `${action}失败：${String(error?.message || error)}`;
}

export async function saveControl(doc: Document, key: string, control: any, value: any): Promise<void> {
  control.disabled = true;
  try {
    await setPref(key, value);
    const status = getEl(doc, 'taskflow-pref-status');
    if (status) status.textContent = '设置已保存。';
  } catch (error) {
    reportOperationError((doc.defaultView as any)?.Zotero, doc, '保存设置', error);
  } finally {
    control.disabled = false;
    if (control.type === 'checkbox') control.checked = Boolean(getPref(key));
    else control.value = String(getPref(key));
  }
}

export function renderGroup(doc: Document, containerId: string, items: FieldItem[]): void {
  const container = doc.getElementById(containerId);
  if (!container) return;
  container.replaceChildren();

  for (const [key, labelText, type, options] of items) {
    const currentVal = getPref(key);
    const visibleLabel = labelText;

    if (type === 'check') {
      const row = doc.createElementNS(HTML, 'label');
      row.className = 'todolist-check-row';

      const input = doc.createElementNS(HTML, 'input') as HTMLInputElement;
      input.type = 'checkbox';
      input.id = `pref-${key}`;
      input.className = 'todolist-control';
      input.checked = Boolean(currentVal);
      input.addEventListener('change', () => {
        saveControl(doc, key, input, input.checked);
      });

      const span = doc.createElementNS(HTML, 'span');
      span.className = 'todolist-control-label';
      span.textContent = visibleLabel;
      span.setAttribute('data-l10n-id', `taskflow-pref-field-${key}`);

      row.appendChild(input);
      row.appendChild(span);
      container.appendChild(row);
    } else if (type === 'select') {
      const row = doc.createElementNS(HTML, 'div');
      row.className = 'todolist-control-row';

      const label = doc.createElementNS(HTML, 'label') as HTMLLabelElement;
      label.className = 'todolist-control-label';
      label.textContent = visibleLabel;
      label.htmlFor = `pref-${key}`;
      label.setAttribute('data-l10n-id', `taskflow-pref-field-${key}`);

      const select = doc.createElementNS(HTML, 'select') as HTMLSelectElement;
      select.className = 'todolist-control';
      select.id = `pref-${key}`;

      for (const [optVal, optLabel] of options || []) {
        const option = doc.createElementNS(HTML, 'option') as HTMLOptionElement;
        option.value = optVal;
        option.textContent = optLabel;
        if (String(currentVal) === String(optVal)) {
          option.selected = true;
        }
        select.appendChild(option);
      }

      select.addEventListener('change', () => {
        const typedVal = typeof DEFAULTS[key] === 'number' ? Number(select.value) : select.value;
        saveControl(doc, key, select, typedVal);
      });

      row.appendChild(label);
      row.appendChild(select);
      container.appendChild(row);
    } else if (type === 'text' || type === 'time') {
      const row = doc.createElementNS(HTML, 'div');
      row.className = 'todolist-control-row';

      const label = doc.createElementNS(HTML, 'label') as HTMLLabelElement;
      label.className = 'todolist-control-label';
      label.textContent = visibleLabel;
      label.htmlFor = `pref-${key}`;
      label.setAttribute('data-l10n-id', `taskflow-pref-field-${key}`);

      const input = doc.createElementNS(HTML, 'input') as HTMLInputElement;
      input.type = type;
      input.id = `pref-${key}`;
      input.className = 'todolist-control';
      input.value = String(currentVal ?? '');

      input.addEventListener('change', () => {
        saveControl(doc, key, input, input.value.trim());
      });

      row.appendChild(label);
      row.appendChild(input);
      container.appendChild(row);
    }
  }
}

export async function renderCustomTagsManager(doc: Document, win: any): Promise<void> {
  const listEl = getEl(doc, 'taskflow-pref-tags-list');
  if (!listEl) return;
  listEl.replaceChildren();

  const zot = win?.Zotero || (doc.defaultView as any)?.Zotero || (typeof Zotero !== 'undefined' ? Zotero : null);
  if (!zot?.TaskFlow?.loadData) {
    const emptySpan = doc.createElementNS(HTML, 'span') as HTMLSpanElement;
    emptySpan.textContent = '暂无自定义标签 (Zotero 就绪后即可管理)';
    emptySpan.style.color = 'var(--flow-pref-muted)';
    emptySpan.style.fontSize = '13px';
    listEl.appendChild(emptySpan);
    return;
  }

  try {
    const data = await zot.TaskFlow.loadData();
    const tags = data.customTags || [];

    if (tags.length === 0) {
      const emptySpan = doc.createElementNS(HTML, 'span') as HTMLSpanElement;
      emptySpan.textContent = '暂无自定义标签，可在下方输入名称并选择颜色创建。';
      emptySpan.style.color = 'var(--flow-pref-muted)';
      emptySpan.style.fontSize = '13px';
      listEl.appendChild(emptySpan);
      return;
    }

    for (const tag of tags) {
      const badge = doc.createElementNS(HTML, 'span') as HTMLSpanElement;
      badge.className = 'todolist-pref-tag-badge';
      badge.style.backgroundColor = (tag.color || '#3b82f6') + '20';
      badge.style.color = 'var(--flow-pref-text)';
      badge.style.borderColor = (tag.color || '#3b82f6') + '40';

      const label = doc.createElementNS(HTML, 'span');
      label.textContent = `${tag.icon || '🏷️'} ${tag.name}`;
      badge.appendChild(label);

      const delBtn = doc.createElementNS(HTML, 'button') as HTMLButtonElement;
      delBtn.type = 'button';
      delBtn.className = 'todolist-pref-tag-delete';
      delBtn.textContent = '×';
      delBtn.title = `删除标签 "${tag.name}"`;
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (delBtn.disabled) return;
        delBtn.disabled = true;
        try {
          await zot.TaskFlow.saveData({ customTagChanges: { deleted: [tag.id] } });
          await renderCustomTagsManager(doc, win);
        } catch (error) {
          reportOperationError(zot, doc, '删除自定义标签', error);
        } finally {
          delBtn.disabled = false;
        }
      });
      badge.appendChild(delBtn);

      listEl.appendChild(badge);
    }
  } catch (err) {
    reportOperationError(zot, doc, '刷新自定义标签', err);
  }
}

export function bindTagPaletteAndCreator(doc: Document, win: any): void {
  let activeTagColor = '#ef4444';
  const palette = getEl(doc, 'taskflow-tag-color-palette');
  if (palette) {
    const dots = palette.querySelectorAll('.todolist-pref-color-dot');
    dots.forEach((dot: any) => {
      dot.addEventListener('click', () => {
        dots.forEach((d: any) => {
          d.classList.remove('active');
          d.setAttribute('aria-pressed', 'false');
        });
        dot.classList.add('active');
        dot.setAttribute('aria-pressed', 'true');
        activeTagColor = dot.getAttribute('data-color') || '#ef4444';
      });
    });
  }

  const addTagBtn = getEl(doc, 'taskflow-btn-add-tag');
  const tagInput = getEl(doc, 'taskflow-new-tag-name');
  let addingTag = false;

  const handleAddTag = async () => {
    if (addingTag) return;
    const name = tagInput?.value?.trim();
    if (!name) return;
    const zot = win?.Zotero || (doc.defaultView as any)?.Zotero || (typeof Zotero !== 'undefined' ? Zotero : null);
    if (!zot?.TaskFlow && !zot?.Todolist) return;

    addingTag = true;
    if (addTagBtn) addTagBtn.disabled = true;
    if (tagInput) tagInput.disabled = true;
    try {
      const tag = {
        id: 'tag_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        name: name,
        color: activeTagColor || '#3b82f6',
        icon: '🏷️'
      };
      await zot.TaskFlow.saveData({ customTagChanges: { added: [tag] } });
      if (tagInput) tagInput.value = '';
      await renderCustomTagsManager(doc, win);
    } catch (error) {
      reportOperationError(zot, doc, '添加自定义标签', error);
    } finally {
      addingTag = false;
      if (addTagBtn) addTagBtn.disabled = false;
      if (tagInput) tagInput.disabled = false;
    }
  };

  addTagBtn?.addEventListener('click', handleAddTag);
  tagInput?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  });
}

export function bindMaintenanceActions(
  doc: Document,
  win: any,
  runOperation: (action: string, callback: () => any) => Promise<any>
): void {
  const statusEl = getEl(doc, 'taskflow-pref-status');
  const zot = win?.Zotero || (doc.defaultView as any)?.Zotero || (typeof Zotero !== 'undefined' ? Zotero : null);

  getEl(doc, 'taskflow-btn-export-json')?.addEventListener('click', () => {
    runOperation('导出 JSON', () => zot?.TaskFlow?.exportData?.('json'));
  });

  getEl(doc, 'taskflow-btn-export-csv')?.addEventListener('click', () => {
    runOperation('导出 CSV', () => zot?.TaskFlow?.exportData?.('csv'));
  });

  getEl(doc, 'taskflow-btn-export-markdown')?.addEventListener('click', () => {
    runOperation('导出 Markdown', () => zot?.TaskFlow?.exportData?.('markdown'));
  });

  getEl(doc, 'taskflow-btn-export-txt')?.addEventListener('click', () => {
    runOperation('导出 TXT', () => zot?.TaskFlow?.exportData?.('txt'));
  });

  getEl(doc, 'taskflow-btn-import-file')?.addEventListener('click', () =>
    runOperation('导入数据', async () => {
      const mode = getEl(doc, 'taskflow-import-mode')?.value || 'merge';
      const status = getEl(doc, 'taskflow-import-status');
      if (status) {
        status.textContent = '正在准备导入…';
        status.style.color = 'var(--flow-pref-muted)';
      }
      const res = await zot?.TaskFlow?.importDataFile?.(mode, win);
      if (res?.success) {
        if (status) status.textContent = `✅ 成功导入 ${res.count} 个任务与标签数据！`;
        renderCustomTagsManager(doc, win);
      } else if (res?.error) {
        if (status) {
          status.textContent = `❌ 导入失败：${res.error}`;
          status.style.color = 'var(--flow-pref-danger)';
        }
      } else {
        if (status) status.textContent = '';
      }
    })
  );

  getEl(doc, 'taskflow-btn-print')?.addEventListener('click', () => {
    runOperation('打印任务', () => zot?.TaskFlow?.printTasks?.(win));
  });

  getEl(doc, 'taskflow-btn-copy-summary')?.addEventListener('click', () => {
    runOperation('复制任务摘要', () => zot?.TaskFlow?.copyTasksSummary?.(win));
  });

  getEl(doc, 'taskflow-btn-clear-all')?.addEventListener('click', () =>
    runOperation('清空数据', async () => {
      if (!win.confirm('⚠️ 警告：确定要清空所有待办任务、历史记录与自定义标签吗？此操作无法撤销！')) {
        if (statusEl) statusEl.textContent = '数据未清空。';
        return;
      }
      const cleared = await zot?.TaskFlow?.clearAllData?.(win);
      if (cleared) {
        await renderCustomTagsManager(doc, win);
        if (statusEl) statusEl.textContent = '所有数据已清空。';
      } else if (statusEl) {
        statusEl.textContent = '数据未清空。';
      }
    })
  );

  const resetBtn = getEl(doc, 'taskflow-btn-reset-defaults');
  if (resetBtn) {
    resetBtn.addEventListener('click', () =>
      runOperation('恢复默认设置', async () => {
        if (resetBtn.disabled || !win.confirm('确定要恢复 TaskFlow 默认设置吗？')) return;
        resetBtn.disabled = true;
        try {
          await setPrefs(DEFAULTS);
          for (const [group, fields] of Object.entries(FIELDS)) {
            renderGroup(doc, `todolist-pref-${group}`, fields);
          }
          if (statusEl) statusEl.textContent = '默认设置已恢复。';
        } finally {
          resetBtn.disabled = false;
        }
      })
    );
  }
}
