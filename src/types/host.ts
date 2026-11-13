import type {
  ActiveTimerRecord,
  CustomTagRecord,
  CustomTemplateRecord,
  DiagnosticRecord,
  ImportMode,
  NotificationLeaseRecord,
  SaveDataPatch,
  TaskFlowData,
  TaskRecord
} from './models';

export interface ToolbarRetryState {
  cancelled: boolean;
  timers: Set<ReturnType<typeof setTimeout>>;
}

export interface ZoteroItemCreator {
  firstName?: string;
  lastName?: string;
  name?: string;
}

export interface ZoteroTagEntry {
  tag?: string;
}

export interface ZoteroItemLike {
  id: number | string;
  key?: string;
  libraryID: number;
  parentID?: number | string;
  parentItemID?: number | string;
  deleted?: boolean;
  title?: string;
  date?: string;
  publicationTitle?: string;
  contentType?: string;
  annotationText?: string;
  annotationComment?: string;
  annotationPosition?: string;
  topLevelItem?: ZoteroItemLike | null;
  isRegularItem?: () => boolean;
  isAttachment?: () => boolean;
  isPDFAttachment?: () => boolean;
  isNote?: () => boolean;
  isAnnotation?: () => boolean;
  isEditable?: () => boolean;
  getField?: (field: string) => string;
  getCreators?: () => ZoteroItemCreator[];
  getTags?: () => Array<ZoteroTagEntry | string>;
  getAttachments?: () => Array<number | string>;
  getNotes?: () => Array<number | string>;
  getNote?: () => string;
  setNote?: (html: string) => void;
  hasTag?: (tag: string) => boolean;
  addTag?: (tag: string) => void;
  removeTag?: (tag: string) => void;
  saveTx?: () => Promise<unknown>;
}

export interface ZoteroCollectionLike {
  id: number | string;
  key: string;
  name: string;
  parentID?: number | string | null;
  getChildItems?: (asIDs?: boolean) => ZoteroItemLike[];
  getChildItemsCount?: () => number;
}

export type { ActiveTimerRecord, CustomTagRecord, CustomTemplateRecord, ImportMode, NotificationLeaseRecord };

export interface TaskFlowHostLike {
  _cachedData: TaskFlowData | null;
  _shuttingDown?: boolean;
  _menuManagerId?: unknown;
  _paneDeleted?: TaskRecord[];
  _paneUndoTimer?: ReturnType<typeof setTimeout> | null;
  _uiClients?: Set<Window>;
  _hostController?: AbortController | null;
  _standaloneTimers?: Set<ReturnType<typeof setTimeout>>;
  getPref(key: string, defaultVal: boolean): boolean;
  getPref(key: string, defaultVal: number): number;
  getPref(key: string, defaultVal: string): string;
  getPref(key: string, defaultVal?: unknown): unknown;
  setPref(key: string, val: unknown): void;
  loadData(): Promise<TaskFlowData>;
  saveData(patch: SaveDataPatch): Promise<TaskFlowData>;
  cloneData<T>(data: T): T;
  updateTaskState(
    id: string,
    change: Partial<TaskRecord> | ((task: TaskRecord) => Partial<TaskRecord>)
  ): Promise<TaskRecord | null>;
  notifyDataChanged(): void;
  localDateString(date: Date): string;
  showNotice(headline: string, description?: string, timeout?: number): boolean;
  recordDiagnostic(record: DiagnosticRecord): Promise<unknown>;
  getHostTheme(): 'light' | 'dark';
  ensureLocalization(doc: Document): void;
  ensureItemPaneStyles(doc: Document): void;
  createXULElement(doc: Document, tagName: string): Element;
  isMainWindow(win: Window): boolean;
  isReaderWindow(win: Window): boolean;
  setElementVisibility(elem: Element | null, visible: boolean): void;
  registerDataListener(listener: (data: TaskFlowData) => void, options?: { signal?: AbortSignal }): void;
  unregisterDataListener(listener: (data: TaskFlowData) => void): void;
  getSelectedRegularItems(win?: Window | null): ZoteroItemLike[];
  getCurrentActiveItem(win?: Window | null): ZoteroItemLike | null;
  getZoteroCollections(libraryID?: number | string | null): Array<{
    id: number | string;
    key: string;
    name: string;
    parentID: number | string | null | undefined;
    itemCount: number;
  }>;
  triggerTaskFlowOpen(win?: Window | null): void;
  openTaskFlow(options?: Record<string, unknown>, targetWindow?: Window | null): void;
  openTodolist(options?: Record<string, unknown>, targetWindow?: Window | null): void;
  openStandaloneWindow(options?: Record<string, unknown>, targetWindow?: Window | null, windowType?: string): void;
  openPreferencesPane(win?: Window | null): void;
  switchWindowMode(mode: string, win?: Window | null): void;
  createTaskFromSelection(win?: Window | null, doc?: Document | null, itemMenu?: Element | null, items?: unknown[] | null): void;
  createTaskFromReader(win?: Window | null, sourceReader?: unknown, selection?: unknown): Promise<void>;
  addLiteratureReadingTask(item: unknown, options?: Record<string, unknown>): Promise<{ task: TaskRecord | undefined; created: boolean }>;
  addSelectedLiteratureTasks(win?: Window | null, items?: unknown[] | null): Promise<{ added: number; skipped: number }>;
  addDroppedLiteratureTasks(itemIDs: unknown): Promise<{ added: number; skipped: number; ignored: number }>;
  rescheduleLiteratureTask(taskID: string, days: number, fromDeadline?: boolean): Promise<TaskRecord | undefined>;
  createCollectionReadingPlan(collection: ZoteroCollectionLike, win?: Window | null): Promise<void>;
  createReadingMilestones(item: unknown, win?: Window | null, profileID?: string | null): Promise<{ task: TaskRecord | undefined; created: boolean }>;
  locateLiteratureItem(reference: unknown, libraryID?: unknown, ownerWindow?: Window | null): Promise<boolean>;
  openPdfAttachment(item: unknown, page?: number | string | null, annotationKey?: string | null): Promise<boolean>;
  openTaskPdf(task: Partial<TaskRecord> | null | undefined): Promise<boolean>;
  syncTasksToChildNote(item: unknown, tasks?: TaskRecord[] | null, options?: { silent?: boolean }): Promise<ZoteroItemLike | null>;
  tagItemOnTaskEvent(itemKey: string, eventType: string, libraryID?: unknown): Promise<void>;
  exportData(format?: string): Promise<string | null>;
  importDataFile(mode?: string, win?: Window | null): Promise<{ success: boolean; count?: number; error?: string; cancelled?: boolean }>;
  clearAllData(win?: Window | null): Promise<boolean>;
  copyTasksSummary(win?: Window | null): Promise<boolean>;
  printTasks(win?: Window | null): Promise<void>;
}
