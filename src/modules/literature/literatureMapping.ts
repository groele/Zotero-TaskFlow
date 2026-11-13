/**
 * Zotero TaskFlow - Literature Task Mapping & Planning Module
 */

import { LiteratureWorkflow } from '../../literatureWorkflow';
import { getLiteratureItem, serializeLiteratureItem } from '../../utils';
import type { TaskFlowHostLike, TaskRecord, ZoteroItemLike } from '../../types/models';

export interface BuildLiteratureTaskOptions {
  title?: string;
  priority?: string | null;
  academicType?: string;
  profileID?: string | null;
  dueDate?: string | null;
  workflowId?: string | null;
}

export function buildLiteratureTask(
  host: TaskFlowHostLike,
  item: ZoteroItemLike | number | string | null | undefined,
  {
    title = '',
    priority = null,
    academicType = 'literature_reading',
    profileID = null,
    dueDate = null,
    workflowId = null
  }: BuildLiteratureTaskOptions = {}
): TaskRecord {
  const meta = serializeLiteratureItem(item);
  if (!meta) throw new Error('请先选中文献条目，回收站中的文献无法加入待办');
  const customTitle = String(title).trim();
  const taskTitle = customTitle || `研读：${meta.title}`;
  const generateId = () => 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  return {
    id: generateId(),
    title: taskTitle,
    description: `文献研读待办：${meta.title} (${meta.authors} ${meta.year})`,
    dueDate: dueDate || LiteratureWorkflow.dateAfter(LiteratureWorkflow.days(host.getPref('defaultDueDays', 7))),
    dueTime: null,
    priority: priority || host.getPref('defaultPriority', 'medium'),
    category: '论文研读',
    academicType,
    status: 'todo',
    repeat: null,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    subtasks: profileID ? LiteratureWorkflow.steps(profileID, generateId) : [],
    readingProfile: profileID,
    literatureWorkflowId: workflowId || (profileID ? `milestones:${profileID}` : customTitle ? null : 'reading'),
    tags: host.getPref('autoTagFromItem', true) ? meta.tags || [] : [],
    reminder: { enabled: false, before: 15, notified: false },
    zoteroItemKey: meta.key,
    zoteroItemID: meta.id,
    zoteroItemTitle: meta.title,
    zoteroAutoTitle: !customTitle,
    zoteroAuthors: meta.authors,
    zoteroLibraryID: meta.libraryID,
    zoteroPublication: meta.publication,
    zoteroYear: meta.year,
    zoteroUri: meta.zoteroUri,
    zoteroPdfUri: meta.pdfUri,
    zoteroLinkStatus: 'active'
  };
}

type LiteratureHostWithCache = TaskFlowHostLike & {
  _literatureTaskAdds?: Map<string, Promise<{ task: TaskRecord | undefined; created: boolean }>>;
};

export function addLiteratureReadingTask(
  host: LiteratureHostWithCache,
  item: unknown,
  options: BuildLiteratureTaskOptions = {}
): Promise<{ task: TaskRecord | undefined; created: boolean }> {
  let task: TaskRecord;
  try {
    task = buildLiteratureTask(host, item as ZoteroItemLike, options);
  } catch (error) {
    return Promise.reject(error);
  }
  const requestKey = JSON.stringify([task.zoteroLibraryID, task.zoteroItemKey, task.title, task.literatureWorkflowId]);
  host._literatureTaskAdds ||= new Map();
  const inflight = host._literatureTaskAdds.get(requestKey);
  if (inflight) return inflight;

  const run = async (): Promise<{ task: TaskRecord | undefined; created: boolean }> => {
    const data = await host.loadData();
    task.order = (data.tasks || []).reduce((max: number, t: TaskRecord) => Math.max(max, Number(t.order) || 0), -1) + 1;
    const saved = await host.saveData({
      taskChanges: { added: [task] },
      deduplicateLiterature: Boolean(task.literatureWorkflowId),
      syncLinkedItems: true
    });
    const userLib = Zotero.Libraries?.userLibraryID || 1;
    const actual =
      saved.tasks.find((t: TaskRecord) => t.id === task.id) ||
      saved.tasks.find((t: TaskRecord) => LiteratureWorkflow.samePending(t, task, userLib));
    return { task: actual, created: actual?.id === task.id };
  };
  const result = run().finally(() => host._literatureTaskAdds?.delete(requestKey));
  host._literatureTaskAdds.set(requestKey, result);
  return result;
}

