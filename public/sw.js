/**
 * TripMate PWA Service Worker
 * Safe, Ultra-Fast Static Asset Caching with Strict Network-Only Dynamic Bypasses
 */

const CACHE_NAME = 'tripmate-pwa-static-v1';
const STATIC_EXTENSIONS = /\.(?:woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|webp|ico)$/i;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Strict Network-Only Bypass
  // Immediately return live network response without touching cache for:
  // - Any non-GET request (POST, PUT, DELETE, PATCH, etc.)
  // - Dynamic routes, webhooks, auth, admin, bookings, and Supabase calls
  const isNonGet = req.method !== 'GET';
  const isBypassUrl =
    url.pathname.includes('/api/') ||
    url.pathname.includes('/admin') ||
    url.pathname.includes('/auth') ||
    url.pathname.includes('/book/') ||
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/_next/data');

  if (isNonGet || isBypassUrl) {
    event.respondWith(fetch(req));
    return;
  }

  // 2. Fast Static Asset Caching (Stale-While-Revalidate)
  // Fonts, /icons/*, /images/*, and immutable /_next/static/* chunks
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    STATIC_EXTENSIONS.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(req);

        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (
              networkResponse &&
              (networkResponse.status === 200 || networkResponse.type === 'opaque')
            ) {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. Document / Page Navigations: Network-First to guarantee real-time auth redirects
  event.respondWith(
    fetch(req).catch(async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw new Error('Network unavailable and resource not cached');
    })
  );
});
