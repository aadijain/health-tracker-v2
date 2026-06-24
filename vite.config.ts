import { defineConfig } from "vite";

// `base` is read from an env var so the same config works locally (root) and on
// GitHub Pages, where the app is served from a `/<repo>/` sub-path.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  server: {
    // Listen on all interfaces so the dev server is reachable over Tailscale.
    host: true,
    port: 4962,
    strictPort: true,
    // Accept the Tailscale MagicDNS hostname (short name and full tailnet FQDN).
    allowedHosts: ["homeserver", ".ts.net"],
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
