import { TaskFlowStorage } from './storage';
import { LiteratureWorkflow } from '../literatureWorkflow';
import { getLiteratureItem, resolveItemReference } from '../utils';
import type { TaskRecord, ZoteroItemLike } from '../types/models';

export class TaskFlowLiteratureTasks extends TaskFlowStorage {
  buildLiteratureTask(
    _item: ZoteroItemLike | number | string | null | undefined,
    _options: Record<string, unknown> = {}
  ): TaskRecord {
    throw new Error('buildLiteratureTask must be implemented by TaskFlowLiterature');
  }

  async locateLiteratureItem(
    reference: unknown,
    libraryID?: unknown,
    ownerWindow: Window | null = null
  ): Promise<boolean> {
    const item = resolveItemReference(reference, libraryID);
    const mainWindow = ownerWindow?.ZoteroPane ? ownerWindow : Zotero.getMainWindow?.();
    if (!item || item.deleted || !mainWindow?.ZoteroPane?.selectItem) {
      this.showNotice('无法跳转文献', '文献可能已被删除，或 Zotero 文献库窗口尚未打开。');
      return false;
    }
    const tabs = mainWindow.Zotero_Tabs;
    const libraryTab = tabs?._tabs?.find((tab) => Boolean(tab && (tab.type === 'library' || tab.id === 'zotero-pane')));
    if (libraryTab) tabs?.select?.(libraryTab.id);
    mainWindow.focus?.();
    await mainWindow.ZoteroPane.selectItem(item.id);
    return true;
  }

  async openPdfAttachment(
    item: ZoteroItemLike | number | string | null | undefined,
    page: number | string | null = null,
    annotationKey: string | null = null
  ): Promise<boolean> {
    if (!item) return false;
    const rawItem = typeof item === 'number' || typeof item === 'string' ? Zotero.Items?.get?.(item) : item;
    if (!rawItem) return false;
    const target = (rawItem.isPDFAttachment?.() ? rawItem : getLiteratureItem(rawItem)) || rawItem;
    if (target.deleted) {
      this.showNotice('无法打开 PDF', '文献或附件已在回收站中。');
      return false;
    }
    let pdfAtt: ZoteroItemLike | null = null;
    if (typeof target.isAttachment === 'function' && target.isAttachment() && target.isPDFAttachment?.()) {
      pdfAtt = target;
    } else if (typeof target.getAttachments === 'function') {
      const attIds = target.getAttachments();
      for (const attId of attIds) {
        const att = Zotero.Items?.get?.(attId);
        if (att && !att.deleted && att.isPDFAttachment?.()) {
          pdfAtt = att;
          break;
        }
      }
    }
    if (pdfAtt && Zotero.Reader && typeof Zotero.Reader.open === 'function') {
      const location: { pageIndex?: number; annotationID?: string } = {};
      if (page && Number.isInteger(Number(page)) && Number(page) > 0) {
        location.pageIndex = Number(page) - 1;
      }
      if (annotationKey) location.annotationID = annotationKey;
      await Zotero.Reader.open(pdfAtt.id, Object.keys(location).length ? location : undefined);
      return true;
    }
    this.showNotice('未找到 PDF', '当前文献没有可打开的 PDF 附件。');
    return false;
  }

  async openTaskPdf(task: Partial<TaskRecord> | null | undefined): Promise<boolean> {
    if (!task) return false;
    const item = resolveItemReference(task.zoteroPdfUri || task.zoteroItemKey, task.zoteroLibraryID);
    if (!item) {
      this.showNotice('无法打开 PDF', '关联的文献或附件已删除。');
      return false;
    }
    if (!this.getPref('pdfReaderJumpPage', true)) return this.openPdfAttachment(item);
    let annotationKey = task.zoteroAnnotationKey || null;
    if (annotationKey) {
      const annotation = resolveItemReference(annotationKey, task.zoteroLibraryID);
      if (!annotation || annotation.deleted || annotation.parentItemID !== item.id) {
        annotationKey = null;
        this.showNotice('批注已不可用', '将返回记录的 PDF 页码。');
      }
    }
    const page = task.zoteroPage || Number(String(task.zoteroPdfUri || '').match(/[?&]page=(\d+)/)?.[1]) || null;
    return this.openPdfAttachment(item, page, annotationKey);
  }

