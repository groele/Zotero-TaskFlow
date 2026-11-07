# Changelog

## 16.0.0 - 2026-11-06

### Architecture Refactoring & Debt Clearance
- Fully decomposed monolithic modules into domain-focused submodules:
  - `src/itemPane.ts` (848 lines) -> modular `src/itemPane/` components (DOM view, context menu, drag & drop, task scheduler, quick add, and profile section).
  - `src/modules/windowToolbar.ts` (597 lines) -> `src/modules/toolbar/` (button group, shortcuts, and message bridge).
  - `src/preferences.ts` (524 lines) -> `src/preferences/` (configuration model and UI binding).
  - `src/modules/literature.ts` (462 lines) -> `src/modules/literature/` (literature task mapping, reading plan templates, and child note sync).
- All 30 TypeScript source files in `src/` strictly adhere to the $le 360$-line ceiling (maximum is 302 lines).
- Established `scripts/architecture-baseline.json` (`debtCleared: true`, 0 oversized modules) and `scripts/architecture-guard.mjs` (14 automated architecture guard tests).
- Completely eliminated legacy version compatibility baggage: removed historical `[Todolist]` note and tag checks in child note sync, using pure `[TaskFlow]` and `TaskFlow` tags.
- Upgraded `bootstrap.js` to modern XPCOM shorthands (`Cc`/`Ci`).
- End-to-end automated verification with 158 tests passing and 14 architecture guard tests.

## 15.0.0 - 2026-11-05

### Major Architectural Milestone
- Completed end-to-end data processing pipeline audit: hardened persistence, IPC messaging, literature note sync, and export workflows.
- Closed timer escape in `shutdown()` by explicitly clearing `_paneUndoTimer` and resetting deletion buffers.
- Guarded `printTasks` window against browser popup blocker failures.
- Granular domain module decoupling under `src/modules/` with strictly bounded file lengths (100~300 lines per module).
- Migrated codebase to modern modular TypeScript (`src/`) and esbuild compilation pipeline.
- Standardized package commands (`npm run tsc`, `npm run build:source`, `npm run build`, `npm test`) aligned with Zotero Flow engineering standards.
- Production host build outputs pure Firefox 140+ / Gecko 153+ IIFE bundle `chrome/content/scripts/index.js`.
- Fully decoupled domain rules (`taskRules.ts`), workflow rules (`literatureWorkflow.ts`), and item pane controls (`itemPane.ts`).
- End-to-end automated verification with 158 tests passing and automated SHA-512 package checksum generation.


## 14.4.0 - 2026-11-05

### Added
- Modern TypeScript + esbuild compilation pipeline: modularized host architecture into src/ (config.ts, 	askRules.ts, literatureWorkflow.ts, itemPane.ts, index.ts).
- Standardized package scripts: unified cross-platform workflow with 
pm run tsc, 
pm run build:source, 
pm run build, and 
pm test.
- Automated packaging and hash closure: scripts/build.mjs orchestrates TypeScript compilation, esbuild bundle generation (Firefox 140+ / Gecko 153+ target), XPI packaging, and SHA-512 verification.

### Changed
- Refactored legacy monolithic script loading into single modern IIFE host runtime bundle.
- Streamlined clean build lifecycle and added comprehensive test coverage with 158 tests passing.


## 14.3.0 - 2026-11-04

### Changed
- Lifecycle shutdown closes all standalone companion windows (`Todolist_SubWindow`, `Todolist_Window`) and cleans up recursive delivery retry timers.
- Align preferences UI controls with Workspace 4.2 Grid standards: unify action group classes, support release-info CSS classes, and indent Card 4 controls by 24px (40px golden line).
- Guard read-only literature items in sidebar: disable "同步子笔记" button for non-editable items, prevent false-positive sync success notices, and support direct item ID lookups.
- Deduplicate data change notifications: avoid 3x duplicate `postMessage` delivery when direct data listeners are registered.
- Protect CSV exports against spreadsheet formula injection (`=`, `+`, `@`, `-` prefix escaping) in host export handler.
- Upgrade update feed and package checksums to SHA-512 (`sha512:`), prune redundant historical feed entries, and expand sub-repository AGENTS.md documentation.

## 12.8.3 - 2026-10-30

- Ensure "打开 PDF" consistently aligns side-by-side to the right of "同步子笔记" across both empty and populated states.
- Re-position additional milestone creation to its own full-width bottom row when tasks are present.
## 12.8.2 - 2026-10-30

- Soften quick-add submit button and container colors to align with sidebar's functional pastel palette.
## 12.8.1 - 2026-10-30

- Fix layout overflow for the quick-add submit button in narrow item panes with nowrap and flex alignment.
- Place the "打开 PDF" button alongside "同步子笔记" in the two-column action grid instead of spanning full width.

## 12.8.0 - 2026-10-30

