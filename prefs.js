// Zotero TaskFlow - Default Preferences (v14.0.0)
// Group 1: Window Modes & Multi-window Layout
pref("extensions.taskflow.windowMode", "tab");
pref("extensions.taskflow.subwindowAlwaysOnTop", false);
pref("extensions.taskflow.subwindowCompactMode", true);

// Group 2: Display & Views
pref("extensions.taskflow.defaultView", "list");
pref("extensions.taskflow.theme", "zotero");
pref("extensions.taskflow.showCompleted", true);
pref("extensions.taskflow.sortOrder", "dueDate");
pref("extensions.taskflow.showWelcomeOnStartup", true);

// Group 3: Literature ItemPane Sidebar
pref("extensions.taskflow.enableItemPane", true);
pref("extensions.taskflow.itemPaneShowProgressBar", true);
pref("extensions.taskflow.itemPaneShowSubtasks", true);
pref("extensions.taskflow.locateOnTaskClick", true);
pref("extensions.taskflow.dragDropFromLibrary", true);
pref("extensions.taskflow.itemContextMenuCreate", false);
pref("extensions.taskflow.itemContextMenuBatch", false);

// Group 4: Child Note Cloud Sync (Multi-Device Sync)
pref("extensions.taskflow.autoSyncChildNote", true);
pref("extensions.taskflow.childNoteTitle", "📝 [TaskFlow] 研读清单与进度");
pref("extensions.taskflow.childNoteIncludeSubtasks", true);
pref("extensions.taskflow.childNoteIncludeQuotes", true);
pref("extensions.taskflow.childNoteAutoUpdateOnSubtask", true);

// Group 5: Automated Literature Tags
pref("extensions.taskflow.autoTagOnCreate", true);
pref("extensions.taskflow.tagForPending", "待研读");
pref("extensions.taskflow.autoTagOnComplete", true);
pref("extensions.taskflow.tagForCompleted", "精读已完成");
pref("extensions.taskflow.autoTagFromItem", true);

// Group 6: Academic Presets & Reader Automation
pref("extensions.taskflow.academicPresets", true);
pref("extensions.taskflow.defaultTaskType", "literature_reading");
pref("extensions.taskflow.defaultPriority", "medium");
pref("extensions.taskflow.defaultDueDays", 7);
pref("extensions.taskflow.readingProfile", "general");
pref("extensions.taskflow.readerShortcutAction", "create_instant");
pref("extensions.taskflow.readerSelectionQuickAdd", false);
pref("extensions.taskflow.pdfReaderJumpPage", true);

// Group 7: Pomodoro Focus Sprint & Sound Reminders
pref("extensions.taskflow.enableSound", true);
pref("extensions.taskflow.pomodoroFocus", 25);
pref("extensions.taskflow.pomodoroShortBreak", 5);
pref("extensions.taskflow.pomodoroLongBreak", 15);
pref("extensions.taskflow.dailySummary", false);
pref("extensions.taskflow.summaryTime", "09:00");

// Group 8: Maintenance & Archival
pref("extensions.taskflow.autoArchiveDays", 0);