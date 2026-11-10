// UI inline editing for tasks and subtasks submodule

const UIInlineEdit = {
  setupInlineEditing() {
    const taskList = document.getElementById('task-list');
    if (!taskList) return;

    // Enter key to add subtask from card input
    taskList.addEventListener('keydown', async (e) => {
      if (e.target.classList.contains('card-add-subtask-input') && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const input = e.target;
        const title = input.value.trim();
        const taskId = input.dataset.taskId;
        if (title && taskId && !input.disabled) {
          input.disabled = true;
          try { await TaskManager.addSubtask(taskId, title); }
          catch (error) {
            Diagnostics.showFailure('添加子任务', error);
            const current = [...document.querySelectorAll('.card-add-subtask-input')].find(el => el.dataset.taskId === taskId);
            if (current) { current.value = title; current.disabled = false; current.focus(); }
            return;
          }
          const card = [...document.querySelectorAll('.task-card')].find(el => el.dataset.taskId === taskId);
          const newInput = card?.querySelector('.card-add-subtask-input');
          if (newInput) newInput.focus();
        }
      }
    });

    // Double-click inline subtask edit
    taskList.addEventListener('dblclick', async (e) => {
      const textEl = e.target.closest('.card-subtask-text');
      if (!textEl) return;
      e.stopPropagation();

      const itemEl = textEl.closest('.card-subtask-item');
      const cardEl = textEl.closest('.task-card');
      if (!itemEl || !cardEl) return;

      const subtaskId = itemEl.querySelector('.card-subtask-checkbox')?.dataset.subtaskId;
      const taskId = cardEl.dataset.taskId;
      if (!subtaskId || !taskId) return;

      const currentTitle = textEl.textContent.trim();
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'card-add-subtask-input';
      input.style.padding = '1px 4px';
      input.value = currentTitle;

      textEl.replaceWith(input);
      input.focus();
      input.select();

      let saved = false;
      const save = async () => {
        if (saved) return;
        saved = true;
        const val = input.value.trim();
        try {
          if (val && val !== currentTitle) await TaskManager.updateSubtask(taskId, subtaskId, val);
          this.render();
        } catch (error) {
          Diagnostics.showFailure('编辑子任务', error);
          const card = [...document.querySelectorAll('.task-card')].find(el => el.dataset.taskId === taskId);
          const item = [...(card?.querySelectorAll('.card-subtask-item') || [])].find(el => el.querySelector('.card-subtask-checkbox')?.dataset.subtaskId === subtaskId);
          item?.querySelector('.card-subtask-text')?.replaceWith(input);
          saved = false;
          input.focus();
        }
      };

      input.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter') {
          evt.preventDefault();
          save();
        } else if (evt.key === 'Escape') {
          saved = true;
          this.render();
        }
      });
      input.addEventListener('blur', save);
    });

    // Double-click inline task title edit
    taskList.addEventListener('dblclick', async (e) => {
      const titleEl = e.target.closest('.task-title');
      if (!titleEl) return;
      e.stopPropagation();

      const cardEl = titleEl.closest('.task-card');
      if (!cardEl) return;
      const taskId = cardEl.dataset.taskId;
      const task = TaskManager.getTaskById(taskId);
      if (!task) return;

      const currentTitle = task.title;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'card-add-subtask-input';
      input.style.fontSize = '14px';
      input.style.fontWeight = '500';
      input.value = currentTitle;

      titleEl.replaceWith(input);
      input.focus();
      input.select();

      let saved = false;
      const save = async () => {
        if (saved) return;
        saved = true;
        const val = input.value.trim();
        try {
          if (val && val !== currentTitle) await TaskManager.updateTask(taskId, { title: val });
          this.render();
        } catch (error) {
          Diagnostics.showFailure('编辑任务标题', error);
          const card = [...document.querySelectorAll('.task-card')].find(el => el.dataset.taskId === taskId);
          card?.querySelector('.task-title')?.replaceWith(input);
          saved = false;
          input.focus();
        }
      };

      input.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter') {
          evt.preventDefault();
          save();
        } else if (evt.key === 'Escape') {
          saved = true;
          this.render();
        }
      });
      input.addEventListener('blur', save);
    });

    // Double-click inline task description edit
    taskList.addEventListener('dblclick', async (e) => {
      const descEl = e.target.closest('.task-description');
      if (!descEl) return;
      e.stopPropagation();

      const cardEl = descEl.closest('.task-card');
      if (!cardEl) return;
      const taskId = cardEl.dataset.taskId;
      const task = TaskManager.getTaskById(taskId);
      if (!task) return;

      const currentDesc = task.description || '';
      const input = document.createElement('textarea');
      input.className = 'card-add-subtask-input';
      input.style.fontSize = '12px';
      input.style.minHeight = '45px';
      input.style.resize = 'vertical';
      input.value = currentDesc;

      descEl.replaceWith(input);
      input.focus();
      input.select();

      let saved = false;
      const save = async () => {
        if (saved) return;
        saved = true;
        const val = input.value.trim();
        try {
          if (val !== currentDesc) await TaskManager.updateTask(taskId, { description: val });
          this.render();
        } catch (error) {
          Diagnostics.showFailure('编辑任务描述', error);
          const card = [...document.querySelectorAll('.task-card')].find(el => el.dataset.taskId === taskId);
          card?.querySelector('.task-description')?.replaceWith(input);
          saved = false;
          input.focus();
        }
      };

      input.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter' && (evt.ctrlKey || evt.metaKey)) {
          evt.preventDefault();
          save();
        } else if (evt.key === 'Escape') {
          saved = true;
          this.render();
        }
      });
      input.addEventListener('blur', save);
    });
  }
};

if (typeof window !== 'undefined') {
  window.UIInlineEdit = UIInlineEdit;
}
