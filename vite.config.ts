import { defineConfig } from "vite";

// `base` is read from an env var so the same config works locally (root) and on
// GitHub Pages, where the app is served from a `/<repo>/` sub-path.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
