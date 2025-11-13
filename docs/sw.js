const CACHE_VERSION = 'v2025-11-13gz';
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
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
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
const NETWORK_FIRST_PATHS = ['/', '/index.html', '/app.js', '/styles.css', '/manifest.json'];

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (event.request.mode === 'navigate' || shouldUseNetworkFirst(url)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

function shouldUseNetworkFirst(url) {
  if (url.origin !== self.location.origin) return false;
  return NETWORK_FIRST_PATHS.some((path) => url.pathname.endsWith(path));
}

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }
      throw new Error('Network response not ok');
    })
    .catch(() =>
      caches.match(request).then((cached) => {
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return undefined;
      })
    );
}

function cacheFirst(request) {
  return caches.match(request).then((cachedResponse) => {
    if (cachedResponse) {
      fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) return;
          caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
        })
        .catch(() => null);
      return cachedResponse;
    }

    return fetch(request)
      .then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
          return networkResponse;
        }
        const cloned = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        return networkResponse;
      })
      .catch(() => caches.match('./index.html'));
  });
}
