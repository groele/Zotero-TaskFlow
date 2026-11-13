/**
 * Zotero TaskFlow - ItemPane Integration Hub
 * Coordinates DOM view, context menus, drag-and-drop, quick add, and task scheduling.
 */

import { ADDON_ID, CHROME_ROOT } from '../config';
import { addAbortableListener, createScopedController, linkParentSignal } from '../lifecycle';
import { getLiteratureItem } from '../utils';
import { ensureItemPaneStyles, createEl, renderHeaderCard, renderActionGrid } from './domView';
import { setupPaneDragAndDrop } from './dragDrop';
import { renderQuickAddSection, renderProfileSection, renderEmptyCard } from './quickAdd';
import { renderFallback } from './fallbackView';
import { renderTaskList, handleUndoDelete } from './scheduler';
import type { ItemPaneState, TaskFlowData, TaskFlowHostLike, TaskRecord, ZoteroItemLike } from '../types/models';

interface SectionHookArgs {
  doc?: Document;
  body: HTMLElement;
  item?: ZoteroItemLike | null;
  refresh?: () => unknown;
  setEnabled?: (enabled: boolean) => void;
  setSectionSummary?: (text: string) => void;
}

function resetRenderController(state: ItemPaneState | undefined, doc?: Document | null): AbortSignal | undefined {
  if (!state) return undefined;
  state.renderController?.abort();
  const next = createScopedController(doc?.defaultView);
  linkParentSignal(next, state.sectionController?.signal);
  state.renderController = next;
  return next.signal;
}

function ensureItemController(
  state: ItemPaneState | undefined,
  doc: Document | null | undefined,
  itemKey: string | null,
  libraryID: number | null
): AbortSignal | undefined {
  if (!state) return undefined;
  const changed = state.itemKey !== itemKey || state.libraryID !== libraryID;
  if (changed || !state.itemController || state.itemController.signal.aborted) {
    state.itemController?.abort();
    const next = createScopedController(doc?.defaultView);
    linkParentSignal(next, state.sectionController?.signal);
    state.itemController = next;
  }
  return state.itemController.signal;
}

