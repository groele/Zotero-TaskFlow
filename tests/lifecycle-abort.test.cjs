const test = require('node:test');
const assert = require('node:assert/strict');
const { page, makeHost, waitFor, read, JSDOM } = require('./helpers.cjs');

function makePaper(id, key, libraryID = 1, overrides = {}) {
  return {
    id,
    key,
    libraryID,
    deleted: false,
    isRegularItem: () => true,
    isAttachment: () => false,
    isNote: () => false,
    getField: (field) => (field === 'title' ? `Paper ${key}` : ''),
    getCreators: () => [{ lastName: 'Smith' }],
    getTags: () => [],
    getAttachments: () => [],
    getNotes: () => [],
    ...overrides
  };
}

test('window unload aborts window listeners & retry timers; shutdown aborts pending window loads & host controller', async (t) => {
  const native = makeHost();
  const winDom = new JSDOM('<html><body><div id="zotero-pane"><toolbar id="zotero-items-toolbar"></toolbar></div></body></html>');
  t.after(() => winDom.window.close());
  winDom.window.ZoteroPane = {};

  native.context.Services = {
    wm: {
      getEnumerator: () => ({ hasMoreElements: () => false }),
      getMostRecentWindow: () => null,
      addListener: () => {},
      removeListener: () => {}
    }
  };
  await native.host.init();
  native.host.addToWindow(winDom.window);
  assert.ok(winDom.window.document.getElementById('todolist-toolbar-button'));

  let bridgeReplied = false;
  winDom.window.postMessage = () => {};
  const child = { postMessage: () => { bridgeReplied = true; }, location: { href: 'chrome://taskflow/content/index.html' } };
  winDom.window.dispatchEvent(new winDom.window.MessageEvent('message', { data: { type: 'TASKFLOW_READY' }, source: child }));
  await waitFor(() => bridgeReplied);

  // Simulate window unload -> clears injected UI and detaches AbortController-managed message listener
  winDom.window.dispatchEvent(new winDom.window.Event('unload'));
  assert.equal(winDom.window.document.getElementById('todolist-toolbar-button'), null);

  bridgeReplied = false;
  winDom.window.dispatchEvent(new winDom.window.MessageEvent('message', { data: { type: 'TASKFLOW_READY' }, source: child }));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(bridgeReplied, false, 'unload must remove window message listener via AbortController');

  // Pending window load before ready must abort on shutdown and never inject
  const pendingWin = new JSDOM('<html><body><div id="zotero-pane"></div></body></html>').window;
  t.after(() => pendingWin.close());
  Object.defineProperty(pendingWin.document, 'readyState', { value: 'loading', configurable: true });
  let addedToPending = false;
  const native2 = makeHost();
  const origAdd2 = native2.host.addToWindow.bind(native2.host);
  native2.host.addToWindow = (w) => {
    if (w === pendingWin) addedToPending = true;
    return origAdd2(w);
  };
  native2.context.Services = {
    wm: {
      getEnumerator: () => {
        let seen = false;
        return { hasMoreElements: () => !seen, getNext: () => { seen = true; return pendingWin; } };
      },
      getMostRecentWindow: () => null,
      addListener: () => {},
      removeListener: () => {}
    }
  };
  await native2.host.init();
  await native2.host.shutdown();
  pendingWin.dispatchEvent(new pendingWin.Event('load'));
  assert.equal(pendingWin.document.getElementById('todolist-toolbar-button'), null);
  assert.equal(addedToPending, false);
});

test('ItemPane item switch and destroy abort itemController and sectionController cleanly', async (t) => {
  const paperA = makePaper(1, 'AAA', 1);
  const paperB = makePaper(2, 'BBB', 1);
  const native = makeHost({
    tasks: [
      { id: 'ta', title: 'Task A', completed: false, zoteroItemKey: 'AAA', zoteroLibraryID: 1, subtasks: [{ id: 's1', title: 'S1', completed: false }] },
      { id: 'tb', title: 'Task B', completed: false, zoteroItemKey: 'BBB', zoteroLibraryID: 1, subtasks: [] }
    ],
    settings: {},
    customTags: []
  });
  native.context.Zotero.Items.getByLibraryAndKey = (_lib, key) => (key === 'AAA' ? paperA : paperB);
  const dom = new JSDOM('<body><div id="pane"></div></body>');
  t.after(() => dom.window.close());
  const doc = dom.window.document;
  const body = doc.getElementById('pane');

  native.host.registerItemPaneSection();
  const pane = native.pane();
  let current = paperA;
  const refresh = () => {
    pane.onRender({ doc, body, item: current });
    return pane.onAsyncRender({ doc, body, item: current });
  };
  pane.onInit({ doc, body, item: current, refresh });
  await refresh();

  const btnA = body.querySelector('.td-task-delete');
  assert.ok(btnA);

  // Switch item to paperB -> must abort paperA's itemController so btnA listener is removed
  current = paperB;
  pane.onItemChange({ body, item: paperB });
  await refresh();
  const diskBeforeClick = native.disk().tasks.length;
  btnA.click();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(native.disk().tasks.length, diskBeforeClick, 'detached button from previous item must not mutate after item switch');

  // Destroy -> unregisters data listener & silences sectionController
  const listenersBeforeDestroy = native.host._dataListeners.size;
  assert.equal(listenersBeforeDestroy, 1);
  pane.onDestroy({ body });
  assert.equal(native.host._dataListeners.size, 0, 'onDestroy must unregister ItemPane data listener');
});

