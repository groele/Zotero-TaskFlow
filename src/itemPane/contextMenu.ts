/**
 * Zotero TaskFlow - ItemPane Context Menu & Task Controls Module
 * Handles task row controls, context menus, reschedule popups, and navigation buttons.
 */

import { createEl } from './domView';
import { addAbortableListener } from '../lifecycle';
import type { ItemPaneState, TaskFlowHostLike, TaskRecord, ZoteroItemLike } from '../types/models';

export function renderRescheduleMenu(
  doc: Document,
  task: TaskRecord,
  state: ItemPaneState | undefined,
  host: TaskFlowHostLike,
  signal?: AbortSignal
): HTMLDetailsElement {
  const menu = createEl(doc, 'details', 'td-reschedule') as HTMLDetailsElement;
  const summary = createEl(doc, 'summary', '', '改期');
  menu.appendChild(summary);

  for (const [days, label] of [
    [0, '今天'],
    [3, '延后三天'],
    [7, '延后一周']
  ] as [number, string][]) {
    const dateBtn = createEl(doc, 'button', 'td-reschedule-option', label) as HTMLButtonElement;
    dateBtn.type = 'button';
    dateBtn.title = days ? '从当前截止日期延后；未设置或已逾期时从今天计算' : '截止日期设为今天';
    addAbortableListener(
      dateBtn,
      'click',
      async () => {
        if (dateBtn.disabled) return;
        menu.querySelectorAll('button').forEach((btn) => {
          btn.disabled = true;
        });
        try {
          await host.rescheduleLiteratureTask(task.id, days, Number(days) > 0);
          menu.open = false;
        } catch (error) {
          host.showNotice('改期失败', String(error));
        } finally {
          menu.querySelectorAll('button').forEach((btn) => {
            btn.disabled = false;
          });
        }
        Promise.resolve(state?.refresh?.()).catch((error: unknown) =>
          Zotero.logError?.('[TaskFlow] 改期刷新失败: ' + error)
        );
      },
      undefined,
      signal
    );
    menu.appendChild(dateBtn);
  }
  return menu;
}

export function renderTaskControls(
  doc: Document,
  task: TaskRecord,
  _target: ZoteroItemLike,
  host: TaskFlowHostLike,
  state: ItemPaneState | undefined,
  signal?: AbortSignal
): HTMLElement {
  const controls = createEl(doc, 'div', 'td-task-controls');

  if (task.zoteroItemKey) {
    const locateButton = createEl(doc, 'button', 'td-task-locate', '↗ Zotero') as HTMLButtonElement;
    locateButton.type = 'button';
    locateButton.title = '在 Zotero 文献库中定位这篇文献';
    locateButton.setAttribute('aria-label', `跳转到文献：${task.zoteroItemTitle || task.title}`);
    addAbortableListener(
      locateButton,
      'click',
      (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        host
          .locateLiteratureItem(task.zoteroUri || task.zoteroItemKey, task.zoteroLibraryID, Zotero.getMainWindow?.() || null)
          .catch((error: unknown) => host.showNotice('无法跳转文献', String(error)));
      },
      undefined,
      signal
    );
    controls.appendChild(locateButton);
  }

  if (task.dueDate) {
    const todayStr = host.localDateString(new Date());
    const isOverdue = !task.completed && task.dueDate < todayStr;
    const dateText = (isOverdue ? '逾期 · ' : '') + (task.dueDate.length > 5 ? task.dueDate.slice(5) : task.dueDate);
    const dueBadge = createEl(doc, 'span', `td-badge-date ${isOverdue ? 'is-overdue' : ''}`, dateText);
    dueBadge.title = isOverdue ? `已逾期！截止日期: ${task.dueDate}` : `截止日期: ${task.dueDate}`;
    controls.appendChild(dueBadge);
  }

  const editBtn = createEl(doc, 'button', 'td-task-edit', '编辑') as HTMLButtonElement;
  editBtn.type = 'button';
  addAbortableListener(
    editBtn,
    'click',
    () => {
      host.openTaskFlow({ mode: 'edit_task', taskId: task.id }, Zotero.getMainWindow?.() || null);
    },
    undefined,
    signal
  );
  controls.appendChild(editBtn);

  if (!task.completed) {
    const rescheduleMenu = renderRescheduleMenu(doc, task, state, host, signal);
    controls.appendChild(rescheduleMenu);
  }

  if (task.zoteroPdfUri || task.zoteroAnnotationKey) {
    const pdfBtn = createEl(doc, 'button', 'td-task-pdf', task.zoteroAnnotationKey ? '回到批注' : '打开 PDF') as HTMLButtonElement;
    pdfBtn.type = 'button';
    addAbortableListener(
      pdfBtn,
      'click',
      () => {
        host.openTaskPdf(task).catch((error: unknown) => host.showNotice('打开 PDF 失败', String(error)));
      },
      undefined,
      signal
    );
    controls.appendChild(pdfBtn);
  }

  return controls;
}

export function attachTaskCardContextMenu(
  card: HTMLElement,
  _task: TaskRecord,
  _host: TaskFlowHostLike,
  _state: ItemPaneState | undefined,
  signal?: AbortSignal
): void {
  addAbortableListener(
    card,
    'contextmenu',
    (e: Event) => {
      if (e.target && (e.target as HTMLElement).tagName === 'BUTTON') return;
    },
    undefined,
    signal
  );
}
