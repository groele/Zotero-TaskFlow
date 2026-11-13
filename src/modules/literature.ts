/**
 * Zotero TaskFlow - Literature Orchestration Module
 * Deconstructed into Literature Task Mapping, Planning & State Synchronization submodules.
 */

import { TaskFlowLiteratureTasks } from './literatureTasks';
import { TaskFlowItemPane } from '../itemPane';
import type { TaskRecord, ZoteroCollectionLike, ZoteroItemLike } from '../types/models';
import {
  buildLiteratureTask,
  addLiteratureReadingTask,
  addLiteratureTasks,
  addSelectedLiteratureTasks,
  addDroppedLiteratureTasks,
  rescheduleLiteratureTask
} from './literature/literatureMapping';
import {
  createCollectionReadingPlan,
  createTaskFromReader,
  createReadingMilestones
} from './literature/literaturePlan';
import {
  syncTasksToChildNote,
  tagItemOnTaskEvent,
  refreshLinkedLiterature
} from './literature/literatureSync';

export class TaskFlowLiterature extends TaskFlowLiteratureTasks {
  buildLiteratureTask(
    item: ZoteroItemLike | number | string | null | undefined,
    options: Record<string, unknown> = {}
  ): TaskRecord {
    return buildLiteratureTask(this, item, options);
  }

  addLiteratureReadingTask(
    item: unknown,
    options: Record<string, unknown> = {}
  ): Promise<{ task: TaskRecord | undefined; created: boolean }> {
    return addLiteratureReadingTask(this, item, options);
  }

  addLiteratureTasks(selected: unknown[]): Promise<{ added: number; skipped: number }> {
    return addLiteratureTasks(this, selected);
  }

  addSelectedLiteratureTasks(
    window: Window | null = null,
    items: unknown[] | null = null
  ): Promise<{ added: number; skipped: number }> {
    return addSelectedLiteratureTasks(this, window, items);
  }

  addDroppedLiteratureTasks(itemIDs: unknown): Promise<{ added: number; skipped: number; ignored: number }> {
    return addDroppedLiteratureTasks(this, itemIDs);
  }

  rescheduleLiteratureTask(
    taskID: string,
    days: number,
    fromDeadline: boolean = false
  ): Promise<TaskRecord | undefined> {
    return rescheduleLiteratureTask(this, taskID, days, fromDeadline);
  }

  createCollectionReadingPlan(collection: ZoteroCollectionLike, window: Window | null = null): Promise<void> {
    return createCollectionReadingPlan(this, collection, window);
  }

  createTaskFromReader(
    window: Window | null = null,
    sourceReader: unknown = null,
    selection: unknown = null
  ): Promise<void> {
    return createTaskFromReader(this, window, sourceReader, selection);
  }

  createReadingMilestones(
    item: unknown,
    window: Window | null = null,
    profileID: string | null = null
  ): Promise<{ task: TaskRecord | undefined; created: boolean }> {
    return createReadingMilestones(this, item, window, profileID);
  }

  syncTasksToChildNote(
    item: unknown,
    tasks: TaskRecord[] | null = null,
    options: { silent?: boolean } = {}
  ) {
    return syncTasksToChildNote(this, item, tasks, options);
  }

  tagItemOnTaskEvent(itemKey: string, eventType: string, libraryID: unknown = null): Promise<void> {
    return tagItemOnTaskEvent(this, itemKey, eventType, libraryID);
  }

  refreshLinkedLiterature(itemIDs: Set<unknown> | null = null, removed: Array<{ key: string; libraryID: number }> = []): Promise<number> {
    return refreshLinkedLiterature(this, itemIDs, removed);
  }

  registerItemPaneSection(): void {
    if (typeof Zotero !== 'undefined' && Zotero.TaskFlowItemPane?.registerItemPaneSection) {
      Zotero.TaskFlowItemPane.registerItemPaneSection(this);
      return;
    }
    if (typeof TaskFlowItemPane !== 'undefined' && TaskFlowItemPane.registerItemPaneSection) {
      TaskFlowItemPane.registerItemPaneSection(this);
    }
  }
}
