/**
 * Zotero TaskFlow - ItemPane Drag & Drop Interaction Module
 * Handles drag and drop events, drop target styling, and card reorder dragging.
 */

declare let Zotero: any;

export function setupPaneDragAndDrop(wrapper: HTMLElement, target: any, host: any, state: any): void {
  wrapper.addEventListener('dragover', (e: DragEvent) => {
    if (!target) return;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
      e.preventDefault();
    }
    wrapper.classList.add('td-drag-target-active');
  });

  wrapper.addEventListener('dragleave', (e: DragEvent) => {
    if (!wrapper.contains(e.relatedTarget as Node)) {
      wrapper.classList.remove('td-drag-target-active');
    }
  });

  wrapper.addEventListener('drop', async (e: DragEvent) => {
    wrapper.classList.remove('td-drag-target-active');
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      const zoteroItems = e.dataTransfer?.getData('text/x-zotero-item') || e.dataTransfer?.getData('text/plain');
      if (zoteroItems) {
        await state?.refresh?.();
      }
    } catch (err) {
      Zotero.logError?.('[TaskFlow] ItemPane drop handling error: ' + err);
    }
  });
}

export function makeTaskCardDraggable(card: HTMLElement, task: any, host: any): void {
  card.setAttribute('draggable', 'true');
  card.addEventListener('dragstart', (e: DragEvent) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/x-taskflow-id', task.id);
      e.dataTransfer.setData('text/plain', task.title || '');
      e.dataTransfer.effectAllowed = 'move';
    }
    card.classList.add('is-dragging');
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('is-dragging');
  });
}
