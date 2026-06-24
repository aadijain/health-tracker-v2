/**
 * Register the app-shell service worker so the app installs to the home screen
 * and opens offline. The worker is served from the deployment base path so it
 * works both at the site root (local dev) and under a GitHub Pages sub-path.
 */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  const base = import.meta.env.BASE_URL;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      // A failed registration is non-fatal: the app runs the same online.
    });
  });
}
