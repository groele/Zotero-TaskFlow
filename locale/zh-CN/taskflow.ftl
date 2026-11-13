taskflow-menu-open = Zotero TaskFlow 学术任务看板
taskflow-item-menu-create = 添加为待办
taskflow-item-menu-batch = 批量加入研读待办
taskflow-item-menu-milestones = 生成结构化研读里程碑
taskflow-item-menu-filter = 查看此文献的关联待办
taskflow-item-menu-sync-note = 同步待办为文献子笔记
taskflow-collection-menu-create = 为此分类创建专题研读规划
taskflow-collection-menu-plan = 为此分类所有文献批量生成研读清单
taskflow-toolbar-tooltip = 打开 Zotero TaskFlow 任务工作台 (Ctrl+Alt+T)
taskflow-reader-add-task = 将选中文本/批注转为研读待办 (Ctrl+Shift+T)
# 此消息应用到整个原生 collapsible-section。仅设置属性，以保留标题和正文控件。
taskflow-item-pane-header =
    .label = Zotero TaskFlow待办事项
    .tooltiptext = Zotero TaskFlow待办事项与研读任务
taskflow-item-pane-sidenav =
    .title = 打开 Zotero TaskFlow待办事项
    .aria-label = Zotero TaskFlow待办事项
    .tooltiptext = 打开 Zotero TaskFlow待办事项
taskflow-item-pane-count =
    { $count ->
        [0] 此文献暂无待办事项
       *[other] 共有 { $count } 个关联待办事项
    }
taskflow-item-pane-create = 添加待办
taskflow-item-pane-open-board = 打开 TaskFlow 看板
taskflow-item-pane-open-pdf = 打开 PDF 伴读
taskflow-item-pane-sync-note = 📝 同步为文献笔记
taskflow-item-pane-btn-board = 待办看板
taskflow-item-pane-btn-subwindow = 伴读窗口
taskflow-item-pane-btn-sync-note = 同步子笔记
taskflow-item-pane-btn-open-pdf = 打开 PDF
taskflow-item-pane-btn-milestones = 追加精读清单

# 兼容别名
todolist-menu-open = Zotero TaskFlow 学术任务看板
todolist-item-menu-create = 添加为待办
todolist-item-menu-batch = 批量加入研读待办
todolist-item-menu-milestones = 生成结构化研读里程碑
todolist-item-menu-filter = 查看此文献的关联待办
todolist-item-menu-sync-note = 同步待办为文献子笔记
todolist-collection-menu-create = 为此分类创建专题研读规划
todolist-collection-menu-plan = 为此分类所有文献批量生成研读清单
todolist-toolbar-tooltip = 打开 Zotero TaskFlow 任务工作台 (Ctrl+Alt+T)
todolist-reader-add-task = 将选中文本/批注转为研读待办 (Ctrl+Shift+T)
todolist-item-pane-header =
    .label = Zotero TaskFlow待办事项
    .tooltiptext = Zotero TaskFlow待办事项与研读任务
todolist-item-pane-sidenav =
    .title = 打开 Zotero TaskFlow待办事项
    .aria-label = Zotero TaskFlow待办事项
    .tooltiptext = 打开 Zotero TaskFlow待办事项
todolist-item-pane-count =
    { $count ->
        [0] 此文献暂无待办事项
       *[other] 共有 { $count } 个关联待办事项
    }
todolist-item-pane-create = 添加待办
todolist-item-pane-open-board = 打开 TaskFlow 看板
todolist-item-pane-open-pdf = 打开 PDF 伴读
todolist-item-pane-sync-note = 📝 同步为文献笔记

taskflow-item-pane-progress =
    .aria-label = 关联任务完成进度

taskflow-toolbar-status =
    .tooltiptext = 打开 TaskFlow：{ $count } 项待办/进行中（不含逾期）；另有 { $overdue } 项已逾期（Ctrl+Alt+T）
    .aria-label = 打开 TaskFlow：{ $count } 项待办/进行中（不含逾期）；另有 { $overdue } 项已逾期（Ctrl+Alt+T）

# 偏好设置面板 (Preferences)
taskflow-pref-title = Zotero TaskFlow
taskflow-pref-status-loading = 正在加载设置项…
taskflow-pref-status-loaded = 设置已加载；修改会自动保存。
taskflow-pref-status-saved = 设置已保存。
taskflow-pref-status-reset = 默认设置已恢复。
taskflow-pref-status-cleared = 所有数据已清空。
taskflow-pref-status-unchanged = 数据未清空。
taskflow-pref-status-load-error = 加载设置时发生异常: { $message }
taskflow-pref-status-op-error = { $action }失败：{ $message }

