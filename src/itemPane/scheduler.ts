/**
 * Zotero TaskFlow - ItemPane Task Scheduling & Execution Module
 * Coordinates quick additions, task mutations, subtask cascades, deletion undo timers, and list DOM.
 */

import { createEl } from './domView';
import { renderTaskControls, attachTaskCardContextMenu } from './contextMenu';
import { makeTaskCardDraggable } from './dragDrop';

declare let Zotero: any;

export async function handleTaskToggle(
  host: any,
  target: any,
  task: any,
  checkbox: HTMLInputElement,
  state: any
): Promise<void> {
  try {
    await host.updateTaskState(task.id, (current: any) => ({
      completed: checkbox.checked,
      completedAt: checkbox.checked ? new Date().toISOString() : null,
      status: checkbox.checked ? 'done' : 'todo',
      subtasks: (current.subtasks || []).map((sub: any) => ({
        ...sub,
        completed: checkbox.checked ? true : sub.completed
      }))
    }));
  } catch (error) {
    checkbox.checked = task.completed;
    host.showNotice('保存失败', String(error));
    return;
  }
  await host.tagItemOnTaskEvent(target.key, 'complete_check', target.libraryID);
  if (host.getPref('autoSyncChildNote', true)) {
    await host.syncTasksToChildNote(target);
  }
  state?.refresh?.();
}

export async function handleSubtaskToggle(
  host: any,
  target: any,
  task: any,
  sub: any,
  subCheck: HTMLInputElement,
  state: any
): Promise<void> {
  try {
    await host.updateTaskState(task.id, (current: any) => {
      const subtasks = (current.subtasks || []).map((st: any) =>
        st.id === sub.id ? { ...st, completed: subCheck.checked } : st
      );
      const completed = subtasks.every((st: any) => st.completed);
      return {
        subtasks,
        completed,
        completedAt: completed ? current.completedAt || new Date().toISOString() : null,
        status: completed ? 'done' : 'todo'
      };
    });
  } catch (error) {
    subCheck.checked = sub.completed;
    host.showNotice('保存失败', String(error));
    return;
  }
  await host.tagItemOnTaskEvent(target.key, 'complete_check', target.libraryID);
  if (host.getPref('autoSyncChildNote', true) && host.getPref('childNoteAutoUpdateOnSubtask', true)) {
    await host.syncTasksToChildNote(target);
  }
  state?.refresh?.();
}

export async function handleTaskDelete(
  host: any,
  target: any,
  task: any,
  delBtn: HTMLButtonElement,
  state: any
): Promise<void> {
  if (delBtn.disabled) return;
  delBtn.disabled = true;
  try {
    await host.saveData({ taskChanges: { deleted: [task.id] } });
    host._paneDeleted ||= [];
    host._paneDeleted.push(host.cloneData(task));
    clearTimeout(host._paneUndoTimer);
    host._paneUndoTimer = setTimeout(() => {
      host._paneDeleted = [];
      host.notifyDataChanged();
    }, 8000);
  } catch (error) {
    delBtn.disabled = false;
    host.showNotice('删除失败', String(error));
    return;
  }
  await host.tagItemOnTaskEvent(target.key, 'complete_check', target.libraryID);
  if (host.getPref('autoSyncChildNote', true)) {
    await host.syncTasksToChildNote(target);
  }
  state?.refresh?.();
}

export async function handleUndoDelete(host: any, target: any, undoBtn: HTMLButtonElement, state: any): Promise<void> {
  if (undoBtn.disabled) return;
  undoBtn.disabled = true;
  try {
    const restored = host._paneDeleted;
    await host.saveData({ taskChanges: { added: restored } });
    host._paneDeleted = [];
    clearTimeout(host._paneUndoTimer);
    for (const task of restored) {
      await host.tagItemOnTaskEvent(task.zoteroItemKey, 'complete_check', task.zoteroLibraryID);
    }
    if (host.getPref('autoSyncChildNote', true)) {
      await host.syncTasksToChildNote(target);
    }
    state?.refresh?.();
  } catch (error) {
    undoBtn.disabled = false;
    host.showNotice('恢复失败', String(error));
  }
}

