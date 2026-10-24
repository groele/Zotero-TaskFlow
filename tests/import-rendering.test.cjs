const test = require('node:test');
const assert = require('node:assert/strict');
const { page } = require('./helpers.cjs');

test('imported identifiers remain literal in timer controls, including quotes and markup', async t => {
  const p = await page(); t.after(p.close);
  const id = 'quoted"><img data-injected="true" src="invalid">&';
  await p.Storage.saveAll({ importRequest: { mode: 'merge', payload: { tasks: [
    { id, title: 'Imported safely', completed: false, priority: 'medium' }
  ] } } });
  await p.TaskManager.loadTasks(); p.UI.render();
  const control = p.doc.createElement('div');
  control.innerHTML = p.TimeTracking.renderTimerButton(id);
  const button = control.querySelector('.timer-btn');
  assert.equal(button.dataset.taskId, id);
  assert.equal(control.querySelector('[data-injected]'), null);
  assert.equal(p.doc.querySelector('.task-action.timer').dataset.taskId, id);
  assert.equal(p.doc.querySelector('[data-injected]'), null);
  await p.TimeTracking.startTimer(id);
  assert.equal(p.TimeTracking.isTimerRunning(id), true);
  await p.TimeTracking.stopTimer(id);
  assert.equal((await p.Storage.getTaskById(id)).timeEntries.length, 1);
});

for (const id of ['__proto__', 'constructor', 'toString']) {
  test(`imported identifier ${id} does not collide with timer dictionary properties`, async t => {
    const p = await page(); t.after(p.close);
    await p.Storage.saveAll({ importRequest: { mode: 'merge', payload: [
      { id, title: 'Legacy identifier', completed: false, priority: 'medium' }
    ] } });
    assert.equal(p.TimeTracking.isTimerRunning(id), false);
    assert.equal(p.TimeTracking.getElapsedTime(id), 0);
    const timer = await p.TimeTracking.startTimer(id);
    assert.ok(timer?.sessionId);
    await p.TimeTracking.stopTimer(id);
    assert.equal(p.TimeTracking.isTimerRunning(id), false);
    assert.equal((await p.Storage.getTaskById(id)).timeEntries.length, 1);
  });
}

test('an unknown imported priority cannot break the edit dialog selector', async t => {
  const p = await page(); t.after(p.close);
  await p.Storage.saveAll({ importRequest: { mode: 'merge', payload: [
    { id: 'priority-test', title: 'Legacy priority', completed: false, priority: '\"]broken[' }
  ] } });
  await p.TaskManager.loadTasks();
  await p.Modal.openEdit('priority-test');
  assert.equal(p.Modal.dialog.open, true);
  assert.equal(p.Modal.form.querySelector('input[name="priority"]:checked').value, 'medium');
});
