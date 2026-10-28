# Changelog

## 12.6.5 - 2026-10-28

### Fixed
- Allow explicit candidate builds without publishing an unreleased version in the automatic update feed; validate release XPI checksums and cover both paths with regression tests.
- Keep in-app version, release date, download link, and release documentation aligned.

### Verification
- 141 Node.js tests and 5 Python build-policy tests passed. The production package and feed checksum match. No main-profile installation is claimed.

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
