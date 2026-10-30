const test = require('node:test');
const assert = require('node:assert/strict');
const { page } = require('./helpers.cjs');

test('window mode button renders all three native DOM menu choices and dispatches the selected mode', async t => {
  const app = await page();
  t.after(app.close);
  const button = app.doc.getElementById('btn-zotero-window-mode');
  const dispatched = [];
  app.ZoteroBridge.switchWindowMode = mode => dispatched.push(mode);

  button.click();
  const menu = app.doc.querySelector('.zotero-mode-dropdown');
  assert(menu, 'clicking the button should open the mode menu');
  const options = [...menu.querySelectorAll('[data-mode]')];
  assert.deepEqual(options.map(option => option.dataset.mode), ['tab', 'subwindow', 'window']);
  assert(options.every(option => option.querySelector('svg path') && option.textContent.trim()));

  options.find(option => option.dataset.mode === 'subwindow').click();
  assert.deepEqual(dispatched, ['subwindow']);
  assert.equal(app.doc.querySelector('.zotero-mode-dropdown'), null);
});
