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

test('toolbar count includes only non-overdue todo and in-progress parent tasks', async t => {
  const native = makeHost({ tasks: [{id:'a',status:'todo',completed:false,dueDate:'2000-01-01',subtasks:[{completed:false},{completed:false}]},
    {id:'b',status:'done',completed:true}, {id:'c',completed:false}, {id:'d',status:'in-progress',completed:false},
    {id:'e',status:'todo',completed:false,dueDate:'2999-01-01'}, {id:'f',status:'in-progress',completed:false,dueDate:'2000-01-01'}], settings:{},customTags:[] });
  const {button,doc} = toolbar(t,native);
  await waitFor(() => button.getAttribute('data-taskflow-count') === '3');
  assert.match(button.getAttribute('tooltiptext'), /3 to do or in progress.*2 overdue/);
  assert.match(button.getAttribute('image'), /icons\/(?:taskflow|todolist)\.svg$/);
  const calls=[];doc.l10n={setAttributes:(...args)=>calls.push(args)};
  native.host.updateToolbarBadge(doc,{tasks:Array.from({length:103},(_,i)=>({completed:false,status:i%2?'todo':'in-progress'}))});
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

test('toolbarShowBadge preference toggles toolbar badge visibility', async t => {
  const native = makeHost({ tasks: [{ id: 'a', status: 'todo', completed: false }], settings: {}, customTags: [] });
  const { button, doc } = toolbar(t, native);
  await waitFor(() => button.getAttribute('data-taskflow-count') === '1');

  native.host.getPref = (key, fallback) => key === 'toolbarShowBadge' ? false : fallback;
  native.host.updateToolbarBadge(doc, { tasks: [{ id: 'a', status: 'todo', completed: false }] });
  assert.equal(button.hasAttribute('data-taskflow-count'), false);

  native.host.getPref = (key, fallback) => key === 'toolbarShowBadge' ? true : fallback;
  native.host.updateToolbarBadge(doc, { tasks: [{ id: 'a', status: 'todo', completed: false }] });
  assert.equal(button.getAttribute('data-taskflow-count'), '1');
});

