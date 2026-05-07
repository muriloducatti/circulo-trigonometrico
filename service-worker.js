// Bump CACHE_NAME whenever you want to force eviction of old caches.
// With network-first strategy below, content updates are always fetched fresh
// from the network — this name only controls cleanup of stale cache buckets.
const CACHE_NAME = 'trig-circle-v10';

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/trig-circle.js',
  './js/geometry.js',
  './js/graph.js',
  './js/pwa.js',
  './assets/logo.svg',
  './assets/favicon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

// ── Message: respond to SKIP_WAITING from the page ───────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Install: pre-cache essential assets ──────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(PRECACHE))
      // Activate immediately — don't wait for old tabs to close
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete caches from previous versions ───────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      // Take control of all open clients immediately
      .then(() => self.clients.claim())
  );
});

// ── Fetch: Network-first strategy ────────────────────────────────────────
// Always try the network first so the app is always up-to-date.
// Falls back to cache only when the network is unavailable (offline).
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(networkRes => {
        // Store the fresh response in cache for offline fallback
        const copy = networkRes.clone();
        caches.open(CACHE_NAME)
          .then(c => c.put(e.request, copy))
          .catch(() => {});
        return networkRes;
      })
      .catch(() =>
        // Network failed — serve from cache (offline mode)
        caches.match(e.request)
      )
  );
});
