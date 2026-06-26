import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

// Sous-chemin GitHub Pages en production (https://sharkoz.github.io/vfr-map-3d/),
// racine en développement. Les fetch de données utilisent import.meta.env.BASE_URL
// pour rester corrects dans les deux cas.
const GH_PAGES_BASE = '/vfr-map-3d/'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? GH_PAGES_BASE : '/',
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
        // Relatif au manifest → résout vers la base (racine en dev, /vfr-map-3d/ en prod)
        start_url: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,pbf}'],
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
          {
            // Tuiles raster OSM : on met en cache les tuiles déjà affichées → le fond
            // reste dispo hors-ligne sur les zones consultées en ligne.
            // (Politique d'usage OSM : pas de pré-téléchargement massif.)
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles-cache',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Polices UI Google Fonts — feuille de style
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            // Polices UI Google Fonts — fichiers woff2
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
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
}))
