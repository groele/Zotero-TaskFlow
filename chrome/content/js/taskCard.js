/**
 * Zotero TaskFlow - Task Card Component
 * Renders individual task cards with academic badges, subtasks, tags, and action buttons.
 */
(function (global) {
  const TaskCardRenderer = {
    createTaskCard(task, uiContext) {
    const ui = uiContext || (typeof UI !== "undefined" ? UI : { highlightText: (t) => t });
    const card = document.createElement('div');
    const isAcademic = !!(task.zoteroItemKey || (task.academicType && task.academicType !== 'general'));
    card.className = `task-card ${task.completed ? 'completed' : ''} ${isAcademic ? 'task-card-academic' : ''}`;
    card.dataset.taskId = task.id;
    if (task.academicType) {
      card.dataset.academicType = task.academicType;
    } else if (task.zoteroItemKey) {
      card.dataset.academicType = 'literature_reading';
    }

    // Check if in selection mode
    if (TaskManager.isSelectionMode()) {
      card.classList.add('selectable');
      if (TaskManager.isTaskSelected(task.id)) {
        card.classList.add('selected');
      }
    }

    // Check if overdue
    if (!task.completed && Utils.isOverdue(task.dueDate)) {
      card.classList.add('overdue');
    }

    // Set priority color
    card.style.setProperty('--priority-color', Utils.getPriorityColor(task.priority));

    // Build Academic Type badge HTML
    const academicTypeConfig = {
      literature_reading: { label: '📖 论文研读', className: 'reading' },
      writing: { label: '✍️ 论文写作', className: 'writing' },
      experiment: { label: '🔬 实验复现', className: 'experiment' },
      submission: { label: '⏰ 截稿 DDL', className: 'submission' },
      peer_review: { label: '📑 同行审稿', className: 'review' },
      general: { label: '📌 学术待办', className: 'general' }
    };
    let academicTypeHtml = '';
    const activeType = task.academicType || (task.zoteroItemKey ? 'literature_reading' : null);
    if (activeType && academicTypeConfig[activeType] && activeType !== 'general') {
      const conf = academicTypeConfig[activeType];
      academicTypeHtml = `<span class="task-academic-pill ${conf.className}">${conf.label}</span>`;
    }

    // Build due date HTML
    let dueDateHtml = '';
    if (task.dueDate) {
      const relativeDate = Utils.formatRelativeDate(task.dueDate);
      let dateClass = '';
      if (Utils.isOverdue(task.dueDate) && !task.completed) dateClass = 'overdue';
      if (Utils.isToday(task.dueDate)) dateClass = 'today';

      dueDateHtml = `
        <span class="task-due-date ${dateClass}">
          <svg viewBox="0 0 24 24" width="12" height="12">
            <path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
          ${relativeDate}
        </span>
      `;
    }

    // Build priority HTML
    const priorityHtml = `
      <span class="task-priority ${Utils.escapeHtml(task.priority)}">
        ${Utils.getPriorityLabel(task.priority)}
      </span>
    `;

    // Build category HTML
    let categoryHtml = '';
    if (task.category) {
      categoryHtml = `<span class="task-category">${ui.highlightText(task.category)}</span>`;
    }

    // Build subtask progress and inline items HTML
    let subtaskHtml = '';
    const progress = TaskManager.getSubtaskProgress(task);
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;

    const subtaskItems = hasSubtasks ? task.subtasks.map(st => `
      <div class="card-subtask-item ${st.completed ? 'completed' : ''}">
        <button type="button" class="card-subtask-checkbox ${st.completed ? 'checked' : ''}" role="checkbox" aria-checked="${Boolean(st.completed)}" aria-label="${st.completed ? '标记子任务为未完成' : '标记子任务为已完成'}" data-subtask-id="${Utils.escapeHtml(st.id)}"></button>
        <span class="card-subtask-text">${ui.highlightText(st.title)}</span>
        <button type="button" class="btn-card-delete-subtask" data-subtask-id="${Utils.escapeHtml(st.id)}" title="删除子任务">×</button>
      </div>
    `).join('') : '';

    const progressHeader = progress ? `
      <div class="subtask-progress">
        <span class="subtask-progress-text">子任务 ${progress.completed}/${progress.total}</span>
        <div class="subtask-progress-bar">
          <div class="subtask-progress-fill" style="width: ${progress.percentage}%"></div>
        </div>
      </div>
    ` : '';

    if (hasSubtasks || !task.completed) {
      subtaskHtml = `
        ${progressHeader}
        <div class="card-subtasks-container">
          ${subtaskItems}
          <div class="card-add-subtask-row">
            <input type="text" class="card-add-subtask-input" placeholder="+ 添加子任务 (按 Enter 确认)" data-task-id="${Utils.escapeHtml(task.id)}" autocomplete="off" />
          </div>
        </div>
      `;
    }

    // Build reminder indicator
    let reminderHtml = '';
    if (task.reminder?.enabled) {
      reminderHtml = '<span class="task-reminder-indicator" title="已设置提醒">🔔</span>';
    }

    // Build tags HTML
    const tagsHtml = Tags.renderTagBadges(task.tags);

    // Build repeat badge HTML
    const repeatHtml = Recurring.renderRepeatBadge(task.repeat);

    // Build time tracking HTML
    const timeHtml = TimeTracking.renderTimeStats(task);
    const timerBtn = TimeTracking.renderTimerButton(task.id);

    // Build Zotero literature badge HTML
    let zoteroBadgeHtml = '';
    if (task.zoteroItemKey || task.zoteroItemTitle) {
      const pageChip = task.zoteroPage ? `<span class="zotero-badge-page" title="关联文献 PDF 锚点页码">P.${Utils.escapeHtml(task.zoteroPage)}</span>` : '';
      const authorYear = [task.zoteroAuthors, task.zoteroYear].filter(Boolean).join(' · ');
      const authorChip = authorYear ? `<span class="zotero-badge-author-year" title="作者/年份">${ui.highlightText(authorYear)}</span>` : '';
      const pubChip = task.zoteroPublication ? `<span class="zotero-badge-pub" title="发表期刊/会议">${ui.highlightText(task.zoteroPublication)}</span>` : '';
      const openPdfBtn = (task.zoteroPdfUri || task.zoteroItemKey) ? 
        `<button type="button" class="btn-card-open-pdf" data-item-key="${Utils.escapeHtml(task.zoteroItemKey || '')}" data-page="${Utils.escapeHtml(task.zoteroPage || '')}" title="在 Zotero 阅读器中返回原文位置">${task.zoteroAnnotationKey ? '↗ 回到批注' : '📖 伴读'}</button>` : '';

      const quoteHtml = task.zoteroQuote ? `
        <blockquote class="task-lit-quote" title="论文关键摘录/观点">
          <span class="quote-mark">“</span>${ui.highlightText(task.zoteroQuote)}<span class="quote-mark">”</span>
        </blockquote>
      ` : '';

      zoteroBadgeHtml = `
        <div class="task-zotero-badge-card" data-item-key="${Utils.escapeHtml(task.zoteroItemKey || '')}">
          <div class="task-zotero-badge-main" title="点击在 Zotero 文献库中高亮定位：${Utils.escapeHtml(task.zoteroItemTitle || '')}">
            <span class="zotero-badge-icon">📄</span>
            <span class="zotero-badge-title">${ui.highlightText(task.zoteroItemTitle || '关联文献')}</span>
            ${['missing', 'trashed'].includes(task.zoteroLinkStatus) ? `<span class="zotero-link-warning">${task.zoteroLinkStatus === 'trashed' ? '文献在回收站' : '文献已删除'}</span>` : ''}
            ${pageChip}
            ${authorChip}
            ${pubChip}
            ${openPdfBtn}
          </div>
          ${quoteHtml}
        </div>
      `;
    }

    card.innerHTML = `
      <button type="button" class="task-checkbox ${task.completed ? 'checked' : ''}" role="checkbox" aria-checked="${Boolean(task.completed)}" aria-label="${task.completed ? '标记任务为未完成' : '标记任务为已完成'}" title="${task.completed ? '标记为未完成' : '标记为已完成'}"></button>
      <div class="task-content">
        <div class="task-title-row">
          <div class="task-title">
            ${academicTypeHtml}
            ${ui.highlightText(task.title)}
            ${reminderHtml}
            ${repeatHtml}
          </div>
          <button type="button" class="task-action delete task-quick-remove" aria-label="从 TaskFlow 移除此任务并保留关联的 Zotero 文献" title="仅移除 TaskFlow 任务，不删除关联的 Zotero 文献">移除</button>
        </div>
        ${task.description ? `<div class="task-description">${ui.highlightText(task.description)}</div>` : ''}
        ${zoteroBadgeHtml}
        ${subtaskHtml}
        ${tagsHtml ? `<div class="task-tags">${tagsHtml}</div>` : ''}
        <div class="task-meta">
          ${dueDateHtml}
          ${priorityHtml}
          ${categoryHtml}
          ${timeHtml}
        </div>
      </div>
      <div class="task-actions">
        ${task.zoteroItemKey ? `
          <button class="task-action zotero-copy-citation" title="复制文献学术引用" data-item-key="${Utils.escapeHtml(task.zoteroItemKey)}">
            <svg viewBox="0 0 24 24" width="15" height="15">
              <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          </button>
          <button class="task-action zotero-sync-note" title="同步待办至 Zotero 文献笔记 (支持云同步)" data-item-key="${Utils.escapeHtml(task.zoteroItemKey)}">
            <svg viewBox="0 0 24 24" width="15" height="15">
              <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
          </button>
          <button class="task-action zotero-locate" title="在 Zotero 中定位该文献" data-item-key="${Utils.escapeHtml(task.zoteroItemKey)}">
            <svg viewBox="0 0 24 24" width="15" height="15">
              <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </button>
        ` : ''}
        <button class="task-action timer" title="${TimeTracking.isTimerRunning(task.id) ? '停止计时' : '开始计时'}" data-task-id="${Utils.escapeHtml(task.id)}">
          ${TimeTracking.isTimerRunning(task.id) ? `
            <svg viewBox="0 0 24 24" width="15" height="15">
              <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ` : `
            <svg viewBox="0 0 24 24" width="15" height="15">
              <path fill="currentColor" d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
            </svg>
          `}
        </button>
        <button class="task-action duplicate" title="复制">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
        </button>
        <button class="task-action edit" title="编辑">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
      </div>
    `;

    return card;
  },
  };

  if (typeof global !== 'undefined') {
    global.TaskCardRenderer = TaskCardRenderer;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
