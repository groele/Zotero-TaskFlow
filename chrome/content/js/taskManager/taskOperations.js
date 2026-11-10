// Task lifecycle, completion, duplication and subtask operations submodule for TaskManager

const TaskOperations = {
  setCompletion(task, completed) {
    task.completed = Boolean(completed);
    task.completedAt = completed ? (task.completedAt || new Date().toISOString()) : null;
    task.status = completed ? 'done' : 'todo';
    if (completed) (task.subtasks || []).forEach(st => { st.completed = true; });
  },

  syncSubtaskCompletion(task) {
    if (!task.subtasks?.length) return;
    const allDone = task.subtasks.every(st => st.completed);
    if (allDone || task.completed) this.setCompletion(task, allDone);
  },

  appendRecurringTask(task) {
    if (!task.completed || !task.repeat || typeof Recurring === 'undefined') return;
    const next = Recurring.buildNextTask(task, this._tasks);
    if (next) this._tasks.push(next);
  },

  // Toggle task completion
  async toggleComplete(id) {
    const index = this._tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    const task = this._tasks[index];
    this.setCompletion(task, !task.completed);

    // Sync subtask completion when completing parent task
    if (task.completed && task.subtasks?.length > 0) {
      task.subtasks.forEach(st => st.completed = true);
    }

    this.appendRecurringTask(task);
    await Storage.saveTasks(this._tasks, this._baseline);
    return task;
  },

  // Duplicate a task
  async duplicateTask(id) {
    const original = this.getTaskById(id);
    if (!original) return null;

    const newTask = {
      ...original,
      id: Utils.generateId(),
      title: original.title + ' (副本)',
      completed: false,
      status: 'todo',
      completedAt: null,
      createdAt: new Date().toISOString(),
      order: Math.max(-1, ...this._tasks.map(t => t.order || 0)) + 1,
      reminder: { ...original.reminder, notified: false },
      tags: [...(original.tags || [])],
      timeEntries: [],
      recurringFrom: null,
      recurringGenerated: false,
      subtasks: (original.subtasks || []).map(st => ({
        ...st,
        id: Utils.generateId(),
        completed: false
      }))
    };

    this._tasks = this._tasks.filter(t => t.id !== newTask.id);
    this._tasks.push(newTask);
    await Storage.saveTasks(this._tasks, this._baseline);
    return newTask;
  },

  // Subtask operations
  async addSubtask(taskId, subtaskTitle) {
    if (!String(subtaskTitle || '').trim()) throw new Error('子任务标题不能为空');
    const task = this.getTaskById(taskId);
    if (!task) return null;

    const subtask = {
      id: Utils.generateId(),
      title: subtaskTitle.trim(),
      completed: false
    };

    if (!task.subtasks) task.subtasks = [];
    task.subtasks.push(subtask);

    // Adding an incomplete subtask uncompletes parent if completed
    if (task.completed) {
      task.completed = false;
      task.completedAt = null;
      task.status = Utils.isOverdue(task.dueDate) ? 'overdue' : 'todo';
    }

    await Storage.saveTasks(this._tasks, this._baseline);
    return subtask;
  },

  async toggleSubtask(taskId, subtaskId) {
    const task = this.getTaskById(taskId);
    if (!task || !task.subtasks) return null;

    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return null;

    subtask.completed = !subtask.completed;

    // Auto-sync parent completion
    const allCompleted = task.subtasks.length > 0 && task.subtasks.every(st => st.completed);
    if (allCompleted) {
      task.completed = true;
      task.completedAt = task.completedAt || new Date().toISOString();
      task.status = 'done';
    } else if (!subtask.completed && task.completed) {
      task.completed = false;
      task.completedAt = null;
      task.status = Utils.isOverdue(task.dueDate) ? 'overdue' : 'todo';
    }

    this.appendRecurringTask(task);
    await Storage.saveTasks(this._tasks, this._baseline);
    return subtask;
  },

  async deleteSubtask(taskId, subtaskId) {
    const task = this.getTaskById(taskId);
    if (!task || !task.subtasks) return null;

    task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
    this.syncSubtaskCompletion(task);
    this.appendRecurringTask(task);
    await Storage.saveTasks(this._tasks, this._baseline);
    return true;
  },

  async updateSubtask(taskId, subtaskId, newTitle) {
    if (!String(newTitle || '').trim()) throw new Error('子任务标题不能为空');
    const task = this.getTaskById(taskId);
    if (!task || !task.subtasks) return null;

    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return null;

    subtask.title = newTitle.trim();
    await Storage.saveTasks(this._tasks, this._baseline);
    return subtask;
  },

  async recordTime(taskId, elapsed) {
    const task = this.getTaskById(taskId);
    if (!task) return null;
    task.timeEntries = [...(task.timeEntries || []), { date: new Date().toISOString(), duration: elapsed }];
    await Storage.saveTasks(this._tasks, this._baseline, { activeTimerChanges: { [taskId]: null } });
    return task;
  }
};

if (typeof window !== 'undefined') {
  window.TaskOperations = TaskOperations;
}

