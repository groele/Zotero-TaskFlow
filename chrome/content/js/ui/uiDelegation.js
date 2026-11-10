// UI click event delegations for task list and kanban submodule

const UIDelegation = {
  // Trigger task completion sparkle particles
  triggerSparkles(el) {
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const rect = el.getBoundingClientRect();
    const count = 5;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'sparkle-particle';
      const angle = (i / count) * 360;
      const distance = 12 + Math.random() * 8;
      const tx = Math.cos(angle * Math.PI / 180) * distance;
      const ty = Math.sin(angle * Math.PI / 180) * distance;

      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);
      particle.style.left = `${rect.left + rect.width / 2}px`;
      particle.style.top = `${rect.top + rect.height / 2}px`;

      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 420);
    }
  },

  // Handle task list clicks
  async handleTaskListClick(e) {
    if (this._justLongPressed) {
      this._justLongPressed = false;
      return;
    }

    const taskCard = e.target.closest('.task-card');
    if (!taskCard) return;

    const taskId = taskCard.dataset.taskId;

    // In selection mode, clicking anywhere on card toggles selection
    if (TaskManager.isSelectionMode()) {
      TaskManager.toggleSelection(taskId);
      this.render();
      this.updateBatchBar();
      return;
    }

    // Tag click to filter
    const tagBadge = e.target.closest('.tag-badge-small');
    if (tagBadge) {
      e.stopPropagation();
      const text = tagBadge.textContent.trim();
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.value = text;
        this.currentSearch = text;
        this.render();
      }
      return;
    }

    // Category click to filter
    const categoryBadge = e.target.closest('.task-category');
    if (categoryBadge) {
      e.stopPropagation();
      const text = categoryBadge.textContent.trim();
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.value = text;
        this.currentSearch = text;
        this.render();
      }
      return;
    }

    // Inline subtask input click
    if (e.target.closest('.card-add-subtask-input')) {
      e.stopPropagation();
      return;
    }

    // Inline subtask checkbox click
    const subtaskCheckbox = e.target.closest('.card-subtask-checkbox');
    if (subtaskCheckbox) {
      e.stopPropagation();
      const subtaskId = subtaskCheckbox.dataset.subtaskId;
      const subtaskItem = subtaskCheckbox.closest('.card-subtask-item');
      const wasChecked = subtaskCheckbox.classList.contains('checked');
      const targetChecked = !wasChecked;

      // Optimistic visual feedback
      subtaskCheckbox.classList.toggle('checked', targetChecked);
      subtaskCheckbox.setAttribute('aria-checked', String(targetChecked));
      subtaskCheckbox.setAttribute('aria-label', targetChecked ? '标记子任务为未完成' : '标记子任务为已完成');
      if (subtaskItem) subtaskItem.classList.toggle('completed', targetChecked);

      // Update subtask progress bar on the card if present
      const parentTask = TaskManager.getTaskById?.(taskId) || TaskManager._tasks?.find(t => t.id === taskId);
      const card = subtaskCheckbox.closest('.task-card');
      if (card && parentTask?.subtasks) {
        const completedCount = parentTask.subtasks.filter(s => s.id === subtaskId ? targetChecked : s.completed).length;
        const total = parentTask.subtasks.length;
        const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
        const progressText = card.querySelector('.subtask-progress-text');
        const progressFill = card.querySelector('.subtask-progress-fill');
        if (progressText) progressText.textContent = `子任务 ${completedCount}/${total}`;
        if (progressFill) progressFill.style.width = `${pct}%`;
      }

      try {
        await TaskManager.toggleSubtask(taskId, subtaskId);
      } catch (error) {
        // Rollback on failure
        subtaskCheckbox.classList.toggle('checked', wasChecked);
        subtaskCheckbox.setAttribute('aria-checked', String(wasChecked));
        subtaskCheckbox.setAttribute('aria-label', wasChecked ? '标记子任务为未完成' : '标记子任务为已完成');
        if (subtaskItem) subtaskItem.classList.toggle('completed', wasChecked);
        this.showToast('更新子任务失败，请重试');
      }
      return;
    }

    // Inline subtask delete button click
    const deleteSubtaskBtn = e.target.closest('.btn-card-delete-subtask');
    if (deleteSubtaskBtn) {
      e.stopPropagation();
      const subtaskId = deleteSubtaskBtn.dataset.subtaskId;
      const subtaskItem = deleteSubtaskBtn.closest('.card-subtask-item');
      if (subtaskItem) subtaskItem.style.opacity = '0.35';
      try {
        await TaskManager.deleteSubtask(taskId, subtaskId);
      } catch (error) {
        if (subtaskItem) subtaskItem.style.opacity = '1';
        this.showToast('删除子任务失败，请重试');
      }
      return;
    }

    // Checkbox click
    if (e.target.closest('.task-checkbox')) {
      e.stopPropagation();
      await this.handleToggleComplete(taskId, taskCard);
      return;
    }

    // Delete button click
    if (e.target.closest('.task-action.delete')) {
      e.stopPropagation();
      await this.handleDeleteTask(taskId, taskCard);
      return;
    }

    // Edit button click
    if (e.target.closest('.task-action.edit')) {
      e.stopPropagation();
      Modal.openEdit(taskId);
      return;
    }

    // Duplicate button click
    if (e.target.closest('.task-action.duplicate')) {
      e.stopPropagation();
      await this.handleDuplicateTask(taskId);
      return;
    }

    // Timer button click
    if (e.target.closest('.task-action.timer')) {
      e.stopPropagation();
      await this.handleTimerToggle(taskId);
      return;
    }

    // PDF companion reader button click
    if (e.target.closest('.btn-card-open-pdf')) {
      e.stopPropagation();
      const task = TaskManager.getTaskById(taskId);
      if (typeof ZoteroBridge !== 'undefined' && task?.zoteroItemKey) {
        let page = null;
        if (task.zoteroPage) {
          page = Number(task.zoteroPage);
        } else if (task.zoteroPdfUri) {
          const m = String(task.zoteroPdfUri).match(/[?&]page=(\d+)/);
          if (m) page = Number(m[1]);
        }
        ZoteroBridge.openPdf(task.zoteroPdfUri || task.zoteroUri || task.zoteroItemKey, task.zoteroLibraryID, page, task.zoteroAnnotationKey);
      }
      return;
    }

    // Zotero copy citation button click
    if (e.target.closest('.task-action.zotero-copy-citation')) {
      e.stopPropagation();
      const task = TaskManager.getTaskById(taskId);
      if (task) {
        let citation = '';
        if (task.zoteroAuthors && task.zoteroYear) {
          citation = `${task.zoteroAuthors} (${task.zoteroYear}). ${task.zoteroItemTitle || task.title}`;
        } else if (task.zoteroItemTitle) {
          citation = `《${task.zoteroItemTitle}》`;
        } else {
          citation = task.title;
        }
        if (typeof Advanced !== 'undefined' && Advanced.copyToClipboard) {
          Advanced.copyToClipboard(citation);
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(citation);
        }
        this.showToast(`已复制文献引用: ${citation.slice(0, 32)}${citation.length > 32 ? '…' : ''}`);
      }
      return;
    }

    // Zotero sync note button click
    if (e.target.closest('.task-action.zotero-sync-note')) {
      e.stopPropagation();
      const task = TaskManager.getTaskById(taskId);
      if (typeof ZoteroBridge !== 'undefined' && task?.zoteroItemKey) {
        this.showToast('正在同步至文献笔记...');
        ZoteroBridge.syncChildNote(task.zoteroUri || task.zoteroItemKey, task.zoteroLibraryID).then((res) => {
          if (res?.success) {
            this.showToast('已同步至文献笔记');
          }
        });
      }
      return;
    }

    // Zotero badge or locate button click
    if (e.target.closest('.task-action.zotero-locate') || e.target.closest('.task-zotero-badge-main') || e.target.closest('.task-zotero-badge')) {
      e.stopPropagation();
      const task = TaskManager.getTaskById(taskId);
      if (!e.target.closest('.task-action.zotero-locate') && !Storage.getPreference('locateOnTaskClick', true)) {
        Modal.openEdit(taskId);
      } else if (typeof ZoteroBridge !== 'undefined' && task?.zoteroItemKey) {
        ZoteroBridge.locateItem(task.zoteroUri || task.zoteroItemKey, task.zoteroLibraryID);
      }
      return;
    }

    // Card click (not on action buttons)
    this.openTaskCard(taskId);
  },

  // Handle kanban clicks with quick-actions, PDF direct jump, and modal editing
  async handleKanbanClick(e) {
    const deleteButton = e.target.closest('.kanban-delete');
    if (deleteButton) {
      e.stopPropagation();
      const card = deleteButton.closest('.kanban-task');
      await this.handleDeleteTask(card.dataset.taskId, card);
      return;
    }
    const editButton = e.target.closest('.kanban-edit');
    if (editButton) {
      e.stopPropagation();
      await Modal.openEdit(editButton.closest('.kanban-task').dataset.taskId);
      return;
    }

    // 1. Column footer quick add button
    const quickAddBtn = e.target.closest('.kanban-quick-add-btn');
    if (quickAddBtn) {
      e.stopPropagation();
      const colKey = quickAddBtn.dataset.column;
      const prefill = {};
      prefill.status = colKey === 'in-progress' ? 'in-progress' : 'todo';
      if (colKey === 'done') {
        prefill.completed = true;
      } else if (colKey === 'overdue') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        prefill.dueDate = Utils.toDateISO(yesterday);
      } else if (colKey === 'todo' || colKey === 'in-progress') {
        prefill.dueDate = Utils.toDateISO(new Date());
      }
      Modal.openAdd(prefill);
      return;
    }

    // 2. Quick toggle complete checkbox
    const checkbox = e.target.closest('.kanban-task-checkbox');
    if (checkbox) {
      e.stopPropagation();
      const taskId = checkbox.dataset.taskId;
      const card = checkbox.closest('.kanban-task');
      await this.handleToggleComplete(taskId, card);
      return;
    }

    // 3. Quick PDF jump
    const pageChip = e.target.closest('.kanban-task-page');
    if (pageChip) {
      e.stopPropagation();
      const taskId = pageChip.dataset.taskId;
      const task = TaskManager.getTaskById(taskId);
      if (typeof ZoteroBridge !== 'undefined' && task?.zoteroItemKey) {
        let page = null;
        if (task.zoteroPage) page = Number(task.zoteroPage);
        ZoteroBridge.openPdf(task.zoteroPdfUri || task.zoteroUri || task.zoteroItemKey, task.zoteroLibraryID, page, task.zoteroAnnotationKey);
      }
      return;
    }

    // 4. Quick locate item from academic badge
    const badge = e.target.closest('.kanban-academic-badge');
    if (badge) {
      e.stopPropagation();
      const taskCard = badge.closest('.kanban-task');
      const taskId = taskCard?.dataset.taskId;
      this.openTaskCard(taskId);
      return;
    }

    // 5. Open Edit Modal on card click
    const kanbanTask = e.target.closest('.kanban-task');
    if (kanbanTask) {
      const taskId = kanbanTask.dataset.taskId;
      this.openTaskCard(taskId);
    }
  }
};

if (typeof window !== 'undefined') {
  window.UIDelegation = UIDelegation;
}
