/**
 * Zotero TaskFlow - ItemPane Quick Add & Reading Profiles Module
 */

import { LiteratureWorkflow } from '../literatureWorkflow';
import { serializeLiteratureItem } from '../utils';
import { createEl } from './domView';

declare let Zotero: any;

export function renderQuickAddSection(
  doc: Document,
  target: any,
  host: any,
  state: any,
  uncompletedTasks: any[]
): any[] {
  const elements: any[] = [];
  const quickBox = createEl(doc, 'div', 'td-quick-box');
  const prioSelect = createEl(doc, 'select', 'td-prio-select');
  prioSelect.setAttribute('aria-label', '新待办优先级');
  prioSelect.title = '新待办优先级';
  const defaultPrio = state?.quickPriority || host.getPref('defaultPriority', 'medium');
  const priorities = [
    { val: 'medium', label: '中优先' },
    { val: 'high', label: '高优先' },
    { val: 'low', label: '低优先' }
  ];
  for (const p of priorities) {
    const opt = createEl(doc, 'option', '', p.label);
    opt.value = p.val;
    if (p.val === defaultPrio) opt.selected = true;
    prioSelect.appendChild(opt);
  }
  prioSelect.addEventListener('change', () => {
    if (state) state.quickPriority = prioSelect.value;
  });

  const quickInput = createEl(doc, 'input', 'td-quick-input');
  quickInput.type = 'text';
  quickInput.value = state?.quickDraft || '';
  quickInput.addEventListener('input', () => {
    if (state) state.quickDraft = quickInput.value;
  });
  quickInput.setAttribute('aria-label', '新待办事项');
  quickInput.placeholder = '输入待办内容，按 Enter 添加';
  quickInput.id = 'td-quick-input';

  const quickBtn = createEl(doc, 'button', 'td-quick-submit', '添加');
  quickBtn.type = 'button';
  quickBtn.title = '添加待办任务';
  quickBtn.setAttribute('aria-label', '添加待办任务');
  quickInput.disabled = prioSelect.disabled = quickBtn.disabled = Boolean(state?.saving);

  const literatureTitle = serializeLiteratureItem(target).title;
  const existingReadingTask = uncompletedTasks.find(
    (task: any) =>
      (task.literatureWorkflowId === 'reading' || task.title === `研读：${literatureTitle}`) &&
      (task.academicType || 'literature_reading') === 'literature_reading'
  );
  const addReadingBtn = createEl(
    doc,
    'button',
    'td-add-reading',
    existingReadingTask ? '已加入论文研读' : '＋ 添加到论文研读'
  );
  addReadingBtn.type = 'button';
  addReadingBtn.title = `为当前文献创建论文研读待办，默认 ${LiteratureWorkflow.days(host.getPref('defaultDueDays', 7))} 天后截止`;
  addReadingBtn.setAttribute('aria-label', '添加到论文研读');
  addReadingBtn.disabled = Boolean(existingReadingTask || state?.saving);
  if (addReadingBtn.disabled) addReadingBtn.style.opacity = '0.65';
  const addHint = createEl(
    doc,
    'div',
    'td-add-hint',
    existingReadingTask
      ? `已关联当前文献 · 截止日期：${existingReadingTask.dueDate || '未设置'}`
      : `点击即可创建待办并关联当前文献 · 默认 ${LiteratureWorkflow.days(host.getPref('defaultDueDays', 7))} 天后截止`
  );
  addHint.setAttribute('role', 'status');
  addHint.setAttribute('aria-live', 'polite');
  elements.push(addReadingBtn);
  elements.push(addHint);

  let saving = false;
  const handleQuickAdd = async (useLiteratureTitle = false) => {
    if (saving || state?.saving || (useLiteratureTitle && existingReadingTask)) return;
    const text = useLiteratureTitle ? '' : quickInput.value.trim();
    if (!useLiteratureTitle && !text) {
      quickInput.focus();
      return;
    }
    const selectedPrio = prioSelect.value || defaultPrio;
    saving = true;
    if (state) state.saving = true;
    addReadingBtn.disabled = true;
    quickBtn.disabled = true;
    quickInput.disabled = true;
    prioSelect.disabled = true;
    try {
      const result = await host.addLiteratureReadingTask(target, {
        title: text,
        priority: selectedPrio,
        academicType: useLiteratureTitle
          ? 'literature_reading'
          : host.getPref('defaultTaskType', 'literature_reading')
      });
      if (!useLiteratureTitle) {
        quickInput.value = '';
        if (state?.itemKey === target.key && state?.libraryID === target.libraryID) state.quickDraft = '';
      }
      host.showNotice(
        result.created ? '已加入待办事项' : '该文献已加入待办',
        `截止日期：${result.task.dueDate || '未设置'}`
      );
    } catch (error) {
      addHint.textContent = '保存失败，请重试。';
      host.showNotice('保存失败', String(error));
      return;
    } finally {
      saving = false;
      if (state) state.saving = false;
      addReadingBtn.disabled = Boolean(existingReadingTask);
      addReadingBtn.style.opacity = addReadingBtn.disabled ? '0.65' : '1';
      quickBtn.disabled = false;
      quickInput.disabled = false;
      prioSelect.disabled = false;
    }
    await state?.refresh?.();
  };

  addReadingBtn.addEventListener('click', () => {
    handleQuickAdd(true).catch((error: any) =>
      Zotero.logError?.('[TaskFlow] Quick add refresh failed: ' + error)
    );
  });
  quickInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAdd().catch((error: any) =>
        Zotero.logError?.('[TaskFlow] Quick add refresh failed: ' + error)
      );
    }
  });
  quickBtn.addEventListener('click', (e: Event) => {
    e.preventDefault();
    handleQuickAdd().catch((error: any) =>
      Zotero.logError?.('[TaskFlow] Quick add refresh failed: ' + error)
    );
  });

  const quickLabel = createEl(doc, 'label', 'td-quick-label', '快速新建待办');
  quickLabel.setAttribute('for', 'td-quick-input');
  elements.push(quickLabel);

  quickBox.appendChild(prioSelect);
  quickBox.appendChild(quickInput);
  quickBox.appendChild(quickBtn);
  elements.push(quickBox);

  return elements;
}

