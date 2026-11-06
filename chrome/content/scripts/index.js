(() => {
  // src/config.ts
  var ADDON_ID = "taskflow@groele.org";
  var CHROME_ROOT = "chrome://taskflow/content/";

  // src/utils.ts
  var escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  var itemSelectUri = (item) => {
    if (!item) return "";
    const key = item.key || item.id;
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
        target = Zotero.Items.get(target.parentItemID) || target;
      }
    }
    if (typeof target.isNote === "function" && target.isNote()) {
      if (target.parentItemID) {
        target = Zotero.Items.get(target.parentItemID) || target;
      }
    }
    try {
      if (target.topLevelItem && typeof target.topLevelItem.isRegularItem === "function" && target.topLevelItem.isRegularItem()) {
        return target.topLevelItem;
      }
    } catch (_) {
    }
    return target && typeof target.isRegularItem === "function" && target.isRegularItem() ? target : null;
  };
  var serializeLiteratureItem = (item) => {
    const target = getLiteratureItem(item);
    if (!target) return null;
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
        tags = target.getTags().map((t) => t.tag || String(t)).filter(Boolean);
      }
    } catch (_) {
    }
    let pdfUri = null;
    try {
      if (typeof target.getAttachments === "function") {
        const attIds = target.getAttachments();
        for (const attId of attIds) {
          const att = Zotero.Items.get(attId);
          if (att && (typeof att.isPDFAttachment === "function" && att.isPDFAttachment() || att.contentType === "application/pdf")) {
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
  var resolveItemReference = (reference, libraryID) => {
    if (!reference) return null;
    const raw = String(reference).trim();
    const groupMatch = raw.match(
      /^zotero:\/\/(?:select|open-pdf)\/groups\/(\d+)\/items\/([A-Za-z0-9_]+)/
    );
    const key = groupMatch?.[2] || raw.match(/\/items\/([A-Za-z0-9_]+)(?:[?#]|$)/)?.[1] || raw;
    if (!/^[A-Za-z0-9_]+$/.test(key)) return null;
    if (!raw.includes("/items/") && /^\d+$/.test(key))
      return Zotero.Items.get(Number(key));
    let targetLibraryID = Number.isInteger(Number(libraryID)) && Number(libraryID) > 0 ? Number(libraryID) : Zotero.Libraries?.userLibraryID || 1;
    if (groupMatch) {
      targetLibraryID = Zotero.Groups?.getLibraryIDFromGroupID?.(Number(groupMatch[1])) || targetLibraryID;
    }
    return Zotero.Items.getByLibraryAndKey?.(targetLibraryID, key) || null;
  };

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
  function renderActionGrid(doc, target, total, host, state, profileSelect) {
    const actionGrid = createEl(doc, "div", "td-action-grid");
    const btnOpenBoard = createEl(doc, "button", "td-action-btn td-action-workspace", "待办看板");
    btnOpenBoard.type = "button";
    btnOpenBoard.title = "在主标签页中打开 TaskFlow 任务看板";
    btnOpenBoard.addEventListener("click", () => {
      host.openTaskFlow({ mode: "filter_item", itemKey: target.key }, Zotero.getMainWindow?.());
    });
    actionGrid.appendChild(btnOpenBoard);
    const btnSubwin = createEl(doc, "button", "td-action-btn td-action-workspace", "伴读窗口");
    btnSubwin.type = "button";
    btnSubwin.title = "打开轻量伴读窗口，适合与 PDF 左右分屏对照";
    btnSubwin.addEventListener("click", () => {
      host.openStandaloneWindow({ mode: "filter_item", itemKey: target.key }, Zotero.getMainWindow?.(), "subwindow");
    });
    actionGrid.appendChild(btnSubwin);
    const btnSyncNote = createEl(doc, "button", "td-action-btn td-action-notes", "同步子笔记");
    btnSyncNote.type = "button";
    btnSyncNote.title = "将本文献的所有研读待办同步导出为文献子笔记 (云端)";
    const isReadOnly = typeof target.isEditable === "function" && !target.isEditable();
    if (isReadOnly) {
      btnSyncNote.disabled = true;
      btnSyncNote.title = "只读文献无法同步子笔记";
    }
    btnSyncNote.addEventListener("click", async () => {
      if (btnSyncNote.disabled) return;
      const note = await host.syncTasksToChildNote(target.id || target);
      if (note) {
        host.showNotice("同步成功", "已更新文献子笔记研读清单");
      } else {
        host.showNotice("跳过同步", "只读条目或未找到任务清单，跳过同步");
      }
    });
    actionGrid.appendChild(btnSyncNote);
    const meta = serializeLiteratureItem(target);
    if (meta?.pdfUri) {
      const btnPdf = createEl(doc, "button", "td-action-btn td-action-btn-pdf", "打开 PDF");
      btnPdf.type = "button";
      btnPdf.title = "在 Zotero 内置阅读器中打开该文献的 PDF 全文";
      btnPdf.addEventListener("click", () => {
        host.openPdfAttachment(target);
      });
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
      btnMilestones.addEventListener("click", async () => {
        await host.createReadingMilestones(target, Zotero.getMainWindow?.(), profileSelect.value);
        state?.refresh?.();
      });
      actionGrid.appendChild(btnMilestones);
    }
    return actionGrid;
  }

  // src/itemPane/dragDrop.ts
  function setupPaneDragAndDrop(wrapper, target, host, state) {
    wrapper.addEventListener("dragover", (e) => {
      if (!target) return;
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
        e.preventDefault();
      }
      wrapper.classList.add("td-drag-target-active");
    });
    wrapper.addEventListener("dragleave", (e) => {
      if (!wrapper.contains(e.relatedTarget)) {
        wrapper.classList.remove("td-drag-target-active");
      }
    });
    wrapper.addEventListener("drop", async (e) => {
      wrapper.classList.remove("td-drag-target-active");
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        const zoteroItems = e.dataTransfer?.getData("text/x-zotero-item") || e.dataTransfer?.getData("text/plain");
        if (zoteroItems) {
          await state?.refresh?.();
        }
      } catch (err) {
        Zotero.logError?.("[TaskFlow] ItemPane drop handling error: " + err);
      }
    });
  }
  function makeTaskCardDraggable(card, task, host) {
    card.setAttribute("draggable", "true");
    card.addEventListener("dragstart", (e) => {
      if (e.dataTransfer) {
        e.dataTransfer.setData("text/x-taskflow-id", task.id);
        e.dataTransfer.setData("text/plain", task.title || "");
        e.dataTransfer.effectAllowed = "move";
      }
      card.classList.add("is-dragging");
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("is-dragging");
    });
  }

  // src/literatureWorkflow.ts
  var LiteratureWorkflow = {
    profiles: {
      general: { label: "通用研读", steps: ["通读摘要、引言与结论，明确研究问题", "梳理核心方法、主要结果与证据链", "检查关键图表、适用条件与局限性", "对照相关工作，记录可复用的方法或思路", "整理研读笔记、疑问与后续行动"] },
      theory: { label: "理论论文", steps: ["明确研究问题、模型与物理假设", "逐步核查关键推导、符号与量纲", "检验极限情况、守恒关系与适用范围", "比较已有理论，提炼可检验预测", "整理推导笔记、局限与可复用计算"] },
      experiment: { label: "实验论文", steps: ["明确实验问题、样品与测量条件", "梳理实验流程、仪器参数与对照组", "核查原始证据、误差来源与统计报告", "评估机制解释、可重复性与替代解释", "记录设备需求、实验启发与验证计划"] },
      review: { label: "综述论文", steps: ["明确综述范围、分类框架与核心问题", "梳理代表工作、时间线与关键证据", "比较不同路线的共识、分歧与局限", "追踪关键原始文献并识别研究空白", "形成主题脉络图与后续阅读清单"] },
      algorithm: { label: "算法与复现", steps: ["明确任务定义、输入输出与核心贡献", "梳理算法结构、目标函数与复杂度", "核查基线、消融、数据划分与评价指标", "检查代码、环境与最小复现实验", "记录复现结果、局限与迁移条件"] }
    },
    profile(id) {
      return this.profiles[id] || this.profiles.general;
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
      return this.profile(profileID).steps.map((title, index) => ({ id: generateId(), title: `${index + 1}. ${title}`, completed: false }));
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

  // src/itemPane/quickAdd.ts
  function renderQuickAddSection(doc, target, host, state, uncompletedTasks) {
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
    prioSelect.addEventListener("change", () => {
      if (state) state.quickPriority = prioSelect.value;
    });
    const quickInput = createEl(doc, "input", "td-quick-input");
    quickInput.type = "text";
    quickInput.value = state?.quickDraft || "";
    quickInput.addEventListener("input", () => {
      if (state) state.quickDraft = quickInput.value;
    });
    quickInput.setAttribute("aria-label", "新待办事项");
    quickInput.placeholder = "输入待办内容，按 Enter 添加";
    quickInput.id = "td-quick-input";
    const quickBtn = createEl(doc, "button", "td-quick-submit", "添加");
    quickBtn.type = "button";
    quickBtn.title = "添加待办任务";
    quickBtn.setAttribute("aria-label", "添加待办任务");
    quickInput.disabled = prioSelect.disabled = quickBtn.disabled = Boolean(state?.saving);
    const literatureTitle = serializeLiteratureItem(target).title;
    const existingReadingTask = uncompletedTasks.find(
      (task) => (task.literatureWorkflowId === "reading" || task.title === `研读：${literatureTitle}`) && (task.academicType || "literature_reading") === "literature_reading"
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
          `截止日期：${result.task.dueDate || "未设置"}`
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
    addReadingBtn.addEventListener("click", () => {
      handleQuickAdd(true).catch(
        (error) => Zotero.logError?.("[TaskFlow] Quick add refresh failed: " + error)
      );
    });
    quickInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleQuickAdd().catch(
          (error) => Zotero.logError?.("[TaskFlow] Quick add refresh failed: " + error)
        );
      }
    });
    quickBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleQuickAdd().catch(
        (error) => Zotero.logError?.("[TaskFlow] Quick add refresh failed: " + error)
      );
    });
    const quickLabel = createEl(doc, "label", "td-quick-label", "快速新建待办");
    quickLabel.setAttribute("for", "td-quick-input");
    elements.push(quickLabel);
    quickBox.appendChild(prioSelect);
    quickBox.appendChild(quickInput);
    quickBox.appendChild(quickBtn);
    elements.push(quickBox);
    return elements;
  }
  function renderProfileSection(doc, tasks, host, state) {
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
    profileSelect.addEventListener("change", () => {
      if (state) state.profileID = profileSelect.value;
    });
    profileBox.appendChild(profileSelect);
    return { box: profileBox, select: profileSelect };
  }
  function renderEmptyCard(doc, target, host, state, profileSelect) {
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
    btnCreateMilestones.addEventListener("click", async (e) => {
      e.stopPropagation();
      await host.createReadingMilestones(target, Zotero.getMainWindow?.(), profileSelect.value);
      state?.refresh?.();
    });
    emptyCard.appendChild(emptyDesc);
    emptyCard.appendChild(btnCreateMilestones);
    return emptyCard;
  }

  // src/itemPane/contextMenu.ts
  function renderRescheduleMenu(doc, task, state, host) {
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
      dateBtn.addEventListener("click", async () => {
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
        Promise.resolve(state?.refresh?.()).catch((error) => Zotero.logError?.("[TaskFlow] 改期刷新失败: " + error));
      });
      menu.appendChild(dateBtn);
    }
    return menu;
  }
  function renderTaskControls(doc, task, target, host, state) {
    const controls = createEl(doc, "div", "td-task-controls");
    if (task.zoteroItemKey) {
      const locateButton = createEl(doc, "button", "td-task-locate", "↗ Zotero");
      locateButton.type = "button";
      locateButton.title = "在 Zotero 文献库中定位这篇文献";
      locateButton.setAttribute("aria-label", `跳转到文献：${task.zoteroItemTitle || task.title}`);
      locateButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        host.locateLiteratureItem(task.zoteroUri || task.zoteroItemKey, task.zoteroLibraryID, Zotero.getMainWindow?.()).catch((error) => host.showNotice("无法跳转文献", String(error)));
      });
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
    editBtn.addEventListener("click", () => {
      host.openTaskFlow({ mode: "edit_task", taskId: task.id }, Zotero.getMainWindow?.());
    });
    controls.appendChild(editBtn);
    if (!task.completed) {
      const rescheduleMenu = renderRescheduleMenu(doc, task, state, host);
      controls.appendChild(rescheduleMenu);
    }
    if (task.zoteroPdfUri || task.zoteroAnnotationKey) {
      const pdfBtn = createEl(doc, "button", "td-task-pdf", task.zoteroAnnotationKey ? "回到批注" : "打开 PDF");
      pdfBtn.type = "button";
      pdfBtn.addEventListener("click", () => {
        host.openTaskPdf(task).catch((error) => host.showNotice("打开 PDF 失败", String(error)));
      });
      controls.appendChild(pdfBtn);
    }
    return controls;
  }
  function attachTaskCardContextMenu(card, task, host, state) {
    card.addEventListener("contextmenu", (e) => {
      if (e.target && e.target.tagName === "BUTTON") return;
    });
  }

  // src/itemPane/scheduler.ts
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
    await host.tagItemOnTaskEvent(target.key, "complete_check", target.libraryID);
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
        const completed = subtasks.every((st) => st.completed);
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
    await host.tagItemOnTaskEvent(target.key, "complete_check", target.libraryID);
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
      clearTimeout(host._paneUndoTimer);
      host._paneUndoTimer = setTimeout(() => {
        host._paneDeleted = [];
        host.notifyDataChanged();
      }, 8e3);
    } catch (error) {
      delBtn.disabled = false;
      host.showNotice("删除失败", String(error));
      return;
    }
    await host.tagItemOnTaskEvent(target.key, "complete_check", target.libraryID);
    if (host.getPref("autoSyncChildNote", true)) {
      await host.syncTasksToChildNote(target);
    }
    state?.refresh?.();
  }
  async function handleUndoDelete(host, target, undoBtn, state) {
    if (undoBtn.disabled) return;
    undoBtn.disabled = true;
    try {
      const restored = host._paneDeleted;
      await host.saveData({ taskChanges: { added: restored } });
      host._paneDeleted = [];
      clearTimeout(host._paneUndoTimer);
      for (const task of restored) {
        await host.tagItemOnTaskEvent(task.zoteroItemKey, "complete_check", task.zoteroLibraryID);
      }
      if (host.getPref("autoSyncChildNote", true)) {
        await host.syncTasksToChildNote(target);
      }
      state?.refresh?.();
    } catch (error) {
      undoBtn.disabled = false;
      host.showNotice("恢复失败", String(error));
    }
  }
  function renderTaskList(doc, tasks, target, host, state) {
    const taskList = createEl(doc, "div", "td-task-list");
    const showSubtasks = host.getPref("itemPaneShowSubtasks", true);
    for (const t of tasks) {
      const taskCard = createEl(doc, "div", `td-task-card ${t.completed ? "is-completed" : ""}`);
      taskCard.dataset.taskId = t.id;
      makeTaskCardDraggable(taskCard, t, host);
      attachTaskCardContextMenu(taskCard, t, host, state);
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
      checkbox.addEventListener("change", (e) => {
        e.stopPropagation();
        handleTaskToggle(host, target, t, checkbox, state);
      });
      row.appendChild(checkbox);
      const titleSpan = createEl(doc, "button", `td-task-title ${t.completed ? "is-done" : ""}`, t.title);
      titleSpan.type = "button";
      titleSpan.title = `${t.title} (点击在看板中查看详情)`;
      titleSpan.addEventListener("click", () => {
        host.openTaskFlow({ mode: "view_task", taskId: t.id }, Zotero.getMainWindow?.());
      });
      row.appendChild(titleSpan);
      const delBtn = createEl(doc, "button", "td-task-delete", "移除");
      delBtn.type = "button";
      delBtn.setAttribute("aria-label", `从 TaskFlow 移除任务并保留 Zotero 文献：${t.title}`);
      delBtn.title = "仅移除此 TaskFlow 任务，不删除 Zotero 文献";
      delBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleTaskDelete(host, target, t, delBtn, state);
      });
      row.appendChild(delBtn);
      taskCard.appendChild(row);
      const controls = renderTaskControls(doc, t, target, host, state);
      let subList = null;
      if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
        const doneSubs = t.subtasks.filter((s) => s.completed).length;
        const subToggle = createEl(doc, "button", "td-subtask-toggle", `子任务 ${doneSubs}/${t.subtasks.length}`);
        subToggle.type = "button";
        subToggle.title = "展开/收起子任务清单";
        const expanded = state?.expandedTasks.get(t.id) ?? showSubtasks;
        subToggle.setAttribute("aria-expanded", String(expanded));
        controls.appendChild(subToggle);
        subList = createEl(doc, "div", "td-subtask-list");
        if (!expanded) subList.style.display = "none";
        subToggle.addEventListener("click", (e) => {
          e.stopPropagation();
          const isHidden = subList.style.display === "none";
          subList.style.display = isHidden ? "flex" : "none";
          subToggle.setAttribute("aria-expanded", String(isHidden));
          state?.expandedTasks.set(t.id, isHidden);
        });
        for (const sub of t.subtasks) {
          const subRow = createEl(doc, "div", "td-subtask-item");
          const subCheck = createEl(doc, "input", "td-checkbox");
          subCheck.type = "checkbox";
          subCheck.setAttribute("aria-label", sub.title);
          subCheck.checked = Boolean(sub.completed);
          subCheck.addEventListener("change", (e) => {
            e.stopPropagation();
            handleSubtaskToggle(host, target, t, sub, subCheck, state);
          });
          const subSpan = createEl(doc, "span", `td-subtask-title ${sub.completed ? "is-done" : ""}`, sub.title);
          subRow.appendChild(subCheck);
          subRow.appendChild(subSpan);
          subList.appendChild(subRow);
        }
      }
      taskCard.appendChild(controls);
      if (subList) taskCard.appendChild(subList);
      taskList.appendChild(taskCard);
    }
    return taskList;
  }
  function renderFallback(doc, target, state, host, fallbackVersion) {
    const fallback = createEl(doc, "div", "td-pane-wrap td-pane-fallback");
    const addButton = createEl(doc, "button", "td-add-reading", "＋ 添加到论文研读");
    addButton.type = "button";
    addButton.disabled = !target || Boolean(state?.saving);
    addButton.setAttribute("aria-label", "添加到论文研读");
    addButton.title = target ? "创建关联当前文献的研读待办，默认一周后截止" : "请先在 Zotero 文献库中选中一篇文献";
    addButton.addEventListener("click", async () => {
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
    });
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
            locate.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              host.locateLiteratureItem(task.zoteroUri || task.zoteroItemKey, task.zoteroLibraryID, Zotero.getMainWindow?.()).catch((error) => host.showNotice("无法跳转文献", String(error)));
            });
            taskRow.append(title, locate);
            row.appendChild(taskRow);
            fallbackTaskList.appendChild(row);
          }
        } else {
          fallbackTaskList.appendChild(createEl(doc, "div", "td-add-hint", "当前文献还没有关联的研读待办。"));
        }
      };
      const matchesTarget = (task) => task.zoteroItemKey === target.key && (task.zoteroLibraryID || Zotero.Libraries.userLibraryID) === target.libraryID;
      renderFallbackTasks((host._cachedData?.tasks || []).filter(matchesTarget));
      if (!host._cachedData) {
        host.loadData().then((data) => {
          if (state && state.renderVersion !== fallbackVersion) return;
          if (doc.querySelector(".td-pane-fallback") !== fallback) return;
          renderFallbackTasks((data.tasks || []).filter(matchesTarget));
        }).catch((error) => {
          if (state && state.renderVersion !== fallbackVersion) return;
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

  // src/itemPane/index.ts
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
            const state = {
              itemKey: target?.key || null,
              libraryID: target?.libraryID || null,
              renderVersion: 0,
              quickDraft: "",
              quickPriority: null,
              expandedTasks: /* @__PURE__ */ new Map(),
              saving: false,
              refresh,
              onDataChanged: () => {
                Promise.resolve(refresh?.()).catch((err) => {
                  Zotero.logError?.("[TaskFlow] ItemPane refresh failed: " + err);
                });
              }
            };
            host.registerDataListener(state.onDataChanged);
            sectionStates.set(body, state);
          },
          onDestroy: ({ body }) => {
            const state = sectionStates.get(body);
            if (state) state.renderVersion++;
            if (state?.onDataChanged) {
              host.unregisterDataListener(state.onDataChanged);
            }
            sectionStates.delete(body);
          },
          onItemChange: ({ body, item, setEnabled }) => {
            const target = getLiteratureItem(item) || getLiteratureItem(Zotero.getMainWindow?.()?.ZoteroPane?.getSelectedItems?.()?.[0]);
            const state = sectionStates.get(body);
            if (state) {
              if (state.itemKey !== target?.key || state.libraryID !== target?.libraryID) {
                state.profileID = null;
                state.quickDraft = "";
                state.quickPriority = null;
                state.expandedTasks.clear();
              }
              state.itemKey = target?.key || null;
              state.libraryID = target?.libraryID || null;
              state.renderVersion++;
            }
            setEnabled(Boolean(target));
          },
          onRender: ({ body, item, setSectionSummary }) => {
            if (!body) return;
            const document = body.ownerDocument;
            const target = getLiteratureItem(item) || getLiteratureItem(Zotero.getMainWindow?.()?.ZoteroPane?.getSelectedItems?.()?.[0]);
            const state = sectionStates.get(body);
            setSectionSummary?.("文献研读待办");
            body.replaceChildren();
            const fallbackVersion = state ? ++state.renderVersion : 0;
            const fallback = renderFallback(document, target, state, host, fallbackVersion);
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
            let data;
            try {
              data = await host.loadData();
            } catch (error) {
              if (state && renderVersion !== state.renderVersion) return;
              body.appendChild(createEl(document, "div", "td-add-hint", "待办数据读取失败，请重新选择条目后重试。"));
              Zotero.logError?.("[TaskFlow] ItemPane data load failed: " + error);
              return;
            }
            if (state && renderVersion !== state.renderVersion) return;
            body.replaceChildren();
            const targetKey = target.key;
            const tasks = (data.tasks || []).filter(
              (t) => t.zoteroItemKey === targetKey && (t.zoteroLibraryID || Zotero.Libraries.userLibraryID) === target.libraryID
            );
            const uncompletedTasks = tasks.filter((t) => !t.completed);
            const total = tasks.length;
            const done = total - uncompletedTasks.length;
            const pct = total > 0 ? Math.round(done / total * 100) : 0;
            setSectionSummary?.(total ? `${total} 项待办 · ${done}/${total} 完成` : "展开后快速新建");
            const wrapper = createEl(document, "div", "td-pane-wrap");
            setupPaneDragAndDrop(wrapper, target, host, state);
            const showProgressBar = host.getPref("itemPaneShowProgressBar", true);
            wrapper.appendChild(renderHeaderCard(document, total, done, pct, showProgressBar));
            for (const el of renderQuickAddSection(document, target, host, state, uncompletedTasks)) {
              wrapper.appendChild(el);
            }
            const profile = renderProfileSection(document, tasks, host, state);
            wrapper.appendChild(profile.box);
            if (total === 0) {
              wrapper.appendChild(renderEmptyCard(document, target, host, state, profile.select));
            }
            if (total > 0) {
              wrapper.appendChild(renderTaskList(document, tasks, target, host, state));
            }
            if (host._paneDeleted?.length) {
              const undoBtn = createEl(document, "button", "td-subtask-toggle", "撤销删除（8 秒内）");
              undoBtn.type = "button";
              undoBtn.addEventListener("click", () => {
                handleUndoDelete(host, target, undoBtn, state);
              });
              wrapper.appendChild(undoBtn);
            }
            wrapper.appendChild(renderActionGrid(document, target, total, host, state, profile.select));
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
  if (typeof globalThis !== "undefined") {
    globalThis.TaskFlowItemPane = TaskFlowItemPane;
  }

  // src/itemPane.ts
  if (typeof Zotero !== "undefined") {
    Zotero.TaskFlowItemPane = TaskFlowItemPane;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.TaskFlowItemPane = TaskFlowItemPane;
  }

  // src/modules/base.ts
  var TaskFlowBase = class {
    rootURI = typeof rootURI !== "undefined" ? rootURI : "";
    addonId = ADDON_ID;
    localizedDocs = /* @__PURE__ */ new Set();
    _cachedData = null;
    _dataListeners = /* @__PURE__ */ new Set();
    _saveQueue = Promise.resolve();
    _saveScheduled = null;
    _lastSavedData = null;
    _expectedTasksGeneration = 0;
    _cleaners = /* @__PURE__ */ new Set();
    _standaloneDeliveryTimers = /* @__PURE__ */ new Set();
    _themeObserverAttached = false;
    _notifierID = null;
    _readerHookAttached = false;
    _readerInitHook = null;
    itemPaneSectionID = null;
    recordDiagnostic(record) {
      const entry = {
        time: (/* @__PURE__ */ new Date()).toISOString(),
        version: typeof version !== "undefined" ? version : "unknown",
        action: String(record?.action || "unknown").slice(0, 160),
        message: String(record?.message || "").slice(0, 2e3),
        cause: String(record?.cause || "").slice(0, 2e3),
        stack: String(record?.stack || "").slice(0, 8e3),
        page: String(record?.page || "").slice(0, 300)
      };
      const run = async () => {
        const file = PathUtils.join(Zotero.DataDirectory?.dir || PathUtils.profileDir, "taskflow-debug.json");
        if (!this._diagnosticRecords) {
          try {
            let existing = null;
            if (await IOUtils.exists(file)) {
              existing = JSON.parse(await IOUtils.readUTF8(file));
            }
            this._diagnosticRecords = Array.isArray(existing) ? existing.slice(-49) : [];
          } catch (_) {
            this._diagnosticRecords = [];
          }
        }
        this._diagnosticRecords.push(entry);
        this._diagnosticRecords = this._diagnosticRecords.slice(-50);
        await IOUtils.writeUTF8(file, JSON.stringify(this._diagnosticRecords, null, 2), { tmpPath: file + ".tmp" });
      };
      const result = (this._diagnosticQueue || Promise.resolve()).then(run);
      this._diagnosticQueue = result.catch((error) => Zotero.logError?.("[TaskFlow] Diagnostic log write failed: " + error));
      return this._diagnosticQueue;
    }
    ensureLocalization(doc) {
      if (!doc || this.localizedDocs.has(doc)) return;
      const existing = doc.querySelector('link[rel="localization"][href="taskflow.ftl"]') || doc.querySelector('link[rel="localization"][href="todolist.ftl"]');
      if (existing) return;
      try {
        doc.defaultView?.MozXULElement?.insertFTLIfNeeded("taskflow.ftl");
        if (doc.querySelector('link[rel="localization"][href="taskflow.ftl"]') || doc.querySelector('link[rel="localization"][href="todolist.ftl"]')) {
          this.localizedDocs.add(doc);
        }
      } catch (error) {
        Zotero.logError?.("[TaskFlow] Could not load translations: " + error);
      }
    }
    ensureItemPaneStyles(doc) {
      if (typeof Zotero !== "undefined" && Zotero.TaskFlowItemPane?.ensureItemPaneStyles) {
        return Zotero.TaskFlowItemPane.ensureItemPaneStyles(doc);
      }
      if (typeof TaskFlowItemPane !== "undefined" && TaskFlowItemPane.ensureItemPaneStyles) {
        return TaskFlowItemPane.ensureItemPaneStyles(doc);
      }
    }
    getPref(key, defaultVal) {
      try {
        if (Zotero.Prefs) {
          const tfVal = Zotero.Prefs.get(`extensions.taskflow.${key}`, true);
          if (tfVal !== void 0) return tfVal;
        }
      } catch (_) {
      }
      return defaultVal;
    }
    setPref(key, val) {
      try {
        if (Zotero.Prefs) {
          Zotero.Prefs.set(`extensions.taskflow.${key}`, val, true);
        }
      } catch (_) {
      }
    }
    showNotice(headline, description = "", timeout = 4e3) {
      try {
        const progress = new Zotero.ProgressWindow({ closeOnClick: true });
        progress.changeHeadline(headline);
        if (description) progress.addDescription(description);
        progress.show();
        progress.startCloseTimer(timeout);
        return true;
      } catch (e) {
        Zotero.log?.(`[TaskFlow] Notice: ${headline} - ${description}`);
        return false;
      }
    }
    getHostTheme() {
      try {
        return Zotero.getMainWindow?.()?.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      } catch (_) {
        return "light";
      }
    }
  };

  // src/taskRules.ts
  var TaskRules = {
    applyCollectionChanges(current, next, patch) {
      for (const [key, command] of [["customTags", "customTagChanges"], ["customTemplates", "customTemplateChanges"]]) {
        const changes = patch[command];
        delete next[command];
        if (!changes) continue;
        const { added = [], deleted = [] } = changes;
        if (!Array.isArray(added) || !Array.isArray(deleted) || deleted.some((id) => typeof id !== "string")) throw new Error("标签或模板修改格式无效");
        const removed = new Set(deleted);
        const entries = (current[key] || []).filter((entry) => !removed.has(entry.id));
        const ids = new Set(entries.map((entry) => entry.id));
        for (const entry of added) {
          if (!entry || typeof entry.id !== "string" || !entry.id || typeof entry.name !== "string" || !entry.name.trim()) throw new Error("标签或模板内容无效");
          if (key === "customTemplates" && (!entry.task || typeof entry.task.title !== "string" || !entry.task.title.trim())) throw new Error("模板标题不能为空");
          if (!ids.has(entry.id)) {
            entries.push(entry);
            ids.add(entry.id);
          }
        }
        next[key] = entries;
      }
      delete next.searchHistoryAdd;
      if (patch.searchHistoryAdd != null) {
        const query = patch.searchHistoryAdd;
        if (typeof query !== "string" || query.trim().length < 2) throw new Error("搜索记录无效");
        next.searchHistory = [query.trim(), ...(current.searchHistory || []).filter((value) => value !== query.trim())].slice(0, 10);
      }
    },
    applyTaskGeneration(current, next, patch) {
      if (patch.expectedTasksGeneration != null && patch.expectedTasksGeneration !== (current.tasksGeneration || 0)) {
        throw new Error("任务已被清空或替换，请重新加载后重试");
      }
      delete next.expectedTasksGeneration;
      if (patch.tasks) next.tasksGeneration = (current.tasksGeneration || 0) + 1;
    },
    reminderFingerprint(task) {
      return JSON.stringify([
        task.dueDate,
        task.dueTime || "23:59",
        task.reminder?.enabled,
        task.reminder?.before ?? 15
      ]);
    },
    reminderIsDue(task, now) {
      if (!task || task.completed || !task.reminder?.enabled || task.reminder.notified || !task.dueDate) return false;
      const due = (/* @__PURE__ */ new Date(task.dueDate + "T" + (task.dueTime || "23:59"))).getTime();
      const before = Number(task.reminder.before ?? 15);
      return Number.isFinite(due) && Number.isFinite(before) && before >= 0 && now >= due - before * 6e4 && now <= due + 864e5;
    },
    // Reserve notification delivery in the same queue as task writes. Leases recover after a crashed window.
    applyNotificationAction(data, action) {
      if (!action) return null;
      const { type, kind, token, now, key } = action;
      if (!["claim", "validate", "ack", "release"].includes(type) || !["reminders", "summary"].includes(kind) || typeof token !== "string" || !token || !Number.isFinite(now)) throw new Error("提醒请求无效");
      const leases = data.notificationLeases = { ...data.notificationLeases };
      const result = { tasks: [], summary: false };
      if (type === "claim") {
        for (const [id, lease] of Object.entries(leases)) if (lease.expiresAt <= now) delete leases[id];
      }
      if (type !== "claim") {
        const lease = leases[key];
        if (!lease || lease.token !== token) return result;
        if (type === "validate") {
          const date = new Date(now);
          const today = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
          ].join("-");
          const task = kind === "reminders" ? data.tasks.find((t) => "task:" + t.id === key) : null;
          const valid = lease.expiresAt > now && (kind === "summary" ? key === "summary:" + today && lease.date === today && data.settings?.dailySummary && (data.settings.summaryTime || "09:00") === lease.time && data.lastSummaryDate !== today : this.reminderIsDue(task, now) && this.reminderFingerprint(task) === lease.fingerprint);
          if (!valid) {
            delete leases[key];
            return result;
          }
          lease.expiresAt = now + 6e4;
          if (kind === "summary") {
            result.summary = true;
            result.key = key;
          } else result.tasks.push({ task: JSON.parse(JSON.stringify(task)), key });
          return result;
        }
        if (type === "ack") {
          if (kind === "summary") data.lastSummaryDate = lease.date;
          else {
            const task = data.tasks.find((t) => "task:" + t.id === key);
            if (task && this.reminderFingerprint(task) === lease.fingerprint) {
              task.reminder = { ...task.reminder, notified: true, notifiedFor: lease.fingerprint };
            }
          }
        }
        delete leases[key];
        return result;
      }
      if (kind === "summary") {
        const date = new Date(now);
        const today = [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0")
        ].join("-");
        const time = String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
        const leaseKey = "summary:" + today;
        if (data.settings?.dailySummary && (data.settings.summaryTime || "09:00") === time && data.lastSummaryDate !== today && !leases[leaseKey]) {
          leases[leaseKey] = { token, date: today, time, expiresAt: now + 6e4 };
          result.summary = true;
          result.key = leaseKey;
        }
        return result;
      }
      for (const task of data.tasks) {
        if (!this.reminderIsDue(task, now)) continue;
        const leaseKey = "task:" + task.id;
        const fingerprint = this.reminderFingerprint(task);
        if (leases[leaseKey]?.fingerprint === fingerprint) continue;
        leases[leaseKey] = { token, fingerprint, expiresAt: now + 6e4 };
        result.tasks.push({ task: JSON.parse(JSON.stringify(task)), key: leaseKey });
      }
      return result;
    },
    // Run inside the storage write queue, against the latest committed snapshot.
    applyTimerAction(data, action) {
      if (!action) return;
      const { type, taskId, timer, startTime, stoppedAt, sessionId } = action;
      if (!["start", "stop"].includes(type)) throw new Error("计时操作无效");
      const task = data.tasks.find((t) => t.id === taskId);
      data.activeTimers = Object.assign(/* @__PURE__ */ Object.create(null), data.activeTimers);
      if (type === "start") {
        if (!timer || !Number.isFinite(timer.startTime)) throw new Error("计时数据无效");
        if (task && !data.activeTimers[taskId]) data.activeTimers[taskId] = timer;
      } else {
        const active = data.activeTimers[taskId];
        if (!active || active.startTime !== startTime || active.sessionId !== sessionId) return;
        if (!Number.isFinite(stoppedAt)) throw new Error("停止时间无效");
        if (task) task.timeEntries = [...task.timeEntries || [], {
          date: new Date(stoppedAt).toISOString(),
          duration: Math.max(0, stoppedAt - startTime)
        }];
        delete data.activeTimers[taskId];
      }
    },
    prepareImport(current, payload, mode) {
      if (!["merge", "replace"].includes(mode)) throw new Error("导入模式无效");
      const source = Array.isArray(payload) ? { tasks: payload } : payload;
      if (!source || !Array.isArray(source.tasks)) throw new Error("无效的数据格式：缺少任务数组");
      const tasks = JSON.parse(JSON.stringify(source.tasks));
      const ids = /* @__PURE__ */ new Set();
      for (const task of tasks) {
        if (!task || typeof task.id !== "string" || !task.id.trim() || ids.has(task.id) || typeof task.title !== "string" || !task.title.trim() || typeof task.completed !== "boolean") {
          throw new Error("备份包含无效或重复任务，未导入任何数据");
        }
        ids.add(task.id);
        for (const key of ["description", "category", "zoteroItemTitle"]) {
          if (task[key] != null && typeof task[key] !== "string") throw new Error("任务文本格式无效：" + key);
        }
        if (task.dueDate && !this.nextDueDate(task.dueDate, "daily")) throw new Error("截止日期无效");
        if (task.dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(task.dueTime)) throw new Error("截止时间无效");
        if (task.reminder != null && (typeof task.reminder !== "object" || Array.isArray(task.reminder))) {
          throw new Error("提醒格式无效");
        }
        for (const key of ["subtasks", "tags", "timeEntries"]) {
          if (task[key] != null && !Array.isArray(task[key])) throw new Error("任务字段格式无效：" + key);
        }
        const subIds = /* @__PURE__ */ new Set();
        task.subtasks = (task.subtasks || []).map((st, index) => {
          if (!st || typeof st.title !== "string" || !st.title.trim()) throw new Error("子任务格式无效");
          const id = st.id || task.id + "_sub_" + index;
          if (typeof id !== "string" || subIds.has(id)) throw new Error("子任务标识无效或重复");
          subIds.add(id);
          return { ...st, id, completed: Boolean(st.completed) };
        });
        task.tags = task.tags || [];
        if (task.tags.some((tag) => typeof tag !== "string")) throw new Error("任务标签格式无效");
        if ((task.timeEntries || []).some((entry) => !entry || !Number.isFinite(entry.duration) || entry.duration < 0 || !Number.isFinite(Date.parse(entry.date)))) throw new Error("计时历史格式无效");
        task.title = task.title.trim();
        task.status = task.completed ? "done" : task.status === "in-progress" ? "in-progress" : "todo";
        if (!task.completed) task.completedAt = null;
        if (task.completed) task.subtasks.forEach((st) => {
          st.completed = true;
        });
      }
      if (source.settings != null && (typeof source.settings !== "object" || Array.isArray(source.settings))) {
        throw new Error("设置格式无效");
      }
      const patch = {};
      const existingIds = new Set(current.tasks.map((t) => t.id));
      const added = tasks.filter((t) => !existingIds.has(t.id));
      if (mode === "replace") {
        patch.tasks = tasks;
        patch.settings = source.settings || {};
        patch.replaceSettings = true;
        patch.activeTimers = {};
        patch.searchHistory = Array.isArray(source.searchHistory) ? source.searchHistory : [];
      } else patch.taskChanges = { added };
      for (const key of ["customTags", "customTemplates"]) {
        if (source[key] != null && !Array.isArray(source[key])) throw new Error("标签或模板格式无效");
        const entries = JSON.parse(JSON.stringify(source[key] || []));
        const seen = /* @__PURE__ */ new Set();
        for (const entry of entries) {
          if (!entry || typeof entry.id !== "string" || !entry.id || seen.has(entry.id) || typeof entry.name !== "string" || !entry.name.trim() || key === "customTemplates" && (!entry.task || typeof entry.task !== "object" || Array.isArray(entry.task))) {
            throw new Error("标签或模板内容无效或重复");
          }
          seen.add(entry.id);
          if (key === "customTemplates") {
            if (typeof entry.task.title !== "string" || !entry.task.title.trim()) throw new Error("模板标题不能为空");
            if (entry.task.subtasks != null && (!Array.isArray(entry.task.subtasks) || entry.task.subtasks.some((st) => !st || typeof st.title !== "string"))) throw new Error("模板子任务格式无效");
            entry.task.subtasks = entry.task.subtasks || [];
          }
        }
        if (mode === "replace") patch[key] = entries;
        else if (source[key]) {
          const existing = current[key] || [];
          const existingIds2 = new Set(existing.map((t) => t.id));
          patch[key] = [...existing, ...entries.filter((t) => !existingIds2.has(t.id))];
        }
      }
      if (source.searchHistory != null && (!Array.isArray(source.searchHistory) || source.searchHistory.some((query) => typeof query !== "string"))) throw new Error("搜索历史格式无效");
      return { patch, imported: mode === "replace" ? tasks.length : added.length };
    },
    nextDueDate(value, pattern) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
      const [year, month, day] = value.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
      const days = { daily: 1, weekly: 7, biweekly: 14 }[pattern];
      const months = { monthly: 1, quarterly: 3, yearly: 12 }[pattern];
      if (days) date.setDate(date.getDate() + days);
      else if (months) {
        date.setDate(1);
        date.setMonth(date.getMonth() + months);
        date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
      } else return null;
      return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    },
    buildNextTask(task, tasks, generateId) {
      if (!task.completed || !task.repeat || task.recurringGenerated) return null;
      const dueDate = this.nextDueDate(task.dueDate, task.repeat);
      if (!dueDate) return null;
      if (tasks.some((t) => t.recurringFrom === task.id || t.title === task.title && t.repeat === task.repeat && t.dueDate === dueDate && t.zoteroItemKey === task.zoteroItemKey && t.zoteroLibraryID === task.zoteroLibraryID)) return null;
      task.recurringGenerated = true;
      return {
        ...JSON.parse(JSON.stringify(task)),
        id: generateId(),
        dueDate,
        completed: false,
        completedAt: null,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        status: "todo",
        order: Math.max(-1, ...tasks.map((t) => t.order || 0)) + 1,
        timeEntries: [],
        recurringFrom: task.id,
        recurringGenerated: false,
        reminder: { ...task.reminder, notified: false },
        subtasks: (task.subtasks || []).map((st) => ({ ...st, id: generateId(), completed: false }))
      };
    }
  };
  if (typeof globalThis !== "undefined" && !globalThis.TaskRules) {
    globalThis.TaskRules = TaskRules;
  }

  // src/modules/storagePersistence.ts
  var TaskFlowStoragePersistence = class extends TaskFlowBase {
    getDataFilePath() {
      const baseDir = Zotero.DataDirectory?.dir || PathUtils.profileDir;
      return PathUtils.join(baseDir, "taskflow-data.json");
    }
    localDateString(date) {
      return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    }
    cloneData(data) {
      if (!data) return data;
      if (typeof structuredClone === "function") {
        try {
          return structuredClone(data);
        } catch (_) {
        }
      }
      return JSON.parse(JSON.stringify(data));
    }
    async loadData() {
      if (this._cachedData) return this.cloneData(this._cachedData);
      if (!this._loadPromise) this._loadPromise = this.readDataFile();
      try {
        return this.cloneData(await this._loadPromise);
      } finally {
        this._loadPromise = null;
      }
    }
    async readDataFile() {
      const filePath = this.getDataFilePath();
      try {
        let data = null;
        if (await IOUtils.exists(filePath)) {
          data = JSON.parse(await IOUtils.readUTF8(filePath));
        }
        if (data) {
          if (!Array.isArray(data.tasks)) throw new Error("任务数据格式无效");
          const seen = /* @__PURE__ */ new Set();
          data.tasks = data.tasks.filter((t) => t && t.id && !seen.has(t.id) && seen.add(t.id));
          this._cachedData = data;
        } else {
          this._cachedData = { tasks: [], settings: {
            defaultView: "list",
            showCompleted: true,
            sortOrder: "dueDate",
            theme: this.getPref("theme", "zotero"),
            defaultDueDays: this.getPref("defaultDueDays", 7),
            readingProfile: this.getPref("readingProfile", "general"),
            dailySummary: false,
            summaryTime: "09:00"
          }, customTags: [] };
        }
        return this._cachedData;
      } catch (error) {
        Zotero.logError?.("[TaskFlow] 数据读取失败，保留原文件: " + error);
        this.recordDiagnostic({ action: "读取待办数据", message: String(error?.message || error), stack: error?.stack });
        throw error;
      }
    }
    async saveData(data) {
      const request = this.cloneData(data);
      const run = async () => {
        const current = await this.loadData();
        const prepared = request.importRequest ? TaskRules.prepareImport(current, request.importRequest.payload, request.importRequest.mode) : null;
        const patch = prepared ? { ...prepared.patch, syncLinkedItems: request.syncLinkedItems } : request;
        const next = { ...current, ...patch };
        TaskRules.applyTaskGeneration(current, next, patch);
        TaskRules.applyCollectionChanges(current, next, patch);
        delete next.syncLinkedItems;
        if (patch.settings) next.settings = patch.replaceSettings ? patch.settings : { ...current.settings, ...patch.settings };
        delete next.replaceSettings;
        if (patch.taskChanges) {
          const { added = [], updated = [], deleted = [] } = patch.taskChanges;
          const removed = new Set(deleted);
          next.tasks = current.tasks.filter((t) => !removed.has(t.id)).map((t) => {
            const update = updated.find((u) => u.id === t.id);
            if (!update) return t;
            const changes = { ...update.changes };
            if (update.literatureRefresh) {
              if (t.zoteroItemKey !== update.itemKey || (t.zoteroLibraryID || Zotero.Libraries.userLibraryID) !== update.libraryID) return t;
              if (t.title !== update.originalTitle) {
                delete changes.title;
                changes.zoteroAutoTitle = false;
              }
            }
            return { ...t, ...changes, id: t.id };
          });
          for (const task of added) {
            if (next.tasks.some((t) => t.id === task.id)) continue;
            if (patch.deduplicateLiterature && next.tasks.some((t) => LiteratureWorkflow.samePending(
              t,
              task,
              Zotero.Libraries.userLibraryID,
              patch.deduplicateLiterature === "item"
            ))) continue;
            next.tasks.push(task);
          }
          delete next.taskChanges;
        }
        delete next.deduplicateLiterature;
        if (patch.rescheduleTask) {
          const { taskID, days, fromDeadline } = patch.rescheduleTask;
          const task = next.tasks.find((t) => t.id === taskID);
          if (!task) throw new Error("任务已被删除，请刷新后重试");
          if (![0, 3, 7].includes(days)) throw new Error("不支持的改期选项");
          const today = LiteratureWorkflow.dateAfter(0);
          const base = fromDeadline && task.dueDate && task.dueDate > today ? /* @__PURE__ */ new Date(task.dueDate + "T12:00:00") : /* @__PURE__ */ new Date();
          next.tasks = next.tasks.map((t) => t.id === taskID ? {
            ...t,
            dueDate: LiteratureWorkflow.dateAfter(days, base),
            reminder: { ...t.reminder, notified: false }
          } : t);
        }
        delete next.rescheduleTask;
        if (patch.activeTimerChanges) {
          next.activeTimers = { ...current.activeTimers };
          for (const [id, timer] of Object.entries(patch.activeTimerChanges)) {
            if (timer) next.activeTimers[id] = timer;
            else delete next.activeTimers[id];
          }
          delete next.activeTimerChanges;
        }
        TaskRules.applyTimerAction(next, patch.timerAction);
        delete next.timerAction;
        const notificationResult = TaskRules.applyNotificationAction(next, patch.notificationAction);
        delete next.notificationAction;
        if (patch.taskChanges) {
          for (const task of [...next.tasks]) {
            const was = current.tasks.find((t) => t.id === task.id);
            if (task.completed && !was?.completed) {
              const recurring = TaskRules.buildNextTask(
                task,
                next.tasks,
                () => "task_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10)
              );
              if (recurring) next.tasks.push(recurring);
            }
          }
        }
        const seen = /* @__PURE__ */ new Set();
        next.tasks = next.tasks.filter((t) => t && t.id && !seen.has(t.id) && seen.add(t.id));
        next.tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
        next.revision = (current.revision || 0) + 1;
        const ids = new Set(next.tasks.map((t) => t.id));
        next.activeTimers = Object.fromEntries(Object.entries(next.activeTimers || {}).filter(([id]) => ids.has(id)));
        const filePath = this.getDataFilePath();
        try {
          await IOUtils.writeUTF8(filePath, JSON.stringify(next, null, 2), { tmpPath: filePath + ".tmp" });
        } catch (error) {
          Zotero.logError?.("[TaskFlow] 数据保存失败: " + error);
          this.recordDiagnostic({ action: "保存待办数据", message: String(error?.message || error), stack: error?.stack });
          throw error;
        }
        this._cachedData = next;
        if (patch.tasks) {
          this._paneDeleted = [];
          clearTimeout(this._paneUndoTimer);
        }
        this.notifyDataChanged();
        if (patch.syncLinkedItems) {
          try {
            await this.syncLinkedTaskChanges(current, next);
          } catch (error) {
            Zotero.logError?.("[TaskFlow] 任务已保存，文献联动更新失败: " + error);
          }
        }
        const result2 = this.cloneData(next);
        if (prepared) result2.importResult = { imported: prepared.imported };
        if (notificationResult) result2.notificationResult = notificationResult;
        return result2;
      };
      const result = (this._saveQueue || Promise.resolve()).then(run);
      this._saveQueue = result.catch(() => {
      });
      return result;
    }
    async syncLinkedTaskChanges(before, after) {
      const previous = new Map(before.tasks.map((t) => [t.id, t]));
      const current = new Map(after.tasks.map((t) => [t.id, t]));
      const affected = /* @__PURE__ */ new Map();
      for (const id of /* @__PURE__ */ new Set([...previous.keys(), ...current.keys()])) {
        const oldTask = previous.get(id), newTask = current.get(id);
        if (JSON.stringify(oldTask) === JSON.stringify(newTask)) continue;
        for (const task of [oldTask, newTask]) {
          if (!task?.zoteroItemKey) continue;
          const key = String(task.zoteroLibraryID || Zotero.Libraries.userLibraryID) + ":" + task.zoteroItemKey;
          const onlySubtasks = oldTask && newTask && JSON.stringify({ ...oldTask, subtasks: null }) === JSON.stringify({ ...newTask, subtasks: null });
          affected.set(key, { task, syncNote: affected.get(key)?.syncNote || !onlySubtasks || this.getPref("childNoteAutoUpdateOnSubtask", true) });
        }
      }
      for (const { task, syncNote } of affected.values()) {
        try {
          const libraryID = task.zoteroLibraryID || Zotero.Libraries.userLibraryID;
          const item = this.resolveItemReference(task.zoteroItemKey, libraryID);
          if (!item) continue;
          await this.tagItemOnTaskEvent(task.zoteroItemKey, "complete_check", libraryID);
          if (syncNote && this.getPref("autoSyncChildNote", true)) {
            const note = await this.syncTasksToChildNote(item, null, { silent: true });
            if (!note) Zotero.logError?.("[TaskFlow] 任务已保存，但子笔记未能更新: " + task.zoteroItemKey);
          }
        } catch (error) {
          Zotero.logError?.("[TaskFlow] 任务已保存，文献联动更新失败: " + task.zoteroItemKey + ": " + error);
        }
      }
    }
    async updateTaskState(id, change) {
      const data = await this.loadData();
      const task = data.tasks.find((t) => t.id === id);
      if (!task) return null;
      const changes = typeof change === "function" ? change(task) : change;
      await this.saveData({ taskChanges: { updated: [{ id, changes }] }, expectedTasksGeneration: data.tasksGeneration || 0 });
      return task;
    }
    registerDataListener(listener) {
      this._dataListeners.add(listener);
    }
    unregisterDataListener(listener) {
      this._dataListeners.delete(listener);
    }
    notifyDataChanged() {
      for (const win of injectedElements.keys()) {
        try {
          if (!win.closed) this.updateToolbarBadge(win.document, this._cachedData);
        } catch (error) {
          Zotero.logError?.("[TaskFlow] Toolbar count refresh failed: " + error);
        }
      }
      for (const client of this._uiClients || []) {
        try {
          if (client.closed) {
            this._uiClients.delete(client);
            continue;
          }
          client.postMessage({ type: "TASKFLOW_DATA_CHANGED", data: this.cloneData(this._cachedData) }, "*");
        } catch (_) {
          this._uiClients.delete(client);
        }
      }
      for (const listener of this._dataListeners) {
        try {
          listener(this.cloneData(this._cachedData));
        } catch (e) {
          Zotero.logError?.("[TaskFlow] Error in data listener: " + e);
        }
      }
    }
  };

  // src/modules/storage.ts
  var TaskFlowStorage = class extends TaskFlowStoragePersistence {
    async exportData(format = "json") {
      try {
        const data = await this.loadData();
        const fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
        const win = Zotero.getMainWindow?.() || (typeof Services !== "undefined" ? Services.wm?.getMostRecentWindow?.("navigator:browser") : null);
        const titleMap = {
          json: "导出 TaskFlow JSON 备份",
          csv: "导出 TaskFlow CSV 表格 (Excel 兼容)",
          markdown: "导出 TaskFlow Markdown 清单",
          txt: "导出 TaskFlow 纯文本清单"
        };
        fp.init(win, titleMap[format] || "导出 TaskFlow 数据", Ci.nsIFilePicker.modeSave);
        const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        if (format === "json") {
          fp.appendFilter("JSON Files (*.json)", "*.json");
          fp.defaultString = `taskflow-backup-${dateStr}.json`;
        } else if (format === "csv") {
          fp.appendFilter("CSV Files (*.csv)", "*.csv");
          fp.defaultString = `taskflow-tasks-${dateStr}.csv`;
        } else if (format === "markdown") {
          fp.appendFilter("Markdown Files (*.md)", "*.md");
          fp.defaultString = `taskflow-tasks-${dateStr}.md`;
        } else {
          fp.appendFilter("Text Files (*.txt)", "*.txt");
          fp.defaultString = `taskflow-tasks-${dateStr}.txt`;
        }
        const res = await new Promise((resolve) => fp.open(resolve));
        if (res === Ci.nsIFilePicker.returnOK || res === Ci.nsIFilePicker.returnReplace) {
          const filePath = fp.file.path;
          let content = "";
          const tasks = data.tasks || [];
          if (format === "json") {
            content = JSON.stringify(data, null, 2);
          } else if (format === "csv") {
            const escapeCsv = (str) => {
              let text = String(str ?? "");
              if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
              return `"${text.replace(/"/g, '""')}"`;
            };
            const headers = ["标题", "学术分类", "状态", "优先级", "截止日期", "时间", "关联文献", "文献年份", "PDF链接", "描述", "创建时间", "完成时间"];
            const rows = tasks.map((t) => [
              escapeCsv(t.title),
              escapeCsv(t.academicType || t.category || "generic"),
              escapeCsv(t.completed ? "已完成" : "待完成"),
              escapeCsv(t.priority || "medium"),
              escapeCsv(t.dueDate || ""),
              escapeCsv(t.dueTime || ""),
              escapeCsv(t.zoteroItemTitle || ""),
              escapeCsv(t.zoteroYear || ""),
              escapeCsv(t.zoteroPdfUri || ""),
              escapeCsv(t.description || ""),
              escapeCsv(t.createdAt || ""),
              escapeCsv(t.completedAt || "")
            ].join(","));
            content = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
          } else if (format === "markdown") {
            content = `# TaskFlow 学术任务清单
导出时间：${(/* @__PURE__ */ new Date()).toLocaleString()}
总计：${tasks.length} 项 (已完成：${tasks.filter((t) => t.completed).length}，待研读：${tasks.filter((t) => !t.completed).length})

---

`;
            for (const t of tasks) {
              content += `- [${t.completed ? "x" : " "}] **${t.title}**${t.dueDate ? ` (截止: ${t.dueDate})` : ""}
`;
              if (t.academicType) content += `  - 学术类型: ${t.academicType}
`;
              if (t.zoteroItemTitle) content += `  - 关联文献: 《${t.zoteroItemTitle}》${t.zoteroYear ? ` (${t.zoteroYear})` : ""}
`;
              if (t.zoteroPdfUri) content += `  - PDF 伴读链接: [打开 PDF](${t.zoteroPdfUri})
`;
              if (t.description) content += `  - 描述: ${t.description.replace(/\n/g, " ")}
`;
              if (t.subtasks && t.subtasks.length > 0) {
                for (const sub of t.subtasks) {
                  content += `    - [${sub.completed ? "x" : " "}] ${sub.title}
`;
                }
              }
            }
          } else {
            content = `TaskFlow 学术任务清单
导出时间：${(/* @__PURE__ */ new Date()).toLocaleString()}
====================================

`;
            const incomplete = tasks.filter((t) => !t.completed);
            const completed = tasks.filter((t) => t.completed);
            if (incomplete.length > 0) {
              content += `【待完成研读与任务】(${incomplete.length})
`;
              incomplete.forEach((t, i) => {
                content += `${i + 1}. ${t.title}${t.dueDate ? ` [${t.dueDate}]` : ""}
`;
                if (t.zoteroItemTitle) content += `   文献: 《${t.zoteroItemTitle}》
`;
              });
              content += "\n";
            }
            if (completed.length > 0) {
              content += `【已完成任务】(${completed.length})
`;
              completed.forEach((t, i) => {
                content += `${i + 1}. ✓ ${t.title}
`;
              });
            }
          }
          await IOUtils.writeUTF8(filePath, content);
          this.showNotice("导出成功", `已成功导出至：${filePath}`);
          return filePath;
        }
      } catch (err) {
        Zotero.logError?.("[TaskFlow] exportData error: " + err);
        this.recordDiagnostic({ action: "导出待办数据", message: String(err?.message || err), stack: err?.stack });
        this.showNotice("导出失败", String(err.message || err));
      }
      return null;
    }
    async importDataFile(mode = "merge", window = null) {
      try {
        const fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
        const win = window || Zotero.getMainWindow?.() || (typeof Services !== "undefined" ? Services.wm?.getMostRecentWindow?.("navigator:browser") : null);
        fp.init(win, "选择 TaskFlow JSON 备份文件导入", Ci.nsIFilePicker.modeOpen);
        fp.appendFilter("JSON Files (*.json)", "*.json");
        const res = await new Promise((resolve) => fp.open(resolve));
        if (res === Ci.nsIFilePicker.returnOK) {
          const filePath = fp.file.path;
          const rawText = await IOUtils.readUTF8(filePath);
          let importedJson;
          try {
            importedJson = JSON.parse(rawText);
          } catch (pe) {
            throw new Error("所选文件不是合法的 JSON 格式数据");
          }
          const saved = await this.saveData({ importRequest: { payload: importedJson, mode }, syncLinkedItems: true });
          const imported = saved.importResult.imported;
          if (mode === "replace") {
            this._paneDeleted = [];
            clearTimeout(this._paneUndoTimer);
          }
          this.showNotice("导入成功", `已成功导入 ${imported} 个任务与标签数据！`);
          return { success: true, count: imported };
        }
      } catch (err) {
        Zotero.logError?.("[TaskFlow] importDataFile error: " + err);
        this.recordDiagnostic({ action: "导入待办数据", message: String(err?.message || err), stack: err?.stack });
        this.showNotice("导入失败", String(err.message || err));
        return { success: false, error: err.message };
      }
      return { success: false, cancelled: true };
    }
    async clearAllData(window = null) {
      try {
        await this.saveData({
          tasks: [],
          history: [],
          customTags: [],
          customTemplates: [],
          searchHistory: [],
          activeTimers: {},
          syncLinkedItems: true
        });
        this._paneDeleted = [];
        clearTimeout(this._paneUndoTimer);
        this.showNotice("数据已清空", "所有任务、历史记录与自定义标签已安全清空。");
        return true;
      } catch (err) {
        Zotero.logError?.("[TaskFlow] clearAllData error: " + err);
        return false;
      }
    }
    async getTasksSummaryText() {
      const data = await this.loadData();
      const tasks = data.tasks || [];
      const total = tasks.length;
      const completed = tasks.filter((t) => t.completed).length;
      const pending = total - completed;
      const litTasks = tasks.filter((t) => t.zoteroItemKey);
      let summary = `# 📋 TaskFlow 学术任务研读概览
`;
      summary += `生成时间：${(/* @__PURE__ */ new Date()).toLocaleString()}
`;
      summary += `任务总数：${total} 项 | 已完成：${completed} 项 | 进行中：${pending} 项 | 文献关联：${litTasks.length} 篇
`;
      summary += `总体完成率：${total > 0 ? Math.round(completed / total * 100) : 0}%

`;
      if (pending > 0) {
        summary += `### ⏳ 进行中研读待办
`;
        tasks.filter((t) => !t.completed).forEach((t, i) => {
          summary += `${i + 1}. **${t.title}**`;
          if (t.zoteroItemTitle) summary += ` (文献: 《${t.zoteroItemTitle}》)`;
          if (t.dueDate) summary += ` [截止: ${t.dueDate}]`;
          summary += `
`;
        });
        summary += `
`;
      }
      if (completed > 0) {
        summary += `### ✅ 已完成研读精读
`;
        tasks.filter((t) => t.completed).slice(-10).forEach((t, i) => {
          summary += `${i + 1}. ✓ ~~${t.title}~~`;
          if (t.zoteroItemTitle) summary += ` (《${t.zoteroItemTitle}》)`;
          summary += `
`;
        });
      }
      return summary;
    }
    async copyTasksSummary(window = null) {
      try {
        const text = await this.getTasksSummaryText();
        const clipboard = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper);
        clipboard.copyString(text);
        this.showNotice("已复制概览", "学术任务概览已复制到系统剪贴板，可直接粘贴至周报或笔记。");
        return true;
      } catch (err) {
        Zotero.logError?.("[TaskFlow] copyTasksSummary error: " + err);
        return false;
      }
    }
    async printTasks(window = null) {
      try {
        const data = await this.loadData();
        const tasks = data.tasks || [];
        const win = window || Zotero.getMainWindow?.() || Services.wm.getMostRecentWindow("navigator:browser");
        let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>TaskFlow 学术任务清单</title><style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; line-height: 1.5; }
          h1 { font-size: 20px; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 4px; color: #065f46; }
          .meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
          .task-row { display: flex; align-items: baseline; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
          .box { width: 14px; height: 14px; border: 1.5px solid #94a3b8; border-radius: 3px; display: inline-block; }
          .done .box { background: #059669; border-color: #059669; }
          .done .title { text-decoration: line-through; color: #94a3b8; }
          .title { font-weight: 600; font-size: 14px; }
          .lit { font-size: 12px; color: #2563eb; background: #eff6ff; padding: 1px 6px; border-radius: 4px; }
          .date { font-size: 11px; color: #d97706; margin-left: auto; }
          @media print { body { padding: 0; } }
        </style></head><body>`;
        html += `<h1>TaskFlow 学术日程与研读清单</h1>`;
        html += `<div class="meta">打印时间：${(/* @__PURE__ */ new Date()).toLocaleString()} | 共 ${tasks.length} 项 (已完成：${tasks.filter((t) => t.completed).length})</div>`;
        tasks.forEach((t) => {
          html += `<div class="task-row ${t.completed ? "done" : ""}">
            <span class="box"></span>
            <span class="title">${escapeHtml(t.title || "")}</span>
            ${t.zoteroItemTitle ? `<span class="lit">📖 ${escapeHtml(t.zoteroItemTitle)}</span>` : ""}
            ${t.dueDate ? `<span class="date">📅 ${escapeHtml(t.dueDate)}</span>` : ""}
          </div>`;
        });
        html += `</body></html>`;
        const printWin = win.open("", "_blank", "width=800,height=700");
        if (!printWin || !printWin.document) {
          this.showNotice("打印提示", "无法打开打印窗口，请检查是否被弹窗拦截。");
          return;
        }
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        try {
          printWin.focus();
        } catch (_) {
        }
        setTimeout(() => {
          try {
            printWin.print();
          } catch (_) {
          }
        }, 300);
      } catch (err) {
        Zotero.logError?.("[TaskFlow] printTasks error: " + err);
      }
    }
  };

  // src/modules/literatureTasks.ts
  var TaskFlowLiteratureTasks = class extends TaskFlowStorage {
    async locateLiteratureItem(reference, libraryID, ownerWindow = null) {
      const item = resolveItemReference(reference, libraryID);
      const mainWindow = ownerWindow?.ZoteroPane ? ownerWindow : Zotero.getMainWindow?.();
      if (!item || item.deleted || !mainWindow?.ZoteroPane?.selectItem) {
        this.showNotice("无法跳转文献", "文献可能已被删除，或 Zotero 文献库窗口尚未打开。");
        return false;
      }
      const tabs = mainWindow.Zotero_Tabs;
      const libraryTab = tabs?._tabs?.find((tab) => tab && (tab.type === "library" || tab.id === "zotero-pane"));
      if (libraryTab) tabs.select(libraryTab.id);
      mainWindow.focus?.();
      await mainWindow.ZoteroPane.selectItem(item.id);
      return true;
    }
    async openPdfAttachment(item, page = null, annotationKey = null) {
      if (!item) return;
      const target = (item.isPDFAttachment?.() ? item : getLiteratureItem(item)) || item;
      if (target.deleted) {
        this.showNotice("无法打开 PDF", "文献或附件已在回收站中。");
        return false;
      }
      let pdfAtt = null;
      if (typeof target.isAttachment === "function" && target.isAttachment() && target.isPDFAttachment && target.isPDFAttachment()) {
        pdfAtt = target;
      } else if (typeof target.getAttachments === "function") {
        const attIds = target.getAttachments();
        for (const attId of attIds) {
          const att = Zotero.Items.get(attId);
          if (att && att.isPDFAttachment && att.isPDFAttachment()) {
            pdfAtt = att;
            break;
          }
        }
      }
      if (pdfAtt && Zotero.Reader && typeof Zotero.Reader.open === "function") {
        const location = {};
        if (page && Number.isInteger(Number(page)) && Number(page) > 0) {
          location.pageIndex = Number(page) - 1;
        }
        if (annotationKey) location.annotationID = annotationKey;
        await Zotero.Reader.open(pdfAtt.id, Object.keys(location).length ? location : void 0);
        return true;
      }
      this.showNotice("未找到 PDF", "当前文献没有可打开的 PDF 附件。");
      return false;
    }
    async openTaskPdf(task) {
      const item = resolveItemReference(task.zoteroPdfUri || task.zoteroItemKey, task.zoteroLibraryID);
      if (!item) {
        this.showNotice("无法打开 PDF", "关联的文献或附件已删除。");
        return false;
      }
      if (!this.getPref("pdfReaderJumpPage", true)) return this.openPdfAttachment(item);
      let annotationKey = task.zoteroAnnotationKey || null;
      if (annotationKey) {
        const annotation = resolveItemReference(annotationKey, task.zoteroLibraryID);
        if (!annotation || annotation.deleted || annotation.parentItemID !== item.id) {
          annotationKey = null;
          this.showNotice("批注已不可用", "将返回记录的 PDF 页码。");
        }
      }
      const page = task.zoteroPage || Number(String(task.zoteroPdfUri || "").match(/[?&]page=(\d+)/)?.[1]) || null;
      return this.openPdfAttachment(item, page, annotationKey);
    }
    async createTaskFromAnnotation(reader, annotationKey, { forceInstant = false } = {}) {
      const attachment = Zotero.Items.get(reader.itemID);
      const annotation = resolveItemReference(annotationKey, attachment?.libraryID);
      const parent = getLiteratureItem(attachment);
      if (!parent || !annotation?.isAnnotation?.() || annotation.deleted || annotation.parentItemID !== attachment.id) {
        throw new Error("批注已删除或不属于当前 PDF");
      }
      let position;
      try {
        position = JSON.parse(annotation.annotationPosition || "{}");
      } catch (_) {
        position = {};
      }
      const page = Number.isInteger(position.pageIndex) && position.pageIndex >= 0 ? position.pageIndex + 1 : null;
      const quote = annotation.annotationText || "";
      const title = `批注：${String(annotation.annotationComment || quote || "核查文献批注").slice(0, 60)}`;
      const task = this.buildLiteratureTask(parent, { title, workflowId: `annotation:${annotationKey}` });
      task.zoteroAnnotationKey = annotationKey;
      task.zoteroAttachmentKey = attachment.key;
      task.zoteroPage = page;
      task.zoteroQuote = quote;
      task.description = [quote, annotation.annotationComment].filter(Boolean).join("\n\n");
      const groupID = Zotero.Libraries?.get?.(attachment.libraryID)?.groupID;
      task.zoteroPdfUri = `zotero://open-pdf/${groupID ? "groups/" + groupID : "library"}/items/${attachment.key}?annotation=${annotationKey}${page ? "&page=" + page : ""}`;
      const data = await this.loadData();
      task.order = Math.max(-1, ...data.tasks.map((t) => t.order || 0)) + 1;
      if (!forceInstant && this.getPref("readerShortcutAction", "create_instant") === "open_modal") {
        this.openTaskFlow({ mode: "open_modal_prefill", prefill: task }, Zotero.getMainWindow?.());
        return;
      }
      const saved = await this.saveData({ taskChanges: { added: [task] }, deduplicateLiterature: true, syncLinkedItems: true });
      const created = saved.tasks.some((t) => t.id === task.id);
      this.showNotice(created ? "批注已加入待办" : "该批注已有待办", "点击任务的“回到批注”即可返回原文位置。");
      return saved.tasks.find((t) => LiteratureWorkflow.samePending(t, task, Zotero.Libraries.userLibraryID));
    }
    getZoteroCollections(libraryID = null) {
      const libID = Number.isInteger(Number(libraryID)) && Number(libraryID) > 0 ? Number(libraryID) : Zotero.Libraries?.userLibraryID || 1;
      const collections = Zotero.Collections?.getByLibrary?.(libID) || [];
      return collections.map((col) => ({
        id: col.id,
        key: col.key,
        name: col.name,
        parentID: col.parentID,
        itemCount: typeof col.getChildItemsCount === "function" ? col.getChildItemsCount() : 0
      }));
    }
  };

  // src/modules/literature/literatureMapping.ts
  function buildLiteratureTask(host, item, {
    title = "",
    priority = null,
    academicType = "literature_reading",
    profileID = null,
    dueDate = null,
    workflowId = null
  } = {}) {
    const meta = serializeLiteratureItem(item);
    if (!meta || item.deleted) throw new Error("请先选中文献条目，回收站中的文献无法加入待办");
    const customTitle = String(title).trim();
    const taskTitle = customTitle || `研读：${meta.title}`;
    const generateId = () => "task_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    return {
      id: generateId(),
      title: taskTitle,
      description: `文献研读待办：${meta.title} (${meta.authors} ${meta.year})`,
      dueDate: dueDate || LiteratureWorkflow.dateAfter(LiteratureWorkflow.days(host.getPref("defaultDueDays", 7))),
      dueTime: null,
      priority: priority || host.getPref("defaultPriority", "medium"),
      category: "论文研读",
      academicType,
      status: "todo",
      repeat: null,
      completed: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      completedAt: null,
      subtasks: profileID ? LiteratureWorkflow.steps(profileID, generateId) : [],
      readingProfile: profileID,
      literatureWorkflowId: workflowId || (profileID ? `milestones:${profileID}` : customTitle ? null : "reading"),
      tags: host.getPref("autoTagFromItem", true) ? meta.tags || [] : [],
      reminder: { enabled: false, before: 15, notified: false },
      zoteroItemKey: meta.key,
      zoteroItemID: meta.id,
      zoteroItemTitle: meta.title,
      zoteroAutoTitle: !customTitle,
      zoteroAuthors: meta.authors,
      zoteroLibraryID: meta.libraryID,
      zoteroPublication: meta.publication,
      zoteroYear: meta.year,
      zoteroUri: meta.zoteroUri,
      zoteroPdfUri: meta.pdfUri,
      zoteroLinkStatus: "active"
    };
  }
  function addLiteratureReadingTask(host, item, options = {}) {
    let task;
    try {
      task = buildLiteratureTask(host, item, options);
    } catch (error) {
      return Promise.reject(error);
    }
    const requestKey = JSON.stringify([task.zoteroLibraryID, task.zoteroItemKey, task.title, task.literatureWorkflowId]);
    host._literatureTaskAdds ||= /* @__PURE__ */ new Map();
    if (host._literatureTaskAdds.has(requestKey)) return host._literatureTaskAdds.get(requestKey);
    const run = async () => {
      const data = await host.loadData();
      task.order = Math.max(-1, ...(data.tasks || []).map((t) => t.order || 0)) + 1;
      const saved = await host.saveData({
        taskChanges: { added: [task] },
        deduplicateLiterature: Boolean(task.literatureWorkflowId),
        syncLinkedItems: true
      });
      const actual = saved.tasks.find((t) => t.id === task.id) || saved.tasks.find((t) => LiteratureWorkflow.samePending(t, task, Zotero.Libraries.userLibraryID));
      return { task: actual, created: actual?.id === task.id };
    };
    const result = run().finally(() => host._literatureTaskAdds.delete(requestKey));
    host._literatureTaskAdds.set(requestKey, result);
    return result;
  }
  async function addLiteratureTasks(host, selected) {
    const data = await host.loadData();
    const candidates = selected.map((item, index) => ({
      ...buildLiteratureTask(host, item),
      order: Math.max(-1, ...(data.tasks || []).map((task) => task.order || 0)) + 1 + index
    }));
    const saved = await host.saveData({
      taskChanges: { added: candidates },
      deduplicateLiterature: "item",
      syncLinkedItems: true
    });
    const ids = new Set(saved.tasks.map((task) => task.id));
    const added = candidates.filter((task) => ids.has(task.id)).length;
    const skipped = selected.length - added;
    host.showNotice("批量加入完成", `新增 ${added} 篇，跳过已有待办 ${skipped} 篇；新任务截止 ${candidates[0].dueDate}。`);
    return { added, skipped };
  }
  async function addSelectedLiteratureTasks(host, window = null, items = null) {
    let selected = [];
    if (Array.isArray(items) && items.length) {
      const seen = /* @__PURE__ */ new Set();
      selected = items.map((item) => getLiteratureItem(item)).filter((item) => item && !item.deleted && !seen.has(item.id) && seen.add(item.id));
    } else {
      selected = host.getSelectedRegularItems(window || Zotero.getMainWindow?.()).filter((item) => !item.deleted);
    }
    if (!selected.length) {
      host.showNotice("请先选中文献", "可在文献列表中多选后批量加入。");
      return { added: 0, skipped: 0 };
    }
    return addLiteratureTasks(host, selected);
  }
  async function addDroppedLiteratureTasks(host, itemIDs) {
    if (!host.getPref("dragDropFromLibrary", true)) throw new Error("已关闭从文献库拖入待办");
    if (!Array.isArray(itemIDs) || !itemIDs.length || itemIDs.length > 1e3 || itemIDs.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
      throw new Error("无效的 Zotero 拖拽条目");
    }
    const seen = /* @__PURE__ */ new Set();
    const selected = itemIDs.map((id) => Zotero.Items.get(id)).filter((item) => item && !item.deleted).map((item) => getLiteratureItem(item)).filter((item) => item && !item.deleted && !seen.has(item.id) && seen.add(item.id));
    if (!selected.length) throw new Error("拖入的文献已删除或不包含可研读的文献条目");
    const result = await addLiteratureTasks(host, selected);
    return { ...result, ignored: itemIDs.length - selected.length };
  }
  async function rescheduleLiteratureTask(host, taskID, days, fromDeadline = false) {
    if (![0, 3, 7].includes(days)) throw new Error("不支持的改期选项");
    const data = await host.saveData({ rescheduleTask: { taskID, days, fromDeadline }, syncLinkedItems: true });
    return data.tasks.find((task) => task.id === taskID);
  }

  // src/modules/literature/literaturePlan.ts
  async function createCollectionReadingPlan(host, collection, window = null) {
    if (!collection) return;
    try {
      const items = collection.getChildItems ? collection.getChildItems(false) : [];
      const regularItems = items.map((it) => getLiteratureItem(it)).filter(Boolean);
      if (regularItems.length === 0) {
        host.showNotice("未找到文献", `分类【${collection.name}】中暂无有效文献`);
        return;
      }
      const data = await host.loadData();
      const existingKeys = new Set(
        (data.tasks || []).filter((t) => t.zoteroItemKey).map((t) => (t.zoteroLibraryID || Zotero.Libraries.userLibraryID) + ":" + t.zoteroItemKey)
      );
      let addedCount = 0;
      const addedTasks = [];
      for (const item of regularItems) {
        if (existingKeys.has(item.libraryID + ":" + item.key)) continue;
        const meta = serializeLiteratureItem(item);
        const taskId = "task_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
        const mainTask = {
          id: taskId,
          title: `📖 研读：${meta.title}`,
          description: `分类专题：${collection.name}
作者：${meta.authors} (${meta.year})
出版物：${meta.publication}
文献链接：${meta.zoteroUri}`,
          dueDate: LiteratureWorkflow.dateAfter(LiteratureWorkflow.days(host.getPref("defaultDueDays", 7))),
          dueTime: null,
          priority: host.getPref("defaultPriority", "medium"),
          category: "论文研读",
          completed: false,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          completedAt: null,
          tags: [collection.name, "专题研读", "待研读"],
          reminder: { enabled: false, before: 15, notified: false },
          order: (data.tasks || []).length,
          zoteroItemKey: meta.key,
          zoteroItemID: meta.id,
          zoteroLinkStatus: "active",
          readingProfile: host.getPref("readingProfile", "general"),
          literatureWorkflowId: "reading",
          zoteroItemTitle: meta.title,
          zoteroAuthors: meta.authors,
          zoteroLibraryID: meta.libraryID,
          zoteroPublication: meta.publication,
          zoteroYear: meta.year,
          zoteroUri: meta.zoteroUri,
          zoteroPdfUri: meta.pdfUri,
          academicType: "literature_reading",
          subtasks: Boolean(host.getPref("academicPresets", true)) ? LiteratureWorkflow.steps(host.getPref("readingProfile", "general"), () => "sub_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10)) : []
        };
        data.tasks.push(mainTask);
        addedTasks.push(mainTask);
        existingKeys.add(item.libraryID + ":" + item.key);
        addedCount++;
      }
      if (addedCount > 0) {
        await host.saveData({ taskChanges: { added: addedTasks }, deduplicateLiterature: "item", syncLinkedItems: true });
        host.showNotice("专题研读规划已建立", `已为【${collection.name}】下的 ${addedCount} 篇文献批量生成研读清单！`);
      } else {
        host.showNotice("研读规划已存在", `【${collection.name}】下的文献均已存在对应研读任务。`);
      }
      host.openTaskFlow({ mode: "create_from_collection", collectionName: collection.name }, window);
    } catch (err) {
      Zotero.logError?.("[TaskFlow] createCollectionReadingPlan error: " + err);
    }
  }
  async function createTaskFromReader(host, window = null, sourceReader = null, selection = null) {
    const win = window || (Zotero.getMainWindow ? Zotero.getMainWindow() : null);
    const tabs = win?.Zotero_Tabs || (typeof Zotero_Tabs !== "undefined" ? Zotero_Tabs : null);
    if (!sourceReader && (!tabs || !tabs.selectedTab || tabs.selectedTab.type !== "reader")) {
      const selected = host.getSelectedRegularItems(win);
      if (selected.length > 0) {
        host.openTaskFlow({ mode: "create_from_item", item: serializeLiteratureItem(selected[0]) }, win);
        return;
      }
      host.showNotice("提示", "请在 PDF 阅读器中或文献列表中使用此快捷键");
      return;
    }
    try {
      const reader = sourceReader || Zotero.Reader?.getByTabID?.(tabs.selectedTab.id);
      const itemID = reader?.itemID || tabs?.selectedTab?.data?.itemID;
      if (!itemID) return;
      const attachmentItem = Zotero.Items.get(itemID);
      const regularItem = getLiteratureItem(attachmentItem);
      if (!regularItem) return;
      const meta = serializeLiteratureItem(regularItem);
      let selectedText = selection?.text || "";
      try {
        if (!selectedText && typeof reader.getSelectedText === "function") {
          selectedText = await reader.getSelectedText();
        }
      } catch (_) {
      }
      if (!selectedText && reader._iframeWindow) {
        try {
          selectedText = reader._iframeWindow.getSelection?.()?.toString() || "";
        } catch (_) {
        }
      }
      selectedText = String(selectedText || "").trim();
      let pageIndex = 0;
      try {
        if (Number.isInteger(selection?.position?.pageIndex)) {
          pageIndex = selection.position.pageIndex;
        } else if (Number.isInteger(reader._internalReader?._state?.primaryViewState?.pageIndex)) {
          pageIndex = reader._internalReader._state.primaryViewState.pageIndex;
        } else if (reader.state && typeof reader.state.pageIndex === "number") {
          pageIndex = reader.state.pageIndex;
        } else if (reader._iframeWindow?.PDFViewerApplication?.page) {
          pageIndex = reader._iframeWindow.PDFViewerApplication.page - 1;
        }
      } catch (_) {
      }
      const pageNum = pageIndex + 1;
      const pdfKey = attachmentItem?.key || meta.key;
      const groupID = Zotero.Libraries?.get?.(regularItem.libraryID)?.groupID;
      const pageLink = groupID ? `zotero://open-pdf/groups/${groupID}/items/${pdfKey}?page=${pageNum}` : `zotero://open-pdf/library/items/${pdfKey}?page=${pageNum}`;
      const taskTitle = selectedText ? selectedText.length > 50 ? selectedText.slice(0, 50) + "..." : selectedText : `文献研读思考 (P.${pageNum})`;
      let description = `来自 PDF 第 ${pageNum} 页的摘录与待办：
`;
      if (selectedText) {
        description += `“${selectedText}”

`;
      }
      description += `文献：《${meta.title}》
PDF 锚点直达：${pageLink}`;
      const data = await host.loadData();
      const taskId = "task_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const newTask = {
        id: taskId,
        title: `📌 [P.${pageNum}] ${taskTitle}`,
        description,
        dueDate: LiteratureWorkflow.dateAfter(LiteratureWorkflow.days(host.getPref("defaultDueDays", 7))),
        dueTime: null,
        priority: host.getPref("defaultPriority", "medium"),
        category: "论文研读",
        completed: false,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        completedAt: null,
        subtasks: [],
        tags: [...meta.tags || [], `P.${pageNum}`, "PDF摘录"],
        reminder: { enabled: false, before: 15, notified: false },
        order: (data.tasks || []).length,
        zoteroItemKey: meta.key,
        zoteroItemTitle: meta.title,
        zoteroAuthors: meta.authors,
        zoteroLibraryID: meta.libraryID,
        zoteroPublication: meta.publication,
        zoteroYear: meta.year,
        zoteroUri: meta.zoteroUri,
        zoteroPdfUri: pageLink,
        zoteroAttachmentKey: attachmentItem.key,
        zoteroItemID: regularItem.id,
        zoteroPage: pageNum,
        zoteroQuote: selectedText,
        zoteroLinkStatus: "active",
        academicType: "literature_reading"
      };
      const shortcutAction = host.getPref("readerShortcutAction", "create_instant");
      if (shortcutAction === "open_modal") {
        host.openTaskFlow({ mode: "open_modal_prefill", prefill: newTask }, window);
        return;
      }
      await host.saveData({ taskChanges: { added: [newTask] }, syncLinkedItems: true });
      host.showNotice("已从 PDF 提取待办", `已记录第 ${pageNum} 页任务，并生成一键直达锚点链接！`);
    } catch (err) {
      Zotero.logError?.("[TaskFlow] createTaskFromReader error: " + err);
      host.showNotice("从阅读器创建待办失败", String(err));
    }
  }
  async function createReadingMilestones(host, item, window = null, profileID = null) {
    const selectedProfile = Object.hasOwn(LiteratureWorkflow.profiles, profileID) ? profileID : host.getPref("readingProfile", "general");
    const result = await addLiteratureReadingTask(host, item, { profileID: selectedProfile });
    host.showNotice(
      result.created ? "精读清单已创建" : "该精读清单已存在",
      `${LiteratureWorkflow.profile(selectedProfile).label} · 截止 ${result.task.dueDate}`
    );
    host.openTaskFlow({ mode: "view_task", taskId: result.task.id }, window);
    return result;
  }

  // src/modules/literature/literatureSync.ts
  async function syncTasksToChildNote(host, item, tasks = null, options = {}) {
    const target = getLiteratureItem(item);
    if (!target) return null;
    if (typeof target.isEditable === "function" && !target.isEditable()) return null;
    try {
      const data = await host.loadData();
      const allTasks = (tasks || data.tasks || []).filter(
        (t) => t.zoteroItemKey === target.key && (t.zoteroLibraryID || Zotero.Libraries.userLibraryID) === target.libraryID
      );
      const meta = serializeLiteratureItem(target);
      const total = allTasks.length;
      const completed = allTasks.filter((t) => t.completed).length;
      const percent = total > 0 ? Math.round(completed / total * 100) : 0;
      let noteHtml = `<h1>${escapeHtml(host.getPref("childNoteTitle", "📝 [TaskFlow] 研读清单与进度"))}</h1>`;
      noteHtml += `<p><strong>文献：</strong>${escapeHtml(meta.title)} (${escapeHtml(meta.authors)} ${escapeHtml(meta.year)})</p>`;
      noteHtml += `<p><strong>研读进度：</strong>${completed}/${total} 已完成 (<strong>${percent}%</strong>) | 更新于：${(/* @__PURE__ */ new Date()).toLocaleString()}</p>`;
      noteHtml += `<div style="background:#e2e8f0;border-radius:4px;height:10px;width:100%;margin:8px 0;overflow:hidden;"><div style="background:#059669;height:10px;width:${percent}%;"></div></div>`;
      if (total === 0) {
        noteHtml += `<p><em>暂无关联待办事项。可通过 TaskFlow 插件或侧边栏添加研读计划。</em></p>`;
      } else {
        noteHtml += `<ul>`;
        for (const t of allTasks) {
          const checkMark = t.completed ? "☑" : "☐";
          const statusStyle = t.completed ? "text-decoration:line-through;color:#64748b;" : "font-weight:600;";
          const dueInfo = t.dueDate ? ` <span style="font-size:11px;color:#d97706;">(截止: ${escapeHtml(t.dueDate)})</span>` : "";
          noteHtml += `<li>${checkMark} <span style="${statusStyle}">${escapeHtml(t.title)}</span>${dueInfo}`;
          if (host.getPref("childNoteIncludeSubtasks", true) && t.subtasks && t.subtasks.length > 0) {
            noteHtml += `<ul>`;
            for (const sub of t.subtasks) {
              noteHtml += `<li>${sub.completed ? "☑" : "☐"} ${escapeHtml(sub.title)}</li>`;
            }
            noteHtml += `</ul>`;
          }
          if (host.getPref("childNoteIncludeQuotes", true) && t.description && t.description.trim()) {
            noteHtml += `<blockquote>${escapeHtml(t.description).replace(/\n/g, "<br/>")}</blockquote>`;
          }
          if (host.getPref("childNoteIncludeQuotes", true) && /^zotero:\/\/open-pdf\/(?:library|groups\/\d+)\/items\/[A-Za-z0-9_]+(?:\?|$)/.test(t.zoteroPdfUri || "")) {
            noteHtml += ` <a href="${escapeHtml(t.zoteroPdfUri)}">${t.zoteroAnnotationKey ? "返回原文批注" : "打开原文页码"}</a>`;
          }
          noteHtml += `</li>`;
        }
        noteHtml += `</ul>`;
      }
      noteHtml += `<hr/><p style="font-size:11px;color:#94a3b8;">由 Zotero TaskFlow 自动生成并同步至 Zotero 云端笔记</p>`;
      let targetNote = null;
      if (typeof target.getNotes === "function") {
        const noteIDs = target.getNotes();
        for (const nid of noteIDs) {
          const noteItem = Zotero.Items.get(nid);
          if (noteItem && noteItem.isNote && noteItem.isNote()) {
            const content = noteItem.getNote();
            const hasTaskFlowTag = typeof noteItem.hasTag === "function" && noteItem.hasTag("TaskFlow");
            if (hasTaskFlowTag || content && (content.includes("[TaskFlow]") || content.includes("TaskFlow"))) {
              targetNote = noteItem;
              break;
            }
          }
        }
      }
      if (targetNote) {
        targetNote.setNote(noteHtml);
        try {
          if (typeof targetNote.hasTag === "function" && !targetNote.hasTag("TaskFlow")) {
            targetNote.addTag("TaskFlow");
          }
        } catch (_) {
        }
        await targetNote.saveTx();
      } else {
        const newNote = new Zotero.Item("note");
        newNote.libraryID = target.libraryID;
        newNote.parentID = target.id;
        newNote.setNote(noteHtml);
        try {
          newNote.addTag("TaskFlow");
        } catch (_) {
        }
        await newNote.saveTx();
        targetNote = newNote;
      }
      if (!options?.silent) {
        host.showNotice(
          "文献笔记同步成功",
          `已更新《${meta.title.slice(0, 20)}...》的研读进度笔记，支持多端云同步！`
        );
      }
      return targetNote;
    } catch (err) {
      Zotero.logError?.("[TaskFlow] syncTasksToChildNote error: " + err);
      host.recordDiagnostic({ action: "同步文献子笔记", message: String(err?.message || err), stack: err?.stack });
      return null;
    }
  }
  async function tagItemOnTaskEvent(host, itemKey, eventType, libraryID = null) {
    if (!itemKey) return;
    try {
      const item = resolveItemReference(itemKey, libraryID);
      const target = getLiteratureItem(item);
      if (!target) return;
      if (typeof target.isEditable === "function" && !target.isEditable()) return;
      const autoTagOnCreate = host.getPref("autoTagOnCreate", true);
      const autoTagOnComplete = host.getPref("autoTagOnComplete", true);
      const pendingTag = host.getPref("tagForPending", "待研读");
      const completedTag = host.getPref("tagForCompleted", "精读已完成");
      const data = await host.loadData();
      const tasks = (data.tasks || []).filter(
        (t) => t.zoteroItemKey === target.key && (t.zoteroLibraryID || Zotero.Libraries.userLibraryID) === target.libraryID
      );
      const uncompleted = tasks.filter((t) => !t.completed);
      let modified = false;
      if (eventType === "create" && autoTagOnCreate) {
        if (pendingTag && !target.hasTag(pendingTag)) {
          target.addTag(pendingTag);
          modified = true;
        }
      } else if (eventType === "complete_check") {
        if (tasks.length > 0 && uncompleted.length === 0) {
          if (autoTagOnComplete && completedTag) {
            if (!target.hasTag(completedTag)) {
              target.addTag(completedTag);
              modified = true;
            }
            if (pendingTag && target.hasTag(pendingTag)) {
              target.removeTag(pendingTag);
              modified = true;
            }
          }
        } else if (tasks.length === 0) {
          for (const tag of [pendingTag, completedTag]) {
            if (tag && target.hasTag(tag)) {
              target.removeTag(tag);
              modified = true;
            }
          }
        } else if (uncompleted.length > 0) {
          if (completedTag && target.hasTag(completedTag)) {
            target.removeTag(completedTag);
            modified = true;
          }
          if (autoTagOnCreate && pendingTag && !target.hasTag(pendingTag)) {
            target.addTag(pendingTag);
            modified = true;
          }
        }
      }
      if (modified) {
        await target.saveTx();
      }
    } catch (err) {
      Zotero.logError?.("[TaskFlow] tagItemOnTaskEvent error: " + err);
    }
  }
  async function refreshLinkedLiterature(host, itemIDs = null, removed = []) {
    const data = await host.loadData();
    const updated = [];
    for (const task of data.tasks || []) {
      if (!task.zoteroItemKey) continue;
      const libraryID = task.zoteroLibraryID || Zotero.Libraries.userLibraryID;
      const item = resolveItemReference(task.zoteroItemKey, libraryID);
      const matchesRemoved = removed.some(
        (ref) => ref.key === task.zoteroItemKey && ref.libraryID === libraryID
      );
      if (itemIDs && !itemIDs.has(item?.id) && !itemIDs.has(task.zoteroItemID) && !matchesRemoved) continue;
      let changes = { zoteroLinkStatus: !item ? "missing" : item.deleted ? "trashed" : "active" };
      if (item) {
        const meta = serializeLiteratureItem(item);
        if (!meta) continue;
        Object.assign(changes, {
          zoteroItemID: meta.id,
          zoteroItemTitle: meta.title,
          zoteroAuthors: meta.authors,
          zoteroYear: meta.year,
          zoteroPublication: meta.publication,
          zoteroUri: meta.zoteroUri
        });
        if (task.zoteroAutoTitle || task.zoteroAutoTitle == null && task.title === `研读：${task.zoteroItemTitle}`) {
          changes.title = `研读：${meta.title}`;
        }
      }
      changes = Object.fromEntries(Object.entries(changes).filter(([key, value]) => value !== task[key]));
      if (Object.keys(changes).length) {
        updated.push({
          id: task.id,
          changes,
          literatureRefresh: true,
          originalTitle: task.title,
          itemKey: task.zoteroItemKey,
          libraryID
        });
      }
    }
    if (updated.length && !host._shuttingDown) {
      await host.saveData({
        taskChanges: { updated },
        expectedTasksGeneration: data.tasksGeneration || 0
      });
    }
    return updated.length;
  }

  // src/modules/literature.ts
  var TaskFlowLiterature = class extends TaskFlowLiteratureTasks {
    buildLiteratureTask(item, options = {}) {
      return buildLiteratureTask(this, item, options);
    }
    addLiteratureReadingTask(item, options = {}) {
      return addLiteratureReadingTask(this, item, options);
    }
    addLiteratureTasks(selected) {
      return addLiteratureTasks(this, selected);
    }
    addSelectedLiteratureTasks(window = null, items = null) {
      return addSelectedLiteratureTasks(this, window, items);
    }
    addDroppedLiteratureTasks(itemIDs) {
      return addDroppedLiteratureTasks(this, itemIDs);
    }
    rescheduleLiteratureTask(taskID, days, fromDeadline = false) {
      return rescheduleLiteratureTask(this, taskID, days, fromDeadline);
    }
    createCollectionReadingPlan(collection, window = null) {
      return createCollectionReadingPlan(this, collection, window);
    }
    createTaskFromReader(window = null, sourceReader = null, selection = null) {
      return createTaskFromReader(this, window, sourceReader, selection);
    }
    createReadingMilestones(item, window = null, profileID = null) {
      return createReadingMilestones(this, item, window, profileID);
    }
    syncTasksToChildNote(item, tasks = null, options = {}) {
      return syncTasksToChildNote(this, item, tasks, options);
    }
    tagItemOnTaskEvent(itemKey, eventType, libraryID = null) {
      return tagItemOnTaskEvent(this, itemKey, eventType, libraryID);
    }
    refreshLinkedLiterature(itemIDs = null, removed = []) {
      return refreshLinkedLiterature(this, itemIDs, removed);
    }
    registerItemPaneSection() {
      if (typeof Zotero !== "undefined" && Zotero.TaskFlowItemPane?.registerItemPaneSection) {
        return Zotero.TaskFlowItemPane.registerItemPaneSection(this);
      }
      if (typeof TaskFlowItemPane !== "undefined" && TaskFlowItemPane.registerItemPaneSection) {
        return TaskFlowItemPane.registerItemPaneSection(this);
      }
    }
  };

  // src/modules/windowMenus.ts
  var injectedElements = /* @__PURE__ */ new Map();
  var pendingWindowLoads = /* @__PURE__ */ new Map();
  var TaskFlowWindowMenus = class extends TaskFlowLiterature {
    switchWindowMode(mode, window = null) {
      try {
        if (Zotero.Prefs) {
          Zotero.Prefs.set("extensions.taskflow.windowMode", mode, true);
        }
      } catch (_) {
      }
      const mainWin = window && window.Zotero_Tabs ? window : Zotero.getMainWindow ? Zotero.getMainWindow() : Services.wm.getMostRecentWindow("navigator:browser");
      if (mode === "subwindow" || mode === "window") {
        if (mainWin?.Zotero_Tabs?._tabs) {
          try {
            const existingTab = mainWin.Zotero_Tabs._tabs.find((t) => t && t.type === "todolist");
            if (existingTab) {
              mainWin.Zotero_Tabs.close(existingTab.id);
            }
          } catch (_) {
          }
        }
        this.openStandaloneWindow({}, mainWin, mode);
      } else if (mode === "tab") {
        try {
          const windows = Services.wm.getEnumerator(null);
          while (windows.hasMoreElements()) {
            const w = windows.getNext();
            if (w && (w.name === "Todolist_SubWindow" || w.name === "Todolist_Window")) {
              try {
                w.close();
              } catch (_) {
              }
            }
          }
        } catch (_) {
        }
        this.openTaskFlow({ targetMode: "tab" }, mainWin);
      }
    }
    setElementVisibility(elem, visible) {
      if (!elem) return;
      elem.hidden = !visible;
      if (visible) {
        if (typeof elem.removeAttribute === "function") elem.removeAttribute("hidden");
        if (elem.style?.removeProperty) elem.style.removeProperty("display");
      } else {
        if (typeof elem.setAttribute === "function") elem.setAttribute("hidden", "true");
        if (elem.style?.setProperty) elem.style.setProperty("display", "none", "important");
      }
    }
    refreshContextMenuVisibility() {
      try {
        const showCreate = Boolean(this.getPref("itemContextMenuCreate", false));
        const showBatch = Boolean(this.getPref("itemContextMenuBatch", false));
        if (typeof Services !== "undefined" && Services.wm?.getEnumerator) {
          const windows = Services.wm.getEnumerator("navigator:browser");
          while (windows.hasMoreElements()) {
            const win = windows.getNext();
            const doc = win?.document;
            if (!doc) continue;
            const createItem = doc.getElementById("todolist-itemmenu-create");
            const batchItem = doc.getElementById("todolist-itemmenu-batch");
            const separator = doc.getElementById("todolist-itemmenu-separator");
            this.setElementVisibility(createItem, showCreate);
            this.setElementVisibility(batchItem, showBatch);
            this.setElementVisibility(separator, showCreate || showBatch);
          }
        }
      } catch (_) {
      }
    }
    registerMenus(doc, win) {
      if (Zotero.MenuManager && typeof Zotero.MenuManager.registerMenu === "function") {
        try {
          if (this._menuManagerId && Zotero.MenuManager.unregisterMenu) {
            try {
              Zotero.MenuManager.unregisterMenu(this._menuManagerId);
            } catch (_) {
            }
            this._menuManagerId = null;
          }
          this._menuManagerId = Zotero.MenuManager.registerMenu({
            menuID: "todolist-itemmenu-create",
            pluginID: ADDON_ID,
            target: "main/library/item",
            menus: [
              {
                menuType: "menuitem",
                label: "添加为待办",
                onShowing: (_event, context) => {
                  const show = Boolean(this.getPref("itemContextMenuCreate", false));
                  if (context && typeof context.setVisible === "function") {
                    context.setVisible(show);
                  }
                  if (context?.menuElem) {
                    this.setElementVisibility(context.menuElem, show);
                  }
                  if (_event?.target && typeof _event.target.setAttribute === "function") {
                    this.setElementVisibility(_event.target, show);
                  }
                },
                onCommand: (event, context) => {
                  try {
                    const win2 = event?.target?.ownerDocument?.defaultView || Zotero.getMainWindow?.();
                    return this.createTaskFromSelection(win2, win2?.document, null, context?.items);
                  } catch (err) {
                    Zotero.logError?.("[TaskFlow] Failed to create task: " + err);
                  }
                }
              },
              {
                menuType: "menuitem",
                label: "批量加入研读待办",
                onShowing: (_event, context) => {
                  const show = Boolean(this.getPref("itemContextMenuBatch", false));
                  if (context && typeof context.setVisible === "function") {
                    context.setVisible(show);
                  }
                  if (context?.menuElem) {
                    this.setElementVisibility(context.menuElem, show);
                  }
                  if (_event?.target && typeof _event.target.setAttribute === "function") {
                    this.setElementVisibility(_event.target, show);
                  }
                },
                onCommand: (event, context) => {
                  const win2 = event?.target?.ownerDocument?.defaultView || Zotero.getMainWindow?.();
                  return this.addSelectedLiteratureTasks(win2, context?.items).catch((error) => this.showNotice("批量加入失败", String(error)));
                }
              }
            ]
          });
        } catch (err) {
          Zotero.logError?.("[TaskFlow] MenuManager.registerMenu failed: " + err);
        }
      }
    }
    registerThemeListener(listener) {
      this._themeListeners ||= /* @__PURE__ */ new Set();
      this._themeListeners.add(listener);
      listener(this.getHostTheme());
      return () => this._themeListeners.delete(listener);
    }
    initWindowListener() {
      this._windowListener = {
        onOpenWindow: (xulWindow) => {
          let domWindow;
          try {
            domWindow = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
          } catch (_) {
            return;
          }
          const onLoad = () => {
            domWindow.removeEventListener("load", onLoad, false);
            pendingWindowLoads.delete(domWindow);
            if (!domWindow.closed) (Zotero.TaskFlow || Zotero.Todolist)?.addToWindow(domWindow);
          };
          pendingWindowLoads.set(domWindow, onLoad);
          domWindow.addEventListener("load", onLoad, { once: true });
          if (domWindow.document?.readyState === "complete") onLoad();
        },
        onCloseWindow: (xulWindow) => {
          try {
            const domWindow = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
            const onLoad = pendingWindowLoads.get(domWindow);
            if (onLoad) domWindow.removeEventListener("load", onLoad, false);
            pendingWindowLoads.delete(domWindow);
            (Zotero.TaskFlow || Zotero.Todolist)?.removeFromWindow(domWindow);
          } catch (_) {
          }
        },
        onWindowTitleChange: () => {
        }
      };
      Services.wm.addListener(this._windowListener);
    }
    createXULElement(doc, tagName) {
      if (typeof doc.createXULElement === "function") {
        return doc.createXULElement(tagName);
      }
      const xulNs = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
      if (typeof doc.createElementNS === "function") {
        return doc.createElementNS(xulNs, tagName);
      }
      return doc.createElement(tagName);
    }
    isMainWindow(win) {
      if (!win || !win.document) return false;
      if (win.ZoteroPane) return true;
      const doc = win.document;
      if (doc.getElementById("zotero-pane") || doc.getElementById("zotero-items-tree") || doc.getElementById("zotero-items-toolbar")) {
        return true;
      }
      const href = String(win.location?.href || "");
      return href.includes("zoteroPane") || href.includes("standalone/standalone");
    }
    isReaderWindow(win) {
      if (!win || !win.document) return false;
      const doc = win.document;
      if (doc.getElementById("reader-toolbar") || doc.querySelector?.(".reader")) return true;
      const href = String(win.location?.href || "");
      return href.includes("reader");
    }
  };

  // src/modules/toolbar/buttonGroup.ts
  var isTodolistButton = (button) => button.id === "todolist-toolbar-button" || button.getAttribute("label") === "TaskFlow" && String(button.getAttribute("image") || "").includes("/icons/taskflow.svg");
  function updateToolbarBadge(host, doc, data) {
    const button = doc?.getElementById("todolist-toolbar-button");
    if (!button) return;
    const today = host.localDateString(/* @__PURE__ */ new Date());
    const tasks = (data?.tasks || []).filter((task) => task);
    const overdue = tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < today).length;
    const count = tasks.filter((task) => {
      if (task.completed || task.status === "done" || task.dueDate && task.dueDate < today) return false;
      return !task.status || task.status === "todo" || task.status === "in-progress";
    }).length;
    const showBadge = Boolean(host.getPref("toolbarShowBadge", true));
    if (showBadge && count) button.setAttribute("data-taskflow-count", count > 99 ? "99+" : String(count));
    else button.removeAttribute("data-taskflow-count");
    if (doc.l10n?.setAttributes) {
      doc.l10n.setAttributes(button, "taskflow-toolbar-status", { count, overdue });
    } else {
      const text = `TaskFlow: ${count} to do or in progress (excluding overdue), ${overdue} overdue (Ctrl+Alt+T)`;
      button.setAttribute("tooltiptext", text);
      button.setAttribute("aria-label", text);
    }
  }
  function updateAllToolbarBadges(host) {
    try {
      if (typeof Services !== "undefined" && Services.wm?.getEnumerator) {
        const windows = Services.wm.getEnumerator("navigator:browser");
        while (windows.hasMoreElements()) {
          const win = windows.getNext();
          if (win?.document && !win.closed) {
            updateToolbarBadge(host, win.document, host._cachedData);
          }
        }
      }
    } catch (_) {
    }
  }
  function injectToolbarButton(host, window, windowElements, retryCount = 0, retryState = { cancelled: false, timers: /* @__PURE__ */ new Set() }) {
    if (retryState.cancelled) return;
    if (!window || !window.document) return;
    const doc = window.document;
    if (!host.isMainWindow(window)) {
      try {
        doc.getElementById("todolist-toolbar-button")?.remove();
      } catch (_) {
      }
      return;
    }
    const toolbar = doc.getElementById("zotero-items-toolbar") || doc.getElementById("zotero-item-toolbar") || doc.getElementById("zotero-tb") || doc.getElementById("zotero-toolbar") || (doc.getElementById("zotero-pane")?.querySelector("toolbar") || null);
    if (!toolbar) {
      if (retryCount < 10) {
        const timer = window.setTimeout(() => {
          retryState.timers.delete(timer);
          if (!retryState.cancelled) injectToolbarButton(host, window, windowElements, retryCount + 1, retryState);
        }, 300);
        retryState.timers.add(timer);
      }
      return;
    }
    const existingButtons = Array.from(toolbar.querySelectorAll("toolbarbutton")).filter(isTodolistButton);
    let btn = existingButtons[0] || null;
    if (existingButtons.length > 1) {
      for (let i = 1; i < existingButtons.length; i++) {
        try {
          existingButtons[i].remove();
        } catch (_) {
        }
      }
    }
    if (!btn) {
      btn = host.createXULElement(doc, "toolbarbutton");
      btn.id = "todolist-toolbar-button";
      btn.setAttribute("label", "TaskFlow");
      btn.setAttribute("tooltiptext", "打开 TaskFlow 学术任务工作台 (Ctrl+Alt+T)");
      btn.setAttribute("image", `${CHROME_ROOT}icons/taskflow.svg`);
      btn.setAttribute("class", "zotero-tb-button toolbarbutton-1 chromeclass-toolbar-additional");
      btn.setAttribute(
        "style",
        "cursor: pointer; margin: 0 3px; display: inline-flex; align-items: center; justify-content: center;"
      );
      const trigger = (e) => {
        if (e) {
          e.preventDefault?.();
          e.stopPropagation?.();
        }
        host.triggerTaskFlowOpen(window);
      };
      btn.addEventListener("command", trigger);
      btn.addEventListener("mouseenter", () => updateToolbarBadge(host, doc, host._cachedData));
    }
    btn.setAttribute("image", `${CHROME_ROOT}icons/taskflow.svg`);
    if (!doc.getElementById("taskflow-toolbar-style")) {
      const style = doc.createElementNS("http://www.w3.org/1999/xhtml", "style");
      style.id = "taskflow-toolbar-style";
      style.textContent = `
      #todolist-toolbar-button { position:relative; }
      #todolist-toolbar-button[data-taskflow-count]::after {
        content:attr(data-taskflow-count); position:absolute; top:0; inset-inline-end:-2px;
        min-width:13px; height:13px; padding:0 3px; box-sizing:border-box; border-radius:7px;
        font:600 9px/13px system-ui,sans-serif; text-align:center;
        color:light-dark(#254e7b,#c7def8); background:light-dark(#dceaf9,#294560);
        border:1px solid var(--material-background,Canvas); pointer-events:none;
      }
    `;
      (doc.head || doc.documentElement).appendChild(style);
      windowElements.push(style);
    }
    const toolbarChildren = Array.from(toolbar.children || []);
    const flexibleSpacerIndex = toolbarChildren.findIndex((child) => {
      const tag = String(child.localName || child.tagName || "").toLowerCase();
      return tag === "toolbarspring" || tag === "spacer" && Number(child.getAttribute("flex") || 0) > 0 || child.id === "zotero-tb-search" || child.id === "zotero-tb-search-textbox" || child.classList?.contains("zotero-search-box") || child.classList?.contains("search-box");
    });
    const leadingActionItems = flexibleSpacerIndex >= 0 ? toolbarChildren.slice(0, flexibleSpacerIndex) : toolbarChildren;
    const toolbarButtons = leadingActionItems.filter(
      (child) => String(child.localName || child.tagName || "").toLowerCase() === "toolbarbutton" && !isTodolistButton(child) && !child.hidden && child.getAttribute("hidden") !== "true" && child.getAttribute("collapsed") !== "true"
    );
    const anchor = toolbarButtons.reverse().find((child) => {
      try {
        const style = window.getComputedStyle(child);
        return style.display !== "none" && style.visibility !== "collapse";
      } catch (_error) {
        return true;
      }
    }) || null;
    if (anchor && anchor.parentNode === toolbar) {
      if (anchor.nextSibling !== btn) {
        anchor.parentNode.insertBefore(btn, anchor.nextSibling);
      }
    } else {
      const searchBox = doc.getElementById("zotero-tb-search-textbox") || doc.getElementById("zotero-tb-search") || toolbar.querySelector("input") || toolbar.querySelector(".zotero-search-box") || (flexibleSpacerIndex >= 0 ? toolbarChildren[flexibleSpacerIndex] : null);
      if (searchBox && searchBox.parentNode === toolbar) {
        toolbar.insertBefore(btn, searchBox);
      } else {
        toolbar.appendChild(btn);
      }
    }
    if (!windowElements.includes(btn)) {
      windowElements.push(btn);
    }
    updateToolbarBadge(host, doc, host._cachedData);
    if (!host._cachedData) {
      host.loadData().then((data) => {
        if (!retryState.cancelled && !window.closed && doc.getElementById(btn.id) === btn) {
          updateToolbarBadge(host, doc, host._cachedData || data);
        }
      }).catch((error) => Zotero.logError?.("[TaskFlow] Toolbar task count failed: " + error));
    }
    if (retryCount === 0) {
      const delays = [400, 1200, 2500];
      delays.forEach((d) => {
        const timer = window.setTimeout(() => {
          retryState.timers.delete(timer);
          if (!retryState.cancelled) {
            repositionToolbarButton(host, window);
          }
        }, d);
        retryState.timers.add(timer);
      });
    }
  }
  function repositionToolbarButton(host, window) {
    if (!window || !window.document) return;
    if (!host.isMainWindow(window)) {
      try {
        window.document.getElementById("todolist-toolbar-button")?.remove();
      } catch (_) {
      }
      return;
    }
    const doc = window.document;
    const btn = doc.getElementById("todolist-toolbar-button");
    if (!btn) return;
    const toolbar = btn.parentNode || doc.getElementById("zotero-items-toolbar") || doc.getElementById("zotero-item-toolbar") || doc.getElementById("zotero-tb") || doc.getElementById("zotero-toolbar") || (doc.getElementById("zotero-pane")?.querySelector("toolbar") || null);
    if (!toolbar) return;
    const isBtn = (b) => b.id === "todolist-toolbar-button";
    const toolbarChildren = Array.from(toolbar.children || []);
    const flexibleSpacerIndex = toolbarChildren.findIndex((child) => {
      const tag = String(child.localName || child.tagName || "").toLowerCase();
      return tag === "toolbarspring" || tag === "spacer" && Number(child.getAttribute("flex") || 0) > 0 || child.id === "zotero-tb-search" || child.id === "zotero-tb-search-textbox" || child.classList?.contains("zotero-search-box");
    });
    const leadingActionItems = flexibleSpacerIndex >= 0 ? toolbarChildren.slice(0, flexibleSpacerIndex) : toolbarChildren;
    const toolbarButtons = leadingActionItems.filter(
      (child) => String(child.localName || child.tagName || "").toLowerCase() === "toolbarbutton" && !isBtn(child) && !child.hidden && child.getAttribute("hidden") !== "true" && child.getAttribute("collapsed") !== "true"
    );
    const anchor = toolbarButtons.reverse().find((child) => {
      try {
        const style = window.getComputedStyle(child);
        return style.display !== "none" && style.visibility !== "collapse";
      } catch (_error) {
        return true;
      }
    });
    if (anchor && anchor.parentNode === toolbar) {
      if (anchor.nextSibling !== btn) {
        anchor.parentNode.insertBefore(btn, anchor.nextSibling);
      }
    }
  }

  // src/modules/toolbar/shortcutsGroup.ts
  function injectTabIconStyle(doc, windowElements) {
    try {
      if (!doc.getElementById("todolist-tab-style")) {
        const style = doc.createElement("style");
        style.id = "todolist-tab-style";
        style.textContent = `
        tab[type="todolist"] .tab-icon,
        .tab[type="todolist"] .tab-icon {
          list-style-image: url("${CHROME_ROOT}icons/taskflow.svg") !important;
          width: 16px !important;
          height: 16px !important;
        }
      `;
        (doc.head || doc.documentElement).appendChild(style);
        windowElements.push(style);
      }
    } catch (_) {
    }
  }
  function setupGlobalShortcuts(host, window, windowElements) {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault?.();
        e.stopPropagation?.();
        host.triggerTaskFlowOpen(window);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault?.();
        e.stopPropagation?.();
        host.createTaskFromReader(window);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown, true);
    windowElements.push({
      remove: () => window.removeEventListener("keydown", handleGlobalKeyDown, true)
    });
  }
  function injectItemContextMenu(host, window, doc, windowElements) {
    if (host._menuManagerId) return;
    const itemMenu = doc.getElementById("zotero-itemmenu");
    if (!itemMenu) return;
    const separator = host.createXULElement(doc, "menuseparator");
    separator.id = "todolist-itemmenu-separator";
    itemMenu.appendChild(separator);
    windowElements.push(separator);
    const createFromItem = host.createXULElement(doc, "menuitem");
    createFromItem.id = "todolist-itemmenu-create";
    createFromItem.setAttribute("label", "添加为待办");
    createFromItem.addEventListener("command", () => {
      try {
        host.createTaskFromSelection(window, doc, itemMenu);
      } catch (err) {
        Zotero.logError?.("[TaskFlow] Failed to create task from item context menu: " + err);
      }
    });
    itemMenu.appendChild(createFromItem);
    windowElements.push(createFromItem);
    const batchFromItems = host.createXULElement(doc, "menuitem");
    batchFromItems.id = "todolist-itemmenu-batch";
    batchFromItems.setAttribute("label", "批量加入研读待办");
    batchFromItems.addEventListener("command", () => {
      host.addSelectedLiteratureTasks(window).catch((error) => host.showNotice("批量加入失败", String(error)));
    });
    itemMenu.appendChild(batchFromItems);
    windowElements.push(batchFromItems);
    const updateItemMenuVisibility = () => {
      const showCreate = Boolean(host.getPref("itemContextMenuCreate", false));
      const showBatch = Boolean(host.getPref("itemContextMenuBatch", false));
      host.setElementVisibility(createFromItem, showCreate);
      host.setElementVisibility(batchFromItems, showBatch);
      host.setElementVisibility(separator, showCreate || showBatch);
    };
    itemMenu.addEventListener("popupshowing", updateItemMenuVisibility);
    windowElements.push({
      remove: () => itemMenu.removeEventListener("popupshowing", updateItemMenuVisibility)
    });
    updateItemMenuVisibility();
  }

  // src/modules/toolbar/messageBridgeGroup.ts
  function setupHostMessageBridge(host, window, windowElements) {
    const handleHostMessage = async (event) => {
      try {
        const data = event.data;
        if (!data || typeof data !== "object") return;
        if (typeof data.type !== "string" || !data.type.startsWith("TASKFLOW_") && !data.type.startsWith("TODOLIST_")) {
          return;
        }
        const sourceWin = event.source;
        const iframe = window.document.getElementById("todolist-tab-iframe");
        if (sourceWin && sourceWin !== iframe?.contentWindow) {
          let sourceURL;
          try {
            sourceURL = String(sourceWin.location?.href || "");
          } catch (_) {
            return;
          }
          if (!/^chrome:\/\/(?:taskflow|todolist)\/content\/(?:index|sidepanel)\.html(?:[?#]|$)/.test(sourceURL)) return;
        }
        if (!sourceWin && !iframe?.contentWindow) return;
        if ((data.type === "TASKFLOW_DIAGNOSTIC" || data.type === "TODOLIST_DIAGNOSTIC") && data.record) {
          host.recordDiagnostic(data.record);
          return;
        }
        if (iframe && (event.source === iframe.contentWindow || !sourceWin)) {
          iframe._todolistReady = true;
        }
        const replyResult = (msgObj) => {
          try {
            if (sourceWin && typeof sourceWin.postMessage === "function") {
              sourceWin.postMessage(msgObj, "*");
            } else if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage(msgObj, "*");
            }
          } catch (_) {
          }
        };
        if (data.type === "TASKFLOW_READY" || data.type === "TODOLIST_READY") {
          host._uiClients ||= /* @__PURE__ */ new Set();
          if (sourceWin) host._uiClients.add(sourceWin);
          if (iframe) iframe._todolistReady = true;
          host.loadData().then((storedData) => {
            const pendingNav = iframe?._todolistPending || null;
            if (iframe) iframe._todolistPending = null;
            replyResult({
              type: "TODOLIST_INIT_DATA",
              data: storedData,
              hostTheme: host.getHostTheme(),
              pending: pendingNav
            });
          }).catch((error) => {
            host.recordDiagnostic({ action: "初始化 Zotero 数据", message: String(error), stack: error?.stack });
            replyResult({ type: "TODOLIST_INIT_ERROR", error: String(error?.message || error) });
          });
          return;
        }
        if ((data.type === "TASKFLOW_STORAGE_SET" || data.type === "TODOLIST_STORAGE_SET") && data.payload) {
          host.saveData(data.payload).then((saved) => {
            if (data.requestId) {
              replyResult({
                type: "TODOLIST_STORAGE_SET_RESULT",
                requestId: data.requestId,
                data: saved,
                success: true
              });
            }
          }).catch(
            (error) => replyResult({
              type: "TODOLIST_STORAGE_SET_RESULT",
              requestId: data.requestId,
              success: false,
              error: String(error)
            })
          );
          return;
        }
        if (data.type === "TASKFLOW_NOTIFY" || data.type === "TODOLIST_NOTIFY") {
          const success = await host.showNotice(data.title || "任务提醒", data.body || "") !== false;
          replyResult({ type: "TODOLIST_NOTIFY_RESULT", requestId: data.requestId, success });
          return;
        }
        if ((data.type === "TASKFLOW_LOCATE_ITEM" || data.type === "TODOLIST_LOCATE_ITEM") && data.key) {
          await host.locateLiteratureItem(data.key, data.libraryID, window);
          return;
        }
        if ((data.type === "TASKFLOW_OPEN_PDF" || data.type === "TODOLIST_OPEN_PDF") && data.key) {
          await host.openTaskPdf({
            zoteroPdfUri: data.key,
            zoteroLibraryID: data.libraryID,
            zoteroPage: data.page,
            zoteroAnnotationKey: data.annotationKey
          });
          return;
        }
        if (data.type === "TASKFLOW_OPEN_PREFERENCES" || data.type === "TODOLIST_OPEN_PREFERENCES") {
          await host.openPreferencesPane(window);
          return;
        }
        if (data.type === "TASKFLOW_GET_ACTIVE_ITEM" || data.type === "TODOLIST_GET_ACTIVE_ITEM") {
          const activeItem = host.getCurrentActiveItem(window);
          replyResult({
            type: "TODOLIST_GET_ACTIVE_ITEM_RESULT",
            requestId: data.requestId,
            item: activeItem ? serializeLiteratureItem(activeItem) : null
          });
          return;
        }
        if (data.type === "TASKFLOW_ADD_DROPPED_ITEMS" || data.type === "TODOLIST_ADD_DROPPED_ITEMS") {
          try {
            const result = await host.addDroppedLiteratureTasks(data.itemIDs);
            replyResult({ type: "TODOLIST_ADD_DROPPED_ITEMS_RESULT", requestId: data.requestId, success: true, result });
          } catch (error) {
            replyResult({
              type: "TODOLIST_ADD_DROPPED_ITEMS_RESULT",
              requestId: data.requestId,
              success: false,
              error: String(error?.message || error)
            });
          }
          return;
        }
        if ((data.type === "TASKFLOW_SYNC_NOTE" || data.type === "TODOLIST_SYNC_NOTE") && data.key) {
          const item = resolveItemReference(data.key, data.libraryID);
          if (item) {
            const note = await host.syncTasksToChildNote(item);
            if (data.requestId) {
              replyResult({
                type: "TODOLIST_SYNC_NOTE_RESULT",
                requestId: data.requestId,
                success: Boolean(note),
                noteId: note?.id
              });
            }
          }
          return;
        }
        if (data.type === "TASKFLOW_GET_COLLECTIONS" || data.type === "TODOLIST_GET_COLLECTIONS") {
          const collections = host.getZoteroCollections(data.libraryID);
          if (data.requestId) {
            replyResult({
              type: "TODOLIST_GET_COLLECTIONS_RESULT",
              requestId: data.requestId,
              collections
            });
          }
          return;
        }
        if ((data.type === "TASKFLOW_CREATE_COLLECTION_PLAN" || data.type === "TODOLIST_CREATE_COLLECTION_PLAN") && data.collectionID) {
          const col = Zotero.Collections?.get?.(data.collectionID);
          if (col) {
            await host.createCollectionReadingPlan(col, window);
          }
          return;
        }
        if ((data.type === "TASKFLOW_SWITCH_WINDOW_MODE" || data.type === "TODOLIST_SWITCH_WINDOW_MODE") && data.mode) {
          await host.switchWindowMode(data.mode, window);
          return;
        }
        if (data.type === "TASKFLOW_EXPORT_DATA" || data.type === "TODOLIST_EXPORT_DATA") {
          await host.exportData(data.format || "json");
          return;
        }
        if (data.type === "TASKFLOW_IMPORT_DATA" || data.type === "TODOLIST_IMPORT_DATA") {
          await host.importDataFile(data.mode || "merge", window);
          return;
        }
        if (data.type === "TASKFLOW_CLEAR_DATA" || data.type === "TODOLIST_CLEAR_DATA") {
          await host.clearAllData(window);
          return;
        }
        if (data.type === "TASKFLOW_COPY_SUMMARY" || data.type === "TODOLIST_COPY_SUMMARY") {
          await host.copyTasksSummary(window);
          return;
        }
        if (data.type === "TASKFLOW_PRINT" || data.type === "TODOLIST_PRINT") {
          await host.printTasks(window);
          return;
        }
      } catch (e) {
        Zotero.logError?.("[TaskFlow] Host message processing error: " + e);
        host.recordDiagnostic({
          action: "Zotero 主窗口 " + event.data?.type,
          message: String(e?.message || e),
          stack: e?.stack
        });
        try {
          event.source?.postMessage(
            { requestId: event.data?.requestId, success: false, error: String(e?.message || e) },
            "*"
          );
        } catch (_) {
        }
      }
    };
    window.addEventListener("message", handleHostMessage);
    windowElements.push({
      remove: () => window.removeEventListener("message", handleHostMessage)
    });
  }

  // src/modules/windowToolbar.ts
  var TaskFlowWindowToolbar = class extends TaskFlowWindowMenus {
    addToWindow(window) {
      if (!window || !window.document) return;
      const doc = window.document;
      const isMain = this.isMainWindow(window);
      const isReader = !isMain && this.isReaderWindow(window);
      if (!isMain && !isReader) {
        try {
          doc.getElementById("todolist-toolbar-button")?.remove();
          doc.getElementById("todolist-tools-menu")?.remove();
          doc.getElementById("todolist-tools-preferences")?.remove();
          doc.getElementById("todolist-tab-style")?.remove();
        } catch (_) {
        }
        return;
      }
      if (!isMain) {
        try {
          doc.getElementById("todolist-toolbar-button")?.remove();
        } catch (_) {
        }
      }
      const staleMenuIds = [
        "todolist-tools-menu",
        "todolist-tools-preferences",
        "todolist-itemmenu-separator",
        "todolist-itemmenu-create",
        "todolist-itemmenu-batch",
        "todolist-collectionmenu-create",
        "todolist-collectionmenu-plan",
        "todolist-reader-context-create"
      ];
      for (const id of staleMenuIds) {
        try {
          doc.getElementById(id)?.remove();
        } catch (_) {
        }
      }
      if (injectedElements.has(window)) return;
      const windowElements = [];
      this.ensureLocalization(doc);
      injectItemContextMenu(this, window, doc, windowElements);
      injectTabIconStyle(doc, windowElements);
      setupGlobalShortcuts(this, window, windowElements);
      setupHostMessageBridge(this, window, windowElements);
      const toolbarRetryState = { cancelled: false, timers: /* @__PURE__ */ new Set() };
      windowElements.push({
        remove: () => {
          toolbarRetryState.cancelled = true;
          for (const timer of toolbarRetryState.timers) window.clearTimeout(timer);
          toolbarRetryState.timers.clear();
        }
      });
      this.injectToolbarButton(window, windowElements, 0, toolbarRetryState);
      injectedElements.set(window, windowElements);
    }
    updateAllToolbarBadges() {
      updateAllToolbarBadges(this);
    }
    updateToolbarBadge(doc, data) {
      updateToolbarBadge(this, doc, data);
    }
    injectToolbarButton(window, windowElements, retryCount = 0, retryState = { cancelled: false, timers: /* @__PURE__ */ new Set() }) {
      injectToolbarButton(this, window, windowElements, retryCount, retryState);
    }
    repositionToolbarButton(window) {
      repositionToolbarButton(this, window);
    }
    removeFromWindow(window) {
      if (!window || !window.document) return;
      const doc = window.document;
      const elements = injectedElements.get(window);
      if (elements) {
        for (const el of elements) {
          try {
            if (typeof el.remove === "function") {
              el.remove();
            } else if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          } catch (_) {
          }
        }
        injectedElements.delete(window);
      }
      const allTodolistIds = [
        "todolist-tools-menu",
        "todolist-tools-preferences",
        "todolist-itemmenu-separator",
        "todolist-itemmenu-create",
        "todolist-itemmenu-batch",
        "todolist-collectionmenu-create",
        "todolist-collectionmenu-plan",
        "todolist-reader-context-create",
        "todolist-toolbar-button",
        "todolist-tab-style",
        "taskflow-toolbar-style"
      ];
      for (const id of allTodolistIds) {
        try {
          doc.getElementById(id)?.remove();
        } catch (_) {
        }
      }
    }
  };

  // src/modules/window.ts
  var TaskFlowWindow = class _TaskFlowWindow extends TaskFlowWindowToolbar {
    getSelectedRegularItems(window) {
      const pane = window?.ZoteroPane || (Zotero.getActiveZoteroPane ? Zotero.getActiveZoteroPane() : null) || (Zotero.getMainWindow ? Zotero.getMainWindow().ZoteroPane : null);
      let rawSelection = [];
      if (pane && typeof pane.getSelectedItems === "function") {
        try {
          rawSelection = pane.getSelectedItems() || [];
        } catch (_) {
        }
      }
      if ((!rawSelection || rawSelection.length === 0) && pane?.itemsView?.getSelectedItems) {
        try {
          rawSelection = pane.itemsView.getSelectedItems() || [];
        } catch (_) {
        }
      }
      const result = [];
      const seen = /* @__PURE__ */ new Set();
      for (const item of rawSelection) {
        const lit = getLiteratureItem(item);
        if (lit && !seen.has(lit.id)) {
          seen.add(lit.id);
          result.push(lit);
        }
      }
      return result;
    }
    getCurrentActiveItem(window) {
      const tabs = window?.Zotero_Tabs || (typeof Zotero_Tabs !== "undefined" ? Zotero_Tabs : null);
      if (tabs && tabs.selectedTab && tabs.selectedTab.type === "reader") {
        const reader = Zotero.Reader?.getByTabID?.(tabs.selectedTab.id);
        const itemID = reader?.itemID || tabs.selectedTab.data?.itemID;
        if (itemID) {
          const item = Zotero.Items.get(itemID);
          return getLiteratureItem(item);
        }
      }
      const selected = this.getSelectedRegularItems(window);
      return selected[0] || null;
    }
    createTaskFromSelection(window = null, doc = null, itemMenu = null, items = null) {
      const win = window || (Zotero.getMainWindow ? Zotero.getMainWindow() : null);
      let targetItem = null;
      if (Array.isArray(items) && items.length > 0) {
        targetItem = getLiteratureItem(items[0]);
      }
      if (!targetItem) {
        const selected = this.getSelectedRegularItems(win);
        if (selected.length > 0) {
          targetItem = selected[0];
        }
      }
      if (!targetItem) {
        const documentObj = doc || win?.document;
        const trigger = itemMenu && itemMenu.triggerNode || documentObj && documentObj.popupNode;
        const pane = win?.ZoteroPane || (Zotero.getActiveZoteroPane ? Zotero.getActiveZoteroPane() : null);
        if (trigger && pane && typeof pane.getRowForNode === "function") {
          try {
            const row = pane.getRowForNode(trigger);
            if (row && row.ref) {
              const rawItem = Zotero.Items.get(row.ref.id || row.ref);
              targetItem = getLiteratureItem(rawItem);
            }
          } catch (_) {
          }
        }
      }
      if (!targetItem) {
        targetItem = this.getCurrentActiveItem(win);
      }
      if (targetItem) {
        const serialized = serializeLiteratureItem(targetItem);
        this.showNotice("已选取文献", `正在为《${serialized.title.slice(0, 22)}...》创建研读待办`);
        this.openTaskFlow({ mode: "create_from_item", item: serialized }, win);
      } else {
        this.showNotice("创建待办", "正在打开任务面板...");
        this.openTaskFlow({ mode: "open_modal_prefill", prefill: { category: "论文研读" } }, win);
      }
    }
    triggerTaskFlowOpen(window = null) {
      const win = window || (Zotero.getMainWindow ? Zotero.getMainWindow() : null);
      return this.openTaskFlow({ mode: "open" }, win);
    }
    triggerTodolistOpen(window = null) {
      return this.triggerTaskFlowOpen(window);
    }
    openTaskFlow(options = {}, targetWindow = null) {
      if (typeof this.openTodolist === "function" && this.openTodolist !== _TaskFlowWindow.prototype.openTodolist) {
        return this.openTodolist(options, targetWindow);
      }
      try {
        const mainWin = targetWindow && targetWindow.Zotero_Tabs ? targetWindow : Zotero.getMainWindow ? Zotero.getMainWindow() : Services.wm.getMostRecentWindow("navigator:browser");
        let preferredWindowMode = "tab";
        try {
          if (Zotero.Prefs) {
            preferredWindowMode = Zotero.Prefs.get("extensions.taskflow.windowMode", true) || "tab";
          }
        } catch (_) {
        }
        const effectiveMode = options.targetMode || preferredWindowMode;
        if (effectiveMode === "window") {
          this.openStandaloneWindow(options, mainWin, "window");
          return;
        } else if (effectiveMode === "subwindow") {
          this.openStandaloneWindow(options, mainWin, "subwindow");
          return;
        }
        const tabs = mainWin?.Zotero_Tabs || Zotero.getMainWindow && Zotero.getMainWindow().Zotero_Tabs;
        if (tabs && typeof tabs.add === "function") {
          if (Array.isArray(tabs._tabs)) {
            const existingTab = tabs._tabs.find((t) => t && t.type === "todolist");
            if (existingTab) {
              tabs.select(existingTab.id);
              if (mainWin && mainWin.focus) mainWin.focus();
              const iframe = mainWin.document.getElementById("todolist-tab-iframe") || existingTab.container && existingTab.container.querySelector("iframe");
              if (iframe) {
                iframe._todolistPending = options;
                try {
                  if (iframe.contentWindow?.ZoteroBridge?.handleHostNavigation) {
                    iframe.contentWindow.ZoteroBridge.handleHostNavigation(options);
                  }
                } catch (_) {
                }
                try {
                  if (iframe.contentWindow?.postMessage) {
                    iframe.contentWindow.postMessage({ type: "TODOLIST_NAVIGATE", options }, "*");
                  }
                } catch (_) {
                }
              }
              return;
            }
          }
          const tabResult = tabs.add({
            type: "todolist",
            title: "Zotero TaskFlow待办事项",
            select: true,
            data: options,
            onClose: () => {
              Zotero.log?.("[TaskFlow] Tab closed");
            }
          });
          const container = tabResult && tabResult.container || tabs.getTabContainer && tabs.getTabContainer(tabResult.id || tabResult) || tabs.getTab && tabs.getTab(tabResult?.id)?.container;
          if (container) {
            const doc = container.ownerDocument || mainWin.document;
            const iframe = doc.createElement("iframe");
            iframe.id = "todolist-tab-iframe";
            iframe.setAttribute("src", `${CHROME_ROOT}index.html`);
            iframe.setAttribute("style", "width: 100%; height: 100%; border: none; flex: 1; display: block;");
            iframe.setAttribute("flex", "1");
            iframe._todolistReady = false;
            iframe._todolistPending = options;
            container.style.display = "flex";
            container.style.flexDirection = "column";
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.overflow = "hidden";
            iframe.addEventListener("load", () => {
              try {
                if (iframe.contentWindow) {
                  iframe.contentWindow.Zotero = Zotero;
                  iframe.contentWindow._todolistPending = options;
                  if (iframe.contentWindow.ZoteroBridge?.handleHostNavigation) {
                    iframe.contentWindow.ZoteroBridge.handleHostNavigation(options);
                  }
                }
              } catch (_) {
              }
            });
            container.appendChild(iframe);
          }
          if (mainWin && mainWin.focus) mainWin.focus();
          return;
        }
      } catch (e) {
        Zotero.logError?.("[TaskFlow] openTaskFlow error: " + e);
      }
      this.openStandaloneWindow(options, targetWindow, "window");
    }
    openTodolist(options = {}, targetWindow = null) {
      return this.openTaskFlow(options, targetWindow);
    }
    openStandaloneWindow(options = {}, targetWindow = null, windowType = "window") {
      try {
        const ww = Services.ww;
        let features = "";
        let windowName = "";
        const url = `${CHROME_ROOT}index.html?mode=${encodeURIComponent(windowType)}`;
        if (windowType === "subwindow") {
          const alwaysRaised = this.getPref("subwindowAlwaysOnTop", false) ? ",alwaysRaised=yes" : "";
          features = `chrome,dialog=no,all,resizable=yes,minimizable=yes,width=460,height=760,top=80,left=80${alwaysRaised}`;
          windowName = "Todolist_SubWindow";
        } else {
          features = "chrome,dialog=no,all,resizable=yes,minimizable=yes,width=1120,height=760,centerscreen";
          windowName = "Todolist_Window";
        }
        const otherWindowName = windowType === "subwindow" ? "Todolist_Window" : "Todolist_SubWindow";
        try {
          const windows = Services.wm.getEnumerator(null);
          while (windows.hasMoreElements()) {
            const w = windows.getNext();
            if (w && w.name === otherWindowName) {
              try {
                w.close();
              } catch (_) {
              }
            }
          }
        } catch (_) {
        }
        const mainWin = targetWindow && targetWindow.Zotero_Tabs ? targetWindow : Zotero.getMainWindow ? Zotero.getMainWindow() : Services.wm.getMostRecentWindow("navigator:browser");
        const win = ww.openWindow(
          mainWin,
          url,
          windowName,
          features,
          { Zotero, options: { ...options, currentWindowType: windowType } }
        );
        if (win && win.focus) win.focus();
        if (options && options.mode && options.mode !== "open") {
          if (!this._standaloneTimers) this._standaloneTimers = /* @__PURE__ */ new Set();
          let winClosed = false;
          if (win && typeof win.addEventListener === "function") {
            win.addEventListener("unload", () => {
              winClosed = true;
            }, { once: true });
          }
          const scheduleDeliver = (attempt) => {
            if (this._shuttingDown || winClosed || !win || win.closed) return;
            const timerId = mainWin.setTimeout(() => {
              this._standaloneTimers?.delete(timerId);
              tryDeliver(attempt);
            }, attempt === 0 ? 300 : 200);
            this._standaloneTimers.add(timerId);
          };
          const tryDeliver = (attempts = 0) => {
            if (this._shuttingDown || winClosed || !win || win.closed) return;
            try {
              if (win.ZoteroBridge?.handleHostNavigation) {
                win.ZoteroBridge.handleHostNavigation(options);
                return;
              }
              win.postMessage?.({ type: "TODOLIST_NAVIGATE", options }, "*");
            } catch (_) {
            }
            if (attempts < 10) {
              scheduleDeliver(attempts + 1);
            }
          };
          scheduleDeliver(0);
        }
      } catch (err) {
        Zotero.logError?.("[TaskFlow] openStandaloneWindow error: " + err);
      }
    }
    openPreferencesPane(window) {
      try {
        const win = window || Zotero.getMainWindow?.();
        if (Zotero.Utilities?.Internal?.openPreferences) {
          Zotero.Utilities.Internal.openPreferences("todolist-preferences-pane");
        } else if (win?.openPreferences) {
          win.openPreferences("todolist-preferences-pane");
        } else {
          win?.openDialog?.("chrome://zotero/content/preferences/preferences.xhtml", "Preferences", "chrome,titlebar,toolbar,centerscreen,dialog=yes");
        }
      } catch (e) {
        Zotero.logError?.("[TaskFlow] Could not open preferences: " + e);
      }
    }
  };

  // src/index.ts
  var TaskFlowHost = class extends TaskFlowWindow {
    registerZoteroIntegration() {
      if (this._integrationRegistered) return;
      this._integrationRegistered = true;
      this._shuttingDown = false;
      const scheduleLinks = (ids = null, extraData = {}) => {
        this._pendingLinkIDs ||= /* @__PURE__ */ new Set();
        this._removedLinkRefs ||= [];
        if (!ids) this._refreshAllLinks = true;
        else ids.forEach((id) => this._pendingLinkIDs.add(id));
        this._removedLinkRefs.push(...Object.values(extraData || {}).map((entry) => entry?.old || entry).filter((entry) => entry?.key && entry?.libraryID));
        clearTimeout(this._linkRefreshTimer);
        this._linkRefreshTimer = setTimeout(() => {
          const ids2 = this._refreshAllLinks ? null : this._pendingLinkIDs;
          const removed = this._removedLinkRefs;
          this._pendingLinkIDs = /* @__PURE__ */ new Set();
          this._removedLinkRefs = [];
          this._refreshAllLinks = false;
          this._linkRefreshQueue = (this._linkRefreshQueue || Promise.resolve()).then(() => {
            if (!this._shuttingDown) return this.refreshLinkedLiterature(ids2, removed);
          }).catch((error) => Zotero.logError?.("[TaskFlow] 文献状态更新失败: " + error));
        }, 100);
      };
      if (Zotero.Notifier?.registerObserver) {
        this._notifierID = Zotero.Notifier.registerObserver({ notify: (event, type, ids, extraData) => {
          if (type === "item" && ["modify", "delete", "trash", "add", "refresh"].includes(event)) scheduleLinks(ids, extraData);
        } }, ["item"], "todolist-literature");
        scheduleLinks();
      }
      this._readerHooks = [];
      if (Zotero.Reader?.registerEventListener) {
        const annotationMenu = ({ reader, params, append }) => {
          if (!this.getPref("readerSelectionQuickAdd", false) || !params?.ids?.length) return;
          append({ label: "加入研读待办", onCommand: () => {
            const run = async () => {
              for (const key of params.ids) await this.createTaskFromAnnotation(reader, key, { forceInstant: params.ids.length > 1 });
            };
            run().catch((error) => this.showNotice("批注加入失败", String(error)));
          } });
        };
        const selectionPopup = ({ reader, doc, params, append }) => {
          if (!this.getPref("readerSelectionQuickAdd", false) || !params?.annotation?.text) return;
          const button = doc.createElement("button");
          button.type = "button";
          button.textContent = "加入研读待办";
          button.title = "将选中文字与当前页加入待办";
          button.addEventListener("click", async () => {
            if (button.disabled) return;
            button.disabled = true;
            try {
              await this.createTaskFromReader(null, reader, params.annotation);
            } finally {
              button.disabled = false;
            }
          });
          append(button);
        };
        for (const [type, handler] of [["createAnnotationContextMenu", annotationMenu], ["renderTextSelectionPopup", selectionPopup]]) {
          Zotero.Reader.registerEventListener(type, handler, ADDON_ID);
          this._readerHooks.push([type, handler]);
        }
      }
      this._hostColorQuery = Zotero.getMainWindow?.()?.matchMedia?.("(prefers-color-scheme: dark)");
      this._hostThemeChanged = () => {
        const theme = this.getHostTheme();
        for (const listener of this._themeListeners || []) {
          try {
            listener(theme);
          } catch (_) {
          }
        }
        for (const client of this._uiClients || []) {
          try {
            client.postMessage({ type: "TASKFLOW_HOST_THEME", theme }, "*");
            client.postMessage({ type: "TODOLIST_HOST_THEME", theme }, "*");
          } catch (_) {
          }
        }
      };
      this._hostColorQuery?.addEventListener?.("change", this._hostThemeChanged);
    }
    async init() {
      if (this._initialized) return;
      this._initialized = true;
      this.initWindowListener();
      if (typeof Services !== "undefined" && Services.wm) {
        const windows = Services.wm.getEnumerator("navigator:browser");
        while (windows.hasMoreElements()) {
          const domWindow = windows.getNext();
          if (domWindow.document.readyState === "complete") {
            this.addToWindow(domWindow);
          } else {
            domWindow.addEventListener("load", () => this.addToWindow(domWindow), { once: true });
          }
        }
      }
      this.registerItemPaneSection();
      if (typeof Services !== "undefined" && Services.wm) {
        const win = Services.wm.getMostRecentWindow("navigator:browser");
        if (win && win.document) {
          this.registerMenus();
        }
      }
      this.registerZoteroIntegration();
      Promise.resolve(this.loadData()).catch((e) => {
        Zotero.logError?.("[TaskFlow] Initial load cache warmup error: " + e);
      });
    }
    async shutdown() {
      this._shuttingDown = true;
      if (typeof Services !== "undefined" && Services.wm) {
        const standaloneWindows = [];
        const enumerator = Services.wm.getEnumerator(null);
        while (enumerator.hasMoreElements()) {
          const win = enumerator.getNext();
          if (win && !win.closed && (win.name === "Todolist_SubWindow" || win.name === "Todolist_Window")) {
            standaloneWindows.push(win);
          }
        }
        for (const win of standaloneWindows) {
          try {
            win.close();
          } catch (_) {
          }
        }
      }
      for (const timer of this._standaloneDeliveryTimers || []) {
        try {
          clearTimeout(timer);
        } catch (_) {
        }
      }
      this._standaloneDeliveryTimers?.clear?.();
      for (const timer of this._standaloneTimers || []) {
        try {
          clearTimeout(timer);
        } catch (_) {
        }
      }
      this._standaloneTimers?.clear?.();
      if (this._linkRefreshTimer) {
        clearTimeout(this._linkRefreshTimer);
        this._linkRefreshTimer = null;
      }
      if (this._paneUndoTimer) {
        clearTimeout(this._paneUndoTimer);
        this._paneUndoTimer = null;
      }
      this._paneDeleted = [];
      if (this._notifierID && Zotero.Notifier?.unregisterObserver) {
        try {
          Zotero.Notifier.unregisterObserver(this._notifierID);
        } catch (_) {
        }
        this._notifierID = null;
      }
      for (const [type, handler] of this._readerHooks || []) {
        try {
          Zotero.Reader?.unregisterEventListener?.(type, handler);
        } catch (_) {
        }
      }
      this._readerHooks = [];
      if (this._hostColorQuery?.removeEventListener && this._hostThemeChanged) {
        try {
          this._hostColorQuery.removeEventListener("change", this._hostThemeChanged);
        } catch (_) {
        }
      } else if (this._hostColorQuery?.removeListener && this._hostThemeChanged) {
        try {
          this._hostColorQuery.removeListener(this._hostThemeChanged);
        } catch (_) {
        }
      }
      this._hostColorQuery = null;
      this._hostThemeChanged = null;
      if (this._windowListener && Services.wm?.removeListener) {
        Services.wm.removeListener(this._windowListener);
        this._windowListener = null;
      }
      if (typeof Services !== "undefined" && Services.wm) {
        const windows = Services.wm.getEnumerator("navigator:browser");
        while (windows.hasMoreElements()) {
          const domWindow = windows.getNext();
          this.removeFromWindow(domWindow);
        }
      }
      if (this.itemPaneSectionID && Zotero.ItemPaneManager?.unregisterSection) {
        try {
          Zotero.ItemPaneManager.unregisterSection(this.itemPaneSectionID);
          this.itemPaneSectionID = null;
        } catch (_) {
        }
      }
      this._initialized = false;
      this._integrationRegistered = false;
    }
  };
  var instance = new TaskFlowHost();
  if (typeof Zotero !== "undefined") {
    Zotero.TaskFlow = instance;
    Zotero.Todolist = instance;
    Zotero.TaskFlow.init();
  }
  if (typeof globalThis.TaskFlow === "undefined") {
    globalThis.TaskFlow = instance;
  }
  var index_default = instance;
})();
