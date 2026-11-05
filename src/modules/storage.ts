import { LiteratureWorkflow } from '../literatureWorkflow';
import { resolveItemReference, serializeLiteratureItem } from '../utils';
import { ADDON_ID, CHROME_ROOT } from '../config';
import { injectedElements } from './window';
import { TaskFlowBase } from './base';
import { TaskRules } from '../taskRules';
import { escapeHtml } from '../utils';

declare let Zotero: any;
declare let Services: any;
declare let PathUtils: any;
declare let IOUtils: any;

export class TaskFlowStorage extends TaskFlowBase {

    getDataFilePath() {
      const baseDir = Zotero.DataDirectory?.dir || PathUtils.profileDir;
      return PathUtils.join(baseDir, 'taskflow-data.json');
    }


    localDateString(date) {
      return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    }

    cloneData(data) {
      if (!data) return data;
      if (typeof structuredClone === 'function') {
        try { return structuredClone(data); } catch (_) {}
      }
      return JSON.parse(JSON.stringify(data));
    }


    async loadData() {
      if (this._cachedData) return this.cloneData(this._cachedData);
      if (!this._loadPromise) this._loadPromise = this.readDataFile();
      try { return this.cloneData(await this._loadPromise); }
      finally { this._loadPromise = null; }
    }


    async readDataFile() {
      const filePath = this.getDataFilePath();
      try {
        let data = null;
        if (await IOUtils.exists(filePath)) {
          data = JSON.parse(await IOUtils.readUTF8(filePath));
        }
        if (data) {
          if (!Array.isArray(data.tasks)) throw new Error('任务数据格式无效');
          const seen = new Set();
          data.tasks = data.tasks.filter(t => t && t.id && !seen.has(t.id) && seen.add(t.id));
          this._cachedData = data;
        } else {
          this._cachedData = { tasks: [], settings: { defaultView: 'list', showCompleted: true,
            sortOrder: 'dueDate', theme: this.getPref('theme', 'zotero'), defaultDueDays: this.getPref('defaultDueDays', 7),
            readingProfile: this.getPref('readingProfile', 'general'), dailySummary: false, summaryTime: '09:00' }, customTags: [] };
        }
        return this._cachedData;
      } catch (error) {
        Zotero.logError?.('[TaskFlow] 数据读取失败，保留原文件: ' + error);
        this.recordDiagnostic({ action: '读取待办数据', message: String(error?.message || error), stack: error?.stack });
        throw error;
      }
    }


