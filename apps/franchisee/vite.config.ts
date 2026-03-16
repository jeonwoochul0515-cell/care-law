import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '법률케어',
        short_name: '법률케어',
        theme_color: '#1E2D4E',
        background_color: '#1E2D4E',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      // Disable automatic apple-mobile-web-app-capable injection;
      // PWA meta tags are managed manually in index.html and BrandInjector
      includeManifestIcons: false,
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\/(?!api\/).*$/],
        offlineGoogleAnalytics: false,
        // Force a unique precache manifest revision on every build
        additionalManifestEntries: [
          { url: '/cache-bust', revision: Date.now().toString() },
        ],
        runtimeCaching: [
          {
            // NetworkFirst for same-origin JS and CSS — always check for fresh assets
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin && (request.destination === 'script' || request.destination === 'style'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'js-css-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 60, maxAgeSeconds: 24 * 60 * 60 },
            },
          },
          {
            // NetworkFirst for navigation requests as well
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co/,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-cache', networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': '/src' } },
  server: { port: 5175 },
});
