/**
 * Zotero TaskFlow - ItemPane Context Menu & Task Controls Module
 * Handles task row controls, context menus, reschedule popups, and navigation buttons.
 */

import { createEl } from './domView';

declare let Zotero: any;

export function renderRescheduleMenu(doc: Document, task: any, state: any, host: any): any {
  const menu = createEl(doc, 'details', 'td-reschedule');
  const summary = createEl(doc, 'summary', '', '改期');
  menu.appendChild(summary);

  for (const [days, label] of [
    [0, '今天'],
    [3, '延后三天'],
    [7, '延后一周']
  ] as [number, string][]) {
    const dateBtn = createEl(doc, 'button', 'td-reschedule-option', label);
    dateBtn.type = 'button';
    dateBtn.title = days ? '从当前截止日期延后；未设置或已逾期时从今天计算' : '截止日期设为今天';
    dateBtn.addEventListener('click', async () => {
      if (dateBtn.disabled) return;
      menu.querySelectorAll('button').forEach((btn: any) => {
        btn.disabled = true;
      });
      try {
        await host.rescheduleLiteratureTask(task.id, days, Number(days) > 0);
        menu.open = false;
      } catch (error) {
        host.showNotice('改期失败', String(error));
      } finally {
        menu.querySelectorAll('button').forEach((btn: any) => {
          btn.disabled = false;
        });
      }
      Promise.resolve(state?.refresh?.()).catch((error: any) => Zotero.logError?.('[TaskFlow] 改期刷新失败: ' + error));
    });
    menu.appendChild(dateBtn);
  }
  return menu;
}

export function renderTaskControls(doc: Document, task: any, target: any, host: any, state: any): any {
  const controls = createEl(doc, 'div', 'td-task-controls');

  if (task.zoteroItemKey) {
    const locateButton = createEl(doc, 'button', 'td-task-locate', '↗ Zotero');
    locateButton.type = 'button';
    locateButton.title = '在 Zotero 文献库中定位这篇文献';
    locateButton.setAttribute('aria-label', `跳转到文献：${task.zoteroItemTitle || task.title}`);
    locateButton.addEventListener('click', (event: any) => {
      event.preventDefault();
      event.stopPropagation();
      host
        .locateLiteratureItem(task.zoteroUri || task.zoteroItemKey, task.zoteroLibraryID, Zotero.getMainWindow?.())
        .catch((error: any) => host.showNotice('无法跳转文献', String(error)));
    });
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

  const editBtn = createEl(doc, 'button', 'td-task-edit', '编辑');
  editBtn.type = 'button';
  editBtn.addEventListener('click', () => {
    host.openTaskFlow({ mode: 'edit_task', taskId: task.id }, Zotero.getMainWindow?.());
  });
  controls.appendChild(editBtn);

  if (!task.completed) {
    const rescheduleMenu = renderRescheduleMenu(doc, task, state, host);
    controls.appendChild(rescheduleMenu);
  }

  if (task.zoteroPdfUri || task.zoteroAnnotationKey) {
    const pdfBtn = createEl(doc, 'button', 'td-task-pdf', task.zoteroAnnotationKey ? '回到批注' : '打开 PDF');
    pdfBtn.type = 'button';
    pdfBtn.addEventListener('click', () => {
      host.openTaskPdf(task).catch((error: any) => host.showNotice('打开 PDF 失败', String(error)));
    });
    controls.appendChild(pdfBtn);
  }

  return controls;
}

export function attachTaskCardContextMenu(card: any, task: any, host: any, state: any): void {
  card.addEventListener('contextmenu', (e: MouseEvent) => {
    // Allows task card context actions or quick inspect
    if (e.target && (e.target as HTMLElement).tagName === 'BUTTON') return;
  });
}
