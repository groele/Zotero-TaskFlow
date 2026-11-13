import { TaskFlowItemPane } from '../itemPane';
import { ADDON_ID } from '../config';
import type { DiagnosticRecord, TaskFlowData, TaskRecord, ZoteroCollectionLike, ZoteroItemLike } from '../types/models';

export class TaskFlowBase {
  rootURI: string = typeof rootURI !== 'undefined' ? rootURI : '';
  addonId: string = ADDON_ID;
  localizedDocs: Set<Document> = new Set();
  _cachedData: TaskFlowData | null = null;
  _loadPromise: Promise<TaskFlowData> | null = null;
  _dataListeners: Set<(data: TaskFlowData) => void> = new Set();
  _saveQueue: Promise<unknown> = Promise.resolve();
  _saveScheduled: ReturnType<typeof setTimeout> | null = null;
  _lastSavedData: TaskFlowData | null = null;
  _expectedTasksGeneration: number = 0;
  _cleaners: Set<() => void> = new Set();
  _standaloneDeliveryTimers: Set<ReturnType<typeof setTimeout>> = new Set();
  _standaloneTimers: Set<ReturnType<typeof setTimeout>> = new Set();
  _uiClients: Set<Window> = new Set();
  _hostController: AbortController | null = null;
  _paneDeleted: TaskRecord[] = [];
  _paneUndoTimer: ReturnType<typeof setTimeout> | null = null;
  _linkRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  _themeObserverAttached: boolean = false;
  _notifierID: string | number | null = null;
  _readerHookAttached: boolean = false;
  _readerInitHook: unknown = null;
  _shuttingDown: boolean = false;
  _menuManagerId: unknown = null;
  _diagnosticRecords: Array<Record<string, unknown>> | null = null;
  _diagnosticQueue: Promise<void> | null = null;
  itemPaneSectionID: string | number | null = null;

  getHostSignal(): AbortSignal | undefined {
    return this._hostController?.signal;
  }

