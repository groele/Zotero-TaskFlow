/**
 * Zotero TaskFlow - Literature Reading Plans & Reader Integration
 */

import { LiteratureWorkflow } from '../../literatureWorkflow';
import { getLiteratureItem, serializeLiteratureItem } from '../../utils';
import { addLiteratureReadingTask } from './literatureMapping';
import type { TaskFlowHostLike, TaskRecord, ZoteroCollectionLike, ZoteroItemLike } from '../../types/models';

export async function createCollectionReadingPlan(
  host: TaskFlowHostLike,
  collection: ZoteroCollectionLike | null | undefined,
  window: Window | null = null
): Promise<void> {
  if (!collection) return;
  try {
    const items = collection.getChildItems ? collection.getChildItems(false) : [];
    const seenIds = new Set<number | string>();
    const regularItems = items
      .map((it: ZoteroItemLike) => getLiteratureItem(it))
      .filter((item): item is ZoteroItemLike => Boolean(item && !item.deleted && !seenIds.has(item.id) && seenIds.add(item.id)));
    if (regularItems.length === 0) {
      host.showNotice('未找到文献', `分类【${collection.name}】中暂无有效文献`);
      return;
    }

    const data = await host.loadData();
    const userLib = Zotero.Libraries?.userLibraryID || 1;
    const existingKeys = new Set(
      (data.tasks || [])
        .filter((t: TaskRecord) => t.zoteroItemKey)
        .map((t: TaskRecord) => (t.zoteroLibraryID || userLib) + ':' + t.zoteroItemKey)
    );
    let addedCount = 0;
    const addedTasks: TaskRecord[] = [];
    let nextOrder = (data.tasks || []).reduce((max: number, t: TaskRecord) => Math.max(max, Number(t.order) || 0), -1) + 1;

    for (const item of regularItems) {
      if (existingKeys.has(item.libraryID + ':' + item.key)) continue;
      const meta = serializeLiteratureItem(item);
      if (!meta) continue;
      const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      const profileId = host.getPref('readingProfile', 'general');
      const mainTask: TaskRecord = {
        id: taskId,
        title: `📖 研读：${meta.title}`,
        description: `分类专题：${collection.name}\n作者：${meta.authors} (${meta.year})\n出版物：${meta.publication}\n文献链接：${meta.zoteroUri}`,
        dueDate: LiteratureWorkflow.dateAfter(LiteratureWorkflow.days(host.getPref('defaultDueDays', 7))),
        dueTime: null,
        priority: host.getPref('defaultPriority', 'medium'),
        category: '论文研读',
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        tags: [collection.name, '专题研读', '待研读'],
        reminder: { enabled: false, before: 15, notified: false },
        order: nextOrder++,
        zoteroItemKey: meta.key,
        zoteroItemID: meta.id,
        zoteroLinkStatus: 'active',
        readingProfile: profileId,
        literatureWorkflowId: 'reading',
        zoteroItemTitle: meta.title,
        zoteroAuthors: meta.authors,
        zoteroLibraryID: meta.libraryID,
        zoteroPublication: meta.publication,
        zoteroYear: meta.year,
        zoteroUri: meta.zoteroUri,
        zoteroPdfUri: meta.pdfUri,
        academicType: 'literature_reading',
        subtasks: Boolean(host.getPref('academicPresets', true))
          ? LiteratureWorkflow.steps(profileId, () => 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10))
          : []
      };
      addedTasks.push(mainTask);
      existingKeys.add(item.libraryID + ':' + item.key);
      addedCount++;
    }

    if (addedCount > 0) {
      await host.saveData({ taskChanges: { added: addedTasks }, deduplicateLiterature: 'item', syncLinkedItems: true });
      host.showNotice('专题研读规划已建立', `已为【${collection.name}】下的 ${addedCount} 篇文献批量生成研读清单！`);
    } else {
      host.showNotice('研读规划已存在', `【${collection.name}】下的文献均已存在对应研读任务。`);
    }

    host.openTaskFlow({ mode: 'create_from_collection', collectionName: collection.name }, window);
  } catch (err) {
    Zotero.logError?.('[TaskFlow] createCollectionReadingPlan error: ' + err);
  }
}

interface ReaderLike {
  itemID?: number | string;
  getSelectedText?: () => Promise<string>;
  _iframeWindow?: Window & { PDFViewerApplication?: { page?: number } };
  _internalReader?: { _state?: { primaryViewState?: { pageIndex?: number } } };
  state?: { pageIndex?: number };
}

interface SelectionLike {
  text?: string;
  position?: { pageIndex?: number };
}

