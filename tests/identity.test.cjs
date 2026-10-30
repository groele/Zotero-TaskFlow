const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeHost, read, root, JSDOM, waitFor } = require('./helpers.cjs');

test('manifest.json and package.json declare the same candidate version and taskflow@groele.org', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
  assert.equal(manifest.applications.zotero.id, 'taskflow@groele.org');
  assert.equal(manifest.browser_specific_settings.zotero.id, 'taskflow@groele.org');

  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.name, 'zotero-taskflow');
  assert.equal(pkg.version, manifest.version);
});

test('published update.json matches the stable package for taskflow@groele.org', () => {
  const update = JSON.parse(read('update.json'));
  const version = JSON.parse(read('manifest.json')).version;
  const product = JSON.parse(read('docs/brand/product.json'));
  assert(update.addons['taskflow@groele.org']);
  const taskflowVersion = update.addons['taskflow@groele.org'].updates[0].version;
  assert.equal(product.releaseStatus, 'stable');
  assert.equal(product.version, version);
  assert.equal(taskflowVersion, version);
  const entry = update.addons['taskflow@groele.org'].updates[0];
  assert.equal(entry.update_link, `https://github.com/groele/Zotero-TaskFlow/releases/download/v${taskflowVersion}/zotero-taskflow-${taskflowVersion}.xpi`);
});

test('chrome.manifest registers pure taskflow namespaces', () => {
  const manifest = read('chrome.manifest');
  assert.match(manifest, /content\s+taskflow\s+chrome\/content\//);
  assert.doesNotMatch(manifest, /content\s+todolist/);
  assert.match(manifest, /locale\s+taskflow\s+zh-CN\s+locale\/zh-CN\//);
  assert.match(manifest, /locale\s+taskflow\s+en-US\s+locale\/en-US\//);
});

test('taskflow.ftl locale files exist and provide taskflow keys', () => {
  for (const locale of ['zh-CN', 'en-US']) {
    const ftl = read(`locale/${locale}/taskflow.ftl`);
    assert.match(ftl, /taskflow-item-pane-header\s*=/);
    assert.match(ftl, /taskflow-item-pane-sidenav\s*=/);
  }
});

test('host runtime uses taskflow identifier system purely', async () => {
  const native = makeHost();
  assert.equal(native.host.addonId, 'taskflow@groele.org');
  assert.equal(native.host.legacyAddonId, undefined);
  assert(native.host.getDataFilePath().endsWith('taskflow-data.json'));
  assert.equal(native.host.getLegacyDataFilePath, undefined);
});

test('readDataFile reads taskflow-data.json directly without legacy fallback', async () => {
  const tasks = [{ id: 'task_v13_1', title: 'TaskFlow v13 reading task' }];
  const data = { tasks, settings: { defaultView: 'kanban' } };

  const writtenFiles = new Map();
  writtenFiles.set('/test/taskflow-data.json', JSON.stringify(data));

  const mockContext = {
    console, setTimeout, clearTimeout, Promise,
    PathUtils: { join: (...parts) => parts.join('/'), profileDir: '/test' },
    IOUtils: {
      exists: async (file) => file.endsWith('taskflow-data.json') && writtenFiles.has(file),
      readUTF8: async (file) => {
        if (file.endsWith('taskflow-data.json') && writtenFiles.has(file)) {
          return writtenFiles.get(file);
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
  assert.equal(loaded.tasks[0].id, 'task_v13_1');
});

test('getPref and setPref work purely with extensions.taskflow.* without legacy fallback', async () => {
  const prefs = new Map([
    ['extensions.taskflow.defaultView', 'kanban']
  ]);

  const native = makeHost();
  native.context.Zotero.Prefs = {
    get: (key) => prefs.get(key),
    set: (key, val) => prefs.set(key, val)
  };

  // extensions.taskflow returns correct value
  assert.equal(native.host.getPref('defaultView', 'list'), 'kanban');
  // Default is returned when not set
  assert.equal(native.host.getPref('nonexistent', 'fallback_val'), 'fallback_val');

  // setPref updates extensions.taskflow exclusively
  native.host.setPref('theme', 'light');
  assert.equal(prefs.get('extensions.taskflow.theme'), 'light');
  assert.equal(prefs.get('extensions.todolist.theme'), undefined);
});

test('handleHostMessage accepts messages from chrome://taskflow/ origin', async t => {
  const native = makeHost({ tasks: [{ id: 'task_001', title: 'Origin test' }], settings: {} });
  const main = new JSDOM('<body><div id="zotero-pane"><toolbar id="zotero-items-toolbar"></toolbar></div></body>');
  const taskflowWin = new JSDOM('<body></body>', { url: 'chrome://taskflow/content/index.html?mode=window' });
  t.after(() => { main.window.close(); taskflowWin.window.close(); });

  main.window.ZoteroPane = {};
  native.host.addToWindow(main.window);

  const send = (source, payload) => main.window.dispatchEvent(new main.window.MessageEvent('message', {
    source, data: { type: 'TODOLIST_STORAGE_SET', requestId: 'test_origin', payload }
  }));

  // Send from chrome://taskflow/
  send(taskflowWin.window, { tasks: [{ id: 'new_from_taskflow', title: 'Via TaskFlow URL' }] });
  await waitFor(() => native.disk().tasks[0]?.id === 'new_from_taskflow');
  assert.equal(native.disk().tasks[0].id, 'new_from_taskflow');
});
