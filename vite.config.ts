import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// NOTE: "@vitejs/plugin-react" must be installed (added to devDependencies at
// deploy time via `npm install @vitejs/plugin-react -D` if not already present).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "Alongsiders Attendance",
        short_name: "Attendance",
        description: "Staff check-in and check-out for Alongsiders",
        theme_color: "#1F5F4E",
        background_color: "#F6F3EC",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
        navigateFallbackDenylist: [/^\/\.netlify\/functions\//]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      "/.netlify/functions": "http://localhost:9999"
    }
  }
});