# 卡片 1: 工作区与主视图形态
taskflow-pref-card-view-title = 1. 工作区与主视图形态
taskflow-pref-card-view-desc = 配置 TaskFlow 工作区默认打开模式（选项卡/伴读子窗口/独立大窗口）、伴读置顶与紧凑流式布局，以及主视图形态、视觉主题与排序方式。
taskflow-pref-subheading-window = 默认工作区与伴读窗口
taskflow-pref-subheading-view = 任务视图与外观

# 卡片 2: 学术模板与任务默认值
taskflow-pref-card-academic-title = 2. 学术模板与任务默认值
taskflow-pref-card-academic-desc = 配置学术研读子任务模板预设、默认待办类型、精读清单体系与新建任务截止天数/优先级。
taskflow-pref-subheading-academic-defaults = 新建任务默认值与精读预设

# 卡片 3: Zotero 文献与阅读联动
taskflow-pref-card-literature-title = 3. Zotero 文献与阅读联动
taskflow-pref-card-literature-desc = 管理文献详情侧栏 (ItemPane)、文献列表拖拽创建、列表右键上下文菜单以及 PDF 阅读器选区伴读联动。
taskflow-pref-subheading-itempane = 文献详情侧栏与列表右键菜单
taskflow-pref-subheading-reader = PDF 阅读器伴读联动
taskflow-pref-reader-desc = 快捷加入开关关闭时，阅读器选区工具条和批注菜单不会显示 TaskFlow 添加入口；Ctrl+Shift+T 快捷键仍按上方设置工作。

# 卡片 4: 文献子笔记云同步与自动标签
taskflow-pref-card-sync-tags-title = 4. 文献子笔记云同步与自动标签
taskflow-pref-card-sync-tags-desc = 支持将研读进度双向无缝沉淀为文献原生子笔记实现全端云同步，并随研读推进自动管理文献学术标签。
taskflow-pref-subheading-sync = 文献子笔记多端云同步
taskflow-pref-subheading-tags = 文献研读状态自动打标

# 卡片 5: 任务提醒与学术晨报
taskflow-pref-card-reminders-title = 5. 任务提醒与学术晨报
taskflow-pref-card-reminders-desc = 设置每日学术待办晨报提醒时间，定时归纳今日待办与逾期提醒。
taskflow-pref-subheading-daily-summary = 每日摘要提醒
taskflow-pref-daily-summary-desc = 关闭每日摘要提醒时，时间设置不会触发通知。

# 卡片 6: 标签资产、备份与数据安全
taskflow-pref-card-backup-title = 6. 标签资产、备份与数据安全
taskflow-pref-subheading-custom-tags = 自定义学术研读标签管理
taskflow-pref-custom-tags-desc = 在此添加与管理专属学术研读标签，并在任务编辑中即时调用：
taskflow-pref-new-tag-name =
    .placeholder = 标签名，如：导师审阅 / 顶会投稿
    .aria-label = 新学术研读标签名称
taskflow-pref-color-red =
    .title = 红色
    .aria-label = 红色
taskflow-pref-color-orange =
    .title = 橙色
    .aria-label = 橙色
taskflow-pref-color-yellow =
    .title = 黄色
    .aria-label = 黄色
taskflow-pref-color-green =
    .title = 绿色
    .aria-label = 绿色
taskflow-pref-color-blue =
    .title = 蓝色
    .aria-label = 蓝色
taskflow-pref-color-purple =
    .title = 紫色
    .aria-label = 紫色
taskflow-pref-color-pink =
    .title = 粉色
    .aria-label = 粉色
taskflow-pref-color-slate =
    .title = 灰色
    .aria-label = 灰色
taskflow-pref-btn-add-tag = ➕ 添加标签
taskflow-pref-subheading-export = 数据全量备份与跨格式导出
taskflow-pref-export-desc = 一键将任务库完整导出为多种格式，支持本地离线冷备份与第三方工具无缝联动：
taskflow-pref-btn-export-json = 📑 导出 JSON 全量备份
taskflow-pref-btn-export-csv = 📊 导出 CSV 表格 (Excel 兼容)
taskflow-pref-btn-export-markdown = 📝 导出 Markdown 清单 (Obsidian/Notion)
taskflow-pref-btn-export-txt = 📄 导出 TXT 纯文本
taskflow-pref-subheading-import = 数据导入与灾备恢复
taskflow-pref-import-mode-select =
    .aria-label = 数据导入合并模式
