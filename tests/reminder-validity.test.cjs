const test = require('node:test');
const assert = require('node:assert/strict');
const { page, makeHost } = require('./helpers.cjs');

for (const hostMode of [false, true]) {
  test(`${hostMode ? 'host' : 'local'}: queued reminders respect completion, deletion, rescheduling and current titles`, async t => {
    const native = hostMode ? makeHost() : null;
    const p = await page('index.html', null, native?.host); t.after(p.close);
    const due = new Date(Date.now() + 5 * 60000);
    const tasks = [];
    for (const title of ['first', 'completed', 'deleted', 'rescheduled', 'renamed']) tasks.push(await p.TaskManager.addTask({
      title, dueDate: p.Utils.toDateISO(due), dueTime: due.toTimeString().slice(0, 5),
      reminder: { enabled: true, before: 10, notified: false }
    }));
    const shown = [];
    p.Notifications.show = async (_title, body) => {
      shown.push(body);
      if (shown.length === 1) {
        await p.TaskManager.updateTask(tasks[1].id, { completed: true });
        await p.TaskManager.deleteTask(tasks[2].id);
        await p.TaskManager.updateTask(tasks[3].id, { dueDate: '2035-12-31' });
        await p.TaskManager.updateTask(tasks[4].id, { title: 'current title' });
      }
      return true;
    };
    await p.Notifications.checkReminders();
    assert.equal(shown.length, 2);
    assert.match(shown[1], /current title/);
    const saved = await p.Storage.getAll();
    assert.equal(saved.tasks.find(task => task.id === tasks[3].id).reminder.notified, false);
    assert.equal(Object.keys(saved.notificationLeases).length, 0);
  });
}

test('a lost or expired claim cannot send or acknowledge another window reservation', async t => {
  const p = await page(); t.after(p.close);
  const due = new Date(Date.now() + 60000);
  const task = await p.TaskManager.addTask({ title: 'Lease ownership', dueDate: p.Utils.toDateISO(due),
    dueTime: due.toTimeString().slice(0, 5), reminder: { enabled: true, before: 10, notified: false } });
  const action = { type: 'claim', kind: 'reminders', token: 'old-window', now: Date.now() };
  const claimed = await p.Storage.saveAll({ notificationAction: action });
  const key = claimed.notificationResult.tasks[0].key;
  let shown = 0;
  for (const lease of [
    { ...claimed.notificationLeases[key], token: 'new-window' },
    { ...claimed.notificationLeases[key], expiresAt: Date.now() - 1 }
  ]) {
    await p.Storage.saveAll({ notificationLeases: { [key]: lease } });
    await p.Notifications.deliverClaim(action, key, () => { shown++; });
  }
  assert.equal(shown, 0);
  assert.equal((await p.Storage.getTaskById(task.id)).reminder.notified, false);
});

test('a disabled daily summary is not sent after its reservation was created', async t => {
  const p = await page(); t.after(p.close);
  const now = new Date();
  await p.Storage.saveAll({ settings: { dailySummary: true, summaryTime: now.toTimeString().slice(0, 5) } });
  const original = p.Storage.saveAll.bind(p.Storage);
  p.Storage.saveAll = async patch => {
    const result = await original(patch);
    if (patch.notificationAction?.type === 'claim') await original({ settings: { dailySummary: false } });
    return result;
  };
  let shown = 0;
  p.Notifications.show = async () => { shown++; return true; };
  await p.Notifications.checkDailySummary(now);
  assert.equal(shown, 0);
  assert.equal(Object.keys((await p.Storage.getAll()).notificationLeases).length, 0);
});
