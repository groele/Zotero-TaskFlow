/**
 * Zotero TaskFlow - ItemPane Section Module
 * Re-exports modularized TaskFlowItemPane implementation.
 */

import { TaskFlowItemPane } from './itemPane/index';

declare let Zotero: any;

if (typeof Zotero !== 'undefined') {
  Zotero.TaskFlowItemPane = TaskFlowItemPane;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).TaskFlowItemPane = TaskFlowItemPane;
}

export { TaskFlowItemPane };
export default TaskFlowItemPane;
