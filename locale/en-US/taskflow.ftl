taskflow-menu-open = Zotero TaskFlow Academic Workspace
taskflow-item-menu-create = Add Reading Task for Selected Item
taskflow-item-menu-batch = Batch Add Reading Tasks
taskflow-item-menu-milestones = Generate Structured Reading Milestones
taskflow-item-menu-filter = View Associated Tasks for This Item
taskflow-item-menu-sync-note = Sync Tasks to Item Child Note
taskflow-collection-menu-create = Create Reading Plan for This Collection
taskflow-collection-menu-plan = Batch Generate Reading Plan for All Papers in Collection
taskflow-toolbar-tooltip = Open Zotero TaskFlow Academic Workspace (Ctrl+Alt+T)
taskflow-reader-add-task = Convert Selection/Annotation to Task (Ctrl+Shift+T)
# This message targets the native collapsible-section. A value would erase its controls.
taskflow-item-pane-header =
    .label = Zotero TaskFlow Tasks
    .tooltiptext = Zotero TaskFlow Tasks & Milestones
taskflow-item-pane-sidenav =
    .title = Open Zotero TaskFlow Tasks
    .aria-label = Zotero TaskFlow Tasks
    .tooltiptext = Open Zotero TaskFlow Tasks
taskflow-item-pane-count =
    { $count ->
        [0] No tasks for this item
       *[other] { $count } associated task(s)
    }
taskflow-item-pane-create = Add Task
taskflow-item-pane-open-board = Open TaskFlow Workspace
taskflow-item-pane-open-pdf = Open PDF Companion
taskflow-item-pane-sync-note = 📝 Sync to Child Note

# Compatibility aliases
todolist-menu-open = Zotero TaskFlow Academic Workspace
todolist-item-menu-create = Add Reading Task for Selected Item
todolist-item-menu-batch = Batch Add Reading Tasks
todolist-item-menu-milestones = Generate Structured Reading Milestones
todolist-item-menu-filter = View Associated Tasks for This Item
todolist-item-menu-sync-note = Sync Tasks to Item Child Note
todolist-collection-menu-create = Create Reading Plan for This Collection
todolist-collection-menu-plan = Batch Generate Reading Plan for All Papers in Collection
todolist-toolbar-tooltip = Open Zotero TaskFlow Academic Workspace (Ctrl+Alt+T)
todolist-reader-add-task = Convert Selection/Annotation to Task (Ctrl+Shift+T)
todolist-item-pane-header =
    .label = Zotero TaskFlow Tasks
    .tooltiptext = Zotero TaskFlow Tasks & Milestones
todolist-item-pane-sidenav =
    .title = Open Zotero TaskFlow Tasks
    .aria-label = Zotero TaskFlow Tasks
    .tooltiptext = Open Zotero TaskFlow Tasks
todolist-item-pane-count =
    { $count ->
        [0] No tasks for this item
       *[other] { $count } associated task(s)
    }
todolist-item-pane-create = Add Task
todolist-item-pane-open-board = Open TaskFlow Workspace
todolist-item-pane-open-pdf = Open PDF Companion
todolist-item-pane-sync-note = 📝 Sync to Child Note

taskflow-item-pane-progress =
    .aria-label = Linked task completion

taskflow-toolbar-status =
    .tooltiptext = Open TaskFlow: { $count } to do or in progress, excluding overdue; { $overdue } overdue (Ctrl+Alt+T)
    .aria-label = Open TaskFlow: { $count } to do or in progress, excluding overdue; { $overdue } overdue (Ctrl+Alt+T)

# Preferences
taskflow-pref-title = Zotero TaskFlow
taskflow-pref-status-loading = Loading settings…
taskflow-pref-status-saved = Settings saved.

# Card 1: Workspace & Primary Views
taskflow-pref-card-view-title = 1. Workspace & Primary Views
taskflow-pref-card-view-desc = Configure TaskFlow default workspace mode (tab / companion subwindow / standalone window), always-on-top, compact layout, view types, themes, and sort order.
taskflow-pref-subheading-window = Default Workspace & Companion Window
taskflow-pref-subheading-view = Task Views & Appearance

# Card 2: Academic Templates & Task Defaults
taskflow-pref-card-academic-title = 2. Academic Templates & Task Defaults
taskflow-pref-card-academic-desc = Configure academic subtask presets, default task category, intensive reading systems, due day offsets, and priorities.
taskflow-pref-subheading-academic-defaults = New Task Defaults & Reading Presets

# Card 3: Zotero Library & Reader Integration
taskflow-pref-card-literature-title = 3. Zotero Library & Reader Integration
taskflow-pref-card-literature-desc = Manage ItemPane sidebar, library drag-and-drop task creation, item context menus, and PDF reader companion integration.
taskflow-pref-subheading-itempane = Item Details Sidebar & Context Menus
taskflow-pref-subheading-reader = PDF Reader Companion Integration
taskflow-pref-reader-desc = When disabled, selection toolbars and annotation menus hide TaskFlow quick actions; the Ctrl+Shift+T shortcut continues to work as configured above.

