import { TaskFlowItemPane } from '../itemPane';
import { ADDON_ID, CHROME_ROOT } from '../config';

declare let Zotero: any;
declare let Services: any;
declare let rootURI: string;

export class TaskFlowBase {
  [key: string]: any;

  rootURI: string = typeof rootURI !== 'undefined' ? rootURI : '';
  addonId: string = ADDON_ID;
  localizedDocs: Set<any> = new Set();
  _cachedData: any = null;
  _dataListeners: Set<any> = new Set();
  _saveQueue: Promise<any> = Promise.resolve();
  _saveScheduled: any = null;
  _lastSavedData: any = null;
  _expectedTasksGeneration: number = 0;
  _cleaners: Set<any> = new Set();
  _standaloneDeliveryTimers: Set<any> = new Set();
  _themeObserverAttached: boolean = false;
  _notifierID: any = null;
  _readerHookAttached: boolean = false;
  _readerInitHook: any = null;
  itemPaneSectionID: any = null;

    recordDiagnostic(record) {
      const entry = {
        time: new Date().toISOString(), version: typeof version !== 'undefined' ? version : 'unknown',
        action: String(record?.action || 'unknown').slice(0, 160),
        message: String(record?.message || '').slice(0, 2000),
        cause: String(record?.cause || '').slice(0, 2000),
        stack: String(record?.stack || '').slice(0, 8000),
        page: String(record?.page || '').slice(0, 300)
      };
      const run = async () => {
        const file = PathUtils.join(Zotero.DataDirectory?.dir || PathUtils.profileDir, 'taskflow-debug.json');
        if (!this._diagnosticRecords) {
          try {
            let existing = null;
            if (await IOUtils.exists(file)) {
              existing = JSON.parse(await IOUtils.readUTF8(file));
            }
            this._diagnosticRecords = Array.isArray(existing) ? existing.slice(-49) : [];
          } catch (_) { this._diagnosticRecords = []; }
        }
        this._diagnosticRecords.push(entry);
        this._diagnosticRecords = this._diagnosticRecords.slice(-50);
        await IOUtils.writeUTF8(file, JSON.stringify(this._diagnosticRecords, null, 2), { tmpPath: file + '.tmp' });
      };
      const result = (this._diagnosticQueue || Promise.resolve()).then(run);
      this._diagnosticQueue = result.catch(error => Zotero.logError?.('[TaskFlow] Diagnostic log write failed: ' + error));
      return this._diagnosticQueue;
    }


    ensureLocalization(doc) {
      if (!doc || this.localizedDocs.has(doc)) return;
      const existing = doc.querySelector('link[rel="localization"][href="taskflow.ftl"]') ||
                       doc.querySelector('link[rel="localization"][href="todolist.ftl"]');
      if (existing) return;
      try {
        doc.defaultView?.MozXULElement?.insertFTLIfNeeded('taskflow.ftl');
        if (doc.querySelector('link[rel="localization"][href="taskflow.ftl"]') ||
            doc.querySelector('link[rel="localization"][href="todolist.ftl"]')) {
          this.localizedDocs.add(doc);
        }
      } catch (error) {
        Zotero.logError?.('[TaskFlow] Could not load translations: ' + error);
      }
    }


    ensureItemPaneStyles(doc) {
      if (typeof Zotero !== 'undefined' && Zotero.TaskFlowItemPane?.ensureItemPaneStyles) {
        return Zotero.TaskFlowItemPane.ensureItemPaneStyles(doc);
      }
      if (typeof TaskFlowItemPane !== 'undefined' && TaskFlowItemPane.ensureItemPaneStyles) {
        return TaskFlowItemPane.ensureItemPaneStyles(doc);
      }
    }


    getPref(key, defaultVal) {
      try {
        if (Zotero.Prefs) {
          const tfVal = Zotero.Prefs.get(`extensions.taskflow.${key}`, true);
          if (tfVal !== undefined) return tfVal;
        }
      } catch (_) {}
      return defaultVal;
    }


    setPref(key, val) {
      try {
        if (Zotero.Prefs) {
          Zotero.Prefs.set(`extensions.taskflow.${key}`, val, true);
        }
      } catch (_) {}
    }


    showNotice(headline, description = '', timeout = 4000) {
      try {
        const progress = new Zotero.ProgressWindow({ closeOnClick: true });
        progress.changeHeadline(headline);
        if (description) progress.addDescription(description);
        progress.show();
        progress.startCloseTimer(timeout);
        return true;
      } catch (e) {
        Zotero.log?.(`[TaskFlow] Notice: ${headline} - ${description}`);
        return false;
      }
    }


    getHostTheme() {
      try { return Zotero.getMainWindow?.()?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
      catch (_) { return 'light'; }
    }
}
