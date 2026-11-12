/**
 * Zotero TaskFlow - Preferences Model & Configuration Schema
 */

declare let Zotero: any;

export const PREFIX = 'extensions.taskflow.';

export const DEFAULTS: Record<string, any> = {
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
  toolbarShowBadge: true,

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

export type FieldItem = [
  key: string,
  labelText: string,
  type: 'select' | 'check' | 'text' | 'time',
  options?: [val: string, label: string][]
];

export const FIELDS: Record<string, FieldItem[]> = {
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
    ['toolbarShowBadge', '在主工具栏图标上显示未完成待办数量角标', 'check'],
  ],
  academic: [
    ['defaultDueDays', '研读任务默认截止天数', 'select', [['3', '3 天'], ['7', '一周'], ['14', '两周'], ['30', '30 天']]],
    ['readingProfile', '默认精读清单体系', 'select', [
      ['general', '通用研读 (背景/方法/结果/讨论)'],
      ['theory', '理论论文 (公理/引理/定理证明/推论)'],
      ['experiment', '实验论文 (基准数据集/指标/消融实验)'],
      ['review', '综述论文 (分类体系/演进脉络/未来方向)'],
      ['algorithm', '算法与复现 (复杂度/伪代码/开源验证)']
    ]],
    ['defaultTaskType', '默认待办学术分类', 'select', [
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
  literature: [
    ['enableItemPane', '在文献右侧详情栏中展示“Zotero TaskFlow待办事项”区域（重启 Zotero 后生效）', 'check'],
    ['itemPaneShowProgressBar', '在侧边详情栏中展示研读完成度彩色进度条', 'check'],
    ['itemPaneShowSubtasks', '在侧边详情栏中直接展开子任务里程碑与互动勾选框', 'check'],
    ['locateOnTaskClick', '点击待办卡片或文献徽标时，在 Zotero 文献库中高亮定位对应条目', 'check'],
    ['dragDropFromLibrary', '支持将文献条目直接从文献列表拖拽至待办看板创建研读任务', 'check'],
    ['itemContextMenuCreate', '在文献列表右键菜单中显示“添加为待办”选项（默认关闭）', 'check'],
    ['itemContextMenuBatch', '在文献列表右键菜单中显示“批量加入研读待办”选项（默认关闭）', 'check'],
  ],
  reader: [
    ['readerSelectionQuickAdd', '在 PDF 选区工具条和批注菜单中显示“加入研读待办”快捷操作（默认关闭）', 'check'],
    ['readerShortcutAction', 'PDF 阅读器快捷键 (Ctrl+Shift+T) 行为', 'select', [
      ['create_instant', '提取选中文字与页码后立即创建待办'],
      ['open_modal', '打开待办编辑框以便调整']
    ]],
    ['pdfReaderJumpPage', '点击待办的 PDF 伴读按钮时自动跳转到对应页码', 'check'],
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
  reminders: [
    ['enableSound', '启用任务到期与专注完成提示音', 'check'],
    ['dailySummary', '启用每日学术待办晨报提醒', 'check'],
    ['summaryTime', '每日晨报提醒时间', 'time'],
  ]
};

export function getPref(key: string): any {
  if (typeof Zotero === 'undefined' || !Zotero.Prefs) return DEFAULTS[key];
  try {
    const fullKey = PREFIX + key;
    const type = typeof DEFAULTS[key];
    const val = Zotero.Prefs.get(fullKey, true);
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

let preferenceQueue: Promise<void> = Promise.resolve();

export function setPrefs(values: Record<string, any>): Promise<void> {
  const run = async () => {
    if (typeof Zotero === 'undefined' || !Zotero.Prefs) throw new Error('Zotero 设置服务尚未就绪');
    const previous = Object.fromEntries(Object.keys(values).map((key) => [key, getPref(key)]));
    const changed: string[] = [];
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
        try { host?.refreshContextMenuVisibility?.(); } catch (_) { }
      }
      if (Object.hasOwn(values, 'toolbarShowBadge')) {
        try { host?.updateAllToolbarBadges?.(); } catch (_) { }
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
  preferenceQueue = result.catch(() => { });
  return result;
}

export function setPref(key: string, val: any): Promise<void> {
  return setPrefs({ [key]: val });
}
