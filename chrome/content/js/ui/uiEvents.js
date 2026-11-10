// UI event listeners, toolbar controls, drag-and-drop and selection mode submodule

const UIEvents = {
  // Setup event listeners
  setupEventListeners() {
    // Add task button
    document.getElementById('btn-add').addEventListener('click', () => {
      Modal.openAdd();
    });

    // Add first task button (empty state)
    document.getElementById('btn-add-first')?.addEventListener('click', () => {
      Modal.openAdd();
    });

    // Toggle view button
    document.getElementById('btn-toggle-view').addEventListener('click', () => {
      this.cycleView();
    });

    // Theme toggle button
    document.getElementById('btn-theme')?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Stats button
    document.getElementById('btn-stats')?.addEventListener('click', () => {
      this.showStats();
    });

    // Settings buttons (directly opens Zotero native preferences)
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.openSettings();
    });
    document.getElementById('btn-zotero-prefs')?.addEventListener('click', () => {
      this.openSettings();
    });

    // Zotero window mode dropdown
    const btnWinMode = document.getElementById('btn-zotero-window-mode');
    const modeSvgs = {
      tab: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h10v4h8v10z"/></svg>',
      subwindow: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm0 14H5V8h14v10z"/></svg>',
      window: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>'
    };
    const modePaths = {
      tab: 'M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h10v4h8v10z',
      subwindow: 'M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm0 14H5V8h14v10z',
      window: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z'
    };
    const getActiveWinMode = () => {
      const p = new URLSearchParams(window.location.search || '');
      return p.get('mode') || window.arguments?.[0]?.options?.currentWindowType || 'tab';
    };
    if (btnWinMode) {
      btnWinMode.innerHTML = modeSvgs[getActiveWinMode()] || modeSvgs.subwindow;
    }

    btnWinMode?.addEventListener('click', (e) => {
      e.stopPropagation();
      const existingMenu = document.querySelector('.zotero-mode-dropdown');
      if (existingMenu) {
        existingMenu.remove();
        return;
      }

      const curMode = getActiveWinMode();
      const menu = document.createElement('div');
      menu.className = 'zotero-mode-dropdown';
      const modes = [
        { mode: 'tab', label: '标签页模式 (Tab)' },
        { mode: 'subwindow', label: '伴读子窗口 (460×760)' },
        { mode: 'window', label: '独立桌面大窗口 (1120×760)' }
      ];
      modes.forEach(({ mode, label }) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = `zotero-mode-item ${curMode === mode ? 'active' : ''}`;
        option.dataset.mode = mode;

        const icon = document.createElement('span');
        icon.className = 'zotero-mode-icon';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '18');
        svg.setAttribute('height', '18');
        svg.setAttribute('aria-hidden', 'true');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', 'currentColor');
        path.setAttribute('d', modePaths[mode]);
        svg.appendChild(path);
        icon.appendChild(svg);

        const text = document.createElement('span');
        text.textContent = label;
        option.append(icon, text);
        menu.appendChild(option);
      });

      btnWinMode.parentElement.style.position = 'relative';
      btnWinMode.parentElement.appendChild(menu);

      menu.querySelectorAll('.zotero-mode-item').forEach((item) => {
        item.addEventListener('click', (evt) => {
          evt.stopPropagation();
          const targetMode = item.dataset.mode;
          menu.remove();
          if (btnWinMode) btnWinMode.innerHTML = modeSvgs[targetMode] || modeSvgs.subwindow;
          if (typeof ZoteroBridge !== 'undefined') {
            ZoteroBridge.switchWindowMode(targetMode);
          }
        });
      });

      const closeHandler = () => {
        menu.remove();
        document.removeEventListener('click', closeHandler);
      };
      setTimeout(() => document.addEventListener('click', closeHandler), 50);
    });

    // Drag & drop literature from Zotero library pane
    const viewsContainer = document.querySelector('.views-container');
    if (viewsContainer) {
      let dragCounter = 0;
      let dropCueEl = null;
      const acceptsLiterature = event => typeof ZoteroBridge !== 'undefined' && ZoteroBridge.isZotero &&
        Storage.getPreference('dragDropFromLibrary', true) &&
        Array.from(event.dataTransfer?.types || []).includes('zotero/item');

      const showDropCue = () => {
        if (!dropCueEl) {
          dropCueEl = document.createElement('div');
          dropCueEl.className = 'zotero-drag-overlay-cue';
          dropCueEl.innerHTML = '<span>📥 释放以关联文献并创建研读待办</span>';
          document.body.appendChild(dropCueEl);
        }
      };

      const removeDropCue = () => {
        if (dropCueEl && dropCueEl.parentNode) {
          dropCueEl.parentNode.removeChild(dropCueEl);
        }
        dropCueEl = null;
      };

      const clearDragHighlight = () => {
        dragCounter = 0;
        viewsContainer.classList.remove('drag-over-zotero');
        removeDropCue();
      };

      viewsContainer.addEventListener('dragenter', (e) => {
        if (typeof DragDrop !== 'undefined' && (DragDrop.draggedTaskId || DragDrop.draggedElement)) return;
        if (acceptsLiterature(e)) {
          dragCounter++;
          if (dragCounter === 1) {
            viewsContainer.classList.add('drag-over-zotero');
            showDropCue();
          }
        }
      });

      viewsContainer.addEventListener('dragover', (e) => {
        if (typeof DragDrop !== 'undefined' && (DragDrop.draggedTaskId || DragDrop.draggedElement)) return;
        if (acceptsLiterature(e)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          if (!viewsContainer.classList.contains('drag-over-zotero')) {
            viewsContainer.classList.add('drag-over-zotero');
            showDropCue();
          }
        }
      });

      viewsContainer.addEventListener('dragleave', (e) => {
        if (typeof DragDrop !== 'undefined' && (DragDrop.draggedTaskId || DragDrop.draggedElement)) return;
        dragCounter--;
        if (dragCounter <= 0) clearDragHighlight();
      });

      viewsContainer.addEventListener('drop', (e) => Diagnostics.run('创建文献研读待办', async () => {
        clearDragHighlight();
        if (typeof DragDrop !== 'undefined' && (DragDrop.draggedTaskId || DragDrop.draggedElement)) return;
        if (acceptsLiterature(e)) {
          e.preventDefault();
          const payload = e.dataTransfer.getData('zotero/item').trim();
          if (!/^\d+(?:,\d+)*$/.test(payload)) throw new Error('无法读取拖入的 Zotero 文献');
          const result = await ZoteroBridge.addDroppedItems(payload.split(',').map(Number));
          this.showToast(`新增 ${result.added} 篇研读待办，跳过已有待办 ${result.skipped} 篇` +
            (result.ignored ? `；忽略 ${result.ignored} 个无效或重复拖入项` : ''));
        }
      }));

      window.addEventListener('dragend', clearDragHighlight);
      window.addEventListener('drop', clearDragHighlight);
    }

    // Templates button
    document.getElementById('btn-templates')?.addEventListener('click', () => {
      this.openTemplates();
    });

    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        this.currentSearch = e.target.value;
        this.render();
        this.updateSearchSuggestions(e.target.value);
      }, 300));

      searchInput.addEventListener('keypress', (e) => Diagnostics.run('保存搜索历史', async () => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
          await Advanced.addToSearchHistory(searchInput.value.trim());
        }
      }));
    }

    // Filter select
    document.getElementById('filter-select')?.addEventListener('change', (e) => {
      this.currentPriorityFilter = e.target.value;
      this.render();
    });

    // Category select
    document.getElementById('category-select')?.addEventListener('change', (e) => {
      this.currentCategoryFilter = e.target.value;
      this.render();
    });

    // Sort select
    document.getElementById('sort-select')?.addEventListener('change', async (e) => {
      this.currentSortOrder = e.target.value;
      this.render();
      try { await Storage.saveSettings({ sortOrder: this.currentSortOrder }); }
      catch (error) {
        this.currentSortOrder = (await Storage.getSettings()).sortOrder;
        e.target.value = this.currentSortOrder;
        this.render();
        this.showToast('排序设置保存失败');
      }
    });

    // Filter tabs
    document.querySelectorAll('.filter-tabs .tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.currentFilter = e.target.dataset.filter;
        this.updateActiveTab();
        this.render();
      });
    });

    // Task list event delegation
    document.getElementById('task-list')?.addEventListener('click', (e) => {
      this.handleTaskListClick(e);
    });

    // Setup inline editing (subtasks, title, description)
    if (typeof this.setupInlineEditing === 'function') {
      this.setupInlineEditing();
    }

    // Kanban view event delegation
    document.getElementById('kanban-view')?.addEventListener('click', (e) => {
      this.handleKanbanClick(e);
    });

    // Calendar date click - switch to list view and show filtered tasks
    Calendar.onDateClick(async (dateStr) => {
      this.currentFilter = 'date';
      this.updateActiveTab();
      if (this.currentView !== 'list') {
        this.currentView = 'list';
        document.getElementById('list-view').classList.add('active');
        document.getElementById('list-view').classList.remove('hidden');
        document.getElementById('calendar-view').classList.remove('active');
        document.getElementById('calendar-view').classList.add('hidden');
        document.getElementById('kanban-view')?.classList.remove('active');
        document.getElementById('kanban-view')?.classList.add('hidden');
        document.getElementById('stats-view')?.classList.remove('active');
        document.getElementById('stats-view')?.classList.add('hidden');
        const btn = document.getElementById('btn-toggle-view');
        if (btn) {
          btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>';
          btn.title = '日历视图';
        }
      }
      this.render();
    });

    // Batch operations
    document.getElementById('btn-batch-complete')?.addEventListener('click', () => Diagnostics.run('批量完成任务', async () => {
      const count = await TaskManager.batchComplete();
      this.showToast(`已完成 ${count} 个任务`);
      this.render();
      this.updateBatchBar();
    }));

    document.getElementById('btn-batch-delete')?.addEventListener('click', () => Diagnostics.run('批量删除任务', async () => {
      const count = await TaskManager.batchDelete();
      this.showToast(`已删除 ${count} 个任务`, count > 0);
      this.render();
      this.updateBatchBar();
    }));

    document.getElementById('btn-batch-cancel')?.addEventListener('click', () => {
      TaskManager.clearSelection();
      this.render();
      this.updateBatchBar();
    });

    // Long press for selection mode
    let longPressTimer = null;
    const taskListEl = document.getElementById('task-list');
    if (taskListEl) {
      taskListEl.addEventListener('mousedown', (e) => {
        const taskCard = e.target.closest('.task-card');
        if (!taskCard) return;
        if (e.target.closest('button, input, textarea, .task-checkbox, .card-subtask-checkbox')) return;

        longPressTimer = setTimeout(() => {
          this._justLongPressed = true;
          TaskManager.setSelectionMode(true);
          const taskId = taskCard.dataset.taskId;
          TaskManager.toggleSelection(taskId);
          this.render();
          this.updateBatchBar();
        }, 500);
      });

      taskListEl.addEventListener('mouseup', () => {
        clearTimeout(longPressTimer);
      });

      taskListEl.addEventListener('mouseleave', () => {
        clearTimeout(longPressTimer);
      });
    }
  }
};

if (typeof window !== 'undefined') {
  window.UIEvents = UIEvents;
}