export async function createTaskFromReader(
  host: TaskFlowHostLike,
  window: Window | null = null,
  sourceReader: unknown = null,
  selection: unknown = null
): Promise<void> {
  const win = window || Zotero.getMainWindow?.() || null;
  const tabs = win?.Zotero_Tabs || (typeof Zotero_Tabs !== 'undefined' ? Zotero_Tabs : null);
  const sel = (selection as SelectionLike | null) || null;
  if (!sourceReader && (!tabs || !tabs.selectedTab || tabs.selectedTab.type !== 'reader')) {
    const selected = host.getSelectedRegularItems(win);
    if (selected.length > 0) {
      host.openTaskFlow({ mode: 'create_from_item', item: serializeLiteratureItem(selected[0]) }, win);
      return;
    }
    host.showNotice('提示', '请在 PDF 阅读器中或文献列表中使用此快捷键');
    return;
  }

  try {
    const reader = (sourceReader as ReaderLike | null) ||
      (tabs?.selectedTab ? Zotero.Reader?.getByTabID?.(tabs.selectedTab.id) as ReaderLike | null : null);
    const itemID = reader?.itemID || tabs?.selectedTab?.data?.itemID;
    if (!itemID) return;

    const attachmentItem = Zotero.Items?.get?.(itemID) || null;
    const regularItem = getLiteratureItem(attachmentItem);
    if (!regularItem || regularItem.deleted) return;

    const meta = serializeLiteratureItem(regularItem);
    if (!meta) return;

    let selectedText = sel?.text || '';
    try {
      if (!selectedText && reader && typeof reader.getSelectedText === 'function') {
        selectedText = await reader.getSelectedText();
      }
    } catch (_) {}

    if (!selectedText && reader?._iframeWindow) {
      try {
        selectedText = reader._iframeWindow.getSelection?.()?.toString() || '';
      } catch (_) {}
    }
    selectedText = String(selectedText || '').trim();

    let pageIndex = 0;
    try {
      if (typeof sel?.position?.pageIndex === 'number' && Number.isInteger(sel.position.pageIndex)) {
        pageIndex = sel.position.pageIndex;
      } else if (
        typeof reader?._internalReader?._state?.primaryViewState?.pageIndex === 'number' &&
        Number.isInteger(reader._internalReader._state.primaryViewState.pageIndex)
      ) {
        pageIndex = reader._internalReader._state.primaryViewState.pageIndex;
      } else if (reader?.state && typeof reader.state.pageIndex === 'number') {
        pageIndex = reader.state.pageIndex;
      } else if (reader?._iframeWindow?.PDFViewerApplication?.page) {
        pageIndex = reader._iframeWindow.PDFViewerApplication.page - 1;
      }
    } catch (_) {}
    const pageNum = Math.max(1, pageIndex + 1);

    const pdfKey = attachmentItem?.key || meta.key;
    const groupID = Zotero.Libraries?.get?.(regularItem.libraryID)?.groupID;
    const pageLink = groupID
      ? `zotero://open-pdf/groups/${groupID}/items/${pdfKey}?page=${pageNum}`
      : `zotero://open-pdf/library/items/${pdfKey}?page=${pageNum}`;

    const taskTitle = selectedText
      ? selectedText.length > 50
        ? selectedText.slice(0, 50) + '...'
        : selectedText
      : `文献研读思考 (P.${pageNum})`;

    let description = `来自 PDF 第 ${pageNum} 页的摘录与待办：\n`;
    if (selectedText) {
      description += `“${selectedText}”\n\n`;
    }
    description += `文献：《${meta.title}》\nPDF 锚点直达：${pageLink}`;

    const data = await host.loadData();
    const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);

    const newTask: TaskRecord = {
      id: taskId,
      title: `📌 [P.${pageNum}] ${taskTitle}`,
      description,
      dueDate: LiteratureWorkflow.dateAfter(LiteratureWorkflow.days(host.getPref('defaultDueDays', 7))),
      dueTime: null,
      priority: host.getPref('defaultPriority', 'medium'),
      category: '论文研读',
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      subtasks: [],
      tags: [...(meta.tags || []), `P.${pageNum}`, 'PDF摘录'],
      reminder: { enabled: false, before: 15, notified: false },
      order: (data.tasks || []).reduce((max: number, t: TaskRecord) => Math.max(max, Number(t.order) || 0), -1) + 1,
      zoteroItemKey: meta.key,
      zoteroItemTitle: meta.title,
      zoteroAuthors: meta.authors,
      zoteroLibraryID: meta.libraryID,
      zoteroPublication: meta.publication,
      zoteroYear: meta.year,
      zoteroUri: meta.zoteroUri,
      zoteroPdfUri: pageLink,
      zoteroAttachmentKey: attachmentItem?.key || '',
      zoteroItemID: regularItem.id,
      zoteroPage: pageNum,
      zoteroQuote: selectedText,
      zoteroLinkStatus: 'active',
      academicType: 'literature_reading'
    };

    const shortcutAction = host.getPref('readerShortcutAction', 'create_instant');
    if (shortcutAction === 'open_modal') {
      host.openTaskFlow({ mode: 'open_modal_prefill', prefill: newTask }, win);
      return;
    }

    await host.saveData({ taskChanges: { added: [newTask] }, syncLinkedItems: true });
    host.showNotice('已从 PDF 提取待办', `已记录第 ${pageNum} 页任务，并生成一键直达锚点链接！`);
  } catch (err) {
    Zotero.logError?.('[TaskFlow] createTaskFromReader error: ' + err);
    host.showNotice('从阅读器创建待办失败', String(err));
  }
}

export async function createReadingMilestones(
  host: TaskFlowHostLike,
  item: unknown,
  window: Window | null = null,
  profileID: string | null = null
): Promise<{ task: TaskRecord | undefined; created: boolean }> {
  const selectedProfile =
    profileID && Object.hasOwn(LiteratureWorkflow.profiles, profileID)
      ? profileID
      : host.getPref('readingProfile', 'general');
  const result = await addLiteratureReadingTask(host, item, { profileID: selectedProfile });
  host.showNotice(
    result.created ? '精读清单已创建' : '该精读清单已存在',
    `${LiteratureWorkflow.profile(selectedProfile).label} · 截止 ${result.task?.dueDate || '未设置'}`
  );
  if (result.task?.id) {
    host.openTaskFlow({ mode: 'view_task', taskId: result.task.id }, window);
  }
  return result;
}