export function renderTaskList(
  doc: Document,
  tasks: any[],
  target: any,
  host: any,
  state: any
): any {
  const taskList = createEl(doc, 'div', 'td-task-list');
  const showSubtasks = host.getPref('itemPaneShowSubtasks', true);

  for (const t of tasks) {
    const taskCard = createEl(doc, 'div', `td-task-card ${t.completed ? 'is-completed' : ''}`);
    taskCard.dataset.taskId = t.id;
    makeTaskCardDraggable(taskCard, t, host, state);
    attachTaskCardContextMenu(taskCard, t, host, state);

    const row = createEl(doc, 'div', 'td-task-row');

    const prio = t.priority || 'medium';
    const prioDot = createEl(doc, 'span', `td-prio-dot td-prio-${prio}`);
    const prioLabel = prio === 'high' ? '高' : prio === 'low' ? '低' : '中';
    prioDot.title = `优先级: ${prioLabel}`;
    row.appendChild(prioDot);

    const checkbox = createEl(doc, 'input', 'td-checkbox');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', t.title);
    checkbox.checked = Boolean(t.completed);
    checkbox.title = t.completed ? '标记为未完成' : '标记为已完成';
    checkbox.addEventListener('change', (e: Event) => {
      e.stopPropagation();
      handleTaskToggle(host, target, t, checkbox, state);
    });
    row.appendChild(checkbox);

    const titleSpan = createEl(doc, 'button', `td-task-title ${t.completed ? 'is-done' : ''}`, t.title);
    titleSpan.type = 'button';
    titleSpan.title = `${t.title} (点击在看板中查看详情)`;
    titleSpan.addEventListener('click', () => {
      host.openTaskFlow({ mode: 'view_task', taskId: t.id }, Zotero.getMainWindow?.());
    });
    row.appendChild(titleSpan);

    const delBtn = createEl(doc, 'button', 'td-task-delete', '移除');
    delBtn.type = 'button';
    delBtn.setAttribute('aria-label', `从 TaskFlow 移除任务并保留 Zotero 文献：${t.title}`);
    delBtn.title = '仅移除此 TaskFlow 任务，不删除 Zotero 文献';
    delBtn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      handleTaskDelete(host, target, t, delBtn, state);
    });
    row.appendChild(delBtn);

    taskCard.appendChild(row);

    const controls = renderTaskControls(doc, t, target, host, state);

    let subList: any = null;
    if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
      const doneSubs = t.subtasks.filter((s: any) => s.completed).length;
      const subToggle = createEl(doc, 'button', 'td-subtask-toggle', `子任务 ${doneSubs}/${t.subtasks.length}`);
      subToggle.type = 'button';
      subToggle.title = '展开/收起子任务清单';
      const expanded = state?.expandedTasks.get(t.id) ?? showSubtasks;
      subToggle.setAttribute('aria-expanded', String(expanded));
      controls.appendChild(subToggle);

      subList = createEl(doc, 'div', 'td-subtask-list');
      if (!expanded) subList.style.display = 'none';

      subToggle.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const isHidden = subList.style.display === 'none';
        subList.style.display = isHidden ? 'flex' : 'none';
        subToggle.setAttribute('aria-expanded', String(isHidden));
        state?.expandedTasks.set(t.id, isHidden);
      });

      for (const sub of t.subtasks) {
        const subRow = createEl(doc, 'div', 'td-subtask-item');
        const subCheck = createEl(doc, 'input', 'td-checkbox');
        subCheck.type = 'checkbox';
        subCheck.setAttribute('aria-label', sub.title);
        subCheck.checked = Boolean(sub.completed);
        subCheck.addEventListener('change', (e: Event) => {
          e.stopPropagation();
          handleSubtaskToggle(host, target, t, sub, subCheck, state);
        });

        const subSpan = createEl(doc, 'span', `td-subtask-title ${sub.completed ? 'is-done' : ''}`, sub.title);
        subRow.appendChild(subCheck);
        subRow.appendChild(subSpan);
        subList.appendChild(subRow);
      }
    }

    taskCard.appendChild(controls);
    if (subList) taskCard.appendChild(subList);
    taskList.appendChild(taskCard);
  }
  return taskList;
}

