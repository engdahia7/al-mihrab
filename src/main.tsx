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

// Register Service Worker and immediately activate updates on mobile devices
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
