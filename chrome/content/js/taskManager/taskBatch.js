// Batch selection, batch actions and movement submodule for TaskManager

const TaskBatch = {
  // Batch selection operations
  toggleSelection(taskId) {
    if (this._selectedTasks.has(taskId)) {
      this._selectedTasks.delete(taskId);
    } else {
      this._selectedTasks.add(taskId);
    }
    return this._selectedTasks.size;
  },

  clearSelection() {
    this._selectedTasks.clear();
    this._selectionMode = false;
  },

  getSelectedCount() {
    return this._selectedTasks.size;
  },

  getSelectedTasks() {
    return Array.from(this._selectedTasks);
  },

  setSelectionMode(enabled) {
    this._selectionMode = enabled;
    if (!enabled) {
      this._selectedTasks.clear();
    }
  },

  isSelectionMode() {
    return this._selectionMode;
  },

  isTaskSelected(taskId) {
    return this._selectedTasks.has(taskId);
  },

  // Batch complete selected tasks
  async batchComplete() {
    const selected = Array.from(this._selectedTasks);
    let count = 0;
    for (const id of selected) {
      const task = this.getTaskById(id);
      if (task && !task.completed) {
        this.setCompletion(task, true);
        this.appendRecurringTask(task);
        count++;
      }
    }
    await Storage.saveTasks(this._tasks, this._baseline);
    this.clearSelection();
    return count;
  },

  // Batch delete selected tasks
  async batchDelete() {
    const deleted = this._tasks.map((task, index) => ({ task: Storage.clone(task), index }))
      .filter(entry => this._selectedTasks.has(entry.task.id));
    this._tasks = this._tasks.filter(t => !this._selectedTasks.has(t.id));
    await Storage.saveTasks(this._tasks, this._baseline);
    this.rememberDeleted(deleted.reverse());
    this.clearSelection();
    return deleted.length;
  },

  // Move a task between kanban columns and persist the status change cleanly, with precise reordering
  async moveTaskToKanbanColumn(taskId, column, targetTaskId = null) {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    const now = new Date().toISOString();
    const changes = {};

    if (column === 'done') {
      changes.completed = true;
      changes.completedAt = task.completedAt || now;
      changes.status = 'done';
    } else if (column === 'todo') {
      changes.completed = false;
      changes.completedAt = null;
      changes.status = 'todo';
    } else if (column === 'in-progress') {
      changes.completed = false;
      changes.completedAt = null;
      changes.status = 'in-progress';
    } else if (column === 'overdue') {
      changes.completed = false;
      changes.completedAt = null;
      changes.status = 'overdue';
      if (!Utils.isOverdue(task.dueDate)) return null;
    } else {
      return null;
    }

    Object.assign(task, changes);
    if (column === 'done') this.setCompletion(task, true);
    this.appendRecurringTask(task);
    task.updatedAt = now;

    // Handle position reordering if targetTaskId is specified
    if (targetTaskId && targetTaskId !== taskId) {
      const draggedIdx = this._tasks.findIndex(t => t.id === taskId);
      if (draggedIdx !== -1) {
        const [draggedItem] = this._tasks.splice(draggedIdx, 1);
        const targetIdx = this._tasks.findIndex(t => t.id === targetTaskId);
        if (targetIdx !== -1) {
          this._tasks.splice(targetIdx, 0, draggedItem);
        } else {
          this._tasks.push(draggedItem);
        }
      }
    }

    // Keep order property sequential
    this._tasks.forEach((t, idx) => {
      t.order = idx;
    });

    await Storage.saveTasks(this._tasks, this._baseline);
    return task;
  },

  async moveTaskInList(taskId, targetId, after, section) {
    const task = this.getTaskById(taskId);
    if (!task) return null;
    if (section === 'completed') this.setCompletion(task, true);
    else if (section) {
      this.setCompletion(task, false);
      // These list groups explicitly represent dates; changing group schedules the task.
      const date = new Date();
      if (section === 'today') task.dueDate = Utils.toDateISO(date);
      else if (section === 'overdue' && !Utils.isOverdue(task.dueDate)) {
        date.setDate(date.getDate() - 1); task.dueDate = Utils.toDateISO(date);
      } else if (section === 'upcoming' && (Utils.isToday(task.dueDate) || Utils.isOverdue(task.dueDate))) {
        date.setDate(date.getDate() + 1); task.dueDate = Utils.toDateISO(date);
      }
      task.reminder = { ...task.reminder, notified: false };
    }
    if (targetId && targetId !== taskId) {
      this._tasks.splice(this._tasks.indexOf(task), 1);
      const targetIndex = this._tasks.findIndex(t => t.id === targetId);
      this._tasks.splice(targetIndex < 0 ? this._tasks.length : targetIndex + (after ? 1 : 0), 0, task);
    }
    this.appendRecurringTask(task);
    this._tasks.forEach((t, index) => { t.order = index; });
    await Storage.saveTasks(this._tasks, this._baseline);
    return task;
  }
};

if (typeof window !== 'undefined') {
  window.TaskBatch = TaskBatch;
}

