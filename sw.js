const CACHE_NAME = 'lng-pwa-v1.0';

const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/assets/logo.png',
  '/assets/logo-mark.png',
  '/assets/icons/icon-72x72.png',
  '/assets/icons/icon-96x96.png',
  '/assets/icons/icon-128x128.png',
  '/assets/icons/icon-144x144.png',
  '/assets/icons/icon-152x152.png',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-384x384.png',
  '/assets/icons/icon-512x512.png',
  '/assets/icons/maskable-icon-512x512.png',
  '/assets/icons/apple-touch-icon.png'
];

// Install: Pre-cache core shell
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[SW] Some precache assets could not be cached immediately:', err);
      });
    })
  );
});

// Activate: Prune stale caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache version:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Smart real estate routing
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. SAFETY FIRST: All mutations and API calls bypass Service Worker completely
  if (req.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return; // Direct network execution
  }

  // 2. Navigation requests (User loading or clicking HTML pages)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match(req).then(cached => {
          return cached || caches.match('/offline.html');
        });
      })
    );
    return;
  }

  // 3. Static Assets: Icons, Images, Logos, Styles (Stale-While-Revalidate)
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.css') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(req).then(cachedResponse => {
        const fetchPromise = fetch(req).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, responseToCache));
          }
          return networkResponse;
        }).catch(() => {
          // Network failed, nothing to update
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Default: Network first, fallback to cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
