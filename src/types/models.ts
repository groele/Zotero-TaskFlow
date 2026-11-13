/**
 * Zotero TaskFlow - Domain & Host Data Models
 */

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in-progress' | 'overdue' | 'done';
export type RepeatPattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type WindowMode = 'tab' | 'subwindow' | 'window';
export type ImportMode = 'merge' | 'replace';

export interface SubtaskRecord {
  id: string;
  title: string;
  completed: boolean;
  [key: string]: unknown;
}

export interface TimeEntryRecord {
  date: string;
  duration: number;
}

export interface ReminderConfig {
  enabled?: boolean;
  before?: number;
  notified?: boolean;
  notifiedFor?: string;
}

export interface ActiveTimerRecord {
  sessionId?: string;
  startTime: number;
  elapsed?: number;
  [key: string]: unknown;
}

export interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: TaskPriority | string;
  category?: string;
  academicType?: string | null;
  status?: TaskStatus | string;
  statusExplicit?: boolean;
  repeat?: RepeatPattern | string | null;
  completed: boolean;
  createdAt?: string;
  completedAt?: string | null;
  order?: number;
  subtasks?: SubtaskRecord[];
  tags?: string[];
  timeEntries?: TimeEntryRecord[];
  reminder?: ReminderConfig;
  readingProfile?: string | null;
  literatureWorkflowId?: string | null;
  recurringFrom?: string;
  recurringGenerated?: boolean;
  zoteroItemKey?: string;
  zoteroItemID?: number | string;
  zoteroItemTitle?: string;
  zoteroAutoTitle?: boolean;
  zoteroAuthors?: string;
  zoteroLibraryID?: number;
  zoteroPublication?: string;
  zoteroYear?: string;
  zoteroUri?: string;
  zoteroPdfUri?: string | null;
  zoteroAttachmentKey?: string;
  zoteroAnnotationKey?: string | null;
  zoteroPage?: number | null;
  zoteroQuote?: string;
  zoteroLinkStatus?: 'active' | 'trashed' | 'missing' | string;
  [key: string]: unknown;
}

export interface CustomTagRecord {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface CustomTemplateTask {
  title: string;
  description?: string;
  priority?: string;
  category?: string;
  academicType?: string;
  readingProfile?: string;
  subtasks?: Array<{ title: string }>;
  tags?: string[];
  repeat?: string | null;
  [key: string]: unknown;
}

export interface CustomTemplateRecord {
  id: string;
  name: string;
  icon?: string;
  task: CustomTemplateTask;
}

export interface NotificationLeaseRecord {
  token: string;
  expiresAt: number;
  fingerprint?: string;
  date?: string;
  time?: string;
}

export interface NotificationClaimedTask {
  task: TaskRecord;
  key: string;
}

export interface NotificationActionResult {
  tasks: NotificationClaimedTask[];
  summary: boolean;
  key?: string;
}

export interface TaskFlowData {
  tasks: TaskRecord[];
  settings: Record<string, unknown>;
  customTags?: CustomTagRecord[];
  customTemplates?: CustomTemplateRecord[];
  searchHistory?: string[];
  history?: unknown[];
  activeTimers?: Record<string, ActiveTimerRecord>;
  notificationLeases?: Record<string, NotificationLeaseRecord>;
  lastSummaryDate?: string;
  tasksGeneration?: number;
  revision?: number;
  firstTimeShown?: boolean;
  importResult?: { imported: number };
  notificationResult?: NotificationActionResult;
  [key: string]: unknown;
}

export interface TaskUpdateEntry {
  id: string;
  changes: Partial<TaskRecord>;
  literatureRefresh?: boolean;
  originalTitle?: string;
  itemKey?: string;
  libraryID?: number;
}

export interface TaskChangesPatch {
  added?: TaskRecord[];
  updated?: TaskUpdateEntry[];
  deleted?: string[];
}

export interface CollectionChangesPatch<T> {
  added?: T[];
  deleted?: string[];
}

export interface TimerActionPatch {
  type: 'start' | 'stop' | 'stop_all';
  taskId?: string;
  timer?: ActiveTimerRecord;
  startTime?: number;
  stoppedAt?: number;
  sessionId?: string;
}

export interface NotificationActionPatch {
  type: 'claim' | 'validate' | 'ack' | 'release';
  kind: 'reminders' | 'summary';
  token: string;
  now: number;
  key?: string;
}

export interface RescheduleTaskPatch {
  taskID: string;
  days: number;
  fromDeadline?: boolean;
}

export interface TaskUpdaterPatch {
  id: string;
  updater: (task: TaskRecord) => Partial<TaskRecord> | null | undefined;
}

export interface SaveDataPatch {
  tasks?: TaskRecord[];
  settings?: Record<string, unknown>;
  replaceSettings?: boolean;
  customTags?: CustomTagRecord[];
  customTemplates?: CustomTemplateRecord[];
  customTagChanges?: CollectionChangesPatch<CustomTagRecord>;
  customTemplateChanges?: CollectionChangesPatch<CustomTemplateRecord>;
  searchHistory?: string[];
  searchHistoryAdd?: string;
  history?: unknown[];
  activeTimers?: Record<string, ActiveTimerRecord>;
  activeTimerChanges?: Record<string, ActiveTimerRecord | null>;
  notificationLeases?: Record<string, NotificationLeaseRecord>;
  taskChanges?: TaskChangesPatch;
  taskUpdater?: TaskUpdaterPatch;
  expectedTasksGeneration?: number;
  deduplicateLiterature?: boolean | 'item';
  rescheduleTask?: RescheduleTaskPatch;
  timerAction?: TimerActionPatch;
  notificationAction?: NotificationActionPatch;
  importRequest?: { payload: unknown; mode: ImportMode | string };
  syncLinkedItems?: boolean;
  firstTimeShown?: boolean;
  [key: string]: unknown;
}

export interface SerializedLiteratureItem {
  key: string;
  id: number | string;
  libraryID: number;
  title: string;
  authors: string;
  year: string;
  publication: string;
  tags: string[];
  zoteroUri: string;
  pdfUri: string | null;
}

export interface DiagnosticRecord {
  action?: string;
  message?: string;
  cause?: string;
  stack?: string;
  page?: string;
}

export interface ItemPaneState {
  itemKey: string | null;
  libraryID: number | null;
  renderVersion: number;
  quickDraft: string;
  quickPriority: string | null;
  profileID?: string | null;
  expandedTasks: Map<string, boolean>;
  saving: boolean;
  refresh?: () => unknown;
  onDataChanged?: () => void;
  sectionController?: AbortController;
  itemController?: AbortController;
  renderController?: AbortController;
}

export interface ReadingProfile {
  label: string;
  steps: string[];
}

export type {
  ToolbarRetryState,
  ZoteroItemCreator,
  ZoteroTagEntry,
  ZoteroItemLike,
  ZoteroCollectionLike,
  TaskFlowHostLike
} from './host';
