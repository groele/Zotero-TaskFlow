import { TaskFlowStoragePersistence } from './storagePersistence';
import { escapeHtml } from '../utils';

declare let Zotero: any;
declare let Services: any;
declare let Cc: any;
declare let Ci: any;
declare let IOUtils: any;

export class TaskFlowStorage extends TaskFlowStoragePersistence {
async exportData(format = 'json') {
      try {
        const data = await this.loadData();
        const fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
        const win = Zotero.getMainWindow?.() || (typeof Services !== 'undefined' ? Services.wm?.getMostRecentWindow?.('navigator:browser') : null);
        const titleMap = {
          json: '导出 TaskFlow JSON 备份',
          csv: '导出 TaskFlow CSV 表格 (Excel 兼容)',
          markdown: '导出 TaskFlow Markdown 清单',
          txt: '导出 TaskFlow 纯文本清单'
        };
        fp.init(win, titleMap[format] || '导出 TaskFlow 数据', Ci.nsIFilePicker.modeSave);
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        if (format === 'json') {
          fp.appendFilter('JSON Files (*.json)', '*.json');
          fp.defaultString = `taskflow-backup-${dateStr}.json`;
        } else if (format === 'csv') {
          fp.appendFilter('CSV Files (*.csv)', '*.csv');
          fp.defaultString = `taskflow-tasks-${dateStr}.csv`;
        } else if (format === 'markdown') {
          fp.appendFilter('Markdown Files (*.md)', '*.md');
          fp.defaultString = `taskflow-tasks-${dateStr}.md`;
        } else {
          fp.appendFilter('Text Files (*.txt)', '*.txt');
          fp.defaultString = `taskflow-tasks-${dateStr}.txt`;
        }

        const res = await new Promise((resolve) => fp.open(resolve));
        if (res === Ci.nsIFilePicker.returnOK || res === Ci.nsIFilePicker.returnReplace) {
          const filePath = fp.file.path;
          let content = '';
          const tasks = data.tasks || [];

          if (format === 'json') {
            content = JSON.stringify(data, null, 2);
          } else if (format === 'csv') {
            const escapeCsv = (str) => {
              let text = String(str ?? '');
              if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
              return `"${text.replace(/"/g, '""')}"`;
            };
            const headers = ['标题', '学术分类', '状态', '优先级', '截止日期', '时间', '关联文献', '文献年份', 'PDF链接', '描述', '创建时间', '完成时间'];
            const rows = tasks.map((t) => [
              escapeCsv(t.title),
              escapeCsv(t.academicType || t.category || 'generic'),
              escapeCsv(t.completed ? '已完成' : '待完成'),
              escapeCsv(t.priority || 'medium'),
              escapeCsv(t.dueDate || ''),
              escapeCsv(t.dueTime || ''),
              escapeCsv(t.zoteroItemTitle || ''),
              escapeCsv(t.zoteroYear || ''),
              escapeCsv(t.zoteroPdfUri || ''),
              escapeCsv(t.description || ''),
              escapeCsv(t.createdAt || ''),
              escapeCsv(t.completedAt || '')
            ].join(','));
            content = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
          } else if (format === 'markdown') {
            content = `# TaskFlow 学术任务清单\n导出时间：${new Date().toLocaleString()}\n总计：${tasks.length} 项 (已完成：${tasks.filter(t => t.completed).length}，待研读：${tasks.filter(t => !t.completed).length})\n\n---\n\n`;
            for (const t of tasks) {
              content += `- [${t.completed ? 'x' : ' '}] **${t.title}**${t.dueDate ? ` (截止: ${t.dueDate})` : ''}\n`;
              if (t.academicType) content += `  - 学术类型: ${t.academicType}\n`;
              if (t.zoteroItemTitle) content += `  - 关联文献: 《${t.zoteroItemTitle}》${t.zoteroYear ? ` (${t.zoteroYear})` : ''}\n`;
              if (t.zoteroPdfUri) content += `  - PDF 伴读链接: [打开 PDF](${t.zoteroPdfUri})\n`;
              if (t.description) content += `  - 描述: ${t.description.replace(/\n/g, ' ')}\n`;
              if (t.subtasks && t.subtasks.length > 0) {
                for (const sub of t.subtasks) {
                  content += `    - [${sub.completed ? 'x' : ' '}] ${sub.title}\n`;
                }
              }
            }
          } else {
            content = `TaskFlow 学术任务清单\n导出时间：${new Date().toLocaleString()}\n====================================\n\n`;
            const incomplete = tasks.filter(t => !t.completed);
            const completed = tasks.filter(t => t.completed);
            if (incomplete.length > 0) {
              content += `【待完成研读与任务】(${incomplete.length})\n`;
              incomplete.forEach((t, i) => {
                content += `${i + 1}. ${t.title}${t.dueDate ? ` [${t.dueDate}]` : ''}\n`;
                if (t.zoteroItemTitle) content += `   文献: 《${t.zoteroItemTitle}》\n`;
              });
              content += '\n';
            }
            if (completed.length > 0) {
              content += `【已完成任务】(${completed.length})\n`;
              completed.forEach((t, i) => {
                content += `${i + 1}. ✓ ${t.title}\n`;
              });
            }
          }

          await IOUtils.writeUTF8(filePath, content);
          this.showNotice('导出成功', `已成功导出至：${filePath}`);
          return filePath;
        }
      } catch (err) {
        Zotero.logError?.('[TaskFlow] exportData error: ' + err);
        this.recordDiagnostic({ action: '导出待办数据', message: String(err?.message || err), stack: err?.stack });
        this.showNotice('导出失败', String(err.message || err));
      }
      return null;
    }


