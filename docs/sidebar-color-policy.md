# TaskFlow workspace colors

The workspace uses the Flow blue accent for primary actions and selected navigation. Settings retain their own scoped native palette. Do not use a warning/danger color as the ordinary navigation accent.

- Light accent text: `#245ac7`; dark accent text: `#9bbcff`.
- `--primary-solid` supplies filled controls (`#245ac7` light, `#315fbf` dark). It is separate from accent text so white labels and check marks remain readable in dark mode. Hover uses `--primary-dark`.
- Navigation text and icons inherit the same neutral foreground. Selection and ordinary selected counts use the accent palette; overdue indicators retain the danger palette.
- Sidebar filters share the sidebar surface. Main-toolbar `.filter-tabs` styling must be scoped to the main content and must not give sidebar filters a separate white/dark card, extra padding or a top border.
- A narrow viewport uses a readable drawer width and full-width actions; desktop compact navigation rules must not squeeze its labels.
- The explicit light theme declares `color-scheme: light`. Explicit dark and auto-dark palettes override it, while the existing application bridge continues to propagate Zotero host-theme changes.

The 2026-10-22 development candidate was checked in Windows Zotero 10.0.6: light/dark × expanded/collapsed, two narrow-drawer cases, two simulated host-theme notifications through the native UI bridge, actual computed colors and native screenshots. Button and inactive-navigation contrast exceeded 4.5:1. Overdue badge styling was exercised with a controlled badge state, independently of task-loading behavior. These checks do not constitute a full task workflow or user-profile installation test.

Existing automated tests: `npm test`. Build a separate candidate without replacing a published artifact using `python scripts/build-package.py --output <candidate.xpi>`.
