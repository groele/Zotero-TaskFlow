import { ADDON_ID, CHROME_ROOT } from '../config';
import { TaskFlowStorage } from './storage';
import { TaskRules } from '../taskRules';
import { LiteratureWorkflow } from '../literatureWorkflow';
import { TaskFlowItemPane } from '../itemPane';
import { getLiteratureItem, serializeLiteratureItem, resolveItemReference, escapeHtml } from '../utils';

declare let Zotero: any;
declare let Services: any;

export class TaskFlowLiterature extends TaskFlowStorage {

    async locateLiteratureItem(reference, libraryID, ownerWindow = null) {
      const item = resolveItemReference(reference, libraryID);
      const mainWindow = ownerWindow?.ZoteroPane ? ownerWindow : Zotero.getMainWindow?.();
      if (!item || item.deleted || !mainWindow?.ZoteroPane?.selectItem) {
        this.showNotice('无法跳转文献', '文献可能已被删除，或 Zotero 文献库窗口尚未打开。');
        return false;
      }
      const tabs = mainWindow.Zotero_Tabs;
      const libraryTab = tabs?._tabs?.find(tab => tab && (tab.type === 'library' || tab.id === 'zotero-pane'));
      if (libraryTab) tabs.select(libraryTab.id);
      mainWindow.focus?.();
      await mainWindow.ZoteroPane.selectItem(item.id);
      return true;
    }