    async importDataFile(mode = 'merge', window = null) {
      try {
        const fp = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
        const win = window || Zotero.getMainWindow?.() || (typeof Services !== 'undefined' ? Services.wm?.getMostRecentWindow?.('navigator:browser') : null);
        fp.init(win, '选择 TaskFlow JSON 备份文件导入', Ci.nsIFilePicker.modeOpen);
        fp.appendFilter('JSON Files (*.json)', '*.json');

        const res = await new Promise((resolve) => fp.open(resolve));
        if (res === Ci.nsIFilePicker.returnOK) {
          const filePath = fp.file.path;
          const rawText = await IOUtils.readUTF8(filePath);
          let importedJson;
          try {
            importedJson = JSON.parse(rawText);
          } catch (pe) {
            throw new Error('所选文件不是合法的 JSON 格式数据');
          }

          const saved = await this.saveData({ importRequest: { payload: importedJson, mode }, syncLinkedItems: true });
          const imported = saved.importResult.imported;
          if (mode === 'replace') {
            this._paneDeleted = [];
            clearTimeout(this._paneUndoTimer);
          }

          this.showNotice('导入成功', `已成功导入 ${imported} 个任务与标签数据！`);
          return { success: true, count: imported };
        }
      } catch (err) {
        Zotero.logError?.('[TaskFlow] importDataFile error: ' + err);
        this.recordDiagnostic({ action: '导入待办数据', message: String(err?.message || err), stack: err?.stack });
        this.showNotice('导入失败', String(err.message || err));
        return { success: false, error: err.message };
      }
      return { success: false, cancelled: true };
    }


    async clearAllData(window = null) {
      try {
        await this.saveData({ tasks: [], history: [], customTags: [], customTemplates: [],
          searchHistory: [], activeTimers: {}, syncLinkedItems: true });
        this._paneDeleted = [];
        clearTimeout(this._paneUndoTimer);
        this.showNotice('数据已清空', '所有任务、历史记录与自定义标签已安全清空。');
        return true;
      } catch (err) {
        Zotero.logError?.('[TaskFlow] clearAllData error: ' + err);
        return false;
      }
    }


