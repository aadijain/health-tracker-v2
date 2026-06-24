/**
 * App-shell service worker.
 *
 * Caches same-origin GET requests on demand (stale-while-revalidate) so the
 * installed app opens and runs offline. Data still needs Drive, which is by
 * design: only the shell is cached, never cross-origin Google requests. Bump
 * CACHE_VERSION to retire an old shell.
 */

const CACHE_VERSION = "v1";
const CACHE_NAME = `health-tracker-shell-${CACHE_VERSION}`;

self.addEventListener("install", () => {
  // Take over as soon as the new worker is ready rather than waiting for tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only handle same-origin GETs; let Drive/GIS and other requests pass through.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Serve cache immediately if present; otherwise wait for the network.
  const response = cached ?? (await network);
  if (response) {
    return response;
  }
  // Offline navigation with nothing cached: fall back to the app shell.
  if (request.mode === "navigate") {
    const shell = await cache.match("./");
    if (shell) {
      return shell;
    }
  }
  return new Response("Offline", { status: 503, statusText: "Offline" });
}
