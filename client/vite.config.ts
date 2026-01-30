/// <reference types="vitest" />

import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
    },
  },  
  
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Read Easy Connect',
        short_name: 'ReadEasy',
        description: 'Read Easy Connect Application',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(js|css|html|png|jpg|jpeg|svg|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-resources'
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      },
      injectRegister: 'script',
      strategies: 'generateSW'
    })
  ],

  test: {
    globals: true,
    environment: 'jsdom', 
    setupFiles: './src/setupTests.ts',
  },  
});
