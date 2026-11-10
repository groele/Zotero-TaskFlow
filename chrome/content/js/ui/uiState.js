// UI state, theme, motion, progress and toast submodule

const UIState = {
  captureTaskMotionState() {
    const selector = this.currentView === 'kanban' ? '.kanban-task' : '.task-card';
    const renderedCards = Array.from(document.querySelectorAll(selector));
    const state = {
      view: this.currentView,
      animateNew: this._hasRenderedMotionView && this._lastMotionView === this.currentView,
      existingIds: new Set(renderedCards.map(card => card.dataset.taskId).filter(Boolean))
    };
    this._hasRenderedMotionView = true;
    this._lastMotionView = this.currentView;
    return state;
  },

  applyTaskEntryMotion(container, state) {
    if (!container || !state?.animateNew || state.view !== this.currentView) return;
    const selector = state.view === 'kanban' ? '.kanban-task' : '.task-card';
    container.querySelectorAll(selector).forEach(card => {
      const taskId = card.dataset.taskId;
      if (!taskId || state.existingIds.has(taskId)) return;
      card.classList.add('is-entering');
      const clear = () => card.classList.remove('is-entering');
      card.addEventListener('animationend', clear, { once: true });
      setTimeout(clear, 280);
    });
  },

  // Update search suggestions
  updateSearchSuggestions(query) {
    const suggestions = Advanced.getSearchSuggestions(query);
    const datalist = document.getElementById('search-suggestions');
    if (datalist) {
      datalist.innerHTML = suggestions.map(s => `<option value="${Utils.escapeHtml(s)}">`).join('');
    }
  },

  // Update batch operation bar
  updateBatchBar() {
    const batchBar = document.getElementById('batch-bar');
    if (!batchBar) return;

    const count = TaskManager.getSelectedCount();
    if (count > 0) {
      batchBar.classList.add('show');
      const info = batchBar.querySelector('.batch-info');
      if (info) {
        info.innerHTML = `已选择 <strong>${count}</strong> 个任务`;
      }
    } else {
      batchBar.classList.remove('show');
    }
  },

  // Toggle theme
  async toggleTheme() {
    const themes = ZoteroBridge.isZotero ? ['zotero', 'light', 'dark', 'auto'] : ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.currentTheme = themes[nextIndex];

    this.applyTheme(this.currentTheme);

    // Save preference
    try { await Storage.saveSettings({ theme: this.currentTheme }); }
    catch (error) {
      this.currentTheme = (await Storage.getSettings()).theme;
      this.applyTheme(this.currentTheme);
      this.showToast('主题设置保存失败');
      return;
    }

    this.showToast(`主题已切换：${this.currentTheme === 'zotero' ? '跟随 Zotero' : this.currentTheme === 'light' ? '浅色' : this.currentTheme === 'dark' ? '深色' : '跟随系统'}`);
  },

  // Apply theme
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'zotero' ? (ZoteroBridge._hostTheme || 'auto') : theme);

    // Update theme button icon
    const btns = document.querySelectorAll('#btn-theme');
    const svgIcons = {
      light: `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 000-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 000 1.41l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>`,
      dark: `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12.3 2a10 10 0 00-1.9 19.8 9.9 9.9 0 007.8-2.6c.4-.4.1-1.1-.4-1.1a8.1 8.1 0 01-6.4-6.4c-.1-.5-.7-.8-1.1-.4A10 10 0 0012.3 2z"/></svg>`,
      auto: `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>`
    };
    btns.forEach(btn => {
      btn.innerHTML = svgIcons[theme] || svgIcons.auto;
      btn.title = `当前主题：${theme === 'zotero' ? '跟随 Zotero' : theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统'}`;
    });
  },

  // Update header progress widget
  updateHeaderProgress() {
    const el = document.getElementById('header-progress-widget');
    if (!el) return;

    const todayTasks = TaskManager.getTasks().filter(task => Utils.isToday(task.dueDate));
    const todayTotal = todayTasks.length;
    const todayCompleted = todayTasks.filter(t => t.completed).length;
    const percentage = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

    const cacheKey = `${todayCompleted}/${todayTotal}/${percentage}`;
    if (el.dataset.progressCache === cacheKey) return;
    el.dataset.progressCache = cacheKey;

    el.innerHTML = `
      <div class="header-progress-text">今日 ${todayCompleted}/${todayTotal} (${percentage}%)</div>
      <div class="header-progress-bar">
        <div class="header-progress-fill" style="width: ${percentage}%"></div>
      </div>
    `;
    el.title = `今日任务完成率: ${percentage}%`;
  },

  // Update dynamic category filter select options
  updateCategorySelect() {
    const select = document.getElementById('category-select');
    if (!select) return;

    const defaultCategories = ['工作', '个人', '学习', '生活', '健康'];
    const taskCategories = TaskManager.getTasks()
      .map(t => t.category)
      .filter(Boolean)
      .map(c => c.trim());

    const allCategories = Array.from(new Set([...defaultCategories, ...taskCategories]));
    const currentValue = this.currentCategoryFilter || 'all';

    const cacheKey = `${currentValue}:${allCategories.join('|')}`;
    if (select.dataset.categoryCache === cacheKey) return;
    select.dataset.categoryCache = cacheKey;

    const icons = {
      '工作': '💼',
      '个人': '👤',
      '学习': '📚',
      '生活': '🏠',
      '健康': '💪'
    };

    select.innerHTML = `
      <option value="all" ${currentValue === 'all' ? 'selected' : ''}>全部分类</option>
      ${allCategories.map(cat => `
        <option value="${Utils.escapeHtml(cat)}" ${currentValue === cat ? 'selected' : ''}>
          ${Object.hasOwn(icons, cat) ? icons[cat] : '🏷️'} ${Utils.escapeHtml(cat)}
        </option>
      `).join('')}
    `;
  },

  // Update active tab and sidebar filter counts
  updateActiveTab() {
    document.querySelectorAll('.filter-tabs .tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === this.currentFilter);
    });
    this.updateSidebarFilterCounts();
  },

  // Update sidebar filter item counts in real-time
  updateSidebarFilterCounts() {
    if (typeof TaskManager === 'undefined' || !TaskManager.getTasks) return;
    const tasks = TaskManager.getTasks();
    const counts = {
      all: tasks.filter(t => !t.completed).length,
      literature: tasks.filter(t => !t.completed && (t.zoteroItemKey || (t.academicType && t.academicType !== 'general'))).length,
      today: tasks.filter(t => !t.completed && Utils.isToday(t.dueDate)).length,
      upcoming: tasks.filter(t => !t.completed && t.dueDate && !Utils.isToday(t.dueDate) && !Utils.isOverdue(t.dueDate)).length,
      overdue: tasks.filter(t => !t.completed && Utils.isOverdue(t.dueDate)).length,
      completed: tasks.filter(t => t.completed).length
    };

    document.querySelectorAll('.filter-tabs .tab').forEach(tab => {
      const filter = tab.dataset.filter;
      if (filter && counts[filter] !== undefined) {
        let countEl = tab.querySelector('.sidebar-filter-count');
        if (!countEl) {
          countEl = document.createElement('span');
          countEl.className = 'sidebar-filter-count';
          tab.appendChild(countEl);
        }
        const text = String(counts[filter]);
        if (countEl.textContent !== text) {
          countEl.textContent = text;
          countEl.dataset.count = text;
        }
        countEl.classList.toggle('has-count', counts[filter] > 0);
        if (filter === 'overdue') {
          countEl.classList.toggle('has-overdue', counts[filter] > 0);
        }
      }
    });
  },

  // Show toast notification
  showToast(message, showUndo = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastAction = document.getElementById('toast-action');

    if (!toast || !toastMessage) return;

    if (this._toastTimer) clearTimeout(this._toastTimer);
    if (this._toastHideTimer) clearTimeout(this._toastHideTimer);

    toastMessage.textContent = message;

    if (showUndo) {
      toastAction.classList.remove('hidden');
      toastAction.onclick = () => Diagnostics.run('撤销删除', async () => {
        const restored = await TaskManager.undoDelete();
        if (restored) {
          this.showToast('任务已恢复');
          this.render();
        }
      });
    } else {
      toastAction.classList.add('hidden');
    }

    const alreadyVisible = toast.classList.contains('show') && !toast.classList.contains('hidden');
    toast.classList.remove('hidden');
    if (alreadyVisible) {
      toast.classList.add('show');
    } else {
      const reveal = () => toast.classList.add('show');
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(reveal);
      else setTimeout(reveal, 0);
    }

    // Undo remains visible for exactly the supported recovery window.
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      this._toastHideTimer = setTimeout(() => toast.classList.add('hidden'), 300);
    }, showUndo ? TaskManager.undoDuration : 3000);
  },

  // Get current view
  getCurrentView() {
    return this.currentView;
  }
};

if (typeof window !== 'undefined') {
  window.UIState = UIState;
}
