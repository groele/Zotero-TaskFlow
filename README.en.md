# Zotero TaskFlow

**Zotero Flow Series · Academic Research & Reading Task Workspace**

*Turn literature reading into trackable tasks and actionable research plans.*

[简体中文](README.md) · [English](README.en.md)

[![Version](https://img.shields.io/badge/version-14.1.1-245ac7?style=flat-square)](https://github.com/groele/Zotero-TaskFlow/releases/tag/v14.1.1)
[![Zotero Compatibility](https://img.shields.io/badge/Zotero-10.0%20to%2012.*-059669?style=flat-square)](https://github.com/groele/Zotero-TaskFlow)
[![License](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)](LICENSE)
[![Local Privacy](https://img.shields.io/badge/storage-100%25%20Local%20Privacy-success?style=flat-square)](https://github.com/groele/Zotero-TaskFlow)
[![Download XPI](https://img.shields.io/badge/download-XPI%20Release-blue?style=flat-square)](https://github.com/groele/Zotero-TaskFlow/releases/download/v14.1.1/zotero-taskflow-14.1.1.xpi)

[Key Highlights](#highlights) · [Keyboard Shortcuts](#shortcuts) · [Quick Start](#quick-start) · [Multi-Dimensional Views](#views) · [Academic Checklists](#academic-templates) · [Zotero Integration](#integration) · [Settings & Preferences](#settings) · [Data & Backup](#data) · [Troubleshooting FAQ](#troubleshooting) · [Installation & Updates](#installation) · [Zotero Flow Series](#series) · [License](#license)

---

<a id="highlights"></a>

## 🌟 Key Highlights & Academic Values

**Zotero TaskFlow** is an academic task management and reading workflow add-on built specifically for researchers, scholars, and graduate students. It bridges the gap between generic to-do apps and academic literature by integrating your Zotero library, PDF reader, and task Kanban into one unified workspace:

1. **Bidirectional Literature & PDF Anchoring**: Convert selected text or annotation highlights in the PDF reader into reading tasks with one click, preserving verbatim quotes and precise page numbers. Jump back to the exact PDF location at any time.
2. **5 Disciplined Academic Reading Templates**: Tailored milestone frameworks for theoretical proofs, empirical/laboratory experiments, literature reviews, algorithm & code reproduction, and general survey reading.
3. **Comprehensive Multi-Dimensional Views**: Organize your research across Kanban Board, List View, Calendar Schedule, and Analytics metrics.
4. **Deep Native Zotero Integration**: Collapsible task cards seamlessly embedded in the Item Pane sidebar, PDF context menus, and toolbar badges showing real-time task counts and overdue warnings.
5. **Strict Local Storage & Zero Data Leakage**: Pure local JSON file (`taskflow-data.json`) storage with zero third-party cloud analytics or transmissions. Export cleanly to Markdown, CSV, and standard JSON.
6. **Ultra-Lightweight & Modern Architecture**: Free from legacy dependencies, reducing package size by over 30% compared to historical versions.

---

<a id="shortcuts"></a>

## ⚡ Keyboard Shortcuts

| Shortcut (Windows / Linux) | Shortcut (macOS) | Context | Action |
|---|---|---|---|
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>T</kbd> | <kbd>Cmd</kbd> + <kbd>Opt</kbd> + <kbd>T</kbd> | Any Zotero window | Open / focus the TaskFlow academic workspace |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> | <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> | PDF selection / annotation | Convert selected text and page number into a task |
| <kbd>Enter</kbd> | <kbd>Return</kbd> | Quick-add input | Commit and save a new task |
| <kbd>Esc</kbd> | <kbd>Esc</kbd> | Modal dialogs / filters | Close modal and return to main view |

---

<a id="quick-start"></a>

## 🚀 Quick Start

### Scenario 1: Capture Thoughts and Follow-ups while Reading PDFs
1. Open a paper in Zotero's built-in PDF reader.
2. Highlight a derivation formula, experimental protocol, or reference to inspect later.
3. Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> (or right-click and choose **"Convert Selection/Annotation to Task"**).
4. TaskFlow automatically captures the quote, exact page number, and item metadata with a preset deadline.
5. Click the literature badge on the task card anytime to **jump directly to that page in the PDF**.

### Scenario 2: Batch Plan Reading for a Collection of New Papers
1. Select multiple papers in your Zotero item list (or right-click a collection).
2. Right-click and choose **"Batch Generate Reading Plan for All Papers in Collection"** (or drag the papers directly onto the TaskFlow board).
3. TaskFlow skips items that already have active tasks and creates structured reading tasks for each new paper.

### Scenario 3: Break Down High-Impact Milestone Papers
1. Open the TaskFlow workspace and click **"New Task"**.
2. Under **Academic Profile**, select the target genre (e.g., "Algorithm & Code Reproduction" or "Experimental / Empirical").
3. Apply the preset checklist to automatically populate milestones (e.g., baseline verification, ablation test, dataset setup).

---

<a id="views"></a>

## 📊 Multi-Dimensional Views

TaskFlow provides 4 purpose-built views designed for academic workflows:

### 1. Kanban Board
- **4-Stage Academic Pipeline**: Default columns for **To Read**, **In Progress**, **Reviewing / Reproducing**, and **Completed**.
- **Drag-and-Drop Workflow**: Move cards between columns to update status and priority seamlessly.
- **Rich Card Badges**: View linked paper titles, authors/year, subtask progress meters, deadlines, and colored tags at a glance.

### 2. List View
- **Multi-Level Subtask Trees**: Expand parent tasks to manage detailed subtask checklists with full keyboard navigation.
- **Dynamic Grouping & Sorting**: Group by due date, priority (P1 Urgent to P4 Low), collection, or custom tags.
- **Instant Filters**: Quickly filter for "Due Today", "This Week", "Overdue", or specific paper categories.

### 3. Calendar View
- **Research Milestone Timeline**: Visualize paper deadlines, conference submission dates, and defense goals on month/week views.
- **Balanced Workload Planning**: Spot scheduling bottlenecks early to distribute reading pressure evenly.

### 4. Analytics & Statistics
- **Research Effort Tracking**: Cumulative statistics on finished papers, subtask completion rate, and focus time logs.
- **Completion Trends**: Progress curves and velocity indicators to keep literature reviews on schedule.

---

<a id="academic-templates"></a>

## 🎯 5 Disciplined Academic Reading Templates

Structured reading templates designed for diverse academic genres:

| Academic Template | Best For | Preset Milestones |
|---|---|---|
| **Theoretical Proofs** | Mathematics, theoretical physics, algorithmic proofs | 1. Verify core assumptions<br>2. Derive key lemmas and theorems<br>3. Inspect boundary and corner cases<br>4. Analyze theoretical limitations |
| **Experimental / Empirical** | Biomedicine, materials science, chemistry, clinical trials | 1. Check experimental cohort and control groups<br>2. Log key protocol steps and variable controls<br>3. Review statistical significance in figures<br>4. Identify potential biases and reproduction challenges |
| **Literature Review** | Surveys, systematic reviews, meta-analyses | 1. Summarize research taxonomies and paradigms<br>2. Trace seminal citations and cross-comparisons<br>3. Construct comparative matrix of pros/cons<br>4. Identify open challenges and future directions |
| **Algorithm & Code Reproduction** | AI/ML, computer systems, computational biology | 1. Prepare datasets and evaluation metrics<br>2. Implement core network/algorithm and verify weights<br>3. Reproduce benchmark results and ablation studies<br>4. Refactor and integrate into project codebase |
| **General Academic Survey** | Rapid screening, preliminary reading | 1. Extract core contributions from abstract & intro<br>2. Diagram workflow and highlight novel techniques<br>3. Skim experimental results and discussion<br>4. Evaluate takeaways for own research |

---

<a id="integration"></a>

## 🧩 Deep Zotero Integration

TaskFlow integrates natively into the Zotero host:

- **Item Pane Sidebar**:
  - Selecting any reference item in Zotero displays its linked task cards and completion meter in the right-hand panel.
  - Create tasks, toggle subtasks, or sync directly without leaving your library.
- **Sync to Child Notes**:
  - Export task progress into a standard Zotero child note with one click, synchronizing with official Zotero cloud storage.
- **Toolbar Status Badge**:
  - A persistent toolbar indicator displays pending, in-progress, and overdue task counts.

---

<a id="settings"></a>

## ⚙️ Settings & Preferences

Configure behaviors under **Zotero → Settings → Zotero TaskFlow**:

- **Item Context Menu Controls**: Toggles for "Add as Task" and "Batch Add Reading Tasks" in the library item context menu; disabled by default to keep context menus clean.
- **Library Drag & Drop**: Drag items from your Zotero library into TaskFlow to batch-create reading tasks.
- **Click-to-Locate Paper**: Clicking a task card or literature badge highlights the corresponding item in Zotero's main list.
- **PDF Page Navigation**: When enabled, clicking a PDF task navigates directly to the exact page where the task was created.
- **Window Mode**: Choose between independent window, companion side pane, or full-screen view.

---

<a id="data"></a>

## 💾 Data Storage, Backup & Migration

- **Storage File**: Stored locally in your Zotero data directory as `taskflow-data.json`.
- **100% Local Privacy**: Runs entirely offline with zero third-party telemetry, protecting unpublished research ideas and confidential grants.
- **Backup & Restore**: Export full JSON backups directly from Settings to migrate across machines.
- **Interoperability**: Export tasks to standard Markdown checklists or CSV tables for Obsidian, Notion, or Excel workflows.

---

<a id="troubleshooting"></a>

## ❓ Troubleshooting FAQ

<details>
<summary><strong>Q1: Why aren't my tasks appearing on my second computer after logging into Zotero Sync?</strong></summary>

> **Answer**: Official Zotero sync covers items, attachments, and notes, but not third-party plugin data files. To synchronize:
> 1. Use TaskFlow's **"📝 Sync to Child Note"** to save tasks as item notes, which sync across devices via Zotero;
> 2. Or use **"Export Backup"** in Settings on your primary device and **"Import Data"** on your secondary device.
</details>

<details>
<summary><strong>Q2: Clicking the PDF button opens the document but does not jump to the saved page?</strong></summary>

> **Answer**: Please check:
> 1. The item has an active and accessible PDF attachment;
> 2. In **Zotero Settings → Zotero TaskFlow**, verify that **"Enable PDF Navigation"** is turned on;
> 3. The task was created from text selection in the PDF reader or had a page specified.
</details>

<details>
<summary><strong>Q3: The Ctrl+Alt+T shortcut does not open TaskFlow?</strong></summary>

> **Answer**: This is usually caused by global hotkey conflicts with operating system utilities or input method software. You can open TaskFlow anytime by clicking the **TaskFlow icon** on the Zotero toolbar, or via **Tools → Zotero TaskFlow Academic Workspace**.
</details>

---

<a id="installation"></a>

## 📦 Installation & Updates

### Manual Installation
1. Download the latest release package [zotero-taskflow-14.1.1.xpi](https://github.com/groele/Zotero-TaskFlow/releases/download/v14.1.1/zotero-taskflow-14.1.1.xpi) from [GitHub Releases](https://github.com/groele/Zotero-TaskFlow/releases/tag/v14.1.1).
2. In Zotero, open **Tools → Plugins / Add-ons**.
3. Click the gear icon ⚙️ in the upper right corner and select **Install Add-on From File...**.
4. Select the `.xpi` file, confirm the installation, and restart Zotero.

### Automatic Updates
TaskFlow includes an integrated update feed:
- **Update Feed**: `https://raw.githubusercontent.com/groele/Zotero-TaskFlow/main/update.json`
- **Add-on ID**: `taskflow@groele.org`

---

<a id="development"></a>

## 🛠️ Development & Testing

For contributors and developers:

```powershell
# Install test dependencies
npm ci

# Run the complete test suite (152 unit and integration tests)
npm test

# Build the release XPI and verify checksums
python scripts/build-package.py
```

- [v14.1.1 Release Notes](docs/releases/v14.1.1.md)
- [v14.1.0 Release Notes](docs/releases/v14.1.0.md)
- [Product Specifications](docs/brand/PRODUCT.md)
- [Release Tag Policy](docs/release-tag-policy.md)

---

<a id="series"></a>

## 🌐 The Zotero Flow Series

Zotero TaskFlow is part of the **Zotero Flow Academic Ecosystem**:

| Plugin | Stage | Core Capability |
|---|---|---|
| [Zotero RefFlow](https://github.com/groele/Zotero-RefFlow) | **Discovery** | Citation graphs, literature tracing, and related paper discovery |
| [Zotero MetaFlow](https://github.com/groele/Zotero-MetaFlow) | **Metadata** | Metadata normalization, consistency checks, and batch completion |
| [Zotero ViewFlow](https://github.com/groele/Zotero-ViewFlow) | **Preview** | Smart reference previews, formatted citation copying, and fast reading |
| [Zotero MindFlow](https://github.com/groele/Zotero-MindFlow) | **Knowledge** | Visual concept mapping linking papers, quotes, and research ideas |
| [Zotero TaskFlow](https://github.com/groele/Zotero-TaskFlow) | **Tasks** | Turn literature reading into actionable, trackable research milestones |
| [Zotero CiteFlow](https://github.com/groele/Zotero-CiteFlow) | **Citation** | Track citations in Word documents directly linked to Zotero items |
| [Zotero PaperFlow](https://github.com/groele/Zotero-PaperFlow) | **Publication** | Manuscript lifecycle, journal submission rounds, and rebuttal tracking |

---

<a id="license"></a>

## 📄 License & Attribution

- **License**: Released under the open-source [MIT License](LICENSE).
- **Disclaimer**: Independently maintained by the open-source community. Not an official product of Corporation for Digital Scholarship or Zotero. Zotero is a registered trademark of Corporation for Digital Scholarship.
