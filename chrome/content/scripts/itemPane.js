"use strict";
(() => {
  // src/config.ts
  var ADDON_ID = "taskflow@groele.org";
  var CHROME_ROOT = "chrome://taskflow/content/";

  // src/lifecycle.ts
  function createFallbackController() {
    const listeners = /* @__PURE__ */ new Set();
    let aborted = false;
    const signal = {
      get aborted() {
        return aborted;
      },
      reason: void 0,
      onabort: null,
      throwIfAborted() {
      },
      addEventListener(_type, listener) {
        listeners.add(listener);
      },
      removeEventListener(_type, listener) {
        listeners.delete(listener);
      },
      dispatchEvent() {
        return true;
      }
    };
    return {
      signal,
      abort(reason) {
        if (aborted) return;
        aborted = true;
        signal.reason = reason;
        const evt = { type: "abort", target: signal };
        for (const listener of [...listeners]) {
          listeners.delete(listener);
          if (typeof listener === "function") listener(evt);
          else listener.handleEvent(evt);
        }
      }
    };
  }
  function createScopedController(win) {
    const Ctor = win?.AbortController || (typeof AbortController !== "undefined" ? AbortController : null);
    return Ctor ? new Ctor() : createFallbackController();
  }
  function linkParentSignal(child, parent) {
    if (!parent) return;
    if (parent.aborted) {
      child.abort();
      return;
    }
    parent.addEventListener("abort", () => child.abort(), { once: true });
  }
  function addAbortableListener(target, type, listener, options, signal) {
    if (!target?.addEventListener) return;
    if (signal?.aborted) return;
    const opts = typeof options === "boolean" ? { capture: options } : { ...options || {} };
    if (!signal) {
      target.addEventListener(type, listener, opts);
      return;
    }
    const ownerDoc = target.ownerDocument || target.document;
    const targetWin = ownerDoc?.defaultView || target;
    const TargetAbortSignal = targetWin?.AbortSignal;
    if (TargetAbortSignal && signal instanceof TargetAbortSignal) {
      target.addEventListener(type, listener, { ...opts, signal });
      return;
    }
    if (!TargetAbortSignal) {
      try {
        target.addEventListener(type, listener, { ...opts, signal });
        return;
      } catch (_) {
      }
    }
    target.addEventListener(type, listener, opts);
    signal.addEventListener(
      "abort",
      () => {
        try {
          target.removeEventListener?.(type, listener, Boolean(opts.capture));
        } catch (_) {
        }
      },
      { once: true }
    );
  }
  function setAbortableTimeout(callback, delayMs, signal, timerHost, tracker) {
    if (signal?.aborted) return null;
    const schedule = timerHost?.setTimeout ? timerHost.setTimeout.bind(timerHost) : setTimeout;
    const cancel = timerHost?.clearTimeout ? timerHost.clearTimeout.bind(timerHost) : clearTimeout;
    let cleared = false;
    let timerId;
    const onAbort = () => {
      if (cleared) return;
      cleared = true;
      tracker?.delete(timerId);
      try {
        cancel(timerId);
      } catch (_) {
      }
    };
    timerId = schedule(() => {
      if (cleared || signal?.aborted) return;
      cleared = true;
      tracker?.delete(timerId);
      signal?.removeEventListener("abort", onAbort);
      callback();
    }, delayMs);
    tracker?.add(timerId);
    signal?.addEventListener("abort", onAbort, { once: true });
    return timerId;
  }

  // src/utils.ts
  var itemSelectUri = (item) => {
    if (!item) return "";
    const key = item.key || item.id;
    if (key == null || key === "") return "";
    const groupID = Zotero.Libraries?.get?.(item.libraryID)?.groupID;
    return groupID ? `zotero://select/groups/${groupID}/items/${key}` : `zotero://select/library/items/${key}`;
  };
  var getLiteratureItem = (item) => {
    if (!item) return null;
    let target = typeof item === "number" || typeof item === "string" ? Zotero.Items?.get?.(item) || null : item;
    if (!target) return null;
    try {
      if (target.topLevelItem && typeof target.topLevelItem.isRegularItem === "function" && target.topLevelItem.isRegularItem()) {
        return target.topLevelItem;
      }
    } catch (_) {
    }
    if (typeof target.isAttachment === "function" && target.isAttachment()) {
      if (target.parentItemID) {
        target = Zotero.Items?.get?.(target.parentItemID) || target;
      }
    }
    if (target && typeof target.isNote === "function" && target.isNote()) {
      if (target.parentItemID) {
        target = Zotero.Items?.get?.(target.parentItemID) || target;
      }
    }
    if (!target) return null;
    try {
      if (target.topLevelItem && typeof target.topLevelItem.isRegularItem === "function" && target.topLevelItem.isRegularItem()) {
        return target.topLevelItem;
      }
    } catch (_) {
    }
    return typeof target.isRegularItem === "function" && target.isRegularItem() ? target : null;
  };
  var serializeLiteratureItem = (item) => {
    const target = getLiteratureItem(item);
    if (!target || target.deleted) return null;
    const title = (typeof target.getField === "function" ? target.getField("title") : target.title) || "无标题文献";
    const date = typeof target.getField === "function" ? target.getField("date") : target.date;
    let year = "";
    if (date) {
      const match = String(date).match(/\b(19|20)\d{2}\b/);
      year = match ? match[0] : String(date).slice(0, 4);
    }
    let authors = [];
    try {
      if (typeof target.getCreators === "function") {
        authors = target.getCreators().map(
          (c) => c.lastName || c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim()
        ).filter(Boolean);
      }
    } catch (_) {
    }
    const publication = typeof target.getField === "function" ? target.getField("publicationTitle") || target.getField("proceedingsTitle") || target.getField("publisher") || "" : "";
    let tags = [];
    try {
      if (typeof target.getTags === "function") {
        tags = target.getTags().map((t) => typeof t === "string" ? t : t.tag || "").filter(Boolean);
      }
    } catch (_) {
    }
    let pdfUri = null;
    try {
      if (typeof target.getAttachments === "function") {
        const attIds = target.getAttachments();
        for (const attId of attIds) {
          const att = Zotero.Items?.get?.(attId);
          if (att && !att.deleted && (typeof att.isPDFAttachment === "function" && att.isPDFAttachment() || att.contentType === "application/pdf")) {
            const groupID = Zotero.Libraries?.get?.(att.libraryID)?.groupID;
            pdfUri = groupID ? `zotero://open-pdf/groups/${groupID}/items/${att.key}` : `zotero://open-pdf/library/items/${att.key}`;
            break;
          }
        }
      }
    } catch (_) {
    }
    return {
      key: target.key || String(target.id),
      id: target.id,
      libraryID: target.libraryID,
      title,
      authors: authors.slice(0, 3).join(", ") + (authors.length > 3 ? " 等" : ""),
      year,
      publication,
      tags,
      zoteroUri: itemSelectUri(target),
      pdfUri
    };
  };

  // src/literatureWorkflow.ts
  var PROFILES = {
    general: { label: "通用研读", steps: ["通读摘要、引言与结论，明确研究问题", "梳理核心方法、主要结果与证据链", "检查关键图表、适用条件与局限性", "对照相关工作，记录可复用的方法或思路", "整理研读笔记、疑问与后续行动"] },
    theory: { label: "理论论文", steps: ["明确研究问题、模型与物理假设", "逐步核查关键推导、符号与量纲", "检验极限情况、守恒关系与适用范围", "比较已有理论，提炼可检验预测", "整理推导笔记、局限与可复用计算"] },
    experiment: { label: "实验论文", steps: ["明确实验问题、样品与测量条件", "梳理实验流程、仪器参数与对照组", "核查原始证据、误差来源与统计报告", "评估机制解释、可重复性与替代解释", "记录设备需求、实验启发与验证计划"] },
    review: { label: "综述论文", steps: ["明确综述范围、分类框架与核心问题", "梳理代表工作、时间线与关键证据", "比较不同路线的共识、分歧与局限", "追踪关键原始文献并识别研究空白", "形成主题脉络图与后续阅读清单"] },
    algorithm: { label: "算法与复现", steps: ["明确任务定义、输入输出与核心贡献", "梳理算法结构、目标函数与复杂度", "核查基线、消融、数据划分与评价指标", "检查代码、环境与最小复现实验", "记录复现结果、局限与迁移条件"] }
  };
  var LiteratureWorkflow = {
    profiles: PROFILES,
    profile(id) {
      return id && this.profiles[id] || this.profiles.general;
    },
    days(value = 7) {
      return Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 365 ? Number(value) : 7;
    },
    dateAfter(days = 7, from = /* @__PURE__ */ new Date()) {
      const date = new Date(from);
      date.setDate(date.getDate() + Number(days));
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    },
    steps(profileID, generateId) {
      return this.profile(profileID).steps.map((title, index) => ({
        id: generateId(),
        title: `${index + 1}. ${title}`,
        completed: false
      }));
    },
    templates() {
      return Object.entries(this.profiles).map(([id, profile]) => ({
        id: id === "general" ? "paper-reading-milestones" : `paper-reading-${id}`,
        name: `📖 ${profile.label}清单`,
        icon: "📖",
        task: {
          title: `[精读] ${profile.label}`,
          description: `按${profile.label}流程梳理问题、方法、证据与局限`,
          priority: "medium",
          category: "论文研读",
          academicType: "literature_reading",
          readingProfile: id,
          subtasks: profile.steps.map((title, index) => ({ title: `${index + 1}. ${title}` }))
        }
      }));
    },
    samePending(task, candidate, userLibraryID, wholeItem = false) {
      if (task.completed || task.zoteroItemKey !== candidate.zoteroItemKey || (task.zoteroLibraryID || userLibraryID) !== candidate.zoteroLibraryID) return false;
      if (wholeItem) return !task.academicType || task.academicType === "literature_reading";
      if (candidate.literatureWorkflowId && task.literatureWorkflowId === candidate.literatureWorkflowId) return true;
      return candidate.literatureWorkflowId === "reading" && task.title === candidate.title && (!task.academicType || task.academicType === "literature_reading");
    }
  };
  if (typeof globalThis !== "undefined" && !globalThis.LiteratureWorkflow) {
    globalThis.LiteratureWorkflow = LiteratureWorkflow;
  }

  // src/itemPane/domView.ts
  var HTML_NS = "http://www.w3.org/1999/xhtml";
  function createEl(doc, tag, className = "", text = null) {
    const el = doc.createElementNS ? doc.createElementNS(HTML_NS, tag) : doc.createElement(tag);
    if (className) el.className = className;
    if (text !== null && text !== void 0) el.textContent = text;
    return el;
  }
  function ensureItemPaneStyles(doc) {
    if (!doc) return;
    if (doc.getElementById("todolist-itempane-styles")) return;
    try {
      const style = doc.createElementNS ? doc.createElementNS(HTML_NS, "style") : doc.createElement("style");
      style.id = "todolist-itempane-styles";
      style.textContent = `
      item-pane-custom-section[data-pane*="todolist-item-pane"],
      item-pane-custom-section[data-pane*="todolist-item-pane"] > collapsible-section,
      item-pane-custom-section[data-pane*="todolist-item-pane"] [data-type="body"] { min-width:0; max-width:100%; box-sizing:border-box; }
      item-pane-sidenav .btn[data-pane*="todolist-item-pane"] { width:28px !important; height:28px !important; min-width:28px !important; padding:4px !important; overflow:hidden !important; font-size:0 !important; line-height:0 !important; color:transparent !important; white-space:nowrap !important; }
      .td-pane-wrap { --td-line:color-mix(in srgb,currentColor 12%,transparent); --td-hover:color-mix(in srgb,currentColor 4%,transparent); display:flex; flex-direction:column; gap:10px; contain:inline-size; width:100%; min-width:0; max-width:100%; box-sizing:border-box; padding:6px 2px 12px; font:inherit; color:var(--fill-primary,CanvasText); color-scheme:inherit; line-height:1.5; }
      .td-pane-wrap * { box-sizing:border-box; }
      .td-pane-wrap :is(button,input,select,summary) { font:inherit; color:inherit; min-width:0; max-width:100%; }
      .td-pane-wrap button { cursor:pointer; }
      .td-pane-wrap button:disabled { opacity:.55; cursor:default; }
      .td-pane-wrap :is(button,input,select,summary):focus-visible { outline:2px solid var(--color-accent,Highlight); outline-offset:2px; }
      .td-pane-wrap :is(.td-header-card,.td-header-top) { display:flex; gap:8px; }
      .td-pane-wrap .td-header-card { flex-direction:column; padding:0 0 4px; }
      .td-pane-wrap .td-header-top { align-items:center; justify-content:space-between; }
      .td-pane-wrap .td-status-badge { font-weight:600; }
      .td-pane-wrap :is(.td-progress-pct,.td-add-hint,.td-empty-desc) { color:var(--fill-secondary,GrayText); font-size:.92em; }
      .td-pane-wrap .td-progress-track { height:3px; border-radius:2px; overflow:hidden; background:var(--td-line); }
      .td-pane-wrap .td-progress-fill { height:100%; background:var(--color-accent,Highlight); }
      .td-pane-wrap :is(.td-add-reading,.td-btn-milestone-primary,.td-action-btn) { border:1px solid var(--td-line); border-radius:5px; background:transparent; padding:6px 10px; white-space:normal; overflow-wrap:anywhere; }
      .td-pane-wrap .td-add-reading { width:100%; font-weight:500; }
      .td-pane-wrap button:hover:not(:disabled) { background:var(--td-hover); }
      .td-pane-wrap .td-quick-box { display:flex; align-items:center; gap:6px; padding:4px; border:1px solid var(--td-line); border-radius:5px; }
      .td-pane-wrap .td-quick-box:focus-within { border-color:var(--color-accent,Highlight); }
      .td-pane-wrap .td-prio-select { flex:0 0 auto; padding:3px; border:0; border-inline-end:1px solid var(--td-line); background:transparent; }
      .td-pane-wrap .td-quick-input { flex:1 1 0; width:0; padding:4px; border:0; background:transparent; }
      .td-pane-wrap .td-quick-input::placeholder { color:var(--fill-secondary,GrayText); }
      .td-pane-wrap .td-quick-submit { flex:0 0 auto; width:auto; min-width:44px; height:28px; padding:0 8px; border:1px solid color-mix(in srgb, currentColor 18%, transparent); border-radius:4px; font-size:13px; white-space:nowrap; }
      .td-pane-wrap .td-reading-profile { display:flex; align-items:center; gap:10px; color:var(--fill-secondary,GrayText); font-size:.92em; }
      .td-pane-wrap .td-reading-profile select { flex:1; padding:4px 6px; border:1px solid var(--td-line); border-radius:4px; background:transparent; color:var(--fill-primary,CanvasText); }
      .td-pane-wrap .td-empty-card { display:flex; flex-direction:column; align-items:flex-start; gap:6px; padding:12px 0; }
      .td-pane-wrap .td-empty-title { font-weight:500; }
      .td-pane-wrap .td-btn-milestone-primary { align-self:stretch; width:100%; height:auto; min-height:36px; margin:4px 0 0; padding:8px 10px; }
      .td-pane-wrap .td-task-list { display:flex; flex-direction:column; min-width:0; }
      .td-pane-wrap .td-task-card { display:flex; flex-direction:column; gap:6px; min-width:0; padding:12px 0; border-block-end:1px solid var(--td-line); }
      .td-pane-wrap .td-task-row { display:flex; align-items:flex-start; gap:7px; min-width:0; }
      .td-pane-wrap .td-prio-dot { width:4px; height:4px; margin-top:8px; border-radius:50%; flex-shrink:0; background:var(--fill-secondary,GrayText); }
      .td-pane-wrap .td-prio-high { background:var(--color-red,#c43b3b); }
      .td-pane-wrap .td-prio-low { opacity:.45; }
      .td-pane-wrap .td-checkbox { flex:0 0 auto; width:15px; height:15px; margin:3px 0 0; accent-color:var(--color-accent,Highlight); }
      .td-pane-wrap .td-task-title { flex:1 1 0; min-width:0; height:auto; min-height:0; max-height:none; margin:0; text-align:start; padding:0; border:0; background:transparent; white-space:normal; overflow-wrap:anywhere; line-height:1.5; }
      .td-pane-wrap .td-task-delete { flex:0 0 auto; display:inline-flex; align-items:center; justify-content:center; height:25px; margin:-4px 0 0 2px; padding:0 7px; border:1px solid color-mix(in srgb,var(--color-red,#c43b3b) 24%,transparent); border-radius:5px; color:var(--color-red,#c43b3b); background:color-mix(in srgb,var(--color-red,#c43b3b) 7%,transparent); font-size:.85em; }
      .td-pane-wrap .td-task-delete:hover:not(:disabled) { border-color:color-mix(in srgb,var(--color-red,#c43b3b) 42%,transparent); background:color-mix(in srgb,var(--color-red,#c43b3b) 13%,transparent); }
      .td-pane-wrap .is-done { text-decoration:line-through; color:var(--fill-secondary,GrayText); }
      .td-pane-wrap .td-task-locate { flex:0 0 auto; padding:1px 4px; font-size:.85em; color:var(--fill-secondary,GrayText); background:transparent; border:0; border-radius:3px; }
      .td-pane-wrap .td-task-controls { display:flex; flex-wrap:wrap; align-items:center; gap:4px 8px; padding-inline-start:26px; color:var(--fill-secondary,GrayText); font-size:.85em; }
      .td-pane-wrap :is(.td-task-controls button,.td-reschedule summary,.td-subtask-toggle) { border:0; border-radius:3px; background:transparent; padding:2px 3px; font:inherit; cursor:pointer; }
      .td-pane-wrap .td-badge-date { line-height:1.5; }
      .td-pane-wrap .td-badge-date.is-overdue { color:var(--color-red,#c43b3b); }
      .td-pane-wrap .td-reschedule[open] { flex-basis:100%; }
      .td-pane-wrap .td-subtask-list { display:flex; flex-direction:column; gap:6px; margin:2px 0 0 26px; padding-inline-start:10px; border-inline-start:1px solid var(--td-line); }
      .td-pane-wrap .td-subtask-item { display:flex; align-items:flex-start; gap:7px; font-size:.92em; }
      .td-pane-wrap .td-subtask-title { flex:1; min-width:0; overflow-wrap:anywhere; }
      .td-pane-wrap .td-action-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:4px; padding-top:10px; border-top:1px solid var(--td-line); }
      .td-pane-wrap .td-action-btn { font-size:.92em; border-color:transparent; text-align:start; padding:5px 6px; }
      .td-pane-wrap .td-fallback-task-list { display:flex; flex-direction:column; gap:4px; }
      .td-pane-wrap { --td-blue:light-dark(#315f94,#a8c9ef); --td-green:light-dark(#316d58,#a0d3bb); --td-amber:light-dark(#7a5d2c,#e3c58d); }
      .td-pane-wrap :is(.td-add-reading,.td-quick-submit,.td-action-workspace,.td-task-edit) { --td-tone:var(--td-blue); }
      .td-pane-wrap :is(.td-btn-milestone-primary,.td-action-reading,.td-action-btn-pdf,.td-task-pdf,.td-task-locate) { --td-tone:var(--td-green); }
      .td-pane-wrap :is(.td-action-notes,.td-reschedule) { --td-tone:var(--td-amber); }
      .td-pane-wrap button:is(.td-add-reading,.td-quick-submit,.td-btn-milestone-primary,.td-action-btn,.td-task-edit,.td-task-pdf,.td-task-locate),
      .td-pane-wrap .td-reschedule summary {
        color:var(--td-tone,var(--td-blue));
        background:color-mix(in srgb,var(--td-tone,var(--td-blue)) 9%,transparent);
        border:1px solid color-mix(in srgb,var(--td-tone,var(--td-blue)) 20%,transparent);
      }
      .td-pane-wrap button:is(.td-add-reading,.td-quick-submit,.td-btn-milestone-primary,.td-action-btn,.td-task-edit,.td-task-pdf,.td-task-locate):hover:not(:disabled),
      .td-pane-wrap .td-reschedule summary:hover {
        background:color-mix(in srgb,var(--td-tone,var(--td-blue)) 16%,transparent);
        border-color:color-mix(in srgb,var(--td-tone,var(--td-blue)) 32%,transparent);
      }
      .td-pane-wrap .td-quick-label { display:block; margin:6px 0 -2px; font-weight:600; color:var(--fill-primary,CanvasText); }
      .td-pane-wrap .td-quick-box { min-height:38px; padding:5px; border:1px solid color-mix(in srgb,var(--td-blue) 35%,transparent); background:color-mix(in srgb,var(--td-blue) 4%,transparent); }
      .td-pane-wrap .td-quick-box:focus-within { border-color:var(--color-accent,Highlight); box-shadow:0 0 0 2px color-mix(in srgb,var(--color-accent,Highlight) 28%,transparent); }
      .td-pane-wrap .td-quick-input { padding:6px 4px; font-size:1.05em; color:var(--fill-primary,CanvasText); }
      .td-pane-wrap .td-quick-input::placeholder { color:color-mix(in srgb,var(--fill-primary,CanvasText) 62%,transparent); }
      .td-pane-wrap .td-quick-box button.td-quick-submit,
      .td-pane-wrap button.td-quick-submit {
        flex:0 0 auto !important; width:auto !important; min-width:44px !important; height:28px !important;
        line-height:26px !important; padding:0 8px !important; font-size:13px !important; font-weight:500 !important;
        white-space:nowrap !important; overflow:visible !important; text-overflow:clip !important;
        display:inline-flex !important; align-items:center !important; justify-content:center !important;
        color:var(--fill-primary, currentColor) !important;
        background:color-mix(in srgb, currentColor 6%, transparent) !important;
        border:1px solid color-mix(in srgb, currentColor 18%, transparent) !important;
        border-radius:4px !important;
      }
      .td-pane-wrap .td-quick-box button.td-quick-submit:hover:not(:disabled),
      .td-pane-wrap button.td-quick-submit:hover:not(:disabled) {
        background:color-mix(in srgb, currentColor 11%, transparent) !important;
        border-color:color-mix(in srgb, currentColor 28%, transparent) !important;
      }
      .td-pane-wrap button.td-quick-submit:disabled { opacity:.55 !important; }
      .td-pane-wrap .td-action-grid { display:grid !important; grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:6px !important; padding-top:10px !important; border-top:1px solid var(--td-line) !important; }
      .td-pane-wrap .td-action-btn { padding:6px 8px !important; text-align:center !important; font-size:13px !important; grid-column:auto !important; }
      .td-pane-wrap .td-action-btn-pdf { grid-column:auto !important; }
      .td-pane-wrap .td-action-btn-milestones-row { grid-column:1 / -1 !important; width:100% !important; text-align:center !important; }
    `;
      (doc.head || doc.documentElement || doc.body).appendChild(style);
    } catch (e) {
      Zotero.logError?.("[TaskFlow] Failed to inject itemPane styles: " + e);
    }
  }
  function renderHeaderCard(doc, total, done, pct, showProgressBar) {
    const headerCard = createEl(doc, "div", "td-header-card");
    const headerTop = createEl(doc, "div", "td-header-top");
    let statusText = "暂无待办";
    let badgeClass = "td-status-badge td-status-empty";
    if (total > 0) {
      if (done === total) {
        statusText = `研读已完成 (${done}/${total})`;
        badgeClass = "td-status-badge td-status-done";
      } else {
        statusText = `研读进行中 (${done}/${total})`;
        badgeClass = "td-status-badge td-status-active";
      }
    }
    const statusBadge = createEl(doc, "span", badgeClass, statusText);
    headerTop.appendChild(statusBadge);
    if (total > 0) {
      const pctSpan = createEl(doc, "span", "td-progress-pct", `${pct}%`);
      headerTop.appendChild(pctSpan);
    }
    headerCard.appendChild(headerTop);
    if (total > 0 && showProgressBar) {
      const track = createEl(doc, "div", "td-progress-track");
      track.setAttribute("role", "progressbar");
      track.setAttribute("data-l10n-id", "taskflow-item-pane-progress");
      track.setAttribute("aria-valuemin", "0");
      track.setAttribute("aria-valuemax", String(total));
      track.setAttribute("aria-valuenow", String(done));
      const fill = createEl(doc, "div", "td-progress-fill");
      fill.style.width = `${pct}%`;
      track.appendChild(fill);
      headerCard.appendChild(track);
    }
    return headerCard;
  }
  function renderActionGrid(doc, target, total, host, state, profileSelect, signal) {
    const actionGrid = createEl(doc, "div", "td-action-grid");
    const btnOpenBoard = createEl(doc, "button", "td-action-btn td-action-workspace", "待办看板");
    btnOpenBoard.type = "button";
    btnOpenBoard.title = "在主标签页中打开 TaskFlow 任务看板";
    btnOpenBoard.setAttribute("data-l10n-id", "taskflow-item-pane-btn-board");
    addAbortableListener(
      btnOpenBoard,
      "click",
      () => {
        host.openTaskFlow({ mode: "filter_item", itemKey: target.key }, Zotero.getMainWindow?.() || null);
      },
      void 0,
      signal
    );
    actionGrid.appendChild(btnOpenBoard);
    const btnSubwin = createEl(doc, "button", "td-action-btn td-action-workspace", "伴读窗口");
    btnSubwin.type = "button";
    btnSubwin.title = "打开轻量伴读窗口，适合与 PDF 左右分屏对照";
    btnSubwin.setAttribute("data-l10n-id", "taskflow-item-pane-btn-subwindow");
    addAbortableListener(
      btnSubwin,
      "click",
      () => {
        host.openStandaloneWindow({ mode: "filter_item", itemKey: target.key }, Zotero.getMainWindow?.() || null, "subwindow");
      },
      void 0,
      signal
    );
    actionGrid.appendChild(btnSubwin);
    const btnSyncNote = createEl(doc, "button", "td-action-btn td-action-notes", "同步子笔记");
    btnSyncNote.type = "button";
    btnSyncNote.title = "将本文献的所有研读待办同步导出为文献子笔记 (云端)";
    btnSyncNote.setAttribute("data-l10n-id", "taskflow-item-pane-btn-sync-note");
    const isReadOnly = typeof target.isEditable === "function" && !target.isEditable();
    if (isReadOnly) {
      btnSyncNote.disabled = true;
      btnSyncNote.title = "只读文献无法同步子笔记";
    }
    addAbortableListener(
      btnSyncNote,
      "click",
      async () => {
        if (btnSyncNote.disabled) return;
        const note = await host.syncTasksToChildNote(target.id || target);
        if (note) {
          host.showNotice("同步成功", "已更新文献子笔记研读清单");
        } else {
          host.showNotice("跳过同步", "只读条目或未找到任务清单，跳过同步");
        }
      },
      void 0,
      signal
    );
    actionGrid.appendChild(btnSyncNote);
    const meta = serializeLiteratureItem(target);
    if (meta?.pdfUri) {
      const btnPdf = createEl(doc, "button", "td-action-btn td-action-btn-pdf", "打开 PDF");
      btnPdf.type = "button";
      btnPdf.title = "在 Zotero 内置阅读器中打开该文献的 PDF 全文";
      btnPdf.setAttribute("data-l10n-id", "taskflow-item-pane-btn-open-pdf");
      addAbortableListener(
        btnPdf,
        "click",
        () => {
          void host.openPdfAttachment(target);
        },
        void 0,
        signal
      );
      actionGrid.appendChild(btnPdf);
    }
    if (total > 0) {
      const btnMilestones = createEl(
        doc,
        "button",
        "td-action-btn td-action-reading td-action-btn-milestones-row",
        "追加精读清单"
      );
      btnMilestones.type = "button";
      btnMilestones.title = "按当前研读模板为本文献追加生成 5 项精读里程碑待办";
      btnMilestones.setAttribute("data-l10n-id", "taskflow-item-pane-btn-milestones");
      addAbortableListener(
        btnMilestones,
        "click",
        async () => {
          if (btnMilestones.disabled) return;
          btnMilestones.disabled = true;
          try {
            await host.createReadingMilestones(target, Zotero.getMainWindow?.() || null, profileSelect.value);
            state?.refresh?.();
          } finally {
            btnMilestones.disabled = false;
          }
        },
        void 0,
        signal
      );
      actionGrid.appendChild(btnMilestones);
    }
    return actionGrid;
  }

  // src/itemPane/dragDrop.ts
  var draggingTaskId = null;
  function getTransferTypes(dt) {
    try {
      return Array.from(dt?.types || []);
    } catch {
      return [];
    }
  }
  function parseDroppedItemIds(dt) {
    if (!dt) return [];
    const taskDrag = dt.getData?.("text/x-taskflow-id");
    if (taskDrag) return [];
    const raw = (dt.getData?.("zotero/item") || dt.getData?.("text/x-zotero-item") || "").trim();
    const fallback = !raw ? (dt.getData?.("text/plain") || "").trim() : "";
    const payload = raw || (/^\d+(?:,\d+)*$/.test(fallback) ? fallback : "");
    if (!/^\d+(?:,\d+)*$/.test(payload)) return [];
    return payload.split(",").map((v) => Number(v)).filter((id) => Number.isSafeInteger(id) && id > 0);
  }
  function acceptsLibraryDrop(e, target, host) {
    if (!target || draggingTaskId) return false;
    if (host?.getPref?.("dragDropFromLibrary", true) === false) return false;
    const types = getTransferTypes(e.dataTransfer);
    return types.includes("zotero/item") || types.includes("text/x-zotero-item");
  }
  async function reorderTasksInHost(host, sourceTaskId, targetTaskId, insertAfter, state) {
    if (!host?.loadData || !host?.saveData || !sourceTaskId || !targetTaskId || sourceTaskId === targetTaskId) {
      return false;
    }
    const data = await host.loadData();
    const tasks = Array.isArray(data?.tasks) ? [...data.tasks].sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
    const sourceIdx = tasks.findIndex((t) => t.id === sourceTaskId);
    if (sourceIdx === -1) return false;
    if (!tasks.some((t) => t.id === targetTaskId)) return false;
    const [moved] = tasks.splice(sourceIdx, 1);
    const targetIdx = tasks.findIndex((t) => t.id === targetTaskId);
    if (targetIdx === -1) return false;
    tasks.splice(insertAfter ? targetIdx + 1 : targetIdx, 0, moved);
    const updated = tasks.map((task, idx) => ({ task, order: idx })).filter(({ task, order }) => task.order !== order).map(({ task, order }) => ({ id: task.id, changes: { order } }));
    if (updated.length > 0) {
      await host.saveData({ taskChanges: { updated } });
    }
    await state?.refresh?.();
    return updated.length > 0;
  }
  function setupPaneDragAndDrop(wrapper, target, host, state, signal) {
    addAbortableListener(
      wrapper,
      "dragover",
      (rawEvent) => {
        const e = rawEvent;
        if (!acceptsLibraryDrop(e, target, host)) return;
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = "copy";
          e.preventDefault();
        }
        wrapper.classList.add("td-drag-target-active");
      },
      void 0,
      signal
    );
    addAbortableListener(
      wrapper,
      "dragleave",
      (rawEvent) => {
        const e = rawEvent;
        if (!wrapper.contains(e.relatedTarget)) {
          wrapper.classList.remove("td-drag-target-active");
        }
      },
      void 0,
      signal
    );
    addAbortableListener(
      wrapper,
      "drop",
      async (rawEvent) => {
        const e = rawEvent;
        wrapper.classList.remove("td-drag-target-active");
        if (!target || draggingTaskId) return;
        if (host?.getPref?.("dragDropFromLibrary", true) === false) return;
        const itemIDs = parseDroppedItemIds(e.dataTransfer);
        if (!itemIDs.length) return;
        e.preventDefault();
        e.stopPropagation();
        try {
          if (typeof host?.addDroppedLiteratureTasks === "function") {
            const result = await host.addDroppedLiteratureTasks(itemIDs);
            host.showNotice?.(
              "创建文献研读待办",
              `新增 ${result.added} 篇，跳过已有 ${result.skipped} 篇` + (result.ignored ? `，忽略 ${result.ignored} 个无效项` : "")
            );
          }
          await state?.refresh?.();
        } catch (err) {
          Zotero?.logError?.("[TaskFlow] ItemPane drop handling error: " + err);
          host?.showNotice?.("创建文献研读待办失败", err instanceof Error ? err.message : String(err));
        }
      },
      void 0,
      signal
    );
  }
  function makeTaskCardDraggable(card, task, host, state, signal) {
    card.setAttribute("draggable", "true");
    addAbortableListener(
      card,
      "dragstart",
      (rawEvent) => {
        const e = rawEvent;
        draggingTaskId = task.id;
        if (e.dataTransfer) {
          e.dataTransfer.setData("text/x-taskflow-id", task.id);
          e.dataTransfer.setData("text/plain", task.title || "");
          e.dataTransfer.effectAllowed = "move";
        }
        card.classList.add("is-dragging");
      },
      void 0,
      signal
    );
    addAbortableListener(
      card,
      "dragover",
      (rawEvent) => {
        const e = rawEvent;
        const types = getTransferTypes(e.dataTransfer);
        const sourceId = e.dataTransfer?.getData?.("text/x-taskflow-id") || draggingTaskId;
        if (!sourceId && !types.includes("text/x-taskflow-id")) return;
        if (sourceId === task.id) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        card.classList.add("td-card-drag-over");
      },
      void 0,
      signal
    );
    addAbortableListener(
      card,
      "dragleave",
      (rawEvent) => {
        const e = rawEvent;
        if (!card.contains(e.relatedTarget)) {
          card.classList.remove("td-card-drag-over");
        }
      },
      void 0,
      signal
    );
    addAbortableListener(
      card,
      "drop",
      async (rawEvent) => {
        const e = rawEvent;
        card.classList.remove("td-card-drag-over");
        const sourceId = e.dataTransfer?.getData?.("text/x-taskflow-id") || draggingTaskId;
        if (!sourceId || sourceId === task.id) return;
        e.preventDefault();
        e.stopPropagation();
        draggingTaskId = null;
        try {
          const rect = card.getBoundingClientRect?.();
          const insertAfter = Boolean(rect && rect.height > 0 && e.clientY > rect.top + rect.height / 2);
          await reorderTasksInHost(host, sourceId, task.id, insertAfter, state);
        } catch (err) {
          Zotero?.logError?.("[TaskFlow] ItemPane card reorder error: " + err);
          host?.showNotice?.("调整任务顺序失败", err instanceof Error ? err.message : String(err));
        }
      },
      void 0,
      signal
    );
    addAbortableListener(
      card,
      "dragend",
      () => {
        draggingTaskId = null;
        card.classList.remove("is-dragging");
        card.ownerDocument?.querySelectorAll(".td-card-drag-over").forEach((el) => {
          el.classList.remove("td-card-drag-over");
        });
      },
      void 0,
      signal
    );
  }

  // src/itemPane/quickAdd.ts
  function renderQuickAddSection(doc, target, host, state, uncompletedTasks, signal) {
    const elements = [];
    const quickBox = createEl(doc, "div", "td-quick-box");
    const prioSelect = createEl(doc, "select", "td-prio-select");
    prioSelect.setAttribute("aria-label", "新待办优先级");
    prioSelect.title = "新待办优先级";
    const defaultPrio = state?.quickPriority || host.getPref("defaultPriority", "medium");
    const priorities = [
      { val: "medium", label: "中优先" },
      { val: "high", label: "高优先" },
      { val: "low", label: "低优先" }
    ];
    for (const p of priorities) {
      const opt = createEl(doc, "option", "", p.label);
      opt.value = p.val;
      if (p.val === defaultPrio) opt.selected = true;
      prioSelect.appendChild(opt);
    }
    addAbortableListener(
      prioSelect,
      "change",
      () => {
        if (state) state.quickPriority = prioSelect.value;
      },
      void 0,
      signal
    );
    const quickInput = createEl(doc, "input", "td-quick-input");
    quickInput.type = "text";
    quickInput.value = state?.quickDraft || "";
    addAbortableListener(
      quickInput,
      "input",
      () => {
        if (state) state.quickDraft = quickInput.value;
      },
      void 0,
      signal
    );
    quickInput.setAttribute("aria-label", "新待办事项");
    quickInput.placeholder = "输入待办内容，按 Enter 添加";
    quickInput.id = "td-quick-input";
    const quickBtn = createEl(doc, "button", "td-quick-submit", "添加");
    quickBtn.type = "button";
    quickBtn.title = "添加待办任务";
    quickBtn.setAttribute("aria-label", "添加待办任务");
    quickInput.disabled = prioSelect.disabled = quickBtn.disabled = Boolean(state?.saving);
    const literatureTitle = serializeLiteratureItem(target)?.title || "";
    const existingReadingTask = uncompletedTasks.find(
      (task) => (task.literatureWorkflowId === "reading" || literatureTitle && task.title === `研读：${literatureTitle}`) && (task.academicType || "literature_reading") === "literature_reading"
    );
    const addReadingBtn = createEl(
      doc,
      "button",
      "td-add-reading",
      existingReadingTask ? "已加入论文研读" : "＋ 添加到论文研读"
    );
    addReadingBtn.type = "button";
    addReadingBtn.title = `为当前文献创建论文研读待办，默认 ${LiteratureWorkflow.days(host.getPref("defaultDueDays", 7))} 天后截止`;
    addReadingBtn.setAttribute("aria-label", "添加到论文研读");
    addReadingBtn.disabled = Boolean(existingReadingTask || state?.saving);
    if (addReadingBtn.disabled) addReadingBtn.style.opacity = "0.65";
    const addHint = createEl(
      doc,
      "div",
      "td-add-hint",
      existingReadingTask ? `已关联当前文献 · 截止日期：${existingReadingTask.dueDate || "未设置"}` : `点击即可创建待办并关联当前文献 · 默认 ${LiteratureWorkflow.days(host.getPref("defaultDueDays", 7))} 天后截止`
    );
    addHint.setAttribute("role", "status");
    addHint.setAttribute("aria-live", "polite");
    elements.push(addReadingBtn);
    elements.push(addHint);
    let saving = false;
    const handleQuickAdd = async (useLiteratureTitle = false) => {
      if (saving || state?.saving || useLiteratureTitle && existingReadingTask) return;
      const text = useLiteratureTitle ? "" : quickInput.value.trim();
      if (!useLiteratureTitle && !text) {
        quickInput.focus();
        return;
      }
      const selectedPrio = prioSelect.value || defaultPrio;
      saving = true;
      if (state) state.saving = true;
      addReadingBtn.disabled = true;
      quickBtn.disabled = true;
      quickInput.disabled = true;
      prioSelect.disabled = true;
      try {
        const result = await host.addLiteratureReadingTask(target, {
          title: text,
          priority: selectedPrio,
          academicType: useLiteratureTitle ? "literature_reading" : host.getPref("defaultTaskType", "literature_reading")
        });
        if (!useLiteratureTitle) {
          quickInput.value = "";
          if (state?.itemKey === target.key && state?.libraryID === target.libraryID) state.quickDraft = "";
        }
        host.showNotice(
          result.created ? "已加入待办事项" : "该文献已加入待办",
          `截止日期：${result.task?.dueDate || "未设置"}`
        );
      } catch (error) {
        addHint.textContent = "保存失败，请重试。";
        host.showNotice("保存失败", String(error));
        return;
      } finally {
        saving = false;
        if (state) state.saving = false;
        addReadingBtn.disabled = Boolean(existingReadingTask);
        addReadingBtn.style.opacity = addReadingBtn.disabled ? "0.65" : "1";
        quickBtn.disabled = false;
        quickInput.disabled = false;
        prioSelect.disabled = false;
      }
      await state?.refresh?.();
    };
    addAbortableListener(
      addReadingBtn,
      "click",
      () => {
        handleQuickAdd(true).catch(
          (error) => Zotero.logError?.("[TaskFlow] Quick add refresh failed: " + error)
        );
      },
      void 0,
      signal
    );
    addAbortableListener(
      quickInput,
      "keydown",
      (rawEvent) => {
        const e = rawEvent;
        if (e.key === "Enter") {
          e.preventDefault();
          handleQuickAdd().catch(
            (error) => Zotero.logError?.("[TaskFlow] Quick add refresh failed: " + error)
          );
        }
      },
      void 0,
      signal
    );
    addAbortableListener(
      quickBtn,
      "click",
      (e) => {
        e.preventDefault();
        handleQuickAdd().catch(
          (error) => Zotero.logError?.("[TaskFlow] Quick add refresh failed: " + error)
        );
      },
      void 0,
      signal
    );
    const quickLabel = createEl(doc, "label", "td-quick-label", "快速新建待办");
    quickLabel.setAttribute("for", "td-quick-input");
    elements.push(quickLabel);
    quickBox.appendChild(prioSelect);
    quickBox.appendChild(quickInput);
    quickBox.appendChild(quickBtn);
    elements.push(quickBox);
    return elements;
  }
  function renderProfileSection(doc, tasks, host, state, signal) {
    const profileBox = createEl(doc, "label", "td-reading-profile", "研读模板");
    const profileSelect = createEl(doc, "select");
    profileSelect.setAttribute("aria-label", "研读模板");
    const selectedProfile = state?.profileID || tasks.find((task) => task.readingProfile)?.readingProfile || host.getPref("readingProfile", "general");
    for (const [id, profile] of Object.entries(LiteratureWorkflow.profiles)) {
      const option = createEl(doc, "option", "", profile.label);
      option.value = id;
      option.selected = id === selectedProfile;
      profileSelect.appendChild(option);
    }
    addAbortableListener(
      profileSelect,
      "change",
      () => {
        if (state) state.profileID = profileSelect.value;
      },
      void 0,
      signal
    );
    profileBox.appendChild(profileSelect);
    return { box: profileBox, select: profileSelect };
  }
  function renderEmptyCard(doc, target, host, state, profileSelect, signal) {
    const emptyCard = createEl(doc, "div", "td-empty-card");
    const emptyDesc = createEl(
      doc,
      "div",
      "td-empty-desc",
      "点击上方“添加到论文研读”或在输入框新建待办；也可按所选模板一键生成 5 步精读清单"
    );
    const btnCreateMilestones = createEl(doc, "button", "td-btn-milestone-primary", "生成精读清单");
    btnCreateMilestones.type = "button";
    btnCreateMilestones.title = "按所选研读模板为本文献建立精读清单";
    addAbortableListener(
      btnCreateMilestones,
      "click",
      async (e) => {
        e.stopPropagation();
        if (btnCreateMilestones.disabled) return;
        btnCreateMilestones.disabled = true;
        try {
          await host.createReadingMilestones(target, Zotero.getMainWindow?.() || null, profileSelect.value);
          await state?.refresh?.();
        } catch (error) {
          host.showNotice("创建精读清单失败", String(error));
        } finally {
          btnCreateMilestones.disabled = false;
        }
      },
      void 0,
      signal
    );
    emptyCard.appendChild(emptyDesc);
    emptyCard.appendChild(btnCreateMilestones);
    return emptyCard;
  }

  // src/itemPane/fallbackView.ts
  function renderFallback(doc, target, state, host, fallbackVersion, signal) {
    const fallback = createEl(doc, "div", "td-pane-wrap td-pane-fallback");
    const addButton = createEl(doc, "button", "td-add-reading", "＋ 添加到论文研读");
    addButton.type = "button";
    addButton.disabled = !target || Boolean(state?.saving);
    addButton.setAttribute("aria-label", "添加到论文研读");
    addButton.title = target ? "创建关联当前文献的研读待办，默认一周后截止" : "请先在 Zotero 文献库中选中一篇文献";
    addAbortableListener(
      addButton,
      "click",
      async () => {
        if (!target || addButton.disabled) return;
        addButton.disabled = true;
        try {
          const result = await host.addLiteratureReadingTask(target);
          host.showNotice(
            result.created ? "已加入论文研读" : "该文献已有关联待办",
            `截止日期：${result.task?.dueDate || "未设置"}`
          );
          await state?.refresh?.();
        } catch (error) {
          addButton.disabled = false;
          host.showNotice("保存失败", String(error));
        }
      },
      void 0,
      signal
    );
    fallback.appendChild(addButton);
    const fallbackTaskList = createEl(doc, "div", "td-fallback-task-list");
    fallback.appendChild(fallbackTaskList);
    if (target) {
      const renderFallbackTasks = (tasks) => {
        fallbackTaskList.replaceChildren();
        if (tasks.length) {
          for (const task of tasks) {
            const row = createEl(doc, "div", "td-task-card td-task-card-fallback");
            const taskRow = createEl(doc, "div", "td-task-row");
            const title = createEl(doc, "span", "td-task-title-fallback", task.title || "未命名待办");
            title.style.cssText = "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;";
            const locate = createEl(doc, "button", "td-task-locate", "↗ Zotero");
            locate.type = "button";
            locate.title = "在 Zotero 文献库中定位这篇文献";
            locate.setAttribute("aria-label", `跳转到文献：${task.zoteroItemTitle || task.title || target.key}`);
            addAbortableListener(
              locate,
              "click",
              (event) => {
                event.preventDefault();
                event.stopPropagation();
                host.locateLiteratureItem(task.zoteroUri || task.zoteroItemKey, task.zoteroLibraryID, Zotero.getMainWindow?.() || null).catch((error) => host.showNotice("无法跳转文献", String(error)));
              },
              void 0,
              signal
            );
            taskRow.append(title, locate);
            row.appendChild(taskRow);
            fallbackTaskList.appendChild(row);
          }
        } else {
          fallbackTaskList.appendChild(createEl(doc, "div", "td-add-hint", "当前文献还没有关联的研读待办。"));
        }
      };
      const userLib = Zotero.Libraries?.userLibraryID || 1;
      const matchesTarget = (task) => task.zoteroItemKey === target.key && (task.zoteroLibraryID || userLib) === target.libraryID;
      renderFallbackTasks((host._cachedData?.tasks || []).filter(matchesTarget));
      if (!host._cachedData) {
        host.loadData().then((data) => {
          if (signal?.aborted || state && state.renderVersion !== fallbackVersion) return;
          if (doc.querySelector(".td-pane-fallback") !== fallback) return;
          renderFallbackTasks((data.tasks || []).filter(matchesTarget));
        }).catch((error) => {
          if (signal?.aborted || state && state.renderVersion !== fallbackVersion) return;
          if (doc.querySelector(".td-pane-fallback") === fallback) {
            fallbackTaskList.replaceChildren(
              createEl(doc, "div", "td-add-hint", "待办读取失败；添加按钮仍可使用，请重新选择条目重试。")
            );
          }
          Zotero.logError?.("[TaskFlow] ItemPane fallback data load failed: " + error);
        });
      }
    } else {
      fallbackTaskList.appendChild(
        createEl(doc, "div", "td-add-hint", "请在文献库中选中一篇文献以查看关联待办和跳转按钮。")
      );
    }
    return fallback;
  }

  // src/itemPane/contextMenu.ts
  function renderRescheduleMenu(doc, task, state, host, signal) {
    const menu = createEl(doc, "details", "td-reschedule");
    const summary = createEl(doc, "summary", "", "改期");
    menu.appendChild(summary);
    for (const [days, label] of [
      [0, "今天"],
      [3, "延后三天"],
      [7, "延后一周"]
    ]) {
      const dateBtn = createEl(doc, "button", "td-reschedule-option", label);
      dateBtn.type = "button";
      dateBtn.title = days ? "从当前截止日期延后；未设置或已逾期时从今天计算" : "截止日期设为今天";
      addAbortableListener(
        dateBtn,
        "click",
        async () => {
          if (dateBtn.disabled) return;
          menu.querySelectorAll("button").forEach((btn) => {
            btn.disabled = true;
          });
          try {
            await host.rescheduleLiteratureTask(task.id, days, Number(days) > 0);
            menu.open = false;
          } catch (error) {
            host.showNotice("改期失败", String(error));
          } finally {
            menu.querySelectorAll("button").forEach((btn) => {
              btn.disabled = false;
            });
          }
          Promise.resolve(state?.refresh?.()).catch(
            (error) => Zotero.logError?.("[TaskFlow] 改期刷新失败: " + error)
          );
        },
        void 0,
        signal
      );
      menu.appendChild(dateBtn);
    }
    return menu;
  }
  function renderTaskControls(doc, task, _target, host, state, signal) {
    const controls = createEl(doc, "div", "td-task-controls");
    if (task.zoteroItemKey) {
      const locateButton = createEl(doc, "button", "td-task-locate", "↗ Zotero");
      locateButton.type = "button";
      locateButton.title = "在 Zotero 文献库中定位这篇文献";
      locateButton.setAttribute("aria-label", `跳转到文献：${task.zoteroItemTitle || task.title}`);
      addAbortableListener(
        locateButton,
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();
          host.locateLiteratureItem(task.zoteroUri || task.zoteroItemKey, task.zoteroLibraryID, Zotero.getMainWindow?.() || null).catch((error) => host.showNotice("无法跳转文献", String(error)));
        },
        void 0,
        signal
      );
      controls.appendChild(locateButton);
    }
    if (task.dueDate) {
      const todayStr = host.localDateString(/* @__PURE__ */ new Date());
      const isOverdue = !task.completed && task.dueDate < todayStr;
      const dateText = (isOverdue ? "逾期 · " : "") + (task.dueDate.length > 5 ? task.dueDate.slice(5) : task.dueDate);
      const dueBadge = createEl(doc, "span", `td-badge-date ${isOverdue ? "is-overdue" : ""}`, dateText);
      dueBadge.title = isOverdue ? `已逾期！截止日期: ${task.dueDate}` : `截止日期: ${task.dueDate}`;
      controls.appendChild(dueBadge);
    }
    const editBtn = createEl(doc, "button", "td-task-edit", "编辑");
    editBtn.type = "button";
    addAbortableListener(
      editBtn,
      "click",
      () => {
        host.openTaskFlow({ mode: "edit_task", taskId: task.id }, Zotero.getMainWindow?.() || null);
      },
      void 0,
      signal
    );
    controls.appendChild(editBtn);
    if (!task.completed) {
      const rescheduleMenu = renderRescheduleMenu(doc, task, state, host, signal);
      controls.appendChild(rescheduleMenu);
    }
    if (task.zoteroPdfUri || task.zoteroAnnotationKey) {
      const pdfBtn = createEl(doc, "button", "td-task-pdf", task.zoteroAnnotationKey ? "回到批注" : "打开 PDF");
      pdfBtn.type = "button";
      addAbortableListener(
        pdfBtn,
        "click",
        () => {
          host.openTaskPdf(task).catch((error) => host.showNotice("打开 PDF 失败", String(error)));
        },
        void 0,
        signal
      );
      controls.appendChild(pdfBtn);
    }
    return controls;
  }
  function attachTaskCardContextMenu(card, _task, _host, _state, signal) {
    addAbortableListener(
      card,
      "contextmenu",
      (e) => {
        if (e.target && e.target.tagName === "BUTTON") return;
      },
      void 0,
      signal
    );
  }

  // src/itemPane/scheduler.ts
  function scheduleUndoClear(host) {
    if (host._paneUndoTimer) {
      clearTimeout(host._paneUndoTimer);
      host._paneUndoTimer = null;
    }
    host._paneUndoTimer = setAbortableTimeout(
      () => {
        host._paneUndoTimer = null;
        host._paneDeleted = [];
        host.notifyDataChanged();
      },
      8e3,
      host.getHostSignal?.()
    );
  }
  async function handleTaskToggle(host, target, task, checkbox, state) {
    try {
      await host.updateTaskState(task.id, (current) => ({
        completed: checkbox.checked,
        completedAt: checkbox.checked ? (/* @__PURE__ */ new Date()).toISOString() : null,
        status: checkbox.checked ? "done" : "todo",
        subtasks: (current.subtasks || []).map((sub) => ({
          ...sub,
          completed: checkbox.checked ? true : sub.completed
        }))
      }));
    } catch (error) {
      checkbox.checked = task.completed;
      host.showNotice("保存失败", String(error));
      return;
    }
    if (target.key) await host.tagItemOnTaskEvent(target.key, "complete_check", target.libraryID);
    if (host.getPref("autoSyncChildNote", true)) {
      await host.syncTasksToChildNote(target);
    }
    state?.refresh?.();
  }
  async function handleSubtaskToggle(host, target, task, sub, subCheck, state) {
    try {
      await host.updateTaskState(task.id, (current) => {
        const subtasks = (current.subtasks || []).map(
          (st) => st.id === sub.id ? { ...st, completed: subCheck.checked } : st
        );
        const completed = subtasks.length > 0 && subtasks.every((st) => st.completed);
        return {
          subtasks,
          completed,
          completedAt: completed ? current.completedAt || (/* @__PURE__ */ new Date()).toISOString() : null,
          status: completed ? "done" : "todo"
        };
      });
    } catch (error) {
      subCheck.checked = sub.completed;
      host.showNotice("保存失败", String(error));
      return;
    }
    if (target.key) await host.tagItemOnTaskEvent(target.key, "complete_check", target.libraryID);
    if (host.getPref("autoSyncChildNote", true) && host.getPref("childNoteAutoUpdateOnSubtask", true)) {
      await host.syncTasksToChildNote(target);
    }
    state?.refresh?.();
  }
  async function handleTaskDelete(host, target, task, delBtn, state) {
    if (delBtn.disabled) return;
    delBtn.disabled = true;
    try {
      await host.saveData({ taskChanges: { deleted: [task.id] } });
      host._paneDeleted ||= [];
      host._paneDeleted.push(host.cloneData(task));
      scheduleUndoClear(host);
    } catch (error) {
      delBtn.disabled = false;
      host.showNotice("删除失败", String(error));
      return;
    }
    if (target.key) await host.tagItemOnTaskEvent(target.key, "complete_check", target.libraryID);
    if (host.getPref("autoSyncChildNote", true)) {
      await host.syncTasksToChildNote(target);
    }
    state?.refresh?.();
  }
  async function handleUndoDelete(host, target, undoBtn, state) {
    if (undoBtn.disabled) return;
    const restored = [...host._paneDeleted || []];
    if (!restored.length) return;
    undoBtn.disabled = true;
    if (host._paneUndoTimer) {
      clearTimeout(host._paneUndoTimer);
      host._paneUndoTimer = null;
    }
    try {
      await host.saveData({ taskChanges: { added: restored } });
      host._paneDeleted = [];
      for (const task of restored) {
        if (task.zoteroItemKey) {
          await host.tagItemOnTaskEvent(task.zoteroItemKey, "complete_check", task.zoteroLibraryID);
        }
      }
      if (host.getPref("autoSyncChildNote", true)) {
        await host.syncTasksToChildNote(target);
      }
      state?.refresh?.();
    } catch (error) {
      undoBtn.disabled = false;
      if (host._paneDeleted?.length) scheduleUndoClear(host);
      host.showNotice("恢复失败", String(error));
    }
  }
  function renderTaskList(doc, tasks, target, host, state, signal) {
    const taskList = createEl(doc, "div", "td-task-list");
    const showSubtasks = Boolean(host.getPref("itemPaneShowSubtasks", true));
    for (const t of tasks) {
      const taskCard = createEl(doc, "div", `td-task-card ${t.completed ? "is-completed" : ""}`);
      taskCard.dataset.taskId = t.id;
      makeTaskCardDraggable(taskCard, t, host, state, signal);
      attachTaskCardContextMenu(taskCard, t, host, state, signal);
      const row = createEl(doc, "div", "td-task-row");
      const prio = t.priority || "medium";
      const prioDot = createEl(doc, "span", `td-prio-dot td-prio-${prio}`);
      const prioLabel = prio === "high" ? "高" : prio === "low" ? "低" : "中";
      prioDot.title = `优先级: ${prioLabel}`;
      row.appendChild(prioDot);
      const checkbox = createEl(doc, "input", "td-checkbox");
      checkbox.type = "checkbox";
      checkbox.setAttribute("aria-label", t.title);
      checkbox.checked = Boolean(t.completed);
      checkbox.title = t.completed ? "标记为未完成" : "标记为已完成";
      addAbortableListener(
        checkbox,
        "change",
        (e) => {
          e.stopPropagation();
          void handleTaskToggle(host, target, t, checkbox, state);
        },
        void 0,
        signal
      );
      row.appendChild(checkbox);
      const titleSpan = createEl(doc, "button", `td-task-title ${t.completed ? "is-done" : ""}`, t.title);
      titleSpan.type = "button";
      titleSpan.title = `${t.title} (点击在看板中查看详情)`;
      addAbortableListener(
        titleSpan,
        "click",
        () => {
          host.openTaskFlow({ mode: "view_task", taskId: t.id }, Zotero.getMainWindow?.() || null);
        },
        void 0,
        signal
      );
      row.appendChild(titleSpan);
      const delBtn = createEl(doc, "button", "td-task-delete", "移除");
      delBtn.type = "button";
      delBtn.setAttribute("aria-label", `从 TaskFlow 移除任务并保留 Zotero 文献：${t.title}`);
      delBtn.title = "仅移除此 TaskFlow 任务，不删除 Zotero 文献";
      addAbortableListener(
        delBtn,
        "click",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          void handleTaskDelete(host, target, t, delBtn, state);
        },
        void 0,
        signal
      );
      row.appendChild(delBtn);
      taskCard.appendChild(row);
      const controls = renderTaskControls(doc, t, target, host, state, signal);
      let subList = null;
      if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
        const doneSubs = t.subtasks.filter((s) => s.completed).length;
        const subToggle = createEl(doc, "button", "td-subtask-toggle", `子任务 ${doneSubs}/${t.subtasks.length}`);
        subToggle.type = "button";
        subToggle.title = "展开/收起子任务清单";
        const expanded = state?.expandedTasks.get(t.id) ?? showSubtasks;
        subToggle.setAttribute("aria-expanded", String(expanded));
        controls.appendChild(subToggle);
        const currentSubList = createEl(doc, "div", "td-subtask-list");
        if (!expanded) currentSubList.style.display = "none";
        subList = currentSubList;
        addAbortableListener(
          subToggle,
          "click",
          (e) => {
            e.stopPropagation();
            const isHidden = currentSubList.style.display === "none";
            currentSubList.style.display = isHidden ? "flex" : "none";
            subToggle.setAttribute("aria-expanded", String(isHidden));
            state?.expandedTasks.set(t.id, isHidden);
          },
          void 0,
          signal
        );
        for (const sub of t.subtasks) {
          const subRow = createEl(doc, "div", "td-subtask-item");
          const subCheck = createEl(doc, "input", "td-checkbox");
          subCheck.type = "checkbox";
          subCheck.setAttribute("aria-label", sub.title);
          subCheck.checked = Boolean(sub.completed);
          addAbortableListener(
            subCheck,
            "change",
            (e) => {
              e.stopPropagation();
              void handleSubtaskToggle(host, target, t, sub, subCheck, state);
            },
            void 0,
            signal
          );
          const subSpan = createEl(doc, "span", `td-subtask-title ${sub.completed ? "is-done" : ""}`, sub.title);
          subRow.appendChild(subCheck);
          subRow.appendChild(subSpan);
          currentSubList.appendChild(subRow);
        }
      }
      taskCard.appendChild(controls);
      if (subList) taskCard.appendChild(subList);
      taskList.appendChild(taskCard);
    }
    return taskList;
  }

  // src/itemPane/index.ts
  function resetRenderController(state, doc) {
    if (!state) return void 0;
    state.renderController?.abort();
    const next = createScopedController(doc?.defaultView);
    linkParentSignal(next, state.sectionController?.signal);
    state.renderController = next;
    return next.signal;
  }
  function ensureItemController(state, doc, itemKey, libraryID) {
    if (!state) return void 0;
    const changed = state.itemKey !== itemKey || state.libraryID !== libraryID;
    if (changed || !state.itemController || state.itemController.signal.aborted) {
      state.itemController?.abort();
      const next = createScopedController(doc?.defaultView);
      linkParentSignal(next, state.sectionController?.signal);
      state.itemController = next;
    }
    return state.itemController.signal;
  }
  var TaskFlowItemPane = {
    ensureItemPaneStyles(doc) {
      ensureItemPaneStyles(doc);
    },
    registerItemPaneSection(host) {
      if (!host.getPref("enableItemPane", true)) return;
      if (typeof Zotero.ItemPaneManager?.registerSection !== "function") return;
      try {
        const sectionStates = /* @__PURE__ */ new WeakMap();
        const icon = `${CHROME_ROOT}icons/taskflow.svg`;
        host.itemPaneSectionID = Zotero.ItemPaneManager.registerSection({
          paneID: "todolist-item-pane",
          pluginID: ADDON_ID,
          header: { l10nID: "todolist-item-pane-header", icon },
          sidenav: { l10nID: "todolist-item-pane-sidenav", icon },
          onInit: ({ doc, body, item, refresh }) => {
            const document = doc || body?.ownerDocument;
            if (document) {
              host.ensureLocalization(document);
              host.ensureItemPaneStyles(document);
            }
            const target = getLiteratureItem(item);
            const sectionController = createScopedController(document?.defaultView);
            linkParentSignal(sectionController, host.getHostSignal?.());
            const itemController = createScopedController(document?.defaultView);
            linkParentSignal(itemController, sectionController.signal);
            const state = {
              itemKey: target?.key || null,
              libraryID: target?.libraryID || null,
              renderVersion: 0,
              quickDraft: "",
              quickPriority: null,
              expandedTasks: /* @__PURE__ */ new Map(),
              saving: false,
              refresh,
              sectionController,
              itemController,
              onDataChanged: () => {
                Promise.resolve(refresh?.()).catch((err) => {
                  Zotero.logError?.("[TaskFlow] ItemPane refresh failed: " + err);
                });
              }
            };
            host.registerDataListener(state.onDataChanged, { signal: sectionController.signal });
            sectionStates.set(body, state);
          },
          onDestroy: ({ body }) => {
            const state = sectionStates.get(body);
            if (state) {
              state.renderVersion++;
              state.renderController?.abort();
              state.itemController?.abort();
              state.sectionController?.abort();
            }
            if (state?.onDataChanged) {
              host.unregisterDataListener(state.onDataChanged);
            }
            sectionStates.delete(body);
          },
          onItemChange: ({ body, item, setEnabled }) => {
            const target = getLiteratureItem(item) || getLiteratureItem(Zotero.getMainWindow?.()?.ZoteroPane?.getSelectedItems?.()?.[0]);
            const state = sectionStates.get(body);
            if (state) {
              const nextKey = target?.key || null;
              const nextLib = target?.libraryID || null;
              if (state.itemKey !== nextKey || state.libraryID !== nextLib) {
                state.profileID = null;
                state.quickDraft = "";
                state.quickPriority = null;
                state.expandedTasks.clear();
                ensureItemController(state, body?.ownerDocument, nextKey, nextLib);
              }
              state.itemKey = nextKey;
              state.libraryID = nextLib;
              state.renderVersion++;
              state.renderController?.abort();
            }
            setEnabled?.(Boolean(target));
          },
          onRender: ({ body, item, setSectionSummary }) => {
            if (!body) return;
            const document = body.ownerDocument;
            const target = getLiteratureItem(item) || getLiteratureItem(Zotero.getMainWindow?.()?.ZoteroPane?.getSelectedItems?.()?.[0]);
            const state = sectionStates.get(body);
            setSectionSummary?.("文献研读待办");
            body.replaceChildren();
            const fallbackVersion = state ? ++state.renderVersion : 0;
            const renderSignal = resetRenderController(state, document);
            const fallback = renderFallback(document, target, state, host, fallbackVersion, renderSignal);
            body.appendChild(fallback);
          },
          onAsyncRender: async ({ doc, body, item, setSectionSummary }) => {
            if (!body) return;
            const document = doc || body.ownerDocument;
            if (document) {
              host.ensureItemPaneStyles(document);
            }
            const target = getLiteratureItem(item) || getLiteratureItem(Zotero.getMainWindow?.()?.ZoteroPane?.getSelectedItems?.()?.[0]);
            if (!target) return;
            const state = sectionStates.get(body);
            const renderVersion = state ? ++state.renderVersion : 0;
            const renderSignal = resetRenderController(state, document);
            let data;
            try {
              data = await host.loadData();
            } catch (error) {
              if (state && renderVersion !== state.renderVersion || renderSignal?.aborted) return;
              body.appendChild(createEl(document, "div", "td-add-hint", "待办数据读取失败，请重新选择条目后重试。"));
              Zotero.logError?.("[TaskFlow] ItemPane data load failed: " + error);
              return;
            }
            if (state && renderVersion !== state.renderVersion || renderSignal?.aborted) return;
            body.replaceChildren();
            const targetKey = target.key;
            const userLib = Zotero.Libraries?.userLibraryID || 1;
            const tasks = (data.tasks || []).filter(
              (t) => t.zoteroItemKey === targetKey && (t.zoteroLibraryID || userLib) === target.libraryID
            );
            const uncompletedTasks = tasks.filter((t) => !t.completed);
            const total = tasks.length;
            const done = total - uncompletedTasks.length;
            const pct = total > 0 ? Math.round(done / total * 100) : 0;
            setSectionSummary?.(total ? `${total} 项待办 · ${done}/${total} 完成` : "展开后快速新建");
            const wrapper = createEl(document, "div", "td-pane-wrap");
            const itemSignal = ensureItemController(state, document, target.key || null, target.libraryID || null);
            if (state) {
              state.itemKey = target.key || null;
              state.libraryID = target.libraryID || null;
            }
            setupPaneDragAndDrop(wrapper, target, host, state, itemSignal);
            const showProgressBar = Boolean(host.getPref("itemPaneShowProgressBar", true));
            wrapper.appendChild(renderHeaderCard(document, total, done, pct, showProgressBar));
            for (const el of renderQuickAddSection(document, target, host, state, uncompletedTasks, itemSignal)) {
              wrapper.appendChild(el);
            }
            const profile = renderProfileSection(document, tasks, host, state, itemSignal);
            wrapper.appendChild(profile.box);
            if (total === 0) {
              wrapper.appendChild(renderEmptyCard(document, target, host, state, profile.select, itemSignal));
            }
            if (total > 0) {
              wrapper.appendChild(renderTaskList(document, tasks, target, host, state, itemSignal));
            }
            if (host._paneDeleted?.length) {
              const undoBtn = createEl(document, "button", "td-subtask-toggle", "撤销删除（8 秒内）");
              undoBtn.type = "button";
              addAbortableListener(
                undoBtn,
                "click",
                () => {
                  void handleUndoDelete(host, target, undoBtn, state);
                },
                void 0,
                itemSignal
              );
              wrapper.appendChild(undoBtn);
            }
            wrapper.appendChild(renderActionGrid(document, target, total, host, state, profile.select, itemSignal));
            body.appendChild(wrapper);
          }
        });
      } catch (error) {
        Zotero.logError?.("[TaskFlow] Could not register ItemPane section: " + error);
      }
    }
  };
  if (typeof Zotero !== "undefined") {
    Zotero.TaskFlowItemPane = TaskFlowItemPane;
  }
  var g = globalThis;
  if (typeof g !== "undefined") {
    g.TaskFlowItemPane = TaskFlowItemPane;
  }

  // src/itemPane.ts
  if (typeof Zotero !== "undefined") {
    Zotero.TaskFlowItemPane = TaskFlowItemPane;
  }
  var g2 = globalThis;
  if (typeof g2 !== "undefined") {
    g2.TaskFlowItemPane = TaskFlowItemPane;
  }
  var itemPane_default = TaskFlowItemPane;
})();
