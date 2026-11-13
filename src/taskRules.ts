/**
 * Zotero TaskFlow - Pure Task Rules Engine
 */
// Pure rules shared by the Gecko host and task windows.
import type {
  ActiveTimerRecord,
  CustomTagRecord,
  CustomTemplateRecord,
  ImportMode,
  NotificationActionPatch,
  NotificationActionResult,
  SaveDataPatch,
  SubtaskRecord,
  TaskFlowData,
  TaskRecord,
  TimerActionPatch
} from './types/models';

const DAY_OFFSETS: Record<string, number> = { daily: 1, weekly: 7, biweekly: 14 };
const MONTH_OFFSETS: Record<string, number> = { monthly: 1, quarterly: 3, yearly: 12 };

function parseStrictDate(value: string | null | undefined): { year: number; month: number; day: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return { year, month, day };
}

export const TaskRules = {
  applyCollectionChanges(current: TaskFlowData, next: TaskFlowData, patch: SaveDataPatch): void {
    const specs: Array<['customTags', 'customTagChanges'] | ['customTemplates', 'customTemplateChanges']> = [
      ['customTags', 'customTagChanges'],
      ['customTemplates', 'customTemplateChanges']
    ];
    for (const [key, command] of specs) {
      const changes = patch[command];
      delete (next as Record<string, unknown>)[command];
      if (!changes) continue;
      const { added = [], deleted = [] } = changes as { added?: Array<CustomTagRecord | CustomTemplateRecord>; deleted?: string[] };
      if (!Array.isArray(added) || !Array.isArray(deleted) || deleted.some((id: unknown) => typeof id !== 'string')) {
        throw new Error('标签或模板修改格式无效');
      }
      const removed = new Set(deleted);
      const currentEntries = (current[key] || []) as Array<CustomTagRecord | CustomTemplateRecord>;
      const entries = currentEntries.filter((entry) => !removed.has(entry.id));
      const ids = new Set(entries.map((entry) => entry.id));
      for (const entry of added) {
        if (!entry || typeof entry.id !== 'string' || !entry.id || typeof entry.name !== 'string' || !entry.name.trim()) {
          throw new Error('标签或模板内容无效');
        }
        if (key === 'customTemplates') {
          const tpl = entry as CustomTemplateRecord;
          if (!tpl.task || typeof tpl.task.title !== 'string' || !tpl.task.title.trim()) {
            throw new Error('模板标题不能为空');
          }
        }
        if (!ids.has(entry.id)) {
          entries.push(entry);
          ids.add(entry.id);
        }
      }
      (next as Record<string, unknown>)[key] = entries;
    }
    delete (next as Record<string, unknown>).searchHistoryAdd;
    if (patch.searchHistoryAdd != null) {
      const query = patch.searchHistoryAdd;
      if (typeof query !== 'string' || query.trim().length < 2) throw new Error('搜索记录无效');
      const trimmed = query.trim();
      next.searchHistory = [trimmed, ...(current.searchHistory || []).filter((value: string) => value !== trimmed)].slice(0, 10);
    }
  },
  applyTaskGeneration(current: TaskFlowData, next: TaskFlowData, patch: SaveDataPatch): void {
    if (patch.expectedTasksGeneration != null && patch.expectedTasksGeneration !== (current.tasksGeneration || 0)) {
      throw new Error('任务已被清空或替换，请重新加载后重试');
    }
    delete (next as Record<string, unknown>).expectedTasksGeneration;
    if (patch.tasks) next.tasksGeneration = (current.tasksGeneration || 0) + 1;
  },
  reminderFingerprint(task: TaskRecord | null | undefined): string {
    return JSON.stringify([
      task?.dueDate ?? null,
      task?.dueTime || '23:59',
      task?.reminder?.enabled,
      task?.reminder?.before ?? 15
    ]);
  },
  reminderIsDue(task: TaskRecord | null | undefined, now: number): boolean {
    if (!task || task.completed || !task.reminder?.enabled || task.reminder.notified || !task.dueDate) return false;
    if (!parseStrictDate(task.dueDate)) return false;
    const dueTime = task.dueTime || '23:59';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)) return false;
    const due = new Date(`${task.dueDate}T${dueTime}`).getTime();
    const before = Number(task.reminder.before ?? 15);
    return Number.isFinite(due) && Number.isFinite(before) && before >= 0 &&
      now >= due - before * 60000 && now <= due + 86400000;
  },
  // Reserve notification delivery in the same queue as task writes. Leases recover after a crashed window.
  applyNotificationAction(data: TaskFlowData, action: NotificationActionPatch | null | undefined): NotificationActionResult | null {
    if (!action) return null;
    const { type, kind, token, now, key } = action;
    if (!['claim', 'validate', 'ack', 'release'].includes(type) || !['reminders', 'summary'].includes(kind) ||
        typeof token !== 'string' || !token || !Number.isFinite(now)) throw new Error('提醒请求无效');
    const leases = data.notificationLeases = { ...data.notificationLeases };
    const result: NotificationActionResult = { tasks: [], summary: false };
    if (type === 'claim') {
      for (const [id, lease] of Object.entries(leases)) {
        if (lease.expiresAt <= now) delete leases[id];
      }
    }
    if (type !== 'claim') {
      if (!key) return result;
      const lease = leases[key];
      if (!lease || lease.token !== token) return result;
      if (type === 'validate') {
        const date = new Date(now);
        const today = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
          String(date.getDate()).padStart(2, '0')].join('-');
        const task = kind === 'reminders' ? data.tasks.find((t: TaskRecord) => 'task:' + t.id === key) || null : null;
        const valid = lease.expiresAt > now && (kind === 'summary'
          ? key === 'summary:' + today && lease.date === today && Boolean(data.settings?.dailySummary) &&
            (data.settings.summaryTime || '09:00') === lease.time && data.lastSummaryDate !== today
          : Boolean(task) && this.reminderIsDue(task, now) && this.reminderFingerprint(task) === lease.fingerprint);
        if (!valid) { delete leases[key]; return result; }
        lease.expiresAt = now + 60000;
        if (kind === 'summary') { result.summary = true; result.key = key; }
        else if (task) result.tasks.push({ task: JSON.parse(JSON.stringify(task)) as TaskRecord, key });
        return result;
      }
      if (type === 'ack') {
        if (kind === 'summary') data.lastSummaryDate = lease.date;
        else {
          const task = data.tasks.find((t: TaskRecord) => 'task:' + t.id === key);
          if (task && this.reminderFingerprint(task) === lease.fingerprint) {
            task.reminder = { ...task.reminder, notified: true, notifiedFor: lease.fingerprint };
          }
        }
      }
      delete leases[key];
      return result;
    }
    if (kind === 'summary') {
      const date = new Date(now);
      const today = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')].join('-');
      const time = String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
      const leaseKey = 'summary:' + today;
      if (data.settings?.dailySummary && (data.settings.summaryTime || '09:00') === time &&
          data.lastSummaryDate !== today && !leases[leaseKey]) {
        leases[leaseKey] = { token, date: today, time, expiresAt: now + 60000 };
        result.summary = true;
        result.key = leaseKey;
      }
      return result;
    }
    for (const task of data.tasks) {
      if (!this.reminderIsDue(task, now)) continue;
      const leaseKey = 'task:' + task.id;
      const fingerprint = this.reminderFingerprint(task);
      if (leases[leaseKey]?.fingerprint === fingerprint) continue;
      leases[leaseKey] = { token, fingerprint, expiresAt: now + 60000 };
      result.tasks.push({ task: JSON.parse(JSON.stringify(task)) as TaskRecord, key: leaseKey });
    }
    return result;
  },
  // Run inside the storage write queue, against the latest committed snapshot.
  applyTimerAction(data: TaskFlowData, action: TimerActionPatch | null | undefined): void {
    if (!action) return;
    const { type, taskId, timer, startTime, stoppedAt, sessionId } = action;
    if (!['start', 'stop', 'stop_all'].includes(type)) throw new Error('计时操作无效');
    data.activeTimers = Object.assign(Object.create(null) as Record<string, ActiveTimerRecord>, data.activeTimers);
    if (type === 'stop_all') {
      const stopTs = typeof stoppedAt === 'number' && Number.isFinite(stoppedAt) ? stoppedAt : Date.now();
      for (const [id, active] of Object.entries(data.activeTimers)) {
        if (!active || !Number.isFinite(active.startTime)) continue;
        const targetTask = data.tasks.find((t: TaskRecord) => t.id === id);
        if (targetTask) {
          targetTask.timeEntries = [
            ...(targetTask.timeEntries || []),
            { date: new Date(stopTs).toISOString(), duration: Math.max(0, stopTs - active.startTime) }
          ];
        }
      }
      data.activeTimers = Object.create(null) as Record<string, ActiveTimerRecord>;
      return;
    }
    if (!taskId) throw new Error('计时任务无效');
    const task = data.tasks.find((t: TaskRecord) => t.id === taskId);
    if (type === 'start') {
      if (!timer || !Number.isFinite(timer.startTime)) throw new Error('计时数据无效');
      if (task && !data.activeTimers[taskId]) data.activeTimers[taskId] = timer;
    } else {
      const active = data.activeTimers[taskId];
      if (!active || active.startTime !== startTime || active.sessionId !== sessionId) return;
      if (typeof stoppedAt !== 'number' || !Number.isFinite(stoppedAt)) throw new Error('停止时间无效');
      if (task) task.timeEntries = [...(task.timeEntries || []), {
        date: new Date(stoppedAt).toISOString(), duration: Math.max(0, stoppedAt - startTime)
      }];
      delete data.activeTimers[taskId];
    }
  },
  prepareImport(
    current: TaskFlowData,
    payload: unknown,
    mode: ImportMode | string
  ): { patch: SaveDataPatch; imported: number } {
    const normalizedMode = mode === 'overwrite' ? 'replace' : mode;
    if (normalizedMode !== 'merge' && normalizedMode !== 'replace') throw new Error('导入模式无效');
    const source = (Array.isArray(payload) ? { tasks: payload } : payload) as Record<string, unknown> | null;
    if (!source || !Array.isArray(source.tasks)) throw new Error('无效的数据格式：缺少任务数组');
    const tasks = JSON.parse(JSON.stringify(source.tasks)) as TaskRecord[];
    const ids = new Set<string>();
    for (const task of tasks) {
      if (!task || typeof task.id !== 'string' || !task.id.trim() || ids.has(task.id) ||
          typeof task.title !== 'string' || !task.title.trim() || typeof task.completed !== 'boolean') {
        throw new Error('备份包含无效或重复任务，未导入任何数据');
      }
      ids.add(task.id);
      for (const key of ['description', 'category', 'zoteroItemTitle'] as const) {
        if (task[key] != null && typeof task[key] !== 'string') throw new Error('任务文本格式无效：' + key);
      }
      if (task.dueDate && !this.nextDueDate(task.dueDate, 'daily')) throw new Error('截止日期无效');
      if (task.dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(task.dueTime)) throw new Error('截止时间无效');
      if (task.reminder != null && (typeof task.reminder !== 'object' || Array.isArray(task.reminder))) {
        throw new Error('提醒格式无效');
      }
      for (const key of ['subtasks', 'tags', 'timeEntries'] as const) {
        if (task[key] != null && !Array.isArray(task[key])) throw new Error('任务字段格式无效：' + key);
      }
      const subIds = new Set<string>();
      task.subtasks = (task.subtasks || []).map((st: SubtaskRecord, index: number) => {
        if (!st || typeof st.title !== 'string' || !st.title.trim()) throw new Error('子任务格式无效');
        const id = st.id || task.id + '_sub_' + index;
        if (typeof id !== 'string' || subIds.has(id)) throw new Error('子任务标识无效或重复');
        subIds.add(id);
        return { ...st, id, completed: Boolean(st.completed) };
      });
      task.tags = task.tags || [];
      if (task.tags.some((tag: unknown) => typeof tag !== 'string')) throw new Error('任务标签格式无效');
      if ((task.timeEntries || []).some((entry) => !entry || !Number.isFinite(entry.duration) || entry.duration < 0 ||
          !Number.isFinite(Date.parse(entry.date)))) throw new Error('计时历史格式无效');
      task.title = task.title.trim();
      const status = typeof task.status === 'string' && ['in-progress', 'overdue'].includes(task.status) ? task.status : 'todo';
      task.status = task.completed ? 'done' : status;
      task.statusExplicit = Boolean(!task.completed && task.statusExplicit && ['todo', 'in-progress', 'overdue'].includes(task.status));
      if (!task.completed) task.completedAt = null;
      if (task.completed) task.subtasks.forEach((st: SubtaskRecord) => { st.completed = true; });
    }
    if (source.settings != null && (typeof source.settings !== 'object' || Array.isArray(source.settings))) {
      throw new Error('设置格式无效');
    }
    const patch: SaveDataPatch = {};
    const existingIds = new Set(current.tasks.map((t: TaskRecord) => t.id));
    const added = tasks.filter((t: TaskRecord) => !existingIds.has(t.id));
    if (normalizedMode === 'replace') {
      patch.tasks = tasks;
      patch.settings = (source.settings as Record<string, unknown>) || {};
      patch.replaceSettings = true;
      patch.activeTimers = {};
      patch.searchHistory = Array.isArray(source.searchHistory) ? (source.searchHistory as string[]) : [];
    } else patch.taskChanges = { added };
    for (const key of ['customTags', 'customTemplates'] as const) {
      if (source[key] != null && !Array.isArray(source[key])) throw new Error('标签或模板格式无效');
      const entries = JSON.parse(JSON.stringify(source[key] || [])) as Array<CustomTagRecord | CustomTemplateRecord>;
      const seen = new Set<string>();
      for (const entry of entries) {
        if (!entry || typeof entry.id !== 'string' || !entry.id || seen.has(entry.id) ||
            typeof entry.name !== 'string' || !entry.name.trim() ||
            (key === 'customTemplates' && (!('task' in entry) || !entry.task || typeof entry.task !== 'object' || Array.isArray(entry.task)))) {
          throw new Error('标签或模板内容无效或重复');
        }
        seen.add(entry.id);
        if (key === 'customTemplates') {
          const tpl = entry as CustomTemplateRecord;
          if (typeof tpl.task.title !== 'string' || !tpl.task.title.trim()) throw new Error('模板标题不能为空');
          if (tpl.task.subtasks != null && (!Array.isArray(tpl.task.subtasks) ||
              tpl.task.subtasks.some((st) => !st || typeof st.title !== 'string'))) throw new Error('模板子任务格式无效');
          tpl.task.subtasks = tpl.task.subtasks || [];
        }
      }
      if (normalizedMode === 'replace') (patch as Record<string, unknown>)[key] = entries;
      else if (source[key]) {
        const existing = (current[key] || []) as Array<CustomTagRecord | CustomTemplateRecord>;
        const existingEntryIds = new Set(existing.map((t) => t.id));
        (patch as Record<string, unknown>)[key] = [...existing, ...entries.filter((t) => !existingEntryIds.has(t.id))];
      }
    }
    if (source.searchHistory != null && (!Array.isArray(source.searchHistory) ||
        source.searchHistory.some((query: unknown) => typeof query !== 'string'))) throw new Error('搜索历史格式无效');
    return { patch, imported: normalizedMode === 'replace' ? tasks.length : added.length };
  },
  nextDueDate(value: string | null | undefined, pattern: string): string | null {
    const parsed = parseStrictDate(value);
    if (!parsed) return null;
    const { year, month, day } = parsed;
    const date = new Date(year, month - 1, day);
    const days = DAY_OFFSETS[pattern];
    const months = MONTH_OFFSETS[pattern];
    if (days) date.setDate(date.getDate() + days);
    else if (months) {
      date.setDate(1);
      date.setMonth(date.getMonth() + months);
      date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
    } else return null;
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  },
  buildNextTask(task: TaskRecord | null | undefined, tasks: TaskRecord[], generateId: () => string): TaskRecord | null {
    if (!task || !task.completed || !task.repeat || task.recurringGenerated) return null;
    const dueDate = this.nextDueDate(task.dueDate, task.repeat);
    if (!dueDate) return null;
    if (tasks.some((t: TaskRecord) => t.recurringFrom === task.id || (t.title === task.title && t.repeat === task.repeat &&
      t.dueDate === dueDate && t.zoteroItemKey === task.zoteroItemKey && t.zoteroLibraryID === task.zoteroLibraryID))) return null;
    task.recurringGenerated = true;
    const nextOrder = tasks.reduce((max: number, t: TaskRecord) => Math.max(max, Number(t.order) || 0), -1) + 1;
    return {
      ...(JSON.parse(JSON.stringify(task)) as TaskRecord),
      id: generateId(),
      dueDate,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      status: 'todo',
      order: nextOrder,
      timeEntries: [],
      recurringFrom: task.id,
      recurringGenerated: false,
      reminder: { ...task.reminder, notified: false },
      subtasks: (task.subtasks || []).map((st: SubtaskRecord) => ({ ...st, id: generateId(), completed: false }))
    };
  }
};

if (typeof globalThis !== 'undefined' && !(globalThis as Record<string, unknown>).TaskRules) {
  (globalThis as Record<string, unknown>).TaskRules = TaskRules;
}
