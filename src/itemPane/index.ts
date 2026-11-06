/**
 * Zotero TaskFlow - ItemPane Integration Hub
 * Coordinates DOM view, context menus, drag-and-drop, quick add, and task scheduling.
 */

import { ADDON_ID, CHROME_ROOT } from '../config';
import { getLiteratureItem } from '../utils';
import { ensureItemPaneStyles, createEl, renderHeaderCard, renderActionGrid } from './domView';
import { setupPaneDragAndDrop } from './dragDrop';
import { renderQuickAddSection, renderProfileSection, renderEmptyCard } from './quickAdd';
import { renderTaskList, renderFallback, handleUndoDelete } from './scheduler';

declare let Zotero: any;

export const TaskFlowItemPane = {
  ensureItemPaneStyles(doc: Document): void {
    ensureItemPaneStyles(doc);
  },

  registerItemPaneSection(host: any): void {
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
        onInit: ({ doc, body, item, refresh }: any) => {
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
              Promise.resolve(refresh?.()).catch((err: any) => {
                Zotero.logError?.('[TaskFlow] ItemPane refresh failed: ' + err);
              });
            }
          };
          host.registerDataListener(state.onDataChanged);
          sectionStates.set(body, state);
        },
        onDestroy: ({ body }: any) => {
          const state = sectionStates.get(body);
          if (state) state.renderVersion++;
          if (state?.onDataChanged) {
            host.unregisterDataListener(state.onDataChanged);
          }
          sectionStates.delete(body);
        },
        onItemChange: ({ body, item, setEnabled }: any) => {
          const target =
            getLiteratureItem(item) ||
            getLiteratureItem(Zotero.getMainWindow?.()?.ZoteroPane?.getSelectedItems?.()?.[0]);
          const state = sectionStates.get(body);
          if (state) {
            if (state.itemKey !== target?.key || state.libraryID !== target?.libraryID) {
              (state as any).profileID = null;
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
        onRender: ({ body, item, setSectionSummary }: any) => {
          if (!body) return;
          const document = body.ownerDocument;
          const target =
            getLiteratureItem(item) ||
            getLiteratureItem(Zotero.getMainWindow?.()?.ZoteroPane?.getSelectedItems?.()?.[0]);
          const state = sectionStates.get(body);
          setSectionSummary?.('文献研读待办');
          body.replaceChildren();

          const fallbackVersion = state ? ++state.renderVersion : 0;
          const fallback = renderFallback(document, target, state, host, fallbackVersion);
          body.appendChild(fallback);
        },
        onAsyncRender: async ({ doc, body, item, setSectionSummary }: any) => {
          if (!body) return;
          const document = doc || body.ownerDocument;
          if (document) {
            host.ensureItemPaneStyles(document);
          }
          const target =
            getLiteratureItem(item) ||
            getLiteratureItem(Zotero.getMainWindow?.()?.ZoteroPane?.getSelectedItems?.()?.[0]);
          if (!target) return;

          const state = sectionStates.get(body);
          const renderVersion = state ? ++state.renderVersion : 0;

          let data: any;
          try {
            data = await host.loadData();
          } catch (error) {
            if (state && renderVersion !== state.renderVersion) return;
            body.appendChild(createEl(document, 'div', 'td-add-hint', '待办数据读取失败，请重新选择条目后重试。'));
            Zotero.logError?.('[TaskFlow] ItemPane data load failed: ' + error);
            return;
          }
          if (state && renderVersion !== state.renderVersion) return;
          body.replaceChildren();

          const targetKey = target.key;
          const tasks = (data.tasks || []).filter(
            (t: any) =>
              t.zoteroItemKey === targetKey &&
              (t.zoteroLibraryID || Zotero.Libraries.userLibraryID) === target.libraryID
          );
          const uncompletedTasks = tasks.filter((t: any) => !t.completed);
          const total = tasks.length;
          const done = total - uncompletedTasks.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          setSectionSummary?.(total ? `${total} 项待办 · ${done}/${total} 完成` : '展开后快速新建');

          const wrapper = createEl(document, 'div', 'td-pane-wrap');
          setupPaneDragAndDrop(wrapper, target, host, state);

          // 1. Header & Progress Card
          const showProgressBar = host.getPref('itemPaneShowProgressBar', true);
          wrapper.appendChild(renderHeaderCard(document, total, done, pct, showProgressBar));

          // 2. Quick Box & Priority Selection
          for (const el of renderQuickAddSection(document, target, host, state, uncompletedTasks)) {
            wrapper.appendChild(el);
          }

          // 3. Profile Select
          const profile = renderProfileSection(document, tasks, host, state);
          wrapper.appendChild(profile.box);

          // 4. Empty State Card
          if (total === 0) {
            wrapper.appendChild(renderEmptyCard(document, target, host, state, profile.select));
          }

          // 5. Task List Inside Pane
          if (total > 0) {
            wrapper.appendChild(renderTaskList(document, tasks, target, host, state));
          }

          // 6. Undo Deletion Banner
          if (host._paneDeleted?.length) {
            const undoBtn = createEl(document, 'button', 'td-subtask-toggle', '撤销删除（8 秒内）');
            undoBtn.type = 'button';
            undoBtn.addEventListener('click', () => {
              handleUndoDelete(host, target, undoBtn, state);
            });
            wrapper.appendChild(undoBtn);
          }

          // 7. Action Buttons Grid
          wrapper.appendChild(renderActionGrid(document, target, total, host, state, profile.select));
          body.appendChild(wrapper);
        }
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

export default TaskFlowItemPane;
