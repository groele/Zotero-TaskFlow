// UI task actions, modals, timer and service-worker notification submodule

const UIActions = {
  openTaskCard(taskId) {
    const task = TaskManager.getTaskById(taskId);
    if (ZoteroBridge.isZotero && task?.zoteroItemKey && Storage.getPreference('locateOnTaskClick', true)) {
      ZoteroBridge.locateItem(task.zoteroUri || task.zoteroItemKey, task.zoteroLibraryID);
    } else Modal.openEdit(taskId);
  },

  // Handle timer toggle
  async handleTimerToggle(taskId) {
    if (TimeTracking.isTimerRunning(taskId)) {
      const elapsed = await TimeTracking.stopTimer(taskId);
      this.showToast(`计时停止: ${TimeTracking.formatDuration(elapsed)}`);
    } else {
      await TimeTracking.startTimer(taskId);
      this.showToast('计时开始');
    }
    this.render();
  },

  // Handle toggle complete with optimistic UI feedback
  async handleToggleComplete(taskId, taskCard) {
    const card = taskCard || Array.from(document.querySelectorAll('.task-card, .kanban-task'))
      .find(c => c.dataset.taskId === taskId);
    const checkbox = card?.querySelector('.task-checkbox, .kanban-task-checkbox');

    const inMemoryTask = TaskManager.getTaskById?.(taskId) || TaskManager._tasks?.find(t => t.id === taskId);
    const targetCompleted = inMemoryTask ? !inMemoryTask.completed : true;

    // Instant optimistic visual feedback
    if (card) {
      card.classList.toggle('completed', targetCompleted);
    }
    if (checkbox) {
      checkbox.classList.toggle('checked', targetCompleted);
      checkbox.setAttribute('aria-checked', String(targetCompleted));
      checkbox.setAttribute('aria-label', targetCompleted ? '标记任务为未完成' : '标记任务为已完成');
      checkbox.title = targetCompleted ? '标记为未完成' : '标记为已完成';
      checkbox.classList.add('just-checked');
      setTimeout(() => checkbox?.classList.remove('just-checked'), 220);
      if (targetCompleted && typeof this.triggerSparkles === 'function') {
        this.triggerSparkles(checkbox);
      }
    }

    try {
      const task = await TaskManager.toggleComplete(taskId);
      this.notifyServiceWorker();
      return task;
    } catch (error) {
      // Revert optimistic changes on failure
      if (card) {
        card.classList.toggle('completed', !targetCompleted);
      }
      if (checkbox) {
        checkbox.classList.toggle('checked', !targetCompleted);
        checkbox.setAttribute('aria-checked', String(!targetCompleted));
        checkbox.setAttribute('aria-label', !targetCompleted ? '标记任务为未完成' : '标记任务为已完成');
        checkbox.title = !targetCompleted ? '标记为未完成' : '标记为已完成';
      }
      this.showToast('更新任务状态失败，请重试');
      throw error;
    }
  },

  // Handle delete task
  async handleDeleteTask(taskId, taskCard) {
    this._deleting ||= new Set();
    if (this._deleting.has(taskId)) return false;
    this._deleting.add(taskId);
    try {
      // Add exit animation
      taskCard?.classList.add('removing');

      // Wait for animation
      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      const deletedTask = await TaskManager.deleteTask(taskId);
      if (!deletedTask) return false;

      // Show undo toast
      this.showToast('任务已删除', true);

      // Update badge
      this.notifyServiceWorker();
      this.updateBatchBar();
      return true;
    } catch (error) {
      taskCard?.classList.remove('removing');
      this.showToast('删除失败，请重试');
      return false;
    } finally { this._deleting.delete(taskId); }
  },

  // Handle duplicate task
  async handleDuplicateTask(taskId) {
    const newTask = await TaskManager.duplicateTask(taskId);
    if (newTask) {
      this.showToast('任务已复制');
    }
  },

  // Notify service worker with error handling
  notifyServiceWorker() {
    try {
      chrome.runtime.sendMessage({ type: 'TASKS_UPDATED' }).catch(() => {});
    } catch (e) {
      // Service worker may be inactive
    }
  },

  // Open settings (delegates directly to Zotero native preferences)
  openSettings() {
    if (typeof ZoteroBridge !== 'undefined' && ZoteroBridge.openPreferences) {
      ZoteroBridge.openPreferences();
      this.showToast('已唤起 Zotero 偏好设置面板');
    }
  },

  // Open templates panel
  openTemplates() {
    const dialog = document.getElementById('templates-modal');
    if (dialog) {
      // Update templates
      const content = dialog.querySelector('.templates-grid');
      if (content) {
        content.innerHTML = Templates.getAllTemplates().map(t => `
          <div class="template-card" data-template-id="${Utils.escapeHtml(t.id)}">
            <div class="template-icon">${Utils.escapeHtml(t.icon || '📋')}</div>
            <div class="template-name">${Utils.escapeHtml(t.name || '')}</div>
            <div class="template-desc">${(t.task?.subtasks || []).length} 个子任务</div>
          </div>
        `).join('');
      }
      dialog.showModal();
      return;
    }

    // Create modal
    const modal = document.createElement('dialog');
    modal.id = 'templates-modal';
    modal.className = 'modal';
    modal.innerHTML = Templates.renderTemplatesPanel();

    document.body.appendChild(modal);

    // Wire up events
    modal.querySelector('.templates-grid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.template-card');
      if (card) {
        const templateId = card.dataset.templateId;
        Templates.applyTemplate(templateId);
        modal.close();
      }
    });

    modal.querySelector('#btn-close-templates')?.addEventListener('click', () => {
      modal.close();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.close();
      }
    });

    modal.showModal();
  },

  // Show statistics
  async showStats() {
    this.currentView = 'stats';
    const renderId = this._statsRenderId = (this._statsRenderId || 0) + 1;
    const doc = document;
    const container = document.getElementById('stats-view');
    if (!container) return;

    // Hide other views
    ['list-view', 'calendar-view', 'kanban-view'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('active');
        el.classList.add('hidden');
      }
    });

    container.classList.add('active');
    container.classList.remove('hidden');

    // Render stats
    const html = await DataManager.renderStats();
    if (!container.isConnected || !window.document || this.currentView !== 'stats' || renderId !== this._statsRenderId) return;
    container.innerHTML = html;

    // Add close button handler
    doc.getElementById('btn-close-stats')?.addEventListener('click', () => {
      this.switchView('list');
    });
  }
};

if (typeof window !== 'undefined') {
  window.UIActions = UIActions;
}