# Card 4: Child Note Cloud Sync & Auto-Tagging
taskflow-pref-card-sync-tags-title = 4. Child Note Cloud Sync & Auto-Tagging
taskflow-pref-card-sync-tags-desc = Bi-directionally sync reading progress into native item child notes for multi-device sync, and automate academic tags as tasks advance.
taskflow-pref-subheading-sync = Child Note Multi-Device Cloud Sync
taskflow-pref-subheading-tags = Automated Reading Status Tags

# Card 5: Task Reminders & Daily Briefing
taskflow-pref-card-reminders-title = 5. Task Reminders & Daily Briefing
taskflow-pref-card-reminders-desc = Configure daily morning summary time, summarizing today's tasks and overdue alerts.
taskflow-pref-subheading-daily-summary = Daily Summary Reminders
taskflow-pref-daily-summary-desc = When daily summary is disabled, the scheduled time will not trigger notifications.

# Card 6: Tag Assets, Backup & Data Security
taskflow-pref-card-backup-title = 6. Tag Assets, Backup & Data Security
taskflow-pref-subheading-custom-tags = Custom Academic Tag Management
taskflow-pref-custom-tags-desc = Add and manage custom academic reading tags to use across task edit forms:
taskflow-pref-new-tag-name =
    .placeholder = Tag name, e.g. Advisor Review / Top Venue
    .aria-label = New Academic Tag Name
taskflow-pref-color-red =
    .title = Red
    .aria-label = Red
taskflow-pref-color-orange =
    .title = Orange
    .aria-label = Orange
taskflow-pref-color-yellow =
    .title = Yellow
    .aria-label = Yellow
taskflow-pref-color-green =
    .title = Green
    .aria-label = Green
taskflow-pref-color-blue =
    .title = Blue
    .aria-label = Blue
taskflow-pref-color-purple =
    .title = Purple
    .aria-label = Purple
taskflow-pref-color-pink =
    .title = Pink
    .aria-label = Pink
taskflow-pref-color-slate =
    .title = Gray
    .aria-label = Gray
taskflow-pref-btn-add-tag = ➕ Add Tag
taskflow-pref-subheading-export = Full Data Backup & Multi-Format Export
taskflow-pref-export-desc = Export your entire task database into multiple formats for offline cold backup and third-party workflow integration:
taskflow-pref-btn-export-json = 📑 Export Full JSON Backup
taskflow-pref-btn-export-csv = 📊 Export CSV Table (Excel Compatible)
taskflow-pref-btn-export-markdown = 📝 Export Markdown Tasks (Obsidian/Notion)
taskflow-pref-btn-export-txt = 📄 Export Plain TXT
taskflow-pref-subheading-import = Data Import & Disaster Recovery
taskflow-pref-import-mode-select =
    .aria-label = Data Import Merge Mode
taskflow-pref-import-mode-merge = Smart Merge (Keep existing and append imported)
taskflow-pref-import-mode-overwrite = Complete Overwrite (Clear existing and replace with backup)
taskflow-pref-btn-import-file = 📂 Select JSON File to Import
taskflow-pref-subheading-shortcuts = Shortcuts & Diagnostics
taskflow-pref-shortcuts-help-title = Global Shortcuts:
taskflow-pref-shortcuts-help-board = • Ctrl+Alt+T (Mac: Cmd+Alt+T): Open TaskFlow Academic Workspace anytime (respects default window mode).
taskflow-pref-shortcuts-help-reader = • Ctrl+Shift+T (Mac: Cmd+Shift+T): In PDF reader, open edit dialog or create task immediately according to shortcut settings.
taskflow-pref-subheading-output = Task Summary Output
taskflow-pref-btn-print = 🖨️ Print Academic Task List
taskflow-pref-btn-copy-summary = 📋 Copy Reading Summary (Markdown for Group Meeting)
taskflow-pref-subheading-danger = Danger Zone & Preference Reset
taskflow-pref-danger-desc = Resetting preferences only restores defaults for switches and options; clearing task data permanently deletes all tasks and progress.
taskflow-pref-btn-clear-all = 🗑️ Clear All Task Data
taskflow-pref-btn-reset-defaults = 🔄 Restore Default Preferences

# Release Information Footer
taskflow-pref-release-info-footer =
    .aria-label = Release Information
taskflow-pref-release-title = Release Information
taskflow-pref-release-notes-label = Release Notes
taskflow-pref-release-notes-content = Updated to v14.3.0 with zero hardcoded UI text in preferences (100% Fluent-driven), decoupled host and view architectures, and enhanced lifecycle and read-only protections.
taskflow-pref-build-date-label = Build Date
taskflow-pref-build-date-value = 2026-11-04
taskflow-pref-package-download-label = Package Download
taskflow-pref-package-download-link = Download TaskFlow v14.3.0
taskflow-pref-repository-label = Source Repository
taskflow-pref-repository-link = GitHub Repository
