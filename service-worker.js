/* Nantia's Commissions — Web Push service worker */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {
    data = { title: "Nantia's Commissions", body: event.data ? event.data.text() : "Your commission has been updated." };
  }

  const title = data.title || "Nantia's Commissions";
  const options = {
    body: data.body || "Your commission has been updated.",
    // Main notification icon: Nantia's original favicon.
    icon: "/favicon.ico",
    // Keep the existing Nantia diamond as the notification badge.
    badge: "/images/notification-icon.png",
    tag: data.tag || "nantia-commission-update",
    renotify: true,
    data: { url: data.url || "/commission/" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification?.data?.url || "/commission/";
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of allClients) {
      try {
        const url = new URL(client.url);
        const targetUrl = new URL(target, self.location.origin);
        if (url.origin === targetUrl.origin && "focus" in client) {
          await client.focus();
          if (url.pathname === "/commission/" || url.pathname === "/commission") return;
          if ("navigate" in client) await client.navigate(targetUrl.href);
          return;
        }
      } catch (_) {}
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
