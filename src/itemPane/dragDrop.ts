/**
 * Zotero TaskFlow - ItemPane Drag & Drop Interaction Module
 * Handles Zotero item drops onto the pane and task card reorder dragging.
 */

declare let Zotero: any;

let draggingTaskId: string | null = null;

function getTransferTypes(dt: DataTransfer | null): string[] {
  try {
    return Array.from(dt?.types || []);
  } catch {
    return [];
  }
}

export function parseDroppedItemIds(dt: DataTransfer | null): number[] {
  if (!dt) return [];
  const taskDrag = dt.getData?.('text/x-taskflow-id');
  if (taskDrag) return [];
  const raw = (dt.getData?.('zotero/item') || dt.getData?.('text/x-zotero-item') || '').trim();
  const fallback = !raw ? (dt.getData?.('text/plain') || '').trim() : '';
  const payload = raw || (/^\d+(?:,\d+)*$/.test(fallback) ? fallback : '');
  if (!/^\d+(?:,\d+)*$/.test(payload)) return [];
  return payload
    .split(',')
    .map((v) => Number(v))
    .filter((id) => Number.isSafeInteger(id) && id > 0);
}

function acceptsLibraryDrop(e: DragEvent, target: any, host: any): boolean {
  if (!target || draggingTaskId) return false;
  if (host?.getPref?.('dragDropFromLibrary', true) === false) return false;
  const types = getTransferTypes(e.dataTransfer);
  return types.includes('zotero/item') || types.includes('text/x-zotero-item');
}

async function reorderTasksInHost(
  host: any,
  sourceTaskId: string,
  targetTaskId: string,
  insertAfter: boolean,
  state: any
): Promise<boolean> {
  if (!host?.loadData || !host?.saveData || !sourceTaskId || !targetTaskId || sourceTaskId === targetTaskId) {
    return false;
  }
  const data = await host.loadData();
  const tasks = Array.isArray(data?.tasks)
    ? [...data.tasks].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
    : [];
  const sourceIdx = tasks.findIndex((t: any) => t.id === sourceTaskId);
  if (sourceIdx === -1) return false;
  if (!tasks.some((t: any) => t.id === targetTaskId)) return false;

  const [moved] = tasks.splice(sourceIdx, 1);
  const targetIdx = tasks.findIndex((t: any) => t.id === targetTaskId);
  if (targetIdx === -1) return false;
  tasks.splice(insertAfter ? targetIdx + 1 : targetIdx, 0, moved);

  const updated = tasks
    .map((task: any, idx: number) => ({ task, order: idx }))
    .filter(({ task, order }) => task.order !== order)
    .map(({ task, order }) => ({ id: task.id, changes: { order } }));

  if (updated.length > 0) {
    await host.saveData({ taskChanges: { updated } });
  }
  await state?.refresh?.();
  return updated.length > 0;
}

export function setupPaneDragAndDrop(wrapper: HTMLElement, target: any, host: any, state: any): void {
  wrapper.addEventListener('dragover', (e: DragEvent) => {
    if (!acceptsLibraryDrop(e, target, host)) return;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
      e.preventDefault();
    }
    wrapper.classList.add('td-drag-target-active');
  });

  wrapper.addEventListener('dragleave', (e: DragEvent) => {
    if (!wrapper.contains(e.relatedTarget as Node)) {
      wrapper.classList.remove('td-drag-target-active');
    }
  });

  wrapper.addEventListener('drop', async (e: DragEvent) => {
    wrapper.classList.remove('td-drag-target-active');
    if (!target || draggingTaskId) return;
    if (host?.getPref?.('dragDropFromLibrary', true) === false) return;

    const itemIDs = parseDroppedItemIds(e.dataTransfer);
    if (!itemIDs.length) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      if (typeof host?.addDroppedLiteratureTasks === 'function') {
        const result = await host.addDroppedLiteratureTasks(itemIDs);
        host.showNotice?.(
          '创建文献研读待办',
          `新增 ${result.added} 篇，跳过已有 ${result.skipped} 篇` +
            (result.ignored ? `，忽略 ${result.ignored} 个无效项` : '')
        );
      }
      await state?.refresh?.();
    } catch (err: any) {
      Zotero?.logError?.('[TaskFlow] ItemPane drop handling error: ' + err);
      host?.showNotice?.('创建文献研读待办失败', String(err?.message || err));
    }
  });
}

export function makeTaskCardDraggable(card: HTMLElement, task: any, host: any, state?: any): void {
  card.setAttribute('draggable', 'true');
  card.addEventListener('dragstart', (e: DragEvent) => {
    draggingTaskId = task.id;
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/x-taskflow-id', task.id);
      e.dataTransfer.setData('text/plain', task.title || '');
      e.dataTransfer.effectAllowed = 'move';
    }
    card.classList.add('is-dragging');
  });

  card.addEventListener('dragover', (e: DragEvent) => {
    const types = getTransferTypes(e.dataTransfer);
    const sourceId = e.dataTransfer?.getData?.('text/x-taskflow-id') || draggingTaskId;
    if (!sourceId && !types.includes('text/x-taskflow-id')) return;
    if (sourceId === task.id) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    card.classList.add('td-card-drag-over');
  });

  card.addEventListener('dragleave', (e: DragEvent) => {
    if (!card.contains(e.relatedTarget as Node)) {
      card.classList.remove('td-card-drag-over');
    }
  });

  card.addEventListener('drop', async (e: DragEvent) => {
    card.classList.remove('td-card-drag-over');
    const sourceId = e.dataTransfer?.getData?.('text/x-taskflow-id') || draggingTaskId;
    if (!sourceId || sourceId === task.id) return;
    e.preventDefault();
    e.stopPropagation();
    draggingTaskId = null;
    try {
      const rect = card.getBoundingClientRect?.();
      const insertAfter = Boolean(rect && rect.height > 0 && e.clientY > rect.top + rect.height / 2);
      await reorderTasksInHost(host, sourceId, task.id, insertAfter, state);
    } catch (err: any) {
      Zotero?.logError?.('[TaskFlow] ItemPane card reorder error: ' + err);
      host?.showNotice?.('调整任务顺序失败', String(err?.message || err));
    }
  });

  card.addEventListener('dragend', () => {
    draggingTaskId = null;
    card.classList.remove('is-dragging');
    card.ownerDocument?.querySelectorAll('.td-card-drag-over').forEach((el) => {
      el.classList.remove('td-card-drag-over');
    });
  });
}
