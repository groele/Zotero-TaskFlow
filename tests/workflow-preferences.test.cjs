const test = require('node:test');
const assert = require('node:assert/strict');
const { page, makeHost, waitFor, JSDOM, read } = require('./helpers.cjs');

const paper = (id, key = `PAPER${id}`, libraryID = 1) => ({ id, key, libraryID,
  isRegularItem: () => true, getField: field => field === 'title' ? `Paper ${id}` : '',
  getCreators: () => [], getTags: () => [] });

test('native priority preference reaches workspace forms and quick creation, while explicit choices win', async t => {
  const native = makeHost();
  native.host.getPref = key => key === 'defaultPriority' ? 'high' : undefined;
  const p = await page('index.html', null, native.host); t.after(p.close);
  p.Modal.openAdd();
  assert.equal(p.doc.querySelector('input[name="priority"]:checked').value, 'high');
  p.Modal.openAdd({ priority: 'low' });
  assert.equal(p.doc.querySelector('input[name="priority"]:checked').value, 'low');
  assert.equal((await p.TaskManager.addTask({ title: 'Quick add' })).priority, 'high');
  assert.equal((await p.TaskManager.addTask({ title: 'Explicit', priority: 'low' })).priority, 'low');
});
function fixture(items) {
  const native = makeHost();
  native.context.Zotero.Items.get = id => items.find(item => item.id === id) || null;
  native.context.Zotero.Items.getByLibraryAndKey = (libraryID, key) =>
    items.find(item => item.libraryID === libraryID && item.key === key) || null;
  const prefs = new Map();
  native.context.Zotero.Prefs.get = key => prefs.get(key);
  return { ...native, prefs };
}
function drag(p, type, payload = '2', mime = 'zotero/item') {
  const event = new p.win.Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: { types: [mime], getData: () => payload, dropEffect: '' } });
  p.doc.querySelector('.views-container').dispatchEvent(event);
  return event;
}

test('native drop creates an atomic batch from payload IDs, resolves child PDFs and deduplicates by library', async () => {
  const native = fixture([paper(1, 'SAME'), paper(2, 'SAME', 2),
    { id: 3, parentItemID: 1, isAttachment: () => true }, { ...paper(4), deleted: true }]);
  const outcomes = await Promise.all([native.host.addDroppedLiteratureTasks([1, 2, 3, 4, 999]),
    native.host.addDroppedLiteratureTasks([1, 2])]);
  assert.equal(native.disk().tasks.length, 2);
  assert.equal(outcomes.reduce((sum, result) => sum + result.added, 0), 2);
  assert.deepEqual(native.disk().tasks.map(task => task.zoteroLibraryID).sort(), [1, 2]);
  assert(native.disk().tasks.every(task => task.dueDate && task.literatureWorkflowId === 'reading'));
  assert.equal((await native.host.addDroppedLiteratureTasks([3])).skipped, 1);
});

test('native drop rejects disabled/invalid payloads and failed writes leave no partial tasks', async () => {
  const native = fixture([paper(1), paper(2)]);
  for (const invalid of [[], ['1'], [0], [-1], [1.5], [NaN], Array(1001).fill(1), null]) {
    await assert.rejects(native.host.addDroppedLiteratureTasks(invalid), /无效/);
  }
  native.prefs.set('extensions.taskflow.dragDropFromLibrary', false);
  await assert.rejects(native.host.addDroppedLiteratureTasks([1]), /关闭/);
  native.prefs.set('extensions.taskflow.dragDropFromLibrary', true);
  native.failWrites(true);
  await assert.rejects(native.host.addDroppedLiteratureTasks([1, 2]), /disk full/);
  assert.equal(native.disk().tasks.length, 0);
  native.failWrites(false);
  assert.equal((await native.host.addDroppedLiteratureTasks([1, 2])).added, 2);
});

