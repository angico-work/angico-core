/* Angico service worker — offline support via runtime caching.
 *
 * Strategy:
 *  - SPA navigations: network-first, falling back to the cached app shell so the
 *    app still opens with no connection.
 *  - Same-origin static assets (JS/CSS/fonts/images): stale-while-revalidate, so
 *    after the first online visit they load instantly and work offline.
 *  - Same-origin API GETs (/api/...): network-first with a cache fallback, so the
 *    last território data seen online is still rendered offline.
 *
 * Bump CACHE to invalidate everything on the next deploy.
 */
const CACHE = 'angico-cache-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/angico-icone-main.png', '/angico-leaf.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // SPA navigations → network-first, fall back to the cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/')))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // API reads → network-first, fall back to the last cached response.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets → stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