    async getTasksSummaryText() {
      const data = await this.loadData();
      const tasks = data.tasks || [];
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const pending = total - completed;
      const litTasks = tasks.filter(t => t.zoteroItemKey);

      let summary = `# 📋 TaskFlow 学术任务研读概览\n`;
      summary += `生成时间：${new Date().toLocaleString()}\n`;
      summary += `任务总数：${total} 项 | 已完成：${completed} 项 | 进行中：${pending} 项 | 文献关联：${litTasks.length} 篇\n`;
      summary += `总体完成率：${total > 0 ? Math.round((completed / total) * 100) : 0}%\n\n`;

      if (pending > 0) {
        summary += `### ⏳ 进行中研读待办\n`;
        tasks.filter(t => !t.completed).forEach((t, i) => {
          summary += `${i + 1}. **${t.title}**`;
          if (t.zoteroItemTitle) summary += ` (文献: 《${t.zoteroItemTitle}》)`;
          if (t.dueDate) summary += ` [截止: ${t.dueDate}]`;
          summary += `\n`;
        });
        summary += `\n`;
      }

      if (completed > 0) {
        summary += `### ✅ 已完成研读精读\n`;
        tasks.filter(t => t.completed).slice(-10).forEach((t, i) => {
          summary += `${i + 1}. ✓ ~~${t.title}~~`;
          if (t.zoteroItemTitle) summary += ` (《${t.zoteroItemTitle}》)`;
          summary += `\n`;
        });
      }

      return summary;
    }


    async copyTasksSummary(window = null) {
      try {
        const text = await this.getTasksSummaryText();
        const clipboard = Cc['@mozilla.org/widget/clipboardhelper;1'].getService(Ci.nsIClipboardHelper);
        clipboard.copyString(text);
        this.showNotice('已复制概览', '学术任务概览已复制到系统剪贴板，可直接粘贴至周报或笔记。');
        return true;
      } catch (err) {
        Zotero.logError?.('[TaskFlow] copyTasksSummary error: ' + err);
        return false;
      }
    }


    async printTasks(window = null) {
      try {
        const data = await this.loadData();
        const tasks = data.tasks || [];
        const win = window || Zotero.getMainWindow?.() || Services.wm.getMostRecentWindow('navigator:browser');

        let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>TaskFlow 学术任务清单</title><style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; line-height: 1.5; }
          h1 { font-size: 20px; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 4px; color: #065f46; }
          .meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
          .task-row { display: flex; align-items: baseline; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
          .box { width: 14px; height: 14px; border: 1.5px solid #94a3b8; border-radius: 3px; display: inline-block; }
          .done .box { background: #059669; border-color: #059669; }
          .done .title { text-decoration: line-through; color: #94a3b8; }
          .title { font-weight: 600; font-size: 14px; }
          .lit { font-size: 12px; color: #2563eb; background: #eff6ff; padding: 1px 6px; border-radius: 4px; }
          .date { font-size: 11px; color: #d97706; margin-left: auto; }
          @media print { body { padding: 0; } }
        </style></head><body>`;

        html += `<h1>TaskFlow 学术日程与研读清单</h1>`;
        html += `<div class="meta">打印时间：${new Date().toLocaleString()} | 共 ${tasks.length} 项 (已完成：${tasks.filter(t => t.completed).length})</div>`;

        tasks.forEach((t) => {
          html += `<div class="task-row ${t.completed ? 'done' : ''}">
            <span class="box"></span>
            <span class="title">${escapeHtml(t.title || '')}</span>
            ${t.zoteroItemTitle ? `<span class="lit">📖 ${escapeHtml(t.zoteroItemTitle)}</span>` : ''}
            ${t.dueDate ? `<span class="date">📅 ${escapeHtml(t.dueDate)}</span>` : ''}
          </div>`;
        });

        html += `</body></html>`;

        const printWin = win.open('', '_blank', 'width=800,height=700');
        if (!printWin || !printWin.document) {
          this.showNotice('打印提示', '无法打开打印窗口，请检查是否被弹窗拦截。');
          return;
        }
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        try { printWin.focus(); } catch (_) {}
        setTimeout(() => {
          try { printWin.print(); } catch (_) {}
        }, 300);
      } catch (err) {
        Zotero.logError?.('[TaskFlow] printTasks error: ' + err);
      }
    }
}
