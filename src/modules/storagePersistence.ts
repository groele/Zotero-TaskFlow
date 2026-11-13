import { TaskFlowBase } from './base';
import { TaskRules } from '../taskRules';
import { LiteratureWorkflow } from '../literatureWorkflow';
import { getErrorInfo } from '../lifecycle';
import { injectedElements } from './window';
import type { SaveDataPatch, TaskFlowData, TaskRecord, TaskUpdateEntry } from '../types/models';

function formatErrorInfo(error: unknown): { message: string; stack?: string } {
  return getErrorInfo(error);
}

export class TaskFlowStoragePersistence extends TaskFlowBase {
  getDataFilePath(): string {
    const baseDir = Zotero.DataDirectory?.dir || PathUtils.profileDir;
    return PathUtils.join(baseDir, 'taskflow-data.json');
  }

  localDateString(date: Date): string {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  cloneData<T>(data: T): T {
    if (!data) return data;
    if (typeof structuredClone === 'function') {
      try {
        return structuredClone(data);
      } catch (_) {}
    }
    return JSON.parse(JSON.stringify(data)) as T;
  }

  async loadData(): Promise<TaskFlowData> {
    if (this._cachedData) return this.cloneData(this._cachedData);
    if (!this._loadPromise) this._loadPromise = this.readDataFile();
    try {
      return this.cloneData(await this._loadPromise);
    } finally {
      this._loadPromise = null;
    }
  }

  async readDataFile(): Promise<TaskFlowData> {
    const filePath = this.getDataFilePath();
    try {
      let data: TaskFlowData | null = null;
      if (await IOUtils.exists(filePath)) {
        data = JSON.parse(await IOUtils.readUTF8(filePath)) as TaskFlowData;
      }
      if (data) {
        if (!Array.isArray(data.tasks)) throw new Error('任务数据格式无效');
        const seen = new Set<string>();
        data.tasks = data.tasks.filter((t: TaskRecord) => Boolean(t && t.id && !seen.has(t.id) && seen.add(t.id)));
        this._cachedData = data;
      } else {
        this._cachedData = {
          tasks: [],
          settings: {
            defaultView: 'list',
            showCompleted: true,
            sortOrder: 'dueDate',
            theme: this.getPref('theme', 'zotero'),
            defaultDueDays: this.getPref('defaultDueDays', 7),
            readingProfile: this.getPref('readingProfile', 'general'),
            dailySummary: false,
            summaryTime: '09:00'
          },
          customTags: []
        };
      }
      return this._cachedData;
    } catch (error) {
      const info = formatErrorInfo(error);
      Zotero.logError?.('[TaskFlow] 数据读取失败，保留原文件: ' + error);
      void this.recordDiagnostic({ action: '读取待办数据', message: info.message, stack: info.stack });
      throw error;
    }
  }

  async saveData(data: SaveDataPatch): Promise<TaskFlowData> {
    const taskUpdater = data?.taskUpdater;
    const rawPatch: SaveDataPatch = taskUpdater ? { ...data, taskUpdater: undefined } : data;
    const request = this.cloneData(rawPatch);
    if (taskUpdater) request.taskUpdater = taskUpdater;

    const run = async (): Promise<TaskFlowData> => {
      const current = await this.loadData();
      const prepared = request.importRequest
        ? TaskRules.prepareImport(current, request.importRequest.payload, request.importRequest.mode)
        : null;
      const patch: SaveDataPatch = prepared ? { ...prepared.patch, syncLinkedItems: request.syncLinkedItems } : request;
      const next: TaskFlowData = { ...current, ...patch };
      TaskRules.applyTaskGeneration(current, next, patch);
      TaskRules.applyCollectionChanges(current, next, patch);
      delete (next as Record<string, unknown>).syncLinkedItems;
      if (patch.settings) {
        next.settings = patch.replaceSettings ? patch.settings : { ...current.settings, ...patch.settings };
      }
      delete (next as Record<string, unknown>).replaceSettings;
      if (patch.taskChanges) {
        const { added = [], updated = [], deleted = [] } = patch.taskChanges;
        const removed = new Set(deleted);
        next.tasks = current.tasks
          .filter((t: TaskRecord) => !removed.has(t.id))
          .map((t: TaskRecord) => {
            const update = updated.find((u: TaskUpdateEntry) => u.id === t.id);
            if (!update) return t;
            const changes = { ...update.changes };
            if (update.literatureRefresh) {
              const userLib = Zotero.Libraries?.userLibraryID || 1;
              if (t.zoteroItemKey !== update.itemKey || (t.zoteroLibraryID || userLib) !== update.libraryID) return t;
              if (t.title !== update.originalTitle) {
                delete changes.title;
                changes.zoteroAutoTitle = false;
              }
            }
            return { ...t, ...changes, id: t.id };
          });
        const userLib = Zotero.Libraries?.userLibraryID || 1;
        for (const task of added) {
          if (next.tasks.some((t: TaskRecord) => t.id === task.id)) continue;
          if (
            patch.deduplicateLiterature &&
            next.tasks.some((t: TaskRecord) =>
              LiteratureWorkflow.samePending(t, task, userLib, patch.deduplicateLiterature === 'item')
            )
          ) {
            continue;
          }
          next.tasks.push(task);
        }
        delete (next as Record<string, unknown>).taskChanges;
      }
      delete (next as Record<string, unknown>).deduplicateLiterature;
      if (patch.taskUpdater) {
        const { id, updater } = patch.taskUpdater;
        const target = next.tasks.find((t: TaskRecord) => t.id === id);
        if (target) {
          const changes = updater(this.cloneData(target));
          if (changes && typeof changes === 'object') {
            next.tasks = next.tasks.map((t: TaskRecord) => (t.id === id ? { ...t, ...changes, id: t.id } : t));
          }
        }
        delete (next as Record<string, unknown>).taskUpdater;
      }
      if (patch.rescheduleTask) {
        const { taskID, days, fromDeadline } = patch.rescheduleTask;
        const task = next.tasks.find((t: TaskRecord) => t.id === taskID);
        if (!task) throw new Error('任务已被删除，请刷新后重试');
        if (![0, 3, 7].includes(days)) throw new Error('不支持的改期选项');
        const today = LiteratureWorkflow.dateAfter(0);
        const base = fromDeadline && task.dueDate && task.dueDate > today ? new Date(task.dueDate + 'T12:00:00') : new Date();
        next.tasks = next.tasks.map((t: TaskRecord) =>
          t.id === taskID
            ? { ...t, dueDate: LiteratureWorkflow.dateAfter(days, base), reminder: { ...t.reminder, notified: false } }
            : t
        );
      }
      delete (next as Record<string, unknown>).rescheduleTask;
      if (patch.activeTimerChanges) {
        next.activeTimers = { ...current.activeTimers };
        for (const [id, timer] of Object.entries(patch.activeTimerChanges)) {
          if (timer) next.activeTimers[id] = timer;
          else delete next.activeTimers[id];
        }
        delete (next as Record<string, unknown>).activeTimerChanges;
      }
      TaskRules.applyTimerAction(next, patch.timerAction);
      delete (next as Record<string, unknown>).timerAction;
      const notificationResult = TaskRules.applyNotificationAction(next, patch.notificationAction);
      delete (next as Record<string, unknown>).notificationAction;
      if (patch.taskChanges || patch.taskUpdater) {
        for (const task of [...next.tasks]) {
          const was = current.tasks.find((t: TaskRecord) => t.id === task.id);
          if (task.completed && !was?.completed) {
            const recurring = TaskRules.buildNextTask(
              task,
              next.tasks,
              () => 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)
            );
            if (recurring) next.tasks.push(recurring);
          }
        }
      }
      const seen = new Set<string>();
      next.tasks = next.tasks.filter((t: TaskRecord) => Boolean(t && t.id && !seen.has(t.id) && seen.add(t.id)));
      next.tasks.sort((a: TaskRecord, b: TaskRecord) => (a.order || 0) - (b.order || 0));
      next.revision = (current.revision || 0) + 1;
      const ids = new Set(next.tasks.map((t: TaskRecord) => t.id));
      next.activeTimers = Object.fromEntries(
        Object.entries(next.activeTimers || {}).filter(([id]) => ids.has(id))
      );
      const filePath = this.getDataFilePath();
      try {
        await IOUtils.writeUTF8(filePath, JSON.stringify(next, null, 2), { tmpPath: filePath + '.tmp' });
      } catch (error) {
        const info = formatErrorInfo(error);
        Zotero.logError?.('[TaskFlow] 数据保存失败: ' + error);
        void this.recordDiagnostic({ action: '保存待办数据', message: info.message, stack: info.stack });
        throw error;
      }
      this._cachedData = next;
      if (patch.tasks) {
        this._paneDeleted = [];
        if (this._paneUndoTimer) {
          clearTimeout(this._paneUndoTimer);
          this._paneUndoTimer = null;
        }
      }
      this.notifyDataChanged();
      if (patch.syncLinkedItems) {
        try {
          await this.syncLinkedTaskChanges(current, next);
        } catch (error) {
          Zotero.logError?.('[TaskFlow] 任务已保存，文献联动更新失败: ' + error);
        }
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

  async syncLinkedTaskChanges(before: TaskFlowData, after: TaskFlowData): Promise<void> {
    const previous = new Map(before.tasks.map((t: TaskRecord) => [t.id, t]));
    const current = new Map(after.tasks.map((t: TaskRecord) => [t.id, t]));
    const affected = new Map<string, { task: TaskRecord; syncNote: boolean }>();
    const userLib = Zotero.Libraries?.userLibraryID || 1;
    for (const id of new Set([...previous.keys(), ...current.keys()])) {
      const oldTask = previous.get(id);
      const newTask = current.get(id);
      if (JSON.stringify(oldTask) === JSON.stringify(newTask)) continue;
      for (const task of [oldTask, newTask]) {
        if (!task?.zoteroItemKey) continue;
        const key = String(task.zoteroLibraryID || userLib) + ':' + task.zoteroItemKey;
        const onlySubtasks =
          oldTask &&
          newTask &&
          JSON.stringify({ ...oldTask, subtasks: null }) === JSON.stringify({ ...newTask, subtasks: null });
        affected.set(key, {
          task,
          syncNote: Boolean(
            affected.get(key)?.syncNote || !onlySubtasks || this.getPref('childNoteAutoUpdateOnSubtask', true)
          )
        });
      }
    }
    for (const { task, syncNote } of affected.values()) {
      try {
        const libraryID = task.zoteroLibraryID || userLib;
        const item = this.resolveItemReference(task.zoteroItemKey, libraryID);
        if (!item) continue;
        await this.tagItemOnTaskEvent(task.zoteroItemKey as string, 'complete_check', libraryID);
        if (syncNote && this.getPref('autoSyncChildNote', true)) {
          const note = await this.syncTasksToChildNote(item, null, { silent: true });
          if (!note) Zotero.logError?.('[TaskFlow] 任务已保存，但子笔记未能更新: ' + task.zoteroItemKey);
        }
      } catch (error) {
        Zotero.logError?.('[TaskFlow] 任务已保存，文献联动更新失败: ' + task.zoteroItemKey + ': ' + error);
      }
    }
  }

  async settleActiveTimers(): Promise<void> {
    const data = await this.loadData();
    if (!data?.activeTimers || !Object.keys(data.activeTimers).length) return;
    await this.saveData({ timerAction: { type: 'stop_all', stoppedAt: Date.now() } });
  }

  async updateTaskState(
    id: string,
    change: Partial<TaskRecord> | ((task: TaskRecord) => Partial<TaskRecord>)
  ): Promise<TaskRecord | null> {
    const data = await this.loadData();
    const existing = data.tasks.find((t: TaskRecord) => t.id === id);
    if (!existing) return null;
    if (typeof change === 'function') {
      let matched = false;
      const saved = await this.saveData({
        taskUpdater: {
          id,
          updater: (latestTask: TaskRecord) => {
            matched = true;
            return change(latestTask);
          }
        },
        expectedTasksGeneration: data.tasksGeneration || 0
      });
      return matched ? saved.tasks.find((t: TaskRecord) => t.id === id) || null : null;
    }
    const saved = await this.saveData({
      taskChanges: { updated: [{ id, changes: change }] },
      expectedTasksGeneration: data.tasksGeneration || 0
    });
    return saved.tasks.find((t: TaskRecord) => t.id === id) || null;
  }

  registerDataListener(listener: (data: TaskFlowData) => void, options?: { signal?: AbortSignal }): void {
    const signal = options?.signal;
    if (signal?.aborted) return;
    this._dataListeners.add(listener);
    if (signal) {
      signal.addEventListener('abort', () => {
        this._dataListeners.delete(listener);
      }, { once: true });
    }
  }

  unregisterDataListener(listener: (data: TaskFlowData) => void): void {
    this._dataListeners.delete(listener);
  }

  notifyDataChanged(): void {
    for (const win of injectedElements.keys()) {
      try {
        if (!win.closed) this.updateToolbarBadge(win.document, this._cachedData);
      } catch (error) {
        Zotero.logError?.('[TaskFlow] Toolbar count refresh failed: ' + error);
      }
    }
    for (const client of this._uiClients || []) {
      try {
        if (client.closed) {
          this._uiClients.delete(client);
          continue;
        }
        client.postMessage({ type: 'TASKFLOW_DATA_CHANGED', data: this.cloneData(this._cachedData) }, '*');
      } catch (_) {
        this._uiClients.delete(client);
      }
    }
    for (const listener of this._dataListeners) {
      try {
        listener(this.cloneData(this._cachedData as TaskFlowData));
      } catch (e) {
        Zotero.logError?.('[TaskFlow] Error in data listener: ' + e);
      }
    }
  }
}
