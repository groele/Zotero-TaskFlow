/**
 * Zotero TaskFlow - Host Message Bridge Tool Group
 * Bridges iframe, sidepanel, and subwindow postMessages to host runtime services.
 */

import { resolveItemReference, serializeLiteratureItem } from '../../utils';

declare let Zotero: any;

export function setupHostMessageBridge(host: any, window: any, windowElements: any[]): void {
  const handleHostMessage = async (event: MessageEvent) => {
    try {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (typeof data.type !== 'string' || (!data.type.startsWith('TASKFLOW_') && !data.type.startsWith('TODOLIST_'))) {
        return;
      }

      const sourceWin = event.source as any;
      const iframe = window.document.getElementById('todolist-tab-iframe');
      if (sourceWin && sourceWin !== iframe?.contentWindow) {
        let sourceURL: string;
        try {
          sourceURL = String(sourceWin.location?.href || '');
        } catch (_) {
          return;
        }
        if (!/^chrome:\/\/(?:taskflow|todolist)\/content\/(?:index|sidepanel)\.html(?:[?#]|$)/.test(sourceURL)) return;
      }
      if (!sourceWin && !iframe?.contentWindow) return;

      if ((data.type === 'TASKFLOW_DIAGNOSTIC' || data.type === 'TODOLIST_DIAGNOSTIC') && data.record) {
        host.recordDiagnostic(data.record);
        return;
      }

      if (iframe && (event.source === iframe.contentWindow || !sourceWin)) {
        iframe._todolistReady = true;
      }

      const replyResult = (msgObj: any) => {
        try {
          if (sourceWin && typeof sourceWin.postMessage === 'function') {
            sourceWin.postMessage(msgObj, '*');
          } else if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage(msgObj, '*');
          }
        } catch (_) {}
      };

      // A. Handshake Ready
      if (data.type === 'TASKFLOW_READY' || data.type === 'TODOLIST_READY') {
        host._uiClients ||= new Set();
        if (sourceWin) host._uiClients.add(sourceWin);
        if (iframe) iframe._todolistReady = true;
        host
          .loadData()
          .then((storedData: any) => {
            const pendingNav = iframe?._todolistPending || null;
            if (iframe) iframe._todolistPending = null;
            replyResult({
              type: 'TODOLIST_INIT_DATA',
              data: storedData,
              hostTheme: host.getHostTheme(),
              pending: pendingNav
            });
          })
          .catch((error: any) => {
            host.recordDiagnostic({ action: '初始化 Zotero 数据', message: String(error), stack: error?.stack });
            replyResult({ type: 'TODOLIST_INIT_ERROR', error: String(error?.message || error) });
          });
        return;
      }

      // B. Storage Save Request
      if ((data.type === 'TASKFLOW_STORAGE_SET' || data.type === 'TODOLIST_STORAGE_SET') && data.payload) {
        host
          .saveData(data.payload)
          .then((saved: any) => {
            if (data.requestId) {
              replyResult({
                type: 'TODOLIST_STORAGE_SET_RESULT',
                requestId: data.requestId,
                data: saved,
                success: true
              });
            }
          })
          .catch((error: any) =>
            replyResult({
              type: 'TODOLIST_STORAGE_SET_RESULT',
              requestId: data.requestId,
              success: false,
              error: String(error)
            })
          );
        return;
      }

      if (data.type === 'TASKFLOW_NOTIFY' || data.type === 'TODOLIST_NOTIFY') {
        const success = (await host.showNotice(data.title || '任务提醒', data.body || '')) !== false;
        replyResult({ type: 'TODOLIST_NOTIFY_RESULT', requestId: data.requestId, success });
        return;
      }

      // C. Locate and select item in Zotero library pane
      if ((data.type === 'TASKFLOW_LOCATE_ITEM' || data.type === 'TODOLIST_LOCATE_ITEM') && data.key) {
        await host.locateLiteratureItem(data.key, data.libraryID, window);
        return;
      }

      // D. Open PDF Reader in Zotero
      if ((data.type === 'TASKFLOW_OPEN_PDF' || data.type === 'TODOLIST_OPEN_PDF') && data.key) {
        await host.openTaskPdf({
          zoteroPdfUri: data.key,
          zoteroLibraryID: data.libraryID,
          zoteroPage: data.page,
          zoteroAnnotationKey: data.annotationKey
        });
        return;
      }

      // E. Open Zotero Preferences pane
      if (data.type === 'TASKFLOW_OPEN_PREFERENCES' || data.type === 'TODOLIST_OPEN_PREFERENCES') {
        await host.openPreferencesPane(window);
        return;
      }

      // F. Request active item from library or reader
      if (data.type === 'TASKFLOW_GET_ACTIVE_ITEM' || data.type === 'TODOLIST_GET_ACTIVE_ITEM') {
        const activeItem = host.getCurrentActiveItem(window);
        replyResult({
          type: 'TODOLIST_GET_ACTIVE_ITEM_RESULT',
          requestId: data.requestId,
          item: activeItem ? serializeLiteratureItem(activeItem) : null
        });
        return;
      }

      if (data.type === 'TASKFLOW_ADD_DROPPED_ITEMS' || data.type === 'TODOLIST_ADD_DROPPED_ITEMS') {
        try {
          const result = await host.addDroppedLiteratureTasks(data.itemIDs);
          replyResult({ type: 'TODOLIST_ADD_DROPPED_ITEMS_RESULT', requestId: data.requestId, success: true, result });
        } catch (error: any) {
          replyResult({
            type: 'TODOLIST_ADD_DROPPED_ITEMS_RESULT',
            requestId: data.requestId,
            success: false,
            error: String(error?.message || error)
          });
        }
        return;
      }

      // G. Sync tasks to Zotero child note
      if ((data.type === 'TASKFLOW_SYNC_NOTE' || data.type === 'TODOLIST_SYNC_NOTE') && data.key) {
        const item = resolveItemReference(data.key, data.libraryID);
        if (item) {
          const note = await host.syncTasksToChildNote(item);
          if (data.requestId) {
            replyResult({
              type: 'TODOLIST_SYNC_NOTE_RESULT',
              requestId: data.requestId,
              success: Boolean(note),
              noteId: note?.id
            });
          }
        }
        return;
      }

      // H. Get Zotero Collections
      if (data.type === 'TASKFLOW_GET_COLLECTIONS' || data.type === 'TODOLIST_GET_COLLECTIONS') {
        const collections = host.getZoteroCollections(data.libraryID);
        if (data.requestId) {
          replyResult({
            type: 'TODOLIST_GET_COLLECTIONS_RESULT',
            requestId: data.requestId,
            collections
          });
        }
        return;
      }

      // I. Create Collection Plan
      if (
        (data.type === 'TASKFLOW_CREATE_COLLECTION_PLAN' || data.type === 'TODOLIST_CREATE_COLLECTION_PLAN') &&
        data.collectionID
      ) {
        const col = Zotero.Collections?.get?.(data.collectionID);
        if (col) {
          await host.createCollectionReadingPlan(col, window);
        }
        return;
      }

      // J. Switch Window Mode
      if (
        (data.type === 'TASKFLOW_SWITCH_WINDOW_MODE' || data.type === 'TODOLIST_SWITCH_WINDOW_MODE') &&
        data.mode
      ) {
        await host.switchWindowMode(data.mode, window);
        return;
      }

      // K. Export Data
      if (data.type === 'TASKFLOW_EXPORT_DATA' || data.type === 'TODOLIST_EXPORT_DATA') {
        await host.exportData(data.format || 'json');
        return;
      }

      // L. Import Data
      if (data.type === 'TASKFLOW_IMPORT_DATA' || data.type === 'TODOLIST_IMPORT_DATA') {
        await host.importDataFile(data.mode || 'merge', window);
        return;
      }

      // M. Clear All Data
      if (data.type === 'TASKFLOW_CLEAR_DATA' || data.type === 'TODOLIST_CLEAR_DATA') {
        await host.clearAllData(window);
        return;
      }

      // N. Copy Tasks Summary
      if (data.type === 'TASKFLOW_COPY_SUMMARY' || data.type === 'TODOLIST_COPY_SUMMARY') {
        await host.copyTasksSummary(window);
        return;
      }

      // O. Print Tasks
      if (data.type === 'TASKFLOW_PRINT' || data.type === 'TODOLIST_PRINT') {
        await host.printTasks(window);
        return;
      }
    } catch (e: any) {
      Zotero.logError?.('[TaskFlow] Host message processing error: ' + e);
      host.recordDiagnostic({
        action: 'Zotero 主窗口 ' + event.data?.type,
        message: String(e?.message || e),
        stack: e?.stack
      });
      try {
        (event.source as any)?.postMessage(
          { requestId: event.data?.requestId, success: false, error: String(e?.message || e) },
          '*'
        );
      } catch (_) {}
    }
  };

  window.addEventListener('message', handleHostMessage);
  windowElements.push({
    remove: () => window.removeEventListener('message', handleHostMessage)
  });
}
