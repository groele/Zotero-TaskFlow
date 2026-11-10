// Form events, validation and submission submodule for Modal dialog

const ModalForm = {
  // Setup event listeners
  setupEventListeners() {
    if (this._listenersBound) return;
    this._listenersBound = true;
    if (!this.form) return;

    // Form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Ctrl+Enter / Cmd+Enter shortcut to save task
    this.form.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.handleSubmit();
      }
    });

    // Auto-resize description textarea on input
    const descInput = document.getElementById('task-description');
    if (descInput) {
      descInput.addEventListener('input', () => {
        this.autoResizeDescription();
      });
    }

    // Cancel button & X close button
    document.getElementById('btn-cancel')?.addEventListener('click', () => {
      this.close();
    });
    document.getElementById('btn-close-modal-x')?.addEventListener('click', () => {
      this.close();
    });

    document.getElementById('btn-delete-task')?.addEventListener('click', async () => {
      if (!this.currentTaskId || this._isSubmitting) return;
      const btn = document.getElementById('btn-delete-task');
      btn.disabled = true;
      const deleted = await UI.handleDeleteTask(this.currentTaskId, null);
      btn.disabled = false;
      if (deleted) this.close();
    });
    this.dialog?.addEventListener('cancel', event => {
      if (this._isSubmitting) event.preventDefault();
      else this.close();
    });

    // Academic type segmented buttons
    document.querySelectorAll('#academic-type-segmented .academic-seg-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const type = btn.dataset.type;
        this.setAcademicType(type);
      });
    });

    // 5-step milestone injector button
    document.getElementById('btn-inject-milestones')?.addEventListener('click', (e) => {
      e.preventDefault();
      const profile = document.getElementById('task-reading-profile')?.value || 'general';
      const milestones = LiteratureWorkflow.steps(profile, () => Utils.generateId()).map(step => step.title);
      let added = 0;
      milestones.forEach(title => {
        if (!this.currentSubtasks.some(st => st.title === title)) {
          this.currentSubtasks.push({
            id: Utils.generateId(),
            title,
            completed: false
          });
          added++;
        }
      });
      const expandable = document.getElementById('subtasks-expandable');
      if (expandable) expandable.open = true;
      this.renderSubtasks();
      if (typeof UI !== 'undefined' && UI.showToast) {
        UI.showToast(`已填入 ${added} 项学术精读里程碑`);
      }
    });

    // Quick date pills
    document.querySelectorAll('.quick-date-pills .date-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const type = btn.dataset.date;
        const now = new Date();
        let targetDate = new Date();

        if (type === 'tomorrow') {
          targetDate.setDate(now.getDate() + 1);
        } else if (type === 'next-monday') {
          const day = now.getDay();
          const diff = (day === 0 ? 1 : 8 - day);
          targetDate.setDate(now.getDate() + diff);
        }

        const dateInput = document.getElementById('task-due-date');
        if (dateInput) {
          dateInput.value = Utils.toDateISO(targetDate);
        }
      });
    });

    // Smart Time Picker UI Update Helper
    this.updateTimePickerUI = (timeVal) => {
      const timeInput = document.getElementById('task-due-time');
      const hourSelect = document.getElementById('task-due-hour');
      const minuteSelect = document.getElementById('task-due-minute');
      const triggerBtn = document.getElementById('btn-toggle-time-picker');
      const triggerText = document.getElementById('time-trigger-text');
      const clearBtn = document.getElementById('btn-clear-due-time');
      const strip = document.getElementById('time-selection-strip');

      // Highlight matching active time pill
      document.querySelectorAll('.time-presets-toolbar .time-pill').forEach(pill => {
        if (timeVal && pill.dataset.time === timeVal) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });

      if (timeVal) {
        if (timeInput) timeInput.value = timeVal;
        const [h, m] = timeVal.split(':');
        if (hourSelect) hourSelect.value = h;
        if (minuteSelect) minuteSelect.value = m || '00';
        if (triggerText) triggerText.textContent = `具体时间: ${timeVal}`;
        if (triggerBtn) triggerBtn.classList.add('active');
        if (clearBtn) clearBtn.classList.remove('hidden');
        if (strip) strip.classList.remove('hidden');
      } else {
        if (timeInput) timeInput.value = '';
        if (hourSelect) hourSelect.value = '';
        if (minuteSelect) minuteSelect.value = '00';
        if (triggerText) triggerText.textContent = '设置具体时间 (可选)';
        if (triggerBtn) triggerBtn.classList.remove('active');
        if (clearBtn) clearBtn.classList.add('hidden');
        if (strip) strip.classList.add('hidden');
      }
    };

    // Toggle time picker button
    document.getElementById('btn-toggle-time-picker')?.addEventListener('click', (e) => {
      e.preventDefault();
      const strip = document.getElementById('time-selection-strip');
      if (strip) {
        strip.classList.toggle('hidden');
      }
    });

    // Custom time selectors change
    const hourSelect = document.getElementById('task-due-hour');
    const minuteSelect = document.getElementById('task-due-minute');

    const syncTimeFromDropdowns = () => {
      if (hourSelect && minuteSelect) {
        if (hourSelect.value) {
          this.updateTimePickerUI(`${hourSelect.value}:${minuteSelect.value || '00'}`);
        } else {
          this.updateTimePickerUI('');
        }
      }
    };

    hourSelect?.addEventListener('change', syncTimeFromDropdowns);
    minuteSelect?.addEventListener('change', syncTimeFromDropdowns);

    // Quick time pills
    document.querySelectorAll('.quick-time-pills .time-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const timeVal = btn.dataset.time;
        if (timeVal) {
          this.updateTimePickerUI(timeVal);
        }
      });
    });

    // Clear date and clear time buttons
    document.getElementById('btn-clear-due-date')?.addEventListener('click', (e) => {
      e.preventDefault();
      const dateInput = document.getElementById('task-due-date');
      if (dateInput) dateInput.value = '';
    });
    document.getElementById('btn-clear-due-time')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.updateTimePickerUI('');
    });

    // Close on backdrop click
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) {
        this.close();
      }
    });

    // Close on Escape
    this.dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.close();
    });

    // Subtask input
    const subtaskInput = document.getElementById('subtask-input');
    const subtaskAddBtn = document.getElementById('btn-add-subtask');

    if (subtaskInput && subtaskAddBtn) {
      subtaskAddBtn.addEventListener('click', () => {
        this.addSubtaskFromInput();
      });

      subtaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.addSubtaskFromInput();
        }
      });
    }

    // Reminder checkbox toggle
    const reminderCheckbox = document.getElementById('task-reminder');
    const reminderSelect = document.getElementById('task-reminder-before');
    if (reminderCheckbox && reminderSelect) {
      reminderCheckbox.addEventListener('change', () => {
        reminderSelect.style.display = reminderCheckbox.checked ? 'block' : 'none';
      });
    }
  },

  // Load categories for datalist
  async loadCategories() {
    const categories = await Storage.getCategories();
    const datalist = document.getElementById('category-list');
    if (!datalist) return;
    datalist.innerHTML = '';

    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      datalist.appendChild(option);
    });
  },

  // Auto-resize description textarea dynamically to fit multiline content
  autoResizeDescription() {
    const desc = document.getElementById('task-description');
    if (!desc) return;
    desc.style.height = 'auto';
    const minH = 84;
    const maxH = 220;
    const scrollH = desc.scrollHeight;
    const targetH = Math.min(Math.max(scrollH, minH), maxH);
    desc.style.height = `${targetH}px`;
  },

  // Handle form submission
  getFormData() {
    const repeatSelect = document.getElementById('task-repeat');
    const reminderBefore = document.getElementById('task-reminder-before');

    const formData = {
      title: document.getElementById('task-title').value.trim(),
      description: document.getElementById('task-description').value.trim(),
      dueDate: document.getElementById('task-due-date').value || null,
      dueTime: document.getElementById('task-due-time').value || null,
      priority: this.form.querySelector('input[name="priority"]:checked')?.value || 'medium',
      category: document.getElementById('task-category').value.trim(),
      subtasks: this.currentSubtasks,
      tags: this.currentTags,
      repeat: repeatSelect?.value || null,
      reminder: {
        enabled: document.getElementById('task-reminder')?.checked || false,
        before: parseInt(reminderBefore?.value || '15'),
        notified: false
      },
      zoteroItemKey: this.currentZoteroLiterature?.key || null,
      zoteroItemID: this.currentZoteroLiterature?.itemID || null,
      zoteroAttachmentKey: this.currentZoteroLiterature?.attachmentKey || null,
      zoteroAnnotationKey: this.currentZoteroLiterature?.annotationKey || null,
      zoteroLinkStatus: this.currentZoteroLiterature?.linkStatus || null,
      zoteroAutoTitle: Boolean(this.currentZoteroLiterature?.autoTitle) && this.currentZoteroLiterature.initialTitle === document.getElementById('task-title').value.trim(),
      literatureWorkflowId: this.currentZoteroLiterature?.workflowId || null,
      readingProfile: document.getElementById('task-reading-profile')?.value || null,
      zoteroItemTitle: this.currentZoteroLiterature?.title || null,
      zoteroAuthors: this.currentZoteroLiterature?.authors || null,
      zoteroYear: this.currentZoteroLiterature?.year || null,
      zoteroLibraryID: this.currentZoteroLiterature?.libraryID || null,
      zoteroPublication: this.currentZoteroLiterature?.publication || null,
      zoteroUri: this.currentZoteroLiterature?.zoteroUri || null,
      zoteroPdfUri: this.currentZoteroLiterature?.pdfUri || null,
      zoteroPage: this.currentZoteroLiterature?.page || null,
      zoteroQuote: this.currentZoteroLiterature?.quote || null,
      academicType: this.currentZoteroLiterature?.academicType || this.getAcademicType() || null
    };

    if (this._creationState) Object.assign(formData, this._creationState);
    const old = this._originalTask;
    if (this.currentTaskId && old && old.dueDate === formData.dueDate && old.dueTime === formData.dueTime &&
      old.reminder?.enabled === formData.reminder.enabled && old.reminder?.before === formData.reminder.before) {
      formData.reminder.notified = Boolean(old.reminder?.notified);
    }

    return formData;
  },

  async handleSubmit() {
    if (this._isSubmitting) return;
    const formData = this.getFormData();

    if (!formData.title) {
      document.getElementById('task-title').focus();
      return;
    }

    const submitBtn = this.form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    this._isSubmitting = true;
    let committed = false;

    try {
      if (this.currentTaskId) {
        // Update existing task
        const changes = Object.fromEntries(Object.entries(formData).filter(([key, value]) =>
          !this._editSnapshot || JSON.stringify(value) !== JSON.stringify(this._editSnapshot[key])));
        const updated = await TaskManager.updateTask(this.currentTaskId, changes);
        if (!updated) throw new Error('任务已在其他窗口中删除');
        committed = true;
        UI.showToast('任务已更新');
      } else {
        // Add new task
        await TaskManager.addTask(formData);
        committed = true;
        UI.showToast('任务已添加');
      }

      this._isSubmitting = false;
      this.close();
      try { await this.loadCategories(); }
      catch (error) { Diagnostics.report('刷新任务分类（任务已保存）', error); }
      UI.render();

      // Notify service worker to update badge
      UI.notifyServiceWorker();
    } catch (error) {
      Diagnostics.showFailure(committed ? '刷新任务界面（任务已保存）' : '保存任务', error);
    } finally {
      this._isSubmitting = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  }
};

if (typeof window !== 'undefined') {
  window.ModalForm = ModalForm;
}

