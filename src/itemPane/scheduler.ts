/**
 * Zotero TaskFlow - ItemPane Task Scheduling & Execution Module
 * Coordinates quick additions, task mutations, subtask cascades, deletion undo timers, and list DOM.
 */

import { createEl } from './domView';
import { addAbortableListener, setAbortableTimeout } from '../lifecycle';
import { renderTaskControls, attachTaskCardContextMenu } from './contextMenu';
import { makeTaskCardDraggable } from './dragDrop';
import type { ItemPaneState, SubtaskRecord, TaskFlowData, TaskFlowHostLike, TaskRecord, ZoteroItemLike } from '../types/models';

type SchedulerHost = TaskFlowHostLike & { getHostSignal?: () => AbortSignal | undefined };

function scheduleUndoClear(host: SchedulerHost): void {
  if (host._paneUndoTimer) {
    clearTimeout(host._paneUndoTimer);
    host._paneUndoTimer = null;
  }
  host._paneUndoTimer = setAbortableTimeout(
    () => {
      host._paneUndoTimer = null;
      host._paneDeleted = [];
      host.notifyDataChanged();
    },
    8000,
    host.getHostSignal?.()
  );
}

export async function handleTaskToggle(
  host: SchedulerHost,
  target: ZoteroItemLike,
  task: TaskRecord,
  checkbox: HTMLInputElement,
  state: ItemPaneState | undefined
): Promise<void> {
  try {
    await host.updateTaskState(task.id, (current: TaskRecord) => ({
      completed: checkbox.checked,
      completedAt: checkbox.checked ? new Date().toISOString() : null,
      status: checkbox.checked ? 'done' : 'todo',
      subtasks: (current.subtasks || []).map((sub: SubtaskRecord) => ({
        ...sub,
        completed: checkbox.checked ? true : sub.completed
      }))
    }));
  } catch (error) {
    checkbox.checked = task.completed;
    host.showNotice('保存失败', String(error));
    return;
  }
  if (target.key) await host.tagItemOnTaskEvent(target.key, 'complete_check', target.libraryID);
  if (host.getPref('autoSyncChildNote', true)) {
    await host.syncTasksToChildNote(target);
  }
  state?.refresh?.();
}