taskflow-pref-import-mode-merge = 智能合并 (保留现有并补充导入)
taskflow-pref-import-mode-overwrite = 完全覆盖 (清空现有并替换为备份)
taskflow-pref-btn-import-file = 📂 选择 JSON 文件导入
taskflow-pref-subheading-shortcuts = 快捷键与诊断
taskflow-pref-shortcuts-help-title = 全局快捷键支持：
taskflow-pref-shortcuts-help-board = • Ctrl+Alt+T (Mac: Cmd+Alt+T)：随时唤起 TaskFlow 学术任务看板（依默认窗口设置）。
taskflow-pref-shortcuts-help-reader = • Ctrl+Shift+T (Mac: Cmd+Shift+T)：按上方 PDF 快捷键设置，在阅读器中打开待办编辑框或立即创建任务。
taskflow-pref-subheading-output = 清单输出
taskflow-pref-btn-print = 🖨️ 打印学术清单
taskflow-pref-btn-copy-summary = 📋 复制研读概览 (Markdown 组会汇报)
taskflow-pref-subheading-danger = 危险操作与偏好重置
taskflow-pref-danger-desc = 恢复默认偏好只重置开关和选项；清空任务数据会永久删除全部任务及其进度。
taskflow-pref-btn-clear-all = 🗑️ 清空所有任务数据
taskflow-pref-btn-reset-defaults = 🔄 恢复默认偏好设置

# 底部版本信息区
taskflow-pref-release-info-footer =
    .aria-label = 版本信息
taskflow-pref-release-title = 版本信息
taskflow-pref-release-notes-label = 版本说明
taskflow-pref-release-notes-content = 升级至 v16.0.3：统一看板显式状态与逾期列规则、补全侧栏文献拖入与卡片排序、退出时自动结算计时器、修复跨窗口并发刷新同步、完善设置联动与提示音开关及本地日历日期计算。
taskflow-pref-build-date-label = 构建日期
taskflow-pref-build-date-value = 2026-11-12
taskflow-pref-package-download-label = 最新安装包
taskflow-pref-package-download-link = 下载 TaskFlow v16.0.3
taskflow-pref-repository-label = 项目仓库
taskflow-pref-repository-link = GitHub 仓库


# 动态控件 Fluent 本地化 (Dynamic Controls)
taskflow-pref-field-windowMode = 工作区默认打开模式
taskflow-pref-field-subwindowAlwaysOnTop = 伴读子窗口始终置顶 (Always on Top，悬浮于 PDF 阅读器之上)
taskflow-pref-field-subwindowCompactMode = 伴读子窗口启用专属紧凑伴读布局 (自动折叠侧边栏与紧凑流式列表)
taskflow-pref-field-defaultView = 默认主视图
taskflow-pref-field-theme = 默认视觉主题
taskflow-pref-field-sortOrder = 任务列表默认排序
taskflow-pref-field-showCompleted = 默认在列表中显示已完成项
taskflow-pref-field-showWelcomeOnStartup = 首次启动时显示使用技巧提示
taskflow-pref-field-toolbarShowBadge = 在主工具栏图标上显示未完成待办数量角标
taskflow-pref-field-defaultDueDays = 研读任务默认截止天数
taskflow-pref-field-readingProfile = 默认精读清单体系
taskflow-pref-field-defaultTaskType = 默认待办学术分类
taskflow-pref-field-defaultPriority = 新建任务默认优先级
taskflow-pref-field-enableItemPane = 在文献右侧详情栏中展示“Zotero TaskFlow待办事项”区域（重启 Zotero 后生效）
taskflow-pref-field-itemPaneShowProgressBar = 在侧边详情栏中展示研读完成度彩色进度条
taskflow-pref-field-itemPaneShowSubtasks = 在侧边详情栏中直接展示子任务清单与快速复选
taskflow-pref-field-locateOnTaskClick = 在列表或看板中点击关联文献任务卡片时，主窗口自动定位并高亮该条目
taskflow-pref-field-dragDropFromLibrary = 支持从 Zotero 主界面文献列表直接拖拽条目进入 TaskFlow 工作区建立待办
taskflow-pref-field-itemContextMenuCreate = 在文献条目右键菜单中显示“添加为待办”
taskflow-pref-field-itemContextMenuBatch = 在多选文献条目右键菜单中显示“批量加入研读待办”
taskflow-pref-field-readerShortcutAction = PDF 阅读器选中文字按快捷键时的默认动作
taskflow-pref-field-readerSelectionQuickAdd = 在 PDF 阅读器选区悬浮气泡中显示“加入待办”快捷按钮
taskflow-pref-field-pdfReaderJumpPage = 点击待办文献的 PDF 链接时，自动跳转到关联的高亮页码或选区批注
taskflow-pref-field-autoSyncChildNote = 启用研读待办与文献子笔记自动双向同步
taskflow-pref-field-childNoteTitle = 同步生成的富文本子笔记标题
taskflow-pref-field-childNoteIncludeSubtasks = 同步笔记中包含精读步骤子任务列表与复选框
taskflow-pref-field-childNoteIncludeQuotes = 同步笔记中包含从 PDF 中摘录的高亮引文与批注
taskflow-pref-field-childNoteAutoUpdateOnSubtask = 当子任务在看板勾选完成时，自动增量更新文献子笔记中的完成标记
taskflow-pref-field-autoTagOnCreate = 新建文献研读任务时，自动为 Zotero 文献条目附加标签
taskflow-pref-field-tagForPending = 未完成研读时附加的标签名称
taskflow-pref-field-autoTagOnComplete = 当文献全部研读任务完成时，自动为文献条目附加标签
taskflow-pref-field-tagForCompleted = 研读完成后附加的标签名称
taskflow-pref-field-autoTagFromItem = 新建任务时自动继承 Zotero 文献条目原有的学术标签
taskflow-pref-field-enableSound = 任务到期、专注番茄钟结束或完成打卡时播放提示音
taskflow-pref-field-pomodoroFocus = 专注冲刺时长 (分钟)
taskflow-pref-field-pomodoroShortBreak = 短休息时长 (分钟)
taskflow-pref-field-pomodoroLongBreak = 长休息时长 (分钟)
taskflow-pref-field-dailySummary = 每天早晨定时推送学术待办晨报与到期提醒通知
taskflow-pref-field-summaryTime = 学术晨报提醒推送时间
taskflow-pref-field-autoArchiveDays = 自动归档或隐藏多少天前已完成的历史待办 (0 表示永不自动归档)

