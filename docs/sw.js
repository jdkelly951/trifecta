const CACHE_VERSION = 'v2025-11-13a';
const CACHE_NAME = `cert-study-suite-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './questions/schema.json',
  './questions/aplus-1201.json',
  './questions/aplus-1202.json',
  './questions/networkplus.json',
  './questions/securityplus.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
      .then(() => self.clients.claim())
      .then(notifyClients)
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function notifyClients() {
  return self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clients) => {
      clients.forEach((client) => client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_VERSION }));
    });
}
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
            return networkResponse;
          }
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
