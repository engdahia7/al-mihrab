import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Tier 1 Google Maps Platform quota & auth failure listener
(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  window.dispatchEvent(new CustomEvent('gmp-map-fallback'));
};
const origError = console.error;
console.error = (...args: unknown[]) => {
  origError.apply(console, args);
  const msg = args.map((a) => String(a)).join(' ');
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    window.dispatchEvent(new CustomEvent('gmp-map-fallback'));
  }
  if (
    msg.includes('ApiProjectMapError') ||
    msg.includes('InvalidKeyMapError') ||
    msg.includes('RefererNotAllowedMapError') ||
    msg.includes('BillingNotEnabledMapError')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-map-fallback'));
  }
};

// Clear stale Service Worker precaches on version upgrade or in dev mode so updates apply immediately
const APP_BUILD_VERSION = 'almihrab-2026-10-20-prophets-istikhara-v6';
try {
  const prevVersion = localStorage.getItem('almihrab_build_version');
  if (prevVersion !== APP_BUILD_VERSION) {
    localStorage.setItem('almihrab_build_version', APP_BUILD_VERSION);
    if ('caches' in window) {
      void caches.keys().then((keys) => {
        keys.forEach((k) => {
          if (k.includes('workbox-precache')) {
            void caches.delete(k);
          }
        });
      });
    }
  }
} catch {
  // ignore storage errors
}

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateSW(true);
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      void registration.update();
    }
  },
});

createRoot(document.getElementById('root')!).render(<App />);
