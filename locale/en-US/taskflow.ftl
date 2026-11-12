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
taskflow-item-pane-btn-board = Task Board
taskflow-item-pane-btn-subwindow = Companion Window
taskflow-item-pane-btn-sync-note = Sync Child Note
taskflow-item-pane-btn-open-pdf = Open PDF
taskflow-item-pane-btn-milestones = Add Reading Milestones

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
taskflow-pref-status-loaded = Settings loaded; changes are saved automatically.
taskflow-pref-status-saved = Settings saved.
taskflow-pref-status-reset = Default preferences restored.
taskflow-pref-status-cleared = All task data cleared.
taskflow-pref-status-unchanged = Data was not cleared.
taskflow-pref-status-load-error = Failed to load settings: { $message }
taskflow-pref-status-op-error = { $action } failed: { $message }

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
taskflow-pref-release-notes-content = Updated to v16.0.2 with Kanban explicit status consistency, ItemPane drag-and-drop & card reordering, active timer unload/shutdown settlement, cross-window refresh queuing, preference dependency sync, and local date alignment.
taskflow-pref-build-date-label = Build Date
taskflow-pref-build-date-value = 2026-11-12
taskflow-pref-package-download-label = Package Download
taskflow-pref-package-download-link = Download TaskFlow v16.0.2
taskflow-pref-repository-label = Source Repository
taskflow-pref-repository-link = GitHub Repository


# Dynamic Controls Fluent Localization
taskflow-pref-field-windowMode = Workspace Default Window Mode
taskflow-pref-field-subwindowAlwaysOnTop = Companion Subwindow Always on Top (Floats above PDF Reader)
taskflow-pref-field-subwindowCompactMode = Enable compact stream layout for companion window
taskflow-pref-field-defaultView = Default Main View
taskflow-pref-field-theme = Default Visual Theme
taskflow-pref-field-sortOrder = Default Sort Order for Task Lists
taskflow-pref-field-showCompleted = Show completed tasks in lists by default
taskflow-pref-field-showWelcomeOnStartup = Show quick-start tips on first launch
taskflow-pref-field-toolbarShowBadge = Show pending task count badge on main toolbar icon
taskflow-pref-field-defaultDueDays = Default Due Days for Literature Reading Tasks
taskflow-pref-field-readingProfile = Default Reading Milestone Template
taskflow-pref-field-defaultTaskType = Default Academic Task Category
taskflow-pref-field-defaultPriority = Default Priority for New Tasks
taskflow-pref-field-enableItemPane = Show Zotero TaskFlow section in right-hand item pane (requires Zotero restart)
taskflow-pref-field-itemPaneShowProgressBar = Show colored progress bar in item pane
taskflow-pref-field-itemPaneShowSubtasks = Show subtask checklist and checkboxes in item pane
taskflow-pref-field-locateOnTaskClick = Clicking linked literature task card locates and highlights item in main library
taskflow-pref-field-dragDropFromLibrary = Allow drag-and-drop from library list into TaskFlow workspace to create tasks
taskflow-pref-field-itemContextMenuCreate = Show "Add as Task" in item context menu
taskflow-pref-field-itemContextMenuBatch = Show "Batch Add Reading Tasks" in multi-item context menu
taskflow-pref-field-readerShortcutAction = Default action when pressing shortcut in PDF Reader selection
taskflow-pref-field-readerSelectionQuickAdd = Show "Add to Tasks" button in PDF Reader selection popup
taskflow-pref-field-pdfReaderJumpPage = Auto-jump to page and annotation quote when opening linked PDF attachment
taskflow-pref-field-autoSyncChildNote = Enable automatic bidirectional sync between tasks and item child notes
taskflow-pref-field-childNoteTitle = Title for auto-generated rich-text child note
taskflow-pref-field-childNoteIncludeSubtasks = Include subtask checklist in child note
taskflow-pref-field-childNoteIncludeQuotes = Include quotes and annotation excerpts in child note
taskflow-pref-field-childNoteAutoUpdateOnSubtask = Auto-update child note checkboxes when subtasks are toggled in board
taskflow-pref-field-autoTagOnCreate = Auto-add tag to Zotero item when reading task is created
taskflow-pref-field-tagForPending = Tag name for pending reading items
taskflow-pref-field-autoTagOnComplete = Auto-add tag to Zotero item when reading task is completed
taskflow-pref-field-tagForCompleted = Tag name for completed reading items
taskflow-pref-field-autoTagFromItem = Inherit item tags automatically when creating tasks
taskflow-pref-field-enableSound = Play sound alert on task due, pomodoro finish, or task completion
taskflow-pref-field-pomodoroFocus = Focus Sprint Duration (minutes)
taskflow-pref-field-pomodoroShortBreak = Short Break Duration (minutes)
taskflow-pref-field-pomodoroLongBreak = Long Break Duration (minutes)
taskflow-pref-field-dailySummary = Deliver daily morning summary notification of due reading tasks
taskflow-pref-field-summaryTime = Daily morning summary delivery time
taskflow-pref-field-autoArchiveDays = Auto-archive completed tasks after specified days (0 = never)

