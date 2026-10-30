const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM, read } = require('./helpers.cjs');

test('standalone TaskFlow chrome window bootstraps from its Zotero opener and dispatches mode changes directly', async () => {
  const calls = [];
  const host = {
    loadData: async () => ({ tasks: [], settings: {} }),
    switchWindowMode: (mode, win) => calls.push({ mode, win })
  };
  const zotero = { TaskFlow: host, getMainWindow: () => null };
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'chrome://taskflow/content/index.html?mode=subwindow',
    runScripts: 'outside-only'
  });
  const win = dom.window;
  Object.defineProperty(win, 'opener', { configurable: true, value: { Zotero: zotero, postMessage: () => { throw new Error('opener postMessage must not be used'); } } });
  win.Storage = { getZoteroInstance: () => win.Zotero, getPreference: (_key, fallback) => fallback,
    acceptData: data => { win.receivedData = data; } };
  win.Diagnostics = { report: () => {} };
  win.eval(read('chrome/content/js/zoteroBridge.js') + '\nwindow.bridge = ZoteroBridge; ZoteroBridge.init();');
  try {
    assert.equal(win.bridge.isZotero, true);
    await win.bridge.whenReady();
    assert.deepEqual(win.receivedData, { tasks: [], settings: {} });
    win.bridge.sendToHost({ type: 'TODOLIST_SWITCH_WINDOW_MODE', mode: 'tab' });
    await new Promise(resolve => win.setTimeout(resolve, 0));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].mode, 'tab');
    assert.equal(calls[0].win, win);
  } finally {
    win.close();
  }
});
