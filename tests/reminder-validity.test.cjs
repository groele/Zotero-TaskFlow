const test = require('node:test');
const assert = require('node:assert/strict');
const { page, makeHost } = require('./helpers.cjs');

test('failed native delivery is released for retry and never acknowledged as sent', async t => {
  const native = makeHost(), p = await page('index.html', null, native.host); t.after(p.close);
  const due = new Date(Date.now() + 5 * 60000);
  const task = await p.TaskManager.addTask({ title: 'Retry delivery', dueDate: p.Utils.toDateISO(due),
    dueTime: due.toTimeString().slice(0, 5), reminder: { enabled: true, before: 10, notified: false } });
  native.host.showNotice = async () => false;
  await assert.rejects(p.Notifications.checkReminders(), /提醒未能发送/);
  assert.equal((await p.Storage.getTaskById(task.id)).reminder.notified, false);
  assert.equal(Object.keys((await p.Storage.getAll()).notificationLeases).length, 0);
  native.host.showNotice = async () => true;
  await p.Notifications.checkReminders();
  assert.equal((await p.Storage.getTaskById(task.id)).reminder.notified, true);
});

test('daily summary propagates a failed delivery instead of recording a successful day', async t => {
  const native = makeHost(), p = await page('index.html', null, native.host); t.after(p.close);
  const now = new Date();
  await p.Storage.saveAll({ settings: { dailySummary: true, summaryTime: now.toTimeString().slice(0, 5) } });
  native.host.showNotice = async () => false;
  await assert.rejects(p.Notifications.checkDailySummary(now), /提醒未能发送/);
  assert.equal((await p.Storage.getAll()).lastSummaryDate || '', '');
  assert.equal(Object.keys((await p.Storage.getAll()).notificationLeases).length, 0);
  native.host.showNotice = async () => true;
  await p.Notifications.checkDailySummary(now);
  assert.equal((await p.Storage.getAll()).lastSummaryDate, p.Utils.toDateISO(now));
});

test('direct notification bridge waits for delivery and propagates an asynchronous failure', async t => {
  const native = makeHost(), p = await page('index.html', null, native.host); t.after(p.close);
  let release, finished = false;
  native.host.showNotice = () => new Promise(resolve => { release = resolve; });
  const pending = p.ZoteroBridge.notify('Reminder', 'Body').finally(() => { finished = true; });
  const failure = assert.rejects(pending, /提醒未能发送/);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(finished, false);
  release(false); await failure;
  native.host.showNotice = async () => true;
  assert.equal(await p.ZoteroBridge.notify('Reminder', 'Body'), true);
  assert.equal(p.ZoteroBridge._requestCallbacks.size, 0);
});

test('posted notification bridge acknowledges only a matching host response', async t => {
  const native = makeHost(), p = await page('index.html', null, native.host); t.after(p.close);
  let message, finished = false;
  p.ZoteroBridge.sendToHost = value => { message = value; };
  const pending = p.ZoteroBridge.notify('Reminder', 'Body').then(result => { finished = true; return result; });
  await Promise.resolve(); assert.equal(finished, false);
  p.win.dispatchEvent(new p.win.MessageEvent('message', { source: p.win, data: {
    type: 'TODOLIST_NOTIFY_RESULT', requestId: 'unrelated', success: true
  } }));
  await Promise.resolve(); assert.equal(finished, false);
  p.win.dispatchEvent(new p.win.MessageEvent('message', { source: p.win, data: {
    type: 'TODOLIST_NOTIFY_RESULT', requestId: message.requestId, success: true
  } }));
  assert.equal(await pending, true);
  assert.equal(p.ZoteroBridge._requestCallbacks.size, 0);
});

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
