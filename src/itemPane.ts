/**
 * Zotero TaskFlow - ItemPane Section Module
 */
import { ADDON_ID, CHROME_ROOT } from './config';
import { LiteratureWorkflow } from './literatureWorkflow';

declare let Zotero: any;

/**
 * Zotero TaskFlow - ItemPane Integration Module
 * Handles sidebar custom section rendering, progress bars, quick tasks, and subtask milestones.
 */



  const itemSelectUri = (item) => {
    if (!item) return '';
    const key = item.key || item.id;
    const groupID = Zotero.Libraries?.get?.(item.libraryID)?.groupID;
    return groupID
      ? `zotero://select/groups/${groupID}/items/${key}`
      : `zotero://select/library/items/${key}`;
  };

  const serializeLiteratureItem = (item) => {
    const target = getLiteratureItem(item);
    if (!target) return null;

    const title = (typeof target.getField === 'function' ? target.getField('title') : target.title) || '无标题文献';
    const date = typeof target.getField === 'function' ? target.getField('date') : target.date;
    let year = '';
    if (date) {
      const match = String(date).match(/\b(19|20)\d{2}\b/);
      year = match ? match[0] : String(date).slice(0, 4);
    }

    let authors = [];
    try {
      if (typeof target.getCreators === 'function') {
        authors = target.getCreators().map((c) => c.lastName || c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim()).filter(Boolean);
      }
    } catch (_) {}

    const publication = typeof target.getField === 'function'
      ? (target.getField('publicationTitle') || target.getField('proceedingsTitle') || target.getField('publisher') || '')
      : '';

    let tags = [];
    try {
      if (typeof target.getTags === 'function') {
        tags = target.getTags().map((t) => t.tag || String(t)).filter(Boolean);
      }
    } catch (_) {}

    // Find main PDF attachment
    let pdfUri = null;
    try {
      if (typeof target.getAttachments === 'function') {
        const attIds = target.getAttachments();
        for (const attId of attIds) {
          const att = Zotero.Items.get(attId);
          if (att && ((typeof att.isPDFAttachment === 'function' && att.isPDFAttachment()) || att.contentType === 'application/pdf')) {
            const groupID = Zotero.Libraries?.get?.(att.libraryID)?.groupID;
            pdfUri = groupID
              ? `zotero://open-pdf/groups/${groupID}/items/${att.key}`
              : `zotero://open-pdf/library/items/${att.key}`;
            break;
          }
        }
      }
    } catch (_) {}

    return {
      key: target.key || String(target.id),
      id: target.id,
      libraryID: target.libraryID,
      title,
      authors: authors.slice(0, 3).join(', ') + (authors.length > 3 ? ' 等' : ''),
      year,
      publication,
      tags,
      zoteroUri: itemSelectUri(target),
      pdfUri,
    };
  };

  const getLiteratureItem = (item) => {
    if (!item) return null;
    let target = (typeof item === 'number' || typeof item === 'string')
      ? (Zotero.Items?.get?.(item) || null)
      : item;
    if (!target) return null;
    try {
      if (target.topLevelItem && typeof target.topLevelItem.isRegularItem === 'function' && target.topLevelItem.isRegularItem()) {
        return target.topLevelItem;
      }
    } catch (_) {}
    if (typeof target.isAttachment === 'function' && target.isAttachment()) {
      if (target.parentItemID) {
        target = Zotero.Items.get(target.parentItemID) || target;
      }
    }
    if (typeof target.isNote === 'function' && target.isNote()) {
      if (target.parentItemID) {
        target = Zotero.Items.get(target.parentItemID) || target;
      }
    }
    try {
      if (target.topLevelItem && typeof target.topLevelItem.isRegularItem === 'function' && target.topLevelItem.isRegularItem()) {
        return target.topLevelItem;
      }
    } catch (_) {}
    return target;
  };

  const TaskFlowItemPane = {
    ensureItemPaneStyles(doc) {
      if (!doc) return;
      if (doc.getElementById('todolist-itempane-styles')) return;
      try {
        const style = doc.createElementNS
          ? doc.createElementNS('http://www.w3.org/1999/xhtml', 'style')
          : doc.createElement('style');
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
          /* Zotero's native button height must not constrain a multiline title. */
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
          /* .td-pane-wrap .td-action-btn-pdf { grid-column:1 / -1; } */
          .td-pane-wrap .td-fallback-task-list { display:flex; flex-direction:column; gap:4px; }
          /* Soft functional accents follow the host's inherited color scheme. */
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
          /* Quick creation is the primary action: give it a visible label, field and solid submit button. */
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
    },

    registerItemPaneSection(host) {
      if (!host.getPref('enableItemPane', true)) return;
      if (typeof Zotero.ItemPaneManager?.registerSection !== 'function') return;
      try {
        const sectionStates = new WeakMap();
        const icon = `${CHROME_ROOT}icons/taskflow.svg`;

        host.itemPaneSectionID = Zotero.ItemPaneManager.registerSection({
          paneID: 'todolist-item-pane',
          pluginID: ADDON_ID,
          header: { l10nID: 'todolist-item-pane-header', icon },
          sidenav: { l10nID: 'todolist-item-pane-sidenav', icon },
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
              quickDraft: '',
              quickPriority: null,
              expandedTasks: new Map(),
              saving: false,
              refresh,
              onDataChanged: () => {
                Promise.resolve(refresh?.()).catch((err) => {
                  Zotero.logError?.('[TaskFlow] ItemPane refresh failed: ' + err);
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
            const target = getLiteratureItem(item) || getLiteratureItem(
              Zotero.getMainWindow?.()?.ZoteroPane?.getSelectedItems?.()?.[0]
            );
            const state = sectionStates.get(body);
            if (state) {
              if (state.itemKey !== target?.key || state.libraryID !== target?.libraryID) {
                state.profileID = null;
                state.quickDraft = '';
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
            const target = getLiteratureItem(item) || getLiteratureItem(
              Zotero.getMainWindow?.()?.ZoteroPane?.getSelectedItems?.()?.[0]
            );
            const state = sectionStates.get(body);
            setSectionSummary?.('文献研读待办');
            body.replaceChildren();
            const html = 'http://www.w3.org/1999/xhtml';
            const createEl = (tag, className = '', text = null) => {
              const el = document.createElementNS ? document.createElementNS(html, tag) : document.createElement(tag);
              if (className) el.className = className;
              if (text !== null && text !== undefined) el.textContent = text;
              return el;
            };
            const fallback = createEl('div', 'td-pane-wrap td-pane-fallback');
            const fallbackVersion = state ? ++state.renderVersion : 0;
            const addButton = createEl('button', 'td-add-reading', '＋ 添加到论文研读');
            addButton.type = 'button';
            addButton.disabled = !target || Boolean(state?.saving);
            addButton.setAttribute('aria-label', '添加到论文研读');
            addButton.title = target ? '创建关联当前文献的研读待办，默认一周后截止' : '请先在 Zotero 文献库中选中一篇文献';
            addButton.addEventListener('click', async () => {
              if (!target || addButton.disabled) return;
              addButton.disabled = true;
              try {
                const result = await host.addLiteratureReadingTask(target);
                host.showNotice(result.created ? '已加入论文研读' : '该文献已有关联待办',
                  `截止日期：${result.task?.dueDate || '未设置'}`);
                await state?.refresh?.();
              } catch (error) {
                addButton.disabled = false;
                host.showNotice('保存失败', String(error));
              }
            });
            fallback.appendChild(addButton);

            const fallbackTaskList = createEl('div', 'td-fallback-task-list');
            fallback.appendChild(fallbackTaskList);
            if (target) {
              const renderFallbackTasks = tasks => {
                fallbackTaskList.replaceChildren();
                if (tasks.length) {
                  for (const task of tasks) {
                    const row = createEl('div', 'td-task-card td-task-card-fallback');
                    const taskRow = createEl('div', 'td-task-row');
                    const title = createEl('span', 'td-task-title-fallback', task.title || '未命名待办');
                    title.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;';
                    const locate = createEl('button', 'td-task-locate', '↗ Zotero');
                    locate.type = 'button';
                    locate.title = '在 Zotero 文献库中定位这篇文献';
                    locate.setAttribute('aria-label', `跳转到文献：${task.zoteroItemTitle || task.title || target.key}`);
                    locate.addEventListener('click', event => {
                      event.preventDefault();
                      event.stopPropagation();
                      host.locateLiteratureItem(task.zoteroUri || task.zoteroItemKey, task.zoteroLibraryID,
                        Zotero.getMainWindow?.()).catch(error => host.showNotice('无法跳转文献', String(error)));
                    });
                    taskRow.append(title, locate);
                    row.appendChild(taskRow);
                    fallbackTaskList.appendChild(row);
                  }
                } else {
                  fallbackTaskList.appendChild(createEl('div', 'td-add-hint', '当前文献还没有关联的研读待办。'));
                }
              };
              const matchesTarget = task => task.zoteroItemKey === target.key &&
                (task.zoteroLibraryID || Zotero.Libraries.userLibraryID) === target.libraryID;
              renderFallbackTasks((host._cachedData?.tasks || []).filter(matchesTarget));
              if (!host._cachedData) {
                host.loadData().then(data => {
                  if (state && state.renderVersion !== fallbackVersion) return;
                  if (body.querySelector('.td-pane-fallback') !== fallback) return;
                  renderFallbackTasks((data.tasks || []).filter(matchesTarget));
                }).catch(error => {
                  if (state && state.renderVersion !== fallbackVersion) return;
                  if (body.querySelector('.td-pane-fallback') === fallback) {
                    fallbackTaskList.replaceChildren(createEl('div', 'td-add-hint', '待办读取失败；添加按钮仍可使用，请重新选择条目重试。'));
                  }
                  Zotero.logError?.('[TaskFlow] ItemPane fallback data load failed: ' + error);
                });
              }
            } else {
              fallbackTaskList.appendChild(createEl('div', 'td-add-hint', '请在文献库中选中一篇文献以查看关联待办和跳转按钮。'));
            }
            body.appendChild(fallback);
          },
          onAsyncRender: async ({ doc, body, item, setSectionSummary }) => {
            if (!body) return;
            const document = doc || body.ownerDocument;
            if (document) {
              host.ensureItemPaneStyles(document);
            }
            const target = getLiteratureItem(item) || getLiteratureItem(
              Zotero.getMainWindow?.()?.ZoteroPane?.getSelectedItems?.()?.[0]
            );
            if (!target) return;

            const state = sectionStates.get(body);
            const renderVersion = state ? ++state.renderVersion : 0;
            const html = 'http://www.w3.org/1999/xhtml';
            const createEl = (tag, className = '', text = null) => {
              const el = document.createElementNS
                ? document.createElementNS(html, tag)
                : document.createElement(tag);
              if (className) el.className = className;
              if (text !== null && text !== undefined) {
                el.textContent = text;
              }
              return el;
            };

            let data;
            try {
              data = await host.loadData();
            } catch (error) {
              if (state && renderVersion !== state.renderVersion) return;
              body.appendChild(createEl('div', 'td-add-hint', '待办数据读取失败，请重新选择条目后重试。'));
              Zotero.logError?.('[TaskFlow] ItemPane data load failed: ' + error);
              return;
            }
            if (state && renderVersion !== state.renderVersion) return;
            body.replaceChildren();
            const targetKey = target.key;
            const tasks = (data.tasks || []).filter(t => t.zoteroItemKey === targetKey &&
              (t.zoteroLibraryID || Zotero.Libraries.userLibraryID) === target.libraryID);
            const uncompletedTasks = tasks.filter((t) => !t.completed);
            const total = tasks.length;
            const done = total - uncompletedTasks.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            setSectionSummary?.(total ? `${total} 项待办 · ${done}/${total} 完成` : '展开后快速新建');

            const wrapper = createEl('div', 'td-pane-wrap');

            // 1. Header & Progress Card
            const headerCard = createEl('div', 'td-header-card');
            const headerTop = createEl('div', 'td-header-top');

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
            const statusBadge = createEl('span', badgeClass, statusText);
            headerTop.appendChild(statusBadge);

            if (total > 0) {
              const pctSpan = createEl('span', 'td-progress-pct', `${pct}%`);
              headerTop.appendChild(pctSpan);
            }
            headerCard.appendChild(headerTop);

            const showProgressBar = host.getPref('itemPaneShowProgressBar', true);
            if (total > 0 && showProgressBar) {
              const track = createEl('div', 'td-progress-track');
              track.setAttribute('role', 'progressbar');
              track.setAttribute('data-l10n-id', 'taskflow-item-pane-progress');
              track.setAttribute('aria-valuemin', '0');
              track.setAttribute('aria-valuemax', String(total));
              track.setAttribute('aria-valuenow', String(done));
              const fill = createEl('div', 'td-progress-fill');
              fill.style.width = `${pct}%`;
              track.appendChild(fill);
              headerCard.appendChild(track);
            }
            wrapper.appendChild(headerCard);

            // Keep quick creation in the first screen so it remains easy to
            // reach even when this literature already has a long task list.
            const quickBox = createEl('div', 'td-quick-box');

            const prioSelect = createEl('select', 'td-prio-select');
            prioSelect.setAttribute('aria-label', '新待办优先级');
            prioSelect.title = '新待办优先级';
            const defaultPrio = state?.quickPriority || host.getPref('defaultPriority', 'medium');
            const priorities = [
              { val: 'medium', label: '中优先' },
              { val: 'high', label: '高优先' },
              { val: 'low', label: '低优先' }
            ];
            for (const p of priorities) {
              const opt = createEl('option', '', p.label);
              opt.value = p.val;
              if (p.val === defaultPrio) opt.selected = true;
              prioSelect.appendChild(opt);
            }
            prioSelect.addEventListener('change', () => { if (state) state.quickPriority = prioSelect.value; });

            const quickInput = createEl('input', 'td-quick-input');
            quickInput.type = 'text';
            quickInput.value = state?.quickDraft || '';
            quickInput.addEventListener('input', () => { if (state) state.quickDraft = quickInput.value; });
            quickInput.setAttribute('aria-label', '新待办事项');
            quickInput.placeholder = '输入待办内容，按 Enter 添加';
            quickInput.id = 'td-quick-input';

            const quickBtn = createEl('button', 'td-quick-submit', '添加');
            quickBtn.type = 'button';
            quickBtn.title = '添加待办任务';
            quickBtn.setAttribute('aria-label', '添加待办任务');
            quickInput.disabled = prioSelect.disabled = quickBtn.disabled = Boolean(state?.saving);

            const literatureTitle = serializeLiteratureItem(target).title;
            const existingReadingTask = uncompletedTasks.find(task =>
              (task.literatureWorkflowId === 'reading' || task.title === `研读：${literatureTitle}`) &&
              (task.academicType || 'literature_reading') === 'literature_reading');
            const addReadingBtn = createEl('button', 'td-add-reading', existingReadingTask ? '已加入论文研读' : '＋ 添加到论文研读');
            addReadingBtn.type = 'button';
            addReadingBtn.title = `为当前文献创建论文研读待办，默认 ${LiteratureWorkflow.days(host.getPref('defaultDueDays', 7))} 天后截止`;
            addReadingBtn.setAttribute('aria-label', '添加到论文研读');
            addReadingBtn.disabled = Boolean(existingReadingTask || state?.saving);
            if (addReadingBtn.disabled) addReadingBtn.style.opacity = '0.65';
            const addHint = createEl('div', 'td-add-hint', existingReadingTask
              ? `已关联当前文献 · 截止日期：${existingReadingTask.dueDate || '未设置'}`
              : `点击即可创建待办并关联当前文献 · 默认 ${LiteratureWorkflow.days(host.getPref('defaultDueDays', 7))} 天后截止`);
            addHint.setAttribute('role', 'status');
            addHint.setAttribute('aria-live', 'polite');
            wrapper.appendChild(addReadingBtn);
            wrapper.appendChild(addHint);

            let saving = false;
            const handleQuickAdd = async (useLiteratureTitle = false) => {
              if (saving || state?.saving || (useLiteratureTitle && existingReadingTask)) return;
              const text = useLiteratureTitle ? '' : quickInput.value.trim();
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
                  title: text, priority: selectedPrio,
                  academicType: useLiteratureTitle ? 'literature_reading' : host.getPref('defaultTaskType', 'literature_reading')
                });
                if (!useLiteratureTitle) {
                  quickInput.value = '';
                  if (state?.itemKey === target.key && state?.libraryID === target.libraryID) state.quickDraft = '';
                }
                host.showNotice(result.created ? '已加入待办事项' : '该文献已加入待办', `截止日期：${result.task.dueDate || '未设置'}`);
              } catch (error) {
                addHint.textContent = '保存失败，请重试。';
                host.showNotice('保存失败', String(error));
                return;
              } finally {
                saving = false;
                if (state) state.saving = false;
                addReadingBtn.disabled = Boolean(existingReadingTask);
                addReadingBtn.style.opacity = addReadingBtn.disabled ? '0.65' : '1';
                quickBtn.disabled = false;
                quickInput.disabled = false;
                prioSelect.disabled = false;
              }
              await state?.refresh?.();
            };

            addReadingBtn.addEventListener('click', () => {
              handleQuickAdd(true).catch(error => Zotero.logError?.('[TaskFlow] Quick add refresh failed: ' + error));
            });

            quickInput.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickAdd().catch(error => Zotero.logError?.('[TaskFlow] Quick add refresh failed: ' + error));
              }
            });
            quickBtn.addEventListener('click', (e) => {
              e.preventDefault();
              handleQuickAdd().catch(error => Zotero.logError?.('[TaskFlow] Quick add refresh failed: ' + error));
            });

            const quickLabel = createEl('label', 'td-quick-label', '快速新建待办');
            quickLabel.setAttribute('for', 'td-quick-input');
            wrapper.appendChild(quickLabel);
            quickBox.appendChild(prioSelect);
            quickBox.appendChild(quickInput);
            quickBox.appendChild(quickBtn);
            wrapper.appendChild(quickBox);

            const profileBox = createEl('label', 'td-reading-profile', '研读模板');
            const profileSelect = createEl('select');
            profileSelect.setAttribute('aria-label', '研读模板');
            const selectedProfile = state?.profileID || tasks.find(task => task.readingProfile)?.readingProfile || host.getPref('readingProfile', 'general');
            for (const [id, profile] of Object.entries(LiteratureWorkflow.profiles)) {
              const option = createEl('option', '', (profile as any).label); option.value = id;
              option.selected = id === selectedProfile;
              profileSelect.appendChild(option);
            }
            profileSelect.addEventListener('change', () => { if (state) state.profileID = profileSelect.value; });
            profileBox.appendChild(profileSelect); wrapper.appendChild(profileBox);

            // 2. Empty State Card
            if (total === 0) {
              const emptyCard = createEl('div', 'td-empty-card');

              const emptyDesc = createEl('div', 'td-empty-desc', '点击上方“添加到论文研读”或在输入框新建待办；也可按所选模板一键生成 5 步精读清单');

              const btnCreateMilestones = createEl('button', 'td-btn-milestone-primary', '生成精读清单');
              btnCreateMilestones.type = 'button';
              btnCreateMilestones.title = '按所选研读模板为本文献建立精读清单';
              btnCreateMilestones.addEventListener('click', async (e) => {
                e.stopPropagation();
                await host.createReadingMilestones(target, Zotero.getMainWindow?.(), profileSelect.value);
                state?.refresh?.();
              });

              emptyCard.appendChild(emptyDesc);
              emptyCard.appendChild(btnCreateMilestones);
              wrapper.appendChild(emptyCard);
            }

            // 3. Task List Inside Pane
            if (total > 0) {
              const taskList = createEl('div', 'td-task-list');
              const showSubtasks = host.getPref('itemPaneShowSubtasks', true);

              for (const t of tasks) {
                const taskCard = createEl('div', `td-task-card ${t.completed ? 'is-completed' : ''}`);
                taskCard.dataset.taskId = t.id;

                const row = createEl('div', 'td-task-row');
                // Keep the title and removal together. Navigation and secondary
                // controls wrap on their own row to leave room for long titles.
                const controls = createEl('div', 'td-task-controls');

                // Priority dot
                const prio = t.priority || 'medium';
                const prioDot = createEl('span', `td-prio-dot td-prio-${prio}`);
                const prioLabel = prio === 'high' ? '高' : (prio === 'low' ? '低' : '中');
                prioDot.title = `优先级: ${prioLabel}`;
                row.appendChild(prioDot);

                // Checkbox
                const checkbox = createEl('input', 'td-checkbox');
                checkbox.type = 'checkbox';
                checkbox.setAttribute('aria-label', t.title);
                checkbox.checked = Boolean(t.completed);
                checkbox.title = t.completed ? '标记为未完成' : '标记为已完成';
                checkbox.addEventListener('change', async (e) => {
                  e.stopPropagation();
                  try {
                    await host.updateTaskState(t.id, current => ({ completed: checkbox.checked,
                      completedAt: checkbox.checked ? new Date().toISOString() : null,
                      status: checkbox.checked ? 'done' : 'todo',
                      subtasks: (current.subtasks || []).map(sub => ({ ...sub, completed: checkbox.checked ? true : sub.completed })) }));
                  } catch (error) { checkbox.checked = t.completed; host.showNotice('保存失败', String(error)); return; }
                  await host.tagItemOnTaskEvent(target.key, 'complete_check', target.libraryID);
                  if (host.getPref('autoSyncChildNote', true)) {
                    await host.syncTasksToChildNote(target);
                  }
                  state?.refresh?.();
                });
                row.appendChild(checkbox);

                // Title
                const titleSpan = createEl('button', `td-task-title ${t.completed ? 'is-done' : ''}`, t.title);
                titleSpan.type = 'button';
                titleSpan.title = `${t.title} (点击在看板中查看详情)`;
                titleSpan.addEventListener('click', () => {
                  host.openTaskFlow({ mode: 'view_task', taskId: t.id }, Zotero.getMainWindow?.());
                });
                row.appendChild(titleSpan);

                // Keep task removal directly on the task row; this removes only
                // the TaskFlow record, never the linked Zotero library item.
                const delBtn = createEl('button', 'td-task-delete');
                delBtn.type = 'button';
                delBtn.textContent = '移除';
                delBtn.setAttribute('aria-label', `从 TaskFlow 移除任务并保留 Zotero 文献：${t.title}`);
                delBtn.title = '仅移除此 TaskFlow 任务，不删除 Zotero 文献';
                delBtn.addEventListener('click', async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (delBtn.disabled) return;
                  delBtn.disabled = true;
                  try {
                    await host.saveData({ taskChanges: { deleted: [t.id] } });
                    host._paneDeleted ||= [];
                    host._paneDeleted.push(host.cloneData(t));
                    clearTimeout(host._paneUndoTimer);
                    host._paneUndoTimer = setTimeout(() => { host._paneDeleted = []; host.notifyDataChanged(); }, 8000);
                  } catch (error) {
                    delBtn.disabled = false;
                    host.showNotice('删除失败', String(error));
                    return;
                  }
                  await host.tagItemOnTaskEvent(target.key, 'complete_check', target.libraryID);
                  if (host.getPref('autoSyncChildNote', true)) {
                    await host.syncTasksToChildNote(target);
                  }
                  state?.refresh?.();
                });
                row.appendChild(delBtn);

                if (t.zoteroItemKey) {
                  const locateButton = createEl('button', 'td-task-locate', '↗ Zotero');
                  locateButton.type = 'button';
                  locateButton.title = '在 Zotero 文献库中定位这篇文献';
                  locateButton.setAttribute('aria-label', `跳转到文献：${t.zoteroItemTitle || t.title}`);
                  locateButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    host.locateLiteratureItem(t.zoteroUri || t.zoteroItemKey, t.zoteroLibraryID, Zotero.getMainWindow?.())
                      .catch(error => host.showNotice('无法跳转文献', String(error)));
                  });
                  controls.appendChild(locateButton);
                }

                // Due date badge
                if (t.dueDate) {
                  const todayStr = host.localDateString(new Date());
                  const isOverdue = !t.completed && t.dueDate < todayStr;
                  const dateText = (isOverdue ? '逾期 · ' : '') + (t.dueDate.length > 5 ? t.dueDate.slice(5) : t.dueDate);
                  const dueBadge = createEl('span', `td-badge-date ${isOverdue ? 'is-overdue' : ''}`, dateText);
                  dueBadge.title = isOverdue ? `已逾期！截止日期: ${t.dueDate}` : `截止日期: ${t.dueDate}`;
                  controls.appendChild(dueBadge);
                }

                // Subtask toggle button if subtasks exist
                let subList = null;
                if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
                  const doneSubs = t.subtasks.filter((s) => s.completed).length;
                  const subToggle = createEl('button', 'td-subtask-toggle', `子任务 ${doneSubs}/${t.subtasks.length}`);
                  subToggle.type = 'button';
                  subToggle.title = '展开/收起子任务清单';
                  const expanded = state?.expandedTasks.get(t.id) ?? showSubtasks;
                  subToggle.setAttribute('aria-expanded', String(expanded));
                  controls.appendChild(subToggle);

                  subList = createEl('div', 'td-subtask-list');
                  if (!expanded) subList.style.display = 'none';

                  subToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isHidden = subList.style.display === 'none';
                    subList.style.display = isHidden ? 'flex' : 'none';
                    subToggle.setAttribute('aria-expanded', String(isHidden));
                    state?.expandedTasks.set(t.id, isHidden);
                  });

                  for (const sub of t.subtasks) {
                    const subRow = createEl('div', 'td-subtask-item');

                    const subCheck = createEl('input', 'td-checkbox');
                    subCheck.type = 'checkbox';
                    subCheck.setAttribute('aria-label', sub.title);
                    subCheck.checked = Boolean(sub.completed);
                    subCheck.addEventListener('change', async (e) => {
                      e.stopPropagation();
                      try {
                        await host.updateTaskState(t.id, current => {
                          const subtasks = (current.subtasks || []).map(st => st.id === sub.id ? { ...st, completed: subCheck.checked } : st);
                          const completed = subtasks.every(st => st.completed);
                          return { subtasks, completed, completedAt: completed ? (current.completedAt || new Date().toISOString()) : null,
                            status: completed ? 'done' : 'todo' };
                        });
                      } catch (error) { subCheck.checked = sub.completed; host.showNotice('保存失败', String(error)); return; }
                      await host.tagItemOnTaskEvent(target.key, 'complete_check', target.libraryID);
                      if (host.getPref('autoSyncChildNote', true) && host.getPref('childNoteAutoUpdateOnSubtask', true)) {
                        await host.syncTasksToChildNote(target);
                      }
                      state?.refresh?.();
                    });

                    const subSpan = createEl('span', `td-subtask-title ${sub.completed ? 'is-done' : ''}`, sub.title);
                    subRow.appendChild(subCheck);
                    subRow.appendChild(subSpan);
                    subList.appendChild(subRow);
                  }
                }

                taskCard.appendChild(row);
                const editBtn = createEl('button', 'td-task-edit', '编辑'); editBtn.type = 'button';
                editBtn.addEventListener('click', () => host.openTaskFlow({ mode: 'edit_task', taskId: t.id }, Zotero.getMainWindow?.()));
                controls.appendChild(editBtn);
                if (!t.completed) {
                  const menu = createEl('details', 'td-reschedule');
                  const summary = createEl('summary', '', '改期'); menu.appendChild(summary);
                  for (const [days, label] of [[0, '今天'], [3, '延后三天'], [7, '延后一周']]) {
                    const dateBtn = createEl('button', 'td-reschedule-option', label); dateBtn.type = 'button';
                    dateBtn.title = days ? '从当前截止日期延后；未设置或已逾期时从今天计算' : '截止日期设为今天';
                    dateBtn.addEventListener('click', async () => {
                      if (dateBtn.disabled) return;
                      menu.querySelectorAll('button').forEach(btn => { btn.disabled = true; });
                      try {
                        await host.rescheduleLiteratureTask(t.id, days, Number(days) > 0);
                        menu.open = false;
                      } catch (error) { host.showNotice('改期失败', String(error)); }
                      finally { menu.querySelectorAll('button').forEach(btn => { btn.disabled = false; }); }
                      Promise.resolve(state?.refresh?.()).catch(error => Zotero.logError?.('[TaskFlow] 改期刷新失败: ' + error));
                    });
                    menu.appendChild(dateBtn);
                  }
                  controls.appendChild(menu);
                }
                if (t.zoteroPdfUri || t.zoteroAnnotationKey) {
                  const pdfBtn = createEl('button', 'td-task-pdf', t.zoteroAnnotationKey ? '回到批注' : '打开 PDF'); pdfBtn.type = 'button';
                  pdfBtn.addEventListener('click', () => host.openTaskPdf(t).catch(error => host.showNotice('打开 PDF 失败', String(error))));
                  controls.appendChild(pdfBtn);
                }
                taskCard.appendChild(controls);
                if (subList) taskCard.appendChild(subList);
                taskList.appendChild(taskCard);
              }
              wrapper.appendChild(taskList);
            }

            if (host._paneDeleted?.length) {
              const undoBtn = createEl('button', 'td-subtask-toggle', '撤销删除（8 秒内）');
              undoBtn.type = 'button';
              undoBtn.addEventListener('click', async () => {
                if (undoBtn.disabled) return;
                undoBtn.disabled = true;
                try {
                  const restored = host._paneDeleted;
                  await host.saveData({ taskChanges: { added: restored } });
                  host._paneDeleted = [];
                  clearTimeout(host._paneUndoTimer);
                  for (const task of restored) await host.tagItemOnTaskEvent(task.zoteroItemKey, 'complete_check', task.zoteroLibraryID);
                  if (host.getPref('autoSyncChildNote', true)) await host.syncTasksToChildNote(target);
                  state?.refresh?.();
                } catch (error) { undoBtn.disabled = false; host.showNotice('恢复失败', String(error)); }
              });
              wrapper.appendChild(undoBtn);
            }

            // 4. Action Buttons Grid (2 Columns, perfectly aligned, no overflow)
            const actionGrid = createEl('div', 'td-action-grid');

            const btnOpenBoard = createEl('button', 'td-action-btn td-action-workspace', '待办看板');
            btnOpenBoard.type = 'button';
            btnOpenBoard.title = '在主标签页中打开 TaskFlow 任务看板';
            btnOpenBoard.addEventListener('click', () => {
              host.openTaskFlow({ mode: 'filter_item', itemKey: target.key }, Zotero.getMainWindow?.());
            });
            actionGrid.appendChild(btnOpenBoard);

            const btnSubwin = createEl('button', 'td-action-btn td-action-workspace', '伴读窗口');
            btnSubwin.type = 'button';
            btnSubwin.title = '打开轻量伴读窗口，适合与 PDF 左右分屏对照';
            btnSubwin.addEventListener('click', () => {
              host.openStandaloneWindow({ mode: 'filter_item', itemKey: target.key }, Zotero.getMainWindow?.(), 'subwindow');
            });
            actionGrid.appendChild(btnSubwin);

            const btnSyncNote = createEl('button', 'td-action-btn td-action-notes', '同步子笔记');
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
              const btnPdf = createEl('button', 'td-action-btn td-action-btn-pdf', '打开 PDF');
              btnPdf.type = 'button';
              btnPdf.title = '在 Zotero 内置阅读器中打开该文献的 PDF 全文';
              btnPdf.addEventListener('click', () => {
                host.openPdfAttachment(target);
              });
              actionGrid.appendChild(btnPdf);
            }

            // If tasks already exist, offer the reading milestones action across the bottom row
            if (total > 0) {
              const btnMilestones = createEl('button', 'td-action-btn td-action-reading td-action-btn-milestones-row', '追加精读清单');
              btnMilestones.type = 'button';
              btnMilestones.title = '按当前研读模板为本文献追加生成 5 项精读里程碑待办';
              btnMilestones.addEventListener('click', async () => {
                await host.createReadingMilestones(target, Zotero.getMainWindow?.(), profileSelect.value);
                state?.refresh?.();
              });
              actionGrid.appendChild(btnMilestones);
            }

            wrapper.appendChild(actionGrid);
            body.appendChild(wrapper);
          },
        });
      } catch (error) {
        Zotero.logError?.('[TaskFlow] Could not register ItemPane section: ' + error);
      }

    }
  };

  
if (typeof Zotero !== 'undefined') {
  Zotero.TaskFlowItemPane = TaskFlowItemPane;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).TaskFlowItemPane = TaskFlowItemPane;
}

export { TaskFlowItemPane };
