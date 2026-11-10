// Modal main coordinator for add/edit task dialogs

const Modal = {
  dialog: null,
  form: null,
  titleElement: null,
  currentTaskId: null,
  currentSubtasks: [],
  currentTags: [],
  currentZoteroLiterature: null,
  _listenersBound: false,

  // Initialize modal
  async init() {
    this.ensureInitialized();
    await this.loadCategories();
  },

  // Ensure modal elements are bound even if openAdd is called before init()
  ensureInitialized() {
    if (!this.dialog) {
      this.dialog = document.getElementById('task-modal');
      this.form = document.getElementById('task-form');
      this.titleElement = document.getElementById('modal-title');
      this.setupEventListeners();
    }
  },

  // Open add modal
  openAdd(prefill = null) {
    this.ensureInitialized();
    if (!this.dialog || !this.form) {
      console.warn('[Modal] Cannot openAdd: modal elements not ready in DOM');
      return;
    }

    this.form.reset();
    this.setReadingProfile(prefill?.readingProfile);
    this.currentTaskId = null;
    this._originalTask = null;
    this._editSnapshot = null;
    this._creationState = { completed: Boolean(prefill?.completed), status: prefill?.status || 'todo' };
    document.getElementById('btn-delete-task')?.classList.add('hidden');
    this.currentSubtasks = [];
    this.currentTags = [];

    const activeType = prefill?.academicType || (this.isZotero()
      ? Storage._zoteroCache?.settings?.defaultTaskType || 'literature_reading' : 'general');
    this.setAcademicType(activeType);

    this.currentZoteroLiterature = prefill?.zoteroItemKey ? {
      key: prefill.zoteroItemKey,
      itemID: prefill.zoteroItemID,
      attachmentKey: prefill.zoteroAttachmentKey,
      annotationKey: prefill.zoteroAnnotationKey,
      linkStatus: prefill.zoteroLinkStatus,
      autoTitle: prefill.zoteroAutoTitle,
      initialTitle: prefill.title,
      workflowId: prefill.literatureWorkflowId,
      title: prefill.zoteroItemTitle,
      authors: prefill.zoteroAuthors,
      year: prefill.zoteroYear,
      libraryID: prefill.zoteroLibraryID,
      publication: prefill.zoteroPublication || '',
      zoteroUri: prefill.zoteroUri,
      pdfUri: prefill.zoteroPdfUri,
      page: prefill.zoteroPage || null,
      quote: prefill.zoteroQuote || '',
      academicType: activeType
    } : null;
    if (this.titleElement) this.titleElement.textContent = '添加学术任务';
    const iconEl = this.dialog.querySelector('.modal-header-icon');
    if (iconEl) iconEl.textContent = '✨';

    this.updateTimePickerUI(prefill?.dueTime || '');

    // Apply prefill if provided
    if (prefill) {
      if (prefill.title) document.getElementById('task-title').value = prefill.title;
      if (prefill.description) document.getElementById('task-description').value = prefill.description;
      if (prefill.dueDate) document.getElementById('task-due-date').value = prefill.dueDate;
      if (prefill.priority) {
        const radio = [...this.form.querySelectorAll('input[name="priority"]')].find(el => el.value === prefill.priority);
        if (radio) radio.checked = true;
      }
      if (prefill.category) document.getElementById('task-category').value = prefill.category;
      const repeatSelect = document.getElementById('task-repeat');
      if (repeatSelect) repeatSelect.value = prefill.repeat || '';
      if (prefill.tags) this.currentTags = [...prefill.tags];
      if (prefill.subtasks) {
        this.currentSubtasks = prefill.subtasks.map(st => ({
          id: st.id || Utils.generateId(),
          title: st.title || '',
          completed: !!st.completed
        }));
      }
    }

    // Explicit prefills override the native preference, including after form reset.
    if (!prefill?.priority) {
      const priority = Storage.getPreference('defaultPriority', 'medium');
      const radio = [...this.form.querySelectorAll('input[name="priority"]')].find(el => el.value === priority);
      if (radio) radio.checked = true;
    }
    // Retain a safe fallback for profiles with an invalid saved preference.
    const mediumRadio = this.form.querySelector('input[name="priority"][value="medium"]');
    if (mediumRadio && !this.form.querySelector('input[name="priority"]:checked')) {
      mediumRadio.checked = true;
    }

    // Render subtasks, tags and literature section
    const expandable = document.getElementById('subtasks-expandable');
    if (expandable) expandable.open = Boolean(prefill?.subtasks && prefill.subtasks.length > 0);
    this.renderSubtasks();
    this.renderTags();
    this.renderLiteratureSection();

    if (!this.dialog.open) {
      this.dialog.showModal();
    }
    this.autoResizeDescription();
    document.getElementById('task-title')?.focus();
  },

  // Open edit modal
  async openEdit(taskId) {
    this.ensureInitialized();
    if (!this.dialog || !this.form) {
      console.warn('[Modal] Cannot openEdit: modal elements not ready in DOM');
      return;
    }

    const task = await Storage.getTaskById(taskId);
    if (!task) return;
    this.setReadingProfile(task.readingProfile);

    this.currentTaskId = taskId;
    this._creationState = null;
    this._originalTask = Storage.clone(task);
    document.getElementById('btn-delete-task')?.classList.remove('hidden');
    this.currentSubtasks = (task.subtasks || []).map(st => ({
      id: st.id || Utils.generateId(),
      title: st.title || '',
      completed: !!st.completed
    }));
    this.currentTags = task.tags ? [...task.tags] : [];

    const activeType = task.academicType || (task.zoteroItemKey ? 'literature_reading' : 'general');
    this.setAcademicType(activeType);

    this.currentZoteroLiterature = task.zoteroItemKey ? {
      key: task.zoteroItemKey,
      itemID: task.zoteroItemID,
      attachmentKey: task.zoteroAttachmentKey,
      annotationKey: task.zoteroAnnotationKey,
      linkStatus: task.zoteroLinkStatus,
      autoTitle: task.zoteroAutoTitle,
      initialTitle: task.title,
      workflowId: task.literatureWorkflowId,
      title: task.zoteroItemTitle,
      authors: task.zoteroAuthors,
      year: task.zoteroYear,
      libraryID: task.zoteroLibraryID,
      publication: task.zoteroPublication || '',
      zoteroUri: task.zoteroUri,
      pdfUri: task.zoteroPdfUri,
      page: task.zoteroPage || null,
      quote: task.zoteroQuote || '',
      academicType: activeType
    } : null;
    this.titleElement.textContent = '编辑学术任务';
    const iconEl = this.dialog.querySelector('.modal-header-icon');
    if (iconEl) iconEl.textContent = '✏️';

    // Fill form with task data
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-due-date').value = task.dueDate || '';
    document.getElementById('task-category').value = task.category || '';

    this.updateTimePickerUI(task.dueTime || '');

    // Set priority radio
    const radios = [...this.form.querySelectorAll('input[name="priority"]')];
    const radio = radios.find(el => el.value === task.priority) || radios.find(el => el.value === 'medium');
    if (radio) radio.checked = true;

    // Set reminder checkbox
    const reminderCheckbox = document.getElementById('task-reminder');
    const reminderSelect = document.getElementById('task-reminder-before');
    if (reminderCheckbox) {
      reminderCheckbox.checked = task.reminder?.enabled || false;
      if (reminderSelect) {
        reminderSelect.style.display = reminderCheckbox.checked ? 'block' : 'none';
        reminderSelect.value = task.reminder?.before || 15;
      }
    }

    // Set repeat select
    const repeatSelect = document.getElementById('task-repeat');
    if (repeatSelect) {
      repeatSelect.value = task.repeat || '';
    }

    // Render subtasks, tags and literature section
    const expandable = document.getElementById('subtasks-expandable');
    if (expandable) expandable.open = Boolean(task.subtasks && task.subtasks.length > 0);
    this.renderSubtasks();
    this.renderTags();
    this.renderLiteratureSection();

    if (!this.dialog.open) {
      this.dialog.showModal();
    }
    this.autoResizeDescription();
    document.getElementById('task-title')?.focus();
    this._editSnapshot = Storage.clone(this.getFormData());
  },

  // Close modal
  close() {
    if (this._isSubmitting) return;
    if (this.dialog && this.dialog.open) {
      this.dialog.close();
    }
    if (this.form) {
      this.form.reset();
    }
    const desc = document.getElementById('task-description');
    if (desc) desc.style.height = '';
    this.currentTaskId = null;
    this.currentSubtasks = [];
    this.currentTags = [];
    this.currentZoteroLiterature = null;
  }
};

// Compose submodules into main coordinator
Object.assign(
  Modal,
  typeof ModalSubtasks !== 'undefined' ? ModalSubtasks : (typeof window !== 'undefined' ? window.ModalSubtasks : {}),
  typeof ModalLiterature !== 'undefined' ? ModalLiterature : (typeof window !== 'undefined' ? window.ModalLiterature : {}),
  typeof ModalForm !== 'undefined' ? ModalForm : (typeof window !== 'undefined' ? window.ModalForm : {})
);

if (typeof window !== 'undefined') {
  window.Modal = Modal;
}
