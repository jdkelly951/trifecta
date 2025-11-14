const CACHE_VERSION = 'trifecta-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase-client.js',
  './sw.js',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './questions/aplus-1201.json',
  './questions/aplus-1202.json',
  './questions/networkplus.json',
  './questions/securityplus.json',
  './questions/aplus-pbq.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION) {
            return caches.delete(key);
          }
          return undefined;
        })
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const clonedResponse = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clonedResponse));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
