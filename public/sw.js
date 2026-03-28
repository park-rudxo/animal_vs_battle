const CACHE_NAME = 'laterai-v1';
const STATIC_ASSETS = ['/', '/index.html', '/app.js', '/style.css', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.url.includes('/api/')) return; // Don't cache API calls

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const { title = 'LaterAI', body = '', url = '/', icon = '/icons/icon-192.png', badge = '/icons/badge-72.png' } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
      actions: [
        { action: 'open', title: '지금 보기' },
        { action: 'snooze', title: '1시간 후에' },
      ],
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  if (event.action === 'snooze') {
    // Tell the app to snooze this item
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length) clients[0].postMessage({ type: 'snooze', url });
      })
    );
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const match = clients.find(c => c.url.includes(self.location.origin));
      if (match) {
        match.focus();
        match.postMessage({ type: 'navigate', url });
      } else {
        self.clients.openWindow(self.location.origin + url);
      }
    })
  );
});