  recordDiagnostic(record: DiagnosticRecord): Promise<void> {
    const entry = {
      time: new Date().toISOString(),
      version: typeof version !== 'undefined' ? version : 'unknown',
      action: String(record?.action || 'unknown').slice(0, 160),
      message: String(record?.message || '').slice(0, 2000),
      cause: String(record?.cause || '').slice(0, 2000),
      stack: String(record?.stack || '').slice(0, 8000),
      page: String(record?.page || '').slice(0, 300)
    };
    const run = async (): Promise<void> => {
      const file = PathUtils.join(Zotero.DataDirectory?.dir || PathUtils.profileDir, 'taskflow-debug.json');
      if (!this._diagnosticRecords) {
        try {
          let existing: unknown = null;
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
      await IOUtils.writeUTF8(file, JSON.stringify(this._diagnosticRecords, null, 2), { tmpPath: file + '.tmp' });
    };
    const result = (this._diagnosticQueue || Promise.resolve()).then(run);
    this._diagnosticQueue = result.catch((error: unknown) => {
      Zotero.logError?.('[TaskFlow] Diagnostic log write failed: ' + error);
    });
    return this._diagnosticQueue;
  }

  ensureLocalization(doc: Document | null | undefined): void {
    if (!doc || this.localizedDocs.has(doc)) return;
    const existing = doc.querySelector('link[rel="localization"][href="taskflow.ftl"]') ||
      doc.querySelector('link[rel="localization"][href="todolist.ftl"]');
    if (existing) return;
    try {
      doc.defaultView?.MozXULElement?.insertFTLIfNeeded('taskflow.ftl');
      if (doc.querySelector('link[rel="localization"][href="taskflow.ftl"]') ||
          doc.querySelector('link[rel="localization"][href="todolist.ftl"]')) {
        this.localizedDocs.add(doc);
      }
    } catch (error) {
      Zotero.logError?.('[TaskFlow] Could not load translations: ' + error);
    }
  }

  ensureItemPaneStyles(doc: Document | null | undefined): void {
    if (!doc) return;
    if (typeof Zotero !== 'undefined' && Zotero.TaskFlowItemPane?.ensureItemPaneStyles) {
      Zotero.TaskFlowItemPane.ensureItemPaneStyles(doc);
      return;
    }
    if (typeof TaskFlowItemPane !== 'undefined' && TaskFlowItemPane.ensureItemPaneStyles) {
      TaskFlowItemPane.ensureItemPaneStyles(doc);
    }
  }

  getPref(key: string, defaultVal: boolean): boolean;
  getPref(key: string, defaultVal: number): number;
  getPref(key: string, defaultVal: string): string;
  getPref(key: string, defaultVal?: unknown): unknown;
  getPref(key: string, defaultVal?: unknown): unknown {
    try {
      if (Zotero.Prefs) {
        const tfVal = Zotero.Prefs.get(`extensions.taskflow.${key}`, true);
        if (tfVal !== undefined) return tfVal;
      }
    } catch (_) {}
    return defaultVal;
  }

  setPref(key: string, val: unknown): void {
    try {
      if (Zotero.Prefs) {
        Zotero.Prefs.set(`extensions.taskflow.${key}`, val, true);
      }
    } catch (_) {}
  }

  showNotice(headline: string, description: string = '', timeout: number = 4000): boolean {
    try {
      if (!Zotero.ProgressWindow) {
        Zotero.log?.(`[TaskFlow] Notice: ${headline} - ${description}`);
        return false;
      }
      const progress = new Zotero.ProgressWindow({ closeOnClick: true });
      progress.changeHeadline(headline);
      if (description) progress.addDescription(description);
      progress.show();
      progress.startCloseTimer(timeout);
      return true;
    } catch (_) {
      Zotero.log?.(`[TaskFlow] Notice: ${headline} - ${description}`);
      return false;
    }
  }

  getHostTheme(): 'light' | 'dark' {
    try {
      return Zotero.getMainWindow?.()?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (_) {
      return 'light';
    }
  }

  // Forward declarations implemented on derived layers for clean TypeScript inheritance
  updateToolbarBadge(_doc: Document, _data?: TaskFlowData | null): void {}
  resolveItemReference(_ref: unknown, _libraryID?: unknown): ZoteroItemLike | null { return null; }
  async tagItemOnTaskEvent(_itemKey: string, _eventType: string, _libraryID?: unknown): Promise<void> {}
  async syncTasksToChildNote(
    _item: unknown,
    _tasks?: TaskRecord[] | null,
    _options?: { silent?: boolean }
  ): Promise<ZoteroItemLike | null> { return null; }
  async createReadingMilestones(
    _item: unknown,
    _win?: Window | null,
    _profileID?: string | null
  ): Promise<{ task: TaskRecord | undefined; created: boolean }> {
    return { task: undefined, created: false };
  }
  triggerTaskFlowOpen(_win?: Window | null): void {}
  openTaskFlow(_options?: Record<string, unknown>, _targetWindow?: Window | null): void {}
  openTodolist(_options?: Record<string, unknown>, _targetWindow?: Window | null): void {}
  openStandaloneWindow(_options?: Record<string, unknown>, _targetWindow?: Window | null, _windowType?: string): void {}
  openPreferencesPane(_win?: Window | null): void {}
  switchWindowMode(_mode: string, _win?: Window | null): void {}
  createTaskFromSelection(_win?: Window | null, _doc?: Document | null, _itemMenu?: Element | null, _items?: unknown[] | null): void {}
  async createTaskFromReader(_win?: Window | null, _sourceReader?: unknown, _selection?: unknown): Promise<void> {}
  getZoteroCollections(_libraryID?: number | string | null): Array<{
    id: number | string;
    key: string;
    name: string;
    parentID: number | string | null | undefined;
    itemCount: number;
  }> { return []; }
  getSelectedRegularItems(_win?: Window | null): ZoteroItemLike[] { return []; }
  getCurrentActiveItem(_win?: Window | null): ZoteroItemLike | null { return null; }
  isMainWindow(_win: Window): boolean { return false; }
  isReaderWindow(_win: Window): boolean { return false; }
  createXULElement(doc: Document, tagName: string): Element { return doc.createElement(tagName); }
  setElementVisibility(_elem: Element | null, _visible: boolean): void {}
  async addSelectedLiteratureTasks(_win?: Window | null, _items?: unknown[] | null): Promise<{ added: number; skipped: number }> {
    return { added: 0, skipped: 0 };
  }
  async createCollectionReadingPlan(_col: ZoteroCollectionLike, _win?: Window | null): Promise<void> {}
}
