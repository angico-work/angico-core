const CACHE = 'angico-cache-__ANGICO_BUILD_REVISION__';
const ASSET_MANIFEST = '/asset-manifest.json';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/angico-icone.png'];

function manifestPrecacheUrls(manifest) {
  const urls = new Set(APP_SHELL);
  const visited = new Set();

  function addAsset(value) {
    if (typeof value !== 'string') return;
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
    if (!/\.(?:js|css|woff2?)$/.test(url.pathname)) return;
    urls.add(`${url.pathname}${url.search}`);
  }

  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const entry = manifest[key];
    if (!entry || typeof entry !== 'object') return;

    addAsset(entry.file);
    for (const value of entry.css ?? []) addAsset(value);
    for (const value of entry.assets ?? []) addAsset(value);
    for (const dependency of entry.imports ?? []) visit(dependency);
    for (const dependency of entry.dynamicImports ?? []) visit(dependency);
  }

  const entries = Object.keys(manifest).filter((key) => manifest[key]?.isEntry);
  for (const key of entries.length > 0 ? entries : Object.keys(manifest)) visit(key);
  return [...urls];
}

async function installApp() {
  const response = await fetch(ASSET_MANIFEST, { cache: 'no-store' });
  if (!response.ok) throw new Error('Manifesto de recursos indisponível.');
  const manifest = await response.json();
  const cache = await caches.open(CACHE);
  await cache.addAll(manifestPrecacheUrls(manifest));
  await self.skipWaiting();
}

self.addEventListener('install', (event) => {
  event.waitUntil(installApp());
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

  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

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
