// Reçoit les notifications même quand le site est fermé
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil(self.registration.showNotification(d.titre || 'Boulangerie Manager', {
    body: d.texte || '',
    icon: 'icone-192.png',
    badge: 'icone-192.png',
    vibrate: [400, 150, 400, 150, 800],   // vibration longue (Android)
    requireInteraction: true,             // reste affichée jusqu'à ce qu'on la touche (Android / ordinateur)
    tag: 'bm-' + Date.now(),              // chaque notification sonne, même s'il y en a déjà une
    renotify: true,
    silent: false,
    data: { url: d.url || './' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data.url || './', self.registration.scope).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((liste) => {
    for (const c of liste) { if ('focus' in c) { c.navigate(url); return c.focus(); } }
    return clients.openWindow(url);
  }));
});