    async saveData(data) {
      const request = this.cloneData(data);
      const run = async () => {
        const current = await this.loadData();
        const prepared = request.importRequest ? TaskRules.prepareImport(current, request.importRequest.payload, request.importRequest.mode) : null;
        const patch = prepared ? { ...prepared.patch, syncLinkedItems: request.syncLinkedItems } : request;
        const next = { ...current, ...patch };
        TaskRules.applyTaskGeneration(current, next, patch);
        TaskRules.applyCollectionChanges(current, next, patch);
        delete next.syncLinkedItems;
        if (patch.settings) next.settings = patch.replaceSettings ? patch.settings : { ...current.settings, ...patch.settings };
        delete next.replaceSettings;
        if (patch.taskChanges) {
          const { added = [], updated = [], deleted = [] } = patch.taskChanges;
          const removed = new Set(deleted);
          next.tasks = current.tasks.filter(t => !removed.has(t.id)).map(t => {
            const update = updated.find(u => u.id === t.id);
            if (!update) return t;
            const changes = { ...update.changes };
            if (update.literatureRefresh) {
              if (t.zoteroItemKey !== update.itemKey || (t.zoteroLibraryID || Zotero.Libraries.userLibraryID) !== update.libraryID) return t;
              if ((t as any).title !== (update as any).originalTitle) { delete changes.title; changes.zoteroAutoTitle = false; }
            }
            return { ...t, ...changes, id: t.id };
          });
          for (const task of added) {
            if (next.tasks.some(t => t.id === task.id)) continue;
            if (patch.deduplicateLiterature && next.tasks.some(t => LiteratureWorkflow.samePending(t, task,
              Zotero.Libraries.userLibraryID, patch.deduplicateLiterature === 'item'))) continue;
            next.tasks.push(task);
          }
          delete next.taskChanges;
        }
        delete next.deduplicateLiterature;
        if (patch.rescheduleTask) {
          const { taskID, days, fromDeadline } = patch.rescheduleTask;
          const task = next.tasks.find(t => t.id === taskID);
          if (!task) throw new Error('任务已被删除，请刷新后重试');
          if (![0, 3, 7].includes(days)) throw new Error('不支持的改期选项');
          const today = LiteratureWorkflow.dateAfter(0);
          const base = fromDeadline && task.dueDate && task.dueDate > today ? new Date(task.dueDate + 'T12:00:00') : new Date();
          next.tasks = next.tasks.map(t => t.id === taskID ? { ...t, dueDate: LiteratureWorkflow.dateAfter(days, base),
            reminder: { ...t.reminder, notified: false } } : t);
        }
        delete next.rescheduleTask;
        if (patch.activeTimerChanges) {
          next.activeTimers = { ...current.activeTimers };
          for (const [id, timer] of Object.entries(patch.activeTimerChanges)) {
            if (timer) next.activeTimers[id] = timer;
            else delete next.activeTimers[id];
          }
          delete next.activeTimerChanges;
        }
        TaskRules.applyTimerAction(next, patch.timerAction);
        delete next.timerAction;
        const notificationResult = TaskRules.applyNotificationAction(next, patch.notificationAction);
        delete next.notificationAction;
        if (patch.taskChanges) {
          for (const task of [...next.tasks]) {
            const was = current.tasks.find(t => t.id === task.id);
            if (task.completed && !was?.completed) {
              const recurring = TaskRules.buildNextTask(task, next.tasks,
                () => 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10));
              if (recurring) next.tasks.push(recurring);
            }
          }
        }
        const seen = new Set();
        next.tasks = next.tasks.filter(t => t && t.id && !seen.has(t.id) && seen.add(t.id));
        next.tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
        next.revision = (current.revision || 0) + 1;
        const ids = new Set(next.tasks.map(t => t.id));
        next.activeTimers = Object.fromEntries(Object.entries(next.activeTimers || {}).filter(([id]) => ids.has(id)));
        const filePath = this.getDataFilePath();
        try {
          await IOUtils.writeUTF8(filePath, JSON.stringify(next, null, 2), { tmpPath: filePath + '.tmp' });
        } catch (error) {
          Zotero.logError?.('[TaskFlow] 数据保存失败: ' + error);
          this.recordDiagnostic({ action: '保存待办数据', message: String(error?.message || error), stack: error?.stack });
          throw error;
        }
        this._cachedData = next;
        if (patch.tasks) {
          this._paneDeleted = [];
          clearTimeout(this._paneUndoTimer);
        }
        this.notifyDataChanged();
        if (patch.syncLinkedItems) {
          try { await this.syncLinkedTaskChanges(current, next); }
          catch (error) { Zotero.logError?.('[TaskFlow] 任务已保存，文献联动更新失败: ' + error); }
        }
        const result = this.cloneData(next);
        if (prepared) result.importResult = { imported: prepared.imported };
        if (notificationResult) result.notificationResult = notificationResult;
        return result;
      };
      const result = (this._saveQueue || Promise.resolve()).then(run);
      this._saveQueue = result.catch(() => {});
      return result;
    }


    async syncLinkedTaskChanges(before, after) {
      const previous = new Map(before.tasks.map(t => [t.id, t]));
      const current = new Map(after.tasks.map(t => [t.id, t]));
      const affected = new Map();
      for (const id of new Set([...previous.keys(), ...current.keys()])) {
        const oldTask: any = previous.get(id), newTask: any = current.get(id);
        if (JSON.stringify(oldTask) === JSON.stringify(newTask)) continue;
        for (const task of [oldTask, newTask]) {
          if (!task?.zoteroItemKey) continue;
          const key = String(task.zoteroLibraryID || Zotero.Libraries.userLibraryID) + ':' + task.zoteroItemKey;
          const onlySubtasks = oldTask && newTask && JSON.stringify({ ...oldTask, subtasks: null }) ===
            JSON.stringify({ ...newTask, subtasks: null });
          affected.set(key, { task, syncNote: (affected.get(key)?.syncNote || !onlySubtasks ||
            this.getPref('childNoteAutoUpdateOnSubtask', true)) });
        }
      }
      for (const { task, syncNote } of affected.values()) {
        try {
        const libraryID = task.zoteroLibraryID || Zotero.Libraries.userLibraryID;
        const item = this.resolveItemReference(task.zoteroItemKey, libraryID);
        if (!item) continue;
        await this.tagItemOnTaskEvent(task.zoteroItemKey, 'complete_check', libraryID);
        if (syncNote && this.getPref('autoSyncChildNote', true)) {
          const note = await this.syncTasksToChildNote(item, null, { silent: true });
          if (!note) Zotero.logError?.('[TaskFlow] 任务已保存，但子笔记未能更新: ' + task.zoteroItemKey);
        }
        } catch (error) { Zotero.logError?.('[TaskFlow] 任务已保存，文献联动更新失败: ' + task.zoteroItemKey + ': ' + error); }
      }
    }


    async updateTaskState(id, change) {
      const data = await this.loadData();
      const task = data.tasks.find(t => t.id === id);
      if (!task) return null;
      const changes = typeof change === 'function' ? change(task) : change;
      await this.saveData({ taskChanges: { updated: [{ id, changes }] }, expectedTasksGeneration: data.tasksGeneration || 0 });
      return task;
    }


    registerDataListener(listener) {
      this._dataListeners.add(listener);
    }


    unregisterDataListener(listener) {
      this._dataListeners.delete(listener);
    }


    notifyDataChanged() {
      for (const win of injectedElements.keys()) {
        try { if (!win.closed) this.updateToolbarBadge(win.document, this._cachedData); }
        catch (error) { Zotero.logError?.('[TaskFlow] Toolbar count refresh failed: ' + error); }
      }
      for (const client of this._uiClients || []) {
        try {
          if (client.closed) { this._uiClients.delete(client); continue; }
          client.postMessage({ type: 'TASKFLOW_DATA_CHANGED', data: this.cloneData(this._cachedData) }, '*');
        } catch (_) { this._uiClients.delete(client); }
      }
      for (const listener of this._dataListeners) {
        try {
          listener(this.cloneData(this._cachedData));
        } catch (e) {
          Zotero.logError?.('[TaskFlow] Error in data listener: ' + e);
        }
      }
    }


    async exportData(format = 'json') {
      try {
        const data = await this.loadData();
        const fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
        const win = Zotero.getMainWindow?.() || (typeof Services !== 'undefined' ? Services.wm?.getMostRecentWindow?.('navigator:browser') : null);
        const titleMap = {
          json: '导出 TaskFlow JSON 备份',
          csv: '导出 TaskFlow CSV 表格 (Excel 兼容)',
          markdown: '导出 TaskFlow Markdown 清单',
          txt: '导出 TaskFlow 纯文本清单'
        };
        fp.init(win, titleMap[format] || '导出 TaskFlow 数据', Ci.nsIFilePicker.modeSave);
        const dateStr = new Date().toISOString().slice(0, 10);
        if (format === 'json') {
          fp.appendFilter('JSON Files (*.json)', '*.json');
          fp.defaultString = `taskflow-backup-${dateStr}.json`;
        } else if (format === 'csv') {
          fp.appendFilter('CSV Files (*.csv)', '*.csv');
          fp.defaultString = `taskflow-tasks-${dateStr}.csv`;
        } else if (format === 'markdown') {
          fp.appendFilter('Markdown Files (*.md)', '*.md');
          fp.defaultString = `taskflow-tasks-${dateStr}.md`;
        } else {
          fp.appendFilter('Text Files (*.txt)', '*.txt');
          fp.defaultString = `taskflow-tasks-${dateStr}.txt`;
        }

        const res = await new Promise((resolve) => fp.open(resolve));
        if (res === Ci.nsIFilePicker.returnOK || res === Ci.nsIFilePicker.returnReplace) {
          const filePath = fp.file.path;
          let content = '';
          const tasks = data.tasks || [];

          if (format === 'json') {
            content = JSON.stringify(data, null, 2);
          } else if (format === 'csv') {
            const escapeCsv = (str) => {
              let text = String(str ?? '');
              if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
              return `"${text.replace(/"/g, '""')}"`;
            };
            const headers = ['标题', '学术分类', '状态', '优先级', '截止日期', '时间', '关联文献', '文献年份', 'PDF链接', '描述', '创建时间', '完成时间'];
            const rows = tasks.map((t) => [
              escapeCsv(t.title),
              escapeCsv(t.academicType || t.category || 'generic'),
              escapeCsv(t.completed ? '已完成' : '待完成'),
              escapeCsv(t.priority || 'medium'),
              escapeCsv(t.dueDate || ''),
              escapeCsv(t.dueTime || ''),
              escapeCsv(t.zoteroItemTitle || ''),
              escapeCsv(t.zoteroYear || ''),
              escapeCsv(t.zoteroPdfUri || ''),
              escapeCsv(t.description || ''),
              escapeCsv(t.createdAt || ''),
              escapeCsv(t.completedAt || '')
            ].join(','));
            content = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
          } else if (format === 'markdown') {
            content = `# TaskFlow 学术任务清单\n导出时间：${new Date().toLocaleString()}\n总计：${tasks.length} 项 (已完成：${tasks.filter(t => t.completed).length}，待研读：${tasks.filter(t => !t.completed).length})\n\n---\n\n`;
            for (const t of tasks) {
              content += `- [${t.completed ? 'x' : ' '}] **${t.title}**${t.dueDate ? ` (截止: ${t.dueDate})` : ''}\n`;
              if (t.academicType) content += `  - 学术类型: ${t.academicType}\n`;
              if (t.zoteroItemTitle) content += `  - 关联文献: 《${t.zoteroItemTitle}》${t.zoteroYear ? ` (${t.zoteroYear})` : ''}\n`;
              if (t.zoteroPdfUri) content += `  - PDF 伴读链接: [打开 PDF](${t.zoteroPdfUri})\n`;
              if (t.description) content += `  - 描述: ${t.description.replace(/\n/g, ' ')}\n`;
              if (t.subtasks && t.subtasks.length > 0) {
                for (const sub of t.subtasks) {
                  content += `    - [${sub.completed ? 'x' : ' '}] ${sub.title}\n`;
                }
              }
            }
          } else {
            content = `TaskFlow 学术任务清单\n导出时间：${new Date().toLocaleString()}\n====================================\n\n`;
            const incomplete = tasks.filter(t => !t.completed);
            const completed = tasks.filter(t => t.completed);
            if (incomplete.length > 0) {
              content += `【待完成研读与任务】(${incomplete.length})\n`;
              incomplete.forEach((t, i) => {
                content += `${i + 1}. ${t.title}${t.dueDate ? ` [${t.dueDate}]` : ''}\n`;
                if (t.zoteroItemTitle) content += `   文献: 《${t.zoteroItemTitle}》\n`;
              });
              content += '\n';
            }
            if (completed.length > 0) {
              content += `【已完成任务】(${completed.length})\n`;
              completed.forEach((t, i) => {
                content += `${i + 1}. ✓ ${t.title}\n`;
              });
            }
          }

          await IOUtils.writeUTF8(filePath, content);
          this.showNotice('导出成功', `已成功导出至：${filePath}`);
          return filePath;
        }
      } catch (err) {
        Zotero.logError?.('[TaskFlow] exportData error: ' + err);
        this.recordDiagnostic({ action: '导出待办数据', message: String(err?.message || err), stack: err?.stack });
        this.showNotice('导出失败', String(err.message || err));
      }
      return null;
    }


    async importDataFile(mode = 'merge', window = null) {
      try {
        const fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
        const win = window || Zotero.getMainWindow?.() || (typeof Services !== 'undefined' ? Services.wm?.getMostRecentWindow?.('navigator:browser') : null);
        fp.init(win, '选择 TaskFlow JSON 备份文件导入', Ci.nsIFilePicker.modeOpen);
        fp.appendFilter('JSON Files (*.json)', '*.json');

        const res = await new Promise((resolve) => fp.open(resolve));
        if (res === Ci.nsIFilePicker.returnOK) {
          const filePath = fp.file.path;
          const rawText = await IOUtils.readUTF8(filePath);
          let importedJson;
          try {
            importedJson = JSON.parse(rawText);
          } catch (pe) {
            throw new Error('所选文件不是合法的 JSON 格式数据');
          }

          const saved = await this.saveData({ importRequest: { payload: importedJson, mode }, syncLinkedItems: true });
          const imported = saved.importResult.imported;
          if (mode === 'replace') {
            this._paneDeleted = [];
            clearTimeout(this._paneUndoTimer);
          }

          this.showNotice('导入成功', `已成功导入 ${imported} 个任务与标签数据！`);
          return { success: true, count: imported };
        }
      } catch (err) {
        Zotero.logError?.('[TaskFlow] importDataFile error: ' + err);
        this.recordDiagnostic({ action: '导入待办数据', message: String(err?.message || err), stack: err?.stack });
        this.showNotice('导入失败', String(err.message || err));
        return { success: false, error: err.message };
      }
      return { success: false, cancelled: true };
    }


    async clearAllData(window = null) {
      try {
        await this.saveData({ tasks: [], history: [], customTags: [], customTemplates: [],
          searchHistory: [], activeTimers: {}, syncLinkedItems: true });
        this._paneDeleted = [];
        clearTimeout(this._paneUndoTimer);
        this.showNotice('数据已清空', '所有任务、历史记录与自定义标签已安全清空。');
        return true;
      } catch (err) {
        Zotero.logError?.('[TaskFlow] clearAllData error: ' + err);
        return false;
      }
    }


    async getTasksSummaryText() {
      const data = await this.loadData();
      const tasks = data.tasks || [];
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const pending = total - completed;
      const litTasks = tasks.filter(t => t.zoteroItemKey);

      let summary = `# 📋 TaskFlow 学术任务研读概览\n`;
      summary += `生成时间：${new Date().toLocaleString()}\n`;
      summary += `任务总数：${total} 项 | 已完成：${completed} 项 | 进行中：${pending} 项 | 文献关联：${litTasks.length} 篇\n`;
      summary += `总体完成率：${total > 0 ? Math.round((completed / total) * 100) : 0}%\n\n`;

      if (pending > 0) {
        summary += `### ⏳ 进行中研读待办\n`;
        tasks.filter(t => !t.completed).forEach((t, i) => {
          summary += `${i + 1}. **${t.title}**`;
          if (t.zoteroItemTitle) summary += ` (文献: 《${t.zoteroItemTitle}》)`;
          if (t.dueDate) summary += ` [截止: ${t.dueDate}]`;
          summary += `\n`;
        });
        summary += `\n`;
      }

      if (completed > 0) {
        summary += `### ✅ 已完成研读精读\n`;
        tasks.filter(t => t.completed).slice(-10).forEach((t, i) => {
          summary += `${i + 1}. ✓ ~~${t.title}~~`;
          if (t.zoteroItemTitle) summary += ` (《${t.zoteroItemTitle}》)`;
          summary += `\n`;
        });
      }

      return summary;
    }


    async copyTasksSummary(window = null) {
      try {
        const text = await this.getTasksSummaryText();
        const clipboard = Cc['@mozilla.org/widget/clipboardhelper;1'].getService(Ci.nsIClipboardHelper);
        clipboard.copyString(text);
        this.showNotice('已复制概览', '学术任务概览已复制到系统剪贴板，可直接粘贴至周报或笔记。');
        return true;
      } catch (err) {
        Zotero.logError?.('[TaskFlow] copyTasksSummary error: ' + err);
        return false;
      }
    }


    async printTasks(window = null) {
      try {
        const data = await this.loadData();
        const tasks = data.tasks || [];
        const win = window || Zotero.getMainWindow?.() || Services.wm.getMostRecentWindow('navigator:browser');

        let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>TaskFlow 学术任务清单</title><style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; line-height: 1.5; }
          h1 { font-size: 20px; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 4px; color: #065f46; }
          .meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
          .task-row { display: flex; align-items: baseline; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
          .box { width: 14px; height: 14px; border: 1.5px solid #94a3b8; border-radius: 3px; display: inline-block; }
          .done .box { background: #059669; border-color: #059669; }
          .done .title { text-decoration: line-through; color: #94a3b8; }
          .title { font-weight: 600; font-size: 14px; }
          .lit { font-size: 12px; color: #2563eb; background: #eff6ff; padding: 1px 6px; border-radius: 4px; }
          .date { font-size: 11px; color: #d97706; margin-left: auto; }
          @media print { body { padding: 0; } }
        </style></head><body>`;

        html += `<h1>TaskFlow 学术日程与研读清单</h1>`;
        html += `<div class="meta">打印时间：${new Date().toLocaleString()} | 共 ${tasks.length} 项 (已完成：${tasks.filter(t => t.completed).length})</div>`;

        tasks.forEach((t) => {
          html += `<div class="task-row ${t.completed ? 'done' : ''}">
            <span class="box"></span>
            <span class="title">${escapeHtml(t.title || '')}</span>
            ${t.zoteroItemTitle ? `<span class="lit">📖 ${escapeHtml(t.zoteroItemTitle)}</span>` : ''}
            ${t.dueDate ? `<span class="date">📅 ${escapeHtml(t.dueDate)}</span>` : ''}
          </div>`;
        });

        html += `</body></html>`;

        const printWin = win.open('', '_blank', 'width=800,height=700');
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
        }, 300);
      } catch (err) {
        Zotero.logError?.('[TaskFlow] printTasks error: ' + err);
      }
    }
}
