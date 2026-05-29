import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'data/*.geojson'],
      manifest: {
        name: 'VFR ULM France',
        short_name: 'VFR ULM',
        description: 'Carte interactive des espaces aériens VFR pour pilotes ULM en France',
        theme_color: '#1e3a5f',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\.pmtiles$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pmtiles-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // NetworkFirst : toujours chercher la version fraîche en ligne (aviation = données critiques)
            // Fallback sur le cache si hors ligne
            urlPattern: /\.geojson$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'geojson-cache',
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api/openaip': {
        target: 'https://api.openaip.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openaip/, '/api'),
      },
    },
  },
})
