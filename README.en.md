# Zotero TaskFlow

**Zotero Flow Series · Tasks**

Turn literature reading into trackable tasks and plans.

[简体中文](README.md) · [English](README.en.md)

[![Release](https://img.shields.io/badge/version-12.3.3-245ac7?style=flat-square)](https://github.com/groele/Zotero-TaskFlow/releases/tag/v12.3.3) · [Download XPI](https://github.com/groele/Zotero-TaskFlow/releases/download/v12.3.3/zotero-taskflow-12.3.3.xpi) · [Report an issue](https://github.com/groele/Zotero-TaskFlow/issues)

[Overview](#overview) · [Installation and updates](#installation) · [Quick start](#quick-start) · [Key features](#features) · [Settings](#settings) · [Data, sync, and services](#data) · [Compatibility and validation](#compatibility) · [Troubleshooting](#troubleshooting) · [Development and documentation](#development) · [The Flow series](#series) · [Origin and license](#license)

<a id="overview"></a>

## Overview

For researchers planning reading, writing, and project work: link tasks, deadlines, subtasks, and reading progress to Zotero papers and PDF locations.

Install this add-on independently and combine it with other Flow products as needed.

<a id="installation"></a>

## Installation and updates

1. Download [zotero-taskflow-12.3.3.xpi](https://github.com/groele/Zotero-TaskFlow/releases/download/v12.3.3/zotero-taskflow-12.3.3.xpi) (add-on version **12.3.3**), not the Source code ZIP.
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

| Feature | Scope |
|---|---|
| Tasks and views | Manage priorities, deadlines, tags, and subtasks in list, board, calendar, and statistics views. |
| Literature links | Create tasks from selected papers or PDF text and return to available reading anchors. |
| Reading steps | Choose reading templates and track checklists and focus time. |
| Notes and backup | Optionally write Zotero child notes and export local task backups. |

<a id="settings"></a>

## Settings

Open the add-on preference page in **Zotero → Settings → Zotero TaskFlow**.

Configure windows, default view, literature links, reminders, and data maintenance. Settings marked unavailable are not connected; Pomodoro countdown, automatic archiving, and sound reminders are not advertised as completed features.

<a id="data"></a>

## Data, sync, and services

- The task database is taskflow-data.json in Zotero’s data directory; it does not automatically sync across devices with Zotero items.
- Zotero controls child-note/tag sync. JSON supports backup/restore; CSV/Markdown/TXT are reading or sharing exports.
- Reminders require Zotero to be running; they do not replace operating-system or cloud reminders.

<a id="compatibility"></a>

## Compatibility and validation

| Item | Scope |
|---|---|
| Current add-on version | 12.3.3 |
| Declared Zotero range | `10.0.0` through `15.*` |
| Evidence boundary | The 12.3.3 settings pane was checked in Windows Zotero 10.0.6. A declared maximum of 15.* does not establish validation on Zotero 15. |

Add-on and Zotero versions are separate. Manifest compatibility does not establish testing on every host, operating system, or service. This branding/documentation update does not rerun business workflow tests.

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

- [版本说明 / Release notes](docs/releases/v12.3.3.md)
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

Project code is distributed under MIT; retain the authorship and copyright notice in LICENSE.

License: [MIT](LICENSE).

This series is independently maintained and is not an official Zotero product. Zotero and third-party names, trademarks, and materials belong to their respective rights holders.
