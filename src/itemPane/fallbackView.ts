/**
 * Zotero TaskFlow - ItemPane Fallback View
 * Minimal fallback panel rendered when primary ItemPane content fails or item data is pending.
 */

import { addAbortableListener } from '../lifecycle';
import { createEl } from './domView';
import type { ItemPaneState, TaskFlowData, TaskFlowHostLike, TaskRecord, ZoteroItemLike } from '../types/models';

export function renderFallback(
  doc: Document,
  target: ZoteroItemLike | null,
  state: ItemPaneState | undefined,
  host: TaskFlowHostLike,
  fallbackVersion: number,
  signal?: AbortSignal
): HTMLElement {
  const fallback = createEl(doc, 'div', 'td-pane-wrap td-pane-fallback');
  const addButton = createEl(doc, 'button', 'td-add-reading', '＋ 添加到论文研读') as HTMLButtonElement;
  addButton.type = 'button';
  addButton.disabled = !target || Boolean(state?.saving);
  addButton.setAttribute('aria-label', '添加到论文研读');
  addButton.title = target ? '创建关联当前文献的研读待办，默认一周后截止' : '请先在 Zotero 文献库中选中一篇文献';
  addAbortableListener(
    addButton,
    'click',
    async () => {
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
    },
    undefined,
    signal
  );
  fallback.appendChild(addButton);

  const fallbackTaskList = createEl(doc, 'div', 'td-fallback-task-list');
  fallback.appendChild(fallbackTaskList);

  if (target) {
    const renderFallbackTasks = (tasks: TaskRecord[]): void => {
      fallbackTaskList.replaceChildren();
      if (tasks.length) {
        for (const task of tasks) {
          const row = createEl(doc, 'div', 'td-task-card td-task-card-fallback');
          const taskRow = createEl(doc, 'div', 'td-task-row');
          const title = createEl(doc, 'span', 'td-task-title-fallback', task.title || '未命名待办');
          title.style.cssText =
            'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;';
          const locate = createEl(doc, 'button', 'td-task-locate', '↗ Zotero') as HTMLButtonElement;
          locate.type = 'button';
          locate.title = '在 Zotero 文献库中定位这篇文献';
          locate.setAttribute('aria-label', `跳转到文献：${task.zoteroItemTitle || task.title || target.key}`);
          addAbortableListener(
            locate,
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
          taskRow.append(title, locate);
          row.appendChild(taskRow);
          fallbackTaskList.appendChild(row);
        }
      } else {
        fallbackTaskList.appendChild(createEl(doc, 'div', 'td-add-hint', '当前文献还没有关联的研读待办。'));
      }
    };

    const userLib = Zotero.Libraries?.userLibraryID || 1;
    const matchesTarget = (task: TaskRecord): boolean =>
      task.zoteroItemKey === target.key &&
      (task.zoteroLibraryID || userLib) === target.libraryID;
    renderFallbackTasks((host._cachedData?.tasks || []).filter(matchesTarget));

    if (!host._cachedData) {
      host
        .loadData()
        .then((data: TaskFlowData) => {
          if (signal?.aborted || (state && state.renderVersion !== fallbackVersion)) return;
          if (doc.querySelector('.td-pane-fallback') !== fallback) return;
          renderFallbackTasks((data.tasks || []).filter(matchesTarget));
        })
        .catch((error: unknown) => {
          if (signal?.aborted || (state && state.renderVersion !== fallbackVersion)) return;
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
