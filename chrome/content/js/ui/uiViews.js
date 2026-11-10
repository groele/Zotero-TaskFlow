// UI view rendering, layout switching and card building submodule

const UIViews = {
  // Cycle through views: list -> calendar -> kanban -> list
  cycleView() {
    const views = ['list', 'calendar', 'kanban'];
    const currentIndex = views.indexOf(this.currentView);
    const nextIndex = (currentIndex + 1) % views.length;
    this.switchView(views[nextIndex]);
  },

  // Switch to specific view
  async switchView(view) {
    if (!['list', 'calendar', 'kanban', 'stats'].includes(view)) view = 'list';
    this.currentView = view;

    // Update view visibility
    const viewIds = ['list-view', 'calendar-view', 'kanban-view', 'stats-view'];
    viewIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.toggle('active', id === view + '-view');
        el.classList.toggle('hidden', id !== view + '-view');
      }
    });

    // Update button icon
    const btn = document.getElementById('btn-toggle-view');
    const icons = {
      list: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>',
      calendar: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>',
      kanban: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM7 19H5v-6h2v6zm0-8H5V5h2v6zm6 8h-2v-4h2v4zm0-6h-2V5h2v6zm6 6h-2v-8h2v8z"/></svg>'
    };
    const titles = { list: '日历视图', calendar: '看板视图', kanban: '列表视图' };

    if (btn) {
      btn.innerHTML = icons[view] || icons.list;
      btn.title = titles[view] || '切换视图';
    }

    if (view === 'calendar') await Calendar.render();
    else if (view === 'kanban') this.renderKanban();
    else if (view === 'stats') await this.showStats();
    else this.render();
  },

  // Render the task list
  render() {
    this.updateHeaderProgress();
    this.updateSidebarFilterCounts();
    this.updateCategorySelect();
    const motionState = this.captureTaskMotionState();

    if (this.currentView === 'kanban') {
      this.renderKanban(motionState);
      return;
    }
    if (this.currentView === 'calendar') {
      Calendar.render();
      return;
    }
    if (this.currentView === 'stats') { this.showStats(); return; }

    const filters = {
      search: this.currentSearch,
      priority: this.currentPriorityFilter,
      category: this.currentCategoryFilter && this.currentCategoryFilter !== 'all' ? this.currentCategoryFilter : null,
      showCompleted: this.showCompleted,
      sortOrder: this.currentSortOrder || 'dueDate'
    };

    if (this.currentFilter === 'date') {
      const selectedDate = Calendar.getSelectedDate();
      if (selectedDate) {
        const dateTasks = TaskManager.getFilteredTasks({ ...filters, date: selectedDate });
        const sorted = TaskManager.getSortedTasks(dateTasks, 'dueDate');
        this.renderDateFilterResults(sorted, selectedDate);
        this.applyTaskEntryMotion(document.getElementById('task-list'), motionState);
        return;
      }
    }

    filters.status = this.currentFilter;
    const groups = TaskManager.getGroupedTasks(filters);
    const container = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');
    const totalTasks = Object.values(groups).reduce((sum, group) => sum + group.length, 0);

    if (totalTasks === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      const emptyMsg = emptyState.querySelector('p');
      if (emptyMsg) {
        if (this.currentSearch) emptyMsg.textContent = '未找到匹配的任务';
        else if (this.currentFilter === 'today') emptyMsg.textContent = '今天没有待办任务';
        else if (this.currentFilter === 'overdue') emptyMsg.textContent = '太棒了！没有逾期任务';
        else if (this.currentFilter === 'completed') emptyMsg.textContent = '还没有已完成的任务';
        else if (this.currentPriorityFilter !== 'all') emptyMsg.textContent = '没有该优先级的任务';
        else emptyMsg.textContent = '还没有任务';
      }
      this.applyTaskEntryMotion(container, motionState);
      return;
    }

    emptyState.classList.add('hidden');
    const frag = document.createDocumentFragment();

    const quickAdd = document.createElement('div');
    quickAdd.className = 'quick-add';
    quickAdd.innerHTML = '<input type="text" id="quick-add-input" placeholder="快速添加任务，按 Enter 确认..." autocomplete="off">';
    frag.appendChild(quickAdd);

    const sections = [
      { key: 'overdue', title: '已逾期', icon: '⚠️', className: 'section-overdue' },
      { key: 'today', title: '今天', icon: '📅', className: 'section-today' },
      { key: 'upcoming', title: '即将到来', icon: '📋', className: 'section-upcoming' },
      { key: 'completed', title: '已完成', icon: '✅', className: 'section-completed' }
    ];

    sections.forEach(section => {
      const tasks = groups[section.key];
      if (tasks.length === 0) return;
      frag.appendChild(this.createSectionElement(section, tasks));
    });

    if (typeof container.replaceChildren === 'function') container.replaceChildren(frag);
    else { container.innerHTML = ''; container.appendChild(frag); }

    const quickAddInput = document.getElementById('quick-add-input');
    if (quickAddInput) {
      quickAddInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter' && quickAddInput.value.trim() && !quickAddInput.disabled) {
          e.preventDefault();
          const title = quickAddInput.value.trim();
          quickAddInput.disabled = true;
          try { await TaskManager.addTask({ title }); }
          catch (error) {
            Diagnostics.showFailure('快速添加任务', error);
            const current = document.getElementById('quick-add-input');
            if (current) { current.value = title; current.disabled = false; current.focus(); }
            return;
          }
          this.notifyServiceWorker();
          this.showToast('任务已添加');
        }
      });
    }

    container.querySelectorAll('.task-card').forEach(card => {
      DragDrop.makeDraggable(card);
    });
    this.applyTaskEntryMotion(container, motionState);
  },

  // Render kanban view
  renderKanban(motionState = this.captureTaskMotionState()) {
    const kanbanData = TaskManager.getKanbanTasks({
      search: this.currentSearch,
      priority: this.currentPriorityFilter,
      category: this.currentCategoryFilter,
      status: this.currentFilter === 'date' ? 'all' : this.currentFilter,
      showCompleted: this.showCompleted,
      sortOrder: this.currentSortOrder
    });
    const container = document.getElementById('kanban-view');
    if (!container) return;

    const columns = [
      { key: 'overdue', title: '已逾期', icon: '⚠️' },
      { key: 'todo', title: '待办', icon: '📋' },
      { key: 'in-progress', title: '进行中', icon: '🔄' },
      { key: 'done', title: '已完成', icon: '✅' }
    ];
    const totalCount = Object.values(kanbanData).reduce((sum, list) => sum + (list || []).length, 0);

    container.innerHTML = columns.map(col => {
      const colTasks = kanbanData[col.key] || [];
      const pct = totalCount > 0 ? Math.round((colTasks.length / totalCount) * 100) : 0;
      return `
        <div class="kanban-column ${col.key}" data-column="${col.key}">
          <div class="kanban-column-header">
            <div class="kanban-column-title"><span>${col.icon}</span><span>${col.title}</span></div>
            <span class="kanban-column-count" title="${pct}% 的任务">${colTasks.length}${totalCount > 0 ? ` · ${pct}%` : ''}</span>
          </div>
          <div class="kanban-column-content" data-column="${col.key}">
            ${colTasks.map(task => this.createKanbanTask(task)).join('')}
            ${colTasks.length === 0 ? `<div class="kanban-empty"><span class="kanban-empty-icon">${col.icon}</span><span>暂无${col.title}任务</span></div>` : ''}
          </div>
          <div class="kanban-column-footer">
            <button type="button" class="kanban-quick-add-btn" data-column="${col.key}"><span>＋ 添加任务</span></button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.kanban-task').forEach(card => {
      DragDrop.makeKanbanDraggable(card);
    });
    this.applyTaskEntryMotion(container, motionState);
  },

  // Create kanban task HTML
  createKanbanTask(task) {
    const progress = TaskManager.getSubtaskProgress(task);
    const progressHtml = progress ? `
      <div class="kanban-task-progress">
        <div class="progress-bar" style="height: 4px; margin-top: 8px;">
          <div class="progress-fill" style="width: ${progress.percentage}%"></div>
        </div>
        <span style="font-size: 11px; color: var(--text-muted);">${progress.completed}/${progress.total}</span>
      </div>
    ` : '';

    let academicBadge = '';
    const typeIcons = {
      literature_reading: '📖', writing: '✍️',
      experiment: '🔬', submission: '⏰', peer_review: '📑'
    };
    if (task.academicType && task.academicType !== 'general') {
      academicBadge = `<span class="kanban-academic-badge" title="${Utils.escapeHtml(task.academicType)}">${typeIcons[task.academicType] || '🎓'}</span> `;
    } else if (task.zoteroItemKey) {
      academicBadge = '<span class="kanban-academic-badge" title="关联文献">📖</span> ';
    }

    const isAcademic = !!(task.zoteroItemKey || (task.academicType && task.academicType !== 'general'));

    return `
      <div class="kanban-task ${task.completed ? 'completed' : ''} ${isAcademic ? 'task-academic-kanban' : ''}" data-task-id="${Utils.escapeHtml(task.id)}">
        <div class="kanban-task-header-row">
          <button type="button" class="kanban-task-checkbox ${task.completed ? 'checked' : ''}" role="checkbox" aria-checked="${Boolean(task.completed)}" aria-label="${task.completed ? '标记任务为未完成' : '标记任务为已完成'}" data-task-id="${Utils.escapeHtml(task.id)}" title="${task.completed ? '标记为未完成' : '标记为已完成'}"></button>
          <div class="kanban-task-title">${academicBadge}${Utils.escapeHtml(task.title)}</div>
        </div>
        <div class="kanban-task-meta">
          <span class="kanban-task-priority ${Utils.escapeHtml(task.priority)}" title="优先级: ${Utils.escapeHtml(task.priority)}"></span>
          ${task.dueDate ? `<span class="kanban-task-date ${Utils.isOverdue(task.dueDate) && !task.completed ? 'overdue' : ''}">${Utils.formatRelativeDate(task.dueDate)}</span>` : ''}
          ${task.zoteroPage ? `<span class="kanban-task-page" data-task-id="${Utils.escapeHtml(task.id)}" title="点击直接打开关联 PDF 并跳转至第 ${Utils.escapeHtml(task.zoteroPage)} 页">📖 P.${Utils.escapeHtml(task.zoteroPage)}</span>` : ''}
        </div>
        ${progressHtml}
        <div class="kanban-task-actions">
          <button type="button" class="kanban-edit" aria-label="编辑任务">编辑</button>
          <button type="button" class="kanban-delete" aria-label="删除任务">删除</button>
        </div>
      </div>
    `;
  },

  // Render date filter results (flat list, not grouped)
  renderDateFilterResults(tasks, dateStr) {
    const container = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');
    if (tasks.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');
    container.innerHTML = '';
    const section = {
      key: 'date',
      title: Utils.formatRelativeDate(dateStr) || Utils.formatDate(dateStr),
      icon: '📅',
      className: 'section-today'
    };
    container.appendChild(this.createSectionElement(section, tasks));
  },

  // Create section element
  createSectionElement(section, tasks) {
    const sectionEl = document.createElement('div');
    sectionEl.className = `task-section ${section.className}`;
    sectionEl.dataset.section = section.key;

    sectionEl.innerHTML = `
      <div class="task-section-header">
        <div class="task-section-title">
          <span>${section.icon}</span>
          <span>${section.title}</span>
          <span class="task-section-count">${tasks.length}</span>
        </div>
        <svg class="task-section-toggle" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
        </svg>
      </div>
      <div class="task-section-content" data-section="${section.key}"></div>
    `;

    const header = sectionEl.querySelector('.task-section-header');
    header.addEventListener('click', () => {
      sectionEl.classList.toggle('collapsed');
    });

    const content = sectionEl.querySelector('.task-section-content');
    const taskFrag = document.createDocumentFragment();
    tasks.forEach(task => {
      taskFrag.appendChild(this.createTaskCard(task));
    });
    content.appendChild(taskFrag);
    return sectionEl;
  },

  // Highlight matching search query text
  highlightText(text) {
    if (!text) return '';
    const query = (this.currentSearch || '').trim();
    const escapedText = Utils.escapeHtml(text);
    if (!query) return escapedText;

    const escapedQuery = Utils.escapeHtml(query);
    const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
  },

  // Create task card element
  createTaskCard(task) {
    if (typeof TaskCardRenderer !== 'undefined' && typeof TaskCardRenderer.createTaskCard === 'function') {
      return TaskCardRenderer.createTaskCard(task, this);
    }
    return document.createElement('div');
  }
};

if (typeof window !== 'undefined') {
  window.UIViews = UIViews;
}
