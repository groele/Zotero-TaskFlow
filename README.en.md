# Zotero TaskFlow


**Zotero Flow Series · Tasks**

*让研究的每一步衔接起来。 / Connect each step of research.*

Turn literature reading into trackable tasks and plans.

[简体中文](README.md) · [English](README.en.md)

[![Release](https://img.shields.io/badge/version-12.8.3-245ac7?style=flat-square)](https://github.com/groele/Zotero-TaskFlow/releases/tag/v12.8.3) · [Download XPI](https://github.com/groele/Zotero-TaskFlow/releases/download/v12.8.3/zotero-taskflow-12.8.3.xpi) · [Report an issue](https://github.com/groele/Zotero-TaskFlow/issues)

[Overview](#overview) · [Installation and updates](#installation) · [Quick start](#quick-start) · [Key features](#features) · [Settings](#settings) · [Data, sync, and services](#data) · [Compatibility and validation](#compatibility) · [Troubleshooting](#troubleshooting) · [Development and documentation](#development) · [The Flow series](#series) · [Origin and license](#license)

<a id="overview"></a>

## Overview

For researchers planning reading, writing, and project work: link tasks, deadlines, subtasks, and reading progress to Zotero papers and PDF locations.

Install this add-on independently and combine it with other Flow products as needed.

<a id="installation"></a>

## Installation and updates

1. Download [zotero-taskflow-12.8.3.xpi](https://github.com/groele/Zotero-TaskFlow/releases/download/v12.8.3/zotero-taskflow-12.8.3.xpi) (add-on version **12.8.3**), not the Source code ZIP.
2. In Zotero, open **Tools → Plugins/Add-ons**, then choose **Install Add-on From File** from the gear menu.
3. Select the XPI, complete installation, and restart if requested.

Use the add-on manager to check for later updates. Automatic checking/installation depends on Zotero, per-add-on update settings, and compatibility. Back up important data before upgrades or migration.

Update feed: [update.json](https://github.com/groele/Zotero-TaskFlow/blob/main/update.json) · Add-on ID: `todolist@groele.org`.

<a id="quick-start"></a>

## Quick start

1. Select a paper, create a reading task, and add a deadline and checklist.
2. Use Ctrl/Cmd+Shift+T in the PDF reader to create a task from selected text and available page information.
3. Update progress in the item pane or task views and export JSON backups regularly.

<a id="features"></a>

## Key features

| Differentiator | What it does | Boundary |
|---|---|---|
| Full research-task structure | Manages title, description, due date, priority, category, tags, subtasks, and recurring schedules, with bulk actions, filtering, and sorting. | The task database is local to the Zotero data directory; installing the add-on does not automatically synchronize it across devices. |
| List, board, calendar, and statistics | Advances work in a list, changes status/order on a board, schedules deadlines in a calendar, and displays completion, overdue, and trend data. | Statistics reflect current local task data; they do not replace lab records, calendars, or time audits. |
| Paper, PDF, and reading-location links | Creates tasks from selected items or PDF text and retains available excerpts, pages, and annotation anchors; a task can return to its item or PDF location. | Return navigation depends on the original PDF, page, or anchor still being available; it is not a permanent copy of PDF content. |
| Five reading checklists and focus timing | Supplies editable templates for general, theoretical, experimental, review, and algorithm/reproduction papers, with step tracking and focus-time records. | Templates are a working framework, not an automated judgment of research quality or task completion. |
| Native item pane and optional child notes | Shows linked tasks/progress in Zotero’s ItemPane, with quick create/check actions, and can write reading details into Zotero child notes. | Child notes follow Zotero’s own sync; the TaskFlow task store and child notes are separate layers. |
| Reliable reminders, backup, and recovery | Checks reminders/daily summaries while Zotero runs, finalizes after delivery confirmation, releases failed leases for retry, and exports/imports local backups. | Reminders require a running Zotero and host notification support; a backup is recovery material, not automatic cloud sync. |

<a id="settings"></a>

## Settings

Open the add-on preference page in **Zotero → Settings → Zotero TaskFlow**.

Configure windows, default view, literature links, reminders, and data maintenance. Settings marked unavailable are not connected; Pomodoro countdown, automatic archiving, and sound reminders are not advertised as completed features.

- Library drag and drop creates a batch from the actual dragged items. Child attachments resolve to their parent papers, and existing pending reading tasks are skipped. Disabling library drag and drop stops accepting these drops.
- Click-to-locate opens the linked Zotero item from a task card or literature badge. Turning it off opens task editing instead. Explicit edit and locate buttons keep their respective actions.
- PDF navigation uses the saved page or annotation when enabled. Turning it off opens the PDF without forcing a reading position.
- Compact companion layout affects companion subwindows only. Turning it off restores the regular task layout without changing the saved sidebar expansion preference.

<a id="data"></a>

## Data, sync, and services

- The task database is taskflow-data.json in Zotero’s data directory; it does not automatically sync across devices with Zotero items.
- Zotero controls child-note/tag sync. JSON supports backup/restore; CSV/Markdown/TXT are reading or sharing exports.
- Reminders require Zotero to be running; they do not replace operating-system or cloud reminders.

<a id="compatibility"></a>

## Compatibility and validation

| Item | Scope |
|---|---|
| Current add-on version | 13.0.1 |
| Declared Zotero range | `10.0.0` through `12.*` |
| Evidence boundary | 12.8.3 refines the item-pane sidebar: renames to 'Zotero TaskFlow Tasks', emphasizes quick creation with a visible label and solid submit button, declutters empty states, and hardens HTML escaping. |

Add-on and Zotero versions are separate. Manifest compatibility does not establish testing on every host, operating system, or service. This release was not installed into the user's main Zotero profile.

<a id="troubleshooting"></a>

## Troubleshooting

If tasks are missing on another device, check whether task JSON was restored; child-note sync does not restore the whole task database. PDF navigation needs a usable attachment and saved location information.

For an issue, include add-on/Zotero versions, OS, steps, expected/actual results, and sanitized errors.

<a id="development"></a>

## Development and documentation

Normal installation needs no development environment. Existing developer entry points follow; use an isolated profile for native tests.

```powershell
npm ci
npm test
python scripts/build-package.py
```

- [Release notes](docs/releases/v12.8.3.md)
- [产品简介 / Product profile](docs/brand/PRODUCT.md)
- [品牌规范 / Brand guide](docs/brand/BRAND.md)
- [README 模板 / README template](docs/brand/README-TEMPLATE.md)
- [后续提升清单 / Improvement priorities](docs/brand/IMPROVEMENTS.md)
- [Previous detailed guide · README.md](docs/reference/README.md)
- [Previous detailed guide · README_en.md](docs/reference/README_en.md)

Previous detailed guides retain feature detail, shortcuts, historical evidence, and full attribution. Their versions and test results belong to the recorded stage.

<a id="series"></a>

## The Flow series

| Product | Role |
|---|---|
| [Zotero RefFlow](https://github.com/groele/Zotero-RefFlow) | Discovery · Discover references, citing works, and related research. |
| [Zotero MetaFlow](https://github.com/groele/Zotero-MetaFlow) | Metadata · Validate, normalize, and enrich reference metadata. |
| [Zotero ViewFlow](https://github.com/groele/Zotero-ViewFlow) | Preview · Preview and copy formatted references in Zotero’s item pane. |
| [Zotero MindFlow](https://github.com/groele/Zotero-MindFlow) | Knowledge · Organize papers, annotations, and ideas into editable maps. |
| [Zotero TaskFlow](https://github.com/groele/Zotero-TaskFlow) | Tasks · Turn literature reading into trackable tasks and plans. |
| [Zotero CiteFlow](https://github.com/groele/Zotero-CiteFlow) | Citation · Track Word citations and connect them to Zotero items. |
| [Zotero PaperFlow](https://github.com/groele/Zotero-PaperFlow) | Publication · Manage manuscripts, submission rounds, and review responses. |

Each add-on installs and updates separately. A shared brand does not imply a shared database or automatic integration of every workflow.

<a id="license"></a>

## Origin and license

**Development-origin notice:** The maintained repository’s README, package metadata, and license do not declare a third-party Zotero add-on as TaskFlow’s derivative base; it is released as an independently maintained Zotero Flow add-on. The MIT license and the authorship/copyright notice in LICENSE remain required.

License: [MIT](LICENSE).

This series is independently maintained and is not an official Zotero product. Zotero and third-party names, trademarks, and materials belong to their respective rights holders.

[Release/tag policy](docs/release-tag-policy.md)
