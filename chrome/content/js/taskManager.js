// Task Manager - Business logic for task operations

const TaskManager = {
  // In-memory cache of tasks
  _tasks: [],
  _undoTimeout: null,
  _deletedTasks: [],
  undoDuration: 8000,
  _selectedTasks: new Set(),
  _selectionMode: false,
  _literatureFilter: null,

  setLiteratureFilter(key) {
    this._literatureFilter = key;
  },

  getLiteratureFilter() {
    return this._literatureFilter;
  },

  clearLiteratureFilter() {
    this._literatureFilter = null;
  },

  // Load tasks from storage with automatic deduplication
  async loadTasks() {
    const raw = await Storage.getTasks();
    const seen = new Set();
    const unique = [];
    for (const t of (raw || [])) {
      if (!t || !t.id) continue;
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      unique.push(t);
    }
    this._tasks = unique;
    this._baseline = Storage.clone(unique);
    this._selectedTasks = new Set([...this._selectedTasks].filter(id => seen.has(id)));
    if (raw && raw.length !== unique.length) {
      await Storage.saveTasks(this._tasks, this._baseline);
    }
    return this._tasks;
  },

  // Get all tasks
  getTasks() {
    return [...this._tasks];
  },

  // Add a new task (ensures exactly 1 task added without double push)
  async addTask(taskData) {
    if (!String(taskData.title || '').trim()) throw new Error('任务标题不能为空');
    const task = {
      id: Utils.generateId(),
      title: String(taskData.title).trim(),
      description: String(taskData.description || '').trim(),
      dueDate: taskData.dueDate || null,
      dueTime: taskData.dueTime || null,
      priority: taskData.priority || Storage.getPreference('defaultPriority', 'medium'),
      category: String(taskData.category || '').trim(),
      completed: Boolean(taskData.completed),
      status: taskData.completed ? 'done' : (taskData.status === 'in-progress' ? 'in-progress' : 'todo'),
      createdAt: new Date().toISOString(),
      completedAt: taskData.completed ? new Date().toISOString() : null,
      subtasks: taskData.subtasks || [],
      reminder: taskData.reminder || { enabled: false, before: 15, notified: false },
      order: Math.max(-1, ...this._tasks.map(t => t.order || 0)) + 1,
      tags: taskData.tags || [],
      repeat: taskData.repeat || null,
      zoteroItemKey: taskData.zoteroItemKey || null,
      zoteroItemTitle: taskData.zoteroItemTitle || null,
      zoteroAuthors: taskData.zoteroAuthors || null,
      zoteroYear: taskData.zoteroYear || null,
      zoteroLibraryID: taskData.zoteroLibraryID || null,
      zoteroPublication: taskData.zoteroPublication || null,
      zoteroPage: taskData.zoteroPage || null,
      zoteroQuote: taskData.zoteroQuote || null,
      recurringFrom: taskData.recurringFrom || null,
      zoteroUri: taskData.zoteroUri || null,
      zoteroPdfUri: taskData.zoteroPdfUri || null,
      zoteroItemID: taskData.zoteroItemID || null,
      zoteroAttachmentKey: taskData.zoteroAttachmentKey || null,
      zoteroAnnotationKey: taskData.zoteroAnnotationKey || null,
      zoteroLinkStatus: taskData.zoteroLinkStatus || null,
      zoteroAutoTitle: Boolean(taskData.zoteroAutoTitle),
      literatureWorkflowId: taskData.literatureWorkflowId || null,
      readingProfile: taskData.readingProfile || null,
      academicType: taskData.academicType || null
    };

    if (task.completed) this.setCompletion(task, true);

    // Prevent duplicate entries
    this._tasks = this._tasks.filter(t => t.id !== task.id);
    this._tasks.push(task);
    await Storage.saveTasks(this._tasks, this._baseline);
    return task;
  },

  // Alias for compatibility
  async createTask(taskData) {
    return this.addTask(taskData);
  },

  // Update an existing task
  async updateTask(id, changes) {
    const index = this._tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    changes = { ...changes };
    delete changes.id;
    if (changes.title != null && !String(changes.title).trim()) throw new Error('任务标题不能为空');
    if (changes.reminder !== undefined) {
      const previous = this._tasks[index].reminder || {};
      changes.reminder = { ...previous, ...changes.reminder };
      if (changes.reminder.enabled !== previous.enabled || changes.reminder.before !== previous.before) {
        changes.reminder.notified = false;
      }
    }
    if ((changes.dueDate !== undefined && changes.dueDate !== this._tasks[index].dueDate) ||
        (changes.dueTime !== undefined && changes.dueTime !== this._tasks[index].dueTime)) {
      changes.reminder = { ...this._tasks[index].reminder, ...changes.reminder, notified: false };
    }
    // Clean up changes
    if (changes.title != null) changes.title = String(changes.title).trim();
    if (changes.description != null) changes.description = String(changes.description).trim();
    if (changes.category != null) changes.category = String(changes.category).trim();

    // If due date changed and was previously marked overdue, clear stale status
    if (changes.dueDate !== undefined && this._tasks[index].status === 'overdue') {
      if (!Utils.isOverdue(changes.dueDate)) {
        changes.status = 'todo';
      }
    }

    this._tasks[index] = { ...this._tasks[index], ...changes };
    const task = this._tasks[index];
    if (changes.subtasks !== undefined && task.subtasks.length) {
      this.syncSubtaskCompletion(task);
    } else if (changes.completed !== undefined) {
      this.setCompletion(task, task.completed);
    } else if (changes.status !== undefined) {
      this.setCompletion(task, changes.status === 'done');
      if (!task.completed && changes.status === 'in-progress') task.status = 'in-progress';
    }
    this.appendRecurringTask(task);
    await Storage.saveTasks(this._tasks, this._baseline);
    return this._tasks[index];
  },

  // Delete a task with undo support
  async deleteTask(id) {
    const index = this._tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    const deleted = Storage.clone(this._tasks[index]);
    this._tasks.splice(index, 1);
    await Storage.saveTasks(this._tasks, this._baseline);
    this._selectedTasks.delete(id);
    this.rememberDeleted([{ task: deleted, index }]);
    return deleted;
  },

  rememberDeleted(entries) {
    this._deletedTasks.push(...entries);
    clearTimeout(this._undoTimeout);
    this._undoTimeout = setTimeout(() => { this._deletedTasks = []; this._undoTimeout = null; }, this.undoDuration);
  },

  clearUndo() {
    this._deletedTasks = [];
    clearTimeout(this._undoTimeout);
    this._undoTimeout = null;
    this.clearSelection();
  },

  // Undo last deletion
  async undoDelete() {
    if (!this._deletedTasks.length) return false;
    const entries = this._deletedTasks;
    for (const entry of [...entries].reverse()) {
      if (!this.getTaskById(entry.task.id)) this._tasks.splice(Math.min(entry.index, this._tasks.length), 0, entry.task);
    }
    await Storage.saveTasks(this._tasks, this._baseline);
    this._deletedTasks = [];
    if (this._undoTimeout) {
      clearTimeout(this._undoTimeout);
      this._undoTimeout = null;
    }

    return entries.map(entry => entry.task);
  },

  // Get task by ID
  getTaskById(id) {
    return this._tasks.find(t => t.id === id) || null;
  }
};

