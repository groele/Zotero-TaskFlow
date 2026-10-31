/* Zotero TaskFlow settings pane script for Zotero 10+ */
window.TaskFlow_Preferences = (() => {
  const PREFIX = 'extensions.taskflow.';
  const getEl = (doc, id) => doc.getElementById(id) || doc.getElementById(id.replace('taskflow-', 'todolist-')) || doc.getElementById(id.replace('todolist-', 'taskflow-'));
  const HTML = 'http://www.w3.org/1999/xhtml';
  function reportOperationError(zot, doc, action, error) {
    zot?.logError?.('[TaskFlow] ' + action + ': ' + error);
    const host = zot?.TaskFlow || zot?.Todolist;
    Promise.resolve(host?.recordDiagnostic?.({ action, message: String(error?.message || error), stack: error?.stack })).catch(() => {});
    const status = getEl(doc, 'taskflow-pref-status');
    if (status) status.textContent = `${action}失败：${String(error?.message || error)}`;
  }

  const DEFAULTS = {
    // Window Modes
    windowMode: 'tab',
    subwindowAlwaysOnTop: false,
    subwindowCompactMode: true,

    // Display & Views
    defaultView: 'list',
    theme: 'zotero',
    showCompleted: true,
    sortOrder: 'dueDate',
    showWelcomeOnStartup: true,

    // ItemPane Sidebar & Context Menus
    enableItemPane: true,
    itemPaneShowProgressBar: true,
    itemPaneShowSubtasks: true,
    locateOnTaskClick: true,
    dragDropFromLibrary: true,
    itemContextMenuCreate: false,
    itemContextMenuBatch: false,

    // Child Note Sync
    autoSyncChildNote: true,
    childNoteTitle: '📝 [TaskFlow] 研读清单与进度',
    childNoteIncludeSubtasks: true,
    childNoteIncludeQuotes: true,
    childNoteAutoUpdateOnSubtask: true,

    // Automated Tags
    autoTagOnCreate: true,
    tagForPending: '待研读',
    autoTagOnComplete: true,
    tagForCompleted: '精读已完成',
    autoTagFromItem: true,

    // Academic & Reader
    academicPresets: true,
    defaultTaskType: 'literature_reading',
    defaultPriority: 'medium',
    defaultDueDays: 7,
    readingProfile: 'general',
    readerShortcutAction: 'create_instant',
    readerSelectionQuickAdd: false,
    pdfReaderJumpPage: true,

    // Focus & Sound Alerts
    enableSound: true,
    pomodoroFocus: 25,
    pomodoroShortBreak: 5,
    pomodoroLongBreak: 15,
    dailySummary: false,
    summaryTime: '09:00',

    // Maintenance
    autoArchiveDays: 0
  };

  const FIELDS = {
    window: [
      ['windowMode', '工作区默认打开模式', 'select', [
        ['tab', '📑 Zotero 内部选项卡 (无缝融入主界面标签栏)'],
        ['subwindow', '🗗 伴读紧凑子窗口 (460×760，轻量浮动，边看文献边做任务)'],
        ['window', '⬚ 独立桌面大窗口 (1120×760，大屏全景规划)']
      ]],
      ['subwindowAlwaysOnTop', '伴读子窗口始终置顶 (Always on Top，悬浮于 PDF 阅读器之上)', 'check'],
      ['subwindowCompactMode', '伴读子窗口启用专属紧凑伴读布局 (自动折叠侧边栏与紧凑流式列表)', 'check'],
    ],
    view: [
      ['defaultView', '默认主视图', 'select', [
        ['list', '📋 任务清单列表'],
        ['kanban', '🔄 状态看板分栏'],
        ['calendar', '📅 学术日历视图'],
        ['stats', '📊 进度统计分析']
      ]],
      ['theme', '默认视觉主题', 'select', [
        ['zotero', '跟随 Zotero 原生外观'],
        ['light', '☀️ 清爽明亮'],
        ['dark', '🌙 专注暗黑'],
        ['auto', '🔄 跟随操作系统']
      ]],
      ['sortOrder', '任务列表默认排序', 'select', [
        ['dueDate', '按截止日期先后'],
        ['priority', '按重要紧急优先级'],
        ['created', '按创建时间倒序'],
        ['alpha', '按标题名称字母']
      ]],
      ['showCompleted', '默认在列表中显示已完成项', 'check'],
      ['showWelcomeOnStartup', '首次启动时显示使用技巧提示', 'check'],
    ],
    literature: [
      ['enableItemPane', '在文献右侧详情栏中展示“Zotero TaskFlow待办事项”区域（重启 Zotero 后生效）', 'check'],
      ['itemPaneShowProgressBar', '在侧边详情栏中展示研读完成度彩色进度条', 'check'],
      ['itemPaneShowSubtasks', '在侧边详情栏中直接展开子任务里程碑与互动勾选框', 'check'],
      ['locateOnTaskClick', '点击待办卡片或文献徽标时，在 Zotero 文献库中高亮定位对应条目', 'check'],
      ['dragDropFromLibrary', '支持将文献条目直接从文献列表拖拽至待办看板创建研读任务', 'check'],
      ['itemContextMenuCreate', '在文献列表右键菜单中显示“添加为待办”选项（默认关闭）', 'check'],
      ['itemContextMenuBatch', '在文献列表右键菜单中显示“批量加入研读待办”选项（默认关闭）', 'check'],
    ],
    sync: [
      ['autoSyncChildNote', '自动将研读任务与进度同步为文献子笔记 (原生支持 Zotero 云端全平台多端同步)', 'check'],
      ['childNoteTitle', '同步子笔记标题格式', 'text'],
      ['childNoteIncludeSubtasks', '同步子笔记中包含完整的子任务里程碑清单', 'check'],
      ['childNoteIncludeQuotes', '同步子笔记中包含 PDF 摘录内容与定位链接', 'check'],
      ['childNoteAutoUpdateOnSubtask', '在侧边栏或看板中勾选子任务时，即时触发子笔记云端同步', 'check'],
    ],
    tags: [
      ['autoTagOnCreate', '为文献添加待办时，自动在 Zotero 中为文献打上“待研读”标签', 'check'],
      ['tagForPending', '待研读状态标签名', 'text'],
      ['autoTagOnComplete', '文献所有研读待办均勾选完成时，自动打上“精读已完成”标签', 'check'],
      ['tagForCompleted', '已完成状态标签名', 'text'],
      ['autoTagFromItem', '从文献新建待办时自动继承文献在 Zotero 的标签', 'check'],
    ],
    academic: [
      ['defaultDueDays', '研读任务默认截止天数', 'select', [['3', '3 天'], ['7', '一周'], ['14', '两周'], ['30', '30 天']]],
      ['readingProfile', '默认精读清单', 'select', [['general', '通用研读'], ['theory', '理论论文'], ['experiment', '实验论文'], ['review', '综述论文'], ['algorithm', '算法与复现']]],
      ['defaultTaskType', '默认待办学术类型', 'select', [
        ['literature_reading', '📖 论文研读与精读'],
        ['writing', '✍️ 论文写作与修改'],
        ['experiment', '🔬 实验设计与代码复现'],
        ['submission', '⏰ 会议期刊截稿 DDL'],
        ['peer_review', '📑 审稿与评阅']
      ]],
      ['defaultPriority', '新建任务默认优先级', 'select', [
        ['high', '高优先级 (P1)'],
        ['medium', '中优先级 (P2)'],
        ['low', '低优先级 (P3)']
      ]],
    ],
    reader: [
      ['readerSelectionQuickAdd', '在 PDF 选区工具条和批注菜单中显示“加入研读待办”快捷操作（默认关闭）', 'check'],
      ['readerShortcutAction', 'PDF 阅读器快捷键 (Ctrl+Shift+T) 行为', 'select', [
        ['create_instant', '提取选中文字与页码后立即创建待办'],
        ['open_modal', '打开待办编辑框以便调整']
      ]],
      ['pdfReaderJumpPage', '点击待办的 PDF 伴读按钮时自动跳转到对应页码', 'check'],
    ],
    reminders: [
      ['dailySummary', '启用每日学术待办晨报提醒', 'check'],
      ['summaryTime', '每日晨报提醒时间', 'time'],
    ]
  };

  function getPref(key) {
    if (typeof Zotero === 'undefined' || !Zotero.Prefs) return DEFAULTS[key];
    try {
      const fullKey = PREFIX + key;
      const type = typeof DEFAULTS[key];
      let val = Zotero.Prefs.get(fullKey, true);
      if (type === 'boolean') {
        return typeof val === 'boolean' ? val : DEFAULTS[key];
      }
      if (type === 'number') {
        return Number.isFinite(Number(val)) ? Number(val) : DEFAULTS[key];
      }
      return val ?? DEFAULTS[key];
    } catch (_) {
      return DEFAULTS[key];
    }
  }

  let preferenceQueue = Promise.resolve();
  function setPrefs(values) {
    const run = async () => {
      if (typeof Zotero === 'undefined' || !Zotero.Prefs) throw new Error('Zotero 设置服务尚未就绪');
      const previous = Object.fromEntries(Object.keys(values).map(key => [key, getPref(key)]));
      const changed = [];
      try {
        for (const [key, val] of Object.entries(values)) {
          Zotero.Prefs.set(PREFIX + key, val, true);
          changed.push(key);
        }
        const saveSettings = Zotero.TaskFlow?.saveData || Zotero.Todolist?.saveData;
        if (typeof saveSettings !== 'function') throw new Error('待办数据服务尚未就绪');
        const host = Zotero.TaskFlow || Zotero.Todolist;
        await saveSettings.call(host, { settings: values });
        if (Object.hasOwn(values, 'itemContextMenuCreate') || Object.hasOwn(values, 'itemContextMenuBatch')) {
          try { host?.refreshContextMenuVisibility?.(); } catch (_) {}
        }
      } catch (error) {
        for (const key of changed) {
          try {
            if (Zotero.Prefs.get(PREFIX + key, true) === values[key]) Zotero.Prefs.set(PREFIX + key, previous[key], true);
          } catch (rollbackError) { Zotero.logError?.('[TaskFlow] Failed to restore preference: ' + rollbackError); }
        }
        throw error;
      }
    };
    const result = preferenceQueue.then(run);
    preferenceQueue = result.catch(() => {});
    return result;
  }

  function setPref(key, val) { return setPrefs({ [key]: val }); }

  async function saveControl(doc, key, control, value) {
    control.disabled = true;
    try {
      await setPref(key, value);
      const status = getEl(doc, 'taskflow-pref-status');
      if (status) status.textContent = '设置已保存。';
    } catch (error) {
      reportOperationError(window.Zotero, doc, '保存设置', error);
    } finally {
      control.disabled = false;
      if (control.type === 'checkbox') control.checked = Boolean(getPref(key));
      else control.value = String(getPref(key));
    }
  }

  function renderGroup(doc, containerId, items) {
    const container = doc.getElementById(containerId);
    if (!container) return;
    container.replaceChildren();

    for (const [key, labelText, type, options] of items) {
      const currentVal = getPref(key);
      const visibleLabel = labelText;

      if (type === 'check') {
        const row = doc.createElementNS(HTML, 'label');
        row.className = 'todolist-check-row';

        const input = doc.createElementNS(HTML, 'input');
        input.type = 'checkbox';
        input.id = `pref-${key}`;
        input.className = 'todolist-control';
        input.checked = Boolean(currentVal);
        input.addEventListener('change', () => {
          saveControl(doc, key, input, input.checked);
        });

        const span = doc.createElementNS(HTML, 'span');
        span.className = 'todolist-control-label';
        span.textContent = visibleLabel;

        row.appendChild(input);
        row.appendChild(span);
        container.appendChild(row);
      } else if (type === 'select') {
        const row = doc.createElementNS(HTML, 'div');
        row.className = 'todolist-control-row';

        const label = doc.createElementNS(HTML, 'label');
        label.className = 'todolist-control-label';
        label.textContent = visibleLabel;
        label.htmlFor = `pref-${key}`;

        const select = doc.createElementNS(HTML, 'select');
        select.className = 'todolist-control';
        select.id = `pref-${key}`;

        for (const [optVal, optLabel] of (options || [])) {
          const option = doc.createElementNS(HTML, 'option');
          option.value = optVal;
          option.textContent = optLabel;
          if (String(currentVal) === String(optVal)) {
            option.selected = true;
          }
          select.appendChild(option);
        }

        select.addEventListener('change', () => {
          const typedVal = typeof DEFAULTS[key] === 'number' ? Number(select.value) : select.value;
          saveControl(doc, key, select, typedVal);
        });

        row.appendChild(label);
        row.appendChild(select);
        container.appendChild(row);
      } else if (type === 'text' || type === 'time') {
        const row = doc.createElementNS(HTML, 'div');
        row.className = 'todolist-control-row';

        const label = doc.createElementNS(HTML, 'label');
        label.className = 'todolist-control-label';
        label.textContent = visibleLabel;
        label.htmlFor = `pref-${key}`;

        const input = doc.createElementNS(HTML, 'input');
        input.type = type;
        input.id = `pref-${key}`;
        input.className = 'todolist-control';
        input.value = String(currentVal ?? '');

        input.addEventListener('change', () => {
          saveControl(doc, key, input, input.value.trim());
        });

        row.appendChild(label);
        row.appendChild(input);
        container.appendChild(row);
      }
    }
  }

  async function renderCustomTagsManager(doc, win) {
    const listEl = getEl(doc, 'taskflow-pref-tags-list');
    if (!listEl) return;
    listEl.replaceChildren();

    const zot = win?.Zotero || window.Zotero || (typeof Zotero !== 'undefined' ? Zotero : null);
    if (!zot?.TaskFlow?.loadData) {
      const emptySpan = doc.createElementNS(HTML, 'span');
      emptySpan.textContent = '暂无自定义标签 (Zotero 就绪后即可管理)';
      emptySpan.style.color = 'var(--flow-pref-muted)';
      emptySpan.style.fontSize = '13px';
      listEl.appendChild(emptySpan);
      return;
    }

    try {
      const data = await zot.TaskFlow.loadData();
      const tags = data.customTags || [];

      if (tags.length === 0) {
        const emptySpan = doc.createElementNS(HTML, 'span');
        emptySpan.textContent = '暂无自定义标签，可在下方输入名称并选择颜色创建。';
        emptySpan.style.color = 'var(--flow-pref-muted)';
        emptySpan.style.fontSize = '13px';
        listEl.appendChild(emptySpan);
        return;
      }

      for (const tag of tags) {
        const badge = doc.createElementNS(HTML, 'span');
        badge.className = 'todolist-pref-tag-badge';
        badge.style.backgroundColor = (tag.color || '#3b82f6') + '20';
        // Preserve the user's tag hue in the chip background and border while
        // keeping its label readable against every custom color.
        badge.style.color = 'var(--flow-pref-text)';
        badge.style.borderColor = (tag.color || '#3b82f6') + '40';

        const label = doc.createElementNS(HTML, 'span');
        label.textContent = `${tag.icon || '🏷️'} ${tag.name}`;
        badge.appendChild(label);

        const delBtn = doc.createElementNS(HTML, 'button');
        delBtn.type = 'button';
        delBtn.className = 'todolist-pref-tag-delete';
        delBtn.textContent = '×';
        delBtn.title = `删除标签 "${tag.name}"`;
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (delBtn.disabled) return;
          delBtn.disabled = true;
          try {
            await zot.TaskFlow.saveData({ customTagChanges: { deleted: [tag.id] } });
            await renderCustomTagsManager(doc, win);
          } catch (error) { reportOperationError(zot, doc, '删除自定义标签', error); }
          finally { delBtn.disabled = false; }
        });
        badge.appendChild(delBtn);

        listEl.appendChild(badge);
      }
    } catch (err) {
      reportOperationError(zot, doc, '刷新自定义标签', err);
    }
  }

  return {
    init(win) {
      const doc = win?.document || window.document;
      const pane = getEl(doc, 'taskflow-preferences-pane');
      if (pane) {
        if (pane._todolistInited) return;
        pane._todolistInited = true;
      }
      const statusEl = getEl(doc, 'taskflow-pref-status');
      const runOperation = async (action, callback) => {
        try { return await callback(); }
        catch (error) { reportOperationError(win?.Zotero || window.Zotero, doc, action, error); }
      };

      try {
        renderGroup(doc, 'todolist-pref-window', FIELDS.window);
        renderGroup(doc, 'todolist-pref-view', FIELDS.view);
        renderGroup(doc, 'todolist-pref-literature', FIELDS.literature);
        renderGroup(doc, 'todolist-pref-sync', FIELDS.sync);
        renderGroup(doc, 'todolist-pref-tags', FIELDS.tags);
        renderGroup(doc, 'todolist-pref-academic', FIELDS.academic);
        renderGroup(doc, 'todolist-pref-reader', FIELDS.reader);
        renderGroup(doc, 'todolist-pref-reminders', FIELDS.reminders);

        // Render Custom Tags Manager
        renderCustomTagsManager(doc, win);

        // Tag Color Palette Selection
        let activeTagColor = '#ef4444';
        const palette = getEl(doc, 'taskflow-tag-color-palette');
        if (palette) {
          const dots = palette.querySelectorAll('.todolist-pref-color-dot');
          dots.forEach((dot) => {
            dot.addEventListener('click', () => {
              dots.forEach((d) => { d.classList.remove('active'); d.setAttribute('aria-pressed', 'false'); });
              dot.classList.add('active');
              dot.setAttribute('aria-pressed', 'true');
              activeTagColor = dot.getAttribute('data-color') || '#ef4444';
            });
          });
        }

        // Add Tag Action
        const addTagBtn = getEl(doc, 'taskflow-btn-add-tag');
        const tagInput = getEl(doc, 'taskflow-new-tag-name');
        let addingTag = false;
        const handleAddTag = async () => {
          if (addingTag) return;
          const name = tagInput?.value?.trim();
          if (!name) return;
          const zot = win?.Zotero || window.Zotero || (typeof Zotero !== 'undefined' ? Zotero : null);
          if (!zot?.TaskFlow && !zot?.Todolist) return;

          addingTag = true;
          if (addTagBtn) addTagBtn.disabled = true;
          if (tagInput) tagInput.disabled = true;
          try {
            const tag = {
              id: 'tag_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
              name: name,
              color: activeTagColor || '#3b82f6',
              icon: '🏷️'
            };
            await zot.TaskFlow.saveData({ customTagChanges: { added: [tag] } });
            if (tagInput) tagInput.value = '';
            await renderCustomTagsManager(doc, win);
          } catch (error) { reportOperationError(zot, doc, '添加自定义标签', error); }
          finally {
            addingTag = false;
            if (addTagBtn) addTagBtn.disabled = false;
            if (tagInput) tagInput.disabled = false;
          }
        };

        addTagBtn?.addEventListener('click', handleAddTag);
        tagInput?.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
          }
        });

        // Export JSON
        getEl(doc, 'taskflow-btn-export-json')?.addEventListener('click', () => {
          runOperation('导出 JSON', () => Zotero?.TaskFlow?.exportData?.('json'));
        });

        // Export CSV
        getEl(doc, 'taskflow-btn-export-csv')?.addEventListener('click', () => {
          runOperation('导出 CSV', () => Zotero?.TaskFlow?.exportData?.('csv'));
        });

        // Export Markdown
        getEl(doc, 'taskflow-btn-export-markdown')?.addEventListener('click', () => {
          runOperation('导出 Markdown', () => Zotero?.TaskFlow?.exportData?.('markdown'));
        });

        // Export TXT
        getEl(doc, 'taskflow-btn-export-txt')?.addEventListener('click', () => {
          runOperation('导出 TXT', () => Zotero?.TaskFlow?.exportData?.('txt'));
        });

        // Import JSON
        getEl(doc, 'taskflow-btn-import-file')?.addEventListener('click', () => runOperation('导入数据', async () => {
          const mode = getEl(doc, 'taskflow-import-mode')?.value || 'merge';
          const status = getEl(doc, 'taskflow-import-status');
          if (status) {
            status.textContent = '正在准备导入…';
            status.style.color = 'var(--flow-pref-muted)';
          }
          const res = await Zotero?.TaskFlow?.importDataFile?.(mode, win);
          if (res?.success) {
            if (status) status.textContent = `✅ 成功导入 ${res.count} 个任务与标签数据！`;
            renderCustomTagsManager(doc, win);
          } else if (res?.error) {
            if (status) {
              status.textContent = `❌ 导入失败：${res.error}`;
              status.style.color = 'var(--flow-pref-danger)';
            }
          } else {
            if (status) status.textContent = '';
          }
        }));

        // Print Tasks
        getEl(doc, 'taskflow-btn-print')?.addEventListener('click', () => {
          runOperation('打印任务', () => Zotero?.TaskFlow?.printTasks?.(win));
        });

        // Copy Tasks Summary
        getEl(doc, 'taskflow-btn-copy-summary')?.addEventListener('click', () => {
          runOperation('复制任务摘要', () => Zotero?.TaskFlow?.copyTasksSummary?.(win));
        });

        // Clear All Data
        getEl(doc, 'taskflow-btn-clear-all')?.addEventListener('click', () => runOperation('清空数据', async () => {
          if (!win.confirm('⚠️ 警告：确定要清空所有待办任务、历史记录与自定义标签吗？此操作无法撤销！')) {
            if (statusEl) statusEl.textContent = '数据未清空。';
            return;
          }
          const cleared = await Zotero?.TaskFlow?.clearAllData?.(win);
          if (cleared) {
            await renderCustomTagsManager(doc, win);
            if (statusEl) statusEl.textContent = '所有数据已清空。';
          } else if (statusEl) statusEl.textContent = '数据未清空。';
        }));

        // Reset button
        const resetBtn = getEl(doc, 'taskflow-btn-reset-defaults');
        if (resetBtn) {
          resetBtn.addEventListener('click', () => runOperation('恢复默认设置', async () => {
            if (resetBtn.disabled || !win.confirm('确定要恢复 TaskFlow 默认设置吗？')) return;
            resetBtn.disabled = true;
            try {
              await setPrefs(DEFAULTS);
              for (const [group, fields] of Object.entries(FIELDS)) renderGroup(doc, `todolist-pref-${group}`, fields);
              if (statusEl) statusEl.textContent = '默认设置已恢复。';
            } finally { resetBtn.disabled = false; }
          }));
        }

        if (statusEl) {
          statusEl.textContent = '设置已加载；修改会自动保存。';
        }
      } catch (err) {
        if (statusEl) {
          statusEl.textContent = '加载设置时发生异常: ' + err.message;
          statusEl.className = 'todolist-pref-status todolist-pref-error';
        }
      }
    }
  };
})();

window.Todolist_Preferences = window.TaskFlow_Preferences;

// Auto-init fallback if onload already fired in modern Gecko / Zotero 10+
if (typeof window !== 'undefined' && window.document) {
  if (window.document.readyState === 'complete' || window.document.readyState === 'interactive') {
    setTimeout(() => {
      const pane = window.document.getElementById('todolist-preferences-pane') || window.document.getElementById('taskflow-preferences-pane');
      if (pane && !pane._todolistInited && !pane._taskflowInited) {
        pane._todolistInited = true;
        pane._taskflowInited = true;
        window.TaskFlow_Preferences?.init?.(window);
      }
    }, 50);
  }
}