export async function handleSubtaskToggle(
  host: SchedulerHost,
  target: ZoteroItemLike,
  task: TaskRecord,
  sub: SubtaskRecord,
  subCheck: HTMLInputElement,
  state: ItemPaneState | undefined
): Promise<void> {
  try {
    await host.updateTaskState(task.id, (current: TaskRecord) => {
      const subtasks = (current.subtasks || []).map((st: SubtaskRecord) =>
        st.id === sub.id ? { ...st, completed: subCheck.checked } : st
      );
      const completed = subtasks.length > 0 && subtasks.every((st: SubtaskRecord) => st.completed);
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
  if (target.key) await host.tagItemOnTaskEvent(target.key, 'complete_check', target.libraryID);
  if (host.getPref('autoSyncChildNote', true) && host.getPref('childNoteAutoUpdateOnSubtask', true)) {
    await host.syncTasksToChildNote(target);
  }
  state?.refresh?.();
}

export async function handleTaskDelete(
  host: SchedulerHost,
  target: ZoteroItemLike,
  task: TaskRecord,
  delBtn: HTMLButtonElement,
  state: ItemPaneState | undefined
): Promise<void> {
  if (delBtn.disabled) return;
  delBtn.disabled = true;
  try {
    await host.saveData({ taskChanges: { deleted: [task.id] } });
    host._paneDeleted ||= [];
    host._paneDeleted.push(host.cloneData(task));
    scheduleUndoClear(host);
  } catch (error) {
    delBtn.disabled = false;
    host.showNotice('删除失败', String(error));
    return;
  }
  if (target.key) await host.tagItemOnTaskEvent(target.key, 'complete_check', target.libraryID);
  if (host.getPref('autoSyncChildNote', true)) {
    await host.syncTasksToChildNote(target);
  }
  state?.refresh?.();
}

export async function handleUndoDelete(
  host: SchedulerHost,
  target: ZoteroItemLike,
  undoBtn: HTMLButtonElement,
  state: ItemPaneState | undefined
): Promise<void> {
  if (undoBtn.disabled) return;
  const restored = [...(host._paneDeleted || [])];
  if (!restored.length) return;
  undoBtn.disabled = true;
  if (host._paneUndoTimer) {
    clearTimeout(host._paneUndoTimer);
    host._paneUndoTimer = null;
  }
  try {
    await host.saveData({ taskChanges: { added: restored } });
    host._paneDeleted = [];
    for (const task of restored) {
      if (task.zoteroItemKey) {
        await host.tagItemOnTaskEvent(task.zoteroItemKey, 'complete_check', task.zoteroLibraryID);
      }
    }
    if (host.getPref('autoSyncChildNote', true)) {
      await host.syncTasksToChildNote(target);
    }
    state?.refresh?.();
  } catch (error) {
    undoBtn.disabled = false;
    if (host._paneDeleted?.length) scheduleUndoClear(host);
    host.showNotice('恢复失败', String(error));
  }
}

export function renderTaskList(
  doc: Document,
  tasks: TaskRecord[],
  target: ZoteroItemLike,
  host: SchedulerHost,
  state: ItemPaneState | undefined,
  signal?: AbortSignal
): HTMLElement {
  const taskList = createEl(doc, 'div', 'td-task-list');
  const showSubtasks = Boolean(host.getPref('itemPaneShowSubtasks', true));

  for (const t of tasks) {
    const taskCard = createEl(doc, 'div', `td-task-card ${t.completed ? 'is-completed' : ''}`);
    taskCard.dataset.taskId = t.id;
    makeTaskCardDraggable(taskCard, t, host, state, signal);
    attachTaskCardContextMenu(taskCard, t, host, state, signal);

    const row = createEl(doc, 'div', 'td-task-row');

    const prio = t.priority || 'medium';
    const prioDot = createEl(doc, 'span', `td-prio-dot td-prio-${prio}`);
    const prioLabel = prio === 'high' ? '高' : prio === 'low' ? '低' : '中';
    prioDot.title = `优先级: ${prioLabel}`;
    row.appendChild(prioDot);

    const checkbox = createEl(doc, 'input', 'td-checkbox') as HTMLInputElement;
    checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', t.title);
    checkbox.checked = Boolean(t.completed);
    checkbox.title = t.completed ? '标记为未完成' : '标记为已完成';
    addAbortableListener(
      checkbox,
      'change',
      (e: Event) => {
        e.stopPropagation();
        void handleTaskToggle(host, target, t, checkbox, state);
      },
      undefined,
      signal
    );
    row.appendChild(checkbox);

    const titleSpan = createEl(doc, 'button', `td-task-title ${t.completed ? 'is-done' : ''}`, t.title) as HTMLButtonElement;
    titleSpan.type = 'button';
    titleSpan.title = `${t.title} (点击在看板中查看详情)`;
    addAbortableListener(
      titleSpan,
      'click',
      () => {
        host.openTaskFlow({ mode: 'view_task', taskId: t.id }, Zotero.getMainWindow?.() || null);
      },
      undefined,
      signal
    );
    row.appendChild(titleSpan);

    const delBtn = createEl(doc, 'button', 'td-task-delete', '移除') as HTMLButtonElement;
    delBtn.type = 'button';
    delBtn.setAttribute('aria-label', `从 TaskFlow 移除任务并保留 Zotero 文献：${t.title}`);
    delBtn.title = '仅移除此 TaskFlow 任务，不删除 Zotero 文献';
    addAbortableListener(
      delBtn,
      'click',
      (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        void handleTaskDelete(host, target, t, delBtn, state);
      },
      undefined,
      signal
    );
    row.appendChild(delBtn);

    taskCard.appendChild(row);

    const controls = renderTaskControls(doc, t, target, host, state, signal);

    let subList: HTMLElement | null = null;
    if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
      const doneSubs = t.subtasks.filter((s: SubtaskRecord) => s.completed).length;
      const subToggle = createEl(doc, 'button', 'td-subtask-toggle', `子任务 ${doneSubs}/${t.subtasks.length}`) as HTMLButtonElement;
      subToggle.type = 'button';
      subToggle.title = '展开/收起子任务清单';
      const expanded = state?.expandedTasks.get(t.id) ?? showSubtasks;
      subToggle.setAttribute('aria-expanded', String(expanded));
      controls.appendChild(subToggle);

      const currentSubList = createEl(doc, 'div', 'td-subtask-list');
      if (!expanded) currentSubList.style.display = 'none';
      subList = currentSubList;

      addAbortableListener(
        subToggle,
        'click',
        (e: Event) => {
          e.stopPropagation();
          const isHidden = currentSubList.style.display === 'none';
          currentSubList.style.display = isHidden ? 'flex' : 'none';
          subToggle.setAttribute('aria-expanded', String(isHidden));
          state?.expandedTasks.set(t.id, isHidden);
        },
        undefined,
        signal
      );

      for (const sub of t.subtasks) {
        const subRow = createEl(doc, 'div', 'td-subtask-item');
        const subCheck = createEl(doc, 'input', 'td-checkbox') as HTMLInputElement;
        subCheck.type = 'checkbox';
        subCheck.setAttribute('aria-label', sub.title);
        subCheck.checked = Boolean(sub.completed);
        addAbortableListener(
          subCheck,
          'change',
          (e: Event) => {
            e.stopPropagation();
            void handleSubtaskToggle(host, target, t, sub, subCheck, state);
          },
          undefined,
          signal
        );

        const subSpan = createEl(doc, 'span', `td-subtask-title ${sub.completed ? 'is-done' : ''}`, sub.title);
        subRow.appendChild(subCheck);
        subRow.appendChild(subSpan);
        currentSubList.appendChild(subRow);
      }
    }

    taskCard.appendChild(controls);
    if (subList) taskCard.appendChild(subList);
    taskList.appendChild(taskCard);
  }
  return taskList;
}
