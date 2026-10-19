import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Tier 1 Google Maps Platform quota & auth failure listener
(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
};
const origError = console.error;
console.error = (...args: unknown[]) => {
  const msg = args.map((a) => String(a)).join(' ');
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
  if (
    msg.includes('PLACES_NEARBY_SEARCH') ||
    msg.includes('PLACES_TEXT_SEARCH') ||
    msg.includes('MapsServerError')
  ) {
    return;
  }
  origError.apply(console, args);
};

// Register Service Worker for offline PWA functionality
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);

