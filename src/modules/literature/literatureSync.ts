/**
 * Zotero TaskFlow - Literature Sync & Child Note Module
 */

import { getLiteratureItem, serializeLiteratureItem, resolveItemReference, escapeHtml } from '../../utils';

declare let Zotero: any;

export async function syncTasksToChildNote(
  host: any,
  item: any,
  tasks: any = null,
  options: any = {}
): Promise<any> {
  const target = getLiteratureItem(item);
  if (!target) return null;
  if (typeof target.isEditable === 'function' && !target.isEditable()) return null;

  try {
    const data = await host.loadData();
    const allTasks = (tasks || data.tasks || []).filter(
      (t: any) =>
        t.zoteroItemKey === target.key &&
        (t.zoteroLibraryID || Zotero.Libraries.userLibraryID) === target.libraryID
    );
    const meta = serializeLiteratureItem(target);

    const total = allTasks.length;
    const completed = allTasks.filter((t: any) => t.completed).length;
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

    let targetNote: any = null;
    if (typeof target.getNotes === 'function') {
      const noteIDs = target.getNotes();
      for (const nid of noteIDs) {
        const noteItem = Zotero.Items.get(nid);
        if (noteItem && noteItem.isNote && noteItem.isNote()) {
          const content = noteItem.getNote();
          const hasTaskFlowTag =
            typeof noteItem.hasTag === 'function' && noteItem.hasTag('TaskFlow');
          if (
            hasTaskFlowTag ||
            (content && (content.includes('[TaskFlow]') || content.includes('TaskFlow')))
          ) {
            targetNote = noteItem;
            break;
          }
        }
      }
    }

    if (targetNote) {
      targetNote.setNote(noteHtml);
      try {
        if (typeof targetNote.hasTag === 'function' && !targetNote.hasTag('TaskFlow')) {
          targetNote.addTag('TaskFlow');
        }
      } catch (_) {}
      await targetNote.saveTx();
    } else {
      const newNote = new Zotero.Item('note');
      newNote.libraryID = target.libraryID;
      newNote.parentID = target.id;
      newNote.setNote(noteHtml);
      try {
        newNote.addTag('TaskFlow');
      } catch (_) {}
      await newNote.saveTx();
      targetNote = newNote;
    }

    if (!options?.silent) {
      host.showNotice(
        '文献笔记同步成功',
        `已更新《${meta.title.slice(0, 20)}...》的研读进度笔记，支持多端云同步！`
      );
    }
    return targetNote;
  } catch (err: any) {
    Zotero.logError?.('[TaskFlow] syncTasksToChildNote error: ' + err);
    host.recordDiagnostic({ action: '同步文献子笔记', message: String(err?.message || err), stack: err?.stack });
    return null;
  }
}

export async function tagItemOnTaskEvent(
  host: any,
  itemKey: string,
  eventType: string,
  libraryID: any = null
): Promise<void> {
  if (!itemKey) return;
  try {
    const item = resolveItemReference(itemKey, libraryID);
    const target = getLiteratureItem(item);
    if (!target) return;
    if (typeof target.isEditable === 'function' && !target.isEditable()) return;

    const autoTagOnCreate = host.getPref('autoTagOnCreate', true);
    const autoTagOnComplete = host.getPref('autoTagOnComplete', true);
    const pendingTag = host.getPref('tagForPending', '待研读');
    const completedTag = host.getPref('tagForCompleted', '精读已完成');

    const data = await host.loadData();
    const tasks = (data.tasks || []).filter(
      (t: any) =>
        t.zoteroItemKey === target.key &&
        (t.zoteroLibraryID || Zotero.Libraries.userLibraryID) === target.libraryID
    );
    const uncompleted = tasks.filter((t: any) => !t.completed);

    let modified = false;

    if (eventType === 'create' && autoTagOnCreate) {
      if (pendingTag && !target.hasTag(pendingTag)) {
        target.addTag(pendingTag);
        modified = true;
      }
    } else if (eventType === 'complete_check') {
      if (tasks.length > 0 && uncompleted.length === 0) {
        if (autoTagOnComplete && completedTag) {
          if (!target.hasTag(completedTag)) {
            target.addTag(completedTag);
            modified = true;
          }
          if (pendingTag && target.hasTag(pendingTag)) {
            target.removeTag(pendingTag);
            modified = true;
          }
        }
      } else if (tasks.length === 0) {
        for (const tag of [pendingTag, completedTag]) {
          if (tag && target.hasTag(tag)) {
            target.removeTag(tag);
            modified = true;
          }
        }
      } else if (uncompleted.length > 0) {
        if (completedTag && target.hasTag(completedTag)) {
          target.removeTag(completedTag);
          modified = true;
        }
        if (autoTagOnCreate && pendingTag && !target.hasTag(pendingTag)) {
          target.addTag(pendingTag);
          modified = true;
        }
      }
    }

    if (modified) {
      await target.saveTx();
    }
  } catch (err) {
    Zotero.logError?.('[TaskFlow] tagItemOnTaskEvent error: ' + err);
  }
}

export async function refreshLinkedLiterature(
  host: any,
  itemIDs: any = null,
  removed: any[] = []
): Promise<number> {
  const data = await host.loadData();
  const updated: any[] = [];
  for (const task of data.tasks || []) {
    if (!task.zoteroItemKey) continue;
    const libraryID = task.zoteroLibraryID || Zotero.Libraries.userLibraryID;
    const item = resolveItemReference(task.zoteroItemKey, libraryID);
    const matchesRemoved = removed.some(
      (ref: any) => ref.key === task.zoteroItemKey && ref.libraryID === libraryID
    );
    if (itemIDs && !itemIDs.has(item?.id) && !itemIDs.has(task.zoteroItemID) && !matchesRemoved) continue;
    let changes: any = { zoteroLinkStatus: !item ? 'missing' : item.deleted ? 'trashed' : 'active' };
    if (item) {
      const meta = serializeLiteratureItem(item);
      if (!meta) continue;
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
    changes = Object.fromEntries(Object.entries(changes).filter(([key, value]) => value !== task[key]));
    if (Object.keys(changes).length) {
      updated.push({
        id: task.id,
        changes,
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