# Dynamic Select Options Fluent Localization
taskflow-pref-opt-windowMode-tab = 📑 Zotero Built-in Tab (Integrates into main tab bar)
taskflow-pref-opt-windowMode-subwindow = 🗗 Companion Subwindow (460×760, floating alongside PDF reader)
taskflow-pref-opt-windowMode-window = ⬚ Standalone Desktop Window (1120×760, full overview)
taskflow-pref-opt-defaultView-list = 📋 Task List
taskflow-pref-opt-defaultView-kanban = 🔄 Status Kanban
taskflow-pref-opt-defaultView-calendar = 📅 Academic Calendar
taskflow-pref-opt-defaultView-stats = 📊 Progress Analytics
taskflow-pref-opt-theme-zotero = Follow Zotero Native Appearance
taskflow-pref-opt-theme-light = ☀️ Light
taskflow-pref-opt-theme-dark = 🌙 Dark
taskflow-pref-opt-theme-auto = 🔄 Follow System
taskflow-pref-opt-sortOrder-dueDate = By Due Date
taskflow-pref-opt-sortOrder-priority = By Priority
taskflow-pref-opt-sortOrder-created = By Created Time (Newest First)
taskflow-pref-opt-sortOrder-alpha = By Title Alphabetically
taskflow-pref-opt-defaultDueDays-3 = 3 Days
taskflow-pref-opt-defaultDueDays-7 = 1 Week
taskflow-pref-opt-defaultDueDays-14 = 2 Weeks
taskflow-pref-opt-defaultDueDays-30 = 30 Days
taskflow-pref-opt-readingProfile-general = General Reading (Background / Method / Results / Discussion)
taskflow-pref-opt-readingProfile-theory = Theory Paper (Axioms / Lemmas / Proofs / Corollaries)
taskflow-pref-opt-readingProfile-experiment = Empirical Paper (Benchmarks / Metrics / Ablation Study)
taskflow-pref-opt-readingProfile-review = Survey Paper (Taxonomy / Evolution / Future Directions)
taskflow-pref-opt-readingProfile-algorithm = Algorithm & Reproduction (Complexity / Pseudocode / Open Source)
taskflow-pref-opt-defaultTaskType-literature_reading = 📖 Literature Reading & Study
taskflow-pref-opt-defaultTaskType-writing = ✍️ Paper Writing & Revision
taskflow-pref-opt-defaultTaskType-experiment = 🔬 Experiment Design & Reproduction
taskflow-pref-opt-defaultTaskType-submission = ⏰ Conference / Journal Deadlines
taskflow-pref-opt-defaultTaskType-peer_review = 📑 Peer Review & Refereeing
taskflow-pref-opt-defaultPriority-high = High Priority (P1)
taskflow-pref-opt-defaultPriority-medium = Medium Priority (P2)
taskflow-pref-opt-defaultPriority-low = Low Priority (P3)
taskflow-pref-opt-readerShortcutAction-create_instant = Create task immediately with selection & page
taskflow-pref-opt-readerShortcutAction-open_modal = Open task edit dialog to customize
