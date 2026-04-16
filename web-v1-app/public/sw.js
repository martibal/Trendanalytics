// public/sw.js
// Urd Atlas PWA service worker — caches last known chain state for offline fallback

const CACHE_NAME = "urd-atlas-v1";

// Pages to cache for offline
const PRECACHE_URLS = [
  "/mobile",
  "/mobile/chain/bitcoin",
  "/mobile/chain/ethereum",
  "/mobile/chain/arbitrum",
  "/mobile/chain/base",
  "/mobile/wiki",
];

// Install — precache shell pages
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Ignore precache failures — network may be unavailable
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache for mobile pages
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only intercept same-origin GET requests to /mobile
  if (
    event.request.method !== "GET" ||
    !url.pathname.startsWith("/mobile")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — return cached version
        return caches.match(event.request).then(
          (cached) =>
            cached ??
            new Response(
              "<div style='color:white;padding:2rem;font-family:sans-serif'>Offline — showing last cached data</div>",
              { headers: { "Content-Type": "text/html" } }
            )
        );
      })
  );
});