test('DOM drop imports the dragged paper rather than current selection and a repeated drop does not duplicate', async t => {
  const native = fixture([paper(1), paper(2), paper(3)]);
  native.host.getCurrentActiveItem = () => paper(1);
  const p = await page('index.html', null, native.host); t.after(p.close);
  p.ZoteroBridge.getActiveItem = () => { throw new Error('must not use current selection'); };
  assert.equal(drag(p, 'dragover', '2,3').defaultPrevented, true);
  assert(p.doc.querySelector('.zotero-drag-overlay-cue'));
  assert.equal(drag(p, 'drop', '2,3').defaultPrevented, true);
  await waitFor(() => native.disk().tasks.length === 2 && p.TaskManager.getTasks().length === 2);
  assert.deepEqual(native.disk().tasks.map(task => task.zoteroItemKey).sort(), ['PAPER2', 'PAPER3']);
  assert.equal(p.doc.querySelector('.zotero-drag-overlay-cue'), null);
  drag(p, 'drop', '2,3');
  await waitFor(() => p.doc.getElementById('toast-message').textContent.includes('跳过已有待办 2'));
  assert.equal(native.disk().tasks.length, 2);
});

test('DOM drop ignores text and disabled native drags, and reports failed writes before allowing retry', async t => {
  const native = fixture([paper(1)]);
  const p = await page('index.html', null, native.host); t.after(p.close);
  assert.equal(drag(p, 'dragover', '1', 'text/plain').defaultPrevented, false);
  assert.equal(p.doc.querySelector('.zotero-drag-overlay-cue'), null);
  native.prefs.set('extensions.taskflow.dragDropFromLibrary', false);
  assert.equal(drag(p, 'drop', '1').defaultPrevented, false);
  assert.equal(native.disk().tasks.length, 0);
  native.prefs.set('extensions.taskflow.dragDropFromLibrary', true);
  native.failWrites(true); drag(p, 'drop', '1');
  await waitFor(() => p.doc.getElementById('toast-message').textContent.includes('disk full'));
  assert.equal(native.disk().tasks.length, 0);
  native.failWrites(false); drag(p, 'drop', '1');
  await waitFor(() => native.disk().tasks.length === 1);
});

test('linked list and kanban card clicks honor locate preference while explicit edit and locate remain usable', async t => {
  const native = fixture([paper(1)]);
  await native.host.addDroppedLiteratureTasks([1]);
  const located = []; native.host.locateLiteratureItem = (...args) => located.push(args);
  const p = await page('index.html', null, native.host); t.after(p.close);
  p.doc.querySelector('.task-card').click();
  await waitFor(() => located.length === 1);
  assert.equal(p.Modal.dialog.open, false);
  p.doc.querySelector('.task-action.edit').click();
  await waitFor(() => p.Modal.dialog.open); p.Modal.dialog.close();
  native.prefs.set('extensions.taskflow.locateOnTaskClick', false);
  p.doc.querySelector('.task-card').click();
  await waitFor(() => p.Modal.dialog.open); p.Modal.dialog.close();
  p.doc.querySelector('.task-action.zotero-locate').click();
  await waitFor(() => located.length === 2);
  await p.UI.switchView('kanban');
  p.doc.querySelector('.kanban-task').click();
  await waitFor(() => p.Modal.dialog.open); p.Modal.dialog.close();
  native.prefs.set('extensions.taskflow.locateOnTaskClick', true);
  p.doc.querySelector('.kanban-academic-badge').click();
  await waitFor(() => located.length === 3);
});