export async function addLiteratureTasks(
  host: TaskFlowHostLike,
  selected: unknown[]
): Promise<{ added: number; skipped: number }> {
  if (!Array.isArray(selected) || selected.length === 0) {
    return { added: 0, skipped: 0 };
  }
  const data = await host.loadData();
  const baseOrder = (data.tasks || []).reduce((max: number, task: TaskRecord) => Math.max(max, Number(task.order) || 0), -1) + 1;
  const candidates = selected.map((item: unknown, index: number) => ({
    ...buildLiteratureTask(host, item as ZoteroItemLike),
    order: baseOrder + index
  }));
  const saved = await host.saveData({
    taskChanges: { added: candidates },
    deduplicateLiterature: 'item',
    syncLinkedItems: true
  });
  const ids = new Set(saved.tasks.map((task: TaskRecord) => task.id));
  const added = candidates.filter((task: TaskRecord) => ids.has(task.id)).length;
  const skipped = selected.length - added;
  host.showNotice('批量加入完成', `新增 ${added} 篇，跳过已有待办 ${skipped} 篇；新任务截止 ${candidates[0]?.dueDate || '未设置'}。`);
  return { added, skipped };
}

export async function addSelectedLiteratureTasks(
  host: TaskFlowHostLike,
  window: Window | null = null,
  items: unknown[] | null = null
): Promise<{ added: number; skipped: number }> {
  let selected: ZoteroItemLike[] = [];
  if (Array.isArray(items) && items.length) {
    const seen = new Set<number | string>();
    selected = items
      .map((item: unknown) => getLiteratureItem(item as ZoteroItemLike))
      .filter((item): item is ZoteroItemLike => Boolean(item && !item.deleted && !seen.has(item.id) && seen.add(item.id)));
  } else {
    selected = host.getSelectedRegularItems(window || Zotero.getMainWindow?.() || null).filter((item) => !item.deleted);
  }
  if (!selected.length) {
    host.showNotice('请先选中文献', '可在文献列表中多选后批量加入。');
    return { added: 0, skipped: 0 };
  }
  return addLiteratureTasks(host, selected);
}

export async function addDroppedLiteratureTasks(
  host: TaskFlowHostLike,
  itemIDs: unknown
): Promise<{ added: number; skipped: number; ignored: number }> {
  if (!host.getPref('dragDropFromLibrary', true)) throw new Error('已关闭从文献库拖入待办');
  if (
    !Array.isArray(itemIDs) ||
    !itemIDs.length ||
    itemIDs.length > 1000 ||
    itemIDs.some((id: unknown) => typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0)
  ) {
    throw new Error('无效的 Zotero 拖拽条目');
  }
  const seen = new Set<number | string>();
  const selected = (itemIDs as number[])
    .map((id: number) => Zotero.Items?.get?.(id) || null)
    .filter((item): item is ZoteroItemLike => Boolean(item && !item.deleted))
    .map((item: ZoteroItemLike) => getLiteratureItem(item))
    .filter((item): item is ZoteroItemLike => Boolean(item && !item.deleted && !seen.has(item.id) && seen.add(item.id)));
  if (!selected.length) throw new Error('拖入的文献已删除或不包含可研读的文献条目');
  const result = await addLiteratureTasks(host, selected);
  return { ...result, ignored: itemIDs.length - selected.length };
}

export async function rescheduleLiteratureTask(
  host: TaskFlowHostLike,
  taskID: string,
  days: number,
  fromDeadline: boolean = false
): Promise<TaskRecord | undefined> {
  if (![0, 3, 7].includes(days)) throw new Error('不支持的改期选项');
  const data = await host.saveData({ rescheduleTask: { taskID, days, fromDeadline }, syncLinkedItems: true });
  return data.tasks.find((task: TaskRecord) => task.id === taskID);
}
