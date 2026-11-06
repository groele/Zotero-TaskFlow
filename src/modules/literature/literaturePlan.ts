/**
 * Zotero TaskFlow - Literature Reading Plans & Reader Integration
 */

import { LiteratureWorkflow } from '../../literatureWorkflow';
import { getLiteratureItem, serializeLiteratureItem } from '../../utils';
import { addLiteratureReadingTask } from './literatureMapping';

declare let Zotero: any;

export async function createCollectionReadingPlan(host: any, collection: any, window: any = null): Promise<void> {
  if (!collection) return;
  try {
    const items = collection.getChildItems ? collection.getChildItems(false) : [];
    const regularItems = items.map((it: any) => getLiteratureItem(it)).filter(Boolean);
    if (regularItems.length === 0) {
      host.showNotice('未找到文献', `分类【${collection.name}】中暂无有效文献`);
      return;
    }

    const data = await host.loadData();
    const existingKeys = new Set(
      (data.tasks || [])
        .filter((t: any) => t.zoteroItemKey)
        .map((t: any) => (t.zoteroLibraryID || Zotero.Libraries.userLibraryID) + ':' + t.zoteroItemKey)
    );
    let addedCount = 0;
    const addedTasks: any[] = [];

    for (const item of regularItems) {
      if (existingKeys.has(item.libraryID + ':' + item.key)) continue;
      const meta = serializeLiteratureItem(item);
      const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const mainTask = {
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
        order: (data.tasks || []).length,
        zoteroItemKey: meta.key,
        zoteroItemID: meta.id,
        zoteroLinkStatus: 'active',
        readingProfile: host.getPref('readingProfile', 'general'),
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
          ? LiteratureWorkflow.steps(host.getPref('readingProfile', 'general'), () => 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10))
          : []
      };
      data.tasks.push(mainTask);
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

export async function createTaskFromReader(
  host: any,
  window: any = null,
  sourceReader: any = null,
  selection: any = null
): Promise<void> {
  const win = window || (Zotero.getMainWindow ? Zotero.getMainWindow() : null);
  const tabs = win?.Zotero_Tabs || (typeof Zotero_Tabs !== 'undefined' ? Zotero_Tabs : null);
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
    const reader = sourceReader || Zotero.Reader?.getByTabID?.(tabs.selectedTab.id);
    const itemID = reader?.itemID || tabs?.selectedTab?.data?.itemID;
    if (!itemID) return;

    const attachmentItem = Zotero.Items.get(itemID);
    const regularItem = getLiteratureItem(attachmentItem);
    if (!regularItem) return;

    const meta = serializeLiteratureItem(regularItem);

    let selectedText = selection?.text || '';
    try {
      if (!selectedText && typeof reader.getSelectedText === 'function') {
        selectedText = await reader.getSelectedText();
      }
    } catch (_) {}

    if (!selectedText && reader._iframeWindow) {
      try {
        selectedText = reader._iframeWindow.getSelection?.()?.toString() || '';
      } catch (_) {}
    }
    selectedText = String(selectedText || '').trim();

    let pageIndex = 0;
    try {
      if (Number.isInteger(selection?.position?.pageIndex)) {
        pageIndex = selection.position.pageIndex;
      } else if (Number.isInteger(reader._internalReader?._state?.primaryViewState?.pageIndex)) {
        pageIndex = reader._internalReader._state.primaryViewState.pageIndex;
      } else if (reader.state && typeof reader.state.pageIndex === 'number') {
        pageIndex = reader.state.pageIndex;
      } else if (reader._iframeWindow?.PDFViewerApplication?.page) {
        pageIndex = reader._iframeWindow.PDFViewerApplication.page - 1;
      }
    } catch (_) {}
    const pageNum = pageIndex + 1;

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
    const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    const newTask = {
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
      order: (data.tasks || []).length,
      zoteroItemKey: meta.key,
      zoteroItemTitle: meta.title,
      zoteroAuthors: meta.authors,
      zoteroLibraryID: meta.libraryID,
      zoteroPublication: meta.publication,
      zoteroYear: meta.year,
      zoteroUri: meta.zoteroUri,
      zoteroPdfUri: pageLink,
      zoteroAttachmentKey: attachmentItem.key,
      zoteroItemID: regularItem.id,
      zoteroPage: pageNum,
      zoteroQuote: selectedText,
      zoteroLinkStatus: 'active',
      academicType: 'literature_reading'
    };

    const shortcutAction = host.getPref('readerShortcutAction', 'create_instant');
    if (shortcutAction === 'open_modal') {
      host.openTaskFlow({ mode: 'open_modal_prefill', prefill: newTask }, window);
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
  host: any,
  item: any,
  window: any = null,
  profileID: any = null
): Promise<any> {
  const selectedProfile = Object.hasOwn(LiteratureWorkflow.profiles, profileID)
    ? profileID
    : host.getPref('readingProfile', 'general');
  const result = await addLiteratureReadingTask(host, item, { profileID: selectedProfile });
  host.showNotice(
    result.created ? '精读清单已创建' : '该精读清单已存在',
    `${LiteratureWorkflow.profile(selectedProfile).label} · 截止 ${result.task.dueDate}`
  );
  host.openTaskFlow({ mode: 'view_task', taskId: result.task.id }, window);
  return result;
}
