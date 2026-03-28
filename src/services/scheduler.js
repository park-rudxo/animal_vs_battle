const cron = require('node-cron');
const webpush = require('web-push');
const { getDB } = require('../db/init');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@laterai.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendReminders() {
  const db = getDB();
  const now = new Date().toISOString();

  const items = db.prepare(`
    SELECT * FROM items
    WHERE remind_at IS NOT NULL
      AND remind_at <= ?
      AND reminded = 0
      AND status = 'unread'
    LIMIT 10
  `).all(now);

  if (items.length === 0) return;

  const subscriptions = db.prepare('SELECT * FROM push_subscriptions').all();

  for (const item of items) {
    const payload = JSON.stringify({
      title: '나중에 읽으려 했던 거 기억나요?',
      body: item.title || item.url,
      url: `/?highlight=${item.id}`,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        // Remove invalid subscriptions
        if (err.statusCode === 410) {
          db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
        }
      }
    }

    db.prepare('UPDATE items SET reminded = 1 WHERE id = ?').run(item.id);
  }

  console.log(`Sent reminders for ${items.length} item(s)`);
}

function startReminderScheduler() {
  // Check every 5 minutes
  cron.schedule('*/5 * * * *', sendReminders);
  console.log('Reminder scheduler started');
}

module.exports = { startReminderScheduler, sendReminders };
