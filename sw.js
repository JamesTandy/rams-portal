/* RE Plant Hire RAMS Portal — service worker
   Caches the app shell so the portal opens with no signal on site.
   Live data still syncs to Supabase when back online. */
const CACHE = 'replant-rams-v1';
const SHELL = ['./', './index.html'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache cross-origin calls (Supabase, fonts APIs) — always go to network.
  if (url.origin !== self.location.origin) return;

  // App navigations: serve the cached shell first so it works offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then((cached) =>
        cached || fetch(req).catch(() => caches.match('./'))
      )
    );
    return;
  }

  // Same-origin assets: cache-first, then network, and cache a copy.
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});