    async openPdfAttachment(item, page = null, annotationKey = null) {
      if (!item) return;
      const target = (item.isPDFAttachment?.() ? item : getLiteratureItem(item)) || item;
      if (target.deleted) { this.showNotice('无法打开 PDF', '文献或附件已在回收站中。'); return false; }
      let pdfAtt = null;
      if (typeof target.isAttachment === 'function' && target.isAttachment() && target.isPDFAttachment && target.isPDFAttachment()) {
        pdfAtt = target;
      } else if (typeof target.getAttachments === 'function') {
        const attIds = target.getAttachments();
        for (const attId of attIds) {
          const att = Zotero.Items.get(attId);
          if (att && att.isPDFAttachment && att.isPDFAttachment()) {
            pdfAtt = att;
            break;
          }
        }
      }
      if (pdfAtt && Zotero.Reader && typeof Zotero.Reader.open === 'function') {
        const location: any = {};
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


    async openTaskPdf(task) {
      const item = resolveItemReference(task.zoteroPdfUri || task.zoteroItemKey, task.zoteroLibraryID);
      if (!item) { this.showNotice('无法打开 PDF', '关联的文献或附件已删除。'); return false; }
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


    async createTaskFromAnnotation(reader, annotationKey, { forceInstant = false } = {}) {
      const attachment = Zotero.Items.get(reader.itemID);
      const annotation = resolveItemReference(annotationKey, attachment?.libraryID);
      const parent = getLiteratureItem(attachment);
      if (!parent || !annotation?.isAnnotation?.() || annotation.deleted || annotation.parentItemID !== attachment.id) {
        throw new Error('批注已删除或不属于当前 PDF');
      }
      let position;
      try { position = JSON.parse(annotation.annotationPosition || '{}'); } catch (_) { position = {}; }
      const page = Number.isInteger(position.pageIndex) && position.pageIndex >= 0 ? position.pageIndex + 1 : null;
      const quote = annotation.annotationText || '';
      const title = `批注：${String(annotation.annotationComment || quote || '核查文献批注').slice(0, 60)}`;
      const task = this.buildLiteratureTask(parent, { title, workflowId: `annotation:${annotationKey}` });
      task.zoteroAnnotationKey = annotationKey;
      task.zoteroAttachmentKey = attachment.key;
      task.zoteroPage = page; task.zoteroQuote = quote;
      task.description = [quote, annotation.annotationComment].filter(Boolean).join('\n\n');
      const groupID = Zotero.Libraries?.get?.(attachment.libraryID)?.groupID;
      task.zoteroPdfUri = `zotero://open-pdf/${groupID ? 'groups/' + groupID : 'library'}/items/${attachment.key}?annotation=${annotationKey}${page ? '&page=' + page : ''}`;
      const data = await this.loadData(); task.order = Math.max(-1, ...data.tasks.map(t => t.order || 0)) + 1;
      if (!forceInstant && this.getPref('readerShortcutAction', 'create_instant') === 'open_modal') {
        this.openTaskFlow({ mode: 'open_modal_prefill', prefill: task }, Zotero.getMainWindow?.()); return;
      }
      const saved = await this.saveData({ taskChanges: { added: [task] }, deduplicateLiterature: true, syncLinkedItems: true });
      const created = saved.tasks.some(t => t.id === task.id);
      this.showNotice(created ? '批注已加入待办' : '该批注已有待办', '点击任务的“回到批注”即可返回原文位置。');
      return saved.tasks.find(t => LiteratureWorkflow.samePending(t, task, Zotero.Libraries.userLibraryID));
    }


    getZoteroCollections(libraryID = null) {
      const libID = Number.isInteger(Number(libraryID)) && Number(libraryID) > 0
        ? Number(libraryID) : (Zotero.Libraries?.userLibraryID || 1);
      const collections = Zotero.Collections?.getByLibrary?.(libID) || [];
      return collections.map((col) => ({
        id: col.id,
        key: col.key,
        name: col.name,
        parentID: col.parentID,
        itemCount: typeof col.getChildItemsCount === 'function' ? col.getChildItemsCount() : 0
      }));
    }


    async syncTasksToChildNote(item, tasks = null, options = {}) {
      const target = getLiteratureItem(item);
      if (!target) return null;
      if (typeof target.isEditable === 'function' && !target.isEditable()) return null;

      try {
        const data = await this.loadData();
        const allTasks = (tasks || data.tasks || []).filter(t => t.zoteroItemKey === target.key &&
          (t.zoteroLibraryID || Zotero.Libraries.userLibraryID) === target.libraryID);
        const meta = serializeLiteratureItem(target);

        const total = allTasks.length;
        const completed = allTasks.filter((t) => t.completed).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Construct formatted HTML note
        let noteHtml = `<h1>${escapeHtml(this.getPref('childNoteTitle', '📝 [TaskFlow] 研读清单与进度'))}</h1>`;
        noteHtml += `<p><strong>文献：</strong>${escapeHtml(meta.title)} (${escapeHtml(meta.authors)} ${escapeHtml(meta.year)})</p>`;
        noteHtml += `<p><strong>研读进度：</strong>${completed}/${total} 已完成 (<strong>${percent}%</strong>) | 更新于：${new Date().toLocaleString()}</p>`;
        noteHtml += `<div style="background:#e2e8f0;border-radius:4px;height:10px;width:100%;margin:8px 0;overflow:hidden;"><div style="background:#059669;height:10px;width:${percent}%;"></div></div>`;

        if (total === 0) {
          noteHtml += `<p><em>暂无关联待办事项。可通过 TaskFlow 插件或侧边栏添加研读计划。</em></p>`;
        } else {
          noteHtml += `<ul>`;
          for (const t of allTasks) {
            const checkMark = t.completed ? '☑' : '☐';
            const statusStyle = t.completed ? 'text-decoration:line-through;color:#64748b;' : 'font-weight:600;';
            const dueInfo = t.dueDate ? ` <span style="font-size:11px;color:#d97706;">(截止: ${escapeHtml(t.dueDate)})</span>` : '';
            noteHtml += `<li>${checkMark} <span style="${statusStyle}">${escapeHtml(t.title)}</span>${dueInfo}`;
            if (this.getPref('childNoteIncludeSubtasks', true) && t.subtasks && t.subtasks.length > 0) {
              noteHtml += `<ul>`;
              for (const sub of t.subtasks) {
                noteHtml += `<li>${sub.completed ? '☑' : '☐'} ${escapeHtml(sub.title)}</li>`;
              }
              noteHtml += `</ul>`;
            }
            if (this.getPref('childNoteIncludeQuotes', true) && t.description && t.description.trim()) {
              noteHtml += `<blockquote>${escapeHtml(t.description).replace(/\n/g, '<br/>')}</blockquote>`;
            }
            if (this.getPref('childNoteIncludeQuotes', true) && /^zotero:\/\/open-pdf\/(?:library|groups\/\d+)\/items\/[A-Za-z0-9_]+(?:\?|$)/.test(t.zoteroPdfUri || '')) {
              noteHtml += ` <a href="${escapeHtml(t.zoteroPdfUri)}">${t.zoteroAnnotationKey ? '返回原文批注' : '打开原文页码'}</a>`;
            }
            noteHtml += `</li>`;
          }
          noteHtml += `</ul>`;
        }

        noteHtml += `<hr/><p style="font-size:11px;color:#94a3b8;">由 Zotero TaskFlow 自动生成并同步至 Zotero 云端笔记</p>`;

        // Find existing child note
        let targetNote = null;
        if (typeof target.getNotes === 'function') {
          const noteIDs = target.getNotes();
          for (const nid of noteIDs) {
            const noteItem = Zotero.Items.get(nid);
            if (noteItem && noteItem.isNote && noteItem.isNote()) {
              const content = noteItem.getNote();
              const hasTaskFlowTag = typeof noteItem.hasTag === 'function' && noteItem.hasTag('TaskFlow');
              if (hasTaskFlowTag || (content && (content.includes('[TaskFlow]') || content.includes('TaskFlow')))) {
                targetNote = noteItem;
                break;
              }
            }
          }
        }

        if (targetNote) {
          targetNote.setNote(noteHtml);
          try {
            if (typeof targetNote.hasTag === 'function' && !targetNote.hasTag('TaskFlow')) {
              targetNote.addTag('TaskFlow');
            }
            if (typeof targetNote.hasTag === 'function' && targetNote.hasTag('Todolist')) {
              targetNote.removeTag('Todolist');
            }
          } catch (_) {}
          await targetNote.saveTx();
        } else {
          const newNote = new Zotero.Item('note');
          newNote.libraryID = target.libraryID;
          newNote.parentID = target.id;
          newNote.setNote(noteHtml);
          try {
            newNote.addTag('TaskFlow');
          } catch (_) {}
          await newNote.saveTx();
          targetNote = newNote;
        }

        if (!(options as any).silent) this.showNotice('文献笔记同步成功', `已更新《${meta.title.slice(0, 20)}...》的研读进度笔记，支持多端云同步！`);
        return targetNote;
      } catch (err) {
        Zotero.logError?.('[TaskFlow] syncTasksToChildNote error: ' + err);
        this.recordDiagnostic({ action: '同步文献子笔记', message: String(err?.message || err), stack: err?.stack });
        return null;
      }
    }


    async tagItemOnTaskEvent(itemKey, eventType, libraryID = null) {
      if (!itemKey) return;
      try {
        const item = resolveItemReference(itemKey, libraryID);
        const target = getLiteratureItem(item);
        if (!target) return;
        if (typeof target.isEditable === 'function' && !target.isEditable()) return;

        const autoTagOnCreate = this.getPref('autoTagOnCreate', true);
        const autoTagOnComplete = this.getPref('autoTagOnComplete', true);
        const pendingTag = this.getPref('tagForPending', '待研读');
        const completedTag = this.getPref('tagForCompleted', '精读已完成');

        const data = await this.loadData();
        const tasks = (data.tasks || []).filter(t => t.zoteroItemKey === target.key &&
          (t.zoteroLibraryID || Zotero.Libraries.userLibraryID) === target.libraryID);
        const uncompleted = tasks.filter((t) => !t.completed);

        let modified = false;

        if (eventType === 'create' && autoTagOnCreate) {
          if (pendingTag && !target.hasTag(pendingTag)) {
            target.addTag(pendingTag);
            modified = true;
          }
        } else if (eventType === 'complete_check') {
          if (tasks.length > 0 && uncompleted.length === 0) {
            // All tasks completed
            if (autoTagOnComplete && completedTag) {
              if (!target.hasTag(completedTag)) {
                target.addTag(completedTag);
                modified = true;
              }
              if (pendingTag && target.hasTag(pendingTag)) {
                target.removeTag(pendingTag);
                modified = true;
              }
            }
          } else if (tasks.length === 0) {
            for (const tag of [pendingTag, completedTag]) {
              if (tag && target.hasTag(tag)) { target.removeTag(tag); modified = true; }
            }
          } else if (uncompleted.length > 0) {
            // Still has uncompleted tasks
            if (completedTag && target.hasTag(completedTag)) {
              target.removeTag(completedTag);
              modified = true;
            }
            if (autoTagOnCreate && pendingTag && !target.hasTag(pendingTag)) {
              target.addTag(pendingTag);
              modified = true;
            }
          }
        }

        if (modified) {
          await target.saveTx();
        }
      } catch (err) {
        Zotero.logError?.('[TaskFlow] tagItemOnTaskEvent error: ' + err);
      }
    }


    async createCollectionReadingPlan(collection, window = null) {
      if (!collection) return;
      try {
        const items = collection.getChildItems ? collection.getChildItems(false) : [];
        const regularItems = items.map((it) => getLiteratureItem(it)).filter(Boolean);
        if (regularItems.length === 0) {
          this.showNotice('未找到文献', `分类【${collection.name}】中暂无有效文献`);
          return;
        }

        const data = await this.loadData();
        const existingKeys = new Set((data.tasks || []).filter(t => t.zoteroItemKey)
          .map(t => (t.zoteroLibraryID || Zotero.Libraries.userLibraryID) + ':' + t.zoteroItemKey));
        let addedCount = 0;
        const addedTasks = [];

        for (const item of regularItems) {
          if (existingKeys.has(item.libraryID + ':' + item.key)) continue;
          const meta = serializeLiteratureItem(item);
          const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
          const mainTask = {
            id: taskId,
            title: `📖 研读：${meta.title}`,
            description: `分类专题：${collection.name}\n作者：${meta.authors} (${meta.year})\n出版物：${meta.publication}\n文献链接：${meta.zoteroUri}`,
            dueDate: LiteratureWorkflow.dateAfter(LiteratureWorkflow.days(this.getPref('defaultDueDays', 7))),
            dueTime: null,
            priority: this.getPref('defaultPriority', 'medium'),
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
            readingProfile: this.getPref('readingProfile', 'general'),
            literatureWorkflowId: 'reading',
            zoteroItemTitle: meta.title,
            zoteroAuthors: meta.authors,
            zoteroLibraryID: meta.libraryID,
            zoteroPublication: meta.publication,
            zoteroYear: meta.year,
            zoteroUri: meta.zoteroUri,
            zoteroPdfUri: meta.pdfUri,
            academicType: 'literature_reading',
            subtasks: Boolean(this.getPref('academicPresets', true))
              ? LiteratureWorkflow.steps(this.getPref('readingProfile', 'general'),
                  () => 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10))
              : []
          };
          data.tasks.push(mainTask);
          addedTasks.push(mainTask);
          existingKeys.add(item.libraryID + ':' + item.key);
          addedCount++;
        }

        if (addedCount > 0) {
          await this.saveData({ taskChanges: { added: addedTasks }, deduplicateLiterature: 'item', syncLinkedItems: true });
          this.showNotice(
            '专题研读规划已建立',
            `已为【${collection.name}】下的 ${addedCount} 篇文献批量生成研读清单！`
          );
        } else {
          this.showNotice(
            '研读规划已存在',
            `【${collection.name}】下的文献均已存在对应研读任务。`
          );
        }

        this.openTaskFlow({ mode: 'create_from_collection', collectionName: collection.name }, window);
      } catch (err) {
        Zotero.logError?.('[TaskFlow] createCollectionReadingPlan error: ' + err);
      }
    }


    async createTaskFromReader(window = null, sourceReader = null, selection = null) {
      const win = window || (Zotero.getMainWindow ? Zotero.getMainWindow() : null);
      const tabs = win?.Zotero_Tabs || (typeof Zotero_Tabs !== 'undefined' ? Zotero_Tabs : null);
      if (!sourceReader && (!tabs || !tabs.selectedTab || tabs.selectedTab.type !== 'reader')) {
        const selected = this.getSelectedRegularItems(win);
        if (selected.length > 0) {
          this.openTaskFlow({ mode: 'create_from_item', item: serializeLiteratureItem(selected[0]) }, win);
          return;
        }
        this.showNotice('提示', '请在 PDF 阅读器中或文献列表中使用此快捷键');
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

        // Get selected text if any
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

        // Get page index
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

        // Construct PDF anchor deep link
        const pdfKey = attachmentItem?.key || meta.key;
        const groupID = Zotero.Libraries?.get?.(regularItem.libraryID)?.groupID;
        const pageLink = groupID
          ? `zotero://open-pdf/groups/${groupID}/items/${pdfKey}?page=${pageNum}`
          : `zotero://open-pdf/library/items/${pdfKey}?page=${pageNum}`;

        const taskTitle = selectedText
          ? (selectedText.length > 50 ? selectedText.slice(0, 50) + '...' : selectedText)
          : `文献研读思考 (P.${pageNum})`;

        let description = `来自 PDF 第 ${pageNum} 页的摘录与待办：\n`;
        if (selectedText) {
          description += `“${selectedText}”\n\n`;
        }
        description += `文献：《${meta.title}》\nPDF 锚点直达：${pageLink}`;

        const data = await this.loadData();
        const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

        const newTask = {
          id: taskId,
          title: `📌 [P.${pageNum}] ${taskTitle}`,
          description,
          dueDate: LiteratureWorkflow.dateAfter(LiteratureWorkflow.days(this.getPref('defaultDueDays', 7))),
          dueTime: null,
          priority: this.getPref('defaultPriority', 'medium'),
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

        const shortcutAction = this.getPref('readerShortcutAction', 'create_instant');
        if (shortcutAction === 'open_modal') {
          this.openTaskFlow({ mode: 'open_modal_prefill', prefill: newTask }, window);
          return;
        }

        await this.saveData({ taskChanges: { added: [newTask] }, syncLinkedItems: true });

        this.showNotice(
          '已从 PDF 提取待办',
          `已记录第 ${pageNum} 页任务，并生成一键直达锚点链接！`
        );
      } catch (err) {
        Zotero.logError?.('[TaskFlow] createTaskFromReader error: ' + err);
        this.showNotice('从阅读器创建待办失败', String(err));
      }
    }


    
    buildLiteratureTask(item: any, { title = '', priority = null, academicType = 'literature_reading', profileID = null,
      dueDate = null, workflowId = null }: any = {}): any {
      const meta = serializeLiteratureItem(item);
      if (!meta || item.deleted) throw new Error('请先选中文献条目，回收站中的文献无法加入待办');
      const customTitle = String(title).trim();
      const taskTitle = customTitle || `研读：${meta.title}`;
      const generateId = () => 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      return {
        id: generateId(), title: taskTitle,
        description: `文献研读待办：${meta.title} (${meta.authors} ${meta.year})`,
        dueDate: dueDate || LiteratureWorkflow.dateAfter(LiteratureWorkflow.days(this.getPref('defaultDueDays', 7))),
        dueTime: null, priority: priority || this.getPref('defaultPriority', 'medium'),
        category: '论文研读', academicType, status: 'todo', repeat: null,
        completed: false, createdAt: new Date().toISOString(), completedAt: null,
        subtasks: profileID ? LiteratureWorkflow.steps(profileID, generateId) : [],
        readingProfile: profileID,
        literatureWorkflowId: workflowId || (profileID ? `milestones:${profileID}` : customTitle ? null : 'reading'),
        tags: this.getPref('autoTagFromItem', true) ? (meta.tags || []) : [],
        reminder: { enabled: false, before: 15, notified: false },
        zoteroItemKey: meta.key, zoteroItemID: meta.id, zoteroItemTitle: meta.title, zoteroAutoTitle: !customTitle,
        zoteroAuthors: meta.authors, zoteroLibraryID: meta.libraryID,
        zoteroPublication: meta.publication, zoteroYear: meta.year,
        zoteroUri: meta.zoteroUri, zoteroPdfUri: meta.pdfUri, zoteroLinkStatus: 'active'
      } as any;
    }

    addLiteratureReadingTask(item, options = {}) {
      let task;
      try { task = this.buildLiteratureTask(item, options); }
      catch (error) { return Promise.reject(error); }
      const requestKey = JSON.stringify([task.zoteroLibraryID, task.zoteroItemKey, task.title, task.literatureWorkflowId]);
      this._literatureTaskAdds ||= new Map();
      if (this._literatureTaskAdds.has(requestKey)) return this._literatureTaskAdds.get(requestKey);
      const run = async () => {
        const data = await this.loadData();
        task.order = Math.max(-1, ...(data.tasks || []).map(t => t.order || 0)) + 1;
        const saved = await this.saveData({ taskChanges: { added: [task] },
          deduplicateLiterature: Boolean(task.literatureWorkflowId), syncLinkedItems: true });
        const actual = saved.tasks.find(t => t.id === task.id) || saved.tasks.find(t =>
          LiteratureWorkflow.samePending(t, task, Zotero.Libraries.userLibraryID));
        return { task: actual, created: actual?.id === task.id };
      };
      const result = run().finally(() => this._literatureTaskAdds.delete(requestKey));
      this._literatureTaskAdds.set(requestKey, result);
      return result;
    }


    async addSelectedLiteratureTasks(window = null, items = null) {
      let selected = [];
      if (Array.isArray(items) && items.length) {
        const seen = new Set();
        selected = items.map(item => getLiteratureItem(item))
          .filter(item => item && !item.deleted && !seen.has(item.id) && seen.add(item.id));
      } else {
        selected = this.getSelectedRegularItems(window || Zotero.getMainWindow?.()).filter(item => !item.deleted);
      }
      if (!selected.length) { this.showNotice('请先选中文献', '可在文献列表中多选后批量加入。'); return { added: 0, skipped: 0 }; }
      return this.addLiteratureTasks(selected);
    }


    async addDroppedLiteratureTasks(itemIDs) {
      if (!this.getPref('dragDropFromLibrary', true)) throw new Error('已关闭从文献库拖入待办');
      if (!Array.isArray(itemIDs) || !itemIDs.length || itemIDs.length > 1000 ||
          itemIDs.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error('无效的 Zotero 拖拽条目');
      const seen = new Set();
      const selected = itemIDs.map(id => Zotero.Items.get(id)).filter(item => item && !item.deleted)
        .map(item => getLiteratureItem(item))
        .filter(item => item && !item.deleted && !seen.has(item.id) && seen.add(item.id));
      if (!selected.length) throw new Error('拖入的文献已删除或不包含可研读的文献条目');
      const result = await this.addLiteratureTasks(selected);
      return { ...result, ignored: itemIDs.length - selected.length };
    }


    async addLiteratureTasks(selected) {
      const data = await this.loadData();
      const candidates = selected.map((item, index) => ({ ...this.buildLiteratureTask(item),
        order: Math.max(-1, ...(data.tasks || []).map(task => task.order || 0)) + 1 + index }));
      const saved = await this.saveData({ taskChanges: { added: candidates }, deduplicateLiterature: 'item', syncLinkedItems: true });
      const ids = new Set(saved.tasks.map(task => task.id));
      const added = candidates.filter(task => ids.has(task.id)).length;
      const skipped = selected.length - added;
      this.showNotice('批量加入完成', `新增 ${added} 篇，跳过已有待办 ${skipped} 篇；新任务截止 ${candidates[0].dueDate}。`);
      return { added, skipped };
    }


    async rescheduleLiteratureTask(taskID, days, fromDeadline = false) {
      if (![0, 3, 7].includes(days)) throw new Error('不支持的改期选项');
      const data = await this.saveData({ rescheduleTask: { taskID, days, fromDeadline }, syncLinkedItems: true });
      return data.tasks.find(task => task.id === taskID);
    }


    async createReadingMilestones(item, window = null, profileID = null) {
      const selectedProfile = Object.hasOwn(LiteratureWorkflow.profiles, profileID)
        ? profileID : this.getPref('readingProfile', 'general');
      const result = await this.addLiteratureReadingTask(item, { profileID: selectedProfile });
      this.showNotice(result.created ? '精读清单已创建' : '该精读清单已存在',
        `${LiteratureWorkflow.profile(selectedProfile).label} · 截止 ${result.task.dueDate}`);
      this.openTaskFlow({ mode: 'view_task', taskId: result.task.id }, window);
      return result;
    }


    registerItemPaneSection() {
      if (typeof Zotero !== 'undefined' && Zotero.TaskFlowItemPane?.registerItemPaneSection) {
        return Zotero.TaskFlowItemPane.registerItemPaneSection(this);
      }
      if (typeof TaskFlowItemPane !== 'undefined' && TaskFlowItemPane.registerItemPaneSection) {
        return TaskFlowItemPane.registerItemPaneSection(this);
      }
    }


    async refreshLinkedLiterature(itemIDs = null, removed = []) {
      const data = await this.loadData(); const updated = [];
      for (const task of data.tasks || []) {
        if (!task.zoteroItemKey) continue;
        const libraryID = task.zoteroLibraryID || Zotero.Libraries.userLibraryID;
        const item = resolveItemReference(task.zoteroItemKey, libraryID);
        const matchesRemoved = removed.some(ref => ref.key === task.zoteroItemKey && ref.libraryID === libraryID);
        if (itemIDs && !itemIDs.has(item?.id) && !itemIDs.has(task.zoteroItemID) && !matchesRemoved) continue;
        let changes: any = { zoteroLinkStatus: !item ? 'missing' : item.deleted ? 'trashed' : 'active' };
        if (item) {
          const meta = serializeLiteratureItem(item);
          if (!meta) continue;
          Object.assign(changes, { zoteroItemID: meta.id, zoteroItemTitle: meta.title, zoteroAuthors: meta.authors,
            zoteroYear: meta.year, zoteroPublication: meta.publication, zoteroUri: meta.zoteroUri });
          if (task.zoteroAutoTitle || (task.zoteroAutoTitle == null && task.title === `研读：${task.zoteroItemTitle}`)) changes.title = `研读：${meta.title}`;
        }
        changes = Object.fromEntries(Object.entries(changes).filter(([key, value]) => value !== task[key]));
        if (Object.keys(changes).length) updated.push({ id: task.id, changes, literatureRefresh: true,
          originalTitle: task.title, itemKey: task.zoteroItemKey, libraryID });
      }
      if (updated.length && !this._shuttingDown) await this.saveData({ taskChanges: { updated },
        expectedTasksGeneration: data.tasksGeneration || 0 });
      return updated.length;
    }
}
