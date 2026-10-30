const test = require('node:test');
const assert = require('node:assert/strict');
const { makeHost, JSDOM, waitFor } = require('./helpers.cjs');

function toolbar(t, native) {
  const dom = new JSDOM('<html><head></head><body><toolbar id="zotero-items-toolbar"></toolbar></body></html>');
  t.after(() => dom.window.close());
  native.host.isMainWindow = () => true;
  native.host.createXULElement = (doc, tag) => doc.createElement(tag);
  native.host.injectToolbarButton(dom.window, [], 1);
  return { win: dom.window, doc: dom.window.document, button: dom.window.document.getElementById('todolist-toolbar-button') };
}

test('toolbar loads pending parent count, excludes completed tasks and exposes full overdue count', async t => {
  const native = makeHost({ tasks: [{id:'a',completed:false,dueDate:'2000-01-01',subtasks:[{completed:false},{completed:false}]},
    {id:'b',completed:true}, {id:'c',completed:false}], settings:{},customTags:[] });
  const {button,doc} = toolbar(t,native);
  await waitFor(() => button.getAttribute('data-taskflow-count') === '2');
  assert.match(button.getAttribute('tooltiptext'), /2 unfinished, 1 overdue/);
  assert.match(button.getAttribute('image'), /icons\/todolist.svg$/);
  const calls=[];doc.l10n={setAttributes:(...args)=>calls.push(args)};
  native.host.updateToolbarBadge(doc,{tasks:Array.from({length:103},()=>({completed:false}))});
  assert.equal(button.getAttribute('data-taskflow-count'),'99+');
  assert.equal(calls[0][2].count,103);
  native.host.updateToolbarBadge(doc,{tasks:[]});
  assert.equal(button.hasAttribute('data-taskflow-count'),false);
});

test('a pending startup read does not update a removed toolbar or duplicate its style', async t => {
  const native=makeHost();let resolve;
  native.host.loadData=()=>new Promise(done=>{resolve=done;});
  const {win,doc,button}=toolbar(t,native);
  button.remove();resolve({tasks:[{completed:false}]});
  await Promise.resolve();await Promise.resolve();
  assert.equal(button.hasAttribute('data-taskflow-count'),false);
  native.host._cachedData={tasks:[]};native.host.injectToolbarButton(win,[],1);
  assert.equal(doc.querySelectorAll('#taskflow-toolbar-style').length,1);
});

test('saved task changes update both window badges and window removal cleans up its style', async t => {
  const native=makeHost();
  await native.host.loadData();
  const a=toolbar(t,native),b=toolbar(t,native);
  native.host.ensureLocalization=()=>{};
  native.host.addToWindow(a.win);native.host.addToWindow(b.win);
  t.after(()=>{native.host.removeFromWindow(a.win);native.host.removeFromWindow(b.win);});
  await native.host.saveData({taskChanges:{added:[{id:'shared',title:'Shared',completed:false}]}});
  assert.equal(a.button.getAttribute('data-taskflow-count'),'1');
  assert.equal(b.button.getAttribute('data-taskflow-count'),'1');
  native.host.removeFromWindow(a.win);
  assert.equal(a.doc.getElementById('taskflow-toolbar-style'),null);
  await native.host.saveData({taskChanges:{updated:[{id:'shared',changes:{completed:true}}]}});
  assert.equal(b.button.hasAttribute('data-taskflow-count'),false);
});
