/**
 * Zotero TaskFlow - Preferences Custom Tags UI Binding
 */

import { addAbortableListener, createScopedController, linkParentSignal } from '../lifecycle';
import type { CustomTagRecord } from '../types/models';
import { getEl, getZoteroInstance, HTML, reportOperationError } from './uiBinding';

const tagListControllers = new WeakMap<Element, AbortController>();

function resetTagListSignal(container: Element, doc: Document, parentSignal?: AbortSignal): AbortSignal {
  tagListControllers.get(container)?.abort();
  const next = createScopedController(doc.defaultView);
  linkParentSignal(next, parentSignal);
  tagListControllers.set(container, next);
  return next.signal;
}

export async function renderCustomTagsManager(
  doc: Document,
  win?: Window | null,
  parentSignal?: AbortSignal
): Promise<void> {
  const listEl = getEl(doc, 'taskflow-pref-tags-list');
  if (!listEl) return;
  const signal = resetTagListSignal(listEl, doc, parentSignal);
  listEl.replaceChildren();

  const zot = getZoteroInstance(win, doc);
  const host = zot?.TaskFlow || zot?.Todolist;
  if (!host?.loadData) {
    const emptySpan = doc.createElementNS(HTML, 'span') as HTMLSpanElement;
    emptySpan.textContent = '暂无自定义标签 (Zotero 就绪后即可管理)';
    emptySpan.style.color = 'var(--flow-pref-muted)';
    emptySpan.style.fontSize = '13px';
    listEl.appendChild(emptySpan);
    return;
  }

  try {
    const data = await host.loadData();
    if (signal.aborted) return;
    const tags: CustomTagRecord[] = data.customTags || [];

    if (tags.length === 0) {
      const emptySpan = doc.createElementNS(HTML, 'span') as HTMLSpanElement;
      emptySpan.textContent = '暂无自定义标签，可在下方输入名称并选择颜色创建。';
      emptySpan.style.color = 'var(--flow-pref-muted)';
      emptySpan.style.fontSize = '13px';
      listEl.appendChild(emptySpan);
      return;
    }

    for (const tag of tags) {
      const badge = doc.createElementNS(HTML, 'span') as HTMLSpanElement;
      badge.className = 'todolist-pref-tag-badge';
      badge.style.backgroundColor = (tag.color || '#3b82f6') + '20';
      badge.style.color = 'var(--flow-pref-text)';
      badge.style.borderColor = (tag.color || '#3b82f6') + '40';

      const label = doc.createElementNS(HTML, 'span');
      label.textContent = `${tag.icon || '🏷️'} ${tag.name}`;
      badge.appendChild(label);

      const delBtn = doc.createElementNS(HTML, 'button') as HTMLButtonElement;
      delBtn.type = 'button';
      delBtn.className = 'todolist-pref-tag-delete';
      delBtn.textContent = '×';
      delBtn.title = `删除标签 "${tag.name}"`;
      addAbortableListener(
        delBtn,
        'click',
        async (e: Event) => {
          e.stopPropagation();
          if (delBtn.disabled) return;
          delBtn.disabled = true;
          try {
            await host.saveData({ customTagChanges: { deleted: [tag.id] } });
            await renderCustomTagsManager(doc, win, parentSignal);
          } catch (error) {
            reportOperationError(zot, doc, '删除自定义标签', error);
          } finally {
            delBtn.disabled = false;
          }
        },
        undefined,
        signal
      );
      badge.appendChild(delBtn);
      listEl.appendChild(badge);
    }
  } catch (err) {
    reportOperationError(zot, doc, '刷新自定义标签', err);
  }
}

export function bindTagPaletteAndCreator(
  doc: Document,
  win?: Window | null,
  signal?: AbortSignal
): void {
  let activeTagColor = '#ef4444';
  const palette = getEl(doc, 'taskflow-tag-color-palette');
  if (palette) {
    const dots = palette.querySelectorAll('.todolist-pref-color-dot');
    dots.forEach((dot) => {
      addAbortableListener(
        dot,
        'click',
        () => {
          dots.forEach((d) => {
            d.classList.remove('active');
            d.setAttribute('aria-pressed', 'false');
          });
          dot.classList.add('active');
          dot.setAttribute('aria-pressed', 'true');
          activeTagColor = dot.getAttribute('data-color') || '#ef4444';
        },
        undefined,
        signal
      );
    });
  }

  const addTagBtn = getEl(doc, 'taskflow-btn-add-tag') as HTMLButtonElement | null;
  const tagInput = getEl(doc, 'taskflow-new-tag-name') as HTMLInputElement | null;
  let addingTag = false;

  const handleAddTag = async (): Promise<void> => {
    if (addingTag) return;
    const name = tagInput?.value?.trim();
    if (!name) return;
    const zot = getZoteroInstance(win, doc);
    const host = zot?.TaskFlow || zot?.Todolist;
    if (!host?.saveData) return;

    addingTag = true;
    if (addTagBtn) addTagBtn.disabled = true;
    if (tagInput) tagInput.disabled = true;
    try {
      const tag: CustomTagRecord = {
        id: 'tag_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        name,
        color: activeTagColor || '#3b82f6',
        icon: '🏷️'
      };
      await host.saveData({ customTagChanges: { added: [tag] } });
      if (tagInput) tagInput.value = '';
      await renderCustomTagsManager(doc, win, signal);
    } catch (error) {
      reportOperationError(zot, doc, '添加自定义标签', error);
    } finally {
      addingTag = false;
      if (addTagBtn) addTagBtn.disabled = false;
      if (tagInput) tagInput.disabled = false;
    }
  };

  addAbortableListener(addTagBtn, 'click', () => void handleAddTag(), undefined, signal);
  addAbortableListener(
    tagInput,
    'keydown',
    (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Enter') {
        ke.preventDefault();
        void handleAddTag();
      }
    },
    undefined,
    signal
  );
}