export function renderProfileSection(doc: Document, tasks: any[], host: any, state: any): { box: any; select: any } {
  const profileBox = createEl(doc, 'label', 'td-reading-profile', '研读模板');
  const profileSelect = createEl(doc, 'select');
  profileSelect.setAttribute('aria-label', '研读模板');
  const selectedProfile =
    state?.profileID ||
    tasks.find((task: any) => task.readingProfile)?.readingProfile ||
    host.getPref('readingProfile', 'general');
  for (const [id, profile] of Object.entries(LiteratureWorkflow.profiles)) {
    const option = createEl(doc, 'option', '', (profile as any).label);
    option.value = id;
    option.selected = id === selectedProfile;
    profileSelect.appendChild(option);
  }
  profileSelect.addEventListener('change', () => {
    if (state) state.profileID = profileSelect.value;
  });
  profileBox.appendChild(profileSelect);
  return { box: profileBox, select: profileSelect };
}

export function renderEmptyCard(doc: Document, target: any, host: any, state: any, profileSelect: any): any {
  const emptyCard = createEl(doc, 'div', 'td-empty-card');
  const emptyDesc = createEl(
    doc,
    'div',
    'td-empty-desc',
    '点击上方“添加到论文研读”或在输入框新建待办；也可按所选模板一键生成 5 步精读清单'
  );
  const btnCreateMilestones = createEl(doc, 'button', 'td-btn-milestone-primary', '生成精读清单');
  btnCreateMilestones.type = 'button';
  btnCreateMilestones.title = '按所选研读模板为本文献建立精读清单';
  btnCreateMilestones.addEventListener('click', async (e: Event) => {
    e.stopPropagation();
    await host.createReadingMilestones(target, Zotero.getMainWindow?.(), profileSelect.value);
    state?.refresh?.();
  });
  emptyCard.appendChild(emptyDesc);
  emptyCard.appendChild(btnCreateMilestones);
  return emptyCard;
}