# 动态下拉选项 Fluent 本地化 (Dynamic Select Options)
taskflow-pref-opt-windowMode-tab = 📑 Zotero 内部选项卡 (无缝融入主界面标签栏)
taskflow-pref-opt-windowMode-subwindow = 🗗 伴读紧凑子窗口 (460×760，轻量浮动，边看文献边做任务)
taskflow-pref-opt-windowMode-window = ⬚ 独立桌面大窗口 (1120×760，大屏全景规划)
taskflow-pref-opt-defaultView-list = 📋 任务清单列表
taskflow-pref-opt-defaultView-kanban = 🔄 状态看板分栏
taskflow-pref-opt-defaultView-calendar = 📅 学术日历视图
taskflow-pref-opt-defaultView-stats = 📊 进度统计分析
taskflow-pref-opt-theme-zotero = 跟随 Zotero 原生外观
taskflow-pref-opt-theme-light = ☀️ 清爽明亮
taskflow-pref-opt-theme-dark = 🌙 专注暗黑
taskflow-pref-opt-theme-auto = 🔄 跟随操作系统
taskflow-pref-opt-sortOrder-dueDate = 按截止日期先后
taskflow-pref-opt-sortOrder-priority = 按重要紧急优先级
taskflow-pref-opt-sortOrder-created = 按创建时间倒序
taskflow-pref-opt-sortOrder-alpha = 按标题名称字母
taskflow-pref-opt-defaultDueDays-3 = 3 天
taskflow-pref-opt-defaultDueDays-7 = 一周
taskflow-pref-opt-defaultDueDays-14 = 两周
taskflow-pref-opt-defaultDueDays-30 = 30 天
taskflow-pref-opt-readingProfile-general = 通用研读 (背景/方法/结果/讨论)
taskflow-pref-opt-readingProfile-theory = 理论论文 (公理/引理/定理证明/推论)
taskflow-pref-opt-readingProfile-experiment = 实验论文 (基准数据集/指标/消融实验)
taskflow-pref-opt-readingProfile-review = 综述论文 (分类体系/演进脉络/未来方向)
taskflow-pref-opt-readingProfile-algorithm = 算法与复现 (复杂度/伪代码/开源验证)
taskflow-pref-opt-defaultTaskType-literature_reading = 📖 论文研读与精读
taskflow-pref-opt-defaultTaskType-writing = ✍️ 论文写作与修改
taskflow-pref-opt-defaultTaskType-experiment = 🔬 实验设计与代码复现
taskflow-pref-opt-defaultTaskType-submission = ⏰ 会议期刊截稿 DDL
taskflow-pref-opt-defaultTaskType-peer_review = 📑 审稿与评阅
taskflow-pref-opt-defaultPriority-high = 高优先级 (P1)
taskflow-pref-opt-defaultPriority-medium = 中优先级 (P2)
taskflow-pref-opt-defaultPriority-low = 低优先级 (P3)
taskflow-pref-opt-readerShortcutAction-create_instant = 提取选中文字与页码后立即创建待办
taskflow-pref-opt-readerShortcutAction-open_modal = 打开待办编辑框以便调整
