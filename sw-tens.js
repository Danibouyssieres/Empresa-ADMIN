// =========================================================================
// SERVICE WORKER - APLICACIÓN MÓVIL TENS (OFFLINE-FIRST + PUSH NOTIFICATIONS)
// =========================================================================
const CACHE_NAME = 'msa-tens-v3';
const ASSETS_TO_CACHE = [
  '/tens.html',
  '/manifest-tens.json',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Solicitudes a la API: Network first, con fallback si está offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ offline: true, error: 'Sin conexión a internet. Guardado en dispositivo.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 2. Navegación / HTML: NETWORK FIRST (siempre descarga los últimos cambios si hay conexión, fallback a cache offline)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Recursos estáticos (iconos, imágenes): Cache first con actualización
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

// =========================================================================
// EVENTO PUSH: RECEPCIÓN DE NOTIFICACIONES EN SEGUNDO PLANO
// =========================================================================
self.addEventListener('push', (event) => {
  let data = {
    title: '🚑 Alerta TENS Terreno',
    body: 'Tienes una actualización de servicio o tarea pendiente.',
    icon: '/apple-touch-icon.png',
    badge: '/favicon-32x32.png',
    tag: 'tens-alert',
    url: '/tens.html'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = Object.assign(data, parsed);
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/apple-touch-icon.png',
    badge: data.badge || '/favicon-32x32.png',
    vibrate: [250, 100, 250, 100, 250],
    tag: data.tag || 'tens-alert',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/tens.html'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// =========================================================================
// CLICK EN NOTIFICACIÓN: ABRIR O ENFOCAR LA APP
// =========================================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/tens.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('tens.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
