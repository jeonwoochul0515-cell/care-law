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
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\/(?!api\/).*$/],
        offlineGoogleAnalytics: false,
        runtimeCaching: [{
          urlPattern: /^https:\/\/.*\.supabase\.co/,
          handler: 'NetworkFirst',
          options: { cacheName: 'supabase-cache', networkTimeoutSeconds: 5 },
        }],
      },
    }),
  ],
  resolve: { alias: { '@': '/src' } },
  server: { port: 5175 },
});
