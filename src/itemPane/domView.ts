/**
 * Zotero TaskFlow - ItemPane DOM View Module
 * Handles CSS style injection, DOM element factories, headers, progress bars, quick creation, and action grids.
 */

import { LiteratureWorkflow } from '../literatureWorkflow';
import { serializeLiteratureItem } from '../utils';

declare let Zotero: any;

export const HTML_NS = 'http://www.w3.org/1999/xhtml';

export function createEl(doc: Document, tag: string, className = '', text: string | null = null): any {
  const el = doc.createElementNS ? doc.createElementNS(HTML_NS, tag) : doc.createElement(tag);
  if (className) el.className = className;
  if (text !== null && text !== undefined) el.textContent = text;
  return el;
}

export function ensureItemPaneStyles(doc: Document): void {
  if (!doc) return;
  if (doc.getElementById('todolist-itempane-styles')) return;
  try {
    const style = doc.createElementNS ? doc.createElementNS(HTML_NS, 'style') : doc.createElement('style');
    style.id = 'todolist-itempane-styles';
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
    Zotero.logError?.('[TaskFlow] Failed to inject itemPane styles: ' + e);
  }
}

export function renderHeaderCard(
  doc: Document,
  total: number,
  done: number,
  pct: number,
  showProgressBar: boolean
): any {
  const headerCard = createEl(doc, 'div', 'td-header-card');
  const headerTop = createEl(doc, 'div', 'td-header-top');

  let statusText = '暂无待办';
  let badgeClass = 'td-status-badge td-status-empty';
  if (total > 0) {
    if (done === total) {
      statusText = `研读已完成 (${done}/${total})`;
      badgeClass = 'td-status-badge td-status-done';
    } else {
      statusText = `研读进行中 (${done}/${total})`;
      badgeClass = 'td-status-badge td-status-active';
    }
  }
  const statusBadge = createEl(doc, 'span', badgeClass, statusText);
  headerTop.appendChild(statusBadge);

  if (total > 0) {
    const pctSpan = createEl(doc, 'span', 'td-progress-pct', `${pct}%`);
    headerTop.appendChild(pctSpan);
  }
  headerCard.appendChild(headerTop);

  if (total > 0 && showProgressBar) {
    const track = createEl(doc, 'div', 'td-progress-track');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('data-l10n-id', 'taskflow-item-pane-progress');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(total));
    track.setAttribute('aria-valuenow', String(done));
    const fill = createEl(doc, 'div', 'td-progress-fill');
    fill.style.width = `${pct}%`;
    track.appendChild(fill);
    headerCard.appendChild(track);
  }
  return headerCard;
}

export function renderActionGrid(
  doc: Document,
  target: any,
  total: number,
  host: any,
  state: any,
  profileSelect: any
): any {
  const actionGrid = createEl(doc, 'div', 'td-action-grid');

  const btnOpenBoard = createEl(doc, 'button', 'td-action-btn td-action-workspace', '待办看板');
  btnOpenBoard.type = 'button';
  btnOpenBoard.title = '在主标签页中打开 TaskFlow 任务看板';
  btnOpenBoard.addEventListener('click', () => {
    host.openTaskFlow({ mode: 'filter_item', itemKey: target.key }, Zotero.getMainWindow?.());
  });
  actionGrid.appendChild(btnOpenBoard);

  const btnSubwin = createEl(doc, 'button', 'td-action-btn td-action-workspace', '伴读窗口');
  btnSubwin.type = 'button';
  btnSubwin.title = '打开轻量伴读窗口，适合与 PDF 左右分屏对照';
  btnSubwin.addEventListener('click', () => {
    host.openStandaloneWindow({ mode: 'filter_item', itemKey: target.key }, Zotero.getMainWindow?.(), 'subwindow');
  });
  actionGrid.appendChild(btnSubwin);

  const btnSyncNote = createEl(doc, 'button', 'td-action-btn td-action-notes', '同步子笔记');
  btnSyncNote.type = 'button';
  btnSyncNote.title = '将本文献的所有研读待办同步导出为文献子笔记 (云端)';
  const isReadOnly = typeof target.isEditable === 'function' && !target.isEditable();
  if (isReadOnly) {
    btnSyncNote.disabled = true;
    btnSyncNote.title = '只读文献无法同步子笔记';
  }
  btnSyncNote.addEventListener('click', async () => {
    if (btnSyncNote.disabled) return;
    const note = await host.syncTasksToChildNote(target.id || target);
    if (note) {
      host.showNotice('同步成功', '已更新文献子笔记研读清单');
    } else {
      host.showNotice('跳过同步', '只读条目或未找到任务清单，跳过同步');
    }
  });
  actionGrid.appendChild(btnSyncNote);

  const meta = serializeLiteratureItem(target);
  if (meta?.pdfUri) {
    const btnPdf = createEl(doc, 'button', 'td-action-btn td-action-btn-pdf', '打开 PDF');
    btnPdf.type = 'button';
    btnPdf.title = '在 Zotero 内置阅读器中打开该文献的 PDF 全文';
    btnPdf.addEventListener('click', () => {
      host.openPdfAttachment(target);
    });
    actionGrid.appendChild(btnPdf);
  }

  if (total > 0) {
    const btnMilestones = createEl(
      doc,
      'button',
      'td-action-btn td-action-reading td-action-btn-milestones-row',
      '追加精读清单'
    );
    btnMilestones.type = 'button';
    btnMilestones.title = '按当前研读模板为本文献追加生成 5 项精读里程碑待办';
    btnMilestones.addEventListener('click', async () => {
      await host.createReadingMilestones(target, Zotero.getMainWindow?.(), profileSelect.value);
      state?.refresh?.();
    });
    actionGrid.appendChild(btnMilestones);
  }

  return actionGrid;
}
