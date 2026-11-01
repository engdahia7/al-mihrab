/* eslint-disable no-restricted-globals */
/**
 * Al-Mihrab Mobile Push & Local Notification Service Worker (sw-push.js)
 * Ensures ServiceWorkerRegistration.showNotification() works reliably on
 * Android Chrome, Samsung Internet, iOS 16.4+ Home Screen Web Apps, and Desktop.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'SHOW_PHONE_NOTIFICATION' && data.title) {
    const options = data.options || {};
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: options.body || '',
        dir: 'rtl',
        lang: 'ar',
        icon: options.icon || '/pwa-192x192.png',
        badge: options.badge || '/pwa-192x192.png',
        tag: options.tag || `almihrab-${Date.now()}`,
        renotify: true,
        requireInteraction: Boolean(options.requireInteraction),
        vibrate: options.vibrate || [250, 100, 250, 100, 350],
        data: options.data || { url: '/' },
      })
    );
  }
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'المحراب · تنبيه الصلاة والأذكار',
    body: 'حيّ على الصلاة، حيّ على الفلاح — افتح تطبيق المحراب لعرض المواقيت والأذكار.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: `almihrab-push-${Date.now()}`,
    url: '/',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      try {
        payload.body = event.data.text();
      } catch {
        // use default
      }
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      dir: 'rtl',
      lang: 'ar',
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      renotify: true,
      vibrate: [250, 100, 250, 100, 350],
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              tag: event.notification.tag,
              data: event.notification.data,
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});