  async createTaskFromAnnotation(
    reader: { itemID: number | string },
    annotationKey: string,
    { forceInstant = false }: { forceInstant?: boolean } = {}
  ): Promise<TaskRecord | undefined> {
    const attachment = Zotero.Items?.get?.(reader.itemID);
    const annotation = resolveItemReference(annotationKey, attachment?.libraryID);
    const parent = getLiteratureItem(attachment);
    if (!attachment || !parent || !annotation?.isAnnotation?.() || annotation.deleted || annotation.parentItemID !== attachment.id) {
      throw new Error('批注已删除或不属于当前 PDF');
    }
    let position: { pageIndex?: number };
    try {
      position = JSON.parse(annotation.annotationPosition || '{}') as { pageIndex?: number };
    } catch (_) {
      position = {};
    }
    const page = typeof position.pageIndex === 'number' && Number.isInteger(position.pageIndex) && position.pageIndex >= 0
      ? position.pageIndex + 1
      : null;
    const quote = annotation.annotationText || '';
    const title = `批注：${String(annotation.annotationComment || quote || '核查文献批注').slice(0, 60)}`;
    const task = this.buildLiteratureTask(parent, { title, workflowId: `annotation:${annotationKey}` });
    task.zoteroAnnotationKey = annotationKey;
    task.zoteroAttachmentKey = attachment.key;
    task.zoteroPage = page;
    task.zoteroQuote = quote;
    task.description = [quote, annotation.annotationComment].filter(Boolean).join('\n\n');
    const groupID = Zotero.Libraries?.get?.(attachment.libraryID)?.groupID;
    task.zoteroPdfUri = `zotero://open-pdf/${groupID ? 'groups/' + groupID : 'library'}/items/${attachment.key}?annotation=${annotationKey}${page ? '&page=' + page : ''}`;
    const data = await this.loadData();
    task.order = data.tasks.reduce((max: number, t: TaskRecord) => Math.max(max, Number(t.order) || 0), -1) + 1;
    if (!forceInstant && this.getPref('readerShortcutAction', 'create_instant') === 'open_modal') {
      this.openTaskFlow({ mode: 'open_modal_prefill', prefill: task }, Zotero.getMainWindow?.() || null);
      return undefined;
    }
    const saved = await this.saveData({ taskChanges: { added: [task] }, deduplicateLiterature: true, syncLinkedItems: true });
    const created = saved.tasks.some((t: TaskRecord) => t.id === task.id);
    this.showNotice(created ? '批注已加入待办' : '该批注已有待办', '点击任务的“回到批注”即可返回原文位置。');
    const userLib = Zotero.Libraries?.userLibraryID || 1;
    return saved.tasks.find((t: TaskRecord) => LiteratureWorkflow.samePending(t, task, userLib));
  }

  getZoteroCollections(libraryID: number | string | null = null): Array<{
    id: number | string;
    key: string;
    name: string;
    parentID: number | string | null | undefined;
    itemCount: number;
  }> {
    const libID = Number.isInteger(Number(libraryID)) && Number(libraryID) > 0
      ? Number(libraryID)
      : (Zotero.Libraries?.userLibraryID || 1);
    const collections = Zotero.Collections?.getByLibrary?.(libID) || [];
    return collections.map((col) => ({
      id: col.id,
      key: col.key,
      name: col.name,
      parentID: col.parentID,
      itemCount: typeof col.getChildItemsCount === 'function' ? col.getChildItemsCount() : 0
    }));
  }
}
