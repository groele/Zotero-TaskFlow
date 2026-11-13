/**
 * Zotero TaskFlow - ItemPane Section Module
 * Re-exports modularized TaskFlowItemPane implementation.
 */

import { TaskFlowItemPane } from './itemPane/index';

if (typeof Zotero !== 'undefined') {
  Zotero.TaskFlowItemPane = TaskFlowItemPane;
}
const g = globalThis as Record<string, unknown>;
if (typeof g !== 'undefined') {
  g.TaskFlowItemPane = TaskFlowItemPane;
}

export { TaskFlowItemPane };
export default TaskFlowItemPane;
