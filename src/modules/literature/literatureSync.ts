/**
 * Zotero TaskFlow - Literature Sync & Child Note Module
 */

import { getLiteratureItem, serializeLiteratureItem, resolveItemReference, escapeHtml } from '../../utils';
import type { TaskFlowHostLike, TaskRecord, TaskUpdateEntry, ZoteroItemLike } from '../../types/models';

export async function syncTasksToChildNote(
  host: TaskFlowHostLike,
  item: unknown,
  tasks: TaskRecord[] | null = null,
  options: { silent?: boolean } = {}
): Promise<ZoteroItemLike | null> {
  const target = getLiteratureItem(item as ZoteroItemLike);
  if (!target || target.deleted) return null;
  if (typeof target.isEditable === 'function' && !target.isEditable()) return null;

  try {
    const data = await host.loadData();
    const userLib = Zotero.Libraries?.userLibraryID || 1;
    const allTasks = (tasks || data.tasks || []).filter(
      (t: TaskRecord) =>
        t.zoteroItemKey === target.key &&
        (t.zoteroLibraryID || userLib) === target.libraryID
    );
    const meta = serializeLiteratureItem(target);
    if (!meta) return null;

    const total = allTasks.length;
    const completed = allTasks.filter((t: TaskRecord) => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    let noteHtml = `<h1>${escapeHtml(host.getPref('childNoteTitle', '📝 [TaskFlow] 研读清单与进度'))}</h1>`;
    noteHtml += `<p><strong>文献：</strong>${escapeHtml(meta.title)} (${escapeHtml(meta.authors)} ${escapeHtml(meta.year)})</p>`;
    noteHtml += `<p><strong>研读进度：</strong>${completed}/${total} 已完成 (<strong>${percent}%</strong>) | 更新于：${new Date().toLocaleString()}</p>`;
    noteHtml += `<div style="background:#e2e8f0;border-radius:4px;height:10px;width:100%;margin:8px 0;overflow:hidden;"><div style="background:#059669;height:10px;width:${percent}%;"></div></div>`;

    if (total === 0) {
      noteHtml += `<p><em>暂无关联待办事项。可通过 TaskFlow 插件或侧边栏添加研读计划。</em></p>`;
    } else {
      noteHtml += `<ul>`;
      for (const t of allTasks) {
        const checkMark = t.completed ? '☑' : '☐';
        const statusStyle = t.completed ? 'text-decoration:line-through;color:#64748b;' : 'font-weight:600;';
        const dueInfo = t.dueDate ? ` <span style="font-size:11px;color:#d97706;">(截止: ${escapeHtml(t.dueDate)})</span>` : '';
        noteHtml += `<li>${checkMark} <span style="${statusStyle}">${escapeHtml(t.title)}</span>${dueInfo}`;
        if (host.getPref('childNoteIncludeSubtasks', true) && t.subtasks && t.subtasks.length > 0) {
          noteHtml += `<ul>`;
          for (const sub of t.subtasks) {
            noteHtml += `<li>${sub.completed ? '☑' : '☐'} ${escapeHtml(sub.title)}</li>`;
          }
          noteHtml += `</ul>`;
        }
        if (host.getPref('childNoteIncludeQuotes', true) && t.description && t.description.trim()) {
          noteHtml += `<blockquote>${escapeHtml(t.description).replace(/\n/g, '<br/>')}</blockquote>`;
        }
        if (
          host.getPref('childNoteIncludeQuotes', true) &&
          /^zotero:\/\/open-pdf\/(?:library|groups\/\d+)\/items\/[A-Za-z0-9_]+(?:\?|$)/.test(t.zoteroPdfUri || '')
        ) {
          noteHtml += ` <a href="${escapeHtml(t.zoteroPdfUri)}">${t.zoteroAnnotationKey ? '返回原文批注' : '打开原文页码'}</a>`;
        }
        noteHtml += `</li>`;
      }
      noteHtml += `</ul>`;
    }

    noteHtml += `<hr/><p style="font-size:11px;color:#94a3b8;">由 Zotero TaskFlow 自动生成并同步至 Zotero 云端笔记</p>`;

    let targetNote: ZoteroItemLike | null = null;
    if (typeof target.getNotes === 'function') {
      const noteIDs = target.getNotes();
      for (const nid of noteIDs) {
        const noteItem = Zotero.Items?.get?.(nid);
        if (noteItem && !noteItem.deleted && noteItem.isNote?.()) {
          const content = noteItem.getNote?.() || '';
          const hasTaskFlowTag = Boolean(noteItem.hasTag?.('TaskFlow'));
          if (hasTaskFlowTag || content.includes('[TaskFlow]') || content.includes('TaskFlow')) {
            targetNote = noteItem;
            break;
          }
        }
      }
    }

    if (targetNote) {
      if (typeof targetNote.isEditable === 'function' && !targetNote.isEditable()) return null;
      targetNote.setNote?.(noteHtml);
      try {
        if (!targetNote.hasTag?.('TaskFlow')) {
          targetNote.addTag?.('TaskFlow');
        }
      } catch (_) {}
      await targetNote.saveTx?.();
    } else if (Zotero.Item) {
      const newNote = new Zotero.Item('note');
      newNote.libraryID = target.libraryID;
      newNote.parentID = target.id;
      newNote.setNote?.(noteHtml);
      try {
        newNote.addTag?.('TaskFlow');
      } catch (_) {}
      await newNote.saveTx?.();
      targetNote = newNote;
    }

    if (targetNote && !options?.silent) {
      host.showNotice(
        '文献笔记同步成功',
        `已更新《${meta.title.slice(0, 20)}...》的研读进度笔记，支持多端云同步！`
      );
    }
    return targetNote;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    Zotero.logError?.('[TaskFlow] syncTasksToChildNote error: ' + err);
    void host.recordDiagnostic({ action: '同步文献子笔记', message, stack });
    return null;
  }
}

export async function tagItemOnTaskEvent(
  host: TaskFlowHostLike,
  itemKey: string,
  eventType: string,
  libraryID: unknown = null
): Promise<void> {
  if (!itemKey) return;
  try {
    const item = resolveItemReference(itemKey, libraryID);
    const target = getLiteratureItem(item);
    if (!target || target.deleted) return;
    if (typeof target.isEditable === 'function' && !target.isEditable()) return;

    const autoTagOnCreate = host.getPref('autoTagOnCreate', true);
    const autoTagOnComplete = host.getPref('autoTagOnComplete', true);
    const pendingTag = host.getPref('tagForPending', '待研读');
    const completedTag = host.getPref('tagForCompleted', '精读已完成');

    const data = await host.loadData();
    const userLib = Zotero.Libraries?.userLibraryID || 1;
    const tasks = (data.tasks || []).filter(
      (t: TaskRecord) =>
        t.zoteroItemKey === target.key &&
        (t.zoteroLibraryID || userLib) === target.libraryID
    );
    const uncompleted = tasks.filter((t: TaskRecord) => !t.completed);

    let modified = false;

    if (eventType === 'create' && autoTagOnCreate) {
      if (pendingTag && !target.hasTag?.(pendingTag)) {
        target.addTag?.(pendingTag);
        modified = true;
      }
    } else if (eventType === 'complete_check') {
      if (tasks.length > 0 && uncompleted.length === 0) {
        if (autoTagOnComplete && completedTag) {
          if (!target.hasTag?.(completedTag)) {
            target.addTag?.(completedTag);
            modified = true;
          }
          if (pendingTag && target.hasTag?.(pendingTag)) {
            target.removeTag?.(pendingTag);
            modified = true;
          }
        }
      } else if (tasks.length === 0) {
        for (const tag of [pendingTag, completedTag]) {
          if (tag && target.hasTag?.(tag)) {
            target.removeTag?.(tag);
            modified = true;
          }
        }
      } else if (uncompleted.length > 0) {
        if (completedTag && target.hasTag?.(completedTag)) {
          target.removeTag?.(completedTag);
          modified = true;
        }
        if (autoTagOnCreate && pendingTag && !target.hasTag?.(pendingTag)) {
          target.addTag?.(pendingTag);
          modified = true;
        }
      }
    }

    if (modified) {
      await target.saveTx?.();
    }
  } catch (err) {
    Zotero.logError?.('[TaskFlow] tagItemOnTaskEvent error: ' + err);
  }
}

export async function refreshLinkedLiterature(
  host: TaskFlowHostLike,
  itemIDs: Set<unknown> | null = null,
  removed: Array<{ key: string; libraryID: number }> = []
): Promise<number> {
  const data = await host.loadData();
  const updated: TaskUpdateEntry[] = [];
  const userLib = Zotero.Libraries?.userLibraryID || 1;
  for (const task of data.tasks || []) {
    if (!task.zoteroItemKey) continue;
    const libraryID = task.zoteroLibraryID || userLib;
    const item = resolveItemReference(task.zoteroItemKey, libraryID);
    const matchesRemoved = removed.some(
      (ref) => ref.key === task.zoteroItemKey && ref.libraryID === libraryID
    );
    if (itemIDs && !itemIDs.has(item?.id) && !itemIDs.has(task.zoteroItemID) && !matchesRemoved) continue;
    const changes: Partial<TaskRecord> = {
      zoteroLinkStatus: !item ? 'missing' : item.deleted ? 'trashed' : 'active'
    };
    if (item && !item.deleted) {
      const meta = serializeLiteratureItem(item);
      if (meta) {
        Object.assign(changes, {
          zoteroItemID: meta.id,
          zoteroItemTitle: meta.title,
          zoteroAuthors: meta.authors,
          zoteroYear: meta.year,
          zoteroPublication: meta.publication,
          zoteroUri: meta.zoteroUri
        });
        if (
          task.zoteroAutoTitle ||
          (task.zoteroAutoTitle == null && task.title === `研读：${task.zoteroItemTitle}`)
        ) {
          changes.title = `研读：${meta.title}`;
        }
      }
    }
    const filteredChanges = Object.fromEntries(
      Object.entries(changes).filter(([key, value]) => value !== task[key])
    ) as Partial<TaskRecord>;
    if (Object.keys(filteredChanges).length) {
      updated.push({
        id: task.id,
        changes: filteredChanges,
        literatureRefresh: true,
        originalTitle: task.title,
        itemKey: task.zoteroItemKey,
        libraryID
      });
    }
  }
  if (updated.length && !host._shuttingDown) {
    await host.saveData({
      taskChanges: { updated },
      expectedTasksGeneration: data.tasksGeneration || 0
    });
  }
  return updated.length;
}
