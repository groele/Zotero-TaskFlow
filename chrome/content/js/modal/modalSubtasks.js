// Subtasks and tags submodule for Modal dialog

const ModalSubtasks = {
  // Render subtasks list
  renderSubtasks() {
    const container = document.getElementById('subtasks-list');
    const countBadge = document.getElementById('subtasks-count-badge');
    if (countBadge) {
      countBadge.textContent = `${(this.currentSubtasks || []).length} 项`;
    }
    const expandable = document.getElementById('subtasks-expandable');
    if (expandable && this.currentSubtasks && this.currentSubtasks.length > 0) {
      expandable.open = true;
    }
    if (!container) return;

    container.innerHTML = '';

    (this.currentSubtasks || []).forEach((subtask, index) => {
      if (!subtask) return;
      const item = document.createElement('div');
      item.className = 'subtask-item';

      // Checkbox
      const checkbox = document.createElement('div');
      checkbox.className = `subtask-checkbox ${subtask.completed ? 'checked' : ''}`;
      checkbox.dataset.index = String(index);
      checkbox.setAttribute('role', 'checkbox');
      checkbox.setAttribute('aria-checked', String(Boolean(subtask.completed)));
      checkbox.addEventListener('click', () => {
        this.currentSubtasks[index].completed = !this.currentSubtasks[index].completed;
        this.renderSubtasks();
      });

      // Subtask text
      const textSpan = document.createElement('span');
      textSpan.className = `subtask-text ${subtask.completed ? 'completed' : ''}`;
      textSpan.textContent = typeof subtask.title === 'string' ? subtask.title : String(subtask.title || '');

      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'subtask-delete';
      deleteBtn.dataset.index = String(index);
      deleteBtn.title = '删除';
      deleteBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14">
          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      `;
      deleteBtn.addEventListener('click', () => {
        this.currentSubtasks.splice(index, 1);
        this.renderSubtasks();
      });

      item.appendChild(checkbox);
      item.appendChild(textSpan);
      item.appendChild(deleteBtn);
      container.appendChild(item);
    });
  },

  // Add subtask from input
  addSubtaskFromInput() {
    const input = document.getElementById('subtask-input');
    if (!input) return;

    const title = input.value.trim();
    if (!title) return;

    this.currentSubtasks.push({
      id: Utils.generateId(),
      title: title,
      completed: false
    });

    input.value = '';
    this.renderSubtasks();
    input.focus();
  },

  // Render tags
  renderTags() {
    const container = document.getElementById('tags-container');
    if (!container) return;

    container.innerHTML = Tags.renderTagSelector(this.currentTags);

    // Wire up custom tag add button
    const btnAddCustomTag = container.querySelector('#btn-add-custom-tag');
    if (btnAddCustomTag) {
      btnAddCustomTag.addEventListener('click', async (e) => {
        e.preventDefault();
        const name = prompt('请输入新标签名称：');
        if (name && name.trim()) {
          const randomColor = Tags.colors[Math.floor(Math.random() * Tags.colors.length)].value;
          const tag = await Tags.addCustomTag(name.trim(), randomColor);
          if (!this.currentTags.includes(tag.id)) {
            this.currentTags.push(tag.id);
          }
          this.renderTags();
        }
      });
    }

    // Wire up tag checkboxes
    container.querySelectorAll('.tag-option input').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const tagId = e.target.value;
        if (e.target.checked) {
          if (!this.currentTags.includes(tagId)) {
            this.currentTags.push(tagId);
          }
        } else {
          this.currentTags = this.currentTags.filter(id => id !== tagId);
        }
      });
    });
  }
};

if (typeof window !== 'undefined') {
  window.ModalSubtasks = ModalSubtasks;
}