test('Preferences auto-init fallback runs cleanly and unload aborts Prefs observer & control listeners', async (t) => {
  const groups = ['window', 'view', 'literature', 'sync', 'tags', 'academic', 'reader', 'reminders'];
  const dom = new JSDOM(
    '<body><div id="todolist-preferences-pane"></div><div id="taskflow-pref-status"></div>' +
      groups.map((g) => `<div id="todolist-pref-${g}"></div>`).join('') +
      '</body>',
    { runScripts: 'outside-only' }
  );
  t.after(() => dom.window.close());
  const win = dom.window;
  const native = makeHost();
  const prefValues = new Map();
  let unregistered = false;
  win.Zotero = {
    ...native.context.Zotero,
    Prefs: {
      get: (k) => prefValues.get(k),
      set: (k, v) => prefValues.set(k, v),
      registerObserver: () => 'obs_token_1',
      unregisterObserver: (tok) => {
        if (tok === 'obs_token_1') unregistered = true;
      }
    }
  };
  await waitFor(() => win.document.readyState === 'complete');
  win.eval(read('chrome/content/scripts/preferences.js'));
  // Auto-init fallback schedules a 50ms timeout on readyState === complete
  await waitFor(() => Boolean(win.document.getElementById('pref-enableSound')), 'auto-init fallback must populate controls');
  assert.ok(win.__taskflowPrefController && !win.__taskflowPrefController.signal.aborted);

  win.dispatchEvent(new win.Event('unload'));
  assert.equal(win.__taskflowPrefController, undefined);
  assert.equal(unregistered, true, 'unload must unregister preference observer via AbortController');
});

test('ZoteroBridge unload cancels pending requests/ready timers and ignores late messages', async (t) => {
  const p = await page('index.html', null, makeHost().host);
  t.after(p.close);
  let rejectedReady = false;
  p.ZoteroBridge.isZotero = true;
  p.ZoteroBridge.init();
  const readyWait = p.ZoteroBridge.whenReady().catch(() => { rejectedReady = true; });
  p.win.dispatchEvent(new p.win.Event('unload'));
  await readyWait;
  assert.equal(rejectedReady, true, 'unload must reject unsettled _readyPromise and clear _readyTimer');
  assert.equal(p.ZoteroBridge._readyTimer, null);

  // Re-init with mocked parent window to keep notify() request in-flight, then unload to verify rejection & cleanup
  p.ZoteroBridge.isZotero = true;
  p.win.parent = { postMessage: () => {} };
  p.ZoteroBridge.init();
  let rejectedReq = false;
  const pending = p.ZoteroBridge.notify('Title', 'Body').catch(() => { rejectedReq = true; });
  p.win.dispatchEvent(new p.win.Event('unload'));
  await pending;
  assert.equal(rejectedReq, true, 'unload must settle pending ZoteroBridge request');
  assert.equal(p.ZoteroBridge._requestCallbacks.size, 0);
});

test('Edge cases: concurrent updateTaskState, strict date bounds, overwrite normalization, empty subtasks & trashed sync', async (t) => {
  const native = makeHost({
    tasks: [
      {
        id: 't1',
        title: 'Main',
        completed: false,
        subtasks: [
          { id: 's1', title: 'One', completed: false },
          { id: 's2', title: 'Two', completed: false }
        ]
      },
      { id: 't_link', title: 'Linked Paper', completed: false, zoteroItemKey: 'GONE', zoteroLibraryID: 1, zoteroLinkStatus: 'active' }
    ],
    settings: {},
    customTags: []
  });

  // 1. Concurrent updateTaskState with atomic functional updaters must preserve sibling subtask completion
  await Promise.all([
    native.host.updateTaskState('t1', (curr) => ({
      subtasks: curr.subtasks.map((s) => (s.id === 's1' ? { ...s, completed: true } : s))
    })),
    native.host.updateTaskState('t1', (curr) => ({
      subtasks: curr.subtasks.map((s) => (s.id === 's2' ? { ...s, completed: true } : s))
    }))
  ]);
  const updated = native.disk().tasks.find((task) => task.id === 't1');
  assert.equal(updated.subtasks.every((s) => s.completed), true);

  // 2. TaskRules edge cases: invalid calendar date rejected; overwrite normalized to replace
  const { TaskRules } = native.context;
  assert.equal(
    TaskRules.reminderIsDue(
      { id: 'r1', completed: false, dueDate: '2026-02-31', dueTime: '09:00', reminder: { enabled: true, before: 15, notified: false } },
      Date.now()
    ),
    false
  );
  const prepared = TaskRules.prepareImport(native.disk(), { tasks: [{ id: 'imp1', title: 'New', completed: false }], customTags: [] }, 'overwrite');
  assert.equal(prepared.patch.tasks.map((x) => x.id).join(','), 'imp1');
  assert.equal(prepared.imported, 1);

  // 3. Literature edge cases: empty selection, trashed linked item status, duplicate/deleted collection plan items
  const emptyRes = await native.host.addLiteratureTasks([]);
  assert.deepEqual({ ...emptyRes }, { added: 0, skipped: 0 });

  const trashedPaper = makePaper(99, 'GONE', 1, { deleted: true });
  native.context.Zotero.Items.get = () => trashedPaper;
  native.context.Zotero.Items.getByLibraryAndKey = () => trashedPaper;
  await native.host.refreshLinkedLiterature(null, []);
  assert.equal(native.disk().tasks.find((x) => x.id === 't_link').zoteroLinkStatus, 'trashed');

  const validPaper = makePaper(50, 'VAL', 1);
  const col = {
    id: 10,
    key: 'COL1',
    name: 'Test Collection',
    getChildItems: () => [trashedPaper, validPaper, validPaper]
  };
  await native.host.createCollectionReadingPlan(col, null);
  const planTasks = native.disk().tasks.filter((x) => x.zoteroItemKey === 'VAL');
  assert.equal(planTasks.length, 1, 'collection reading plan must skip deleted items and duplicates');
});