export function renderFallback(
  doc: Document,
  target: any,
  state: any,
  host: any,
  fallbackVersion: number
): any {
  const fallback = createEl(doc, 'div', 'td-pane-wrap td-pane-fallback');
  const addButton = createEl(doc, 'button', 'td-add-reading', '＋ 添加到论文研读');
  addButton.type = 'button';
  addButton.disabled = !target || Boolean(state?.saving);
  addButton.setAttribute('aria-label', '添加到论文研读');
  addButton.title = target ? '创建关联当前文献的研读待办，默认一周后截止' : '请先在 Zotero 文献库中选中一篇文献';
  addButton.addEventListener('click', async () => {
    if (!target || addButton.disabled) return;
    addButton.disabled = true;
    try {
      const result = await host.addLiteratureReadingTask(target);
      host.showNotice(
        result.created ? '已加入论文研读' : '该文献已有关联待办',
        `截止日期：${result.task?.dueDate || '未设置'}`
      );
      await state?.refresh?.();
    } catch (error) {
      addButton.disabled = false;
      host.showNotice('保存失败', String(error));
    }
  });
  fallback.appendChild(addButton);

  const fallbackTaskList = createEl(doc, 'div', 'td-fallback-task-list');
  fallback.appendChild(fallbackTaskList);

  if (target) {
    const renderFallbackTasks = (tasks: any[]) => {
      fallbackTaskList.replaceChildren();
      if (tasks.length) {
        for (const task of tasks) {
          const row = createEl(doc, 'div', 'td-task-card td-task-card-fallback');
          const taskRow = createEl(doc, 'div', 'td-task-row');
          const title = createEl(doc, 'span', 'td-task-title-fallback', task.title || '未命名待办');
          title.style.cssText =
            'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;';
          const locate = createEl(doc, 'button', 'td-task-locate', '↗ Zotero');
          locate.type = 'button';
          locate.title = '在 Zotero 文献库中定位这篇文献';
          locate.setAttribute('aria-label', `跳转到文献：${task.zoteroItemTitle || task.title || target.key}`);
          locate.addEventListener('click', (event: any) => {
            event.preventDefault();
            event.stopPropagation();
            host
              .locateLiteratureItem(task.zoteroUri || task.zoteroItemKey, task.zoteroLibraryID, Zotero.getMainWindow?.())
              .catch((error: any) => host.showNotice('无法跳转文献', String(error)));
          });
          taskRow.append(title, locate);
          row.appendChild(taskRow);
          fallbackTaskList.appendChild(row);
        }
      } else {
        fallbackTaskList.appendChild(createEl(doc, 'div', 'td-add-hint', '当前文献还没有关联的研读待办。'));
      }
    };

    const matchesTarget = (task: any) =>
      task.zoteroItemKey === target.key &&
      (task.zoteroLibraryID || Zotero.Libraries.userLibraryID) === target.libraryID;
    renderFallbackTasks((host._cachedData?.tasks || []).filter(matchesTarget));

    if (!host._cachedData) {
      host
        .loadData()
        .then((data: any) => {
          if (state && state.renderVersion !== fallbackVersion) return;
          if (doc.querySelector('.td-pane-fallback') !== fallback) return;
          renderFallbackTasks((data.tasks || []).filter(matchesTarget));
        })
        .catch((error: any) => {
          if (state && state.renderVersion !== fallbackVersion) return;
          if (doc.querySelector('.td-pane-fallback') === fallback) {
            fallbackTaskList.replaceChildren(
              createEl(doc, 'div', 'td-add-hint', '待办读取失败；添加按钮仍可使用，请重新选择条目重试。')
            );
          }
          Zotero.logError?.('[TaskFlow] ItemPane fallback data load failed: ' + error);
        });
    }
  } else {
    fallbackTaskList.appendChild(
      createEl(doc, 'div', 'td-add-hint', '请在文献库中选中一篇文献以查看关联待办和跳转按钮。')
    );
  }

  return fallback;
}
