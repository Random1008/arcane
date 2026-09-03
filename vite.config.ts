import { defineConfig } from "vite";
import { resolve } from "node:path";

// `img/` est servi à la racine (dev + build) : img/player.png → /player.png, copié dans dist/.
// Page : index.html (jeu).
// Proxy : /api est relayé vers le backend Node (port 8787) → même origine, pas de CORS.
export default defineConfig({
  server: {
    host: true,
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
  publicDir: "img",
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
      },
    },
  },
});
