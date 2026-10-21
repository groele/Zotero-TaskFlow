const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeHost, read, root, JSDOM, waitFor } = require('./helpers.cjs');

test('manifest.json and package.json declare the same release version and todolist@groele.org', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.applications.zotero.id, 'todolist@groele.org');
  assert.equal(manifest.browser_specific_settings.zotero.id, 'todolist@groele.org');

  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.name, 'zotero-taskflow');
  assert.equal(pkg.version, manifest.version);
});

test('update.json provides the current version for both taskflow and todolist IDs', () => {
  const update = JSON.parse(read('update.json'));
  const version = JSON.parse(read('manifest.json')).version;
  assert(update.addons['taskflow@groele.org']);
  assert.equal(update.addons['taskflow@groele.org'].updates[0].version, version);
  assert(update.addons['todolist@groele.org']);
  assert.equal(update.addons['todolist@groele.org'].updates[0].version, version);
});

test('chrome.manifest registers both taskflow and todolist namespaces', () => {
  const manifest = read('chrome.manifest');
  assert.match(manifest, /content\s+taskflow\s+chrome\/content\//);
  assert.match(manifest, /content\s+todolist\s+chrome\/content\//);
  assert.match(manifest, /locale\s+taskflow\s+zh-CN\s+locale\/zh-CN\//);
  assert.match(manifest, /locale\s+taskflow\s+en-US\s+locale\/en-US\//);
});

test('taskflow.ftl locale files exist and provide both taskflow and todolist keys', () => {
  for (const locale of ['zh-CN', 'en-US']) {
    const ftl = read(`locale/${locale}/taskflow.ftl`);
    assert.match(ftl, /taskflow-item-pane-header\s*=/);
    assert.match(ftl, /taskflow-item-pane-sidenav\s*=/);
    assert.match(ftl, /todolist-item-pane-header\s*=/);
    assert.match(ftl, /todolist-item-pane-sidenav\s*=/);
  }
});

test('host runtime uses taskflow identifier system with transparent legacy fallback', async () => {
  const native = makeHost();
  assert.equal(native.host.addonId, 'todolist@groele.org');
  assert.equal(native.host.legacyAddonId, 'taskflow@groele.org');
  assert(native.host.getDataFilePath().endsWith('taskflow-data.json'));
  assert(native.host.getLegacyDataFilePath().endsWith('todolist-data.json'));
});

test('readDataFile migrates legacy todolist-data.json when taskflow-data.json does not exist', async () => {
  const legacyTasks = [{ id: 'migrated_task_1', title: 'Legacy reading task' }];
  const legacyData = { tasks: legacyTasks, settings: { defaultView: 'kanban' } };

  const writtenFiles = new Map();
  const mockContext = {
    console, setTimeout, clearTimeout, Promise,
    PathUtils: { join: (...parts) => parts.join('/'), profileDir: '/test' },
    IOUtils: {
      exists: async (file) => {
        if (file.endsWith('taskflow-data.json')) return writtenFiles.has(file);
        if (file.endsWith('todolist-data.json')) return true;
        return false;
      },
      readUTF8: async (file) => {
        if (file.endsWith('taskflow-data.json') && writtenFiles.has(file)) {
          return writtenFiles.get(file);
        }
        if (file.endsWith('todolist-data.json')) {
          return JSON.stringify(legacyData);
        }
        throw new Error('File not found: ' + file);
      },
      writeUTF8: async (file, text) => {
        writtenFiles.set(file, text);
      }
    },
    Zotero: {
      DataDirectory: { dir: '/test' },
      logError: () => {},
      log: () => {},
      Prefs: { get: () => undefined, set: () => {} }
    }
  };

  const vm = require('node:vm');
  const ctx = vm.createContext(mockContext);
  vm.runInContext(read('chrome/content/js/taskRules.js'), ctx);
  vm.runInContext(read('chrome/content/js/literatureWorkflow.js'), ctx);
  const runtime = read('chrome/content/scripts/index.js')
    .replace('  Zotero.TaskFlow.init();', '  // init supplied by test')
    .replace('  Zotero.Todolist.init();', '  // init supplied by test');
  vm.runInContext(runtime, ctx);

  const host = ctx.Zotero.TaskFlow;
  const loaded = await host.readDataFile();

  assert.equal(loaded.tasks.length, 1);
  assert.equal(loaded.tasks[0].id, 'migrated_task_1');
  assert(writtenFiles.has('/test/taskflow-data.json'), 'Should automatically persist migrated data to taskflow-data.json');
  const persisted = JSON.parse(writtenFiles.get('/test/taskflow-data.json'));
  assert.equal(persisted.tasks[0].id, 'migrated_task_1');
});

test('getPref prioritizes extensions.taskflow.* and falls back to extensions.todolist.*', async () => {
  const prefs = new Map([
    ['extensions.todolist.theme', 'dark'],
    ['extensions.taskflow.defaultView', 'kanban']
  ]);

  const native = makeHost();
  native.context.Zotero.Prefs = {
    get: (key) => prefs.get(key),
    set: (key, val) => prefs.set(key, val)
  };

  // extensions.taskflow takes precedence
  assert.equal(native.host.getPref('defaultView', 'list'), 'kanban');
  // extensions.todolist is used when extensions.taskflow is undefined
  assert.equal(native.host.getPref('theme', 'zotero'), 'dark');
  // Default is returned when neither is set
  assert.equal(native.host.getPref('nonexistent', 'fallback_val'), 'fallback_val');

  // setPref updates both
  native.host.setPref('theme', 'light');
  assert.equal(prefs.get('extensions.taskflow.theme'), 'light');
  assert.equal(prefs.get('extensions.todolist.theme'), 'light');
});

test('handleHostMessage accepts messages from chrome://taskflow/ origin as well as chrome://todolist/', async t => {
  const native = makeHost({ tasks: [{ id: 'task_001', title: 'Origin test' }], settings: {} });
  const main = new JSDOM('<body><div id="zotero-pane"><toolbar id="zotero-items-toolbar"></toolbar></div></body>');
  const taskflowWin = new JSDOM('<body></body>', { url: 'chrome://taskflow/content/index.html?mode=window' });
  const todolistWin = new JSDOM('<body></body>', { url: 'chrome://todolist/content/index.html?mode=window' });
  t.after(() => { main.window.close(); taskflowWin.window.close(); todolistWin.window.close(); });

  main.window.ZoteroPane = {};
  native.host.addToWindow(main.window);

  const send = (source, payload) => main.window.dispatchEvent(new main.window.MessageEvent('message', {
    source, data: { type: 'TODOLIST_STORAGE_SET', requestId: 'test_origin', payload }
  }));

  // Send from chrome://taskflow/
  send(taskflowWin.window, { tasks: [{ id: 'new_from_taskflow', title: 'Via TaskFlow URL' }] });
  await waitFor(() => native.disk().tasks[0]?.id === 'new_from_taskflow');
  assert.equal(native.disk().tasks[0].id, 'new_from_taskflow');

  // Send from chrome://todolist/ (legacy compatibility)
  send(todolistWin.window, { tasks: [{ id: 'new_from_todolist', title: 'Via Todolist URL' }] });
  await waitFor(() => native.disk().tasks[0]?.id === 'new_from_todolist');
  assert.equal(native.disk().tasks[0].id, 'new_from_todolist');
});
