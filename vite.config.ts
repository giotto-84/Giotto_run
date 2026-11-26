import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH permette di pubblicare su GitHub Pages (/Giotto_run/) o alla radice di un dominio.
const base = process.env.BASE_PATH ?? './';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'exercises/**/*.jpg'],
      manifest: {
        name: 'Giotto Run',
        short_name: 'Giotto Run',
        description: 'Il tuo allenatore di corsa: piano su misura, allenamenti guidati a voce e progressi.',
        lang: 'it',
        theme_color: '#E2532D',
        background_color: '#14110F',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  test: { include: ['tests/**/*.test.ts'] },
});