test('PDF preference centrally controls page and annotation navigation including URI page fallback', async () => {
  const pdf = { id: 2, key: 'PDFKEY', libraryID: 1, isAttachment: () => true, isPDFAttachment: () => true };
  const annotation = { id: 3, key: 'ANN', libraryID: 1, parentItemID: 2 };
  const native = fixture([pdf, annotation]); const opened = [], notices = [];
  native.context.Zotero.Reader = { open: async (...args) => opened.push(args) };
  native.host.showNotice = (...args) => notices.push(args);
  const task = { zoteroPdfUri: 'zotero://open-pdf/library/items/PDFKEY?page=7', zoteroLibraryID: 1, zoteroAnnotationKey: 'ANN' };
  await native.host.openTaskPdf(task);
  assert.deepEqual(JSON.parse(JSON.stringify(opened[0])), [2, { pageIndex: 6, annotationID: 'ANN' }]);
  native.prefs.set('extensions.taskflow.pdfReaderJumpPage', false);
  await native.host.openTaskPdf({ ...task, zoteroAnnotationKey: 'REMOVED' });
  assert.equal(opened[1][0], 2); assert.equal(opened[1][1], undefined);
  assert.equal(notices.length, 0);
  native.prefs.set('extensions.taskflow.pdfReaderJumpPage', true);
  await native.host.openTaskPdf({ ...task, zoteroAnnotationKey: 'REMOVED' });
  assert.equal(opened[2][1].pageIndex, 6);
  assert.equal(opened[2][1].annotationID, undefined);
  assert.equal(notices[0][0], '批注已不可用');
});

test('compact companion layout changes live without changing the stored sidebar choice or regular windows', async t => {
  const native = fixture([]);
  const p = await page('index.html', null, native.host); t.after(p.close);
  p.win.history.replaceState(null, '', '?mode=subwindow');
  p.ZoteroBridge.detectEnvironment(); p.ZoteroBridge.applyWindowLayout();
  assert(p.doc.documentElement.classList.contains('subwindow-mode'));
  assert(p.doc.body.classList.contains('subwindow-mode'));
  native.prefs.set('extensions.taskflow.subwindowCompactMode', false);
  await native.host.saveData({ settings: { subwindowCompactMode: false, sidebarExpanded: true } });
  assert.equal(p.doc.body.classList.contains('subwindow-mode'), false);
  assert.equal(native.disk().settings.sidebarExpanded, true);
  native.prefs.set('extensions.taskflow.subwindowCompactMode', true);
  await native.host.saveData({ settings: { subwindowCompactMode: true } });
  assert(p.doc.body.classList.contains('subwindow-mode'));
  p.win.history.replaceState(null, '', '?mode=window');
  p.ZoteroBridge.detectEnvironment(); p.ZoteroBridge.applyWindowLayout();
  assert.equal(p.doc.body.classList.contains('subwindow-mode'), false);
});

test('native localization loads one alias-complete resource once per document and accepts a preloaded legacy resource', t => {
  const native = makeHost();
  const dom = new JSDOM('<head></head><body></body>'); t.after(() => dom.window.close());
  const doc = dom.window.document, calls = [];
  dom.window.MozXULElement = { insertFTLIfNeeded: href => {
    calls.push(href);
    const link = doc.createElement('link'); link.rel = 'localization'; link.setAttribute('href', href); doc.head.appendChild(link);
  } };
  native.host.ensureLocalization(doc); native.host.ensureLocalization(doc);
  assert.deepEqual(calls, ['taskflow.ftl']);
  assert.equal(doc.querySelectorAll('link[rel="localization"]').length, 1);
  const legacy = new JSDOM('<head><link rel="localization" href="todolist.ftl"></head><body></body>');
  t.after(() => legacy.window.close());
  legacy.window.MozXULElement = { insertFTLIfNeeded: href => calls.push(href) };
  native.host.ensureLocalization(legacy.window.document);
  assert.deepEqual(calls, ['taskflow.ftl']);
  for (const locale of ['zh-CN', 'en-US']) {
    const ids = name => [...read(`locale/${locale}/${name}.ftl`).matchAll(/^([a-z][\w-]*)\s*=/gm)].map(match => match[1]).sort();
    assert.deepEqual(ids('taskflow'), ids('todolist'), `${locale}: preserve all legacy message IDs in the canonical resource`);
  }
});
