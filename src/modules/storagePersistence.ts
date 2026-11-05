import { TaskFlowBase } from './base';
import { TaskRules } from '../taskRules';
import { LiteratureWorkflow } from '../literatureWorkflow';
import { resolveItemReference, serializeLiteratureItem, escapeHtml } from '../utils';
import { ADDON_ID, CHROME_ROOT } from '../config';
import { injectedElements } from './window';

declare let Zotero: any;
declare let Services: any;
declare let PathUtils: any;
declare let IOUtils: any;

export class TaskFlowStoragePersistence extends TaskFlowBase {

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
}