// Compose submodules into main coordinator
Object.assign(
  TaskManager,
  typeof TaskQueries !== 'undefined' ? TaskQueries : (typeof window !== 'undefined' ? window.TaskQueries : {}),
  typeof TaskBatch !== 'undefined' ? TaskBatch : (typeof window !== 'undefined' ? window.TaskBatch : {}),
  typeof TaskOperations !== 'undefined' ? TaskOperations : (typeof window !== 'undefined' ? window.TaskOperations : {})
);

// Serialize local mutations, refresh before editing, and roll back the UI on persistence failure.
TaskManager._mutationQueue = Promise.resolve();
for (const name of ['addTask', 'updateTask', 'deleteTask', 'undoDelete', 'toggleComplete',
  'duplicateTask', 'addSubtask', 'toggleSubtask', 'deleteSubtask', 'updateSubtask',
  'batchComplete', 'batchDelete', 'moveTaskToKanbanColumn', 'moveTaskInList', 'recordTime']) {
  const operation = TaskManager[name];
  TaskManager[name] = function(...args) {
    const run = async () => {
      this._mutating = true;
      try {
        await this.loadTasks();
        const before = Storage.clone(this._tasks);
        try {
          const result = await operation.apply(this, args);
          if (Storage._zoteroCache) {
            this._tasks = Storage.clone(Storage._zoteroCache.tasks);
            if (typeof TimeTracking !== 'undefined') TimeTracking.activeTimers = Storage._zoteroCache.activeTimers || {};
          }
          this._baseline = Storage.clone(this._tasks);
          return result;
        } catch (error) {
          this._tasks = before;
          throw error;
        }
      } finally {
        this._mutating = false;
        if (typeof UI !== 'undefined' && UI._storageReady) {
          try { UI.render(); }
          catch (error) { Diagnostics.report('刷新任务列表', error); }
        }
      }
    };
    const result = this._mutationQueue.then(run);
    this._mutationQueue = result.catch(() => {});
    return result;
  };
}

if (typeof window !== 'undefined') {
  window.TaskManager = TaskManager;
}
