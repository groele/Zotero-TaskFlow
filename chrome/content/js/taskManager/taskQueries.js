// Task Queries, Filtering, Sorting and Grouping submodule for TaskManager

const TaskQueries = {
  // Filter tasks
  getFilteredTasks(filters = {}) {
    let filtered = [...this._tasks];
    if (filters.showCompleted === false && filters.status !== 'completed') {
      filtered = filtered.filter(t => !t.completed);
    }

    // Filter by search query
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(t =>
        (t.title || '').toLowerCase().includes(query) ||
        (t.description || '').toLowerCase().includes(query) ||
        (t.category || '').toLowerCase().includes(query) ||
        (t.zoteroItemTitle || '').toLowerCase().includes(query) ||
        (t.tags || []).some(tag => {
          const resolved = typeof Tags !== 'undefined' ? Tags.getAllTags().find(t => t.id === tag) : null;
          return String(resolved?.name || tag).toLowerCase().includes(query);
        })
      );
    }

    // Filter by priority
    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }

    // Filter by category
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(t => t.category === filters.category || t.academicType === filters.category);
    }

    // Filter by literature
    const litKey = filters.literatureKey || this._literatureFilter;
    if (litKey) {
      if (litKey === '__has_literature__') {
        filtered = filtered.filter(t => Boolean(t.zoteroItemKey));
      } else {
        filtered = filtered.filter(t => t.zoteroItemKey === litKey);
      }
    }

    // Filter by academic type
    if (filters.academicType && filters.academicType !== 'all') {
      filtered = filtered.filter(t => t.academicType === filters.academicType);
    }

    // Filter by status
    if (filters.status) {
      switch (filters.status) {
        case 'literature':
          filtered = filtered.filter(t => Boolean(t.zoteroItemKey) || (t.academicType && t.academicType !== 'generic'));
          break;
        case 'today':
          filtered = filtered.filter(t => !t.completed && Utils.isToday(t.dueDate));
          break;
        case 'upcoming':
          filtered = filtered.filter(t => !t.completed && t.dueDate && !Utils.isOverdue(t.dueDate) && !Utils.isToday(t.dueDate));
          break;
        case 'completed':
          filtered = filtered.filter(t => t.completed);
          break;
        case 'overdue':
          filtered = filtered.filter(t => !t.completed && Utils.isOverdue(t.dueDate));
          break;
        case 'all':
        default:
          // No filter
          break;
      }
    }

    // Filter by date (for calendar view)
    if (filters.date) {
      filtered = filtered.filter(t => t.dueDate === filters.date);
    }

    return filtered;
  },

  // Sort tasks
  getSortedTasks(tasks, sortOrder = 'dueDate') {
    const sorted = [...tasks];

    sorted.sort((a, b) => {
      // Completed tasks always go to bottom
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      switch (sortOrder) {
        case 'dueDate':
          // Tasks without dates go to bottom
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          const da = Utils.parseLocalDate ? Utils.parseLocalDate(a.dueDate) : new Date(a.dueDate);
          const db = Utils.parseLocalDate ? Utils.parseLocalDate(b.dueDate) : new Date(b.dueDate);
          return da - db;

        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const pa = priorityOrder[a.priority] ?? 1;
          const pb = priorityOrder[b.priority] ?? 1;
          return pa - pb;

        case 'created':
          return new Date(b.createdAt) - new Date(a.createdAt);

        case 'alpha':
          return a.title.localeCompare(b.title);

        case 'order':
          return (a.order || 0) - (b.order || 0);

        default:
          return 0;
      }
    });

    return sorted;
  },

  // Group tasks by section (overdue, today, upcoming, completed)
  getGroupedTasks(filters = {}) {
    const filtered = this.getFilteredTasks(filters);
    const sorted = this.getSortedTasks(filtered, filters.sortOrder || 'order');

    const groups = {
      overdue: [],
      today: [],
      upcoming: [],
      completed: []
    };

    sorted.forEach(task => {
      if (task.completed) {
        groups.completed.push(task);
      } else if (Utils.isOverdue(task.dueDate)) {
        groups.overdue.push(task);
      } else if (Utils.isToday(task.dueDate)) {
        groups.today.push(task);
      } else if (task.dueDate) {
        groups.upcoming.push(task);
      } else {
        // Tasks without due date go to upcoming
        groups.upcoming.push(task);
      }
    });

    return groups;
  },

  // Get tasks for kanban view
  getKanbanTasks(filters = {}) {
    const tasks = this.getSortedTasks(this.getFilteredTasks(filters), filters.sortOrder || 'order');

    return {
      overdue: tasks.filter(t => !t.completed && this.getKanbanStatus(t) === 'overdue'),
      todo: tasks.filter(t => !t.completed && this.getKanbanStatus(t) === 'todo'),
      'in-progress': tasks.filter(t => !t.completed && this.getKanbanStatus(t) === 'in-progress'),
      done: tasks.filter(t => t.completed || this.getKanbanStatus(t) === 'done')
    };
  },

  // Resolve a task's kanban column with explicit user drag priority
  getKanbanStatus(task) {
    if (!task) return 'todo';
    if (task.completed || task.status === 'done') return 'done';

    // 1. Explicit user status takes priority (from kanban drag or explicit setting)
    if (task.statusExplicit && ['todo', 'in-progress', 'overdue'].includes(task.status)) {
      return task.status;
    }
    if (task.status === 'in-progress' || task.status === 'overdue') {
      return task.status;
    }

    // 2. Inferred status from date and subtask progress
    if (Utils.isOverdue(task.dueDate)) {
      return 'overdue';
    }

    if (task.subtasks?.length > 0 && task.subtasks.some(st => st.completed) && !task.subtasks.every(st => st.completed)) {
      return 'in-progress';
    }

    return 'todo';
  },

  // Get task counts
  getCounts() {
    const tasks = this._tasks;
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.completed).length,
      incomplete: tasks.filter(t => !t.completed).length,
      overdue: tasks.filter(t => !t.completed && Utils.isOverdue(t.dueDate)).length,
      today: tasks.filter(t => !t.completed && Utils.isToday(t.dueDate)).length
    };
  },

  // Get tasks for a specific date
  getTasksForDate(dateStr) {
    return this._tasks.filter(t => t.dueDate === dateStr);
  },

  // Get subtask progress
  getSubtaskProgress(task) {
    if (!task.subtasks || task.subtasks.length === 0) {
      return null;
    }

    const total = task.subtasks.length;
    const completed = task.subtasks.filter(st => st.completed).length;

    return {
      total,
      completed,
      percentage: Math.round((completed / total) * 100)
    };
  }
};

if (typeof window !== 'undefined') {
  window.TaskQueries = TaskQueries;
}