export const TaskFlowItemPane = {
  ensureItemPaneStyles(doc: Document): void {
    ensureItemPaneStyles(doc);
  },

  registerItemPaneSection(host: TaskFlowHostLike & { itemPaneSectionID?: unknown; getHostSignal?: () => AbortSignal | undefined }): void {
    if (!host.getPref('enableItemPane', true)) return;
    if (typeof Zotero.ItemPaneManager?.registerSection !== 'function') return;

    try {
      const sectionStates = new WeakMap<HTMLElement, ItemPaneState>();
      const icon = `${CHROME_ROOT}icons/taskflow.svg`;

      host.itemPaneSectionID = Zotero.ItemPaneManager.registerSection({
        paneID: 'todolist-item-pane',
        pluginID: ADDON_ID,
        header: { l10nID: 'todolist-item-pane-header', icon },
        sidenav: { l10nID: 'todolist-item-pane-sidenav', icon },
        onInit: ({ doc, body, item, refresh }: SectionHookArgs) => {
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
          const state: ItemPaneState = {
            itemKey: target?.key || null,
            libraryID: target?.libraryID || null,
            renderVersion: 0,
            quickDraft: '',
            quickPriority: null,
            expandedTasks: new Map(),
            saving: false,
            refresh,
            sectionController,
            itemController,
            onDataChanged: () => {
              Promise.resolve(refresh?.()).catch((err: unknown) => {
                Zotero.logError?.('[TaskFlow] ItemPane refresh failed: ' + err);
              });
            }
          };
          host.registerDataListener(state.onDataChanged!, { signal: sectionController.signal });
          sectionStates.set(body, state);
        },
        onDestroy: ({ body }: SectionHookArgs) => {
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
        onItemChange: ({ body, item, setEnabled }: SectionHookArgs) => {
          const target =
            getLiteratureItem(item) ||
            getLiteratureItem(Zotero.getMainWindow?.()?.ZoteroPane?.getSelectedItems?.()?.[0] as ZoteroItemLike);
          const state = sectionStates.get(body);
          if (state) {
            const nextKey = target?.key || null;
            const nextLib = target?.libraryID || null;
            if (state.itemKey !== nextKey || state.libraryID !== nextLib) {
              state.profileID = null;
              state.quickDraft = '';
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
        onRender: ({ body, item, setSectionSummary }: SectionHookArgs) => {
          if (!body) return;
          const document = body.ownerDocument;
          const target =
            getLiteratureItem(item) ||
            getLiteratureItem(Zotero.getMainWindow?.()?.ZoteroPane?.getSelectedItems?.()?.[0] as ZoteroItemLike);
          const state = sectionStates.get(body);
          setSectionSummary?.('文献研读待办');
          body.replaceChildren();

          const fallbackVersion = state ? ++state.renderVersion : 0;
          const renderSignal = resetRenderController(state, document);
          const fallback = renderFallback(document, target, state, host, fallbackVersion, renderSignal);
          body.appendChild(fallback);
        },
        onAsyncRender: async ({ doc, body, item, setSectionSummary }: SectionHookArgs) => {
          if (!body) return;
          const document = doc || body.ownerDocument;
          if (document) {
            host.ensureItemPaneStyles(document);
          }
          const target =
            getLiteratureItem(item) ||
            getLiteratureItem(Zotero.getMainWindow?.()?.ZoteroPane?.getSelectedItems?.()?.[0] as ZoteroItemLike);
          if (!target) return;

          const state = sectionStates.get(body);
          const renderVersion = state ? ++state.renderVersion : 0;
          const renderSignal = resetRenderController(state, document);

          let data: TaskFlowData;
          try {
            data = await host.loadData();
          } catch (error) {
            if ((state && renderVersion !== state.renderVersion) || renderSignal?.aborted) return;
            body.appendChild(createEl(document, 'div', 'td-add-hint', '待办数据读取失败，请重新选择条目后重试。'));
            Zotero.logError?.('[TaskFlow] ItemPane data load failed: ' + error);
            return;
          }
          if ((state && renderVersion !== state.renderVersion) || renderSignal?.aborted) return;
          body.replaceChildren();

          const targetKey = target.key;
          const userLib = Zotero.Libraries?.userLibraryID || 1;
          const tasks = (data.tasks || []).filter(
            (t: TaskRecord) =>
              t.zoteroItemKey === targetKey &&
              (t.zoteroLibraryID || userLib) === target.libraryID
          );
          const uncompletedTasks = tasks.filter((t: TaskRecord) => !t.completed);
          const total = tasks.length;
          const done = total - uncompletedTasks.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          setSectionSummary?.(total ? `${total} 项待办 · ${done}/${total} 完成` : '展开后快速新建');

          const wrapper = createEl(document, 'div', 'td-pane-wrap');
          const itemSignal = ensureItemController(state, document, target.key || null, target.libraryID || null);
          if (state) {
            state.itemKey = target.key || null;
            state.libraryID = target.libraryID || null;
          }
          setupPaneDragAndDrop(wrapper, target, host, state, itemSignal);

          // 1. Header & Progress Card
          const showProgressBar = Boolean(host.getPref('itemPaneShowProgressBar', true));
          wrapper.appendChild(renderHeaderCard(document, total, done, pct, showProgressBar));

          // 2. Quick Box & Priority Selection
          for (const el of renderQuickAddSection(document, target, host, state, uncompletedTasks, itemSignal)) {
            wrapper.appendChild(el);
          }

          // 3. Profile Select
          const profile = renderProfileSection(document, tasks, host, state, itemSignal);
          wrapper.appendChild(profile.box);

          // 4. Empty State Card
          if (total === 0) {
            wrapper.appendChild(renderEmptyCard(document, target, host, state, profile.select, itemSignal));
          }

          // 5. Task List Inside Pane
          if (total > 0) {
            wrapper.appendChild(renderTaskList(document, tasks, target, host, state, itemSignal));
          }

          // 6. Undo Deletion Banner
          if (host._paneDeleted?.length) {
            const undoBtn = createEl(document, 'button', 'td-subtask-toggle', '撤销删除（8 秒内）') as HTMLButtonElement;
            undoBtn.type = 'button';
            addAbortableListener(
              undoBtn,
              'click',
              () => {
                void handleUndoDelete(host, target, undoBtn, state);
              },
              undefined,
              itemSignal
            );
            wrapper.appendChild(undoBtn);
          }

          // 7. Action Buttons Grid
          wrapper.appendChild(renderActionGrid(document, target, total, host, state, profile.select, itemSignal));
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
const g = globalThis as Record<string, unknown>;
if (typeof g !== 'undefined') {
  g.TaskFlowItemPane = TaskFlowItemPane;
}

export default TaskFlowItemPane;
