# Changelog

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
