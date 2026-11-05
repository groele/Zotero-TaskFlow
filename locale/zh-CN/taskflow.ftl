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
taskflow-pref-status-saved = 设置已保存。

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
taskflow-pref-release-notes-content = 升级版本至 v14.4.0，深度治理设置页零硬编码文案（100% Fluent 驱动），解耦宿主与视图架构，强化生命周期与只读防护。
taskflow-pref-build-date-label = 构建日期
taskflow-pref-build-date-value = 2026-11-04
taskflow-pref-package-download-label = 最新安装包
taskflow-pref-package-download-link = 下载 TaskFlow v14.4.0
taskflow-pref-repository-label = 项目仓库
taskflow-pref-repository-link = GitHub 仓库