- Harden the item-linked literature card: escape year and page values before inserting them into HTML.
- Rename the Zotero item-pane section, its side-nav entry, tooltips and the TaskFlow tab title from "学术待办"/"Academic Tasks" to "Zotero TaskFlow待办事项"/"Zotero TaskFlow Tasks".
- Make the item-pane quick-create row prominent: visible "快速新建待办" label, accent-bordered larger field, clearer placeholder and a solid "添加" submit button (class names and accessible labels unchanged).
- Declutter the item-pane empty state: remove the duplicate "暂无研读任务" title and the duplicate bottom "精读清单" button, and correct the hint to name the real "添加到论文研读" button.
- Label the new-task priority choices as "高优先/中优先/低优先" and give the selector a tooltip.
- Add a repository-level AGENTS.md documenting build, test, versioning and release constraints.

## 12.7.3 - 2026-10-30

- Let long item-pane task titles grow to their full height instead of overflowing Zotero native button sizing into controls and reading steps.
- Move the Zotero locate action below the title and make the generate-reading-checklist button fill its own row with a larger click target.

## 12.7.2 - 2026-10-30

- Fix standalone TaskFlow windows failing to recover the Zotero host instance, which prevented initialization and made the window-mode button appear inert.
- Route standalone-window host commands directly through Zotero APIs; retain message transport for embedded tabs and frames.

## 12.7.1 - 2026-10-30

### Changed
- Add a clearly labeled remove-task control beside task titles in the main list and Zotero item pane. It removes only the TaskFlow task, keeps the linked Zotero item, and retains the existing undo behavior.
- Count only non-overdue to-do and in-progress tasks in the toolbar badge. Completed and overdue tasks are excluded; localized tooltip and accessible text report overdue tasks separately.

## 12.7.0 - 2026-10-30

### Added
- Show a non-interactive toolbar badge for unfinished parent tasks: hidden at zero and capped at 99+. Localized tooltips expose full unfinished/overdue counts; data changes refresh all main windows without polling.
- Preserve the existing colored icons and geometry. Toolbar badge styles and pending startup refreshes clean up with their window.

## 12.6.9 - 2026-10-29

### Changed
- Distinguish workspace actions in soft blue, reading/PDF actions in soft green and note/scheduling actions in soft amber, with matching hover states and dark color-scheme variants.
- Simplify item-pane styling into one scoped stylesheet: quiet task rows, fine separators, wrapped titles, restrained priority accents and lightweight secondary actions. Remove decorative emoji and duplicate card treatments while preserving existing controls and behavior.

## 12.6.8 - 2026-10-29

### Fixed
- Preserve item-pane drafts, temporary priority choices and subtask expansion across data refreshes; reset transient state on item changes and prevent repeated submission during a save.
- Improve host-themed item pane controls, inherited typography, keyboard focus, reduced motion, progress semantics and subtask accessibility.
- Apply the native default priority to workspace forms and quick creation; preserve explicit selections.
- Honor the configured default priority when generating collection reading plans and creating tasks from PDF selections or annotations.

## 12.6.7 - 2026-10-28

### Fixed
- Remove duplicate window-mode quick-open buttons and unsupported controls from preferences; reorganize active settings by task defaults, reminders, literature integration, and data maintenance.

### Verification
- 142 Node.js tests and 5 build-policy tests passed; XPI package, identity, version, and update-feed SHA-256 verified.

## 12.6.6 - 2026-10-28

### Added
- Add an opt-in PDF text-selection and annotation quick action for creating reading tasks; it is off by default.
- Split reader controls into their own preferences subsection; group routine output separately from destructive/reset actions, and make tag-color controls keyboard accessible.

### Verification
- 141 Node.js tests and 5 Python build-policy tests passed; settings XHTML parsed and candidate/production XPI checksums matched.

## 12.6.3 - 2026-10-25

### Fixed
- Revalidate reminder ownership, live task state and daily-summary settings immediately before delivery; use current task titles.

### Verification
- 137 automated tests and isolated Zotero 10.0.6 initial/restart controlled acceptance. No main-profile installation or full visual regression.

## 12.6.1 - 2026-10-22

### Fixed
- Unify the Flow blue accent, remove the sidebar filter surface mismatch, and improve dark-theme filled-control contrast.
- Keep narrow-drawer labels and actions readable without compact desktop style interference.

### Verification
- 128 automated tests and focused isolated Zotero 10.0.6 palette/layout acceptance. Existing data and preferences remain compatible.

## 12.6.0 - 2026-10-22

### Added
- Connect the existing locate-on-click, library drag-and-drop, PDF page navigation, and compact companion settings to their runtime behavior.

### Fixed
- Create reading tasks from the actual dragged Zotero items instead of the current library selection. Handle multiple items, parent attachments, library identity, duplicate tasks, and failed writes.
- Avoid loading duplicate Fluent messages while retaining legacy localization aliases.

### Compatibility
- Existing task data and preference keys remain compatible. This release does not expand the declared Zotero version range.
