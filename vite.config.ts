import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => {
  return {
    base: command === 'build' ? './' : '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'privacy-policy.html',
          'robots.txt',
          'sitemap.xml',
          '.well-known/assetlinks.json',
        ],
        manifest: {
          id: '/',
          name: 'المحراب — مواقيت الصلاة والمصحف والأذكار الموثقة',
          short_name: 'المحراب',
          description:
            'منصة إسلامية احترافية لمواقيت الصلاة الفلكية الدقيقة، المصحف الشريف بالرسم العثماني مع التفسير الميسر، والأذكار الصحيحة تعمل بدون إنترنت.',
          theme_color: '#14532D',
          background_color: '#FBF9F5',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          dir: 'rtl',
          lang: 'ar',
          categories: ['books', 'reference', 'lifestyle', 'education'],
          prefer_related_applications: false,
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: 'المصحف الشريف',
              short_name: 'المصحف',
              description: 'فتح المصحف الشريف بالرسم العثماني واستكمال القراءة',
              url: '/?tab=quran',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'مواقيت الصلاة',
              short_name: 'المواقيت',
              description: 'عرض مواقيت الصلاة الفلكية الدقيقة والعد التنازلي',
              url: '/?tab=prayers',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'اتجاه القبلة',
              short_name: 'القبلة',
              description: 'بوصلة القبلة التفاعلية والمساجد القريبة',
              url: '/?tab=qibla',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'أذكار المسلم',
              short_name: 'الأذكار',
              description: 'أذكار الصباح والمساء وبعد الصلاة من حصن المسلم',
              url: '/?tab=adhkar',
              icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 15,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/api\.alquran\.cloud\/v1\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'quran-uthmani-tafsir-offline-cache',
                expiration: {
                  maxEntries: 1500,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/cdn\.islamic\.network\/quran\/audio\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'quran-audio-on-demand-cache',
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 60 * 24 * 180,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
