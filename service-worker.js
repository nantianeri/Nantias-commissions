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
    icon: data.icon || "/images/notification-icon.png",
    badge: data.badge || "/images/notification-icon.png",
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
          // Keep an already-open portal session intact. If no portal tab is open,
          // the code below opens the request-number URL and the client can log in.
          if (url.pathname === "/commission/" || url.pathname === "/commission") return;
          if ("navigate" in client) await client.navigate(targetUrl.href);
          return;
        }
      } catch (_) {}
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
