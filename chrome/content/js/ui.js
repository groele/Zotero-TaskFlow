// UI core controller and facade

const UI = {
  currentView: 'list',
  currentFilter: 'all',
  currentSearch: '',
  currentPriorityFilter: 'all',
  currentSortOrder: 'dueDate',
  currentTheme: 'light',

  // Initialize UI
  async init() {
    // Load theme preference
    const settings = await Storage.getSettings();
    this._settings = settings;
    ZoteroBridge.applyWindowLayout();
    this.currentSortOrder = settings.sortOrder || 'dueDate';
    this.showCompleted = settings.showCompleted !== false;
    this.currentTheme = settings.theme || 'light';
    this.applyTheme(this.currentTheme);

    this.setupEventListeners();
    await TaskManager.loadTasks();
    this._storageReady = true;
    Storage.subscribe(data => {
      if (typeof Tags !== 'undefined') Tags.customTags = data.customTags || [];
      if (typeof Templates !== 'undefined') Templates.customTemplates = data.customTemplates || [];
      if (typeof Advanced !== 'undefined') Advanced.searchHistory = data.searchHistory || [];
      if (!this._storageReady || TaskManager._mutating) return;
      TaskManager._tasks = Storage.clone(data.tasks || []);
      TaskManager._baseline = Storage.clone(TaskManager._tasks);
      const ids = new Set(TaskManager._tasks.map(t => t.id));
      TaskManager._selectedTasks = new Set([...TaskManager._selectedTasks].filter(id => ids.has(id)));
      if (typeof TimeTracking !== 'undefined') TimeTracking.activeTimers = data.activeTimers || {};
      if (data.settings) {
        this.currentSortOrder = data.settings.sortOrder || 'dueDate';
        this.showCompleted = data.settings.showCompleted !== false;
        if (data.settings.theme !== this.currentTheme) {
          this.currentTheme = data.settings.theme;
          this.applyTheme(this.currentTheme);
        }
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) sortSelect.value = this.currentSortOrder;
        const viewChanged = data.settings.defaultView !== this._settings.defaultView;
        this._settings = data.settings;
        ZoteroBridge.applyWindowLayout();
        if (viewChanged) this.switchView(data.settings.defaultView);
      }
      this.render();
      this.updateBatchBar();
    });
    chrome.storage.onChanged?.addListener((changes, area) => {
      if (area === 'local' && !TaskManager._mutating) Diagnostics.run('刷新任务数据', async () => Storage.acceptData(await Storage.getAll()));
    });
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = this.currentSortOrder;
    await this.switchView(settings.defaultView || 'list');

    // Initialize drag and drop
    DragDrop.init();

    // Initialize keyboard shortcuts
    Shortcuts.init();

    // Load templates
    await Templates.loadCustomTemplates();

    // Check for pending task from context menu
    await this.checkPendingTask();

    // Listen for context menu task messages
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'CONTEXT_MENU_TASK') {
        this.checkPendingTask();
      }
    });
  },

  // Check for pending task from context menu
  async checkPendingTask() {
    // Zotero context-menu commands arrive through host navigation, not Chrome storage.
    if (Storage.isZotero()) return;
    try {
      const result = await chrome.storage.local.get('pendingTask');

      if (result.pendingTask) {
        // Clear the pending task
        await chrome.storage.local.remove('pendingTask');

        // Open modal with the task data
        Modal.openAdd({
          title: result.pendingTask.title,
          description: result.pendingTask.description || ''
        });
      }
    } catch (error) {
      Diagnostics.report('读取浏览器临时任务', error);
    }
  }
};

// Mix in decoupled UI submodules
Object.assign(
  UI,
  typeof UIState !== 'undefined' ? UIState : (typeof window !== 'undefined' ? window.UIState : {}),
  typeof UIActions !== 'undefined' ? UIActions : (typeof window !== 'undefined' ? window.UIActions : {}),
  typeof UIViews !== 'undefined' ? UIViews : (typeof window !== 'undefined' ? window.UIViews : {}),
  typeof UIDelegation !== 'undefined' ? UIDelegation : (typeof window !== 'undefined' ? window.UIDelegation : {}),
  typeof UIInlineEdit !== 'undefined' ? UIInlineEdit : (typeof window !== 'undefined' ? window.UIInlineEdit : {}),
  typeof UIEvents !== 'undefined' ? UIEvents : (typeof window !== 'undefined' ? window.UIEvents : {})
);

const uiActionNames = {
  handleTaskListClick: '列表任务操作', handleKanbanClick: '看板任务操作',
  handleToggleComplete: '更新任务状态', handleDuplicateTask: '复制任务',
  showStats: '显示统计', switchView: '切换视图', toggleTheme: '切换主题'
};
for (const name of Object.keys(uiActionNames)) {
  const handler = UI[name];
  if (typeof handler === 'function') {
    UI[name] = async function(...args) {
      try { return await handler.apply(this, args); }
      catch (error) { Diagnostics.showFailure(uiActionNames[name], error); }
    };
  }
}

if (typeof window !== 'undefined') {
  window.UI = UI;
}
