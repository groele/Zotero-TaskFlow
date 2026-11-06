/**
 * Zotero TaskFlow - Literature Orchestration Module
 * Deconstructed into Literature Task Mapping, Planning & State Synchronization submodules.
 */

import { TaskFlowLiteratureTasks } from './literatureTasks';
import { TaskFlowItemPane } from '../itemPane';
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

declare let Zotero: any;

export class TaskFlowLiterature extends TaskFlowLiteratureTasks {
  buildLiteratureTask(item: any, options: any = {}): any {
    return buildLiteratureTask(this, item, options);
  }

  addLiteratureReadingTask(item: any, options: any = {}): Promise<any> {
    return addLiteratureReadingTask(this, item, options);
  }

  addLiteratureTasks(selected: any[]): Promise<{ added: number; skipped: number }> {
    return addLiteratureTasks(this, selected);
  }

  addSelectedLiteratureTasks(window: any = null, items: any = null): Promise<{ added: number; skipped: number }> {
    return addSelectedLiteratureTasks(this, window, items);
  }

  addDroppedLiteratureTasks(itemIDs: any): Promise<{ added: number; skipped: number; ignored: number }> {
    return addDroppedLiteratureTasks(this, itemIDs);
  }

  rescheduleLiteratureTask(taskID: string, days: number, fromDeadline: boolean = false): Promise<any> {
    return rescheduleLiteratureTask(this, taskID, days, fromDeadline);
  }

  createCollectionReadingPlan(collection: any, window: any = null): Promise<void> {
    return createCollectionReadingPlan(this, collection, window);
  }

  createTaskFromReader(window: any = null, sourceReader: any = null, selection: any = null): Promise<void> {
    return createTaskFromReader(this, window, sourceReader, selection);
  }

  createReadingMilestones(item: any, window: any = null, profileID: any = null): Promise<any> {
    return createReadingMilestones(this, item, window, profileID);
  }

  syncTasksToChildNote(item: any, tasks: any = null, options: any = {}): Promise<any> {
    return syncTasksToChildNote(this, item, tasks, options);
  }

  tagItemOnTaskEvent(itemKey: string, eventType: string, libraryID: any = null): Promise<void> {
    return tagItemOnTaskEvent(this, itemKey, eventType, libraryID);
  }

  refreshLinkedLiterature(itemIDs: any = null, removed: any[] = []): Promise<number> {
    return refreshLinkedLiterature(this, itemIDs, removed);
  }

  registerItemPaneSection(): any {
    if (typeof Zotero !== 'undefined' && Zotero.TaskFlowItemPane?.registerItemPaneSection) {
      return Zotero.TaskFlowItemPane.registerItemPaneSection(this);
    }
    if (typeof TaskFlowItemPane !== 'undefined' && TaskFlowItemPane.registerItemPaneSection) {
      return TaskFlowItemPane.registerItemPaneSection(this);
    }
  }
}
